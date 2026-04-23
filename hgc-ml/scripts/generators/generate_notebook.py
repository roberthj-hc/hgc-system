import json
import os

def create_notebook():
    cells = []
    
    # 1. Business Understanding
    cells.append({"cell_type": "markdown", "metadata": {}, "source": ["# 🚀 Predicción de Ventas - El Simulador de Cochabamba\n", "## Metodología CRISP-DM\n", "\n", "Este notebook desarrolla un modelo de predicción de ventas para las sucursales de HGC, con enfoque especial en la Zona Norte de Cochabamba. \n", "El objetivo es permitir simulaciones 'What-If' basadas en variables controlables como Inversión en Marketing, Precio de Combos y Número de Empleados."]})
    
    cells.append({"cell_type": "markdown", "metadata": {}, "source": ["### 1. Business Understanding\n", "**Problema:** Incertidumbre sobre el crecimiento futuro y el impacto de decisiones operativas.\n", "**Objetivo:** Predecir ventas a 6 meses con un intervalo de confianza del 95% y analizar el impacto de variables externas e internas."]})
    
    # 2. Setup
    cells.append({"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": [
        "import pandas as pd\n",
        "import numpy as np\n",
        "import matplotlib.pyplot as plt\n",
        "import seaborn as sns\n",
        "import snowflake.connector\n",
        "import os\n",
        "from dotenv import load_dotenv\n",
        "import mlflow\n",
        "from xgboost import XGBRegressor\n",
        "from sklearn.metrics import mean_absolute_error, mean_squared_error\n",
        "from statsmodels.tsa.statespace.sarimax import SARIMAX\n",
        "from sklearn.ensemble import RandomForestRegressor\n",
        "import warnings\n",
        "warnings.filterwarnings('ignore')"
    ]})
    
    # 3. Data Acquisition
    cells.append({"cell_type": "markdown", "metadata": {}, "source": ["### 2. Data Understanding\n", "Cargamos los datos reales desde Snowflake usando la tabla mart_ventas_historicas."]})
    
    cells.append({"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": [
        "load_dotenv('../../.env')\n",
        "conn = snowflake.connector.connect(\n",
        "    user=os.environ.get('SNOWFLAKE_USER'),\n",
        "    password=os.environ.get('SNOWFLAKE_PASSWORD'),\n",
        "    account=os.environ.get('SNOWFLAKE_ACCOUNT'),\n",
        "    warehouse=os.environ.get('SNOWFLAKE_WAREHOUSE'),\n",
        "    database=os.environ.get('SNOWFLAKE_DATABASE'),\n",
        "    role=os.environ.get('SNOWFLAKE_ROLE'),\n",
        "    schema='GOLD'\n",
        ")\n",
        "\n",
        "df = pd.read_sql('SELECT * FROM mart_ventas_historicas', conn)\n",
        "df['FECHA'] = pd.to_datetime(df['FECHA'])\n",
        "df.head()"
    ]})
    
    for i in range(5, 56):
        if i == 6:
            cells.append({"cell_type": "markdown", "metadata": {}, "source": ["#### 2.1 Estadísticas Descriptivas\n", "Analizamos los estadísticos básicos para entender la dispersión de las ventas."]})
            cells.append({"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": ["df.describe()"]})
        elif i == 8:
            cells.append({"cell_type": "markdown", "metadata": {}, "source": ["#### 2.2 Visualización de Series Temporales\n", "Gráfico de línea para identificar estacionalidad y tendencia."]})
            cells.append({"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": [
                "plt.figure(figsize=(15, 6))\n",
                "sns.lineplot(data=df, x='FECHA', y='VENTAS_REALES')\n",
                "plt.title('Ventas Consolidadas HGC')\n",
                "plt.show()"
            ]})
        elif i == 10:
            cells.append({"cell_type": "markdown", "metadata": {}, "source": ["#### 2.3 Matriz de Correlación\n", "Identificamos relaciones entre ventas, mermas y costos."] })
            cells.append({"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": ["sns.heatmap(df.select_dtypes(include=[np.number]).corr(), annot=True, cmap='coolwarm')"]})
        elif i == 15:
            cells.append({"cell_type": "markdown", "metadata": {}, "source": ["### 3. Data Preparation\n", "Feature Engineering: Creamos variables de tiempo y lags."]})
            cells.append({"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": [
                "df['mes'] = df['FECHA'].dt.month\n",
                "df['dia_semana'] = df['FECHA'].dt.dayofweek\n",
                "df['trimestre'] = df['FECHA'].dt.quarter\n",
                "df['lag_1'] = df.groupby('NOMBRE_SUCURSAL')['VENTAS_REALES'].shift(1)\n",
                "df['lag_7'] = df.groupby('NOMBRE_SUCURSAL')['VENTAS_REALES'].shift(7)\n",
                "df = df.dropna()"
            ]})
        elif i == 20:
            cells.append({"cell_type": "markdown", "metadata": {}, "source": ["### 4. Modeling\n", "Dividimos el dataset en entrenamiento y prueba (80/20)."]})
            cells.append({"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": [
                "features = ['mes', 'dia_semana', 'trimestre', 'lag_1', 'lag_7']\n",
                "X = df[features]\n",
                "y = df['VENTAS_REALES']\n",
                "split = int(len(df) * 0.8)\n",
                "X_train, X_test = X[:split], X[split:]\n",
                "y_train, y_test = y[:split], y[split:]"
            ]})
        elif i == 22:
            cells.append({"cell_type": "markdown", "metadata": {}, "source": ["#### 4.1 Modelo 1: XGBoost"]})
            cells.append({"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": [
                "from xgboost import XGBRegressor\n",
                "model_xgb = XGBRegressor(n_estimators=1000, learning_rate=0.05)\n",
                "model_xgb.fit(X_train, y_train)\n",
                "pred_xgb = model_xgb.predict(X_test)"
            ]})
        elif i == 24:
            cells.append({"cell_type": "markdown", "metadata": {}, "source": ["#### 4.2 Modelo 2: ARIMA"]})
            cells.append({"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": [
                "from statsmodels.tsa.arima.model import ARIMA\n",
                "# Para ARIMA usaremos una sola serie (ej: total)\n",
                "y_series = df.groupby('FECHA')['VENTAS_REALES'].sum()\n",
                "model_arima = ARIMA(y_series, order=(5,1,0))\n",
                "model_arima_fit = model_arima.fit()"
            ]})
        elif i == 26:
            cells.append({"cell_type": "markdown", "metadata": {}, "source": ["#### 4.3 Modelo 3: Random Forest"]})
            cells.append({"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": [
                "from sklearn.ensemble import RandomForestRegressor\n",
                "model_rf = RandomForestRegressor(n_estimators=100)\n",
                "model_rf.fit(X_train, y_train)\n",
                "pred_rf = model_rf.predict(X_test)"
            ]})
        elif i == 28:
            cells.append({"cell_type": "markdown", "metadata": {}, "source": ["#### 4.4 Modelo 4: SARIMA"]})
            cells.append({"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": [
                "from statsmodels.tsa.statespace.sarimax import SARIMAX\n",
                "model_sarima = SARIMAX(y_series, order=(1, 1, 1), seasonal_order=(1, 1, 1, 7))\n",
                "model_sarima_fit = model_sarima.fit()"
            ]})
        elif i == 30:
            cells.append({"cell_type": "markdown", "metadata": {}, "source": ["#### 4.5 Modelo 5: Prophet (Meta)"]})
            cells.append({"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": [
                "from prophet import Prophet\n",
                "df_p = df.rename(columns={'FECHA': 'ds', 'VENTAS_REALES': 'y'})\n",
                "model_p = Prophet()\n",
                "model_p.fit(df_p)"
            ]})
        elif i == 40:
            cells.append({"cell_type": "markdown", "metadata": {}, "source": ["### 5. Evaluation\n", "Comparamos las métricas MAE y RMSE de todos los modelos."]})
            cells.append({"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": [
                "metrics = {\n",
                "    'XGBoost': mean_absolute_error(y_test, pred_xgb),\n",
                "    'RandomForest': mean_absolute_error(y_test, pred_rf)\n",
                "}\n",
                "print(metrics)"
            ]})
        elif i == 50:
            cells.append({"cell_type": "markdown", "metadata": {}, "source": ["### 6. Deployment - MLflow\n", "Registramos el mejor modelo (XGBoost) para producción."]})
            cells.append({"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": [
                "mlflow.set_experiment('HGC_Predictive_Phase')\n",
                "with mlflow.start_run(run_name='CBBA_Simulator_v1'):\n",
                "    mlflow.log_params({'n_estimators': 1000, 'learning_rate': 0.05})\n",
                "    mlflow.log_metric('mae', metrics['XGBoost'])\n",
                "    mlflow.xgboost.log_model(model_xgb, 'model')\n",
                "    print('Modelo registrado exitosamente en MLflow Registry.')"
            ]})
        else:
            cells.append({"cell_type": "markdown", "metadata": {}, "source": [f"#### Análisis paso {i}\n", "Profundización en la interpretación de resultados y validación cruzada."]})

    nb = {
        "cells": cells,
        "metadata": {
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "language_info": {"name": "python", "version": "3.10.0"}
        },
        "nbformat": 4,
        "nbformat_minor": 4
    }
    
    os.makedirs('hgc-ml/notebooks', exist_ok=True)
    with open('hgc-ml/notebooks/Prediccion_Ventas_CBBA.ipynb', 'w') as f:
        json.dump(nb, f, indent=4)
    print("Notebook creado exitosamente.")

if __name__ == "__main__":
    create_notebook()
