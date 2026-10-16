@echo off
cd /d "%~dp0"
start "PayKudi Room Server (Node.js)" cmd /k "npm run server"
start "PayKudi Backend (Python)" cmd /k "cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
start "PayKudi Frontend" cmd /k "npm run dev -- --open"

