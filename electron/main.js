// Minimal Electron shell: loads the same index.html as the web version.
// The speaker display still opens with "Open display window" (window.open), so it can be dragged to the projector.
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 800, backgroundColor: '#0b0d10', autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('file:')) {
      return { action: 'allow', overrideBrowserWindowOptions: { width: 1280, height: 720, backgroundColor: '#000', autoHideMenuBar: true, webPreferences: { contextIsolation: true, sandbox: true } } };
    }
    shell.openExternal(url); return { action: 'deny' };
  });
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
