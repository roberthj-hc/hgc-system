"""
serve.py - Servidor MLflow Caso 4: Churn Prediction (Puerto 5001)
Modelo: HGC_Churn_Model_Pro (v3 - sin data leakage, features: FRECUENCIA + MONTO)
Libera el puerto antes de iniciar para evitar WinError 10048.
"""
import os, subprocess, sys, time
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

MODEL_PORT = int(os.getenv("MLFLOW_CHURN_PORT", 5001))

SCRIPT_DIR  = Path(__file__).resolve().parent          # hgc-ml/scripts/predictions/churn/
HGC_ML_DIR  = SCRIPT_DIR.parent.parent.parent          # hgc-ml/
PROJECT_DIR = HGC_ML_DIR.parent                        # hgc-system/  <-- mlflow.db aqui

MLFLOW_DB  = PROJECT_DIR / "mlflow.db"
MODEL_URI  = "models:/HGC_Churn_Model_Pro/latest"


def kill_port(port: int):
    """Mata cualquier proceso que esté usando el puerto dado (Windows)."""
    try:
        result = subprocess.run(
            ["netstat", "-ano"],
            capture_output=True, text=True
        )
        for line in result.stdout.splitlines():
            if f":{port}" in line and ("LISTENING" in line or "ESTABLISHED" in line):
                parts = line.strip().split()
                pid = parts[-1]
                if pid.isdigit() and int(pid) != 0:
                    subprocess.run(["taskkill", "/F", "/PID", pid],
                                   capture_output=True)
                    print(f"   [LIMPIEZA] Proceso PID {pid} en puerto {port} terminado.")
        time.sleep(1)
    except Exception as e:
        print(f"   [AVISO] No se pudo limpiar puerto {port}: {e}")


def serve_model():
    print(f"\n Iniciando servidor Churn (sin data leakage)...")
    print(f"   MLflow DB  : {MLFLOW_DB}")
    print(f"   Modelo     : {MODEL_URI}")
    print(f"   Puerto     : {MODEL_PORT}")
    print(f"   Endpoint   : http://127.0.0.1:{MODEL_PORT}/invocations\n")

    if not MLFLOW_DB.exists():
        print(f"[ERROR] mlflow.db no encontrado en: {MLFLOW_DB}")
        sys.exit(1)

    kill_port(MODEL_PORT)

    cmd = [
        "C:\\Users\\Windows\\OneDrive\\Documentos\\PROY - hgc\\New folder\\hgc-system\\hgc-ml\\venv\\Scripts\\python.exe", "-m", "mlflow", "models", "serve",
        "--model-uri",   MODEL_URI,
        "--port",        str(MODEL_PORT),
        "--host",        "127.0.0.1",
        "--env-manager", "local",
    ]
    env = os.environ.copy()
    env["MLFLOW_TRACKING_URI"] = f"sqlite:///{MLFLOW_DB}"
    env["PATH"] = os.path.dirname("C:\\Users\\Windows\\OneDrive\\Documentos\\PROY - hgc\\New folder\\hgc-system\\hgc-ml\\venv\\Scripts\\python.exe") + os.pathsep + env.get("PATH", "")

    try:
        subprocess.run(cmd, check=True, env=env)
    except KeyboardInterrupt:
        print("\n Servidor Churn detenido.")
    except subprocess.CalledProcessError as e:
        print(f"\n Error: {e}"); sys.exit(1)


if __name__ == "__main__":
    print("=" * 55)
    print("  CASO 4 - Churn Prediction - MLflow Model Server")
    print("=" * 55)
    serve_model()


