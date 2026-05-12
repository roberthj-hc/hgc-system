import pandas as pd
import snowflake.connector
import os
from dotenv import load_dotenv
import requests

def fetch_external_bolivia_data():
    """
    Obtiene datos externos de población y coordenadas aproximadas de los departamentos 
    de Bolivia. En un caso de uso real se consultaría una API, aquí se usan 
    proyecciones reales del INE Bolivia para 2024 a modo de cruce estático.
    """
    print("Obteniendo datos externos de Demografía de Bolivia (Proyecciones INE)...")
    data = {
        'departamento': ['La Paz', 'Cochabamba', 'Santa Cruz', 'Oruro', 'Potosi', 'Tarija', 'Chuquisaca', 'Beni', 'Pando'],
        'poblacion_aprox_2024': [3100000, 2150000, 3600000, 560000, 930000, 620000, 660000, 520000, 160000],
        'idh_aprox': [0.704, 0.712, 0.768, 0.698, 0.584, 0.720, 0.655, 0.664, 0.680],
        'altitud_metros': [3640, 2570, 400, 3709, 4090, 1854, 2790, 155, 280]
    }
    return pd.DataFrame(data)

def get_snowflake_data():
    """
    Conecta a Snowflake leyendo el archivo .env raíz y descarga los datos reales
    de mart_sucursales_consolidado generados por dbt.
    """
    print("Conectando a Snowflake para obtener datos reales de sucursales...")
    # Encontrar dinámicamente la ruta de la raíz hgc-system para leer el .env
    base_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.abspath(os.path.join(base_dir, '../../../.env'))
    
    if not os.path.exists(env_path):
        print(f"Error: No se encontró el archivo .env en {env_path}")
        return pd.DataFrame(columns=['id_sucursal_nk', 'nombre_sucursal', 'ciudad', 'direccion', 'total_ventas', 'total_mermas', 'ticket_promedio'])
        
    load_dotenv(dotenv_path=env_path)
    
    try:
        conn = snowflake.connector.connect(
            user=os.environ.get("SNOWFLAKE_USER"),
            password=os.environ.get("SNOWFLAKE_PASSWORD"),
            account=os.environ.get("SNOWFLAKE_ACCOUNT"),
            warehouse=os.environ.get("SNOWFLAKE_WAREHOUSE"),
            database=os.environ.get("SNOWFLAKE_DATABASE"),
            schema=os.environ.get("SNOWFLAKE_SCHEMA", "PUBLIC")
        )
        
        query = """
        SELECT 
            id_sucursal_nk,
            nombre_sucursal,
            ciudad,
            direccion,
            total_ventas,
            total_mermas,
            ticket_promedio
        FROM GOLD.mart_sucursales_consolidado
        """
        
        df = pd.read_sql(query, conn)
        conn.close()
        
        # Estandarizar nombres de columnas a minúsculas
        df.columns = [col.lower() for col in df.columns]
        return df
        
    except Exception as e:
        print(f"Error conectando a Snowflake: {e}")
        print("Asegúrate de que las credenciales en .env son correctas y el modelo dbt se haya ejecutado.")
        # Retornamos un DataFrame vacío para no fallar de manera brusca
        return pd.DataFrame(columns=['id_sucursal_nk', 'nombre_sucursal', 'ciudad', 'direccion', 'total_ventas', 'total_mermas', 'ticket_promedio'])

def generate_obt():
    # 1. Extraer
    df_internal = get_snowflake_data()
    
    if df_internal.empty:
        print("No se generó OBT porque no hay datos de Snowflake.")
        return
        
    df_external = fetch_external_bolivia_data()
    
    # 2. Transformar / Integrar
    print("Integrando datos internos y externos...")
    # Limpiamos el nombre de la ciudad para que coincida con el departamento
    df_internal['departamento'] = df_internal['ciudad'].apply(
        lambda x: next((dep for dep in df_external['departamento'] if dep.lower() in str(x).lower()), None)
    )
    
    obt = pd.merge(df_internal, df_external, on='departamento', how='left')
    
    # Feature Engineering (Ej. Ventas per capita en la ciudad)
    # Reemplazamos los ceros o nulos para evitar división por cero
    obt['poblacion_aprox_2024'] = obt['poblacion_aprox_2024'].fillna(1000000)
    obt['ventas_per_capita_aprox'] = obt['total_ventas'] / (obt['poblacion_aprox_2024'] / 1000) # por mil habs
    
    # 3. Cargar (Guardar)
    output_path = os.path.join(os.path.dirname(__file__), 'OBT_geo_expansion.csv')
    obt.to_csv(output_path, index=False)
    print(f"OBT generada exitosamente con datos reales en: {output_path}")

if __name__ == "__main__":
    generate_obt()
