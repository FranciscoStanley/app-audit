# Configura OCI CLI após baixar oci_api_key.pem
# Uso:
#   .\scripts\oracle-cloud\setup-oci-config.ps1 `
#     -TenancyOcid "ocid1.tenancy.oc1..aaaa" `
#     -UserOcid "ocid1.user.oc1..aaaa" `
#     -Fingerprint "aa:bb:cc:..."

param(
  [Parameter(Mandatory = $true)]
  [string]$TenancyOcid,

  [Parameter(Mandatory = $true)]
  [string]$UserOcid,

  [Parameter(Mandatory = $true)]
  [string]$Fingerprint,

  [string]$Region = "sa-saopaulo-1",
  [string]$KeyFile = "$env:USERPROFILE\.oci\oci_api_key.pem",
  [string]$ConfigFile = "$env:USERPROFILE\.oci\config"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $KeyFile)) {
  throw "Chave privada não encontrada: $KeyFile"
}

$ociDir = Split-Path $ConfigFile -Parent
if (-not (Test-Path $ociDir)) {
  New-Item -ItemType Directory -Path $ociDir -Force | Out-Null
}

$keyPath = $KeyFile -replace '\\', '/'

$config = @"
[DEFAULT]
user=$UserOcid
fingerprint=$Fingerprint
tenancy=$TenancyOcid
region=$Region
key_file=$keyPath
"@

Set-Content -Path $ConfigFile -Value $config -Encoding ascii

Write-Host "Config criado: $ConfigFile"
Write-Host "Região: $Region"
Write-Host ""
Write-Host "Teste com: oci iam region list"
Write-Host ""
Write-Host "Adicione ao .env do projeto:"
Write-Host "OCI_REGION=$Region"
Write-Host "OCI_TENANCY_OCID=$TenancyOcid"
Write-Host "OCI_COMPARTMENT_OCID=$TenancyOcid"
