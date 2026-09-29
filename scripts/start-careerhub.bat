@echo off
rem CareerHub - start the site and open it in your browser
rem Double-click this file instead of opening index.html directly.
rem (index.html cannot work by double-clicking it - the app runs through Docker.)

cd /d "%~dp0.."

echo Starting CareerHub containers...
docker compose up -d

echo Waiting a moment for the web server...
timeout /t 4 /nobreak >nul

echo Opening http://localhost:5173/ ...
start "" http://localhost:5173/
