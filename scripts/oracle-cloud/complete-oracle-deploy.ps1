# Conclui deploy Oracle Cloud — config OCI + VM + app-audit
# Uso:
#   .\scripts\oracle-cloud\complete-oracle-deploy.ps1 -TenancyOcid "ocid1.tenancy.oc1..xxxx"

param(
  [Parameter(Mandatory = $true)]
  [string]$TenancyOcid,

  [string]$UserOcid = "ocid1.user.oc1..aaaaaaaas6aq6wy4x7rii3gnp3jnmngnesfflzavirnygy5faputtogi5vta",
  [string]$Region = "sa-saopaulo-1",
  [string]$KeyFile = "$env:USERPROFILE\.oci\oci_api_key.pem",
  [string]$ProjectRoot = (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent)
)

$ErrorActionPreference = "Stop"
Set-Location $ProjectRoot

$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
  [System.Environment]::GetEnvironmentVariable("Path", "User")

if (-not (Get-Command oci -ErrorAction SilentlyContinue)) {
  throw "OCI CLI não encontrado. Reinstale o MSI ou reinicie o terminal."
}

Write-Host "==> Calculando fingerprint..."
$fingerprint = py -3.12 -c @"
import hashlib
from pathlib import Path
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
pem = Path(r'$KeyFile').read_bytes()
key = serialization.load_pem_private_key(pem, password=None, backend=default_backend())
pub = key.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)
md5 = hashlib.md5(pub.strip()).hexdigest()
print(':'.join(a+b for a,b in zip(md5[0::2], md5[1::2])))
"@

$keyPath = $KeyFile -replace '\\', '/'
$ociDir = "$env:USERPROFILE\.oci"
if (-not (Test-Path $ociDir)) { New-Item -ItemType Directory -Path $ociDir | Out-Null }

$config = @"
[DEFAULT]
user=$UserOcid
fingerprint=$fingerprint
tenancy=$TenancyOcid
region=$Region
key_file=$keyPath
"@
Set-Content -Path "$ociDir\config" -Value $config -Encoding ascii
Write-Host "==> Config OCI salvo em $ociDir\config"

Write-Host "==> Testando API..."
oci iam region list --query "data[0].name" --raw-output | Out-Null
Write-Host "    Conexão OK"

# Atualiza .env local (gitignored)
$envFile = Join-Path $ProjectRoot ".env"
if (Test-Path $envFile) {
  $content = Get-Content $envFile -Raw
  $pairs = @{
    'OCI_REGION' = $Region
    'OCI_TENANCY_OCID' = $TenancyOcid
    'OCI_COMPARTMENT_OCID' = $TenancyOcid
    'OCI_USER_OCID' = $UserOcid
    'OCI_FINGERPRINT' = $fingerprint
  }
  foreach ($key in $pairs.Keys) {
    $val = $pairs[$key]
    if ($content -match "(?m)^$key=") {
      $content = $content -replace "(?m)^$key=.*", "$key=$val"
    } else {
      $content += "`n$key=$val"
    }
  }
  Set-Content -Path $envFile -Value $content.TrimEnd() -Encoding utf8
}

Write-Host "==> Provisionando VM Always Free..."
$bash = Get-Command bash -ErrorAction SilentlyContinue
if (-not $bash) {
  throw "Git Bash não encontrado. Instale Git for Windows ou use WSL."
}

$provisionEnv = @"
export OCI_REGION=$Region
export OCI_TENANCY_OCID=$TenancyOcid
export OCI_COMPARTMENT_OCID=$TenancyOcid
export OCI_SSH_KEY_FILE=$env:USERPROFILE/.ssh/id_ed25519_oracle.pub
"@
bash -lc "$provisionEnv && cd '$($ProjectRoot -replace '\\','/')' && bash scripts/oracle-cloud/00-provision-free-vm.sh"
$publicIp = Get-Content "$env:TEMP\app-audit-oracle-ip" -ErrorAction Stop
Write-Host "==> IP público: $publicIp"

Write-Host "==> Preparando .env de produção..."
bash -lc "cd '$($ProjectRoot -replace '\\','/')' && PUBLIC_IP=$publicIp bash scripts/oracle-cloud/04-prepare-oracle-env.sh"

Write-Host "==> Deploy remoto..."
bash -lc "cd '$($ProjectRoot -replace '\\','/')' && bash scripts/oracle-cloud/05-remote-deploy.sh $publicIp"

Write-Host ""
Write-Host "Deploy concluído!"
Write-Host "  Frontend: http://app-audit:3001"
Write-Host "  API:      http://app-audit:3000/health"
Write-Host ""
Write-Host "Adicione ao hosts: ${publicIp} app-audit"
