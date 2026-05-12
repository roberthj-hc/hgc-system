@echo off
chcp 65001 > nul
echo ==================================================
echo   Deteniendo El Espejo del Negocio (HGC)
echo ==================================================

echo.
echo [LIMPIEZA] Cerrando puertos MLflow (5001, 5003, 5006, 5009, 5010)...
for %%P in (5001 5003 5006 5009 5010) do (
    for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%%P " ^| findstr "LISTENING"') do (
        if not "%%A"=="0" (
            taskkill /F /PID %%A >nul 2>&1
            echo   Puerto %%P detenido ^(PID %%A^).
        )
    )
)

echo.
echo [LIMPIEZA] Cerrando Backend y Frontend (puertos 3000, 4000)...
for %%P in (3000 4000) do (
    for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%%P " ^| findstr "LISTENING"') do (
        if not "%%A"=="0" (
            taskkill /F /PID %%A >nul 2>&1
            echo   Puerto %%P detenido ^(PID %%A^).
        )
    )
)

echo.
echo [OK] Todos los servicios HGC han sido detenidos.
pause
