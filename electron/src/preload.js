// tapdot Desktop — preload script. Exposes a minimal, safe API to the
// renderer via contextBridge; the renderer never gets direct Node access.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tapdotDesktop', {
  getToolsPath: () => ipcRenderer.invoke('get-tools-path'),
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  onNavigate: (cb) => ipcRenderer.on('navigate', (_, path) => cb(path)),
  onToggleDark: (cb) => ipcRenderer.on('toggle-dark-mode', () => cb()),
  onUpdateAvailable: (cb) => ipcRenderer.on('update-available', (_, v) => cb(v)),

  platform: process.platform,
});
