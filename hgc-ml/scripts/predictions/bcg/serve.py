"""
serve_bcg_clustering.py
────────────────────────────────────────────
Servidor MLflow para el modelo Caso 1 — Matriz BCG con Clustering.

El modelo campeón (Agglomerative — o el que haya ganado la competencia)
se registra desde el notebook y se sirve aquí en el puerto 5009.

Uso:
    python serve_bcg_clustering.py

Puerto: 5009
Endpoint: POST http://127.0.0.1:5009/invocations

Payload esperado (dataframe_split):
{
  "dataframe_split": {
    "columns": [
      "FEATURE_PARTICIPACION_VOLUMEN_PCT",
      "FEATURE_MARGEN_PORCENTUAL",
      "FEATURE_SHARE_GANANCIA_PCT",
      "FEATURE_TICKET_PROMEDIO"
    ],
    "data": [[12.5, 0.76, 35.2, 48.5]]
  }
}

Respuesta: { "predictions": [2] }   ← cluster_id (0-3)
"""

import os
import subprocess
import sys
import mlflow
from dotenv import load_dotenv

load_dotenv()

# ── Configuración ──────────────────────────────────────────────────────────────
MLFLOW_TRACKING_URI  = os.getenv("MLFLOW_TRACKING_URI", "sqlite:///mlflow.db")
EXPERIMENT_NAME      = "caso_1_bcg_product_clustering"
MODEL_PORT           = int(os.getenv("MLFLOW_BCG_PORT", 5009))

mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)

def get_champion_run_id() -> str:
    """Obtiene el run_id del modelo campeón (mayor Silhouette Score)."""
    client = mlflow.tracking.MlflowClient()

    try:
        experiment = client.get_experiment_by_name(EXPERIMENT_NAME)
        if experiment is None:
            raise ValueError(f"Experimento '{EXPERIMENT_NAME}' no encontrado. Ejecuta primero el notebook.")

        runs = client.search_runs(
            experiment_ids=[experiment.experiment_id],
            filter_string="tags.campeon = 'True'",
            order_by=["metrics.silhouette_score DESC"],
            max_results=1,
        )

        if not runs:
            # Fallback: el run con mejor silhouette sin filtro de tag
            runs = client.search_runs(
                experiment_ids=[experiment.experiment_id],
                order_by=["metrics.silhouette_score DESC"],
                max_results=1,
            )

        if not runs:
            raise ValueError("No se encontraron runs en el experimento. Ejecuta primero el notebook.")

        champion_run = runs[0]
        model_name   = champion_run.data.params.get("modelo", "Desconocido")
        silhouette   = champion_run.data.metrics.get("silhouette_score", 0)

        print(f"✅ Modelo campeón encontrado: {model_name}")
        print(f"   Run ID        : {champion_run.info.run_id}")
        print(f"   Silhouette    : {silhouette:.4f}")
        return champion_run.info.run_id

    except Exception as e:
        print(f"❌ Error buscando modelo campeón: {e}")
        sys.exit(1)


def serve_model(run_id: str):
    """Lanza el servidor MLflow en el puerto configurado."""
    model_uri = f"runs:/{run_id}/model"

    print(f"\n🚀 Iniciando servidor BCG Clustering...")
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
        print("\n⏹️  Servidor BCG Clustering detenido.")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Error al iniciar el servidor: {e}")
        sys.exit(1)


if __name__ == "__main__":
    print("=" * 55)
    print("  CASO 1 — BCG Clustering · MLflow Model Server")
    print("  Rentabilidad por Producto — Matriz BCG")
    print("=" * 55)
    run_id = get_champion_run_id()
    serve_model(run_id)
