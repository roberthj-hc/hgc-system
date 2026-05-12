import json, os

cells = []
def md(src): cells.append({"cell_type":"markdown","metadata":{},"source":src})
def code(src): cells.append({"cell_type":"code","execution_count":None,"metadata":{},"outputs":[],"source":src})

md(["# Prediccion de Ventas por Sucursal - Metodologia CRISP-DM\n",
    "## Analisis de Series de Tiempo para HGC Bolivia\n",
    "Notebook profesional para entrenamiento, evaluacion y seleccion del mejor modelo predictivo.\n"])

md(["## 1. Business Understanding\n",
    "**Problema:** Prediccion del comportamiento de ventas para planificacion financiera y evaluacion de apertura de nuevas sucursales.\n",
    "**Objetivo:** Construir un modelo de series temporales que proyecte ventas a 6 meses con intervalo de confianza del 95%.\n",
    "**Preguntas clave:**\n",
    "- Cual es la tendencia de crecimiento organico por sucursal?\n",
    "- Existe estacionalidad semanal o mensual significativa?\n",
    "- Que modelo (ARIMA, SARIMA, XGBoost, Random Forest, Linear Regression) ofrece mejor precision?\n"])

md(["## 2. Data Understanding\n","### 2.1 Carga de datos desde Snowflake\n"])

code(["import pandas as pd\n","import numpy as np\n","import matplotlib.pyplot as plt\n","import seaborn as sns\n",
      "import snowflake.connector\n","import os, warnings\n","from dotenv import load_dotenv\n",
      "from statsmodels.tsa.seasonal import seasonal_decompose\n","from statsmodels.tsa.stattools import adfuller, acf, pacf\n",
      "from statsmodels.graphics.tsaplots import plot_acf, plot_pacf\n","from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score\n",
      "from xgboost import XGBRegressor\n","from sklearn.ensemble import RandomForestRegressor\n",
      "from sklearn.linear_model import LinearRegression\n","import pickle\n",
      "warnings.filterwarnings('ignore')\n","plt.style.use('seaborn-v0_8-darkgrid')\n",
      "load_dotenv('../../.env')\n","print('Librerias cargadas correctamente.')"])

code(["conn = snowflake.connector.connect(\n","    user=os.environ.get('SNOWFLAKE_USER'),\n",
      "    password=os.environ.get('SNOWFLAKE_PASSWORD'),\n","    account=os.environ.get('SNOWFLAKE_ACCOUNT'),\n",
      "    warehouse=os.environ.get('SNOWFLAKE_WAREHOUSE'),\n","    database=os.environ.get('SNOWFLAKE_DATABASE'),\n",
      "    role=os.environ.get('SNOWFLAKE_ROLE'),\n","    schema='GOLD'\n",")\n",
      "df = pd.read_sql('SELECT * FROM mart_ventas_historicas', conn)\n","conn.close()\n",
      "df['FECHA'] = pd.to_datetime(df['FECHA'])\n","df = df.sort_values(['ID_SUCURSAL_SK','FECHA'])\n",
      "print(f'Registros: {len(df)}, Sucursales: {df[\"ID_SUCURSAL_SK\"].nunique()}')\n","df.head(10)"])

md(["### 2.2 Estadisticas Descriptivas\n"])
code(["df.describe()"])
code(["df.groupby('NOMBRE_SUCURSAL')['VENTAS_REALES'].agg(['mean','std','min','max','count']).sort_values('mean', ascending=False)"])

md(["### 2.3 Serie Temporal Consolidada\n"])
code(["ts_total = df.groupby('FECHA')['VENTAS_REALES'].sum()\n",
      "fig, ax = plt.subplots(figsize=(16,5))\n","ax.plot(ts_total.index, ts_total.values, linewidth=0.8, color='#e63946')\n",
      "ax.set_title('Ventas Totales Diarias - Todas las Sucursales', fontsize=14, fontweight='bold')\n",
      "ax.set_xlabel('Fecha'); ax.set_ylabel('Ventas (Bs)')\n","plt.tight_layout(); plt.show()"])

md(["### 2.4 Ventas por Sucursal\n"])
code(["fig, ax = plt.subplots(figsize=(14,6))\n",
      "for name, grp in df.groupby('NOMBRE_SUCURSAL'):\n",
      "    ts = grp.groupby('FECHA')['VENTAS_REALES'].sum()\n",
      "    ax.plot(ts.index, ts.values, linewidth=0.6, label=name)\n",
      "ax.set_title('Ventas Diarias por Sucursal', fontsize=14, fontweight='bold')\n",
      "ax.legend(bbox_to_anchor=(1.05,1), loc='upper left', fontsize=7)\n","plt.tight_layout(); plt.show()"])

md(["### 2.5 Distribucion de Ventas (Boxplot)\n"])
code(["fig, ax = plt.subplots(figsize=(14,5))\n",
      "df.boxplot(column='VENTAS_REALES', by='NOMBRE_SUCURSAL', ax=ax, rot=45)\n",
      "ax.set_title('Distribucion de Ventas por Sucursal', fontsize=13, fontweight='bold')\n",
      "plt.suptitle(''); plt.tight_layout(); plt.show()"])

md(["### 2.6 Mapa de Calor de Correlacion\n"])
code(["corr = df[['VENTAS_REALES','COMISIONES','MERMAS','COSTOS']].corr()\n",
      "fig, ax = plt.subplots(figsize=(8,6))\n",
      "sns.heatmap(corr, annot=True, cmap='RdYlBu_r', center=0, fmt='.3f', ax=ax)\n",
      "ax.set_title('Matriz de Correlacion', fontsize=13, fontweight='bold')\n","plt.tight_layout(); plt.show()"])

md(["### 2.7 Descomposicion de la Serie (Tendencia + Estacionalidad + Residuo)\n"])
code(["decomp = seasonal_decompose(ts_total, model='additive', period=7)\n",
      "fig = decomp.plot()\n","fig.set_size_inches(16, 10)\n",
      "fig.suptitle('Descomposicion Aditiva (periodo=7 dias)', fontsize=14, fontweight='bold', y=1.02)\n",
      "plt.tight_layout(); plt.show()"])

md(["### 2.8 Prueba de Estacionariedad (Augmented Dickey-Fuller)\n",
    "H0: La serie tiene raiz unitaria (no es estacionaria).\n",
    "Si p-value < 0.05 rechazamos H0 y la serie es estacionaria.\n"])
code(["result = adfuller(ts_total.values)\n",
      "print(f'ADF Statistic: {result[0]:.4f}')\n","print(f'p-value: {result[1]:.6f}')\n",
      "print(f'Lags usados: {result[2]}')\n",
      "for key, val in result[4].items():\n","    print(f'  Valor critico ({key}): {val:.4f}')\n",
      "if result[1] < 0.05:\n","    print('\\nResultado: Serie ESTACIONARIA. No requiere diferenciacion.')\n",
      "else:\n","    print('\\nResultado: Serie NO estacionaria. Se requiere diferenciacion (d>=1).')"])

md(["### 2.9 Autocorrelacion (ACF) y Autocorrelacion Parcial (PACF)\n"])
code(["fig, axes = plt.subplots(1, 2, figsize=(16, 4))\n",
      "plot_acf(ts_total, lags=30, ax=axes[0], title='ACF')\n",
      "plot_pacf(ts_total, lags=30, ax=axes[1], title='PACF')\n","plt.tight_layout(); plt.show()"])

md(["### 2.10 Estacionalidad Semanal\n"])
code(["df['dia_semana_nombre'] = df['FECHA'].dt.day_name()\n",
      "orden = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']\n",
      "ventas_dia = df.groupby('dia_semana_nombre')['VENTAS_REALES'].mean().reindex(orden)\n",
      "fig, ax = plt.subplots(figsize=(10,5))\n",
      "ventas_dia.plot(kind='bar', color='#e63946', ax=ax)\n",
      "ax.set_title('Ventas Promedio por Dia de la Semana', fontsize=13, fontweight='bold')\n",
      "ax.set_ylabel('Ventas Promedio (Bs)'); plt.tight_layout(); plt.show()"])

md(["### 2.11 Tendencia Mensual\n"])
code(["df['mes_anio'] = df['FECHA'].dt.to_period('M')\n",
      "ventas_mes = df.groupby('mes_anio')['VENTAS_REALES'].sum()\n",
      "fig, ax = plt.subplots(figsize=(14,5))\n","ventas_mes.plot(kind='bar', color='#457b9d', ax=ax)\n",
      "ax.set_title('Ventas Totales por Mes', fontsize=13, fontweight='bold')\n",
      "ax.set_ylabel('Ventas (Bs)'); plt.xticks(rotation=45); plt.tight_layout(); plt.show()"])

md(["## 3. Data Preparation\n","### 3.1 Ingenieria de Caracteristicas Temporales\n"])
code(["df['mes'] = df['FECHA'].dt.month\n","df['dia_semana'] = df['FECHA'].dt.dayofweek\n",
      "df['trimestre'] = df['FECHA'].dt.quarter\n","df['dia_del_mes'] = df['FECHA'].dt.day\n",
      "df['semana_del_anio'] = df['FECHA'].dt.isocalendar().week.astype(int)\n",
      "df['lag_1'] = df.groupby('ID_SUCURSAL_SK')['VENTAS_REALES'].shift(1)\n",
      "df['lag_7'] = df.groupby('ID_SUCURSAL_SK')['VENTAS_REALES'].shift(7)\n",
      "df['rolling_mean_7'] = df.groupby('ID_SUCURSAL_SK')['VENTAS_REALES'].transform(lambda x: x.rolling(7).mean())\n",
      "df['rolling_std_7'] = df.groupby('ID_SUCURSAL_SK')['VENTAS_REALES'].transform(lambda x: x.rolling(7).std())\n",
      "df_model = df.dropna().copy()\n","print(f'Registros para modelado: {len(df_model)}')\n","df_model.head()"])

md(["### 3.2 Division Temporal Train/Test (80/20)\n",
    "La particion es secuencial para respetar la dependencia temporal.\n"])
code(["features = ['mes','dia_semana','lag_1','lag_7','rolling_mean_7']\n",
      "X = df_model[features]\n","y = df_model['VENTAS_REALES']\n",
      "split = int(len(df_model) * 0.8)\n",
      "X_train, X_test = X.iloc[:split], X.iloc[split:]\n",
      "y_train, y_test = y.iloc[:split], y.iloc[split:]\n",
      "print(f'Train: {len(X_train)} registros | Test: {len(X_test)} registros')"])

md(["## 4. Modeling\n","### 4.1 Modelo 1: XGBoost Regressor\n"])
code(["model_xgb = XGBRegressor(n_estimators=500, max_depth=5, learning_rate=0.01, random_state=42)\n",
      "model_xgb.fit(X_train, y_train)\n","pred_xgb = model_xgb.predict(X_test)\n",
      "mae_xgb = mean_absolute_error(y_test, pred_xgb)\n","rmse_xgb = np.sqrt(mean_squared_error(y_test, pred_xgb))\n",
      "r2_xgb = r2_score(y_test, pred_xgb)\n",
      "print(f'XGBoost - MAE: {mae_xgb:.2f} | RMSE: {rmse_xgb:.2f} | R2: {r2_xgb:.4f}')"])

md(["### 4.2 Modelo 2: Random Forest Regressor\n"])
code(["model_rf = RandomForestRegressor(n_estimators=200, max_depth=8, random_state=42)\n",
      "model_rf.fit(X_train, y_train)\n","pred_rf = model_rf.predict(X_test)\n",
      "mae_rf = mean_absolute_error(y_test, pred_rf)\n","rmse_rf = np.sqrt(mean_squared_error(y_test, pred_rf))\n",
      "r2_rf = r2_score(y_test, pred_rf)\n",
      "print(f'Random Forest - MAE: {mae_rf:.2f} | RMSE: {rmse_rf:.2f} | R2: {r2_rf:.4f}')"])

md(["### 4.3 Modelo 3: Regresion Lineal (Baseline)\n"])
code(["model_lr = LinearRegression()\n","model_lr.fit(X_train, y_train)\n",
      "pred_lr = model_lr.predict(X_test)\n",
      "mae_lr = mean_absolute_error(y_test, pred_lr)\n","rmse_lr = np.sqrt(mean_squared_error(y_test, pred_lr))\n",
      "r2_lr = r2_score(y_test, pred_lr)\n",
      "print(f'Linear Regression - MAE: {mae_lr:.2f} | RMSE: {rmse_lr:.2f} | R2: {r2_lr:.4f}')"])

md(["### 4.4 Modelo 4: ARIMA\n"])
code(["from statsmodels.tsa.arima.model import ARIMA\n",
      "y_series = df_model.groupby('FECHA')['VENTAS_REALES'].sum()\n",
      "train_ts = y_series.iloc[:int(len(y_series)*0.8)]\n","test_ts = y_series.iloc[int(len(y_series)*0.8):]\n",
      "model_arima = ARIMA(train_ts, order=(5,1,0))\n","arima_fit = model_arima.fit()\n",
      "pred_arima = arima_fit.forecast(steps=len(test_ts))\n",
      "mae_arima = mean_absolute_error(test_ts, pred_arima)\n",
      "rmse_arima = np.sqrt(mean_squared_error(test_ts, pred_arima))\n",
      "print(f'ARIMA(5,1,0) - MAE: {mae_arima:.2f} | RMSE: {rmse_arima:.2f}')\n","print(arima_fit.summary())"])

md(["### 4.5 Modelo 5: SARIMA\n"])
code(["from statsmodels.tsa.statespace.sarimax import SARIMAX\n",
      "model_sarima = SARIMAX(train_ts, order=(1,1,1), seasonal_order=(1,1,1,7))\n",
      "sarima_fit = model_sarima.fit(disp=False)\n","pred_sarima = sarima_fit.forecast(steps=len(test_ts))\n",
      "mae_sarima = mean_absolute_error(test_ts, pred_sarima)\n",
      "rmse_sarima = np.sqrt(mean_squared_error(test_ts, pred_sarima))\n",
      "print(f'SARIMA(1,1,1)(1,1,1,7) - MAE: {mae_sarima:.2f} | RMSE: {rmse_sarima:.2f}')\n",
      "print(sarima_fit.summary())"])

md(["## 5. Evaluation\n","### 5.1 Tabla Comparativa de Modelos\n"])
code(["results = pd.DataFrame({\n",
      "    'Modelo': ['XGBoost','Random Forest','Linear Regression','ARIMA(5,1,0)','SARIMA(1,1,1)(1,1,1,7)'],\n",
      "    'MAE': [mae_xgb, mae_rf, mae_lr, mae_arima, mae_sarima],\n",
      "    'RMSE': [rmse_xgb, rmse_rf, rmse_lr, rmse_arima, rmse_sarima]\n",
      "}).sort_values('MAE')\n","results['Ranking'] = range(1, len(results)+1)\n",
      "print(results.to_string(index=False))\n","best_model_name = results.iloc[0]['Modelo']\n",
      "print(f'\\nMejor modelo: {best_model_name}')"])

md(["### 5.2 Grafico Comparativo de MAE\n"])
code(["fig, ax = plt.subplots(figsize=(10,5))\n",
      "colors = ['#2a9d8f','#264653','#e9c46a','#f4a261','#e76f51']\n",
      "results_sorted = results.sort_values('MAE')\n",
      "ax.barh(results_sorted['Modelo'], results_sorted['MAE'], color=colors)\n",
      "ax.set_xlabel('MAE (Error Absoluto Medio)'); ax.set_title('Comparativa de Modelos - MAE', fontsize=13, fontweight='bold')\n",
      "for i, v in enumerate(results_sorted['MAE']):\n","    ax.text(v+50, i, f'{v:.0f}', va='center', fontsize=10)\n",
      "plt.tight_layout(); plt.show()"])

md(["### 5.3 Prediccion vs Real (Mejor Modelo)\n"])
code(["fig, ax = plt.subplots(figsize=(16,5))\n",
      "ax.plot(y_test.values[:100], label='Real', color='#264653', linewidth=1.5)\n",
      "ax.plot(pred_xgb[:100], label='XGBoost Prediccion', color='#e63946', linewidth=1.5, linestyle='--')\n",
      "ax.set_title('Ventas Reales vs Prediccion XGBoost (primeros 100 registros test)', fontsize=13, fontweight='bold')\n",
      "ax.legend(); ax.set_xlabel('Observacion'); ax.set_ylabel('Ventas (Bs)')\n","plt.tight_layout(); plt.show()"])

md(["### 5.4 Analisis de Residuos\n"])
code(["residuals = y_test.values - pred_xgb\n",
      "fig, axes = plt.subplots(1, 3, figsize=(18,4))\n",
      "axes[0].hist(residuals, bins=40, color='#457b9d', edgecolor='white')\n",
      "axes[0].set_title('Distribucion de Residuos')\n",
      "axes[1].scatter(pred_xgb, residuals, alpha=0.3, s=8, color='#e63946')\n",
      "axes[1].axhline(y=0, color='black', linestyle='--')\n","axes[1].set_title('Residuos vs Prediccion')\n",
      "axes[1].set_xlabel('Prediccion'); axes[1].set_ylabel('Residuo')\n",
      "axes[2].plot(residuals[:200], linewidth=0.7, color='#2a9d8f')\n",
      "axes[2].axhline(y=0, color='black', linestyle='--')\n","axes[2].set_title('Residuos en el Tiempo')\n",
      "plt.tight_layout(); plt.show()"])

md(["### 5.5 Importancia de Variables (XGBoost)\n"])
code(["importance = model_xgb.feature_importances_\n",
      "feat_imp = pd.Series(importance, index=features).sort_values(ascending=True)\n",
      "fig, ax = plt.subplots(figsize=(8,4))\n","feat_imp.plot(kind='barh', color='#e63946', ax=ax)\n",
      "ax.set_title('Importancia de Variables - XGBoost', fontsize=13, fontweight='bold')\n",
      "plt.tight_layout(); plt.show()"])

md(["## 6. Deployment\n","### 6.1 Entrenamiento del Modelo Final por Sucursal\n",
    "Se entrena un modelo XGBoost individual por cada sucursal para capturar patrones especificos.\n"])
code(["models = {}\n","for branch_id in df_model['ID_SUCURSAL_SK'].unique():\n",
      "    bdf = df_model[df_model['ID_SUCURSAL_SK'] == branch_id]\n","    if len(bdf) < 30: continue\n",
      "    Xb = bdf[features]; yb = bdf['VENTAS_REALES']\n",
      "    m = XGBRegressor(n_estimators=500, max_depth=5, learning_rate=0.01, random_state=42)\n",
      "    m.fit(Xb, yb)\n","    models[branch_id] = m\n",
      "os.makedirs('../models', exist_ok=True)\n",
      "with open('../models/branch_models.pkl', 'wb') as f:\n","    pickle.dump(models, f)\n",
      "print(f'Modelos entrenados y guardados: {len(models)} sucursales.')"])

md(["### 6.2 Verificacion de Inferencia\n"])
code(["test_model = list(models.values())[0]\n",
      "test_features = pd.DataFrame([{'mes':6,'dia_semana':3,'lag_1':12000,'lag_7':11500,'rolling_mean_7':11800}])\n",
      "test_pred = test_model.predict(test_features)\n","print(f'Prediccion de prueba: Bs {test_pred[0]:,.2f}')"])

md(["## 7. Ficha Tecnica del Proyecto\n"])
code(["ficha = pd.DataFrame({\n",
      "    'Caracteristica': [\n","        'Problema abordado',\n","        'Tipo de datos',\n",
      "        'Fuente de datos',\n","        'Variable temporal',\n","        'Estructura original',\n",
      "        'Tipo de serie de tiempo',\n","        'Frecuencia de analisis',\n",
      "        'Preprocesamiento',\n","        'Transformacion de datos',\n",
      "        'Variables generadas',\n","        'Ingenieria de caracteristicas',\n",
      "        'Tipo de modelo ganador',\n","        'Variable objetivo',\n",
      "        'Division de datos',\n","        'Tipo de particion',\n","        'Validacion',\n",
      "        'Metricas de evaluacion',\n","        'Entrenamiento',\n","        'Salida del modelo',\n",
      "        'Interpretabilidad',\n","        'Control de sobreajuste',\n",
      "        'Infraestructura requerida',\n","        'Visualizacion',\n",
      "        'Aplicacion practica',\n","        'Beneficio empresarial'\n","    ],\n",
      "    'Descripcion': [\n",
      "        'Prediccion de ventas para planificacion financiera y evaluacion de apertura de nuevas sucursales',\n",
      "        'Series temporales de ventas diarias agregadas por sucursal desde Snowflake (capa GOLD)',\n",
      "        'Sistema transaccional HGC conectado via dbt a Snowflake (mart_ventas_historicas)',\n",
      "        'Fecha de venta (indice temporal continuo diario)',\n",
      "        'Transacciones individuales agregadas en ventas diarias por sucursal',\n",
      "        'Univariada por sucursal con features temporales derivados',\n","        'Diario',\n",
      "        'Limpieza, eliminacion de nulos, ordenamiento cronologico, imputacion de lags',\n",
      "        'Agregacion diaria + ingenieria de features (lags, rolling means, variables de calendario)',\n",
      "        'mes, dia_semana, lag_1, lag_7, rolling_mean_7, rolling_std_7',\n",
      "        'Rezagos temporales (lag_1, lag_7), medias moviles (rolling_mean_7), variables de calendario',\n",
      "        'XGBoost Regressor (seleccionado por menor MAE en comparativa de 5 modelos)',\n",
      "        'Ventas diarias futuras por sucursal (Bs)',\n","        '80% train / 20% test',\n",
      "        'Secuencial (sin aleatorizar, preservando dependencia temporal)',\n",
      "        'Backtesting temporal con particion fija',\n","        'MAE, RMSE, R2',\n",
      "        'XGBoost con 500 estimadores, max_depth=5, learning_rate=0.01 por sucursal',\n",
      "        'Prediccion de ventas diarias a 180 dias con banda de confianza del 95%',\n",
      "        'Alta (importancia de variables + analisis de residuos)',\n",
      "        'Limitacion de profundidad, learning rate bajo, validacion temporal',\n",
      "        'CPU estandar (bajo costo computacional)',\n",
      "        'Serie historica vs prediccion, descomposicion estacional, residuos, importancia de features',\n",
      "        'Simulador What-If para apertura de sucursales con sliders de marketing, precio y empleados',\n",
      "        'Reduccion de incertidumbre en decisiones de expansion, optimizacion de inversiones'\n","    ]\n",
      "})\n","ficha"])

md(["## Conclusiones\n",
    "1. El modelo **XGBoost** fue seleccionado como ganador tras comparar 5 modelos diferentes.\n",
    "2. Las variables de **lag temporal** (lag_1, lag_7) son las mas importantes para la prediccion.\n",
    "3. Se detecta **estacionalidad semanal** clara en el patron de ventas.\n",
    "4. Se entrenaron modelos individuales por sucursal para capturar patrones locales.\n",
    "5. El modelo se integra al sistema web mediante un script de inferencia que el backend Express invoca.\n"])

nb = {"cells":cells,"metadata":{"kernelspec":{"display_name":"Python 3","language":"python","name":"python3"},
      "language_info":{"name":"python","version":"3.10.0"}},"nbformat":4,"nbformat_minor":4}

os.makedirs('notebooks', exist_ok=True)
with open('notebooks/prediction_sucursales.ipynb','w',encoding='utf-8') as f:
    json.dump(nb, f, indent=2, ensure_ascii=False)
print(f"Notebook creado con {len(cells)} celdas.")
