@echo off
cd /d "%~dp0"
set "PROTOTYPE_PORT=3086"
set "PROTOTYPE_NODE=C:\Users\vanxf\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%PROTOTYPE_NODE%" (
  "%PROTOTYPE_NODE%" --experimental-vm-modules scripts\board-prototype-server.mjs
) else (
  node --experimental-vm-modules scripts\board-prototype-server.mjs
)
pause
