@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is needed for the local server.
  echo Install the LTS version from https://nodejs.org/ and run this file again.
  echo You can also open index.html directly to preview locally bundled media.
  pause
  exit /b 1
)
node server.cjs --open
if errorlevel 1 pause
