"""
serve_clv.py
────────────────────────────────────────────
Servidor MLflow para el modelo Caso 2 — Customer Lifetime Value (CLV).

El modelo registrado 'HGC_CLV_Model_Pro' se sirve aquí en el puerto 5003.
"""

import os
import subprocess
import sys
import mlflow
from dotenv import load_dotenv

load_dotenv()

# ── Configuración ──────────────────────────────────────────────────────────────
MLFLOW_TRACKING_URI  = os.getenv("MLFLOW_TRACKING_URI", "sqlite:///mlflow.db")
MODEL_PORT           = int(os.getenv("MLFLOW_CLV_PORT", 5003))

def serve_model():
    """Lanza el servidor MLflow en el puerto configurado usando el modelo registrado."""
    model_uri = "models:/HGC_CLV_Model_Pro/latest"

    print(f"\n Iniciando servidor CLV (Customer Lifetime Value)...")
    print(f"   Modelo URI : {model_uri}")
    print(f"   Puerto     : {MODEL_PORT}")
    print(f"   Endpoint   : http://127.0.0.1:{MODEL_PORT}/invocations")
    print(f"\n   Presiona Ctrl+C para detener el servidor.\n")

    cmd = [
        sys.executable, "-m", "mlflow", "models", "serve",
        "--model-uri",   model_uri,
        "--port",        str(MODEL_PORT),
        "--host",        "127.0.0.1",
        "--env-manager", "local",
    ]

    import site
    env = os.environ.copy()
    env["MLFLOW_TRACKING_URI"] = MLFLOW_TRACKING_URI
    
    # Intentar encontrar la carpeta Scripts para Windows (donde estï¿½ uvicorn)
    venv_scripts = os.path.dirname(sys.executable)
    possible_scripts = [
        venv_scripts,
        os.path.join(site.getuserbase(), f"Python{sys.version_info.major}{sys.version_info.minor}", "Scripts"),
        os.path.join(site.getuserbase(), "Scripts"),
    ]
    
    for s_dir in possible_scripts:
        if os.path.exists(os.path.join(s_dir, "uvicorn.exe")):
            env["PATH"] = s_dir + os.pathsep + env.get("PATH", "")
            break
    else:
        # Fallback
        env["PATH"] = venv_scripts + os.pathsep + env.get("PATH", "")

    try:
        subprocess.run(cmd, check=True, env=env)
    except KeyboardInterrupt:
        print("\n  Servidor CLV detenido.")
    except subprocess.CalledProcessError as e:
        print(f"\n Error al iniciar el servidor CLV: {e}")
        sys.exit(1)


if __name__ == "__main__":
    print("=" * 55)
    print("  CASO 2 — Customer Lifetime Value · MLflow Model Server")
    print("=" * 55)
    serve_model()
