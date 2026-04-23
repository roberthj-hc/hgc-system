import pandas as pd
import numpy as np
import snowflake.connector
import snowflake.connector.pandas_tools
import os
from dotenv import load_dotenv
import statsmodels.api as sm
import mlflow
import json

def train_elasticity():
    print("Iniciando calculo de elasticidad precio (Log-Log Regression)...")
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
        
        query = "SELECT * FROM MART_ECONOMETRIA_ELASTICIDAD_BASE"
        df = pd.read_sql(query, conn)
        
        # Normalizar nombres de columnas a mayúsculas
        df.columns = [c.upper() for c in df.columns]
        
        results = []
        
        mlflow.set_experiment("HGC_Price_Elasticity")
        
        product_ids = df['ID_PRODUCTO_SK'].unique()
        
        for p_id in product_ids:
            prod_df = df[df['ID_PRODUCTO_SK'] == p_id].copy()
            prod_df = prod_df.dropna(subset=['LOG_P', 'LOG_Q_NORM'])
            
            if len(prod_df) < 4 or prod_df['PRECIO'].nunique() < 2:
                continue
                
            X = sm.add_constant(prod_df['LOG_P'])
            y = prod_df['LOG_Q_NORM']
            
            model = sm.OLS(y, X).fit()
            
            beta_1 = model.params['LOG_P']
            beta_0 = model.params['const']
            r2 = model.rsquared
            
            with mlflow.start_run(run_name=f"Elasticity_Prod_{p_id}"):
                mlflow.log_param("product_id", p_id)
                mlflow.log_metric("elasticity", beta_1)
                mlflow.log_metric("r2", r2)
                
                results.append({
                    'ID_PRODUCTO_SK': str(p_id),
                    'NOMBRE_PRODUCTO': prod_df['NOMBRE_PRODUCTO'].iloc[0],
                    'ELASTICIDAD': float(beta_1),
                    'INTERCEPTO': float(beta_0),
                    'R_SQUARED': float(r2),
                    'COUNT_DATOS': int(len(prod_df)),
                    'PRECIO_PROMEDIO': float(prod_df['PRECIO'].mean())
                })
        
        if not results:
            print("Advertencia: No hay suficientes datos para calcular elasticidades.")
            conn.close()
            return

        results_df = pd.DataFrame(results)
        
        # 1. Guardar en Snowflake (para persistencia centralizada)
        snowflake.connector.pandas_tools.write_pandas(
            conn, 
            results_df, 
            "RESULTADOS_ELASTICIDAD", 
            auto_create_table=True,
            overwrite=True
        )

        # 2. OPTIMIZACIÓN: Guardar localmente para acceso ultra-rápido desde el Backend
        print("Optimizando archivos locales para el Backend...")
        os.makedirs('../hgc-back/data', exist_ok=True)
        
        # Guardar coeficientes
        results_df.to_json('../hgc-back/data/elasticity_coefficients.json', orient='records', indent=2)
        
        # Guardar datos históricos agregados (para el scatter plot sin cargar 276k filas)
        # Agrupamos por producto, sucursal y precio para reducir el tamaño del JSON drasticamente
        historical_agg = df.groupby(['ID_PRODUCTO_SK', 'ID_SUCURSAL_SK', 'NOMBRE_PRODUCTO', 'NOMBRE_SUCURSAL', 'TIPO_FORMATO', 'PRECIO']).agg({
            'CANTIDAD': 'sum',
            'CANTIDAD_NORMALIZADA': 'mean',
            'LOG_P': 'mean',
            'LOG_Q_NORM': 'mean'
        }).reset_index()
        
        historical_agg.to_json('../hgc-back/data/historical_data.json', orient='records', indent=2)
        
        print(f"Exito: Modelos entrenados y archivos locales generados ({len(results)} productos).")
        conn.close()
        
    except Exception as e:
        print(f"Error en entrenamiento de elasticidad: {e}")

if __name__ == "__main__":
    train_elasticity()
