# Sobe o backend apontando para PostgreSQL no Neon (perfil neon).
# Requer api/.env com POSTGRES_URL, POSTGRES_USER e POSTGRES_PASSWORD.

$ErrorActionPreference = "Stop"
$apiDir = Join-Path $PSScriptRoot ".." "api" | Resolve-Path

Set-Location $apiDir

if (-not (Test-Path ".env")) {
  Write-Host "Crie api/.env a partir de api/.env.example com as credenciais do Neon."
  exit 1
}

Write-Host "Iniciando Quarkus com perfil neon (PostgreSQL remoto + SQLite local)..."
.\mvnw.cmd quarkus:dev "-Dquarkus.profile=neon"
