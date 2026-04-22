import pandas as pd
import numpy as np
import snowflake.connector
import os
from dotenv import load_dotenv
import pickle
from xgboost import XGBRegressor
from statsmodels.tsa.seasonal import seasonal_decompose
import mlflow

def train_all_models():
    print("Iniciando entrenamiento real con rigor estadístico...")
    load_dotenv(dotenv_path='../.env')
    
    try:
        conn = snowflake.connector.connect(
            user=os.environ.get("SNOWFLAKE_USER"),
            password=os.environ.get("SNOWFLAKE_PASSWORD"),
            account=os.environ.get("SNOWFLAKE_ACCOUNT"),
            warehouse=os.environ.get("SNOWFLAKE_WAREHOUSE"),
            database=os.environ.get("SNOWFLAKE_DATABASE"),
            role=os.environ.get("SNOWFLAKE_ROLE"),
            schema="GOLD"
        )
        
        query = "SELECT * FROM mart_ventas_historicas"
        df = pd.read_sql(query, conn)
        conn.close()
        
        df['FECHA'] = pd.to_datetime(df['FECHA'])
        df = df.sort_values(['ID_SUCURSAL_SK', 'FECHA'])
        
        # Guardar modelos en un diccionario
        models = {}
        
        mlflow.set_experiment("HGC_Predictive_All_Branches")
        
        for branch_id in df['ID_SUCURSAL_SK'].unique():
            branch_df = df[df['ID_SUCURSAL_SK'] == branch_id].copy()
            if len(branch_df) < 30: continue # Necesitamos datos suficientes
            
            # Feature Engineering Real
            branch_df['mes'] = branch_df['FECHA'].dt.month
            branch_df['dia_semana'] = branch_df['FECHA'].dt.dayofweek
            branch_df['lag_1'] = branch_df['VENTAS_REALES'].shift(1)
            branch_df['lag_7'] = branch_df['VENTAS_REALES'].shift(7)
            branch_df['rolling_mean_7'] = branch_df['VENTAS_REALES'].transform(lambda x: x.rolling(7).mean())
            branch_df = branch_df.dropna()
            
            X = branch_df[['mes', 'dia_semana', 'lag_1', 'lag_7', 'rolling_mean_7']]
            y = branch_df['VENTAS_REALES']
            
            with mlflow.start_run(run_name=f"Branch_{branch_id}"):
                model = XGBRegressor(n_estimators=500, max_depth=5, learning_rate=0.01)
                model.fit(X, y)
                
                mlflow.log_param("branch_id", branch_id)
                mlflow.xgboost.log_model(model, "model")
                
                # Guardamos el modelo localmente para el backend
                models[branch_id] = model
                
        # Guardar todos los modelos en un solo archivo
        os.makedirs('models', exist_ok=True)
        with open('models/branch_models.pkl', 'wb') as f:
            pickle.dump(models, f)
            
        print(f"Éxito: {len(models)} modelos entrenados y registrados en MLflow.")
        
    except Exception as e:
        print(f"Error en entrenamiento: {e}")

if __name__ == "__main__":
    train_all_models()
