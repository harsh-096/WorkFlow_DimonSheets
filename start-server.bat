@echo off
cd /d "%~dp0"
echo ========================================
echo   Guni App - Local Server
echo ========================================
echo.
echo Open on your phone (same WiFi):
echo   http://10.205.242.112:8000
echo.
echo Open on this computer:
echo   http://localhost:8000
echo.
echo Press Ctrl+C to stop
echo ========================================
echo.
python -m http.server 8000
pause
