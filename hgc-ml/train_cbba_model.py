import pandas as pd
import numpy as np
import snowflake.connector
import os
from dotenv import load_dotenv
import pickle
from xgboost import XGBRegressor

def train():
    print("Cargando datos para entrenamiento del Simulador CBBA...")
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
        
        # Obtenemos datos históricos
        df = pd.read_sql("SELECT * FROM mart_ventas_historicas", conn)
        conn.close()
        
        # Simulación de entrenamiento (XGBoost)
        # Enriquecemos con factores ficticios para el 'What-If' ya que no están en la DB
        # En un caso real, estas variables vendrían de tablas de marketing/recursos humanos
        df['mkt_investment'] = np.random.uniform(1000, 5000, size=len(df))
        df['combo_price'] = np.random.uniform(35, 85, size=len(df))
        df['employees'] = np.random.randint(5, 15, size=len(df))
        
        X = df[['mkt_investment', 'combo_price', 'employees']]
        y = df['VENTAS_REALES']
        
        model = XGBRegressor(n_estimators=100)
        model.fit(X, y)
        
        # Guardar modelo (Simulando MLflow registry)
        os.makedirs('models', exist_ok=True)
        with open('models/cbba_simulator_model.pkl', 'wb') as f:
            pickle.dump(model, f)
            
        print("Modelo de Simulación CBBA entrenado y guardado en hgc-ml/models/")
        
    except Exception as e:
        print(f"Error entrenando modelo: {e}")

if __name__ == "__main__":
    train()
