@echo off
echo ========================================================
echo   JMApps Stock Monitor - Windows Desktop EXE Builder
echo ========================================================
echo.
echo 1. Installing production dependencies...
call npm install
echo.
echo 2. Building frontend and server bundle...
call npm run build
echo.
echo 3. Packaging into Windows Installer (.EXE) and Portable EXE...
call npx electron-builder --win nsis portable
echo.
echo ========================================================
echo   Build Complete! Check the 'dist-electron' folder.
echo ========================================================
pause
