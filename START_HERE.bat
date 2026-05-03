@echo off
title ScamShield X Server
color 0A
cls

echo.
echo  ================================================
echo    ScamShield X - AI Fraud Prevention Platform
echo  ================================================
echo.

echo  [1/3] Clearing port 3000...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3000 "') do (
    taskkill /PID %%a /F >nul 2>&1
)
ping -n 2 127.0.0.1 >nul

echo  [2/3] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  ERROR: Node.js not found! Download: https://nodejs.org
    pause
    exit /b
)

if not exist "node_modules" (
    echo  Installing packages...
    npm install
)

echo  [3/3] Starting server...
echo.
echo  ================================================
echo   SERVER IS RUNNING!
echo   Open: http://localhost:3000
echo   DO NOT CLOSE THIS WINDOW
echo  ================================================
echo.

start /b cmd /c "ping -n 3 127.0.0.1 >nul && start http://localhost:3000"
node server.js

echo.
echo  Server stopped.
pause
