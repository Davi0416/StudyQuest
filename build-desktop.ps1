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

# 3c. .env com credenciais do banco restrito
$apiEnvPath = "$root\api\.env"
if (Test-Path $apiEnvPath) {
    $envContent = Get-Content $apiEnvPath
    $dbUrl = ($envContent | Where-Object { $_ -match "^POSTGRES_URL=" }) -replace "^POSTGRES_URL=",""
    $desktopPass = ($envContent | Where-Object { $_ -match "^DESKTOP_DB_PASSWORD=" }) -replace "^DESKTOP_DB_PASSWORD=",""
    
    if ($dbUrl -and $desktopPass) {
        $backendEnvPath = "$backend\.env"
        "DESKTOP_DB_URL=$dbUrl" | Out-File -FilePath $backendEnvPath -Encoding UTF8
        "DESKTOP_DB_PASSWORD=$desktopPass" | Out-File -FilePath $backendEnvPath -Encoding UTF8 -Append
        Write-Host "    .env gerado em target/backend"
    } else {
        Write-Host "    Aviso: POSTGRES_URL ou DESKTOP_DB_PASSWORD nao encontrados em api/.env" -ForegroundColor Yellow
    }
}

# ── 4. Electron ────────────────────────────────────────────────────────────────
Step "Build Electron (Windows installer)"
Set-Location "$root\electron"
# NODE_NO_WARNINGS=1 suprime o DEP0190 (shell:true em processo filho do electron-builder).
# Sem isso, o aviso vai pro stderr e zera $?, fazendo o script abortar mesmo com build OK.
$env:NODE_NO_WARNINGS = "1"
npm run dist:win
# Valida pela existencia do instalador, nao por $? (aviso em stderr pode mascarar sucesso)
$version = (Get-Content "$root\electron\package.json" | ConvertFrom-Json).version
$installer = "$root\electron\dist-electron\StudyQuest Setup $version.exe"
if (-not (Test-Path $installer)) { throw "electron-builder falhou: instalador nao gerado ($installer)" }

# ── 5. Atualiza o app instalado (sem precisar rodar o instalador) ──────────────
# Copia o conteudo inteiro de resources/: app.asar (main/preload) + frontend-dist
# + backend. Copiar so o app.asar deixa frontend e backend desatualizados, porque
# eles sao empacotados como extraResources, FORA do asar.
$installedResources = "$env:LOCALAPPDATA\Programs\studyquest\resources"
$builtResources     = "$root\electron\dist-electron\win-unpacked\resources"
if (Test-Path $installedResources) {
    Step "Atualizando app instalado"
    # StudyQuest precisa estar fechado (passo 0 ja garante isso)
    foreach ($item in @("app.asar", "frontend-dist", "backend")) {
        $src = Join-Path $builtResources $item
        $dst = Join-Path $installedResources $item
        if (Test-Path $src) {
            if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
            Copy-Item $src $dst -Recurse -Force
            Write-Host "    $item atualizado"
        }
    }
}

Step "Concluido!"
Write-Host "Instalador: $root\electron\dist-electron\StudyQuest Setup *.exe" -ForegroundColor Green
if (Test-Path $installedResources) {
    Write-Host "App instalado ja atualizado - pode abrir o StudyQuest diretamente." -ForegroundColor Green
}
