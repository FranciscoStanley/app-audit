# Envia .env para a VM Oracle e executa o deploy.
# Uso: .\scripts\oracle-cloud\push-env.ps1 -PublicIp 132.145.x.x
param(
  [Parameter(Mandatory = $true)]
  [string]$PublicIp,

  [string]$SshKey = "$env:USERPROFILE\.ssh\id_ed25519_oracle",
  [string]$User = "ubuntu",
  [string]$LocalEnv = ".env",
  [string]$RemoteDir = "/opt/app-audit"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location $Root

if (-not (Test-Path $LocalEnv)) {
  throw "Arquivo $LocalEnv não encontrado na raiz do projeto."
}

if (-not (Test-Path $SshKey)) {
  Write-Host "Chave SSH não encontrada: $SshKey"
  Write-Host "Gere com: ssh-keygen -t ed25519 -f `"$SshKey`""
  exit 1
}

$AppHost = if ($env:APP_HOST) { $env:APP_HOST } else { "app-audit" }

$content = Get-Content $LocalEnv -Raw
$content = $content -replace 'http://localhost:3001', "http://${AppHost}:3001"
$content = $content -replace 'http://localhost:3000', "http://${AppHost}:3000"
$content = $content -replace 'http://PUBLIC_IP:3001', "http://${AppHost}:3001"
$content = $content -replace 'http://PUBLIC_IP:3000', "http://${AppHost}:3000"
$content = $content -replace 'PUBLIC_IP', $PublicIp
$content = $content -replace '(?m)^SWAGGER_ENABLED=.*', 'SWAGGER_ENABLED=false'

$tempEnv = Join-Path $env:TEMP "app-audit-oracle.env"
Set-Content -Path $tempEnv -Value $content -NoNewline -Encoding utf8

Write-Host "==> Enviando .env para ${User}@${PublicIp}..."
scp -i $SshKey -o StrictHostKeyChecking=accept-new $tempEnv "${User}@${PublicIp}:${RemoteDir}/.env"

Write-Host "==> Executando deploy na VM..."
ssh -i $SshKey "${User}@${PublicIp}" "cd ${RemoteDir} && bash scripts/oracle-cloud/04-finalize-deploy.sh"

Remove-Item $tempEnv -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Deploy solicitado. Acesse:"
Write-Host "  Frontend: http://${AppHost}:3001"
Write-Host "  API:      http://${AppHost}:3000/health"
Write-Host ""
Write-Host "Adicione ao hosts (como admin):"
Write-Host "  ${PublicIp} ${AppHost}"
