@echo off
echo =======================================================
echo   JMApps Stock Monitor - Desktop Setup Installer Builder
echo =======================================================
echo.
echo [1/3] Checking Node.js and dependencies...
call npm install
echo.
echo [2/3] Building Web and Server Bundle...
call npm run build
echo.
echo [3/3] Packaging Windows Setup (.exe NSIS Installer + Portable)...
call npx electron-builder --win nsis portable
echo.
echo =======================================================
echo   SUCCESS! Installer created in 'dist-electron' folder:
echo   - JMApps Stock Monitor-Setup-1.0.0-x64.exe (Setup Installer Wizard)
echo   - JMApps Stock Monitor-Setup-1.0.0-x64.exe (Portable Version)
echo =======================================================
pause
