@echo off
title CIMS Launcher
cls
echo ====================================================================
echo     CIMS -- Nexus Inventory Full-Stack Startup in One Go
echo ====================================================================
echo.

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"

if not exist "%BACKEND%\.env" (
    echo [Info] Creating backend\.env from template...
    copy "%BACKEND%\.env.example" "%BACKEND%\.env" >nul
)

echo [1/3] Starting Backend Server on port 5000...
start "CIMS Backend (Port 5000)" cmd /k "cd /d "%BACKEND%" && npm run start"

echo [2/3] Starting Frontend Server on port 5173...
start "CIMS Frontend (Port 5173)" cmd /k "cd /d "%FRONTEND%" && npm run dev"

echo [3/3] Launching Web Application in Browser...
powershell -NoProfile -Command "Start-Sleep -Seconds 2" >nul 2>&1
start http://localhost:5173

echo.
echo ====================================================================
echo   All servers started successfully!
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:5000
echo ====================================================================
echo.
