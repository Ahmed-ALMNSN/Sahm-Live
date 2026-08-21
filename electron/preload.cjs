const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  isElectron: true,
  platform: process.platform,
  version: process.versions.electron,
  printCurrentPage: (options) => ipcRenderer.invoke('app:print', options),
  savePdf: (options) => ipcRenderer.invoke('app:save-pdf', options),
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
});
