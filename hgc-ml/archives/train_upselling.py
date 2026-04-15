# ==============================================================================
# PROYECTO: PROPENSIÓN A VENTA CRUZADA (UP-SELLING) - VERSIÓN OPTIMIZADA FINAL
# ==============================================================================

import pandas as pd
import numpy as np
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score, classification_report

from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from xgboost import XGBClassifier

from sklearn.utils import resample

# ==============================================================================
# 1. CARGA DE DATOS
# ==============================================================================

warnings.filterwarnings('ignore')

load_dotenv()

print("====================================")
print("  ENTRENAMIENTO UPSELLING (REGRESIÓN)")
print("====================================")
print("1. Conectando a Snowflake...")

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
    print(f"[ERROR] Conexión fallida: {e}")
    exit(1)

print("2. Extrayendo OBT_UPSELLING...")
try:
    query = 'SELECT * FROM "TRAINING_DATASETS"."OBT_UPSELLING"'
    df = pd.read_sql(query, conn)
except Exception:
    try:
        query = 'SELECT * FROM "DBT_HGC_OBT"."OBT_UPSELLING"'
        df = pd.read_sql(query, conn)
    except Exception:
        print("[ERROR] No se pudo encontrar la tabla. Ejecuta `dbt run`.")
        exit(1)

print(f"Filas cargadas: {len(df)}")
if len(df) == 0:
    print("Dataset vacío. Abortando.")
    exit(1)

df.columns = [c.upper() for c in df.columns]


df = df.sample(n=150000, random_state=42)

print(f"Dataset cargado: {df.shape[0]} registros")

# ==============================================================================
# 2. LIMPIEZA
# ==============================================================================
df['TASA_UPSELL_HISTORICA'] = df['TASA_UPSELL_HISTORICA'].fillna(0)

for col in ['SEGMENTO', 'RANGO_EDAD', 'NOMBRE_CANAL']:
    if col not in df.columns:
        df[col] = 'DESCONOCIDO'
    df[col] = df[col].fillna('DESCONOCIDO')

df['PUNTOS_ACUMULADOS'] = df['PUNTOS_ACUMULADOS'].fillna(0)
df['DIAS_ANTIGUEDAD'] = df['DIAS_ANTIGUEDAD'].fillna(0)
df['FRECUENCIA_COMPRA'] = df['FRECUENCIA_COMPRA'].fillna(1)

# ==============================================================================
# 3. FEATURE ENGINEERING  (CLAVE PARA MEJORAR ACCURACY)
# ==============================================================================
df['VALOR_CLIENTE'] = df['PUNTOS_ACUMULADOS'] * df['FRECUENCIA_COMPRA']
df['ANTIGUEDAD_LOG'] = np.log1p(df['DIAS_ANTIGUEDAD'])
df['UPSELL_SCORE'] = df['TASA_UPSELL_HISTORICA'] * df['FRECUENCIA_COMPRA']

# ==============================================================================
# 4. BALANCEO DE CLASES 
# ==============================================================================
df_majority = df[df['UPSELL_LABEL'] == 0]
df_minority = df[df['UPSELL_LABEL'] == 1]

df_minority_upsampled = resample(
    df_minority,
    replace=True,
    n_samples=len(df_majority),
    random_state=42
)

df = pd.concat([df_majority, df_minority_upsampled])

print("Clases balanceadas")

# ==============================================================================
# 5. CODIFICACIÓN
# ==============================================================================
le = LabelEncoder()
for col in ['SEGMENTO', 'RANGO_EDAD', 'NOMBRE_CANAL']:
    df[col] = le.fit_transform(df[col].astype(str))

# ==============================================================================
# 6. ESCALADO
# ==============================================================================
scaler = StandardScaler()
cols_num = [
    'PUNTOS_ACUMULADOS',
    'DIAS_ANTIGUEDAD',
    'FRECUENCIA_COMPRA',
    'TASA_UPSELL_HISTORICA',
    'VALOR_CLIENTE',
    'ANTIGUEDAD_LOG',
    'UPSELL_SCORE'
]

df[cols_num] = scaler.fit_transform(df[cols_num])

# ==============================================================================
# 7. VARIABLES
# ==============================================================================
X = df.drop(columns=['ID_PEDIDO_NK', 'UPSELL_LABEL'], errors='ignore')
y = df['UPSELL_LABEL']

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# ==============================================================================
# 8. MODELOS (LOS 5 COMPLETOS 🔥)
# ==============================================================================
modelos = {

    "Regresión Logística": LogisticRegression(max_iter=1000),

    "Árbol de Decisión": DecisionTreeClassifier(max_depth=12),

    "Random Forest": RandomForestClassifier(
        n_estimators=150,
        max_depth=15
    ),

    "HistGradient Boosting": HistGradientBoostingClassifier(
        max_iter=300,
        max_depth=8,
        learning_rate=0.05
    ),

    "XGBoost": XGBClassifier(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=6,
        subsample=0.8,
        colsample_bytree=0.8,
        tree_method='hist',
        random_state=42
    )
}

# ==============================================================================
# 9. ENTRENAMIENTO
# ==============================================================================
print("\n--- RESULTADOS MODELOS UPSSELLING OPTIMIZADO ---")

mejor_acc = 0
mejor_modelo = None
mejor_nombre = ""

for nombre, modelo in modelos.items():
    print(f"Entrenando {nombre}...")

    modelo.fit(X_train, y_train)
    preds = modelo.predict(X_test)

    acc = accuracy_score(y_test, preds)
    print(f"{nombre:25}: {acc*100:.2f}%")

    if acc > mejor_acc:
        mejor_acc = acc
        mejor_modelo = modelo
        mejor_nombre = nombre

# ==============================================================================
# 10. REPORTE
# ==============================================================================
print("\n--- REPORTE DETALLADO ---")
print(classification_report(y_test, preds))

print(f"\nMejor modelo: {mejor_nombre} con {mejor_acc*100:.2f}%")

# ==============================================================================
# 11. GUARDAR MODELO
# ==============================================================================
joblib.dump(mejor_modelo, "model/modelo_upselling.pkl")

print("Modelo guardado en model/modelo_upselling.pkl")