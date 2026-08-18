#!/bin/bash
set -e

echo "======================================================="
echo "  JMApps Stock Monitor - Desktop Package Builder"
echo "======================================================="
echo ""

echo "[1/3] Installing dependencies..."
npm install

echo "[2/3] Building Web and Server production bundle..."
npm run build

echo "[3/3] Packaging installers..."
# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "Detected macOS - Building DMG and ZIP installers..."
  npx electron-builder --mac dmg zip
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  echo "Detected Linux - Building AppImage and Debian package..."
  npx electron-builder --linux AppImage deb
else
  echo "Building Windows installers..."
  npx electron-builder --win nsis portable
fi

echo ""
echo "======================================================="
echo "  SUCCESS! Output packages available in: dist-electron/"
echo "======================================================="
