@echo off
echo ============================================
echo Fixing System PATH - remove wrong npm entry
echo ============================================
echo.
echo This script must be run as Administrator!
echo.
echo The wrong entry to remove: C:\Program Files\nodejs\node_modules\npm\bin
echo.

:: Get current System PATH
setlocal enabledelayedexpansion
set "regpath="
for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do (
    set "regpath=%%b"
)

if "%regpath%"=="" (
    echo ERROR: Could not read System PATH from registry
    pause
    exit /b 1
)

echo Current System PATH contains wrong entry
echo.
set "newpath=%regpath:C:\Program Files\nodejs\node_modules\npm\bin;=%"
set "newpath=%newpath:C:\Program Files\nodejs\node_modules\npm\bin=%"

:: Remove duplicate semicolons
set "newpath=%newpath:;;=;%"

echo Fixed PATH will be written to registry.
echo.
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path /t REG_EXPAND_SZ /d "%newpath%" /f

if %errorlevel% equ 0 (
    echo.
    echo SUCCESS! Wrong npm entry has been removed from System PATH.
    echo.
    echo IMPORTANT: Please restart your computer or log off and log back on
    echo for the changes to take effect.
) else (
    echo.
    echo ERROR: Failed to update registry. Make sure you run as Administrator.
)

echo.
pause