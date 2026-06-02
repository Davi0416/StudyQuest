const { app, BrowserWindow, protocol, net, dialog } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')
const http = require('http')

// ── Paths ──────────────────────────────────────────────────────────────────

const isDev = !app.isPackaged

const resourcesPath = isDev
  ? path.join(__dirname, '..')   // raiz do projeto em modo dev
  : process.resourcesPath        // dentro do app empacotado

const frontendDist = isDev
  ? path.join(resourcesPath, 'frontend', 'dist')
  : path.join(resourcesPath, 'frontend-dist')

// Binário nativo gerado pelo GraalVM — não exige JVM
const binaryName = process.platform === 'win32' ? 'studyquest-runner.exe' : 'studyquest-runner'
const backendBin = isDev
  ? path.join(resourcesPath, 'api', 'target', binaryName)
  : path.join(resourcesPath, 'backend', binaryName)

const API_PORT = 8080
const API_HEALTH = `http://localhost:${API_PORT}/q/health/live`

// ── Backend process ────────────────────────────────────────────────────────

let backendProcess = null

function startBackend() {
  if (!fs.existsSync(backendBin)) {
    dialog.showErrorBox(
      'Backend não encontrado',
      `Arquivo não encontrado:\n${backendBin}\n\nExecute o script de build nativo antes de iniciar o app.`
    )
    app.quit()
    return
  }

  // Garante permissão de execução no Linux/macOS
  if (process.platform !== 'win32') {
    fs.chmodSync(backendBin, 0o755)
  }

  backendProcess = spawn(backendBin, [], {
    env: {
      ...process.env,
      QUARKUS_HTTP_PORT: String(API_PORT),
      JWT_PRIVATE_KEY_LOCATION: path.join(path.dirname(backendBin), 'privateKey.pem'),
    },
    stdio: isDev ? 'inherit' : 'ignore',
  })

  backendProcess.on('error', (err) => {
    dialog.showErrorBox(
      'Erro ao iniciar o backend',
      `Não foi possível executar o binário nativo.\n\nDetalhe: ${err.message}`
    )
    app.quit()
  })
}

function killBackend() {
  if (backendProcess) {
    backendProcess.kill()
    backendProcess = null
  }
}

// ── Health check ───────────────────────────────────────────────────────────

function waitForApi(retries = 40, delayMs = 250) {
  return new Promise((resolve, reject) => {
    const attempt = (remaining) => {
      http.get(API_HEALTH, (res) => {
        if (res.statusCode === 200) {
          resolve()
        } else if (remaining > 0) {
          setTimeout(() => attempt(remaining - 1), delayMs)
        } else {
          reject(new Error('Backend não respondeu a tempo'))
        }
      }).on('error', () => {
        if (remaining > 0) {
          setTimeout(() => attempt(remaining - 1), delayMs)
        } else {
          reject(new Error('Backend não iniciou (timeout)'))
        }
      })
    }
    attempt(retries)
  })
}

// ── Protocol: app:// ───────────────────────────────────────────────────────
// Serve os arquivos estáticos do React com fallback para index.html
// para que o BrowserRouter funcione corretamente sem servidor HTTP.

function registerAppProtocol() {
  protocol.handle('app', (request) => {
    let urlPath = request.url.slice('app://'.length)
    urlPath = urlPath.split('?')[0].split('#')[0]
    if (urlPath.startsWith('/')) urlPath = urlPath.slice(1)

    const filePath = path.join(frontendDist, urlPath)

    if (urlPath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return net.fetch(`file://${filePath}`)
    }

    return net.fetch(`file://${path.join(frontendDist, 'index.html')}`)
  })
}

// ── Window ─────────────────────────────────────────────────────────────────

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'StudyQuest',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.loadURL('app://index.html')

  if (isDev) win.webContents.openDevTools({ mode: 'detach' })

  win.on('closed', () => killBackend())
}

// ── App lifecycle ──────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  registerAppProtocol()
  startBackend()

  const splash = new BrowserWindow({
    width: 400,
    height: 260,
    frame: false,
    resizable: false,
    backgroundColor: '#0f172a',
    webPreferences: { contextIsolation: true },
  })
  splash.loadURL(`data:text/html,
    <html><body style="margin:0;background:#0f172a;display:flex;flex-direction:column;
      align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#e2e8f0;">
      <h2 style="margin:0 0 8px">StudyQuest</h2>
      <p style="margin:0;font-size:13px;color:#94a3b8">Iniciando…</p>
    </body></html>
  `)

  try {
    await waitForApi()
    splash.close()
    createWindow()
  } catch (err) {
    splash.close()
    dialog.showErrorBox('Erro de inicialização', err.message)
    killBackend()
    app.quit()
  }
})

app.on('window-all-closed', () => {
  killBackend()
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.on('before-quit', () => killBackend())
