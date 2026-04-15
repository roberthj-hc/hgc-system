import os
import snowflake.connector
import pandas as pd
import mlflow
import mlflow.sklearn
from dotenv import load_dotenv
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans, MiniBatchKMeans, AgglomerativeClustering
from sklearn.mixture import GaussianMixture
from sklearn.metrics import silhouette_score
import warnings

warnings.filterwarnings('ignore')

load_dotenv()

print("====================================")
print("  ENTRENAMIENTO CLUSTERING (SEGMENTACIÓN)")
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


print("2. Extrayendo OBT_CUSTOMER_SEGMENTATION...")


try:
    query = 'SELECT * FROM "TRAINING_DATASETS"."OBT_CUSTOMER_SEGMENTATION"'
    df = pd.read_sql(query, conn)
except Exception as e:
    try: 
        query = 'SELECT * FROM "DBT_HGC_OBT"."OBT_CUSTOMER_SEGMENTATION"'
        df = pd.read_sql(query, conn)
    except Exception as inner_e:
        print("[ERROR] No se pudo encontrar la tabla. Ejecuta `dbt run`.")
        exit(1)


print(f"Filas cargadas: {len(df)}")
if len(df) <= 50:
    print("Muestra demasiado pequeña (<= 50) para clustering representativo. Abortando.")
    exit(1)


df.columns = [c.upper() for c in df.columns]


# Excluimos ID para no sesgar
X = df[['FEATURE_RANGO_EDAD_ORDINAL', 'RFM_FREQUENCY', 'RFM_MONETARY', 
        'RFM_RECENCY', 'FEATURE_TICKET_PROMEDIO', 'FEATURE_VOLUMEN_ARTICULOS']].copy()

X = X.fillna(0)

# Unsupervised models pipeline setup
preprocessor = StandardScaler()

# Usaremos 4 clusters predefinidos según logística estática de retail
n_clusters = 4
models = {
    "KMeans": KMeans(n_clusters=n_clusters, random_state=42),
    "MiniBatch": MiniBatchKMeans(n_clusters=n_clusters, random_state=42),
    "GMM": GaussianMixture(n_components=n_clusters, random_state=42),
    "Agglomerative": AgglomerativeClustering(n_clusters=n_clusters)
}

mlflow.set_experiment("HGC_Segmentation")

best_score = -1
best_model_name = ""
best_pipeline = None

print("3. Entrenando y evaluando clusters (Silhouette Score)...")

# Submuestra si es muy grande para Agglomerative
X_eval = X.sample(min(len(X), 5000), random_state=42) if len(X) > 5000 else X

for model_name, model in models.items():
    with mlflow.start_run(run_name=model_name):
        pipeline = Pipeline(steps=[('preprocessor', preprocessor),
                                   ('clustering', model)])
        
        # Agglomerative no tiene predict separado, hay que tratarselo distinto
        if model_name == "Agglomerative":
            labels = pipeline.fit_predict(X)
            # Para evaluar usamos X_eval o X entero
            score = silhouette_score(X, labels)
        else:
            pipeline.fit(X)
            labels = pipeline.predict(X)
            score = silhouette_score(X, labels)
        
        print(f"   ► {model_name} --> Silhouette: {score:.4f}")
        
        mlflow.log_param("model_type", model_name)
        mlflow.log_metric("silhouette", score)
        
        if score > best_score:
            best_score = score
            best_model_name = model_name
            # Si Agglomerative ganase, no se puede guardar un "pipeline.predict()",
            # Por seguridad de Despliegue en API preferiremos KMeans/GMM si empatan.
            # En retail KMeans suele ganar en simplicidad y despliegue rápido.
            best_pipeline = pipeline

print("------------------------------------")
print(f"Mejor Modelo: {best_model_name} con {best_score:.4f} Silhouette Score")

# NOTA: Si Agglomerative gana, no se puede exportar con `.predict()`. 
# Para evitar caída en producción MLFlow, forzamos KMeans si su score es cercano.
# Evaluamos que no sea Agglomerative el que se mande a Serve:
if best_model_name == "Agglomerative":
    print("Agglomerative no soporta .predict(). Usando KMeans como fallback para Serve API.")
    best_pipeline = Pipeline(steps=[('preprocessor', preprocessor), ('clustering', models['KMeans'])])
    best_pipeline.fit(X)

with mlflow.start_run(run_name="Best_Model_Registrator"):
    mlflow.sklearn.log_model(
        sk_model=best_pipeline, 
        artifact_path="segmentation_model",
        registered_model_name="HGC_Segmentation_Model_Pro"
    )
print("¡Modelo registrado en MLflow! Sirve con port 5002.")
