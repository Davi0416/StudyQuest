# Gera par RSA 2048 para JWT (SmallRye) se ainda não existir
$ErrorActionPreference = 'Stop'

$OutDir = Join-Path (Split-Path $PSScriptRoot -Parent) 'api\src\main\resources'
$PrivateKey = Join-Path $OutDir 'privateKey.pem'
$PublicKey = Join-Path $OutDir 'publicKey.pem'

if (Test-Path $PrivateKey) {
  Write-Host "JWT keys já existem em $OutDir"
  exit 0
}

Write-Host "Gerando chaves JWT em $OutDir ..."
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$rsa = [System.Security.Cryptography.RSA]::Create(2048)
try {
  $privatePkcs8 = $rsa.ExportPkcs8PrivateKey()
  $privatePem = "-----BEGIN PRIVATE KEY-----`n"
  $privatePem += [Convert]::ToBase64String($privatePkcs8, 'InsertLineBreaks')
  $privatePem += "`n-----END PRIVATE KEY-----`n"
  [IO.File]::WriteAllText($PrivateKey, $privatePem)

  $publicSpki = $rsa.ExportSubjectPublicKeyInfo()
  $publicPem = "-----BEGIN PUBLIC KEY-----`n"
  $publicPem += [Convert]::ToBase64String($publicSpki, 'InsertLineBreaks')
  $publicPem += "`n-----END PUBLIC KEY-----`n"
  [IO.File]::WriteAllText($PublicKey, $publicPem)
} finally {
  $rsa.Dispose()
}

Write-Host "Chaves geradas:"
Write-Host "  $PrivateKey"
Write-Host "  $PublicKey"
