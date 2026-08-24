@echo off
setlocal

where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo Error: Windows PowerShell no esta disponible.
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0api.ps1" %*
exit /b %errorlevel%
