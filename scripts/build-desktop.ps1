# build-desktop.ps1 — Gera o executável desktop do StudyQuest (Windows)
# Pré-requisitos: Java 21, Node.js 18+
$ErrorActionPreference = 'Stop'

$Root = Split-Path $PSScriptRoot -Parent
$ElectronDir = Join-Path $Root 'electron'

Write-Host "==> [1/4] Build do backend (Quarkus)..."
Set-Location (Join-Path $Root 'api')
& .\mvnw.cmd package '-DskipTests' '-q'
Write-Host "    OK — api\target\quarkus-app\quarkus-run.jar"

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
