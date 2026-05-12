import os
import snowflake.connector
import pandas as pd
import numpy as np
import mlflow
import mlflow.sklearn
from dotenv import load_dotenv
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import warnings

warnings.filterwarnings('ignore')

load_dotenv()

print("====================================")
print("  ENTRENAMIENTO CLV (DATOS REALES)")
print("====================================")

# Configurar MLflow local
from pathlib import Path
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = SCRIPT_DIR
MLFLOW_DB = PROJECT_DIR / "hgc-ml" / "mlflow.db"
mlflow.set_tracking_uri(f"sqlite:///{MLFLOW_DB}")

print("1. Conectando a Snowflake...")
try:
    conn = snowflake.connector.connect(
        user=os.getenv("SNOWFLAKE_USER"),
        password=os.getenv("SNOWFLAKE_PASSWORD"),
        account=os.getenv("SNOWFLAKE_ACCOUNT"),
        warehouse=os.getenv("SNOWFLAKE_WAREHOUSE", "COMPUTE_WH"),
        database=os.getenv("SNOWFLAKE_DATABASE", "HGC_DB"),
        schema="GOLD"
    )
except Exception as e:
    print(f"[ERROR] Conexión fallida: {e}")
    exit(1)

print("2. Extrayendo Data Transaccional Real de CLV desde GOLD...")
sql = '''
SELECT 
    C.RANGO_EDAD,
    COUNT(DISTINCT F.NRO_PEDIDO_DD) AS FEATURE_FREQ_TOTAL,
    SUM(F.CANTIDAD_VENDIDA) AS FEATURE_CANTIDAD_ARTICULOS,
    DATEDIFF('day', MIN(TO_DATE(F.ID_FECHA_SK::STRING, 'YYYYMMDD')), CURRENT_DATE()) AS FEATURE_ANTIGUEDAD_DIAS,
    SUM(F.MONTO_SUBTOTAL_NETO) AS TARGET_CLV_HISTORICO
FROM GOLD.FACT_VENTAS_DETALLE F
JOIN GOLD.DIM_CLIENTE C ON F.ID_CLIENTE_SK = C.ID_CLIENTE_SK
GROUP BY C.ID_CLIENTE_SK, C.RANGO_EDAD
'''
df = pd.read_sql(sql, conn)
print(f"Filas reales extraidas: {len(df)}")

if len(df) == 0:
    print("Dataset vacío. Abortando.")
    exit(1)

# Features y Target
X = df[['RANGO_EDAD', 'FEATURE_FREQ_TOTAL', 'FEATURE_CANTIDAD_ARTICULOS', 'FEATURE_ANTIGUEDAD_DIAS']].copy()
y = df['TARGET_CLV_HISTORICO'].copy()

# Limpieza
X['RANGO_EDAD'] = X['RANGO_EDAD'].fillna('Desconocido')
X['FEATURE_FREQ_TOTAL'] = X['FEATURE_FREQ_TOTAL'].fillna(0)
X['FEATURE_CANTIDAD_ARTICULOS'] = X['FEATURE_CANTIDAD_ARTICULOS'].fillna(0)
X['FEATURE_ANTIGUEDAD_DIAS'] = X['FEATURE_ANTIGUEDAD_DIAS'].fillna(0)
y = y.fillna(0)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

categorical_features = ['RANGO_EDAD']
numeric_features = ['FEATURE_FREQ_TOTAL', 'FEATURE_CANTIDAD_ARTICULOS', 'FEATURE_ANTIGUEDAD_DIAS']

preprocessor = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), numeric_features),
        ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
    ])

models = {
    "LinearRegression": LinearRegression(),
    "Ridge": Ridge(alpha=1.0),
    "RandomForest": RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42),
    "GradientBoosting": GradientBoostingRegressor(n_estimators=100, max_depth=5, random_state=42),
    "XGBoost": XGBRegressor(n_estimators=100, max_depth=5, random_state=42)
}

mlflow.set_experiment("HGC_CLV_Prediction")

best_r2 = -999
best_model_name = ""
best_pipeline = None

print("3. Entrenando y evaluando modelos de regresión con datos reales...")

for model_name, model in models.items():
    with mlflow.start_run(run_name=f"{model_name}_Real"):
        pipeline = Pipeline(steps=[('preprocessor', preprocessor),
                                   ('regressor', model)])

        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)

        r2 = r2_score(y_test, y_pred)
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))

        print(f"   - {model_name} --> R²: {r2:.4f} | MAE: Bs {mae:.2f} | RMSE: Bs {rmse:.2f}")

        mlflow.log_param("model_type", model_name)
        mlflow.log_metric("r2_score", r2)
        mlflow.log_metric("mae", mae)
        mlflow.log_metric("rmse", rmse)

        if r2 > best_r2:
            best_r2 = r2
            best_model_name = model_name
            best_pipeline = pipeline

print("------------------------------------")
print(f"Mejor Modelo: {best_model_name} con R²={best_r2:.4f}")

with mlflow.start_run(run_name="Best_CLV_Registrator_Real"):
    mlflow.sklearn.log_model(
        sk_model=best_pipeline,
        artifact_path="clv_model",
        registered_model_name="HGC_CLV_Model_Pro"
    )
print("¡Modelo CLV Real registrado en MLflow como 'HGC_CLV_Model_Pro'!")
