@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0buat-shortcut.ps1"
echo Ikon "ASMR Pribadi" sudah dibuat di Desktop.
echo.
choice /m "Nyalakan server otomatis saat Windows menyala (tanpa membuka jendela)"
if errorlevel 2 goto selesai
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0buat-shortcut.ps1" -Autostart
echo Autostart aktif. Untuk mematikannya, hapus "ASMR Server" dari folder Startup (Win+R, ketik shell:startup).
:selesai
pause
