@echo off
setlocal enabledelayedexpansion
title Switch-Lit FastAPI Backend Server (Port 8000)

cd /d "%~dp0"

echo =======================================================
echo    Switch-Lit Research Library - FastAPI Backend Server
echo =======================================================
echo Working directory: %cd%

set "RESEARCH_PYTHON=C:\Users\Lenovo\anaconda3\envs\research_env\python.exe"

if exist "%RESEARCH_PYTHON%" (
    echo [INFO] Using Anaconda research_env Python: %RESEARCH_PYTHON%
    set "PYTHON_CMD="%RESEARCH_PYTHON%""
) else (
    echo [INFO] research_env direct path not found, activating conda environment...
    if exist "C:\Users\Lenovo\anaconda3\Scripts\activate.bat" (
        call C:\Users\Lenovo\anaconda3\Scripts\activate.bat research_env
    )
    set "PYTHON_CMD=python"
)

echo [INFO] Starting FastAPI server on http://localhost:8000 ...
echo Press CTRL+C to stop the server.
echo -------------------------------------------------------

%PYTHON_CMD% server.py

if %errorlevel% neq 0 (
    echo.
    echo =======================================================
    echo [ERROR] Backend server stopped unexpectedly (code: %errorlevel%).
    echo Please see the error messages above.
    echo =======================================================
    pause
)
