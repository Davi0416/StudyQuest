# build-desktop.ps1 — monta target/backend e gera o instalador Electron
# Uso: .\build-desktop.ps1
# Requisito: privateKey.pem deve existir em api/src/main/resources/ (gitignored)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }

# ── 0. Fecha o app instalado se estiver rodando ───────────────────────────────
$runningApp = Get-Process -Name "StudyQuest" -ErrorAction SilentlyContinue
if ($runningApp) {
    Step "Fechando StudyQuest em execucao"
    $runningApp | Stop-Process -Force
    Start-Sleep -Seconds 2
}

# ── 1. Frontend ────────────────────────────────────────────────────────────────
Step "Build frontend"
Set-Location "$root\frontend"
npm run build --silent
if (-not $?) { throw "Frontend build falhou" }

# ── 2. Backend (Quarkus com profile desktop fixado no bytecode) ────────────────
Step "Build backend (Quarkus desktop)"
Set-Location "$root\api"
& ".\mvnw" clean package -DskipTests "-Dquarkus.profile=desktop" -q
if (-not $?) { throw "Maven build falhou" }

# ── 3. Monta target/backend ────────────────────────────────────────────────────
Step "Montando target/backend"
$backend = "$root\api\target\backend"

# 3a. privateKey.pem (gitignored — deve existir em src/main/resources/)
$privSrc = "$root\api\src\main\resources\privateKey.pem"
if (-not (Test-Path $privSrc)) {
    throw "privateKey.pem nao encontrada em $privSrc - coloque a chave privada la antes de buildar"
}
Copy-Item $privSrc "$backend\privateKey.pem" -Force
Write-Host "    privateKey.pem copiada"

# 3b. JRE — usa o cache em electron/jre-cache/ se existir, senão pega do dist-electron anterior
$jreDest = "$backend\jre"
if (-not (Test-Path $jreDest)) {
    $jreCache   = "$root\electron\jre-cache"
    $jreFallback = "$root\electron\dist-electron\win-unpacked\resources\backend\jre"
    if (Test-Path $jreCache) {
        Copy-Item $jreCache $jreDest -Recurse -Force
        Write-Host "    JRE copiado de electron/jre-cache/"
    } elseif (Test-Path $jreFallback) {
        Copy-Item $jreFallback $jreDest -Recurse -Force
        Write-Host "    JRE copiado de dist-electron (fallback)"
    } else {
        throw "JRE nao encontrado. Coloque o JRE em electron/jre-cache/ ou rode um build anterior primeiro."
    }
} else {
    Write-Host "    JRE já presente em target/backend/jre"
}

Write-Host "    target/backend pronto:"
Get-ChildItem $backend -Depth 0 | ForEach-Object { Write-Host "      $($_.Name)" }

# ── 4. Electron ────────────────────────────────────────────────────────────────
Step "Build Electron (Windows installer)"
Set-Location "$root\electron"
npm run dist:win
if (-not $?) { throw "electron-builder falhou" }

# ── 5. Atualiza o app instalado (sem precisar rodar o instalador) ──────────────
$installedAsar = "$env:LOCALAPPDATA\Programs\studyquest\resources\app.asar"
$builtAsar     = "$root\electron\dist-electron\win-unpacked\resources\app.asar"
if (Test-Path $installedAsar) {
    Step "Atualizando app instalado"
    Copy-Item $builtAsar $installedAsar -Force
    Write-Host "    app.asar atualizado em $installedAsar"
}

Step "Concluido!"
Write-Host "Instalador: $root\electron\dist-electron\StudyQuest Setup *.exe" -ForegroundColor Green
if (Test-Path $installedAsar) {
    Write-Host "App instalado ja atualizado - pode abrir o StudyQuest diretamente." -ForegroundColor Green
}
