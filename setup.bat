@echo off
cd /d "%~dp0"
echo Menghentikan server lama (kalau ada)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>&1
echo Memasang paket...
call npm install || goto gagal
echo Membangun aplikasi...
call npm run build || goto gagal
echo.
echo Selesai. Jalankan buat-shortcut.bat sekali, lalu pakai ikon di Desktop.
pause
exit /b 0
:gagal
echo.
echo Gagal. Pastikan Node.js (versi 20.9 atau lebih baru) sudah terpasang.
pause
exit /b 1
