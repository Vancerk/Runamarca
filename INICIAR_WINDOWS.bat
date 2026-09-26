@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js nao encontrado. Instale a versao 20 ou superior e tente novamente.
  pause
  exit /b 1
)
echo RunaMarca sera aberto em http://localhost:3000
echo Mantenha esta janela aberta enquanto estiver jogando.
node server.js
pause
