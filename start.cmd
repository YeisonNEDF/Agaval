@echo off
setlocal
where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo [ERROR] No se encontro Windows PowerShell.
  echo Instale o habilite PowerShell y vuelva a ejecutar este archivo.
  if not defined CI pause
  exit /b 1
)

echo AGAVAL - Inicio y verificacion del entorno
echo El launcher mostrara que falta e intentara instalarlo con WinGet cuando sea posible.
echo Use "start.cmd -NoInstall" si solo desea usar herramientas ya instaladas.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
set "AGAVAL_EXIT_CODE=%errorlevel%"

if not "%AGAVAL_EXIT_CODE%"=="0" (
  echo.
  echo El inicio no termino correctamente. Revise el mensaje anterior.
  echo Si se instalo Docker, .NET o Node, cierre esta ventana y ejecute start.cmd de nuevo.
  if not defined CI pause
)

exit /b %AGAVAL_EXIT_CODE%
