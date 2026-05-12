@echo off
chcp 65001 > nul 2>&1
echo ==================================================
echo   Iniciando El Espejo del Negocio (HGC)
echo ==================================================

echo.
echo [PRE-LIMPIEZA] Liberando puertos de servicios anteriores...
for %%P in (3000 4000 5001 5003 5006 5009 5010 8001) do (
    for /f "tokens=5" %%A in ('netstat -ano 2^>nul ^| findstr ":%%P " ^| findstr "LISTENING"') do (
        if not "%%A"=="" (
            taskkill /F /PID %%A >nul 2>&1
            echo   Puerto %%P liberado ^(PID %%A^).
        )
    )
)
ping -n 3 127.0.0.1 > nul

echo.
echo [CONFIGURACION DE INICIO]
set "run_dbt=N"
set "run_ml=N"
set /p run_dbt="1. Ejecutar transformaciones DBT en Snowflake? (S/N) [N]: "
set /p run_ml="2. Re-entrenar modelos de ML? (S/N) [N]: "

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
echo [PROCESO] Entrenando Modelos de Machine Learning...
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
echo [1/5] Iniciando servidor Churn (Puerto 5001)...
cd hgc-ml
if not exist venv (
    echo Creando entorno virtual ML con Python 3.13...
    py -3.13 -m venv venv
    .\venv\Scripts\python.exe -m pip install -r requirements.txt --quiet
)
start "MLflow: Churn (5001)" cmd /k ".\venv\Scripts\python.exe scripts\predictions\churn\serve.py"
ping -n 4 127.0.0.1 > nul

echo [2/5] Iniciando servidor CLV (Puerto 5003)...
start "MLflow: CLV (5003)" cmd /k ".\venv\Scripts\python.exe scripts\predictions\clv\serve.py"
ping -n 4 127.0.0.1 > nul

echo [3/5] Iniciando servidor Cannibalization (Puerto 5006)...
start "MLflow: Cannibalization (5006)" cmd /k ".\venv\Scripts\python.exe scripts\predictions\cannibalization\serve.py"
ping -n 4 127.0.0.1 > nul

echo [4/5] Iniciando servidor BCG Clustering (Puerto 5009)...
start "MLflow: BCG (5009)" cmd /k ".\venv\Scripts\python.exe scripts\predictions\bcg\serve.py"
ping -n 4 127.0.0.1 > nul

echo [5/5] Iniciando servidor Branch Performance (Puerto 5010)...
start "MLflow: Branch Performance (5010)" cmd /k ".\venv\Scripts\python.exe scripts\predictions\branch-performance\serve.py"
cd ..

echo.
echo [Chat API] Iniciando Chat Backend (Puerto 8001)...
cd chat-api
if not exist venv (
    echo Creando entorno virtual para Chat API...
    py -3.13 -m venv venv
)
start "Chat API (8001)" cmd /k ".\venv\Scripts\python.exe -m pip install -r requirements.txt --quiet && .\venv\Scripts\python.exe -m uvicorn main:app --reload --port 8001"
cd ..

echo.
echo [Backend] Iniciando hgc-back (Puerto 5000)...
cd hgc-back
if not exist node_modules (
    echo Instalando dependencias del backend...
    npm install
)
start "HGC Backend (5000)" cmd /k "npm run dev"
cd ..
ping -n 6 127.0.0.1 > nul

echo [Frontend] Iniciando hgc-front (Puerto 3000)...
cd hgc-front
start "HGC Frontend" cmd /k "set NODE_OPTIONS=--max-old-space-size=3072 && npm run dev"
cd ..

echo.
echo ==================================================
echo  SERVICIOS LANZADOS - ESPERANDO QUE ARRANQUEN...
echo ==================================================
echo.
echo  Aguarda ~45 segundos mientras Next.js compila.
echo  Cuando la ventana "HGC Frontend" muestre:
echo     "Local: http://localhost:3000"
echo  ...recien ahi abre el navegador.
echo.
echo  Frontend : http://localhost:3000/
echo  Backend  : http://localhost:4000/
echo  Chat API : http://localhost:8001/
echo  MLflow endpoints:
echo    Churn           - http://127.0.0.1:5001/invocations
echo    CLV             - http://127.0.0.1:5003/invocations
echo    Cannibalization - http://127.0.0.1:5006/invocations
echo    BCG Clustering  - http://127.0.0.1:5009/invocations
echo    Branch Perf.    - http://127.0.0.1:5010/invocations
echo ==================================================
echo Presiona cualquier tecla para cerrar esta ventana...
echo (Los servicios continuaran corriendo en sus propias ventanas)
pause > nul
