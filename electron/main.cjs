// Desktop shell: loads the built app from a private, secure origin so the
// browser storage it relies on (IndexedDB, localStorage) works like it does
// in a browser, and keeps the window on the app's own pages.
const { app, BrowserWindow, Menu, protocol, net, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..', 'dist');
const ORIGIN = 'app://writedoc';

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

function insideRoot(pathname) {
  const file = path.join(ROOT, decodeURIComponent(pathname));
  const relative = path.relative(ROOT, file);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative) ? file : null;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 720,
    minHeight: 520,
    backgroundColor: '#ffffff',
    icon: path.join(__dirname, '..', 'icon.png'),
    autoHideMenuBar: true,
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
          "JSON.stringify({ app: !!document.querySelector('#app'), nodes: document.querySelector('#app').children.length, text: document.body.innerText.replace(/s+/g, ' ').slice(0, 120), hash: location.hash })",
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

    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {
        label: 'File',
        submenu: [{ role: 'quit' }],
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
          { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
        ],
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' },
          { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
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
