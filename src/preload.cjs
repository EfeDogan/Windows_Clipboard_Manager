const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('pano', {
  state: () => ipcRenderer.invoke('state'),
  action: (name, payload) => ipcRenderer.invoke('action', name, payload),
  onChange: callback => { ipcRenderer.on('changed', (_event, state) => callback(state)); },
  onOpen: callback => { ipcRenderer.on('opened', () => callback()); }
});
