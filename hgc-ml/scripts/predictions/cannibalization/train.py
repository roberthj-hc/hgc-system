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
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression, Ridge
from xgboost import XGBRegressor
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import warnings

warnings.filterwarnings('ignore')
load_dotenv()

print("====================================")
print("  ENTRENAMIENTO CANIBALIZACION (REGRESIÓN)")
print("====================================")
mlflow.set_tracking_uri("sqlite:///mlflow.db")
print("1. Conectando a Snowflake...")

conn = None
df = None
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
    print(f"[ADVERTENCIA] Conexión a Snowflake fallida: {e}")

if conn is not None:
    print("2. Extrayendo datos de OBT_CANNIBALIZATION_PREDICTION...")
    try:
        query = 'SELECT DISTANCIA_KM, DIFERENCIA_PRECIO, PUBLICO_COMPARTIDO, RIESGO_CANIBALIZACION FROM "TRAINING_DATASETS"."OBT_CANNIBALIZATION_PREDICTION"'
        df = pd.read_sql(query, conn)
    except Exception as e:
        print(f"No se encontró tabla oficial: {e}. Probando DBT_HGC_OBT...")
        try:
            query = 'SELECT DISTANCIA_KM, DIFERENCIA_PRECIO, PUBLICO_COMPARTIDO, RIESGO_CANIBALIZACION FROM "DBT_HGC_OBT"."OBT_CANNIBALIZATION_PREDICTION"'
            df = pd.read_sql(query, conn)
        except Exception:
            print("DBT view not found either.")

if df is None or len(df) == 0:
    print("---------------------------------------------------------")
    print(">> FAILOVER: Generando dataset algorítmico sintético <<")
    print("---------------------------------------------------------")
    # Generamos 100,000 filas de prueba usando la heurística validada
    np.random.seed(42)
    n_samples = 100000
    
    dist_km = np.random.uniform(0.0, 20.0, n_samples)
    dif_precio = np.random.uniform(0.0, 50.0, n_samples)
    publico_comp = np.random.uniform(0.0, 100.0, n_samples)
    
    # Lógica Matemática Fluida Continua (Monótona) para evitar saltos bruscos
    riesgo_base = 10.0
    
    # Distancia Penalidad: A menor distancia, mucho mayor riesgo (hasta 45 pts extra)
    # Cae progresivamente hasta 0 a partir de los 15km
    penalidad_distancia = np.maximum(0, 45.0 * (1.0 - (dist_km / 15.0)))
    
    # Precio Penalidad: Si los precios son parecidos (< 15%), es guerra (+20)
    # Si son mas de 30% distintos, es protección (-10)
    penalidad_precio = np.where(dif_precio < 20.0, 20.0 * (1.0 - (dif_precio / 20.0)), -15.0 * ((dif_precio - 20) / 30.0))
    
    # Publico Penalidad: Mayor compartición = Directamente proporcional peor (+35)
    penalidad_publico = 35.0 * (publico_comp / 100.0)
    
    riesgo = riesgo_base + penalidad_distancia + penalidad_precio + penalidad_publico
    
    # Ruido bajísimo para que el RandomForest aprenda la monotonicidad precisa
    ruido = np.random.normal(0, 1.5, n_samples)
    riesgo = np.clip(riesgo + ruido, 0, 100)

    
    df = pd.DataFrame({
        'DISTANCIA_KM': dist_km,
        'DIFERENCIA_PRECIO': dif_precio,
        'PUBLICO_COMPARTIDO': publico_comp,
        'RIESGO_CANIBALIZACION': riesgo
    })

print(f"Filas cargadas/generadas: {len(df)}")

df.columns = [c.upper() for c in df.columns]

X = df[['DISTANCIA_KM', 'DIFERENCIA_PRECIO', 'PUBLICO_COMPARTIDO']]
y = df['RIESGO_CANIBALIZACION']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

numeric_features = ['DISTANCIA_KM', 'DIFERENCIA_PRECIO', 'PUBLICO_COMPARTIDO']

preprocessor = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), numeric_features)
    ])

models = {
    "LinearRegression": LinearRegression(),
    "Ridge": Ridge(alpha=1.0),
    "RandomForest": RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42),
    "GradientBoosting": GradientBoostingRegressor(n_estimators=100, max_depth=6, random_state=42),
    "XGBoost": XGBRegressor(n_estimators=100, learning_rate=0.1, max_depth=6, random_state=42)
}

mlflow.set_experiment("HGC_Cannibalization_Prediction")

best_r2 = -999
best_model_name = ""
best_pipeline = None

print("3. Entrenando y evaluando modelos de regresión percentual...")

for model_name, model in models.items():
    with mlflow.start_run(run_name=model_name):
        pipeline = Pipeline(steps=[('preprocessor', preprocessor),
                                   ('regressor', model)])
        
        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)
        
        r2 = r2_score(y_test, y_pred)
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        
        print(f"   - {model_name} --> R²: {r2:.4f} | RMSE: {rmse:.2f}% | MAE: {mae:.2f}%")
        
        mlflow.log_param("model_type", model_name)
        mlflow.log_metric("r2", r2)
        mlflow.log_metric("rmse", rmse)
        mlflow.log_metric("mae", mae)
        
        if r2 > best_r2:
            best_r2 = r2
            best_model_name = model_name
            best_pipeline = pipeline

print("------------------------------------")
print(f"Mejor Modelo: {best_model_name} con R²={best_r2:.4f}")

with mlflow.start_run(run_name="Best_Model_Registrator"):
    mlflow.sklearn.log_model(
        sk_model=best_pipeline, 
        artifact_path="cannibalization_model",
        registered_model_name="HGC_Cannibalization_Model_Pro"
    )
print("¡Modelo CANIBALIZACIÓN registrado en MLflow como 'HGC_Cannibalization_Model_Pro'!")
print("Sirve con: mlflow models serve -m 'models:/HGC_Cannibalization_Model_Pro/latest' -p 5006 --env-manager local")
