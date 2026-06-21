@echo off
echo ===============================================
echo Starting CollegeBuddy Backend and Frontend...
echo ===============================================

echo.
echo Starting Backend (FastAPI)...
:: Open a new command prompt, navigate to backend, activate venv, and run uvicorn
start "CollegeBuddy Backend" cmd /k "cd backend && call venv\Scripts\activate.bat && uvicorn main:app --reload --port 8000"

:: Wait a few seconds to let backend initialize before starting frontend
timeout /t 3 /nobreak >nul

echo.
echo Starting Frontend (Vite)...
:: Open a new command prompt, navigate to frontend, and run npm run dev
start "CollegeBuddy Frontend" cmd /k "cd frontend && npm run dev"

:: Wait a few seconds to let Vite compile and start
timeout /t 3 /nobreak >nul

echo.
echo ===============================================
echo CollegeBuddy is successfully starting up!
echo.
echo Backend API will be available at:  http://localhost:8000/
echo Frontend Web App will be available at: http://localhost:5173/
echo.
echo You can access the web application by clicking the link above!
echo ===============================================
echo.
pause
