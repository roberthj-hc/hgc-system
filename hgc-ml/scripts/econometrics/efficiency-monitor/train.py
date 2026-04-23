import pandas as pd
import numpy as np
import snowflake.connector
import os
from dotenv import load_dotenv
import statsmodels.formula.api as smf
import json

def train_efficiency():
    print("Ejecutando Regresion de Frontera Multiple (Cobb-Douglas)...")
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
        
        query = "SELECT * FROM MART_ECONOMETRIA_EFICIENCIA_OPERATIVA"
        df = pd.read_sql(query, conn)
        
        # Normalizar nombres de columnas a mayusculas
        df.columns = [c.upper() for c in df.columns]
        
        if len(df) < 5:
            print("Advertencia: Muestra insuficiente para regresion multiple.")
            conn.close()
            return

        # SFA via Multiple Quantile Regression
        # log(Venta) = b0 + b1*log(Costo) + b2*log(Volumen)
        formula = 'LOG_Y ~ LOG_X_COSTO + LOG_X_VOLUMEN'
        model = smf.quantreg(formula, df).fit(q=0.90)
        
        # Coeficientes
        params = {
            'INTERCEPTO': float(model.params['Intercept']),
            'BETA_COSTO': float(model.params['LOG_X_COSTO']),
            'BETA_VOLUMEN': float(model.params['LOG_X_VOLUMEN']),
            'R_SQUARED': float(model.prsquared)
        }
        
        # Prediccion de Frontera
        df['V_FRONTIER'] = np.exp(model.predict(df))
        
        # Eficiencia Tecnica
        df['SCORE_EFICIENCIA'] = (df['VENTA_TOTAL'] / df['V_FRONTIER'] * 100).clip(upper=100)
        df['BRECHA_INGRESOS'] = (df['V_FRONTIER'] - df['VENTA_TOTAL']).clip(lower=0)
        
        results = {
            'metadata': params,
            'data': df.round(2).to_dict(orient='records')
        }
        
        # Guardar cache local
        os.makedirs('../hgc-back/data', exist_ok=True)
        with open('../hgc-back/data/efficiency_results.json', 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
            
        print(f"Exito: Modelo SFA entrenado (R2: {params['R_SQUARED']:.3f}).")
        conn.close()
        
    except Exception as e:
        print(f"Error en entrenamiento SFA: {e}")

if __name__ == "__main__":
    train_efficiency()
