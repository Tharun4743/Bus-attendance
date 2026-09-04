@echo off
setlocal enabledelayedexpansion
title College Bus Attendance System Launcher
color 0B

echo ===============================================================================
echo                COLLEGE BUS ATTENDANCE SYSTEM - LAUNCHER
echo ===============================================================================
echo.

:: 1. Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js is not installed or not in your PATH!
    echo Please download and install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 2. Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] npm is not installed or not in your PATH!
    echo Please install npm or repair your Node.js installation.
    echo.
    pause
    exit /b 1
)

:: 3. Check for node_modules
if not exist "node_modules\" (
    echo [*] Node modules missing. Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo [ERROR] Failed to install npm dependencies.
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed successfully.
    echo.
)

:MENU
cls
color 0B
echo ===============================================================================
echo                COLLEGE BUS ATTENDANCE SYSTEM - CONTROL PANEL
echo ===============================================================================
echo.
echo   [1] Start Application (Express API + Vite Web Client + Auto Open Browser)
echo   [2] Run Automated Verification Tests (Haversine, Moving Bus, Security)
echo   [3] Build Production Bundle (Vite + TypeScript)
echo   [4] Install / Repair Dependencies (npm install)
echo   [5] Exit
echo.
echo ===============================================================================
set /p choice="Please enter your choice (1-5) [Default is 1]: "

if "%choice%"=="" set choice=1
if "%choice%"=="1" goto START_APP
if "%choice%"=="2" goto RUN_TESTS
if "%choice%"=="3" goto BUILD_APP
if "%choice%"=="4" goto INSTALL_DEPS
if "%choice%"=="5" goto EXIT_APP

echo.
echo [!] Invalid selection. Please choose 1, 2, 3, 4, or 5.
timeout /t 2 >nul
goto MENU

:START_APP
cls
color 0A
echo ===============================================================================
echo                 STARTING BUS ATTENDANCE SYSTEM (DEV MODE)
echo ===============================================================================
echo.
echo   - Backend API : http://localhost:3001/api
echo   - Web Client  : http://localhost:5173
echo.
echo   Launching default web browser in 3 seconds...
echo ===============================================================================
echo.

:: Open browser after 3 seconds in background
start "" cmd /c "timeout /t 3 >nul && start http://localhost:5173"

:: Start the application
call npm run dev
pause
goto MENU

:RUN_TESTS
cls
color 0E
echo ===============================================================================
echo                     RUNNING AUTOMATED TEST SUITE
echo ===============================================================================
echo.
call npm test
echo.
echo Press any key to return to the menu...
pause >nul
goto MENU

:BUILD_APP
cls
color 0D
echo ===============================================================================
echo                    BUILDING PRODUCTION BUNDLE
echo ===============================================================================
echo.
call npm run build
echo.
echo Press any key to return to the menu...
pause >nul
goto MENU

:INSTALL_DEPS
cls
color 0F
echo ===============================================================================
echo                    INSTALLING / REPAIRING DEPENDENCIES
echo ===============================================================================
echo.
call npm install
echo.
echo [OK] Complete. Press any key to return to menu...
pause >nul
goto MENU

:EXIT_APP
cls
echo Thank you for using College Bus Attendance System.
exit /b 0
