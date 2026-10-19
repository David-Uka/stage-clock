// Desktop shell for Stage Clock. Loads the same index.html as the web version and, in addition,
// runs a small local server so any device on the venue Wi-Fi can open the speaker display.
const { app, BrowserWindow, shell, ipcMain } = require('electron');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { WebSocketServer } = require('ws');

const APP_DIR = path.join(__dirname, 'app');
const PORT = 4455;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.css': 'text/css' };

let mainWin = null, lastMessage = null, port = null, nextClientId = 1;
const clients = new Set();

/* ---- local display server ---- */
function serveStatic(req, res) {
  const url = new URL(req.url, 'http://x');
  let file = url.pathname === '/' ? '/index.html' : url.pathname;
  file = path.normalize(path.join(APP_DIR, file));
  if (!file.startsWith(APP_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}
function broadcastClients() { if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send('stage-clock:clients', clients.size); }
function startServer(tryPort) {
  return new Promise(resolve => {
    const server = http.createServer(serveStatic);
    const wss = new WebSocketServer({ server, path: '/ws' });
    wss.on('connection', ws => {
      ws.id = nextClientId++;
      clients.add(ws); broadcastClients();
      if (lastMessage) ws.send(lastMessage);
      // Phone remotes send commands; the controller page decides (PIN) and replies to that one client.
      ws.on('message', data => {
        if (data.length > 16 * 1024 || !mainWin || mainWin.isDestroyed()) return;
        let msg; try { msg = JSON.parse(String(data)); } catch (e) { return; }
        if (msg && msg.type === 'command') mainWin.webContents.send('stage-clock:command', { clientId: ws.id, msg });
      });
      ws.on('close', () => { clients.delete(ws); broadcastClients(); });
      ws.on('error', () => {});
    });
    server.on('error', () => resolve(startServer(0)));          // port busy: let the OS pick one
    server.listen(tryPort, '0.0.0.0', () => { port = server.address().port; resolve(port); });
  });
}
function lanUrls() {
  const out = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      if (/^(vmnet|vboxnet|docker|br-|veth|utun)/i.test(name)) continue;
      out.push(`http://${a.address}:${port}`);
    }
  }
  // Prefer the usual home/venue ranges first
  return out.sort((x, y) => (/\/\/192\.168\./.test(y) - /\/\/192\.168\./.test(x)) || (/\/\/10\./.test(y) - /\/\/10\./.test(x)));
}
ipcMain.on('stage-clock:state', (_e, msg) => {
  lastMessage = JSON.stringify(msg);
  for (const ws of clients) { if (ws.readyState === ws.OPEN) ws.send(lastMessage); }
});
ipcMain.handle('stage-clock:lan-info', () => ({ port, urls: lanUrls() }));
ipcMain.on('stage-clock:reply', (_e, { clientId, msg }) => {
  for (const ws of clients) { if (ws.id === clientId && ws.readyState === ws.OPEN) { ws.send(JSON.stringify(msg)); break; } }
});

/* ---- windows ---- */
function createWindow() {
  mainWin = new BrowserWindow({
    width: 1280, height: 800, backgroundColor: '#0b0d10', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true },
  });
  mainWin.loadFile(path.join(APP_DIR, 'index.html'));
  mainWin.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('file:')) {
      return { action: 'allow', overrideBrowserWindowOptions: { width: 1280, height: 720, backgroundColor: '#000', autoHideMenuBar: true, webPreferences: { contextIsolation: true, sandbox: true } } };
    }
    shell.openExternal(url); return { action: 'deny' };
  });
}
app.whenReady().then(async () => { await startServer(PORT); createWindow(); });
app.on('window-all-closed', () => app.quit());
