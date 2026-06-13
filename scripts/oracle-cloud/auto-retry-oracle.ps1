# Retry automático: VM multi-região + deploy quando conseguir.
# Uso manual: .\scripts\oracle-cloud\auto-retry-oracle.ps1
# Agendado: .\scripts\oracle-cloud\schedule-oracle-retry.ps1

$ErrorActionPreference = "Continue"
$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$LogDir = Join-Path $Root "logs"
$LogFile = Join-Path $LogDir "oracle-retry.log"
$SuccessFlag = Join-Path $env:TEMP "app-audit-oracle-success.flag"
$Bash = "C:\Program Files\Git\bin\bash.exe"

if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }

function Write-Log([string]$Msg) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Msg"
  Add-Content -Path $LogFile -Value $line
  Write-Host $line
}

if (Test-Path $SuccessFlag) {
  Write-Log "VM já provisionada anteriormente. Encerrando."
  exit 0
}

Set-Location $Root
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
  [System.Environment]::GetEnvironmentVariable("Path", "User")
$env:OCI_CLI_SUPPRESS_FILE_PERMISSIONS_WARNING = "True"
$AppHost = if ($env:APP_HOST) { $env:APP_HOST } else { "app-audit" }

# Carrega OCIDs do .env ou ~/.oci/config
$envFile = Join-Path $Root ".env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
      $k = $matches[1].Trim()
      $v = $matches[2].Trim()
      if ($k -like "OCI_*") { Set-Item -Path "env:$k" -Value $v }
    }
  }
}

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

Write-Log "Iniciando tentativa multi-região (SP, Montreal, Toronto, Ashburn)..."

& $Bash "$Root/scripts/oracle-cloud/00f-launch-multi-region.sh" 2>&1 | ForEach-Object { Write-Log $_ }

if ($LASTEXITCODE -ne 0) {
  Write-Log "Sem capacidade nesta tentativa. Próxima execução agendada tentará de novo."
  exit 1
}

$stateFile = Join-Path $env:TEMP "app-audit-oracle-state.env"
$publicIp = (Get-Content "$env:TEMP\app-audit-oracle-ip" -ErrorAction SilentlyContinue).Trim()
$region = "sa-saopaulo-1"

if (Test-Path $stateFile) {
  Get-Content $stateFile | ForEach-Object {
    if ($_ -match '^OCI_REGION=(.+)$') { $region = $matches[1] }
    if ($_ -match '^PUBLIC_IP=(.+)$') { $publicIp = $matches[1] }
  }
}

Write-Log "VM criada! Região=$region IP=$publicIp"

# Atualiza .env com região e IP (gitignored)
if (Test-Path $envFile -and $publicIp) {
  $content = Get-Content $envFile -Raw
  $content = $content -replace '(?m)^OCI_REGION=.*', "OCI_REGION=$region"
  if ($content -notmatch '(?m)^OCI_REGION=') { $content += "`nOCI_REGION=$region" }
  Set-Content -Path $envFile -Value $content.TrimEnd() -Encoding utf8
}

$rootUnix = ($Root -replace '\\', '/')
Write-Log "Preparando .env de produção..."
& $Bash -lc "cd '$rootUnix'; PUBLIC_IP='$publicIp' bash scripts/oracle-cloud/04-prepare-oracle-env.sh" 2>&1 | ForEach-Object { Write-Log $_ }

Write-Log "Executando deploy remoto..."
& $Bash -lc "cd '$rootUnix'; bash scripts/oracle-cloud/05-remote-deploy.sh '$publicIp'" 2>&1 | ForEach-Object { Write-Log $_ }

if ($LASTEXITCODE -eq 0) {
  New-Item -ItemType File -Path $SuccessFlag -Force | Out-Null
  Write-Log "DEPLOY CONCLUÍDO: http://${AppHost}:3001"
  Write-Log "Adicione ao hosts: ${publicIp} ${AppHost}"
  # Remove tarefa agendada se existir
  Unregister-ScheduledTask -TaskName "AppAudit-Oracle-Retry" -Confirm:$false -ErrorAction SilentlyContinue
  exit 0
}

Write-Log "Deploy falhou. Verifique logs e SSH."
exit 1
