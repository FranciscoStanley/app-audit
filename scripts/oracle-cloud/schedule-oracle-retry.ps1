# Agenda retry automático a cada 1 hora até criar VM e fazer deploy.
# Uso: .\scripts\oracle-cloud\schedule-oracle-retry.ps1
# Remove: Unregister-ScheduledTask -TaskName "AppAudit-Oracle-Retry" -Confirm:$false

$ErrorActionPreference = "Stop"
$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$Script = Join-Path $Root "scripts\oracle-cloud\auto-retry-oracle.ps1"
$TaskName = "AppAudit-Oracle-Retry"

if (-not (Test-Path $Script)) {
  throw "Script não encontrado: $Script"
}

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Script`""

$trigger = New-ScheduledTaskTrigger `
  -Once `
  -At (Get-Date).AddMinutes(2) `
  -RepetitionInterval (New-TimeSpan -Hours 1) `
  -RepetitionDuration (New-TimeSpan -Days 7)

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 2)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Tenta criar VM Oracle A1 (multi-região) e deploy app-audit a cada hora" `
  -Force | Out-Null

Write-Host "Tarefa agendada: $TaskName"
Write-Host "  - Primeira execução: em ~2 minutos"
Write-Host "  - Repete: a cada 1 hora (por 7 dias)"
Write-Host "  - Log: $Root\logs\oracle-retry.log"
Write-Host ""
Write-Host "Executar agora manualmente:"
Write-Host "  .\scripts\oracle-cloud\auto-retry-oracle.ps1"
Write-Host ""
Write-Host "Cancelar agendamento:"
Write-Host "  Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
