from airflow import DAG
from airflow.operators.bash import BashOperator
from datetime import datetime, timedelta
from dotenv import dotenv_values
import os

# Rutas de los volumenes montados dentro de los contenedores Docker
DBT_DIR = "/opt/airflow/dbt"
ENV_PATH = "/opt/airflow/.env"

# Cargar variables del .env para las credenciales de Snowflake
# Estas variables son requeridas por dbt/profiles.yml
env_vars = dotenv_values(ENV_PATH)
env_final = os.environ.copy()
env_final.update(env_vars)

default_args = {
    'owner': 'airflow',
    'depends_on_past': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

with DAG(
    'hgc_transformaciones_dbt',
    default_args=default_args,
    description='Ejecuta dbt local desde el contenedor de Airflow',
    schedule='0 4 * * *', # Se ejecuta todos los dias a las 4:00 AM
    start_date=datetime(2026, 4, 1),
    catchup=False,
) as dag:

    # 1. Asegurar que los paquetes esten instalados (sin borrarlos)
    # NOTA: dbt clean NO se ejecuta aqui porque elimina dbt_packages/
    # y puede fallar si dbt Hub no responde. Solo limpiamos target/.
    ensure_deps = BashOperator(
        task_id='dbt_deps',
        bash_command=f"cd '{DBT_DIR}' && rm -rf target/ && dbt deps --profiles-dir .",
        env=env_final,
    )

    # 2. Ejecutar snapshots (crea/actualiza tablas SNP_* en schema SNAPSHOTS)
    # Estas tablas son requeridas por los modelos intermediate (int_productos_enriquecidos, etc.)
    run_snapshots = BashOperator(
        task_id='dbt_snapshot',
        bash_command=f"cd '{DBT_DIR}' && dbt snapshot --profiles-dir .",
        env=env_final,
    )

    # 3. Ejecutar las transformaciones (dbt run)
    # NOTA: Si ROL_HGC_DBT no tiene privilegios en TRAINING_DATASETS, ejecutar en Snowflake:
    #   GRANT USAGE ON SCHEMA HGC_DW.TRAINING_DATASETS TO ROLE ROL_HGC_DBT;
    #   GRANT CREATE TABLE ON SCHEMA HGC_DW.TRAINING_DATASETS TO ROLE ROL_HGC_DBT;
    run_dbt = BashOperator(
        task_id='dbt_run',
        bash_command=f"cd '{DBT_DIR}' && dbt run --profiles-dir .",
        env=env_final,
    )

    # 4. Validar que los datos esten correctos (dbt test)
    test_dbt = BashOperator(
        task_id='dbt_test',
        bash_command=f"cd '{DBT_DIR}' && dbt test --profiles-dir .",
        env=env_final,
    )

    ensure_deps >> run_snapshots >> run_dbt >> test_dbt
