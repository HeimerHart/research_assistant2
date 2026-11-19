@echo off
setlocal enabledelayedexpansion
title Switch-Lit React Vite Frontend (Port 5173)

cd /d "%~dp0frontend"

echo =======================================================
echo    Switch-Lit Research Library - React Vite Frontend
echo =======================================================
echo Working directory: %cd%

if not exist "node_modules\" (
    echo [INFO] node_modules not detected. Installing dependencies...
    call npm install
    if !errorlevel! neq 0 (
        echo [ERROR] npm install failed.
        pause
        exit /b !errorlevel!
    )
)

echo [INFO] Starting Vite dev server on http://localhost:5173 ...
echo Press CTRL+C to stop the frontend.
echo -------------------------------------------------------

call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo =======================================================
    echo [ERROR] Frontend server stopped unexpectedly (code: %errorlevel%).
    echo Please see the error messages above.
    echo =======================================================
    pause
)
