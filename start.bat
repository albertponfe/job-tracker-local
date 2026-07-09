@echo off
REM ===  Job Tracker - one-click start (Windows)  ===
REM Double-click this file to install (first time only), build, and run the app.

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is not installed.
  echo   Please install it from https://nodejs.org  ^(the "LTS" version^), then run this again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies for the first time. This can take a minute...
  call npm install
  if errorlevel 1 (
    echo.
    echo   Something went wrong during install. See the messages above.
    pause
    exit /b 1
  )
)

echo Starting Job Tracker...
call npm start

pause
