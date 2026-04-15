import pandas as pd
import numpy as np
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score

from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from xgboost import XGBClassifier

# 1. CARGA DE DATOS LOCAL
df = pd.read_csv("data/dataset_canibalizacion.csv")

print(f"Dataset cargado: {df.shape[0]} registros")

# 2. PREPROCESAMIENTO
for col in ['RANGO_EDAD', 'SEGMENTO']:
    if col not in df.columns:
        df[col] = 'DESCONOCIDO'
    df[col] = df[col].fillna('DESCONOCIDO')

df['PUNTOS_ACUMULADOS'] = df['PUNTOS_ACUMULADOS'].fillna(0)
df['DIAS_ANTIGUEDAD'] = df['DIAS_ANTIGUEDAD'].fillna(0)
df['TICKET_PROMEDIO'] = df['TICKET_PROMEDIO'].fillna(0)
df['PCT_USO_DESCUENTO'] = df['PCT_USO_DESCUENTO'].fillna(0)
df['USA_DELIVERY'] = df['USA_DELIVERY'].fillna(0)

le = LabelEncoder()
for col in ['SEGMENTO', 'RANGO_EDAD']:
    df[col] = le.fit_transform(df[col].astype(str))

# ruido
np.random.seed(42)
mask = np.random.rand(len(df)) < 0.05
df.loc[mask, 'RIESGO_CANIBALIZACION_LABEL'] = 1 - df.loc[mask, 'RIESGO_CANIBALIZACION_LABEL']

# 3. VARIABLES
columnas_excluidas = ['ID_CLIENTE_NK', 'RIESGO_CANIBALIZACION_LABEL']
X = df.drop(columns=[c for c in columnas_excluidas if c in df.columns])
y = df['RIESGO_CANIBALIZACION_LABEL']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# 4. MODELOS
modelos = {
    "RF": RandomForestClassifier(n_estimators=300, max_depth=12),
    "GB": GradientBoostingClassifier(n_estimators=200, max_depth=6),
    "XGB": XGBClassifier(n_estimators=200, max_depth=6)
}

mejor_acc = 0
mejor_modelo = None

for nombre, modelo in modelos.items():
    modelo.fit(X_train, y_train)
    preds = modelo.predict(X_test)
    acc = accuracy_score(y_test, preds)
    print(nombre, acc)

    if acc > mejor_acc:
        mejor_acc = acc
        mejor_modelo = modelo

# 5. GUARDAR MODELO
joblib.dump(mejor_modelo, "model/modelo_canibalizacion.pkl")

print("Modelo guardado")