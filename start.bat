@echo off
setlocal

cd /d "%~dp0"

if not exist "frontend\dist\index.html" (
    echo [ERROR] frontend\dist\index.html not found.
    echo Please build the frontend first:
    echo     cd frontend
    echo     pnpm install
    echo     pnpm build
    exit /b 1
)

echo ============================================
echo   Restaurant Ordering System
echo   URL: http://localhost:8000
echo   Press Ctrl+C to stop the server
echo ============================================
echo.

cd /d "%~dp0backend"
php -S 0.0.0.0:8000 -t "%~dp0frontend\dist" router.php
