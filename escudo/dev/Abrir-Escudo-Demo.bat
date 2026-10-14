@echo off
chcp 65001 >nul
title Escudo do Mestre - demonstracao local
cd /d "%~dp0..\.."
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  O Node.js nao foi encontrado neste computador.
  echo  Instale a versao 24 em https://nodejs.org e rode este arquivo de novo.
  echo.
  pause
  exit /b 1
)
start "" cmd /c "timeout /t 2 >nul & start http://127.0.0.1:3080/escudo/"
node escudo\dev\demo.mjs
pause
