from dotenv import load_dotenv
import subprocess
import sys
from pathlib import Path

# Ruta al .env 
env_path = Path(__file__).resolve().parent.parent / ".env"
# Cargar variables de entorno
load_dotenv(env_path)

def run_cmd(cmd):
    result = subprocess.run(cmd)
    if result.returncode != 0:
        print(f"Error ejecutando: {' '.join(cmd)}")
        sys.exit(result.returncode)

# 1 Instalar dependencias de dbt
run_cmd(["dbt", "deps"])

# 2 Ejecutar build
run_cmd(["dbt", "build"])

print("dbt terminó correctamente")