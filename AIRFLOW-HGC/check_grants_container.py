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

print('=== TRAINING_DATASETS grants ===')
try:
    cur.execute('SHOW GRANTS ON SCHEMA HGC_DW.TRAINING_DATASETS')
    for r in cur.fetchall():
        print(' ', r[1], r[5])
except Exception as e:
    print('  Error:', e)

print('\n=== SNAPSHOTS tables ===')
for t in ['SNP_PRODUCTO', 'SNP_EMPLEADO', 'SNP_CLIENTE', 'SNP_SUCURSAL']:
    try:
        cur.execute('SELECT COUNT(*) FROM HGC_DW.SNAPSHOTS.' + t)
        print('  ' + t + ': ' + str(cur.fetchone()[0]) + ' filas')
    except Exception as e:
        print('  ' + t + ': ERROR - ' + str(e)[:80])

print('\n=== Current role grants ===')
try:
    cur.execute('SHOW GRANTS TO ROLE ROL_HGC_DBT')
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description]
    for r in rows:
        row = dict(zip(cols, r))
        priv = row.get('privilege', '?')
        name = row.get('name', '?')
        on = row.get('granted_on', '?')
        if 'TRAINING' in str(name) or 'SNAPSHOT' in str(name):
            print('  ' + priv + ' ON ' + str(on) + ' ' + str(name))
except Exception as e:
    print('  Error:', e)
