@echo off
title BPM Bluren - Servidor de Intranet
cd /d "%~dp0"

echo ========================================================
echo   BPM Bluren - Servidor de Red Local (Intranet)
echo   Base de datos: data/bpm.db (SQLite Multi-Usuario)
echo ========================================================
echo.

REM Verificar Node
where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js no esta instalado o no esta en el PATH.
  echo Instala Node LTS desde https://nodejs.org
  pause
  exit /b 1
)

REM Si no hay build de produccion, generarla una vez
if not exist ".next\BUILD_ID" (
  echo Primera vez o sin build. Compilando... esto puede tardar un momento.
  call npm run build
  if errorlevel 1 (
    echo ERROR al compilar.
    pause
    exit /b 1
  )
)

echo ========================================================
echo   El servidor se esta iniciando para toda la red local:
echo.
echo   - En ESTA PC entra en:      http://localhost:3000
echo   - En OTRAS PCs entra con la IP de este equipo:
echo     ej: http://IP-DE-ESTA-PC:3000
echo.
echo   (Deja esta ventana abierta mientras se use el sistema)
echo ========================================================
echo.

start "" "http://localhost:3000"

call npm run start:host
pause
