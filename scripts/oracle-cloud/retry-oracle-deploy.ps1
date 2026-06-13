# Tenta criar VM Ampere A1 e, se OK, faz deploy do app-audit.
# Uso: .\scripts\oracle-cloud\retry-oracle-deploy.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location $Root

$Bash = "C:\Program Files\Git\bin\bash.exe"
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
  [System.Environment]::GetEnvironmentVariable("Path", "User")
$env:OCI_CLI_SUPPRESS_FILE_PERMISSIONS_WARNING = "True"
$AppHost = if ($env:APP_HOST) { $env:APP_HOST } else { "app-audit" }

$ociConfig = Join-Path $env:USERPROFILE ".oci\config"
if (-not $env:OCI_TENANCY_OCID -and (Test-Path $ociConfig)) {
  Get-Content $ociConfig | ForEach-Object {
    if ($_ -match '^\s*tenancy=(.+)$') { $env:OCI_TENANCY_OCID = $matches[1].Trim() }
    if ($_ -match '^\s*region=(.+)$') { $env:OCI_REGION = $matches[1].Trim() }
  }
  if ($env:OCI_TENANCY_OCID -and -not $env:OCI_COMPARTMENT_OCID) {
    $env:OCI_COMPARTMENT_OCID = $env:OCI_TENANCY_OCID
  }
}

Write-Host "==> Tentando criar VM A1 (SP, Montreal, Toronto, Ashburn)..."
& $Bash "$Root/scripts/oracle-cloud/00f-launch-multi-region.sh"
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Sem capacidade A1 nas regioes testadas."
  Write-Host "Agende retry: .\scripts\oracle-cloud\schedule-oracle-retry.ps1"
  exit 1
}

$publicIp = (Get-Content "$env:TEMP\app-audit-oracle-ip" -ErrorAction Stop).Trim()
Write-Host "==> IP: $publicIp"

$rootUnix = ($Root -replace '\\', '/')
& $Bash -lc "cd '$rootUnix'; PUBLIC_IP='$publicIp' bash scripts/oracle-cloud/04-prepare-oracle-env.sh"
& $Bash -lc "cd '$rootUnix'; bash scripts/oracle-cloud/05-remote-deploy.sh '$publicIp'"

Write-Host ""
Write-Host "App Audit online:"
Write-Host ('  http://{0}:3001' -f $AppHost)
Write-Host ('  http://{0}:3000/health' -f $AppHost)
Write-Host ""
Write-Host "Adicione ao hosts (como admin):"
Write-Host ('  {0} {1}' -f $publicIp, $AppHost)
