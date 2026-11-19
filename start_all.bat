@echo off
cd /d "%~dp0"
title Launching Switch-Lit Full-Stack Platform

echo =======================================================
echo   Launching Switch-Lit Academic Platform
echo   1. Backend (FastAPI on Port 8000)
echo   2. Frontend (Vite on Port 5173)
echo =======================================================

echo Starting Backend in separate window...
start "Switch-Lit Backend (Port 8000)" cmd /k "call start_backend.bat"

echo Starting Frontend in separate window...
start "Switch-Lit Frontend (Port 5173)" cmd /k "call start_frontend.bat"

echo Waiting 3 seconds for servers to initialize...
timeout /t 3 /nobreak >nul

echo Opening browser at http://localhost:5173 ...
start http://localhost:5173

echo.
echo Both servers have been launched in separate terminal windows.
echo You can manage them in their respective windows.
