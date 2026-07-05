# tapdot Desktop — Electron App Plan
## tapdot Tools as a Native Desktop Application

Package all 67 tapdot browser tools as a native Electron desktop app for macOS,
Windows, and Linux. The tools are already entirely client-side — Electron is a
wrapper that loads them locally with no internet required.

**App name:** tapdot Desktop
**Bundle ID:** org.tapdot.desktop
**Distribution:** GitHub Releases (free) → tapdot.org/desktop download page
**Update delivery:** electron-updater via GitHub Releases (zero infrastructure cost)

---

## Why this makes sense for tapdot

The tools already run 100% in the browser with no server calls. Electron loads the
same HTML/CSS/JS files locally — no rewrite, no new logic. What the user gains:

- Works completely offline — no browser, no internet needed, ever
- No Cloudflare analytics beacon (the one network call in the web version)
- Persistent localStorage across sessions — same as the browser but under your app's
  data directory, not the browser profile
- Native menu bar, keyboard shortcuts, system notifications
- One download, all 67 tools — no URL to remember
- Reinforces tapdot's privacy story: "not even a browser has access to your data"

---

## Tech stack decision

**Toolchain: Electron Forge + electron-builder**

Electron Forge handles the dev server and build pipeline. electron-builder handles
packaging and distribution. electron-updater handles auto-updates via GitHub Releases.

```
electron-forge   → dev server, build orchestration
electron-builder → DMG (macOS), NSIS (Windows), AppImage (Linux)
electron-updater → auto-updates from GitHub Releases
electron-vite    → fast HMR during development
```

**No framework needed.** The renderer loads your existing vanilla HTML/CSS/JS files
directly. No React, no Vue, no bundler for the tool files themselves.

---

## Code signing decision

| Platform | Unsigned | Signed | Cost |
|---|---|---|---|
| macOS | "Unidentified developer" warning, blocked by Gatekeeper | Clean install, no warnings | Apple Developer Program: $99/year |
| Windows | SmartScreen warning on first run, user can bypass | No warning | EV Code Signing cert: ~$200–400/year |
| Linux | No signing required | N/A | Free |

**Recommendation:** Get the Apple Developer Program membership ($99/year) immediately.
The "unidentified developer" warning on macOS is the worst possible first impression
for a privacy-first tool — it actively undermines trust. Windows SmartScreen is less
severe (one-click bypass) but worth fixing once you have revenue. Linux is free.

**Without signing for now:** You can ship to Linux and Windows first, with a clear
note in the macOS download: "Right-click the app and select Open on first launch."
This is acceptable for early adopters but not for a general release.

---

## Repository structure

Keep the Electron app in a separate repository from the tools:

```
tapdot-desktop/                 ← new GitHub repo: your-username/tapdot-desktop
├── package.json
├── electron-builder.yml        ← packaging config
├── forge.config.js             ← Electron Forge config
├── src/
│   ├── main.js                 ← main process (window creation, menus, updates)
│   ├── preload.js              ← preload script (IPC bridge)
│   └── renderer/
│       └── index.html          ← app shell (loads tool navigation)
├── tools/                      ← symlink or git submodule to tapdot-tools repo
│   ├── shared/
│   ├── dev/
│   ├── study/
│   ├── write/
│   ├── marketing/
│   ├── finance/
│   ├── legal/
│   ├── hr/
│   ├── health/
│   ├── design/
│   └── productivity/
├── assets/
│   ├── icon.png                ← 512×512 app icon
│   ├── icon.icns               ← macOS icon (convert from PNG)
│   └── icon.ico                ← Windows icon (convert from PNG)
└── .github/
    └── workflows/
        └── release.yml         ← GitHub Actions: build + publish on tag push
```

**Tools as a git submodule:**
```bash
git submodule add https://github.com/YOUR_USERNAME/tapdot-tools tools
```

This means when you update tools.tapdot.org, you update the submodule reference in
tapdot-desktop and the desktop app gets the new tools on next build. One source of
truth for both web and desktop.

---

## Step 1 — package.json

```json
{
  "name": "tapdot-desktop",
  "productName": "tapdot",
  "version": "1.0.0",
  "description": "Privacy-first browser tools — now as a native desktop app",
  "main": "src/main.js",
  "author": {
    "name": "Mohan Venkatakrishnan",
    "email": "rkmohanchn@gmail.com"
  },
  "license": "MIT",
  "scripts": {
    "start":   "electron-forge start",
    "build":   "electron-forge make",
    "publish": "electron-forge publish",
    "dev":     "electron-vite dev",
    "dist":    "electron-builder --mac --win --linux"
  },
  "devDependencies": {
    "electron":              "^34.0.0",
    "electron-builder":      "^26.0.0",
    "@electron-forge/cli":   "^7.0.0",
    "@electron-forge/plugin-vite": "^7.0.0",
    "electron-vite":         "^3.0.0"
  },
  "dependencies": {
    "electron-updater": "^6.0.0",
    "electron-log":     "^5.0.0"
  },
  "build": {
    "appId":       "org.tapdot.desktop",
    "productName": "tapdot",
    "copyright":   "Copyright © 2026 Mohan Venkatakrishnan",
    "files": [
      "src/**/*",
      "tools/**/*",
      "assets/**/*",
      "!tools/.git",
      "!tools/**/.DS_Store",
      "!**/node_modules/**"
    ],
    "directories": {
      "buildResources": "assets",
      "output":         "dist"
    },
    "mac": {
      "target":       [{ "target": "dmg", "arch": ["x64", "arm64"] }],
      "icon":         "assets/icon.icns",
      "category":     "public.app-category.productivity",
      "darkModeSupport": true,
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements":            "assets/entitlements.mac.plist",
      "entitlementsInherit":     "assets/entitlements.mac.plist"
    },
    "win": {
      "target":  [{ "target": "nsis", "arch": ["x64"] }],
      "icon":    "assets/icon.ico"
    },
    "linux": {
      "target":   ["AppImage", "deb"],
      "icon":     "assets/icon.png",
      "category": "Utility"
    },
    "dmg": {
      "title":     "tapdot ${version}",
      "background": "assets/dmg-background.png",
      "window":    { "width": 540, "height": 380 }
    },
    "nsis": {
      "oneClick":             false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    },
    "publish": [{
      "provider": "github",
      "owner":    "YOUR_GITHUB_USERNAME",
      "repo":     "tapdot-desktop"
    }]
  }
}
```

---

## Step 2 — main.js (main process)

```javascript
// src/main.js

const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const log             = require('electron-log');
const path            = require('path');

// Configure logging
log.transports.file.level = 'info';
autoUpdater.logger        = log;

const isDev = !app.isPackaged;

// ── Window creation ──────────────────────────────────────────────────────────

function createWindow() {
  const win = new BrowserWindow({
    width:  1200,
    height: 800,
    minWidth:  800,
    minHeight: 600,
    title:     'tapdot',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#ffffff',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      // Allow local file access for tool HTML files
      webSecurity:      false, // Required to load local tool files
      allowRunningInsecureContent: false,
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    show: false, // Show after ready-to-show to avoid flash
  });

  // Load the app shell
  if (isDev) {
    win.loadFile(path.join(__dirname, 'renderer/index.html'));
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, 'renderer/index.html'));
  }

  // Show window once ready
  win.once('ready-to-show', () => {
    win.show();
  });

  // Open external links in the default browser, not in the app
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  return win;
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  const win = createWindow();
  buildMenu(win);

  // Check for updates silently on start (not in dev)
  if (!isDev) {
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 3000); // Delay 3s to not interrupt startup
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── Auto updater events ───────────────────────────────────────────────────────

autoUpdater.on('update-available', (info) => {
  log.info('Update available:', info.version);
  // Notify the renderer
  BrowserWindow.getAllWindows()[0]?.webContents.send('update-available', info.version);
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded:', info.version);
  const result = dialog.showMessageBoxSync({
    type:      'info',
    title:     'Update ready',
    message:   `tapdot ${info.version} is ready to install.`,
    detail:    'Restart tapdot to apply the update.',
    buttons:   ['Restart now', 'Later'],
    defaultId: 0,
  });
  if (result === 0) autoUpdater.quitAndInstall();
});

autoUpdater.on('error', (err) => {
  log.error('Update error:', err.message);
});

// ── IPC handlers ──────────────────────────────────────────────────────────────

// Renderer can request the tools root path to load tool HTML files
ipcMain.handle('get-tools-path', () => {
  return isDev
    ? path.join(__dirname, '../../tools')
    : path.join(process.resourcesPath, 'tools');
});

ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('open-external', (_, url) => shell.openExternal(url));

// ── Menu ──────────────────────────────────────────────────────────────────────

function buildMenu(win) {
  const isMac = process.platform === 'darwin';

  const template = [
    // macOS app menu
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ]
    }] : []),

    // File
    {
      label: 'File',
      submenu: [
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },

    // View
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        {
          label: 'Toggle Dark Mode',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => {
            win.webContents.send('toggle-dark-mode');
          }
        },
        ...(isDev ? [
          { type: 'separator' },
          { role: 'toggleDevTools' }
        ] : []),
      ]
    },

    // Tools — quick access to each collection
    {
      label: 'Tools',
      submenu: [
        { label: 'All Tools',    accelerator: 'CmdOrCtrl+1', click: () => win.webContents.send('navigate', '/') },
        { type: 'separator' },
        { label: 'Dev Tools',    accelerator: 'CmdOrCtrl+2', click: () => win.webContents.send('navigate', '/dev') },
        { label: 'Study Tools',  accelerator: 'CmdOrCtrl+3', click: () => win.webContents.send('navigate', '/study') },
        { label: 'Write Tools',  accelerator: 'CmdOrCtrl+4', click: () => win.webContents.send('navigate', '/write') },
        { label: 'Marketing',    accelerator: 'CmdOrCtrl+5', click: () => win.webContents.send('navigate', '/marketing') },
        { label: 'Finance',      accelerator: 'CmdOrCtrl+6', click: () => win.webContents.send('navigate', '/finance') },
        { label: 'Legal',        accelerator: 'CmdOrCtrl+7', click: () => win.webContents.send('navigate', '/legal') },
        { label: 'HR',           accelerator: 'CmdOrCtrl+8', click: () => win.webContents.send('navigate', '/hr') },
        { label: 'Health',       accelerator: 'CmdOrCtrl+9', click: () => win.webContents.send('navigate', '/health') },
        { label: 'Design',       click: () => win.webContents.send('navigate', '/design') },
        { label: 'Productivity', click: () => win.webContents.send('navigate', '/productivity') },
      ]
    },

    // Window
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
        ] : [{ role: 'close' }]),
      ]
    },

    // Help
    {
      role: 'help',
      submenu: [
        {
          label: 'Visit tapdot.org',
          click: () => shell.openExternal('https://tapdot.org'),
        },
        {
          label: 'Privacy Policy',
          click: () => shell.openExternal('https://tools.tapdot.org/privacy.html'),
        },
        { type: 'separator' },
        {
          label: 'Check for Updates',
          click: () => {
            if (!isDev) autoUpdater.checkForUpdatesAndNotify();
          }
        },
        { type: 'separator' },
        {
          label: `Version ${app.getVersion()}`,
          enabled: false,
        },
      ]
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
```

---

## Step 3 — preload.js

```javascript
// src/preload.js
// Exposes a minimal, safe API to the renderer via contextBridge

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tapdotDesktop', {
  // Get the local tools directory path
  getToolsPath: () => ipcRenderer.invoke('get-tools-path'),

  // Get app version
  getVersion: () => ipcRenderer.invoke('get-app-version'),

  // Open a URL in the system browser
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Listen for main process events
  onNavigate:      (cb) => ipcRenderer.on('navigate',         (_, path) => cb(path)),
  onToggleDark:    (cb) => ipcRenderer.on('toggle-dark-mode', ()       => cb()),
  onUpdateAvailable: (cb) => ipcRenderer.on('update-available', (_, v)  => cb(v)),

  // Platform info
  platform: process.platform,
  isDev:    !require('electron').app?.isPackaged,
});
```

---

## Step 4 — renderer/index.html (app shell)

The app shell is a navigation wrapper that loads individual tool HTML files in an
iframe. The left sidebar lists all collections and tools. Clicking a tool loads its
HTML file into the content iframe.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>tapdot</title>
  <!-- CSP: allow local file loading, block all external network in tools -->
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'self' file:; script-src 'self' 'unsafe-inline' file:;
             style-src 'self' 'unsafe-inline' file: https://fonts.googleapis.com;
             font-src 'self' file: https://fonts.gstatic.com;
             img-src 'self' file: data:;
             connect-src 'self' file: https://open.er-api.com
               https://static.cloudflareinsights.com;" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --sidebar-width: 220px;
      --accent: #5B6CF0;
      --bg: #fff;
      --surface: #F8F8FB;
      --border: #E5E5F0;
      --text: #0F0F1A;
      --muted: #6B6B80;
    }
    [data-theme="dark"] {
      --bg: #0F0F1A;
      --surface: #16161F;
      --border: #2A2A3A;
      --text: #F0F0F8;
      --muted: #9090A8;
    }
    body {
      display: flex;
      height: 100vh;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif;
      font-size: 13px;
      background: var(--bg);
      color: var(--text);
    }

    /* ── macOS traffic light spacing ────────────────────────────── */
    .sidebar {
      width: var(--sidebar-width);
      min-width: var(--sidebar-width);
      background: var(--surface);
      border-right: 0.5px solid var(--border);
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      padding-top: env(titlebar-area-height, 32px); /* macOS inset title bar */
      -webkit-app-region: drag; /* drag window by sidebar */
    }

    .sidebar-item {
      -webkit-app-region: no-drag;
    }

    .sidebar-logo {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 14px;
      font-weight: 600;
      font-size: 14px;
      color: var(--text);
      border-bottom: 0.5px solid var(--border);
      margin-bottom: 6px;
    }

    .sidebar-logo img {
      width: 20px;
      height: 20px;
      border-radius: 5px;
    }

    .collection-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted);
      padding: 10px 14px 4px;
      sidebar-item: true;
    }

    .tool-link {
      display: block;
      padding: 6px 14px;
      color: var(--muted);
      text-decoration: none;
      border-radius: 6px;
      margin: 1px 6px;
      cursor: pointer;
      transition: background 0.1s, color 0.1s;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      -webkit-app-region: no-drag;
    }

    .tool-link:hover { background: var(--border); color: var(--text); }
    .tool-link.active {
      background: rgba(91, 108, 240, 0.12);
      color: var(--accent);
      font-weight: 500;
    }

    .collection-section {
      margin-bottom: 4px;
    }

    /* ── Content area ──────────────────────────────────────────── */
    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .content-toolbar {
      height: 36px;
      background: var(--bg);
      border-bottom: 0.5px solid var(--border);
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 14px;
      -webkit-app-region: drag;
      flex-shrink: 0;
    }

    .nav-btn {
      -webkit-app-region: no-drag;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--muted);
      padding: 4px 6px;
      border-radius: 4px;
      font-size: 14px;
    }
    .nav-btn:hover { background: var(--surface); color: var(--text); }
    .nav-btn:disabled { opacity: 0.3; cursor: default; }

    .toolbar-title {
      font-size: 12px;
      color: var(--muted);
      flex: 1;
      text-align: center;
      -webkit-app-region: drag;
      user-select: none;
    }

    .update-banner {
      -webkit-app-region: no-drag;
      background: var(--accent);
      color: white;
      font-size: 12px;
      padding: 6px 14px;
      text-align: center;
      cursor: pointer;
      flex-shrink: 0;
      display: none;
    }
    .update-banner.visible { display: block; }

    #tool-frame {
      flex: 1;
      border: none;
      width: 100%;
      background: var(--bg);
    }
  </style>
</head>
<body data-theme="light">

<nav class="sidebar" id="sidebar">
  <div class="sidebar-logo sidebar-item">
    <img src="../assets/icon.png" alt="tapdot" />
    tapdot
  </div>

  <!-- Collections and tools populated by JS -->
</nav>

<div class="content">
  <div class="content-toolbar">
    <button class="nav-btn" id="btn-back"    title="Back"    disabled>←</button>
    <button class="nav-btn" id="btn-forward" title="Forward" disabled>→</button>
    <span class="toolbar-title" id="toolbar-title">tapdot Desktop</span>
    <button class="nav-btn" id="btn-dark" title="Toggle dark mode">◑</button>
  </div>

  <div class="update-banner" id="update-banner">
    A new version of tapdot is available — restart to update
  </div>

  <iframe
    id="tool-frame"
    sandbox="allow-scripts allow-same-origin allow-forms allow-modals
             allow-downloads allow-popups"
    title="Tool content"
  ></iframe>
</div>

<script>
// ── Tool catalogue ───────────────────────────────────────────────────────────

const COLLECTIONS = [
  {
    id: 'dev', label: 'Dev', tools: [
      { id: 'json',        label: 'JSONLab' },
      { id: 'jsonconvert', label: 'JSONConvert' },
      { id: 'jwt',         label: 'JWTRead' },
      { id: 'yaml',        label: 'YAMLCheck' },
      { id: 'csv',         label: 'CSVExplore' },
      { id: 'markdown',    label: 'MarkdownLive' },
      { id: 'html',        label: 'HTMLPreview' },
      { id: 'sql',         label: 'SQLFormat' },
      { id: 'contrast',    label: 'ColourContrast' },
      { id: 'uuid',        label: 'UUIDGen' },
      { id: 'timezone',    label: 'TimezoneNow' },
      { id: 'regex',       label: 'RegexLab' },
      { id: 'cron',        label: 'CronLab' },
    ]
  },
  {
    id: 'study', label: 'Study', tools: [
      { id: 'cite',        label: 'CiteMaker' },
      { id: 'flashcards',  label: 'FlashForge' },
      { id: 'grades',      label: 'GradeCalc' },
      { id: 'bias',        label: 'BiasCheck' },
    ]
  },
  {
    id: 'write', label: 'Write', tools: [
      { id: 'readscore',   label: 'ReadScore' },
      { id: 'wordcount',   label: 'WordCount Pro' },
      { id: 'lorem',       label: 'LoremCraft' },
      { id: 'thread',      label: 'ThreadCraft' },
    ]
  },
  {
    id: 'marketing', label: 'Marketing', tools: [
      { id: 'utm',         label: 'UTMBuilder' },
      { id: 'headline',    label: 'HeadlineScore' },
      { id: 'emailsubject',label: 'EmailSubjectTester' },
      { id: 'adcopy',      label: 'AdCopyWriter' },
      { id: 'calendar',    label: 'SocialCalendar' },
      { id: 'persona',     label: 'PersonaBuilder' },
      { id: 'competitor',  label: 'CompetitorMatrix' },
      { id: 'roi',         label: 'ROICalculator' },
    ]
  },
  {
    id: 'finance', label: 'Finance', tools: [
      { id: 'compound',    label: 'CompoundCalc' },
      { id: 'budget',      label: 'BudgetPlanner' },
      { id: 'mortgage',    label: 'MortgageCalc' },
      { id: 'investments', label: 'InvestmentTracker' },
      { id: 'tax',         label: 'TaxEstimate' },
      { id: 'currency',    label: 'CurrencyConvert' },
      { id: 'equity',      label: 'EquityCalc' },
      { id: 'networth',    label: 'NetWorthTracker' },
    ]
  },
  {
    id: 'legal', label: 'Legal', tools: [
      { id: 'contract',       label: 'ContractRead' },
      { id: 'nda',            label: 'NDAGenerator' },
      { id: 'privacy-policy', label: 'PrivacyPolicyGen' },
      { id: 'terms',          label: 'TermsBuilder' },
      { id: 'copyright',      label: 'CopyrightChecker' },
      { id: 'glossary',       label: 'LegalGlossary' },
    ]
  },
  {
    id: 'hr', label: 'HR', tools: [
      { id: 'salary',      label: 'SalaryBand' },
      { id: 'jd',          label: 'JobDescriptionWriter' },
      { id: 'interview',   label: 'InterviewKit' },
      { id: 'offer',       label: 'OfferLetterBuilder' },
      { id: 'onboarding',  label: 'OnboardingChecklist' },
      { id: 'leave',       label: 'LeaveCalculator' },
    ]
  },
  {
    id: 'health', label: 'Health', tools: [
      { id: 'bmi',         label: 'BMICalc' },
      { id: 'medication',  label: 'MedicationLog' },
      { id: 'symptoms',    label: 'SymptomDiary' },
      { id: 'cycle',       label: 'CycleTracker' },
      { id: 'water',       label: 'WaterIntake' },
      { id: 'sleep',       label: 'SleepLog' },
    ]
  },
  {
    id: 'design', label: 'Design', tools: [
      { id: 'palette',     label: 'PaletteForge' },
      { id: 'typography',  label: 'TypographyScale' },
      { id: 'icons',       label: 'IconExplorer' },
      { id: 'shadows',     label: 'ShadowStudio' },
      { id: 'spacing',     label: 'SpacingCalc' },
      { id: 'gradient',    label: 'GradientMaker' },
    ]
  },
  {
    id: 'productivity', label: 'Productivity', tools: [
      { id: 'focus',          label: 'FocusTimer' },
      { id: 'note',           label: 'QuickNote' },
      { id: 'decision',       label: 'DecisionMatrix' },
      { id: 'meeting-timer',  label: 'MeetingTimer' },
      { id: 'habits',         label: 'HabitTracker' },
      { id: 'reading',        label: 'ReadingList' },
    ]
  },
];

// ── State ─────────────────────────────────────────────────────────────────────

let toolsPath    = '';
let currentTool  = null;
let isDark       = localStorage.getItem('tapdot-theme') === 'dark';

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  // Get tools path from main process
  if (window.tapdotDesktop) {
    toolsPath = await window.tapdotDesktop.getToolsPath();
  }

  // Apply stored theme
  if (isDark) document.body.setAttribute('data-theme', 'dark');

  // Build sidebar
  buildSidebar();

  // Load hub by default
  loadHub();

  // Listen for main process navigation events (menu bar shortcuts)
  window.tapdotDesktop?.onNavigate((path) => {
    if (path === '/') { loadHub(); return; }
    const collectionId = path.slice(1);
    const collection   = COLLECTIONS.find(c => c.id === collectionId);
    if (collection) loadCollection(collection);
  });

  // Listen for dark mode toggle from menu
  window.tapdotDesktop?.onToggleDark(toggleDark);

  // Listen for update available
  window.tapdotDesktop?.onUpdateAvailable((version) => {
    const banner = document.getElementById('update-banner');
    banner.textContent = `tapdot ${version} is ready — restart to update`;
    banner.classList.add('visible');
  });

  // Toolbar buttons
  document.getElementById('btn-dark').addEventListener('click', toggleDark);

  const frame = document.getElementById('tool-frame');
  document.getElementById('btn-back').addEventListener('click', () => frame.contentWindow?.history.back());
  document.getElementById('btn-forward').addEventListener('click', () => frame.contentWindow?.history.forward());
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

function buildSidebar() {
  const sidebar = document.getElementById('sidebar');

  // Add home link
  const homeLink = document.createElement('a');
  homeLink.className = 'tool-link sidebar-item';
  homeLink.textContent = '⌂ All Tools';
  homeLink.style.marginTop = '6px';
  homeLink.addEventListener('click', loadHub);
  sidebar.appendChild(homeLink);

  // Add each collection
  for (const collection of COLLECTIONS) {
    const section = document.createElement('div');
    section.className = 'collection-section';

    const label = document.createElement('div');
    label.className = 'collection-label sidebar-item';
    label.textContent = collection.label;
    section.appendChild(label);

    for (const tool of collection.tools) {
      const link = document.createElement('a');
      link.className    = 'tool-link sidebar-item';
      link.textContent  = tool.label;
      link.dataset.collection = collection.id;
      link.dataset.tool       = tool.id;
      link.addEventListener('click', () => loadTool(collection.id, tool.id, tool.label));
      section.appendChild(link);
    }

    sidebar.appendChild(section);
  }
}

// ── Navigation ─────────────────────────────────────────────────────────────────

function loadHub() {
  const frame = document.getElementById('tool-frame');
  frame.src   = `file://${toolsPath}/index.html`;
  setActive(null, null);
  document.getElementById('toolbar-title').textContent = 'tapdot Desktop';
}

function loadCollection(collection) {
  const frame = document.getElementById('tool-frame');
  frame.src   = `file://${toolsPath}/${collection.id}/index.html`;
  setActive(collection.id, null);
  document.getElementById('toolbar-title').textContent = collection.label;
}

function loadTool(collectionId, toolId, toolLabel) {
  const frame = document.getElementById('tool-frame');
  frame.src   = `file://${toolsPath}/${collectionId}/${toolId}/index.html`;
  setActive(collectionId, toolId);
  document.getElementById('toolbar-title').textContent = toolLabel;
}

function setActive(collectionId, toolId) {
  document.querySelectorAll('.tool-link').forEach(link => {
    link.classList.remove('active');
    if (link.dataset.collection === collectionId && link.dataset.tool === toolId) {
      link.classList.add('active');
    }
  });
}

// ── Dark mode ─────────────────────────────────────────────────────────────────

function toggleDark() {
  isDark = !isDark;
  document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
  localStorage.setItem('tapdot-theme', isDark ? 'dark' : 'light');
  // Also pass the theme to the iframe content
  const frame = document.getElementById('tool-frame');
  frame.contentDocument?.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

init();
</script>
</body>
</html>
```

---

## Step 5 — GitHub Actions: automated build + release

On every git tag push (e.g. `v1.0.1`), GitHub Actions builds the app for all three
platforms and publishes to GitHub Releases. electron-updater then delivers the update
to all installed apps automatically.

```yaml
# .github/workflows/release.yml

name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]

    runs-on: ${{ matrix.os }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: recursive   # Pull in tapdot-tools submodule

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build and publish (macOS)
        if: matrix.os == 'macos-latest'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # Code signing (add these secrets when you have the certificate)
          # CSC_LINK:            ${{ secrets.MAC_CERTIFICATE }}
          # CSC_KEY_PASSWORD:    ${{ secrets.MAC_CERTIFICATE_PASSWORD }}
          # APPLE_ID:            ${{ secrets.APPLE_ID }}
          # APPLE_ID_PASSWORD:   ${{ secrets.APPLE_ID_PASSWORD }}
          # APPLE_TEAM_ID:       ${{ secrets.APPLE_TEAM_ID }}
        run: npm run dist -- --mac

      - name: Build and publish (Windows)
        if: matrix.os == 'windows-latest'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npm run dist -- --win

      - name: Build and publish (Linux)
        if: matrix.os == 'ubuntu-latest'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npm run dist -- --linux

      - name: Upload artifacts
        uses: softprops/action-gh-release@v2
        if: startsWith(github.ref, 'refs/tags/')
        with:
          files: |
            dist/*.dmg
            dist/*.exe
            dist/*.AppImage
            dist/*.deb
            dist/latest*.yml
          draft: false
          prerelease: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**To publish a new release:**
```bash
npm version patch          # bumps version, creates git tag
git push origin main --tags  # triggers GitHub Actions
```

GitHub Actions builds for all 3 platforms in parallel, typically taking 8–12 minutes.

---

## Step 6 — Local development

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/tapdot-desktop.git
cd tapdot-desktop

# Pull the tools submodule
git submodule update --init --recursive

# Install dependencies
npm install

# Run in development
npm start
# or
npm run dev   # with electron-vite for HMR
```

---

## Step 7 — Download page on tapdot.org

Add a `/desktop` page to tapdot.org:

```
tapdot Desktop

All 67 tapdot tools — as a native app.
Works completely offline. No browser needed.

[Download for macOS]   .dmg  →  Apple Silicon + Intel universal
[Download for Windows] .exe  →  Windows 10/11, 64-bit
[Download for Linux]   .AppImage → All major distros

Version 1.0.0 · Released July 2026
Auto-updates silently in the background.

macOS note: If you see "unidentified developer" on first launch,
right-click the app and select Open. This is a one-time step.
We're working on full code signing.
```

Link to this page from:
- tapdot.org header nav
- tools.tapdot.org footer ("Download the desktop app")
- Each tool's footer

---

## Important differences between web and desktop versions

### What changes in the desktop app

**No Cloudflare Analytics beacon** — the desktop app has no analytics at all.
This is intentional and a feature. The web version tracks page visits
(anonymously) for product decisions. The desktop version doesn't even do that.
Add a note on the download page: "The desktop app is 100% analytics-free."

**localStorage is per-app, not per-browser** — data saved to localStorage in the
desktop app lives in the Electron app's data directory, not in the user's browser
profile. This means FlashForge cards, SocialCalendar posts, QuickNote content,
and CycleTracker data are separate from the browser version.

If you want data to sync between the web and desktop versions, the only
privacy-first approach is a local file export/import — no cloud sync.

**Chrome built-in AI APIs are NOT available** — the Prompt API, Summarizer API,
Writer API, and Rewriter API are Chrome-specific. They don't exist in Electron's
Chromium renderer. Tools that depend on these (BiasCheck, HeadlineScore, CronLab
natural language, ContractRead, etc.) will hit their fallback paths.

This is the most significant limitation. The options are:

| Option | Complexity | Cost |
|---|---|---|
| Show "AI features not available in desktop" message | Low | Free |
| Bundle WebLLM with a small model (~600MB) | High | Free |
| Ship without AI tools, add them post-v1 | Low | Free |

**Recommendation for v1:** Ship with a clear message on AI-dependent tools —
"This feature uses Chrome's on-device AI, which is only available in the browser
version." Keep the fallback functionality. This is honest and ships faster.
Post-v1, explore bundling WebLLM for the desktop.

**No CORS restrictions** — in the desktop app, local files can fetch other local
files freely. The CurrencyConvert tool's exchange rate fetch still works because
the CSP allows `connect-src` to `open.er-api.com`.

### What stays identical

Every other tool works exactly the same. All the pure-JS tools (GradeCalc, UTMBuilder,
MortgageCalc, RegexLab, CronLab parser, etc.) run identically. Dark mode persists.
localStorage data persists. The full tapdot design system renders correctly.

---

## Entitlements for macOS (when code signing)

Create `assets/entitlements.mac.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
  <key>com.apple.security.network.client</key>
  <true/>
</dict>
</plist>
```

---

## Build sizes (approximate)

| Platform | Format | Size |
|---|---|---|
| macOS | .dmg (universal x64 + arm64) | ~180–220 MB |
| Windows | .exe (NSIS installer) | ~150–180 MB |
| Linux | .AppImage | ~160–190 MB |

Electron bundles Chromium (~130MB) in every build — unavoidable. The tools
themselves add ~5–10MB. This is typical for Electron apps and users expect it.

---

## Claude Code build instructions

Hand this document to Claude Code and instruct it to:

1. Create the `tapdot-desktop` repo structure as above
2. Set up the git submodule for `tools/` pointing to `tapdot-tools` repo
3. Write `package.json` with all dependencies and build config
4. Write `src/main.js` — window creation, menu, auto-updater
5. Write `src/preload.js` — contextBridge API
6. Write `src/renderer/index.html` — full sidebar + iframe shell
7. Write `.github/workflows/release.yml` — GitHub Actions build pipeline
8. Test locally: `npm install && npm start`
9. Verify all tools load correctly via `file://` protocol
10. Verify dark mode toggle works across the iframe boundary
11. Verify localStorage persists after app restart

---

## Launch checklist

- [ ] `npm start` opens the app without errors
- [ ] All 10 collection hubs load from sidebar
- [ ] Individual tools load correctly via sidebar links
- [ ] Dark mode applies to sidebar and iframe content simultaneously
- [ ] localStorage data persists after closing and reopening the app
- [ ] Menu bar shortcuts (Cmd+1 through Cmd+9) navigate to correct collections
- [ ] "Help → Check for Updates" works in production build
- [ ] GitHub Actions release workflow triggers on tag push
- [ ] DMG, EXE, and AppImage appear in GitHub Releases after CI completes
- [ ] AI-dependent tools show graceful "not available in desktop" message
- [ ] CurrencyConvert rate fetch works (network allowed in CSP)
- [ ] External links open in system browser, not in app
- [ ] Download page live at tapdot.org/desktop
- [ ] Footer on each tool at tools.tapdot.org links to desktop download
