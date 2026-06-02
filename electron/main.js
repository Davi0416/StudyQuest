const { app, BrowserWindow, protocol, net, dialog } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')
const http = require('http')

// ── Paths ──────────────────────────────────────────────────────────────────

const isDev = !app.isPackaged

const resourcesPath = isDev
  ? path.join(__dirname, '..')         // project root when running with `electron .`
  : process.resourcesPath              // inside packaged app

const frontendDist = isDev
  ? path.join(resourcesPath, 'frontend', 'dist')
  : path.join(resourcesPath, 'frontend-dist')

const quarkusJar = isDev
  ? path.join(resourcesPath, 'api', 'target', 'quarkus-app', 'quarkus-run.jar')
  : path.join(resourcesPath, 'quarkus-app', 'quarkus-run.jar')

const quarkusLibs = isDev
  ? path.join(resourcesPath, 'api', 'target', 'quarkus-app')
  : path.join(resourcesPath, 'quarkus-app')

const API_PORT = 8080
const API_HEALTH = `http://localhost:${API_PORT}/q/health/live`

// ── Java process ───────────────────────────────────────────────────────────

let javaProcess = null

function startQuarkus() {
  if (!fs.existsSync(quarkusJar)) {
    dialog.showErrorBox(
      'API não encontrada',
      `Arquivo não encontrado:\n${quarkusJar}\n\nExecute o script de build antes de iniciar o app.`
    )
    app.quit()
    return
  }

  // Java executable: usa JAVA_HOME se definido, senão 'java' do PATH
  const javaExe = process.env.JAVA_HOME
    ? path.join(process.env.JAVA_HOME, 'bin', 'java')
    : 'java'

  const env = {
    ...process.env,
    QUARKUS_HTTP_PORT: String(API_PORT),
    // Em produção defina estas variáveis no ambiente do instalador
    JWT_PRIVATE_KEY_LOCATION: path.join(quarkusLibs, 'privateKey.pem'),
  }

  javaProcess = spawn(javaExe, ['-jar', quarkusJar], {
    cwd: quarkusLibs,
    env,
    stdio: isDev ? 'inherit' : 'ignore',
  })

  javaProcess.on('error', (err) => {
    dialog.showErrorBox(
      'Erro ao iniciar a API',
      `Não foi possível executar o Java.\n\nDetalhe: ${err.message}\n\nVerifique se o Java 21 está instalado e no PATH.`
    )
    app.quit()
  })
}

function killQuarkus() {
  if (javaProcess) {
    javaProcess.kill()
    javaProcess = null
  }
}

// ── Health check ───────────────────────────────────────────────────────────

function waitForApi(retries = 40, delayMs = 500) {
  return new Promise((resolve, reject) => {
    const attempt = (remaining) => {
      http.get(API_HEALTH, (res) => {
        if (res.statusCode === 200) {
          resolve()
        } else if (remaining > 0) {
          setTimeout(() => attempt(remaining - 1), delayMs)
        } else {
          reject(new Error('API não respondeu a tempo'))
        }
      }).on('error', () => {
        if (remaining > 0) {
          setTimeout(() => attempt(remaining - 1), delayMs)
        } else {
          reject(new Error('API não iniciou (timeout)'))
        }
      })
    }
    attempt(retries)
  })
}

// ── Protocol: app:// ───────────────────────────────────────────────────────
// Serve os arquivos estáticos do React e faz fallback para index.html
// para que o BrowserRouter funcione corretamente.

function registerAppProtocol() {
  protocol.handle('app', (request) => {
    let urlPath = request.url.slice('app://'.length)

    // Remove parâmetros de query e fragmentos
    urlPath = urlPath.split('?')[0].split('#')[0]

    // Remove barra inicial duplicada
    if (urlPath.startsWith('/')) urlPath = urlPath.slice(1)

    const filePath = path.join(frontendDist, urlPath)

    if (urlPath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return net.fetch(`file://${filePath}`)
    }

    // SPA fallback: qualquer rota desconhecida entrega o index.html
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

  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' })
  }

  win.on('closed', () => killQuarkus())
}

// ── App lifecycle ──────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  registerAppProtocol()

  // Inicia a API Java em background
  startQuarkus()

  // Mostra janela de splash enquanto aguarda
  const splash = new BrowserWindow({
    width: 400,
    height: 260,
    frame: false,
    resizable: false,
    backgroundColor: '#0f172a',
    webPreferences: { contextIsolation: true },
  })
  splash.loadURL(`data:text/html,
    <html>
    <body style="margin:0;background:#0f172a;display:flex;flex-direction:column;
                 align-items:center;justify-content:center;height:100vh;
                 font-family:sans-serif;color:#e2e8f0;">
      <h2 style="margin:0 0 8px">StudyQuest</h2>
      <p style="margin:0;font-size:13px;color:#94a3b8">Iniciando a API…</p>
    </body></html>
  `)

  try {
    await waitForApi()
    splash.close()
    createWindow()
  } catch (err) {
    splash.close()
    dialog.showErrorBox('Erro de inicialização', `${err.message}\n\nVerifique o banco de dados e as configurações.`)
    killQuarkus()
    app.quit()
  }
})

app.on('window-all-closed', () => {
  killQuarkus()
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.on('before-quit', () => killQuarkus())
