# Lista regiões inscritas e instruções para habilitar Canadá/EUA.
# Após inscrever no Console, o retry automático passará a tentar essas regiões.

$ErrorActionPreference = "Stop"
$env:OCI_CLI_SUPPRESS_FILE_PERMISSIONS_WARNING = "True"

$tenancy = $env:OCI_TENANCY_OCID
if (-not $tenancy) {
  $envPath = Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) ".env"
  if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
      if ($_ -match '^\s*OCI_TENANCY_OCID=(.+)$') { $tenancy = $matches[1].Trim() }
    }
  }
}
if (-not $tenancy) { throw "Defina OCI_TENANCY_OCID no .env" }

Write-Host "Regiões inscritas na sua tenancy:"
oci iam region-subscription list --tenancy-id $tenancy --output table

Write-Host ""
Write-Host "Para tentar Canadá (melhor chance de A1):"
Write-Host "  1. Console Oracle > canto superior direito > Region Management"
Write-Host "  2. Subscribe to region: ca-montreal-1 (ou ca-toronto-1)"
Write-Host "  3. Aguarde status READY (~1 min)"
Write-Host "  4. O script auto-retry detecta automaticamente — nada a alterar no .env"
Write-Host ""
Write-Host "Regiões comuns para A1 free tier:"
Write-Host "  ca-montreal-1, ca-toronto-1, us-ashburn-1, us-phoenix-1, uk-london-1"
