@echo off
setlocal
title College Bus Attendance System
color 0B

cd /d "%~dp0"

echo ===============================================================================
echo            COLLEGE BUS ATTENDANCE MANAGEMENT SYSTEM
echo ===============================================================================
echo.
echo   [*] Web Application URL : http://localhost:5173
echo   [*] Backend REST API    : http://localhost:3001/api
echo   [*] Server Health Check : http://localhost:3001/api/health
echo.
echo   Opening browser at http://localhost:5173 and starting servers...
echo   (Press Ctrl+C in this window at any time to stop)
echo ===============================================================================
echo.

where node >nul 2>nul
if errorlevel 1 goto ERR_NO_NODE

if not exist ".env" (
    if exist ".env.example" copy /y ".env.example" ".env" >nul
)

if not exist "node_modules\" (
    echo [*] Installing dependencies, please wait...
    call npm install
    if errorlevel 1 goto ERR_NPM_INSTALL
)

set "PATH=%~dp0node_modules\.bin;%PATH%"

:: Open default web browser directly to the app URL (no extra CMD windows)
start http://localhost:5173

:: Start the application (Express backend + Vite client)
call npm run dev

if errorlevel 1 goto ERR_STOPPED
exit /b 0

:ERR_NO_NODE
color 0C
echo.
echo [ERROR] Node.js is not installed or not found in system PATH.
echo Please install Node.js from https://nodejs.org/ and re-run.
echo.
pause
exit /b 1

:ERR_NPM_INSTALL
color 0C
echo.
echo [ERROR] npm install encountered an error.
echo.
pause
exit /b 1

:ERR_STOPPED
echo.
echo [!] Server stopped.
pause
exit /b 1
