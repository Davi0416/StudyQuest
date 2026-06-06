// Preload rodando em contexto isolado.
// Expõe apenas o que o renderer realmente precisa via contextBridge.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  // Auto-update
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (_event, info) => callback(info))
  },
  onUpdateReady: (callback) => {
    ipcRenderer.on('update-ready', () => callback())
  },
  installUpdate: () => {
    ipcRenderer.send('install-update')
  },
})
