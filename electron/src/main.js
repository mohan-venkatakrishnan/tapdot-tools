// tapdot Desktop — main process
// Loads the same HTML/CSS/JS tool files that run at tools.tapdot.org, entirely
// from local disk. No server, no build step for the tools themselves.

const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path');

log.transports.file.level = 'info';
autoUpdater.logger = log;

const isDev = !app.isPackaged;

function getToolsPath() {
  return isDev
    ? path.join(__dirname, '..', 'tools')
    : path.join(process.resourcesPath, 'tools');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'tapdot',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Chromium blocks fetch() from file:// origins to https:// endpoints by
      // default (CORS treats file:// as opaque). CurrencyConvert's daily rate
      // fetch needs this relaxed; every other tool never calls fetch() at all.
      // The renderer's own CSP (see renderer/index.html) still whitelists only
      // the two hosts the site itself ever calls, so this isn't opening the
      // app up to arbitrary network access.
      webSecurity: false,
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    show: false,
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  if (isDev) win.webContents.openDevTools({ mode: 'detach' });

  win.once('ready-to-show', () => win.show());

  // Open real external links (tapdot.org, GitHub, etc.) in the system browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  return win;
}

app.whenReady().then(() => {
  const win = createWindow();
  buildMenu(win);

  if (!isDev) {
    setTimeout(() => autoUpdater.checkForUpdatesAndNotify(), 3000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── Auto-updater ──────────────────────────────────────────────────────────

autoUpdater.on('update-available', (info) => {
  log.info('Update available:', info.version);
  BrowserWindow.getAllWindows()[0]?.webContents.send('update-available', info.version);
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded:', info.version);
  const result = dialog.showMessageBoxSync({
    type: 'info',
    title: 'Update ready',
    message: `tapdot ${info.version} is ready to install.`,
    detail: 'Restart tapdot to apply the update.',
    buttons: ['Restart now', 'Later'],
    defaultId: 0,
  });
  if (result === 0) autoUpdater.quitAndInstall();
});

autoUpdater.on('error', (err) => log.error('Update error:', err.message));

// ── IPC ───────────────────────────────────────────────────────────────────

ipcMain.handle('get-tools-path', () => getToolsPath());
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('open-external', (_, url) => shell.openExternal(url));

// ── Menu ──────────────────────────────────────────────────────────────────

function buildMenu(win) {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' }, { type: 'separator' },
        { role: 'services' }, { type: 'separator' },
        { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
        { type: 'separator' }, { role: 'quit' },
      ],
    }] : []),
    {
      label: 'File',
      submenu: [isMac ? { role: 'close' } : { role: 'quit' }],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' }, { role: 'forceReload' }, { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' },
        { role: 'togglefullscreen' }, { type: 'separator' },
        {
          label: 'Toggle Dark Mode',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => win.webContents.send('toggle-dark-mode'),
        },
        ...(isDev ? [{ type: 'separator' }, { role: 'toggleDevTools' }] : []),
      ],
    },
    {
      label: 'Tools',
      submenu: [
        { label: 'All Tools', accelerator: 'CmdOrCtrl+1', click: () => win.webContents.send('navigate', '') },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' }, { role: 'zoom' },
        ...(isMac ? [{ type: 'separator' }, { role: 'front' }] : [{ role: 'close' }]),
      ],
    },
    {
      role: 'help',
      submenu: [
        { label: 'Visit tapdot.org', click: () => shell.openExternal('https://tapdot.org') },
        { label: 'Privacy Policy', click: () => shell.openExternal('https://tools.tapdot.org/privacy.html') },
        { label: 'View Source on GitHub', click: () => shell.openExternal('https://github.com/mohan-venkatakrishnan/tapdot-tools') },
        { type: 'separator' },
        { label: 'Check for Updates', click: () => { if (!isDev) autoUpdater.checkForUpdatesAndNotify(); } },
        { type: 'separator' },
        { label: `Version ${app.getVersion()}`, enabled: false },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
