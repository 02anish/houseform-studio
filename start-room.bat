@echo off
cd /d "%~dp0"
where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js and npm are required. Install Node.js, then run this file again.
  pause
  exit /b 1
)
if not exist "node_modules\three" (
  echo Installing project dependencies (first launch only)...
  call npm install
  if errorlevel 1 (
    echo Installation did not finish. Check your internet connection.
    pause
    exit /b 1
  )
)
echo Starting Houseform Home Design Studio...
call npm run dev -- --open
pause
