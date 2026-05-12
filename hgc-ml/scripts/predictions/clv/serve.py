"""
serve_clv.py — Servidor MLflow Caso 2: CLV (Puerto 5003)
Usa ruta física local para compatibilidad entre máquinas.
Libera el puerto antes de iniciar para evitar WinError 10048.
"""
import os, subprocess, sys, time
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

MODEL_PORT = int(os.getenv("MLFLOW_CLV_PORT", 5003))

HGC_ML_DIR = Path(__file__).resolve().parent.parent.parent.parent
MODEL_PATH  = HGC_ML_DIR / "mlruns" / "3" / "models" / "m-646d1ab0be7248a2becb49698de43cb6" / "artifacts"


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
    print(f"\n Iniciando servidor CLV (Customer Lifetime Value)...")
    print(f"   Modelo PATH : {MODEL_PATH}")
    print(f"   Puerto      : {MODEL_PORT}")
    print(f"   Endpoint    : http://127.0.0.1:{MODEL_PORT}/invocations\n")

    if not MODEL_PATH.exists():
        print(f"[ERROR] Ruta del modelo no encontrada: {MODEL_PATH}")
        sys.exit(1)

    kill_port(MODEL_PORT)

    cmd = [
        "C:\\Users\\Windows\\OneDrive\\Documentos\\PROY - hgc\\New folder\\hgc-system\\hgc-ml\\venv\\Scripts\\python.exe", "-m", "mlflow", "models", "serve",
        "--model-uri",   str(MODEL_PATH),
        "--port",        str(MODEL_PORT),
        "--host",        "127.0.0.1",
        "--env-manager", "local",
    ]
    env = os.environ.copy()
    env["MLFLOW_TRACKING_URI"] = f"sqlite:///{HGC_ML_DIR}/mlflow.db"
    env["PATH"] = os.path.dirname("C:\\Users\\Windows\\OneDrive\\Documentos\\PROY - hgc\\New folder\\hgc-system\\hgc-ml\\venv\\Scripts\\python.exe") + os.pathsep + env.get("PATH", "")

    try:
        subprocess.run(cmd, check=True, env=env)
    except KeyboardInterrupt:
        print("\n Servidor CLV detenido.")
    except subprocess.CalledProcessError as e:
        print(f"\n Error: {e}"); sys.exit(1)


if __name__ == "__main__":
    print("=" * 55)
    print("  CASO 2 — Customer Lifetime Value · MLflow Model Server")
    print("=" * 55)
    serve_model()


