# Tenta criar VM Ampere A1 e, se OK, faz deploy do app-audit.
# Uso: .\scripts\oracle-cloud\retry-oracle-deploy.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location $Root

$Bash = "C:\Program Files\Git\bin\bash.exe"
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
  [System.Environment]::GetEnvironmentVariable("Path", "User")
$env:OCI_CLI_SUPPRESS_FILE_PERMISSIONS_WARNING = "True"

Write-Host "==> Tentando criar VM Ampere A1 (pode falhar se sem capacidade)..."
& $Bash "$Root/scripts/oracle-cloud/00b-launch-vm.sh"
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Sem capacidade A1 em sa-saopaulo-1. Tente novamente em horario de menor pico ou pelo Console Oracle."
  Write-Host "Rede e credenciais ja estao prontas - so falta a VM."
  exit 1
}

$publicIp = (Get-Content "$env:TEMP\app-audit-oracle-ip" -ErrorAction Stop).Trim()
Write-Host "==> IP: $publicIp"

$rootUnix = ($Root -replace '\\', '/')
& $Bash -lc "cd '$rootUnix'; PUBLIC_IP='$publicIp' bash scripts/oracle-cloud/04-prepare-oracle-env.sh"
& $Bash -lc "cd '$rootUnix'; bash scripts/oracle-cloud/05-remote-deploy.sh '$publicIp'"

Write-Host ""
Write-Host "App Audit online:"
Write-Host ('  http://{0}:3001' -f $publicIp)
Write-Host ('  http://{0}:3000/health' -f $publicIp)
