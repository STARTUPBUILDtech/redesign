@echo off
cd /d "%~dp0"
start "PayKudi server" cmd /k "npm run dev -- --open"
