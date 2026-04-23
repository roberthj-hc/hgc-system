@echo off
echo ==================================================
echo Iniciando El Espejo del Negocio (HGC)
echo ==================================================

echo.
echo [CONFIGURACION DE INICIO]
set /p run_dbt="1. ¿Ejecutar transformaciones DBT en Snowflake? (S/N): "
set /p run_ml="2. ¿Re-entrenar modelos de ML y Elasticidad? (S/N): "

if /i "%run_dbt%"=="S" goto RUN_DBT
echo [SKIP] Saltando DBT.
goto CHECK_ML

:RUN_DBT
echo.
echo [PROCESO] Ejecutando modelos DBT (Estructura de Datos)...
cd dbt
call python -c "from dotenv import load_dotenv; load_dotenv('../.env'); from dbt.cli.main import cli; cli(['build', '--select', '+mart_sucursales_consolidado +mart_rentabilidad_diagnostica +mart_ventas_historicas +mart_econometria_elasticidad_base +mart_econometria_eficiencia_operativa', '--profiles-dir', '.'])"
cd ..
echo [OK] DBT Finalizado.

:CHECK_ML
if /i "%run_ml%"=="S" goto RUN_ML
echo [SKIP] Saltando Entrenamiento de ML. Se usara el cache local.
goto START_SERVICES

:RUN_ML
echo.
echo [PROCESO] Entrenando Modelos de Machine Learning y Generando Cache...
cd hgc-ml
call python scripts\predictions\churn\train.py
call python scripts\predictions\clv\train.py
call python scripts\predictions\cannibalization\train.py
call python scripts\econometrics\price-optimizer\train.py
call python scripts\econometrics\efficiency-monitor\train.py
echo.
echo [PROCESO] Generando OBT y Notebooks...
call python datasets/OBT_geo_expansion/generate_obt.py
cd ..
echo [OK] ML y Cache Finalizados.

:START_SERVICES
echo.
echo [PROCESO] Iniciando Servidores Flask de Prediccion (MLOps)...
cd hgc-ml
start "Model: Churn (Puerto 5001)" cmd /k "python scripts\predictions\churn\serve.py"
start "Model: CLV (Puerto 5003)" cmd /k "python scripts\predictions\clv\serve.py"
start "Model: Cannibalization (Puerto 5006)" cmd /k "python scripts\predictions\cannibalization\serve.py"
start "Model: BCG (Puerto 5009)" cmd /k "python scripts\predictions\bcg\serve.py"
start "Model: Branch Performance (Puerto 5010)" cmd /k "python scripts\predictions\branch-performance\serve.py"
cd ..

echo.
echo [4/5] Iniciando Backend (hgc-back)...
cd hgc-back
start "HGC Backend" cmd /k "echo Iniciando servidor Backend... && npm run dev || node src/server.js"
cd ..

echo [5/5] Iniciando Frontend (hgc-front)...
cd hgc-front
start "HGC Frontend" cmd /k "echo Iniciando servidor Frontend... && npm run dev"
cd ..

echo.
echo ==================================================
echo ¡Todo ha sido iniciado!
echo Acceda al sistema en: http://localhost:3000/
echo ==================================================
pause
