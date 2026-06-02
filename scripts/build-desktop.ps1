# build-desktop.ps1 — Gera o instalador desktop do StudyQuest (Windows, sem dependências para o usuário final)
# Pré-requisitos de BUILD: Java 21, Node.js 18+, conexão com internet (JRE + Python embeddable)
param(
  [switch]$Native
)

$ErrorActionPreference = 'Stop'

$Root = Split-Path $PSScriptRoot -Parent
$ElectronDir = Join-Path $Root 'electron'
$BackendOut = Join-Path $Root 'api\target\backend'
$PythonDir = Join-Path $ElectronDir 'resources\python-win'
$PythonZip = Join-Path $env:TEMP 'python-embed-amd64.zip'
$PythonVersion = '3.12.10'
$PythonUrl = "https://www.python.org/ftp/python/$PythonVersion/python-$PythonVersion-embed-amd64.zip"
$JreZip = Join-Path $env:TEMP 'temurin-jre21.zip'
$JreUrl = 'https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/eclipse?project=jdk'

function Copy-Tree($Source, $Destination) {
  New-Item -ItemType Directory -Force -Path $Destination | Out-Null
  Copy-Item -Path (Join-Path $Source '*') -Destination $Destination -Recurse -Force
}

Write-Host "==> [0/6] Chaves JWT..."
& (Join-Path $PSScriptRoot 'generate-jwt-keys.ps1')

Write-Host "==> [1/6] Build do backend..."
Set-Location (Join-Path $Root 'api')
if ($Native) {
  Write-Host "    Modo nativo (GraalVM + Docker)..."
  & .\mvnw.cmd package '-Pnative' '-DskipTests' '-Dquarkus.native.container-build=true' '-q'
} else {
  Write-Host "    Modo JVM embutido (JRE + quarkus-app)..."
  & .\mvnw.cmd package '-DskipTests' '-q'
}

New-Item -ItemType Directory -Force -Path $BackendOut | Out-Null
Copy-Item "src\main\resources\privateKey.pem" $BackendOut -Force
Copy-Item "src\main\resources\publicKey.pem" $BackendOut -Force

if ($Native -and (Test-Path "target\studyquest-runner.exe")) {
  Copy-Item "target\studyquest-runner.exe" $BackendOut -Force
  Write-Host "    OK - binario nativo em $BackendOut"
} else {
  Copy-Tree "target\quarkus-app" (Join-Path $BackendOut 'quarkus-app')

  $JreDir = Join-Path $BackendOut 'jre'
  if (-not (Test-Path (Join-Path $JreDir 'bin\java.exe'))) {
    Write-Host "    Baixando JRE 21 (Temurin)..."
    Invoke-WebRequest -Uri $JreUrl -OutFile $JreZip -UseBasicParsing
    $JreExtract = Join-Path $env:TEMP 'temurin-jre21'
    if (Test-Path $JreExtract) { Remove-Item $JreExtract -Recurse -Force }
    Expand-Archive -Path $JreZip -DestinationPath $JreExtract -Force
    Remove-Item $JreZip -Force
    $JreRoot = Get-ChildItem $JreExtract -Directory | Select-Object -First 1
    Copy-Tree $JreRoot.FullName $JreDir
    Remove-Item $JreExtract -Recurse -Force
  }
  Write-Host "    OK - JRE + quarkus-app em $BackendOut"
}

Write-Host "==> [2/6] Python embutido (exercícios offline)..."
New-Item -ItemType Directory -Force -Path $PythonDir | Out-Null
if (-not (Test-Path (Join-Path $PythonDir 'python.exe'))) {
  Write-Host "    Baixando Python $PythonVersion embeddable..."
  Invoke-WebRequest -Uri $PythonUrl -OutFile $PythonZip -UseBasicParsing
  Expand-Archive -Path $PythonZip -DestinationPath $PythonDir -Force
  Remove-Item $PythonZip -Force

  $pthFile = Get-ChildItem $PythonDir -Filter 'python*._pth' | Select-Object -First 1
  if ($pthFile) {
    $content = Get-Content $pthFile.FullName -Raw
    $content = $content -replace '#import site', 'import site'
    Set-Content -Path $pthFile.FullName -Value $content -NoNewline
  }
}
Write-Host "    OK - $PythonDir"

Write-Host "==> [3/6] Build do frontend (Vite)..."
Set-Location (Join-Path $Root 'frontend')
npm install --silent
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Falha no build do frontend' }
Write-Host "    OK - frontend/dist"

Write-Host "==> [4/6] Dependências do Electron..."
Set-Location $ElectronDir
if (Test-Path 'node_modules') { npm ci --silent } else { npm install --silent }

Write-Host "==> [5/6] Empacotando com electron-builder..."
npm run dist:win

Write-Host ""
Write-Host "Pronto! Instalador em: $ElectronDir/dist-electron/"
Write-Host "O usuario final so precisa instalar o .exe - sem Java, Node ou Python."
