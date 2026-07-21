@echo off
title Nahanjoo App Launcher
cd /d "%~dp0"

rem Isolate Python environment from host machine user site-packages (AppData\Roaming\Python)
set PYTHONNOUSERSITE=1

rem Check if python_embed exists
if not exist "%~dp0python_embed\python.exe" (
    echo Error: python_embed not found. Please run build_usb_portable.py first.
    pause
    exit
)

rem Check if critical model files exist
set MISSING_MODELS=0
if not exist "%~dp0Models\Qwen2.5-3B-Instruct-Q4_K_M.gguf" set MISSING_MODELS=1
if not exist "%~dp0Models\embedding\pytorch_model.bin" set MISSING_MODELS=1
if not exist "%~dp0Models\fonts\Vazirmatn-Regular.ttf" set MISSING_MODELS=1

if %MISSING_MODELS%==1 (
    echo [!] Offline model files or assets are missing.
    echo [*] Launching download_models.py to cache models automatically...
    "%~dp0python_embed\python.exe" "%~dp0download_models.py"
    if errorlevel 1 (
        echo.
        echo [-] Error: Model download failed. Please check your internet connection and try again.
        pause
        exit
    )
    echo.
    echo [+] All models cached successfully!
)

echo Starting Nahanjoo App...
start "" "%~dp0python_embed\pythonw.exe" "%~dp0main.py"
exit
