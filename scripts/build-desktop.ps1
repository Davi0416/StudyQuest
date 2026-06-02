# build-desktop.ps1 — Gera o executável desktop do StudyQuest (Windows, sem dependências externas)
# Pré-requisitos: GraalVM 21+, Node.js 18+
$ErrorActionPreference = 'Stop'

$Root = Split-Path $PSScriptRoot -Parent
$ElectronDir = Join-Path $Root 'electron'
$BackendOut   = Join-Path $Root 'api\target\backend'

Write-Host "==> [1/4] Build nativo do backend (GraalVM)..."
Set-Location (Join-Path $Root 'api')
& .\mvnw.cmd package '-Pnative' '-DskipTests' '-q'

# Organiza binário + chave privada para o electron-builder
New-Item -ItemType Directory -Force -Path $BackendOut | Out-Null
Copy-Item "target\studyquest-runner.exe" $BackendOut -ErrorAction SilentlyContinue
Copy-Item "src\main\resources\privateKey.pem" $BackendOut -ErrorAction SilentlyContinue
Write-Host "    OK — $BackendOut\"

Write-Host "==> [2/4] Build do frontend (Vite)..."
Set-Location (Join-Path $Root 'frontend')
npm ci --silent
npm run build
Write-Host "    OK — frontend\dist\"

Write-Host "==> [3/4] Instalando dependências do Electron..."
Set-Location $ElectronDir
npm ci --silent

Write-Host "==> [4/4] Empacotando com electron-builder..."
npm run dist:win

Write-Host ""
Write-Host "Pronto! Executável em: $ElectronDir\dist-electron\"
