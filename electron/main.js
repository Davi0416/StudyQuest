const { app, BrowserWindow, protocol, net, dialog, ipcMain, session } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')
const http = require('http')

function loadMailConfig() {
  const candidates = [
    path.join(__dirname, 'mail.config.js'),
    path.join(app.isPackaged ? process.resourcesPath : __dirname, 'mail.config.js'),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        // require() cacheia pelo path, então deleta antes para forçar releitura
        delete require.cache[require.resolve(p)]
        return require(p)
      } catch (_) {}
    }
  }
  return { MAIL_PROVIDER: 'mock' }
}

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
])

const isDev = !app.isPackaged

const resourcesPath = isDev
  ? path.join(__dirname, '..')
  : process.resourcesPath

const frontendDist = isDev
  ? path.join(resourcesPath, 'frontend', 'dist')
  : path.join(resourcesPath, 'frontend-dist')

const backendDir = isDev
  ? path.join(resourcesPath, 'api', 'target', 'backend')
  : path.join(resourcesPath, 'backend')

const nativeBinary = process.platform === 'win32'
  ? path.join(backendDir, 'studyquest-runner.exe')
  : path.join(backendDir, 'studyquest-runner')

const jvmJava = process.platform === 'win32'
  ? path.join(backendDir, 'jre', 'bin', 'java.exe')
  : path.join(backendDir, 'jre', 'bin', 'java')

const quarkusRunJar = path.join(backendDir, 'quarkus-app', 'quarkus-run.jar')

let API_PORT = 8080
let API_HEALTH = `http://127.0.0.1:${API_PORT}/q/health/live`

function getFreePort() {
  return new Promise((resolve, reject) => {
    const nodeNet = require('net')
    const srv = nodeNet.createServer()
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port
      srv.close(() => resolve(port))
    })
    srv.on('error', reject)
  })
}

let backendProcess = null
let mainWindow = null

function ensureDataDir() {
  const dataDir = path.join(app.getPath('userData'), 'data')
  fs.mkdirSync(dataDir, { recursive: true })
  return dataDir
}

function bundledPythonPath() {
  const name = process.platform === 'win32' ? 'python.exe' : 'python3'
  const base = isDev
    ? path.join(__dirname, 'resources', process.platform === 'win32' ? 'python-win' : 'python')
    : path.join(resourcesPath, 'python')
  return path.join(base, name)
}

function buildBackendEnv() {
  const dataDir = ensureDataDir()
  const mailCfg = loadMailConfig()
  const env = {
    ...process.env,
    QUARKUS_PROFILE: 'desktop',
    QUARKUS_HTTP_PORT: String(API_PORT),
    QUARKUS_HTTP_HOST: '127.0.0.1',
    STUDYQUEST_DATA_DIR: dataDir,
    JWT_PRIVATE_KEY_LOCATION: path.join(backendDir, 'privateKey.pem'),
    CORS_ORIGINS: '*',
    // E-mail SMTP — carregado de mail.config.js (gitignored)
    ...mailCfg,
    // Neon — ranking semanal global (somente leitura), lido de mail.config.js
    STUDYQUEST_NEON_RANKING_URL:      mailCfg.NEON_RANKING_URL      || '',
    STUDYQUEST_NEON_RANKING_USER:     mailCfg.NEON_RANKING_USER     || '',
    STUDYQUEST_NEON_RANKING_PASSWORD: mailCfg.NEON_RANKING_PASSWORD || '',
  }

  const python = bundledPythonPath()
  if (fs.existsSync(python)) {
    env.STUDYQUEST_PYTHON = python
  }

  return env
}

function resolveBackendLaunch() {
  if (fs.existsSync(nativeBinary)) {
    return { cmd: nativeBinary, args: [], cwd: backendDir }
  }
  if (fs.existsSync(jvmJava) && fs.existsSync(quarkusRunJar)) {
    const dataDir = ensureDataDir()
    return {
      cmd: jvmJava,
      args: [
        '-Dquarkus.profile=desktop',
        `-Dstudyquest.data.dir=${dataDir}`,
        '-Dstudyquest.bypass.verification=true',
        '-jar', quarkusRunJar,
      ],
      cwd: backendDir,
    }
  }
  return null
}

function startBackend() {
  const launch = resolveBackendLaunch()
  if (!launch) {
    dialog.showErrorBox(
      'Backend não encontrado',
      `Nenhum runtime embutido encontrado em:\n${backendDir}\n\nExecute .\\scripts\\build-desktop.ps1 para gerar o instalador.`
    )
    app.quit()
    return
  }

  if (process.platform !== 'win32' && launch.cmd === nativeBinary) {
    fs.chmodSync(nativeBinary, 0o755)
  }

  backendProcess = spawn(launch.cmd, launch.args, {
    env: buildBackendEnv(),
    cwd: launch.cwd,
    stdio: isDev ? 'inherit' : 'pipe',
    windowsHide: true,
  })

  if (!isDev && backendProcess.stderr) {
    backendProcess.stderr.on('data', (chunk) => {
      console.error('[backend]', chunk.toString())
    })
  }

  backendProcess.on('error', (err) => {
    dialog.showErrorBox(
      'Erro ao iniciar o backend',
      `Não foi possível iniciar o servidor local.\n\nDetalhe: ${err.message}`
    )
    app.quit()
  })

  backendProcess.on('exit', (code, signal) => {
    if (code !== 0 && code !== null && !app.isQuitting) {
      dialog.showErrorBox(
        'Backend encerrado',
        `O servidor local parou inesperadamente (código ${code}${signal ? `, ${signal}` : ''}).`
      )
      app.quit()
    }
  })
}

function killBackend() {
  if (backendProcess) {
    backendProcess.kill()
    backendProcess = null
  }
}

function waitForApi(retries = 80, delayMs = 500) {
  return new Promise((resolve, reject) => {
    const attempt = (remaining) => {
      const req =       http.get(API_HEALTH, (res) => {
        res.resume()
        if (res.statusCode && res.statusCode < 500) resolve()
        else if (remaining > 0) setTimeout(() => attempt(remaining - 1), delayMs)
        else reject(new Error('Backend não respondeu a tempo'))
      })
      req.on('error', () => {
        if (remaining > 0) setTimeout(() => attempt(remaining - 1), delayMs)
        else reject(new Error('Backend não iniciou (timeout)'))
      })
      req.setTimeout(2000, () => req.destroy())
    }
    attempt(retries)
  })
}

function registerAppProtocol() {
  protocol.handle('app', (request) => {
    let urlPath = request.url.slice('app://local/'.length)
    urlPath = urlPath.split('?')[0].split('#')[0]
    if (urlPath.startsWith('/')) urlPath = urlPath.slice(1)

    const filePath = path.join(frontendDist, urlPath)
    const { pathToFileURL } = require('url')

    if (urlPath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return net.fetch(pathToFileURL(filePath).toString())
    }

    return net.fetch(pathToFileURL(path.join(frontendDist, 'index.html')).toString())
  })
}

// ─── Auto Updater ────────────────────────────────────────────────────────────

function setupAutoUpdater() {
  // Não verificar atualizações em desenvolvimento — o app não está empacotado
  if (isDev) return

  const { autoUpdater } = require('electron-updater')

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('update-available', async (info) => {
    // Tenta buscar o body do release no GitHub para verificar [CRITICAL]
    let releaseNotes = ''
    let critical = false

    try {
      const response = await net.fetch(
        `https://api.github.com/repos/Davi0416/StudyQuest/releases/tags/v${info.version}`,
        { headers: { 'User-Agent': 'StudyQuest-Updater/1.0' } }
      )
      if (response.ok) {
        const data = await response.json()
        releaseNotes = data.body || ''
        critical = /\[critical\]/i.test(releaseNotes)
      }
    } catch (_) {
      // Fallback: usa releaseNotes do próprio evento (pode ser string ou array)
      const raw = info.releaseNotes
      releaseNotes = typeof raw === 'string'
        ? raw
        : Array.isArray(raw) ? raw.map(r => r.note || '').join('\n') : ''
      critical = /\[critical\]/i.test(releaseNotes)
    }

    // Remove a tag interna antes de exibir ao usuário
    releaseNotes = releaseNotes.replace(/\[critical\]\s*/gi, '').trim()

    mainWindow?.webContents.send('update-available', {
      version: info.version,
      critical,
      releaseNotes,
    })
  })

  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('update-ready')
  })

  ipcMain.on('install-update', () => {
    autoUpdater.quitAndInstall(false, false)
  })

  // Verifica silenciosamente — erros (sem internet, sem release) são ignorados
  autoUpdater.checkForUpdates().catch(() => {})
}

// ─── Window ───────────────────────────────────────────────────────────────────

function createWindow(splash) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'StudyQuest',
    backgroundColor: '#0d1117',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.loadURL(`app://local/index.html?apiPort=${API_PORT}`)

  mainWindow.once('ready-to-show', () => {
    if (splash && !splash.isDestroyed()) {
      splash.close()
    }
    mainWindow.show()
    setupAutoUpdater()
  })

  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' })
}

app.isQuitting = false

app.whenReady().then(async () => {
  API_PORT = await getFreePort()
  API_HEALTH = `http://127.0.0.1:${API_PORT}/q/health/live`

  // Corrige erro 153 do YouTube: substitui Origin app:// por uma origem HTTPS válida
  // antes de cada requisição ao YouTube/nocookie, para que o player aceite o embed.
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['*://*.youtube-nocookie.com/*', '*://*.youtube.com/*', '*://*.ytimg.com/*', '*://*.googlevideo.com/*'] },
    (details, callback) => {
      const headers = { ...details.requestHeaders }
      headers['Origin'] = 'https://www.youtube-nocookie.com'
      headers['Referer'] = 'https://www.youtube-nocookie.com/'
      callback({ requestHeaders: headers })
    }
  )

  registerAppProtocol()
  startBackend()

  const iconBase64 = fs.existsSync(path.join(__dirname, 'icons', 'icon.png'))
    ? fs.readFileSync(path.join(__dirname, 'icons', 'icon.png')).toString('base64')
    : '';
  const imgSrc = iconBase64 ? `data:image/png;base64,${iconBase64}` : '';

  const splash = new BrowserWindow({
    width: 420,
    height: 300,
    frame: false,
    resizable: false,
    transparent: true,
    webPreferences: { contextIsolation: true },
  })
  splash.loadURL(`data:text/html,
    <html><head><style>
      body {
        margin:0; padding:0;
        background: linear-gradient(135deg, #1c2330 0%, #0c1016 100%);
        border: 1px solid rgba(240,192,96,0.2);
        border-radius: 12px;
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        height:100vh; box-sizing: border-box;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color:#e6edf3;
        overflow: hidden; user-select: none;
      }
      .logo {
        width: 80px; height: 80px; margin-bottom: 24px;
        animation: pulse 2s infinite ease-in-out;
        filter: drop-shadow(0 4px 12px rgba(0,0,0,0.6));
      }
      @keyframes pulse {
        0% { transform: scale(0.95); opacity: 0.9; }
        50% { transform: scale(1.05); opacity: 1; }
        100% { transform: scale(0.95); opacity: 0.9; }
      }
      h2 {
        margin: 0 0 16px; font-size: 24px; font-weight: 600; letter-spacing: 1px;
        background: linear-gradient(90deg, #ffe39b, #f0c060);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      }
      .loading-bar {
        width: 160px; height: 4px; background: rgba(255,255,255,0.1);
        border-radius: 4px; overflow: hidden; position: relative;
      }
      .loading-bar::after {
        content: ''; position: absolute; top: 0; left: 0; bottom: 0; width: 40%;
        background: linear-gradient(90deg, #f0c060, #ffe39b);
        border-radius: 4px; animation: load 1.5s infinite ease-in-out;
      }
      @keyframes load {
        0% { left: -40%; }
        100% { left: 100%; }
      }
      .text { font-size: 13px; color: #8b949e; margin-top: 16px; font-weight: 500; }
    </style></head>
    <body>
      <img class="logo" src="${imgSrc}" alt="Logo" onerror="this.style.display='none'" />
      <h2>StudyQuest</h2>
      <div class="loading-bar"></div>
      <div class="text">Despertando o servidor...</div>
    </body></html>
  `)

  try {
    await waitForApi()
    // Atualizar o texto da splash (opcional, pode ser muito rápido)
    splash.webContents.executeJavaScript(`document.querySelector('.text').innerText = 'Preparando interface...'`).catch(() => {})
    createWindow(splash)
  } catch (err) {
    splash.close()
    dialog.showErrorBox('Erro de inicialização', err.message)
    killBackend()
    app.quit()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.on('before-quit', () => {
  app.isQuitting = true
  killBackend()
})
