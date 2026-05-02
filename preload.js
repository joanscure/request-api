const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  request:         (opts) => ipcRenderer.invoke('http-request', opts),
  pickFile:        (opts) => ipcRenderer.invoke('pick-file', opts),
  openHtmlPreview: (html) => ipcRenderer.invoke('open-html-preview', html),
});
