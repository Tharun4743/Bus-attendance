@echo off
setlocal enabledelayedexpansion
title College Bus Attendance System — Unified Launcher
color 0B

echo ===============================================================================
echo            🚌 COLLEGE BUS ATTENDANCE MANAGEMENT SYSTEM — LAUNCHER
echo ===============================================================================
echo.
echo   CONFIGURED SYSTEM ROLES:
echo   -----------------------------------------------------------------------------
echo   [1] SUPERADMIN : campusvsb4743@gmail.com / tharun@gmail.com (/admin/dashboard)
echo   [2] IN-CHARGE  : aarthi@college.edu  | Role: Bus In-Charge (/incharge/dashboard)
echo   [3] STUDENT    : 24it001@college.edu | Role: Student Commuter (/student/dashboard)
echo   -----------------------------------------------------------------------------
echo.

:: 1. Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js is not installed or not found in your PATH!
    echo Please install Node.js from https://nodejs.org/ and re-run.
    echo.
    pause
    exit /b 1
)

:: 2. Check for .env file
if not exist ".env" (
    echo [*] .env file not found. Creating from .env.example...
    copy ".env.example" ".env" >nul
    echo [!] Created .env from template. Please configure your DATABASE_URL before starting.
    echo.
)

:: 3. Check for node_modules
if not exist "node_modules\" (
    echo [*] Dependencies not found. Running npm install...
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed successfully.
    echo.
)

:MENU
echo ===============================================================================
echo   CHOOSE AN ACTION:
echo   [1] Start Application (Express API + Vite Client + Auto-Open Browser) [DEFAULT]
echo   [2] Run Vitest Regression Test Circuits (26 tests: Biometrics + Auth + OTP)
echo   [3] Run System Lifecycle Verification (24 tests: npm test)
echo   [4] Run Biometric Accuracy & Score Benchmark (scripts/evaluate_accuracy.ts)
echo   [5] Train Local Biometric Neural Model (scripts/train_student_model.ts)
echo   [6] Build Production Bundle (tsc + vite build)
echo   [7] Install / Clean Reinstall Dependencies (npm install)
echo   [8] Exit
echo ===============================================================================
echo.

set "choice=1"
set /p choice="Enter choice (1-8) [Press ENTER for Default 1]: "

if "%choice%"=="1" goto START_APP
if "%choice%"=="2" goto RUN_VITEST
if "%choice%"=="3" goto RUN_SYSTEM_TESTS
if "%choice%"=="4" goto RUN_ACCURACY
if "%choice%"=="5" goto TRAIN_MODEL
if "%choice%"=="6" goto BUILD_APP
if "%choice%"=="7" goto INSTALL_DEPS
if "%choice%"=="8" goto EXIT_APP

echo [!] Invalid option. Starting Application...
timeout /t 1 >nul

:START_APP
cls
color 0A
echo ===============================================================================
echo                 STARTING BUS ATTENDANCE SYSTEM (DEV MODE)
echo ===============================================================================
echo.
echo   🌐 Web Application : http://localhost:5173
echo   🔌 REST API Server : http://localhost:3001/api
echo   📊 Health Check    : http://localhost:3001/api/health
echo.
echo   Ready for local & mobile testing.
echo   Launching web browser in 3 seconds...
echo   (Press Ctrl+C at any time in this window to stop the server)
echo ===============================================================================
echo.

:: Automatically open browser after 3 seconds
start "" cmd /c "timeout /t 3 >nul && start http://localhost:5173"

:: Launch concurrently both server.ts and vite
call npm run dev
pause
goto MENU

:RUN_VITEST
cls
color 0E
echo ===============================================================================
echo                    RUNNING VITEST REGRESSION TEST CIRCUITS
echo ===============================================================================
echo.
call npx vitest run
echo.
echo Press any key to return to menu...
pause >nul
cls
goto MENU

:RUN_SYSTEM_TESTS
cls
color 0E
echo ===============================================================================
echo                    RUNNING SYSTEM VERIFICATION LIFECYCLE TESTS
echo ===============================================================================
echo.
call npm test
echo.
echo Press any key to return to menu...
pause >nul
cls
goto MENU

:RUN_ACCURACY
cls
color 0B
echo ===============================================================================
echo             RUNNING BIOMETRIC ACCURACY & HOLDOUT BENCHMARK
echo ===============================================================================
echo.
call npm run test:accuracy
echo.
echo Press any key to return to menu...
pause >nul
cls
goto MENU

:TRAIN_MODEL
cls
color 0B
echo ===============================================================================
echo             TRAINING LOCAL BIOMETRIC NEURAL CLASSIFIER MODEL
echo ===============================================================================
echo.
call npm run train:model
echo.
echo Press any key to return to menu...
pause >nul
cls
goto MENU

:BUILD_APP
cls
color 0D
echo ===============================================================================
echo                    BUILDING PRODUCTION BUNDLE (TSC + VITE)
echo ===============================================================================
echo.
call npm run build
echo.
echo Press any key to return to menu...
pause >nul
cls
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
cls
goto MENU

:EXIT_APP
cls
echo Thank you for using College Bus Attendance System.
exit /b 0
