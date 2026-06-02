const { app, BrowserWindow, protocol, net, dialog } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')
const http = require('http')

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

const API_PORT = 8080
const API_HEALTH = `http://127.0.0.1:${API_PORT}/q/health/live`

let backendProcess = null

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
  const env = {
    ...process.env,
    QUARKUS_PROFILE: 'desktop',
    QUARKUS_HTTP_PORT: String(API_PORT),
    QUARKUS_HTTP_HOST: '127.0.0.1',
    STUDYQUEST_DATA_DIR: dataDir,
    JWT_PRIVATE_KEY_LOCATION: path.join(backendDir, 'privateKey.pem'),
    CORS_ORIGINS: '*',
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
    return { cmd: jvmJava, args: ['-jar', quarkusRunJar], cwd: backendDir }
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

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'StudyQuest',
    backgroundColor: '#0d1117',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.loadURL('app://index.html')

  if (isDev) win.webContents.openDevTools({ mode: 'detach' })
}

app.isQuitting = false

app.whenReady().then(async () => {
  registerAppProtocol()
  startBackend()

  const splash = new BrowserWindow({
    width: 400,
    height: 260,
    frame: false,
    resizable: false,
    backgroundColor: '#0d1117',
    webPreferences: { contextIsolation: true },
  })
  splash.loadURL(`data:text/html,
    <html><body style="margin:0;background:#0d1117;display:flex;flex-direction:column;
      align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#e6edf3;">
      <h2 style="margin:0 0 8px;font-family:Georgia,serif">StudyQuest</h2>
      <p style="margin:0;font-size:13px;color:#8b949e">Iniciando…</p>
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
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.on('before-quit', () => {
  app.isQuitting = true
  killBackend()
})
