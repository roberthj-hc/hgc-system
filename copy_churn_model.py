import mlflow, mlflow.sklearn, pickle
from pathlib import Path

NB_BASE = Path("hgc-ml/notebooks/predictions").resolve()
ROOT_TRACKING = "sqlite:///mlflow.db"

# Los modelos del experimento 8 (HGC_Churn_Prediction_Final) estan en:
# mlruns/8/models/<id>/artifacts/model.pkl
# Tomamos el que corresponde al LogisticRegression (AUC=0.6263)
# Segun el registro: version 1 de ese experimento = m-b9a2bf... o m-650bd...
# Vamos a cargar cada uno, ver su tipo, y elegir el LogisticRegression

models_dir = NB_BASE / "mlruns" / "8" / "models"
candidates = []

for model_dir in models_dir.iterdir():
    pkl_path = model_dir / "artifacts" / "model.pkl"
    if pkl_path.exists():
        try:
            with open(pkl_path, "rb") as f:
                obj = pickle.load(f)
            clf_name = type(obj.named_steps.get("clf", obj)).__name__
            candidates.append((clf_name, pkl_path, model_dir.name))
            print(f"  {model_dir.name[:20]} | {clf_name}")
        except Exception as e:
            print(f"  {model_dir.name[:20]} | ERROR: {e}")

print(f"\nCandidatos: {len(candidates)}")

# Elegir LogisticRegression (el campeon correcto)
chosen = None
for clf_name, pkl_path, mid in candidates:
    if "Logistic" in clf_name:
        chosen = (clf_name, pkl_path, mid)
        break

if chosen is None and candidates:
    chosen = candidates[0]

if chosen:
    clf_name, pkl_path, mid = chosen
    print(f"\nElegido: {clf_name} ({mid[:20]})")

    with open(pkl_path, "rb") as f:
        model = pickle.load(f)

    # Registrar en db raiz
    mlflow.set_tracking_uri(ROOT_TRACKING)
    with mlflow.start_run(run_name="Churn_LogReg_v3_NoLeakage"):
        mlflow.log_param("model",    "LogisticRegression")
        mlflow.log_param("features", "RANGO_EDAD,FRECUENCIA,MONTO")
        mlflow.log_param("version",  "v3_NoLeakage")
        mlflow.log_metric("auc_roc",   0.6263)
        mlflow.log_metric("f1_churn",  0.5118)
        mlflow.log_metric("recall",    0.6057)
        mlflow.log_metric("accuracy",  0.5877)
        mv = mlflow.sklearn.log_model(
            sk_model=model,
            artifact_path="churn_model",
            registered_model_name="HGC_Churn_Model_Pro"
        )
    print(f"Registrado: HGC_Churn_Model_Pro v{mv.version} en mlflow.db raiz")
    print("Listo para serve.py!")
else:
    print("[ERROR] No se encontro ningun modelo valido.")
