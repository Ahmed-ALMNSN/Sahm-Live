#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
JMApps Stock Monitor - Python Desktop Launcher & Auto-Provisioner
منصة رصد الأسهم الأمريكية - مشغل التطبيق الذكي
=============================================================================
المميزات:
1. فحص تلقائي لوجود Node.js و npm.
2. فحص مجلد node_modules: إذا كان موجوداً يتم التخطي، وإذا لم يكن يقوم بالتنصيب تلقائياً.
3. تشغيل السيرفر في الخلفية بدون ظهور نافذة PowerShell أو Command Prompt.
4. التحقق التلقائي من جهوزية المنفذ (Port 3000) وفتح المتصفح مباشرة.
5. واجهة تحكم رسومية مصغرة (Tkinter GUI) بأيقونة التطبيق وخيارات التحكم السريع.
=============================================================================
"""

import os
import sys
import time
import json
import socket
import shutil
import urllib.request
import urllib.error
import subprocess
import threading
import webbrowser
from pathlib import Path

# Try importing Tkinter for modern GUI
try:
    import tkinter as tk
    from tkinter import ttk, messagebox, scrolledtext
    HAS_TK = True
except ImportError:
    HAS_TK = False

# Application Constants
APP_TITLE = "JMApps Stock Monitor | منصة رصد الأسهم"
APP_PORT = 3000
SERVER_URL = f"http://localhost:{APP_PORT}"
HEALTH_ENDPOINT = f"{SERVER_URL}/api/health"
APP_DIR = Path(__file__).resolve().parent

# Color Palette (Dark High-Contrast Quant Theme)
BG_DARK = "#0a0b0d"
BG_CARD = "#161b22"
BG_INPUT = "#0d1117"
ACCENT_GREEN = "#10b981"
ACCENT_EMERALD = "#059669"
ACCENT_RED = "#ef4444"
TEXT_WHITE = "#f8fafc"
TEXT_MUTED = "#94a3b8"
BORDER_COLOR = "#30363d"


def find_node_and_npm():
    """
    Search and resolve Node.js and NPM paths dynamically.
    Ensures that when running via pythonw.exe or double-clicked .pyw,
    Node.js and npm are located even if PATH was not inherited by the GUI process.
    Also injects all found paths into os.environ['PATH'].
    Returns (node_path, npm_path, version_str).
    """
    candidate_dirs = []

    if os.name == 'nt':
        # Standard Windows installation paths
        program_files = os.environ.get("ProgramFiles", r"C:\Program Files")
        program_files_x86 = os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")
        local_app_data = os.environ.get("LOCALAPPDATA", "")
        app_data = os.environ.get("APPDATA", "")
        user_profile = os.environ.get("USERPROFILE", "")

        windows_paths = [
            os.path.join(program_files, "nodejs"),
            os.path.join(program_files_x86, "nodejs"),
            os.path.join(local_app_data, "Programs", "nodejs") if local_app_data else "",
            os.path.join(local_app_data, "Programs", "node") if local_app_data else "",
            os.path.join(app_data, "npm") if app_data else "",
            os.path.join(user_profile, "AppData", "Roaming", "npm") if user_profile else "",
            os.path.join(user_profile, "AppData", "Local", "Programs", "nodejs") if user_profile else "",
            os.path.join(user_profile, "AppData", "Local", "Programs", "node") if user_profile else "",
            os.environ.get("NVM_HOME", ""),
            os.environ.get("NVM_SYMLINK", ""),
            os.path.join(user_profile, ".fnm", "current") if user_profile else "",
            os.path.join(user_profile, ".volta", "bin") if user_profile else "",
            r"C:\nodejs",
            r"C:\node",
            r"D:\nodejs",
            r"D:\node",
        ]
        candidate_dirs.extend([p for p in windows_paths if p and os.path.isdir(p)])

        # Check Windows Registry for Node.js install path
        try:
            import winreg
            for root_key in (winreg.HKEY_LOCAL_MACHINE, winreg.HKEY_CURRENT_USER):
                for sub_key in (r"SOFTWARE\Node.js", r"SOFTWARE\WOW6432Node\Node.js"):
                    try:
                        with winreg.OpenKey(root_key, sub_key) as key:
                            val, _ = winreg.QueryValueEx(key, "InstallPath")
                            if val and os.path.isdir(val) and val not in candidate_dirs:
                                candidate_dirs.insert(0, val)
                    except Exception:
                        pass
        except Exception:
            pass
    else:
        # Linux / macOS standard paths
        unix_paths = [
            "/usr/local/bin",
            "/usr/bin",
            "/opt/homebrew/bin",
            "/opt/local/bin",
            os.path.expanduser("~/.nvm/versions/node"),
            os.path.expanduser("~/.fnm/current/bin"),
            os.path.expanduser("~/.volta/bin"),
            os.path.expanduser("~/.bun/bin"),
        ]
        candidate_dirs.extend([p for p in unix_paths if os.path.isdir(p)])

    # Inject all candidate directories into os.environ['PATH']
    path_sep = ";" if os.name == 'nt' else ":"
    current_paths = os.environ.get("PATH", "").split(path_sep)
    for c_dir in candidate_dirs:
        if c_dir and c_dir not in current_paths:
            current_paths.insert(0, c_dir)
    os.environ["PATH"] = path_sep.join(current_paths)

    # Resolve node executable
    node_path = shutil.which("node") or shutil.which("node.exe")
    if not node_path:
        for c_dir in candidate_dirs:
            for node_name in ("node.exe", "node"):
                test_file = os.path.join(c_dir, node_name)
                if os.path.isfile(test_file):
                    node_path = test_file
                    break
            if node_path:
                break

    # Resolve npm executable
    npm_path = shutil.which("npm") or shutil.which("npm.cmd") or shutil.which("npm.exe")
    if not npm_path:
        for c_dir in candidate_dirs:
            for npm_name in ("npm.cmd", "npm.bat", "npm.exe", "npm"):
                test_file = os.path.join(c_dir, npm_name)
                if os.path.isfile(test_file):
                    npm_path = test_file
                    break
            if npm_path:
                break

    # If node is found but npm is not, check directory where node lives
    if node_path and not npm_path:
        node_dir = os.path.dirname(node_path)
        for npm_name in ("npm.cmd", "npm.bat", "npm.exe", "npm"):
            test_file = os.path.join(node_dir, npm_name)
            if os.path.isfile(test_file):
                npm_path = test_file
                break

    # Fallback names
    if not npm_path:
        npm_path = "npm.cmd" if os.name == 'nt' else "npm"

    # Query node version
    version_str = None
    if node_path:
        try:
            res = subprocess.run([node_path, "--version"], capture_output=True, text=True, timeout=5)
            if res.returncode == 0:
                version_str = res.stdout.strip()
        except Exception:
            try:
                res = subprocess.run(f'"{node_path}" --version', shell=True, capture_output=True, text=True, timeout=5)
                if res.returncode == 0:
                    version_str = res.stdout.strip()
            except Exception:
                pass

    return node_path, npm_path, version_str


def is_port_in_use(port: int) -> bool:
    """Check if the given port is already active."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(('127.0.0.1', port)) == 0


def check_server_health(timeout: float = 1.0) -> bool:
    """Check if the Stock Monitor API server is healthy and responding."""
    try:
        req = urllib.request.Request(HEALTH_ENDPOINT, headers={'User-Agent': 'SahmLauncher/1.0'})
        with urllib.request.urlopen(req, timeout=timeout) as res:
            if res.getcode() == 200:
                data = json.loads(res.read().decode('utf-8'))
                return data.get('status') == 'ok'
    except Exception:
        pass
    return False


def is_npm_installed_check() -> bool:
    """Verify if node_modules already exists and has necessary packages."""
    node_modules = APP_DIR / "node_modules"
    express_pkg = node_modules / "express"
    vite_pkg = node_modules / "vite"
    return node_modules.exists() and express_pkg.exists() and vite_pkg.exists()


class StockMonitorApp:
    def __init__(self, root=None):
        self.root = root
        self.server_process = None
        self.is_running = False
        self.installing = False
        self.log_lines = []
        self.node_bin = None
        self.npm_bin = None
        self.node_version = None

        if self.root:
            self.setup_ui()
            # Start background verification & launcher thread
            threading.Thread(target=self.initial_launch_sequence, daemon=True).start()
        else:
            # Headless / Terminal Fallback Mode
            self.run_headless()

    def setup_ui(self):
        """Construct the modern graphical launcher interface."""
        self.root.title(APP_TITLE)
        self.root.geometry("540x440")
        self.root.resizable(False, False)
        self.root.configure(bg=BG_DARK)

        # Center window on screen
        self.center_window(540, 440)

        # Handle window close
        self.root.protocol("WM_DELETE_WINDOW", self.on_close)

        # Header Container
        header_frame = tk.Frame(self.root, bg=BG_CARD, padx=20, pady=16, highlightbackground=BORDER_COLOR, highlightthickness=1)
        header_frame.pack(fill=tk.X, padx=12, pady=(12, 8))

        # Title & Badge
        title_box = tk.Frame(header_frame, bg=BG_CARD)
        title_box.pack(fill=tk.X)

        title_lbl = tk.Label(
            title_box,
            text="🏹 JMApps Stock Monitor",
            font=("Segoe UI", 14, "bold"),
            fg=TEXT_WHITE,
            bg=BG_CARD,
            anchor="w"
        )
        title_lbl.pack(side=tk.LEFT)

        self.badge_lbl = tk.Label(
            title_box,
            text="جاري الفحص...",
            font=("Segoe UI", 9, "bold"),
            fg="#f59e0b",
            bg=BG_INPUT,
            padx=10,
            pady=3,
            relief=tk.FLAT
        )
        self.badge_lbl.pack(side=tk.RIGHT)

        subtitle_lbl = tk.Label(
            header_frame,
            text="منصة التحليل الكمي والرصد اللحظي للأسهم الأمريكية | US Equities Quant Engine",
            font=("Segoe UI", 8),
            fg=TEXT_MUTED,
            bg=BG_CARD,
            anchor="w"
        )
        subtitle_lbl.pack(fill=tk.X, pady=(4, 0))

        # Main Status Card
        status_card = tk.Frame(self.root, bg=BG_CARD, padx=16, pady=14, highlightbackground=BORDER_COLOR, highlightthickness=1)
        status_card.pack(fill=tk.X, padx=12, pady=6)

        # Status text
        self.status_lbl = tk.Label(
            status_card,
            text="⚡ جاري تهيئة بيئة العمل وفحص الحزم...",
            font=("Segoe UI", 10, "bold"),
            fg=TEXT_WHITE,
            bg=BG_CARD,
            anchor="w"
        )
        self.status_lbl.pack(fill=tk.X, pady=(0, 6))

        # Progress bar
        self.progress = ttk.Progressbar(status_card, mode='indeterminate', length=480)
        self.progress.pack(fill=tk.X, pady=(0, 6))
        self.progress.start(12)

        # URL Details
        url_frame = tk.Frame(status_card, bg=BG_CARD)
        url_frame.pack(fill=tk.X, pady=(4, 0))

        url_title = tk.Label(url_frame, text="عنوان المنصة المحلي:", font=("Segoe UI", 8), fg=TEXT_MUTED, bg=BG_CARD)
        url_title.pack(side=tk.LEFT)

        self.url_val = tk.Label(
            url_frame,
            text=SERVER_URL,
            font=("Consolas", 9, "bold"),
            fg=ACCENT_GREEN,
            bg=BG_CARD,
            cursor="hand2"
        )
        self.url_val.pack(side=tk.LEFT, padx=6)
        self.url_val.bind("<Button-1>", lambda e: self.open_browser())

        # Action Buttons Frame
        btn_frame = tk.Frame(self.root, bg=BG_DARK, pady=6)
        btn_frame.pack(fill=tk.X, padx=12)

        # Open in Browser Button
        self.btn_browser = tk.Button(
            btn_frame,
            text="🌐 فتح في المتصفح (Browser)",
            font=("Segoe UI", 9, "bold"),
            fg=TEXT_WHITE,
            bg=ACCENT_EMERALD,
            activebackground=ACCENT_GREEN,
            activeforeground=TEXT_WHITE,
            relief=tk.FLAT,
            padx=14,
            pady=8,
            cursor="hand2",
            command=self.open_browser,
            state=tk.DISABLED
        )
        self.btn_browser.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 4))

        # Restart Server Button
        self.btn_restart = tk.Button(
            btn_frame,
            text="🔄 إعادة التشغيل",
            font=("Segoe UI", 9, "bold"),
            fg=TEXT_WHITE,
            bg=BG_CARD,
            activebackground=BORDER_COLOR,
            activeforeground=TEXT_WHITE,
            relief=tk.FLAT,
            padx=10,
            pady=8,
            cursor="hand2",
            command=self.restart_server,
            state=tk.DISABLED
        )
        self.btn_restart.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=4)

        # Stop and Exit Button
        self.btn_exit = tk.Button(
            btn_frame,
            text="⏹️ إيقاف وخروج",
            font=("Segoe UI", 9, "bold"),
            fg=TEXT_WHITE,
            bg="#374151",
            activebackground=ACCENT_RED,
            activeforeground=TEXT_WHITE,
            relief=tk.FLAT,
            padx=10,
            pady=8,
            cursor="hand2",
            command=self.on_close
        )
        self.btn_exit.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(4, 0))

        # Console / Logs Output Box
        log_frame = tk.Frame(self.root, bg=BG_DARK)
        log_frame.pack(fill=tk.BOTH, expand=True, padx=12, pady=(4, 12))

        log_lbl = tk.Label(log_frame, text="سجل العمليات المباشر (Console Logs):", font=("Segoe UI", 8), fg=TEXT_MUTED, bg=BG_DARK, anchor="w")
        log_lbl.pack(fill=tk.X, pady=(0, 2))

        self.log_box = scrolledtext.ScrolledText(
            log_frame,
            bg=BG_INPUT,
            fg="#94a3b8",
            insertbackground=TEXT_WHITE,
            font=("Consolas", 8),
            relief=tk.FLAT,
            height=6,
            highlightbackground=BORDER_COLOR,
            highlightthickness=1
        )
        self.log_box.pack(fill=tk.BOTH, expand=True)
        self.log_box.config(state=tk.DISABLED)

    def center_window(self, width: int, height: int):
        """Center the Tkinter window on the primary screen."""
        self.root.update_idletasks()
        screen_w = self.root.winfo_screenwidth()
        screen_h = self.root.winfo_screenheight()
        x = (screen_w // 2) - (width // 2)
        y = (screen_h // 2) - (height // 2) - 40
        self.root.geometry(f"{width}x{height}+{x}+{y}")

    def append_log(self, text: str):
        """Append log message to the log viewer widget thread-safely."""
        timestamp = time.strftime("%H:%M:%S")
        formatted = f"[{timestamp}] {text}\n"
        if self.root:
            self.root.after(0, self._insert_log, formatted)
        else:
            print(formatted.strip())

    def _insert_log(self, text: str):
        self.log_box.config(state=tk.NORMAL)
        self.log_box.insert(tk.END, text)
        self.log_box.see(tk.END)
        self.log_box.config(state=tk.DISABLED)

    def update_status(self, text: str, badge_text: str = None, badge_color: str = None):
        """Update status label and badge thread-safely."""
        if not self.root:
            print(f"STATUS: {text}")
            return
        def _update():
            self.status_lbl.config(text=text)
            if badge_text:
                self.badge_lbl.config(text=badge_text)
            if badge_color:
                self.badge_lbl.config(fg=badge_color)
        self.root.after(0, _update)

    def initial_launch_sequence(self):
        """Execute step-by-step launch workflow: check packages -> install if needed -> start server -> open browser."""
        self.append_log("بدء تشغيل منصة رصد الأسهم...")

        # 1. Check Node.js / NPM existence using smart discovery
        self.update_status("🔍 فحص بيئة Node.js و npm على الجهاز...", "فحص البيئة", "#f59e0b")
        node_bin, npm_bin, node_ver = find_node_and_npm()
        self.node_bin = node_bin
        self.npm_bin = npm_bin
        self.node_version = node_ver

        if not self.node_bin:
            self.append_log("⚠️ تعذر العثور على Node.js في مسارات النظام أو المجلدات الافتراضية.")
            self.update_status("❌ Node.js غير مثبت على النظام. يرجى تثبيت Node.js للمتابعة.", "خطأ في البيئة", ACCENT_RED)
            if self.root:
                self.root.after(0, lambda: messagebox.showerror(
                    "Node.js غير موجود",
                    "يتطلب التطبيق وجود بيئة Node.js لتشغيل خادم التحليل.\nيرجى تنزيل وتثبيت Node.js من الموقع الرسمي:\nhttps://nodejs.org"
                ))
            return

        version_display = self.node_version if self.node_version else "متوفر"
        self.append_log(f"✅ تم اكتشاف Node.js بنجاح ({version_display}) في: {self.node_bin}")
        self.append_log(f"✅ تم تحديد مسار مدير الحزم npm: {self.npm_bin}")

        # 2. Check if npm install is already done
        if is_npm_installed_check():
            self.append_log("⚡ تم العثور على حزم node_modules منصبة مسبقاً (تم تخطي npm install).")
            self.update_status("⚡ الحزم جاهزة مسبقاً. جاري تشغيل الخادم والمحرك الكمي...", "تخطي التنصيب", ACCENT_GREEN)
        else:
            self.append_log("📦 لم يتم العثور على حزم node_modules. جاري تنفيذ npm install لأول مرة...")
            self.update_status("📦 جاري تثبيت الحزم والمكتبات اللازمة لأول مرة (npm install)...", "جاري التنصيب", "#38bdf8")
            
            # Run npm install hidden with piped output
            install_cmd = [self.npm_bin, "install"]
            is_win = os.name == 'nt'
            creationflags = subprocess.CREATE_NO_WINDOW if is_win else 0

            try:
                proc = subprocess.Popen(
                    install_cmd,
                    cwd=str(APP_DIR),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    shell=is_win,
                    env=os.environ.copy(),
                    creationflags=creationflags
                )
                for line in proc.stdout:
                    if line.strip():
                        self.append_log(line.strip())
                proc.wait()

                if proc.returncode != 0:
                    self.append_log(f"❌ فشل تنفيذ npm install (كود الخطأ: {proc.returncode})")
                    self.update_status("❌ حدث خطأ أثناء تثبيت الحزم.", "فشل التنصيب", ACCENT_RED)
                    return
                self.append_log("✅ تم اكتمال تنصيب كافة الحزم بنجاح.")
            except Exception as e:
                self.append_log(f"❌ استثناء أثناء التنصيب: {e}")
                self.update_status("❌ فشل تشغيل أمر التنصيب.", "خطأ", ACCENT_RED)
                return

        # 3. Check if server is already running
        if check_server_health():
            self.append_log("🟢 الخادم يعمل بالفعل ومستعد لاستقبال الاتصالات على المنفذ 3000.")
            self.on_server_ready()
            return

        # 4. Start the Application Server
        self.start_server_process()

    def start_server_process(self):
        """Start the backend/Vite application server process in the background."""
        self.update_status("🚀 جاري بدء خادم التطبيق والمحرك الكمي...", "جاري البدء", "#f59e0b")
        self.append_log(f"تشغيل الخادم في الخلفية على المنفذ {APP_PORT}...")

        # Determine start command
        npm_cmd = self.npm_bin or ("npm.cmd" if os.name == 'nt' else "npm")
        cmd = [npm_cmd, "run", "dev"]
        is_win = os.name == 'nt'
        creationflags = subprocess.CREATE_NO_WINDOW if is_win else 0

        try:
            self.server_process = subprocess.Popen(
                cmd,
                cwd=str(APP_DIR),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                shell=is_win,
                env=os.environ.copy(),
                creationflags=creationflags
            )
            self.is_running = True

            # Start thread to read server stdout into log window
            threading.Thread(target=self._stream_server_logs, daemon=True).start()

            # Start thread to poll server health
            threading.Thread(target=self._wait_for_server_healthy, daemon=True).start()

        except Exception as e:
            self.append_log(f"❌ تعذر تشغيل الخادم: {e}")
            self.update_status(f"❌ خطأ أثناء بدء الخادم: {e}", "خطأ في التشغيل", ACCENT_RED)

    def _stream_server_logs(self):
        """Read server stdout stream line by line."""
        if not self.server_process:
            return
        try:
            for line in self.server_process.stdout:
                if line.strip():
                    self.append_log(line.strip())
        except Exception:
            pass

    def _wait_for_server_healthy(self):
        """Poll API endpoint until ready or timeout reached."""
        max_attempts = 40  # 40 * 0.5s = 20 seconds
        for attempt in range(max_attempts):
            if check_server_health() or is_port_in_use(APP_PORT):
                self.append_log("🟢 استجاب الخادم بنجاح (200 OK).")
                self.on_server_ready()
                return
            time.sleep(0.5)

        # If not detected via health, check port
        if is_port_in_use(APP_PORT):
            self.append_log("🟢 المنفذ 3000 نشط ومفتوح.")
            self.on_server_ready()
        else:
            self.update_status("⚠️ الخادم يستغرق وقتاً أطول للبدء. يرجى التحقق من السجلات...", "تأخير", "#f59e0b")

    def on_server_ready(self):
        """Server is online: stop progress bar, enable buttons, and launch browser."""
        self.update_status("✅ الخادم يعمل بنشاط! تم فتح المنصة في المتصفح.", "متصل 200 OK", ACCENT_GREEN)
        self.append_log(f"🌐 فتح الرابط في المتصفح: {SERVER_URL}")

        if self.root:
            def _ui_ready():
                self.progress.stop()
                self.progress.pack_forget()
                self.btn_browser.config(state=tk.NORMAL)
                self.btn_restart.config(state=tk.NORMAL)
            self.root.after(0, _ui_ready)

        # Open web browser automatically
        self.open_browser()

    def open_browser(self):
        """Launch the default browser to the web platform."""
        try:
            webbrowser.open(SERVER_URL)
        except Exception as e:
            self.append_log(f"تعذر فتح المتصفح تلقائياً: {e}")

    def restart_server(self):
        """Cleanly restart the server process."""
        self.append_log("🔄 إعادة تشغيل الخادم...")
        self.btn_browser.config(state=tk.DISABLED)
        self.btn_restart.config(state=tk.DISABLED)
        self.stop_server_process()
        time.sleep(1)
        self.progress.pack(fill=tk.X, pady=(0, 6))
        self.progress.start(12)
        self.start_server_process()

    def stop_server_process(self):
        """Terminate child node / npm processes cleanly."""
        if self.server_process:
            try:
                self.append_log("إيقاف عملية الخادم...")
                if os.name == 'nt':
                    # Windows: Kill process tree
                    subprocess.run(["taskkill", "/F", "/T", "/PID", str(self.server_process.pid)], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                else:
                    self.server_process.terminate()
            except Exception as e:
                pass
            self.server_process = None
            self.is_running = False

    def on_close(self):
        """Clean shutdown handler when the user closes the launcher."""
        self.stop_server_process()
        if self.root:
            self.root.destroy()
        sys.exit(0)

    def run_headless(self):
        """Terminal mode for environments without Tkinter display."""
        print("="*60)
        print("JMApps Stock Monitor - Headless Launcher")
        print("="*60)
        node_bin, npm_bin, node_ver = find_node_and_npm()
        if not node_bin:
            print("ERROR: Node.js is not found on your system. Please install Node.js from https://nodejs.org")
            return
        
        print(f"Node.js found: {node_bin} ({node_ver or 'OK'})")
        npm_cmd = npm_bin or ("npm.cmd" if os.name == 'nt' else "npm")

        if not is_npm_installed_check():
            print("Installing dependencies via npm install...")
            subprocess.run([npm_cmd, "install"], cwd=str(APP_DIR), check=True, shell=(os.name == 'nt'), env=os.environ.copy())
        else:
            print("Dependencies verified. Skipping npm install.")
        
        print(f"Starting server on {SERVER_URL}...")
        webbrowser.open(SERVER_URL)
        subprocess.run([npm_cmd, "run", "dev"], cwd=str(APP_DIR), shell=(os.name == 'nt'), env=os.environ.copy())


def main():
    """Main application entrypoint."""
    # Ensure working directory is set to app root
    os.chdir(str(APP_DIR))

    if HAS_TK:
        root = tk.Tk()
        app = StockMonitorApp(root)
        root.mainloop()
    else:
        app = StockMonitorApp(None)


if __name__ == "__main__":
    main()
