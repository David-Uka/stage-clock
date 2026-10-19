// Bridge between the controller page and the desktop app's local display server.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('stageClock', {
  publish: msg => ipcRenderer.send('stage-clock:state', msg),
  lanInfo: () => ipcRenderer.invoke('stage-clock:lan-info'),
  onClients: cb => ipcRenderer.on('stage-clock:clients', (_e, n) => cb(n)),
});
