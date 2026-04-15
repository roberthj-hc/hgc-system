import os
import snowflake.connector
import pandas as pd
import mlflow
import mlflow.sklearn
from dotenv import load_dotenv
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.neural_network import MLPClassifier
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, classification_report
import warnings

warnings.filterwarnings('ignore')

load_dotenv()

print("====================================")
print("  ENTRENAMIENTO MULTI-ALGORITMO MLOPS")
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

# Utilizamos TRY_CAST o simplemente verificamos dónde y cómo están los datos
# En caso de que no haya corrido el dbt macro, probaremos con "DBT_HGC_TRAINING_DATASETS" en un try/except.
print("2. Extrayendo OBT_CHURN_PREDICTION...")
try:
    query = 'SELECT * FROM "TRAINING_DATASETS"."OBT_CHURN_PREDICTION"'
    df = pd.read_sql(query, conn)
except Exception as e:
    print(f"Buscando alternativa de db/scheme: {e}")
    try: 
        # Alternativa
        query = 'SELECT * FROM "DBT_HGC_OBT"."OBT_CHURN_PREDICTION"'
        df = pd.read_sql(query, conn)
    except Exception as inner_e:
        print("[ERROR] No se pudo encontrar la tabla. Asegurate de hacer `dbt run` primero.")
        exit(1)

print(f"Filas cargadas: {len(df)}")

if len(df) == 0:
    print("El dataset está vacío. Abortando.")
    exit(1)

# Poner en mayúsculas para compatibilidad con Snowflake
df.columns = [c.upper() for c in df.columns]

X = df[['RANGO_EDAD', 'FEATURE_FRECUENCIA_HISTORICA', 'FEATURE_MONTO_GASTO_HISTORICO', 'FEATURE_RECENCIA_DIAS']]
# Limpieza básica por si hay Nulos (deberían haber sido tratados en DBT, pero aseguramos en Pipeline)
X['FEATURE_FRECUENCIA_HISTORICA'] = X['FEATURE_FRECUENCIA_HISTORICA'].fillna(0)
X['FEATURE_MONTO_GASTO_HISTORICO'] = X['FEATURE_MONTO_GASTO_HISTORICO'].fillna(0)
X['FEATURE_RECENCIA_DIAS'] = X['FEATURE_RECENCIA_DIAS'].fillna(9999)
X['RANGO_EDAD'] = X['RANGO_EDAD'].fillna('Desconocido')

y = df['TARGET_ES_CHURN']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

categorical_features = ['RANGO_EDAD']
numeric_features = ['FEATURE_FRECUENCIA_HISTORICA', 'FEATURE_MONTO_GASTO_HISTORICO', 'FEATURE_RECENCIA_DIAS']

preprocessor = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), numeric_features),
        ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
    ])

# Diccionario de modelos a experimentar
models = {
    "LogisticRegression": LogisticRegression(random_state=42),
    "RandomForest": RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42),
    "XGBoost": XGBClassifier(use_label_encoder=False, eval_metric='logloss', random_state=42),
    "NeuralNetwork": MLPClassifier(hidden_layer_sizes=(64, 32), max_iter=300, random_state=42)
}

mlflow.set_experiment("HGC_Churn_Prediction")

best_accuracy = 0
best_model_name = ""
best_pipeline = None

print("3. Entrenando y evaluando modelos...")

for model_name, model in models.items():
    with mlflow.start_run(run_name=model_name):
        pipeline = Pipeline(steps=[('preprocessor', preprocessor),
                                   ('classifier', model)])
        
        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)
        
        acc = accuracy_score(y_test, y_pred)
        print(f"   ► {model_name} --> Accuracy: {acc:.4f}")
        
        mlflow.log_param("model_type", model_name)
        mlflow.log_metric("accuracy", acc)
        
        if acc > best_accuracy:
            best_accuracy = acc
            best_model_name = model_name
            best_pipeline = pipeline

print("------------------------------------")
print(f"Mejor Modelo: {best_model_name} con {best_accuracy:.4f} accuracy")

with mlflow.start_run(run_name="Best_Model_Registrator"):
    mlflow.sklearn.log_model(
        sk_model=best_pipeline, 
        artifact_path="churn_model",
        registered_model_name="HGC_Churn_Model_Pro"
    )
print("¡Modelo registrado exitosamente en MLflow como 'HGC_Churn_Model_Pro'!")
