const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');

let store;

async function initializeStore() {
  const Store = await import('electron-store');
  store = new Store.default();
}

async function createWindow() {
  await initializeStore();

  const win = new BrowserWindow({
    width: 900,
    height: 700,
    icon: process.platform === 'darwin'
      ? path.join(__dirname, 'logo.icns')
      : path.join(__dirname, 'logo.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  // Handle external links
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // IPC handlers for store operations
  ipcMain.handle('store-get', (event, key) => {
    return store.get(key);
  });

  ipcMain.handle('store-set', (event, key, value) => {
    store.set(key, value);
    return true;
  });

  win.loadFile('index.html');

  win.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
}); 