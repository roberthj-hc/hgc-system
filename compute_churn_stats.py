"""
Calcula la distribucion real de riesgo de churn por grupo de edad.
Carga el modelo pickle directamente (sin depender de MLflow paths).
"""
import os, json, pickle
import snowflake.connector
import pandas as pd
import numpy as np
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
PROJECT_DIR = Path(__file__).resolve().parent

# ── Cargar modelo desde disk directamente ──────────────────────────────────────
# Buscamos todos los model.pkl en mlruns y elegimos el LogisticRegression
model = None
for pkl in sorted(PROJECT_DIR.glob("mlruns/**/model.pkl"), key=lambda p: p.stat().st_mtime, reverse=True):
    try:
        with open(pkl, "rb") as f:
            obj = pickle.load(f)
        clf_name = type(obj.named_steps.get("clf", obj)).__name__
        if "Logistic" in clf_name:
            model = obj
            print(f"Modelo cargado: {clf_name} desde {pkl.parent.parent.name[:30]}")
            break
    except Exception:
        pass

if model is None:
    print("[ERROR] No se encontro LogisticRegression en mlruns")
    exit(1)

# ── Conectar a Snowflake y cargar datos ────────────────────────────────────────
print("Conectando a Snowflake...")
try:
    conn = snowflake.connector.connect(
        user=os.getenv("SNOWFLAKE_USER"),
        password=os.getenv("SNOWFLAKE_PASSWORD"),
        account=os.getenv("SNOWFLAKE_ACCOUNT"),
        warehouse=os.getenv("SNOWFLAKE_WAREHOUSE", "COMPUTE_WH"),
        database=os.getenv("SNOWFLAKE_DATABASE", "HGC_DB"),
        schema="TRAINING_DATASETS"
    )
    df = pd.read_sql('SELECT * FROM "TRAINING_DATASETS"."OBT_CHURN_PREDICTION"', conn)
    df.columns = [c.upper() for c in df.columns]
    print(f"Datos: {len(df):,} clientes | Columnas: {df.columns.tolist()}")
except Exception as e:
    print(f"[ERROR Snowflake] {e}")
    exit(1)

# ── Predecir ───────────────────────────────────────────────────────────────────
FEATURES = ['RANGO_EDAD', 'FEATURE_FRECUENCIA_HISTORICA', 'FEATURE_MONTO_GASTO_HISTORICO']
X = df[FEATURES].copy()
X['RANGO_EDAD'] = X['RANGO_EDAD'].fillna('Desconocido')
X['FEATURE_FRECUENCIA_HISTORICA']  = X['FEATURE_FRECUENCIA_HISTORICA'].fillna(0)
X['FEATURE_MONTO_GASTO_HISTORICO'] = X['FEATURE_MONTO_GASTO_HISTORICO'].fillna(0)

proba = model.predict_proba(X)[:, 1]
df['PROBA_CHURN']  = proba
df['NIVEL_RIESGO'] = pd.cut(proba,
    bins=[0, 0.35, 0.60, 1.0],
    labels=['Bajo', 'Medio', 'Alto'],
    include_lowest=True
)

# ── Stats globales ─────────────────────────────────────────────────────────────
total = len(df)
alto  = int((df['NIVEL_RIESGO'] == 'Alto').sum())
medio = int((df['NIVEL_RIESGO'] == 'Medio').sum())
bajo  = int((df['NIVEL_RIESGO'] == 'Bajo').sum())

rev_col = 'FEATURE_MONTO_GASTO_HISTORICO'
rev_alto  = float(df[df['NIVEL_RIESGO'] == 'Alto'][rev_col].sum())
rev_medio = float(df[df['NIVEL_RIESGO'] == 'Medio'][rev_col].sum())
rev_bajo  = float(df[df['NIVEL_RIESGO'] == 'Bajo'][rev_col].sum())

print(f"\nRiesgo Alto  : {alto:>8,} ({alto/total*100:.1f}%) | Bs {rev_alto:>15,.0f}")
print(f"Riesgo Medio : {medio:>8,} ({medio/total*100:.1f}%)")
print(f"Riesgo Bajo  : {bajo:>8,} ({bajo/total*100:.1f}%)")

# ── Stats por edad ─────────────────────────────────────────────────────────────
age_stats = []
for edad in sorted(df['RANGO_EDAD'].dropna().unique()):
    sub = df[df['RANGO_EDAD'] == edad]
    n = len(sub)
    n_alto  = int((sub['NIVEL_RIESGO'] == 'Alto').sum())
    n_medio = int((sub['NIVEL_RIESGO'] == 'Medio').sum())
    n_bajo  = int((sub['NIVEL_RIESGO'] == 'Bajo').sum())
    pct_alto = round(n_alto / n * 100, 1) if n > 0 else 0
    age_stats.append({
        "edad":      str(edad),
        "total":     int(n),
        "alto":      n_alto,
        "medio":     n_medio,
        "bajo":      n_bajo,
        "pct_alto":  pct_alto,
        "rev_alto":  round(float(sub[sub['NIVEL_RIESGO']=='Alto'][rev_col].sum()), 0)
    })
    print(f"  {edad:<12}: {n:>7,} clientes | Riesgo Alto: {pct_alto:>5.1f}%")

# ── Guardar JSON ───────────────────────────────────────────────────────────────
stats = {
    "total_clientes": total,
    "resumen": {
        "alto":  {"clientes": alto,  "pct": round(alto/total*100,1),  "revenue": round(rev_alto, 0)},
        "medio": {"clientes": medio, "pct": round(medio/total*100,1), "revenue": round(rev_medio, 0)},
        "bajo":  {"clientes": bajo,  "pct": round(bajo/total*100,1),  "revenue": round(rev_bajo, 0)},
    },
    "por_edad": sorted(age_stats, key=lambda x: x['pct_alto'], reverse=True),
    "modelo": "LogisticRegression | AUC=0.63 | Features: Frecuencia + Monto + Edad"
}

out = PROJECT_DIR / "hgc-back" / "src" / "predictions" / "churn" / "churn_stats.json"
with open(out, "w", encoding="utf-8") as f:
    json.dump(stats, f, indent=2, ensure_ascii=False)
print(f"\nGuardado en: {out}")
