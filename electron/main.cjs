// Desktop shell: loads the built app from a private, secure origin so the
// browser storage it relies on (IndexedDB, localStorage) works like it does
// in a browser, and keeps the window on the app's own pages.
const { app, BrowserWindow, Menu, protocol, net, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

// Portable Mode: If running portably and a 'data' directory exists next to the executable,
// or if running the portable binary, isolate user storage inside that local folder
try {
  const exeDir = path.dirname(process.execPath);
  const exeName = path.basename(process.execPath).toLowerCase();
  const portableData = path.join(exeDir, 'data');
  if (fs.existsSync(portableData) || exeName.includes('portable')) {
    if (!fs.existsSync(portableData)) {
      try { fs.mkdirSync(portableData, { recursive: true }); } catch {}
    }
    if (fs.existsSync(portableData)) {
      app.setPath('userData', portableData);
    }
  }
} catch {}

const ROOT = path.join(__dirname, '..', 'dist');
const ORIGIN = 'app://writedoc';

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

function insideRoot(pathname) {
  const clean = pathname.replace(/^\/+/, '');
  const file = path.join(ROOT, decodeURIComponent(clean));
  const relative = path.relative(ROOT, file);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative) ? file : (clean === '' ? path.join(ROOT, 'index.html') : null);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1300,
    height: 900,
    minWidth: 720,
    minHeight: 520,
    backgroundColor: '#ffffff',
    title: 'WriteDoc - Word Processor & DOCX Editor',
    icon: path.join(__dirname, '..', 'icon.png'),
    autoHideMenuBar: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(ORIGIN)) {
      event.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url);
    }
  });

  win.loadURL(`${ORIGIN}/index.html`);

  if (process.env.WRITEDOC_SMOKE === '1') {
    win.webContents.once('did-finish-load', async () => {
      try {
        const state = await win.webContents.executeJavaScript(
          "JSON.stringify({ app: !!document.querySelector('#app'), nodes: document.querySelector('#app').children.length, text: document.body.innerText.replace(/\\s+/g, ' ').slice(0, 120), hash: location.hash })",
        );
        console.log('SMOKE', state);
      } catch (error) {
        console.log('SMOKE-ERROR', error?.message);
      }
      setTimeout(() => app.quit(), 1500);
    });
  }

  return win;
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    protocol.handle('app', (request) => {
      const url = new URL(request.url);
      const file = insideRoot(url.pathname === '/' ? '/index.html' : url.pathname);
      if (!file) return new Response('Not found', { status: 404 });
      return net.fetch(pathToFileURL(file).toString());
    });

    const isMac = process.platform === 'darwin';
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {
        label: 'File',
        submenu: [
          {
            label: 'New Document',
            accelerator: 'CmdOrCtrl+N',
            click: (item, win) => { if (win) win.webContents.executeJavaScript('location.hash = "#new"'); }
          },
          {
            label: 'Home',
            accelerator: 'CmdOrCtrl+H',
            click: (item, win) => { if (win) win.webContents.executeJavaScript('location.hash = "#home"'); }
          },
          { type: 'separator' },
          {
            label: 'Print',
            accelerator: 'CmdOrCtrl+P',
            click: (item, win) => { if (win) win.webContents.print(); }
          },
          { type: 'separator' },
          isMac ? { role: 'close' } : { role: 'quit' }
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' },
        ],
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'WriteDoc on GitHub',
            click: () => shell.openExternal('https://github.com/salim-studio/writedoc')
          },
          {
            label: 'Releases & Updates',
            click: () => shell.openExternal('https://github.com/salim-studio/writedoc/releases')
          }
        ]
      }
    ]));

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
