"""
Ejecuta dbt snapshot y luego aplica grants de TRAINING_DATASETS.
Carga el .env correctamente usando python-dotenv (evita problemas con CRLF y chars especiales).
"""
import subprocess, os, sys
from dotenv import dotenv_values

ENV_PATH = '/opt/airflow/.env'
DBT_DIR  = '/opt/airflow/dbt'

# Cargar env vars del .env
env_vars = dotenv_values(ENV_PATH)
env_final = os.environ.copy()
env_final.update(env_vars)

print('=== STEP 1: dbt snapshot ===')
result = subprocess.run(
    ['dbt', 'snapshot', '--profiles-dir', '.'],
    cwd=DBT_DIR,
    env=env_final,
    capture_output=False,
    text=True
)
print('Exit code:', result.returncode)

if result.returncode != 0:
    print('dbt snapshot fallo - verificar logs arriba')
    sys.exit(1)

print('\n=== STEP 2: Aplicar grants TRAINING_DATASETS ===')
import snowflake.connector

conn = snowflake.connector.connect(
    user=env_final.get('SNOWFLAKE_USER'),
    password=env_final.get('SNOWFLAKE_PASSWORD'),
    account=env_final.get('SNOWFLAKE_ACCOUNT'),
    warehouse=env_final.get('SNOWFLAKE_WAREHOUSE'),
    database=env_final.get('SNOWFLAKE_DATABASE'),
    role='ACCOUNTADMIN'
)
cur = conn.cursor()

grants = [
    "GRANT USAGE ON DATABASE HGC_DW TO ROLE ROL_HGC_DBT",
    "GRANT USAGE ON SCHEMA HGC_DW.TRAINING_DATASETS TO ROLE ROL_HGC_DBT",
    "GRANT CREATE TABLE ON SCHEMA HGC_DW.TRAINING_DATASETS TO ROLE ROL_HGC_DBT",
    "GRANT CREATE VIEW ON SCHEMA HGC_DW.TRAINING_DATASETS TO ROLE ROL_HGC_DBT",
    "GRANT SELECT ON ALL TABLES IN SCHEMA HGC_DW.TRAINING_DATASETS TO ROLE ROL_HGC_DBT",
    "GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA HGC_DW.TRAINING_DATASETS TO ROLE ROL_HGC_DBT",
    "GRANT SELECT ON ALL TABLES IN SCHEMA HGC_DW.SNAPSHOTS TO ROLE ROL_HGC_DBT",
    "GRANT ALTER ON SCHEMA HGC_DW.TRAINING_DATASETS TO ROLE ROL_HGC_DBT",
]

for g in grants:
    try:
        cur.execute(g)
        print('OK: ' + g.split(' TO')[0][-50:])
    except Exception as e:
        print('WARN: ' + str(e)[:80])

conn.close()
print('\nTodo completado.')
