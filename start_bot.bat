@echo off
title WISDOM TEMP Bot - 24/7 Runner
color 0A

echo ========================================
echo    WISDOM TEMP Bot - 24/7 Runner
echo ========================================
echo.
echo Starting bot with auto-restart...
echo Press Ctrl+C to stop the bot completely
echo.

:start
echo [%date% %time%] Starting bot...
node index.js

echo.
echo [%date% %time%] Bot stopped! Restarting in 5 seconds...
echo Press Ctrl+C within 5 seconds to prevent restart
timeout /t 5 /nobreak >nul

goto start