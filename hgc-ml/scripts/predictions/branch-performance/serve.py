import os
import subprocess
import sys
import mlflow
from dotenv import load_dotenv

load_dotenv()

# Configuración
MLFLOW_TRACKING_URI = "sqlite:///mlflow.db"
EXPERIMENT_NAME = "caso_3_branch_performance"
MODEL_PORT = 5010

mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)

def get_champion_run_id() -> str:
    """Obtiene el run_id del modelo campeon (mejor R2)."""
    client = mlflow.tracking.MlflowClient()

    try:
        experiment = client.get_experiment_by_name(EXPERIMENT_NAME)
        if experiment is None:
            raise ValueError(f"Experimento '{EXPERIMENT_NAME}' no encontrado.")

        runs = client.search_runs(
            experiment_ids=[experiment.experiment_id],
            filter_string="tags.campeon = 'True'",
            order_by=["metrics.best_r2 DESC"],
            max_results=1,
        )

        if not runs:
            # Fallback: el run con mejor R2 sin tag
            runs = client.search_runs(
                experiment_ids=[experiment.experiment_id],
                order_by=["metrics.r2 DESC"],
                max_results=1,
            )

        if not runs:
            raise ValueError("No se encontraron runs en el experimento.")

        champion_run = runs[0]
        algoritmo = champion_run.data.tags.get("algoritmo", "Desconocido")
        r2 = champion_run.data.metrics.get("best_r2") or champion_run.data.metrics.get("r2", 0)

        print(f"Modelo campeon: {algoritmo}")
        print(f"Run ID        : {champion_run.info.run_id}")
        print(f"R2 Score      : {r2:.4f}")
        return champion_run.info.run_id

    except Exception as e:
        print(f"Error buscando modelo campeon: {e}")
        sys.exit(1)

def serve_model(run_id: str):
    """Lanza el servidor MLflow."""
    # En el script de entrenamiento, guardamos el campeon como 'champion_model' 
    # o como 'model' en los runs individuales.
    model_uri = f"runs:/{run_id}/champion_model"

    # Use the direct python executable from the venv to run mlflow module
    python_exe = sys.executable
    cmd = [python_exe, "-m", "mlflow", "models", "serve", "--model-uri", model_uri, "--port", str(MODEL_PORT), "--host", "127.0.0.1", "--env-manager", "local"]

    # Es obligatorio pasar el TRACKING_URI al subproceso para que mlflow serve lo encuentre
    import site
    env = os.environ.copy()
    env["MLFLOW_TRACKING_URI"] = MLFLOW_TRACKING_URI
    
    # Intentar encontrar la carpeta Scripts para Windows (donde estï¿½ uvicorn)
    venv_scripts = os.path.dirname(python_exe)
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

    print(f"Iniciando servidor Caso 3 en puerto {MODEL_PORT}...")
    try:
        subprocess.run(cmd, check=True, env=env)
    except KeyboardInterrupt:
        print("\nServidor detenido.")
    except subprocess.CalledProcessError as e:
        print(f"Error al iniciar el servidor: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("=======================================================")
    print("  CASO 3 - PRODUCTIVIDAD SUCURSALES - MODEL SERVER")
    print("=======================================================")
    run_id = get_champion_run_id()
    serve_model(run_id)
