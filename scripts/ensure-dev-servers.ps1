param(
    [int]$TimeoutSeconds = 90,
    [int]$PollIntervalSeconds = 2
)

$ErrorActionPreference = "Stop"

if ($TimeoutSeconds -le 0) {
    throw "TimeoutSeconds must be greater than 0."
}

if ($PollIntervalSeconds -le 0) {
    throw "PollIntervalSeconds must be greater than 0."
}

$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")

$routes = @(
    @{
        Name = "frontend"
        Url = "https://partner-up.localhost"
        Script = "dev:portless:frontend"
    },
    @{
        Name = "backend"
        Url = "https://api.partner-up.localhost"
        Script = "dev:portless:backend"
    }
)

function Assert-CommandAvailable {
    param(
        [Parameter(Mandatory = $true)]
        [string]$CommandName
    )

    if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
        throw "$CommandName is not available on PATH. Install it globally with: npm install -g $CommandName"
    }
}

function Get-PortlessListText {
    $output = & portless list 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "portless list failed:`n$($output -join "`n")"
    }

    return $output -join "`n"
}

function Get-MissingRoutes {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RouteListText
    )

    $missing = @()
    foreach ($route in $routes) {
        if ($RouteListText -notmatch [regex]::Escape($route.Url)) {
            $missing += $route
        }
    }

    return $missing
}

function Start-DevServer {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Route
    )

    $logDir = Join-Path $repoRoot ".codex-tmp/dev-servers"
    New-Item -ItemType Directory -Force -Path $logDir | Out-Null

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $stdoutPath = Join-Path $logDir "$stamp-$($Route.Name).out.log"
    $stderrPath = Join-Path $logDir "$stamp-$($Route.Name).err.log"
    $command = "pnpm run $($Route.Script)"

    Write-Host "Starting $($Route.Name) dev server through portless: $($Route.Url)"
    Write-Host "Logs: $stdoutPath"

    $powershellCommand = Get-Command pwsh -ErrorAction SilentlyContinue
    if (-not $powershellCommand) {
        $powershellCommand = Get-Command powershell -ErrorAction Stop
    }

    Start-Process `
        -FilePath $powershellCommand.Source `
        -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $command) `
        -WorkingDirectory $repoRoot `
        -WindowStyle Hidden `
        -RedirectStandardOutput $stdoutPath `
        -RedirectStandardError $stderrPath `
        -PassThru | Out-Null
}

Assert-CommandAvailable -CommandName "portless"
Assert-CommandAvailable -CommandName "pnpm"

$initialRouteList = Get-PortlessListText
$missingRoutes = @(Get-MissingRoutes -RouteListText $initialRouteList)

if ($missingRoutes.Count -eq 0) {
    Write-Host "Frontend and backend dev servers are already registered:"
    foreach ($route in $routes) {
        Write-Host "  $($route.Url)"
    }
    exit 0
}

foreach ($route in $missingRoutes) {
    Start-DevServer -Route $route
}

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
do {
    Start-Sleep -Seconds $PollIntervalSeconds

    $currentRouteList = Get-PortlessListText
    $missingRoutes = @(Get-MissingRoutes -RouteListText $currentRouteList)

    if ($missingRoutes.Count -eq 0) {
        Write-Host "Frontend and backend dev servers are ready:"
        foreach ($route in $routes) {
            Write-Host "  $($route.Url)"
        }
        exit 0
    }
} while ((Get-Date) -lt $deadline)

$missingNames = ($missingRoutes | ForEach-Object { $_.Name }) -join ", "
throw "Timed out waiting for dev server route(s): $missingNames"
