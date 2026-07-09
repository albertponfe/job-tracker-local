@echo off
setlocal
cd /d "%~dp0"
title Job Tracker

REM ===  Job Tracker - one-click start (Windows)  ===
REM Double-click this file. First time: it installs what it needs, then opens the app.

REM --- 1. Make sure Node.js is available ---
where node >nul 2>nul
if %errorlevel%==0 goto :HAVE_NODE

echo.
echo   Node.js is needed to run this app, and it isn't installed yet.
echo.
where winget >nul 2>nul
if %errorlevel%==0 (
  echo   Trying to install it for you automatically ^(you may see a permission popup - click Yes^)...
  echo.
  winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
  echo.
  echo   ============================================================
  echo    Node.js was installed. Please CLOSE this window and
  echo    double-click start.bat again to finish starting the app.
  echo   ============================================================
  echo.
  pause
  exit /b 0
) else (
  echo   Opening the Node.js download page in your browser.
  echo   Please install the big green "LTS" button, then run start.bat again.
  start "" "https://nodejs.org/en/download/prebuilt-installer"
  echo.
  pause
  exit /b 1
)

:HAVE_NODE
REM --- 2. Install app dependencies the first time ---
if not exist "node_modules" (
  echo Installing app dependencies ^(first time only, about a minute^)...
  call npm install
  if %errorlevel% neq 0 (
    echo.
    echo   Install ran into a problem. See the messages above.
    pause
    exit /b 1
  )
)

REM --- 3. Build and run ---
echo.
echo   Starting Job Tracker... your browser will open automatically.
echo   Keep this window open while you use the app. Close it to stop.
echo.
call npm start

pause
