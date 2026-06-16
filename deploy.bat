@echo off
cd /d "f:\сайт для cs2"
git add .
git commit -m "update"
git push
echo.
echo Готово! Vercel обновит сайт через 30 секунд.
pause
