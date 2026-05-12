from dotenv import load_dotenv
import subprocess
import sys
from pathlib import Path
import os
import json

import pandas as pd
import snowflake.connector

# ================================
# CONFIG
# ================================

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)


def run_cmd(cmd):
    result = subprocess.run(cmd)
    if result.returncode != 0:
        print(f"Error ejecutando: {' '.join(cmd)}")
        sys.exit(result.returncode)


# ================================
# CONEXIÓN SNOWFLAKE
# ================================

def get_snowflake_conn():
    return snowflake.connector.connect(
        user=os.getenv("SNOWFLAKE_USER"),
        password=os.getenv("SNOWFLAKE_PASSWORD"),
        account=os.getenv("SNOWFLAKE_ACCOUNT"),
        warehouse=os.getenv("SNOWFLAKE_WAREHOUSE"),
        database=os.getenv("SNOWFLAKE_DATABASE"),
        schema=os.getenv("SNOWFLAKE_SCHEMA")  # FEATURES
    )


# ================================
# FETCH DATA
# ================================

def fetch_table(table_name):
    print(f"→ Leyendo {table_name} desde Snowflake...")
    conn = get_snowflake_conn()

    df = pd.read_sql(f"SELECT * FROM {table_name}", conn)

    conn.close()
    return df


# ================================
# EXPORT JSON
# ================================

def export_to_json(table_name):
    df = fetch_table(table_name)

    output_dir = Path("data_exports")
    output_dir.mkdir(exist_ok=True)

    file_name = table_name.split(".")[-1].lower() + ".json"
    file_path = output_dir / file_name

    df.to_json(file_path, orient="records", date_format="iso")

    print(f"✔ {table_name} exportada a {file_path}")


# ================================
# MAIN
# ================================

def main():
    print("=== PIPELINE DE DATOS ===\n")

    # ----------------------------
    # 1. DBT
    # ----------------------------
    run_dbt = input("¿Quieres ejecutar transformaciones dbt? (s/n): ").strip().lower()

    if run_dbt == "s":
        print("\n=== Ejecutando dbt ===")
        run_cmd(["dbt", "deps"])
        run_cmd(["dbt", "build"])
        print("✔ dbt terminó correctamente\n")
    else:
        print("⚠ Saltando dbt\n")

    # ----------------------------
    # 2. EXPORTACIÓN
    # ----------------------------
    print("¿Qué deseas hacer con los datos?")
    print("1. Exportar FEATURES a JSON (recomendado)")
    print("2. No hacer nada (usar Snowflake directo)")

    option = input("Selecciona una opción: ").strip()

    # SOLO FEATURES (como decidiste)
    tables = [
        "FEATURES.INT_VENTAS_DIARIAS_SUCURSAL",
        "FEATURES.FEAT_TS_DESC__G_REGIONAL",
        "FEATURES.FEAT_TS_DIAG__G_REGIONAL",
        "FEATURES.FEAT_TS_PRED__G_REGIONAL",
        "ECONOMETRICS.ECO_COSTOS_EFICIENCIA__CFO",
        "ECONOMETRICS.ECO_ELASTICIDAD_PRECIO_DEMANDA__CFO",
        "ECONOMETRICS.INT_COSTOS_INGRESOS_MES",
        "ECONOMETRICS.INT_VENTAS_PRODUCTO_SEMANA",
    ]

    if option == "1":
        print("\n=== Exportando datos ===")
        for table in tables:
            export_to_json(table)

        print("\n✔ Exportación completa")

    else:
        print("\n✔ No se realizó exportación")


if __name__ == "__main__":
    main()