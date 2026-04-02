@echo off
echo.
echo  Starting DOOR Ministry Map demo server...
echo.

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo  Python not found.
    echo  Install Python 3 from https://www.python.org/downloads/
    echo  Make sure to check "Add Python to PATH" during install.
    pause
    exit /b 1
)

python "%~dp0serve.py"

if %errorlevel% neq 0 (
    echo.
    pause
)