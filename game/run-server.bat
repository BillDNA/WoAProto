@echo off
title War of Attrition - server
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required for two-device play. Install it from https://nodejs.org
  pause
  exit /b 1
)
node server.js
pause
