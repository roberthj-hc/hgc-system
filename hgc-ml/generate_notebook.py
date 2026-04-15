import nbformat as nbf
import os

nb = nbf.v4.new_notebook()

text = """# Predicción de Churn
Este notebook extrae la tabla `obt_churn_prediction` desde Snowflake, entrena un modelo RandomForest, y utiliza MLflow para registrar los parámetros y guardar el Pipeline predictivo."""

code_connect = """import os
import snowflake.connector
import pandas as pd
import mlflow
import mlflow.sklearn
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Conectar a Snowflake
conn = snowflake.connector.connect(
    user=os.getenv("SNOWFLAKE_USER"),
    password=os.getenv("SNOWFLAKE_PASSWORD"),
    account=os.getenv("SNOWFLAKE_ACCOUNT"),
    warehouse=os.getenv("SNOWFLAKE_WAREHOUSE", "COMPUTE_WH"),
    database=os.getenv("SNOWFLAKE_DATABASE", "HGC_DB"),
    schema="TRAINING_DATASETS"
)

# Extraer los datos
query = "SELECT * FROM training_datasets.obt_churn_prediction"
df = pd.read_sql(query, conn)
df.head()
"""

code_prep = """from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier

# Variables del Dataset
# features: rango_edad, feature_frecuencia_historica, feature_monto_gasto_historico, feature_recencia_dias
# target: target_es_churn

X = df[['RANGO_EDAD', 'FEATURE_FRECUENCIA_HISTORICA', 'FEATURE_MONTO_GASTO_HISTORICO', 'FEATURE_RECENCIA_DIAS']]
y = df['TARGET_ES_CHURN']

# Dividir dataset
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Preprocesamiento: rango_edad necesita ser convertido de Categórico a Numérico
categorical_features = ['RANGO_EDAD']
numeric_features = ['FEATURE_FRECUENCIA_HISTORICA', 'FEATURE_MONTO_GASTO_HISTORICO', 'FEATURE_RECENCIA_DIAS']

preprocessor = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), numeric_features),
        ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
    ])

# Modelo predictivo (Random Forest)
model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)

# Pipeline final
pipeline = Pipeline(steps=[('preprocessor', preprocessor),
                           ('classifier', model)])
"""

code_train = """from sklearn.metrics import accuracy_score, classification_report

# Configuramos y abrimos experimento en MLflow
mlflow.set_experiment("HGC_Churn_Prediction")

with mlflow.start_run():
    # Entrenar pipeline completo
    pipeline.fit(X_train, y_train)
    
    # Predecir y calcular métricas
    y_pred = pipeline.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"Accuracy de validación: {accuracy}")
    print(classification_report(y_test, y_pred))
    
    # MLflow: Registrar métricas
    mlflow.log_metric("accuracy", accuracy)
    
    # MLflow: Registrar el modelo. 
    # Le indicamos que vamos a guardar todo el pipeline para que aprenda el formato de los datos automáticamete
    mlflow.sklearn.log_model(
        sk_model=pipeline, 
        artifact_path="churn_model",
        registered_model_name="HGC_Churn_Model"
    )
    
    print("¡Modelo registrado en MLflow con éxito!")
"""

code_serve = """# PARA SERVIR EL MODELO COMO API:
# Abre tu terminal, dirígete a esta carpeta (hgc-ml) y ejecuta:
# mlflow models serve -m "models:/HGC_Churn_Model/latest" -p 5001 --env-manager local
"""

nb['cells'] = [
    nbf.v4.new_markdown_cell(text),
    nbf.v4.new_code_cell(code_connect),
    nbf.v4.new_code_cell(code_prep),
    nbf.v4.new_code_cell(code_train),
    nbf.v4.new_markdown_cell(code_serve)
]

os.makedirs('notebooks', exist_ok=True)
with open('notebooks/1_churn_prediction.ipynb', 'w', encoding='utf-8') as f:
    nbf.write(nb, f)
