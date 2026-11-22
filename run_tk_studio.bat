@echo off
setlocal
title TK Code Studio - Auto Launcher
color 0B

cd /d "%~dp0"

echo ===================================================
echo           TK CODE STUDIO - AUTO LAUNCHER
echo ===================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    color 0C
    echo [ERROR] Node.js is not found in PATH. Please install Node.js 18+.
    pause
    exit /b 1
)

set "PATH=%~dp0node_modules\.bin;%PATH%"

set "SCRIPT_PATH="
if exist ".agent\skills\tk_code_studio\scripts\live.mjs" (
    set "SCRIPT_PATH=.agent\skills\tk_code_studio\scripts\live.mjs"
) else if exist "scripts\live.mjs" (
    set "SCRIPT_PATH=scripts\live.mjs"
)

if "%SCRIPT_PATH%"=="" (
    color 0C
    echo [ERROR] Could not find live.mjs script.
    pause
    exit /b 1
)

echo [*] Starting TK Code Studio on port 4743...
node "%SCRIPT_PATH%" start %*

if errorlevel 1 (
    echo.
    echo [!] TK Code Studio stopped.
    pause
)
