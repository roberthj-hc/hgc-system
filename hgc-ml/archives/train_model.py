# ==============================================================================
# MODELO CHURN - VERSION LOCAL
# ==============================================================================

import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score

from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from xgboost import XGBClassifier

# ==============================================================================
# 1. CARGA DE DATOS (LOCAL)
# ==============================================================================
df = pd.read_csv("data/dataset_churn.csv")

print(f"Dataset cargado: {df.shape[0]} registros\n")

# ==============================================================================
# 2. PREPROCESAMIENTO
# ==============================================================================
for col in ['RANGO_EDAD', 'SEGMENTO']:
    if col not in df.columns:
        df[col] = 'DESCONOCIDO'
    df[col] = df[col].fillna('DESCONOCIDO')

df['TICKET_PROMEDIO'] = df['TICKET_PROMEDIO'].fillna(0)
df['RITMO_COMPRA_DIAS'] = df['RITMO_COMPRA_DIAS'].fillna(999)

le = LabelEncoder()
for col in ['SEGMENTO', 'RANGO_EDAD']:
    df[col] = le.fit_transform(df[col].astype(str))

# ==============================================================================
# 3. VARIABLES
# ==============================================================================
columnas_excluidas = ['ID_CLIENTE_NK', 'CHURN_LABEL']
X = df.drop(columns=[c for c in columnas_excluidas if c in df.columns])
y = df['CHURN_LABEL']

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# ==============================================================================
# 4. MODELOS
# ==============================================================================
modelos = {
    "Logística": LogisticRegression(max_iter=1000, class_weight='balanced'),
    "Árbol": DecisionTreeClassifier(max_depth=12, class_weight='balanced'),
    "Random Forest": RandomForestClassifier(n_estimators=150, max_depth=20, n_jobs=-1, class_weight='balanced'),
    "Gradient Boosting": GradientBoostingClassifier(n_estimators=300, max_depth=7, learning_rate=0.05),
    "XGBoost": XGBClassifier(n_estimators=300, learning_rate=0.05, max_depth=7, n_jobs=-1)
}

print("--- RESULTADOS ---")

mejor_accuracy = 0
mejor_modelo = None

for nombre, modelo in modelos.items():
    modelo.fit(X_train, y_train)
    preds = modelo.predict(X_test)
    acc = accuracy_score(y_test, preds)

    print(f"{nombre:20}: {acc*100:.2f}%")

    if acc > mejor_accuracy:
        mejor_accuracy = acc
        mejor_modelo = modelo

# ==============================================================================
# 5. GUARDAR MODELO
# ==============================================================================
joblib.dump(mejor_modelo, "model/modelo_churn.pkl")

print(f"\nModelo guardado con accuracy: {mejor_accuracy*100:.2f}%")