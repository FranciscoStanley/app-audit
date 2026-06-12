# Proteção endurecida na branch padrão de todos os repositórios do usuário.
$ErrorActionPreference = "Continue"
$owner = "FranciscoStanley"

$repoJson = gh repo list $owner --limit 200 --json name,defaultBranchRef
$repos = $repoJson | ConvertFrom-Json
if ($repos -isnot [array]) { $repos = @($repos) }

$results = New-Object System.Collections.Generic.List[object]

function Write-GhJson([object]$data) {
    $path = Join-Path $env:TEMP ("gh-bp-{0}.json" -f [guid]::NewGuid().ToString("N"))
    $data | ConvertTo-Json -Depth 10 | Set-Content -Path $path -Encoding UTF8
    return $path
}

foreach ($repo in $repos) {
    $name = [string]$repo.name
    $branch = [string]$repo.defaultBranchRef.name

    if ([string]::IsNullOrWhiteSpace($branch)) {
        $results.Add([pscustomobject]@{ Repo = $name; Branch = ""; Status = "skipped"; Detail = "sem branch padrão" })
        continue
    }

    $checks = New-Object System.Collections.Generic.List[object]
    try {
        $lines = @(gh api "repos/$owner/$name/commits/$branch/check-runs" --jq '.check_runs[] | select(.app.slug == "github-actions") | {context: .name, integration_id: .app.id}' 2>$null)
        $seen = @{}
        foreach ($line in $lines) {
            if ([string]::IsNullOrWhiteSpace($line)) { continue }
            $c = $line | ConvertFrom-Json
            if (-not $seen.ContainsKey($c.context)) {
                $seen[$c.context] = $true
                $checks.Add(@{ context = $c.context; integration_id = [int]$c.integration_id })
            }
        }
    } catch {}

    $classic = @{
        enforce_admins = $true
        required_pull_request_reviews = @{
            dismiss_stale_reviews = $true
            require_code_owner_reviews = $false
            required_approving_review_count = 1
            require_last_push_approval = $false
        }
        restrictions = $null
        required_linear_history = $false
        allow_force_pushes = $false
        allow_deletions = $false
        required_conversation_resolution = $true
        lock_branch = $false
        allow_fork_syncing = $false
    }

    if ($checks.Count -gt 0) {
        $classicChecks = @($checks | ForEach-Object { @{ context = $_.context; app_id = $_.integration_id } })
        $classic.required_status_checks = @{ strict = $true; checks = $classicChecks }
    }

    $classicPath = $null
    try {
        $classicPath = Write-GhJson $classic
        gh api "repos/$owner/$name/branches/$branch/protection" -X PUT --input $classicPath 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "proteção clássica falhou (exit $LASTEXITCODE)" }

        gh api "repos/$owner/$name/branches/$branch/protection/required_signatures" -X POST 2>&1 | Out-Null
        $sigOk = $LASTEXITCODE -eq 0

        $detail = "PR(1), admins, GPG$(if (-not $sigOk) { '(parcial)' }), checks=$($checks.Count)"
        $results.Add([pscustomobject]@{ Repo = $name; Branch = $branch; Status = "ok"; Detail = $detail })
    } catch {
        $results.Add([pscustomobject]@{ Repo = $name; Branch = $branch; Status = "error"; Detail = $_.Exception.Message })
    } finally {
        if ($classicPath -and (Test-Path $classicPath)) { Remove-Item -Path $classicPath -Force }
    }
}

$results | Sort-Object Status, Repo | Format-Table -AutoSize
$ok = @($results | Where-Object Status -eq 'ok').Count
$skip = @($results | Where-Object Status -eq 'skipped').Count
$err = @($results | Where-Object Status -eq 'error').Count
Write-Host "`nResumo: ok=$ok skipped=$skip error=$err"

if ($err -gt 0) {
    Write-Host "`nFalhas:"
    $results | Where-Object Status -eq 'error' | ForEach-Object { Write-Host " - $($_.Repo): $($_.Detail)" }
}
