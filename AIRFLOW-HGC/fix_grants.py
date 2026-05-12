"""
Otorga permisos necesarios a ROL_HGC_DBT en HGC_DW.TRAINING_DATASETS
usando ACCOUNTADMIN desde el container.
"""
import snowflake.connector, os
from dotenv import load_dotenv

load_dotenv('/opt/airflow/.env')

conn = snowflake.connector.connect(
    user=os.getenv('SNOWFLAKE_USER'),
    password=os.getenv('SNOWFLAKE_PASSWORD'),
    account=os.getenv('SNOWFLAKE_ACCOUNT'),
    warehouse=os.getenv('SNOWFLAKE_WAREHOUSE'),
    database=os.getenv('SNOWFLAKE_DATABASE'),
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
]

for g in grants:
    try:
        cur.execute(g)
        print('OK: ' + g)
    except Exception as e:
        print('WARN: ' + str(e)[:80])

print('\nDone.')
