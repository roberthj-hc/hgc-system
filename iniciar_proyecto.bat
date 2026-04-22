@echo off
echo ==================================================
echo Iniciando El Espejo del Negocio (HGC)
echo ==================================================

echo.
echo [1/5] Ejecutando modelos DBT (Estructura de Datos)...
cd dbt
call python -c "from dotenv import load_dotenv; load_dotenv('../.env'); from dbt.cli.main import cli; cli(['run', '--select', 'mart_sucursales_consolidado mart_rentabilidad_diagnostica mart_ventas_historicas', '--profiles-dir', '.'])"
if %errorlevel% neq 0 (
    echo Advertencia: DBT fallo.
)
cd ..

echo [2/5] Entrenando Modelos de Machine Learning (XGBoost Multi-Branch)...
cd hgc-ml
call python train_real_models.py
cd ..

echo [3/5] Generando OBT y Notebooks...
cd hgc-ml
call python datasets/OBT_geo_expansion/generate_obt.py
if %errorlevel% neq 0 (
    echo Advertencia: No se pudo generar la OBT.
)
cd ..

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
echo 1. Espejo del Negocio (Real-Time)
echo 2. Detective de Rentabilidad (Diagnostico)
echo 3. Simulador de Apertura (Predictivo)
echo.
echo Acceda al sistema en: http://localhost:3000/
echo ==================================================
pause
