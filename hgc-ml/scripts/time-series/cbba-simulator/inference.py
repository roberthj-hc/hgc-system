import sys
import os
import pickle
import json
import pandas as pd
import numpy as np
import snowflake.connector
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv(dotenv_path='../../.env')

def run_inference(branch_id, mkt_val, price_val, employees_val):
    try:
        # 1. Parámetros del simulador
        mkt = float(mkt_val)
        price = float(price_val)
        employees = int(employees_val)
        
        # 2. Conexión a Snowflake para obtener el "piso" (historical lags)
        conn = snowflake.connector.connect(
            user=os.environ.get("SNOWFLAKE_USER"),
            password=os.environ.get("SNOWFLAKE_PASSWORD"),
            account=os.environ.get("SNOWFLAKE_ACCOUNT"),
            warehouse=os.environ.get("SNOWFLAKE_WAREHOUSE"),
            database=os.environ.get("SNOWFLAKE_DATABASE"),
            role=os.environ.get("SNOWFLAKE_ROLE"),
            schema="GOLD"
        )
        
        # Obtener los últimos 7 días de ventas para inicializar lags
        query = f"SELECT FECHA, VENTAS_REALES FROM mart_ventas_historicas "
        if branch_id != 'all':
            query += f"WHERE ID_SUCURSAL_SK = '{branch_id}' "
        query += "ORDER BY FECHA DESC LIMIT 14"
        
        df_hist = pd.read_sql(query, conn)
        conn.close()
        
        if df_hist.empty:
            # Fallback si no hay datos (sucursal nueva o error)
            last_sales = [8500] * 14
            last_date = datetime.now()
        else:
            df_hist = df_hist.sort_values('FECHA')
            last_sales = df_hist['VENTAS_REALES'].tolist()
            last_date = pd.to_datetime(df_hist['FECHA'].iloc[-1])

        # 3. Cargar el modelo XGBoost (el que usa lags)
        model_path = os.path.join(os.path.dirname(__file__), "../../../models/branch_models.pkl")
        
        model = None
        if os.path.exists(model_path):
            with open(model_path, 'rb') as f:
                models_dict = pickle.load(f)
                model = models_dict.get(branch_id) or list(models_dict.values())[0]

        # 4. Generar pronóstico a 180 días recursivo
        forecast = []
        current_lags = last_sales[-14:] # Necesitamos al menos 7 para lag_7
        
        for i in range(1, 181):
            target_date = last_date + timedelta(days=i)
            
            # Features para el modelo
            features = pd.DataFrame([{
                'mes': target_date.month,
                'dia_semana': target_date.weekday(),
                'lag_1': current_lags[-1],
                'lag_7': current_lags[-7],
                'rolling_mean_7': np.mean(current_lags[-7:])
            }])
            
            # Predicción Base (Modelo XGBoost entrenado con datos reales)
            if model:
                base_pred = float(model.predict(features)[0])
            else:
                base_pred = np.mean(current_lags) # Fallback estadístico simple
            
            # 5. Aplicar Lógica WHAT-IF (Impacto de Sliders)
            # Marketing: +1000 Bs = +4% (Referencia base: 2500 Bs)
            mkt_impact = 1 + ((mkt - 2500) / 1000) * 0.04
            
            # Precio: Elasticidad -1.5 (Referencia base: 55 Bs)
            price_impact = 1 + ((price - 55) / 55) * -1.5
            
            # Empleados: Punto óptimo 10. Penalización por falta de personal.
            emp_impact = min(1.0, 0.7 + (employees / 10) * 0.3)
            
            final_pred = base_pred * mkt_impact * price_impact * emp_impact
            
            # Asegurar que no sea negativo
            final_pred = max(0, final_pred)
            
            # Actualizar lags para la siguiente iteración
            current_lags.append(final_pred)
            
            # Banda de confianza estática basada en el modelo
            forecast.append({
                "date": target_date.strftime("%Y-%m-%d"),
                "ventas": round(final_pred, 2),
                "upper": round(final_pred * 1.15, 2),
                "lower": round(final_pred * 0.85, 2)
            })
            
        print(json.dumps(forecast))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print(json.dumps({"error": "Missing arguments"}))
        sys.exit(1)
    
    run_inference(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
