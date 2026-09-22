@echo off
rem ============================================================
rem  NexusHub - lanzador para Windows (doble clic)
rem  Instala lo necesario la primera vez y abre la aplicacion.
rem ============================================================
title NexusHub
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js no esta instalado en este equipo.
  echo  Descargalo desde https://nodejs.org ^(version LTS^), instalalo
  echo  y vuelve a hacer doble clic en este archivo.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo.
  echo  Primera vez: instalando dependencias. Puede tardar unos minutos...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo  La instalacion fallo. Revisa tu conexion a internet e intentalo de nuevo.
    pause
    exit /b 1
  )
)

echo.
echo  Iniciando NexusHub...
echo  Se abrira en tu navegador en unos segundos: http://127.0.0.1:3000
echo  Para cerrar la aplicacion, cierra esta ventana o pulsa Ctrl+C.
echo.

start "" cmd /c "timeout /t 7 /nobreak >nul & start http://127.0.0.1:3000"
call npm run dev
pause
