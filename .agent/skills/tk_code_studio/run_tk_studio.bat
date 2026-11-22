@echo off
setlocal enabledelayedexpansion
title TK Code Studio - Auto Launcher

echo ===================================================
echo           ⚡ TK CODE STUDIO - AUTO LAUNCHER
echo ===================================================

:: Check if Node is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in PATH. Please install Node.js 18+.
    pause
    exit /b 1
)

:: Locate live.mjs script
set "SCRIPT_PATH="
if exist ".agent\skills\tk_code_studio\scripts\live.mjs" (
    set "SCRIPT_PATH=.agent\skills\tk_code_studio\scripts\live.mjs"
) else if exist ".agent\skills\tk-code-studio\scripts\live.mjs" (
    set "SCRIPT_PATH=.agent\skills\tk-code-studio\scripts\live.mjs"
) else if exist "scripts\live.mjs" (
    set "SCRIPT_PATH=scripts\live.mjs"
) else if exist "%~dp0scripts\live.mjs" (
    set "SCRIPT_PATH=%~dp0scripts\live.mjs"
) else if exist "%USERPROFILE%\.gemini\config\skills\tk_code_studio\scripts\live.mjs" (
    set "SCRIPT_PATH=%USERPROFILE%\.gemini\config\skills\tk_code_studio\scripts\live.mjs"
) else if exist "%USERPROFILE%\.gemini\config\skills\tk-code-studio\scripts\live.mjs" (
    set "SCRIPT_PATH=%USERPROFILE%\.gemini\config\skills\tk-code-studio\scripts\live.mjs"
)

if "%SCRIPT_PATH%"=="" (
    echo [ERROR] Could not find live.mjs script.
    echo Please make sure TK Code Studio is installed.
    pause
    exit /b 1
)

:: Start TK Code Studio proxy
echo [*] Starting TK Code Studio on port 4743...
node "%SCRIPT_PATH%" start %*

if %errorlevel% neq 0 (
    echo.
    echo [!] TK Code Studio stopped with exit code %errorlevel%.
    pause
)
