@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale Node.js 22 ou 24 para iniciar esta apresentacao.
  pause
  exit /b 1
)
if not exist "node_modules" (
  call npm.cmd ci --cache .npm-cache --no-audit --no-fund
  if errorlevel 1 exit /b 1
)
echo.
echo Acougue Digital - abra http://localhost:3000 no navegador.
echo Mantenha esta janela aberta durante a apresentacao.
echo Para encerrar, pressione Ctrl+C.
echo.
call npm.cmd run dev
