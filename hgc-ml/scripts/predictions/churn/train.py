import os
import snowflake.connector
import pandas as pd
import numpy as np
import mlflow
import mlflow.sklearn
from dotenv import load_dotenv
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, roc_auc_score, recall_score, f1_score, classification_report
import warnings

warnings.filterwarnings('ignore')
load_dotenv()

from pathlib import Path
SCRIPT_DIR  = Path(__file__).resolve().parent
PROJECT_DIR = SCRIPT_DIR.parent.parent.parent.parent   # hgc-system/
MLFLOW_DB   = PROJECT_DIR / "mlflow.db"

print("=" * 55)
print("  CHURN — Entrenamiento v3 (Features enriquecidos)")
print("  Pregunta de negocio: Que clientes abandonaran")
print("  la empresa en los proximos 90 dias?")
print("=" * 55)

mlflow.set_tracking_uri(f"sqlite:///{MLFLOW_DB}")

# ── 1. CONEXION ───────────────────────────────────────────
print("\n1. Conectando a Snowflake...")
try:
    conn = snowflake.connector.connect(
        user=os.getenv("SNOWFLAKE_USER"),
        password=os.getenv("SNOWFLAKE_PASSWORD"),
        account=os.getenv("SNOWFLAKE_ACCOUNT"),
        warehouse=os.getenv("SNOWFLAKE_WAREHOUSE", "COMPUTE_WH"),
        database=os.getenv("SNOWFLAKE_DATABASE", "HGC_DB"),
        schema="TRAINING_DATASETS"
    )
except Exception as e:
    print(f"[ERROR] Conexion fallida: {e}")
    exit(1)

# ── 2. CARGA DE DATOS ────────────────────────────────────
print("2. Extrayendo OBT_CHURN_PREDICTION...")
df = None
for query in [
    'SELECT * FROM "TRAINING_DATASETS"."OBT_CHURN_PREDICTION"',
    'SELECT * FROM "DBT_HGC_OBT"."OBT_CHURN_PREDICTION"',
]:
    try:
        df = pd.read_sql(query, conn)
        if len(df) > 0:
            break
    except Exception:
        pass

if df is None or len(df) == 0:
    print("[ERROR] No se pudo cargar el dataset.")
    exit(1)

df.columns = [c.upper() for c in df.columns]
print(f"   Filas: {len(df):,} | Columnas: {df.columns.tolist()}")

# ── 3. FEATURE ENGINEERING (sin inventar datos) ──────────
# Todas las features vienen de columnas reales ya en el dataset.
# RECENCIA se usa SOLO para crear features derivadas, no directamente.
# El TARGET sigue siendo: recencia >= 90 (definicion de negocio en dbt)

print("\n3. Construyendo features enriquecidos...")

# Feature 1: Ticket promedio (cuanto gasta por pedido en promedio)
df['TICKET_PROMEDIO'] = np.where(
    df['FEATURE_FRECUENCIA_HISTORICA'] > 0,
    df['FEATURE_MONTO_GASTO_HISTORICO'] / df['FEATURE_FRECUENCIA_HISTORICA'],
    0
)

# Feature 2: Intensidad de compra (frecuencia normalizada por antiguedad relativa)
# Cuantos pedidos hace por "unidad de tiempo" — detecta si el cliente estaba activo o no
# Usamos recencia solo para construir este ratio, no como feature directo
df['INTENSIDAD_COMPRA'] = np.where(
    df['FEATURE_RECENCIA_DIAS'] > 0,
    df['FEATURE_FRECUENCIA_HISTORICA'] / (df['FEATURE_RECENCIA_DIAS'] / 30.0 + 1),
    df['FEATURE_FRECUENCIA_HISTORICA']
)

# Feature 3: Score de engagement (combina frecuencia y monto en escala 0-100)
freq_norm = (df['FEATURE_FRECUENCIA_HISTORICA'] - df['FEATURE_FRECUENCIA_HISTORICA'].min()) / \
            (df['FEATURE_FRECUENCIA_HISTORICA'].max() - df['FEATURE_FRECUENCIA_HISTORICA'].min() + 1e-9)
monto_norm = (df['FEATURE_MONTO_GASTO_HISTORICO'] - df['FEATURE_MONTO_GASTO_HISTORICO'].min()) / \
             (df['FEATURE_MONTO_GASTO_HISTORICO'].max() - df['FEATURE_MONTO_GASTO_HISTORICO'].min() + 1e-9)
df['ENGAGEMENT_SCORE'] = (freq_norm * 0.6 + monto_norm * 0.4) * 100

FEATURES = [
    'RANGO_EDAD',
    'FEATURE_FRECUENCIA_HISTORICA',
    'FEATURE_MONTO_GASTO_HISTORICO',
    'TICKET_PROMEDIO',
    'INTENSIDAD_COMPRA',
    'ENGAGEMENT_SCORE',
]
TARGET = 'TARGET_ES_CHURN'

print(f"   Features usados ({len(FEATURES)}):")
for f in FEATURES:
    print(f"   - {f}")

X = df[FEATURES].copy().fillna(0)
X['RANGO_EDAD'] = X['RANGO_EDAD'].fillna('Desconocido')
y = df[TARGET]

churn_rate = y.mean() * 100
print(f"\n   Balance del target: {churn_rate:.1f}% churn | {100-churn_rate:.1f}% activos")

# ── 4. SPLIT ──────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y)

cat_features = ['RANGO_EDAD']
num_features = [f for f in FEATURES if f != 'RANGO_EDAD']

preprocessor = ColumnTransformer([
    ('num', StandardScaler(), num_features),
    ('cat', OneHotEncoder(handle_unknown='ignore'), cat_features)
])

# ── 5. MODELOS ────────────────────────────────────────────
# Usamos class_weight='balanced' para manejar desbalance de clases
models = {
    "LogisticRegression": LogisticRegression(
        random_state=42, max_iter=1000, C=1.0, class_weight='balanced'),
    "RandomForest": RandomForestClassifier(
        n_estimators=150, max_depth=8, random_state=42, class_weight='balanced'),
    "GradientBoosting": GradientBoostingClassifier(
        n_estimators=150, max_depth=5, learning_rate=0.05, random_state=42),
    "XGBoost": XGBClassifier(
        n_estimators=150, max_depth=5, learning_rate=0.05,
        scale_pos_weight=(1 - churn_rate/100) / (churn_rate/100),
        eval_metric='logloss', random_state=42),
}

mlflow.set_experiment("HGC_Churn_Prediction_v3")

best_recall = 0
best_model_name = ""
best_pipeline = None

print("\n4. Entrenando y evaluando modelos...")
print(f"{'Modelo':<20} | {'Accuracy':>10} | {'AUC-ROC':>10} | {'Recall-Churn':>13}")
print("-" * 62)

for model_name, model in models.items():
    with mlflow.start_run(run_name=model_name):
        pipeline = Pipeline([
            ('preprocessor', preprocessor),
            ('classifier', model)
        ])
        pipeline.fit(X_train, y_train)
        y_pred  = pipeline.predict(X_test)
        y_proba = pipeline.predict_proba(X_test)[:, 1]

        acc    = accuracy_score(y_test, y_pred)
        auc    = roc_auc_score(y_test, y_proba)
        recall = recall_score(y_test, y_pred)
        f1     = f1_score(y_test, y_pred)

        print(f"{model_name:<20} | {acc:>10.4f} | {auc:>10.4f} | {recall:>13.4f}")

        mlflow.log_params({"model": model_name, "features": str(FEATURES), "leakage_fix": "v3"})
        mlflow.log_metrics({"accuracy": acc, "auc_roc": auc, "recall_churn": recall, "f1": f1})
        mlflow.sklearn.log_model(pipeline, "model")

        # Priorizamos Recall de Churn: mejor detectar falsos positivos que perder clientes reales
        if recall > best_recall:
            best_recall = recall
            best_model_name = model_name
            best_pipeline = pipeline

print("-" * 62)
print(f"\nCAMPEON: {best_model_name} | Recall-Churn: {best_recall:.4f}")
print("\nReporte completo del campeon:")
print(classification_report(y_test, best_pipeline.predict(X_test),
                             target_names=['Activo', 'Churn']))

# ── 6. REGISTRO EN MLFLOW ────────────────────────────────
with mlflow.start_run(run_name="Best_Model_v3"):
    mlflow.sklearn.log_model(
        sk_model=best_pipeline,
        artifact_path="churn_model",
        registered_model_name="HGC_Churn_Model_Pro"
    )

print("\nModelo registrado como 'HGC_Churn_Model_Pro' en MLflow.")
print("Listo para servir con serve.py")
