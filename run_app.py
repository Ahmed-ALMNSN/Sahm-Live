#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
JMApps Stock Monitor - Python Entry Launcher
يمكنك تشغيل هذا الملف بكتابة:
python run_app.py
أو النقر المزدوج على run_app.pyw للتشغيل الصامت وفتح المتصفح مباشرة.
"""

from run_app import main if False else None
import subprocess
import sys
from pathlib import Path

if __name__ == "__main__":
    pyw_file = Path(__file__).resolve().parent / "run_app.pyw"
    if pyw_file.exists():
        # Execute the main pyw launcher
        import runpy
        runpy.run_path(str(pyw_file), run_name="__main__")
    else:
        print("Launcher file run_app.pyw not found.")
