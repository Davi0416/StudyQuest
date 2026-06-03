// Preload rodando em contexto isolado.
// Expõe apenas o que o renderer realmente precisa via contextBridge.
const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
})
