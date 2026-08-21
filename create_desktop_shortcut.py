#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Helper script to generate Windows .ico file from SVG/Canvas or create Desktop Shortcut.
"""
import os
import sys
from pathlib import Path

def create_windows_shortcut():
    """Create a Desktop Shortcut with the app icon on Windows."""
    try:
        import winshell
        from win32com.client import Dispatch

        desktop = Path(winshell.desktop())
        app_dir = Path(__file__).resolve().parent
        target_pyw = app_dir / "run_app.pyw"
        ico_file = app_dir / "public" / "icon.ico"

        shortcut_path = desktop / "JMApps Stock Monitor.lnk"
        shell = Dispatch('WScript.Shell')
        shortcut = shell.CreateShortCut(str(shortcut_path))
        shortcut.Targetpath = sys.executable.replace("python.exe", "pythonw.exe")
        shortcut.Arguments = f'"{target_pyw}"'
        shortcut.WorkingDirectory = str(app_dir)
        shortcut.Description = "JMApps Stock Monitor - Realtime US Equities"
        if ico_file.exists():
            shortcut.IconLocation = str(ico_file)
        shortcut.save()
        print(f"✅ Desktop shortcut created: {shortcut_path}")
    except Exception as e:
        print(f"Note on shortcut creation: {e}")

if __name__ == "__main__":
    create_windows_shortcut()
