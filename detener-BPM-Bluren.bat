@echo off
title Detener BPM Bluren
cd /d "%~dp0"

echo ========================================
echo   Deteniendo servidor BPM Bluren...
echo ========================================

REM Detener el proceso que escucha en el puerto 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
  taskkill /f /pid %%a >nul 2>&1
)

echo.
echo El servidor BPM Bluren se ha detenido correctamente.
timeout /t 2 >nul
