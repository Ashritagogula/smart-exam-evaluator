@echo off
echo Starting University Exam Management System...
echo.

echo [1/2] Starting Backend (port 5001)...
start "Backend" cmd /k "cd /d D:\project_space\backend && npm run dev"

timeout /t 3 /nobreak > nul

echo [2/2] Starting Frontend (port 5173)...
start "Frontend" cmd /k "cd /d D:\project_space\ai-exam-evaluation-system-updated\ai-exam-evaluation-system-updated\ai-exam-evaluation-system && npm run dev -- --host"

echo.
echo ✅ Both servers starting...
echo    Backend:  http://localhost:5001
echo    Frontend: http://localhost:5173
echo.
pause
