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
print("  ENTRENAMIENTO TIEMPO DELIVERY (REGRESIÓN)")
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

print("2. Extrayendo OBT_DELIVERY_TIME_PREDICTION...")
try:
    query = 'SELECT * FROM "TRAINING_DATASETS"."OBT_DELIVERY_TIME_PREDICTION"'
    df = pd.read_sql(query, conn)
except Exception:
    try:
        query = 'SELECT * FROM "DBT_HGC_OBT"."OBT_DELIVERY_TIME_PREDICTION"'
        df = pd.read_sql(query, conn)
    except Exception:
        print("[ERROR] No se pudo encontrar la tabla. Ejecuta `dbt run`.")
        exit(1)

print(f"Filas cargadas: {len(df)}")
if len(df) == 0:
    print("Dataset vacío. Abortando.")
    exit(1)

df.columns = [c.upper() for c in df.columns]

# Features y Target (Regresión)
X = df[['FEATURE_PLATAFORMA_DELIVERY', 'FEATURE_COSTO_ENVIO']].copy()
y = df['TARGET_TIEMPO_ESTIMADO'].copy()

# Limpieza
X['FEATURE_PLATAFORMA_DELIVERY'] = X['FEATURE_PLATAFORMA_DELIVERY'].fillna('Desconocido')
X['FEATURE_COSTO_ENVIO'] = X['FEATURE_COSTO_ENVIO'].fillna(0.0)
y = y.fillna(y.mean() if len(y) > 0 else 0)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

categorical_features = ['FEATURE_PLATAFORMA_DELIVERY']
numeric_features = ['FEATURE_COSTO_ENVIO']

preprocessor = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), numeric_features),
        ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
    ])

# Modelos de Regresión para Tiempo (Minutos)
models = {
    "LinearRegression": LinearRegression(),
    "Ridge": Ridge(alpha=1.0),
    "RandomForest": RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42),
    "GradientBoosting": GradientBoostingRegressor(n_estimators=100, max_depth=5, random_state=42),
    "XGBoost": XGBRegressor(n_estimators=100, max_depth=5, random_state=42)
}

mlflow.set_experiment("HGC_Delivery_Prediction")

best_r2 = -999
best_model_name = ""
best_pipeline = None

print("3. Entrenando y evaluando predictores de Delivery...")

for model_name, model in models.items():
    with mlflow.start_run(run_name=model_name):
        pipeline = Pipeline(steps=[('preprocessor', preprocessor),
                                   ('regressor', model)])

        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)

        r2 = r2_score(y_test, y_pred)
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))

        print(f"   - {model_name} --> R²: {r2:.4f} | MAE: {mae:.1f} min | RMSE: {rmse:.1f} min")

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

with mlflow.start_run(run_name="Best_Delivery_Registrator"):
    mlflow.sklearn.log_model(
        sk_model=best_pipeline,
        artifact_path="delivery_model",
        registered_model_name="HGC_DeliveryTime_Model_Pro"
    )
print("¡Modelo registrado en MLflow como 'HGC_DeliveryTime_Model_Pro'!")
print("Sirve con: mlflow models serve -m 'models:/HGC_DeliveryTime_Model_Pro/latest' -p 5005 --env-manager local")
