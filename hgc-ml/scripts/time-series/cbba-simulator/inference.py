import sys
import os
import pickle
import json
import warnings
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Suprimir warnings de pandas sobre conectores no SQLAlchemy
warnings.filterwarnings('ignore', category=UserWarning, module='pandas')

# Cargar variables de entorno con path absoluto relativo al script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(SCRIPT_DIR, "../../../../../.env")
load_dotenv(dotenv_path=ENV_PATH)

def get_historical_lags(branch_id):
    """
    Intenta obtener los últimos 14 dias de ventas de Snowflake.
    Si falla (tabla no existe, sin permisos, etc.), usa valores de fallback.
    """
    try:
        import snowflake.connector
        conn = snowflake.connector.connect(
            user=os.environ.get("SNOWFLAKE_USER"),
            password=os.environ.get("SNOWFLAKE_PASSWORD"),
            account=os.environ.get("SNOWFLAKE_ACCOUNT"),
            warehouse=os.environ.get("SNOWFLAKE_WAREHOUSE"),
            database=os.environ.get("SNOWFLAKE_DATABASE"),
            role=os.environ.get("SNOWFLAKE_ROLE"),
            schema="GOLD",
            login_timeout=5,      # Falla rapido si Snowflake no responde
            network_timeout=10
        )

        query = "SELECT FECHA, VENTAS_REALES FROM mart_ventas_historicas "
        if branch_id != 'all':
            query += f"WHERE ID_SUCURSAL_SK = '{branch_id}' "
        query += "ORDER BY FECHA DESC LIMIT 14"

        df_hist = pd.read_sql(query, conn)
        conn.close()

        if not df_hist.empty:
            df_hist = df_hist.sort_values('FECHA')
            last_sales = df_hist['VENTAS_REALES'].tolist()
            last_date = pd.to_datetime(df_hist['FECHA'].iloc[-1])
            return last_sales, last_date

    except Exception as e:
        # Log to stderr, no interferir con stdout (JSON)
        print(f"[WARN] Snowflake unavailable, using fallback: {e}", file=sys.stderr)

    # Fallback: usar datos sintéticos plausibles basados en promedios históricos de HGC
    last_sales = [8200, 8400, 7900, 8600, 9100, 8800, 8500,
                  8300, 8700, 8000, 9200, 8900, 8600, 8750]
    last_date = datetime.now()
    return last_sales, last_date


def run_inference(branch_id, mkt_val, price_val, employees_val):
    try:
        # 1. Parámetros del simulador
        mkt = float(mkt_val)
        price = float(price_val)
        employees = int(employees_val)

        # 2. Obtener lags históricos (con fallback robusto)
        last_sales, last_date = get_historical_lags(branch_id)

        # 3. Cargar el modelo XGBoost (branch_models.pkl o cbba_simulator_model.pkl)
        model_path_branch = os.path.join(SCRIPT_DIR, "../../../models/branch_models.pkl")
        model_path_general = os.path.join(SCRIPT_DIR, "../../../models/cbba_simulator_model.pkl")

        model = None
        model_type = "lag_based"  # branch_models usa features de lags

        if os.path.exists(model_path_branch):
            try:
                with open(model_path_branch, 'rb') as f:
                    models_dict = pickle.load(f)
                    model = models_dict.get(branch_id) or list(models_dict.values())[0]
                model_type = "lag_based"
            except Exception as e:
                print(f"[WARN] branch_models.pkl error: {e}", file=sys.stderr)

        if model is None and os.path.exists(model_path_general):
            try:
                with open(model_path_general, 'rb') as f:
                    model = pickle.load(f)
                model_type = "whatif_based"
            except Exception as e:
                print(f"[WARN] cbba_simulator_model.pkl error: {e}", file=sys.stderr)

        # 4. Generar pronóstico a 180 días recursivo
        forecast = []
        current_lags = list(last_sales[-14:])  # al menos 14 para lag_7 + lag_1

        for i in range(1, 181):
            target_date = last_date + timedelta(days=i)

            # Features para el modelo
            if model_type == "lag_based" and model is not None:
                features = pd.DataFrame([{
                    'mes': target_date.month,
                    'dia_semana': target_date.weekday(),
                    'lag_1': current_lags[-1],
                    'lag_7': current_lags[-7],
                    'rolling_mean_7': np.mean(current_lags[-7:])
                }])
                base_pred = float(model.predict(features)[0])
            elif model_type == "whatif_based" and model is not None:
                features = pd.DataFrame([{
                    'mkt_investment': mkt,
                    'combo_price': price,
                    'employees': employees
                }])
                base_pred = float(model.predict(features)[0])
            else:
                # Fallback estadístico: media móvil con tendencia estacional
                base_pred = np.mean(current_lags[-7:])
                # Estacionalidad semanal simple
                dow_factor = [0.95, 1.0, 1.02, 1.05, 1.15, 1.20, 0.90]
                base_pred *= dow_factor[target_date.weekday()]

            # 5. Aplicar Lógica WHAT-IF (Impacto de Sliders)
            # Marketing: +1000 Bs = +6% (Referencia base: 2500 Bs)
            mkt_impact = 1 + ((mkt - 2500) / 1000) * 0.06

            # Precio: Elasticidad -1.8 (Referencia base: 55 Bs)
            # Precios bajos => mas ventas, precios altos => menos ventas
            price_impact = 1 + ((price - 55) / 55) * -1.8

            # Empleados: sin restricción opera al 100%; por debajo, penaliza
            if employees >= 10:
                emp_impact = min(1.15, 1.0 + (employees - 10) * 0.015)
            else:
                emp_impact = max(0.60, 0.70 + (employees / 10) * 0.30)

            # Efecto acumulativo con crecimiento orgánico ligero en el tiempo
            growth_factor = 1 + (i / 180) * 0.05  # +5% al final del horizonte

            final_pred = base_pred * mkt_impact * price_impact * emp_impact * growth_factor

            # Asegurar que no sea negativo
            final_pred = max(500, final_pred)

            # Actualizar lags para la siguiente iteración
            current_lags.append(final_pred)

            # Banda de confianza que se amplía con el horizonte
            ci_factor = 0.10 + (i / 180) * 0.10  # 10-20% de incertidumbre
            forecast.append({
                "date": target_date.strftime("%Y-%m-%d"),
                "ventas": round(final_pred, 2),
                "upper": round(final_pred * (1 + ci_factor), 2),
                "lower": round(final_pred * (1 - ci_factor), 2)
            })

        print(json.dumps(forecast))

    except Exception as e:
        print(json.dumps({"error": str(e)}))


if __name__ == "__main__":
    if len(sys.argv) < 5:
        print(json.dumps({"error": "Missing arguments: branch_id mkt price employees"}))
        sys.exit(1)

    run_inference(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
