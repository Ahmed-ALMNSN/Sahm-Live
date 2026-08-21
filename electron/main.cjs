const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow;

// Configure persistent user data path for SQLite in desktop mode
process.env.APP_USER_DATA_PATH = app.getPath('userData');

function waitForServer(url, timeoutMs = 15000) {
  const startTime = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      http
        .get(url, (res) => {
          if (res.statusCode >= 200 && res.statusCode < 500) {
            resolve(true);
          } else {
            retry();
          }
        })
        .on('error', () => {
          retry();
        });
    };

    const retry = () => {
      if (Date.now() - startTime > timeoutMs) {
        resolve(false);
      } else {
        setTimeout(check, 300);
      }
    };

    check();
  });
}

async function startInternalServer() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (!isDev) {
    try {
      process.env.NODE_ENV = 'production';
      process.env.PORT = '3000';
      const serverFile = path.join(__dirname, '../dist/server.cjs');
      const fs = require('fs');
      if (fs.existsSync(serverFile)) {
        require(serverFile);
        console.log('[Desktop] Internal Express & SQLite server booted successfully');
      }
    } catch (err) {
      console.error('[Desktop] Error starting internal server:', err);
    }
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0a0b0d',
    title: 'JMApps Stock Monitor & Alerts',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    show: false,
    autoHideMenuBar: true,
  });

  // Handle external URLs in default system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Check if server is ready
  const serverReady = await waitForServer('http://127.0.0.1:3000/api/health', 10000);

  if (serverReady) {
    mainWindow.loadURL('http://127.0.0.1:3000');
  } else {
    // Fallback to static SPA if port 3000 isn't available
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // IPC Handlers
  ipcMain.handle('app:print', async (event, options = {}) => {
    if (!mainWindow) return { success: false, error: 'No main window' };
    return new Promise((resolve) => {
      mainWindow.webContents.print(
        {
          silent: false,
          printBackground: true,
          deviceName: options.deviceName || '',
          pageSize: 'A4',
          margins: { marginType: 'custom', top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 },
          ...options,
        },
        (success, failureReason) => {
          resolve({ success, failureReason });
        }
      );
    });
  });

  ipcMain.handle('app:save-pdf', async (event, options = {}) => {
    if (!mainWindow) return { success: false, error: 'No main window' };
    try {
      const data = await mainWindow.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
        margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 },
      });
      return { success: true, data: Buffer.from(data).toString('base64') };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.on('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('window:close', () => {
    if (mainWindow) mainWindow.close();
  });

  await startInternalServer();
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

