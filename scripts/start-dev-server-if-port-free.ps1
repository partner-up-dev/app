param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("web", "frontend", "backend")]
    [string]$Service
)

$ErrorActionPreference = "Stop"

function Get-ListeningPortOwner {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port
    )

    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop
        if ($connections) {
            return $connections |
                Select-Object -First 1 -Property LocalAddress, LocalPort, OwningProcess
        }
    } catch {
        $lines = netstat -ano -p tcp | Select-String -Pattern "LISTENING"
        foreach ($line in $lines) {
            $fields = $line.Line.Trim() -split "\s+"
            if ($fields.Length -lt 5) {
                continue
            }

            $localAddress = $fields[1]
            if ($localAddress -match "[:.]$Port$") {
                return [pscustomobject]@{
                    LocalAddress = $localAddress
                    LocalPort = $Port
                    OwningProcess = $fields[4]
                }
            }
        }
    }

    return $null
}

function Import-DotEnv {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        Write-Warning "Env file not found: $Path"
        return
    }

    foreach ($rawLine in Get-Content -LiteralPath $Path) {
        $line = $rawLine.Trim()
        if ($line.Length -eq 0 -or $line.StartsWith("#")) {
            continue
        }

        $separatorIndex = $line.IndexOf("=")
        if ($separatorIndex -le 0) {
            continue
        }

        $key = $line.Substring(0, $separatorIndex).Trim()
        if ($key -notmatch "^[A-Za-z_][A-Za-z0-9_]*$") {
            continue
        }

        $value = $line.Substring($separatorIndex + 1).Trim()
        if (
            ($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))
        ) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")

$serviceConfig = switch ($Service) {
    { $_ -in @("web", "frontend") } {
        @{
            Name = "web"
            Port = 4001
            Command = "pnpm"
            Args = @("run", "dev:web")
            EnvFile = $null
        }
    }
    "backend" {
        @{
            Name = "backend"
            Port = 4002
            Command = "pnpm"
            Args = @("run", "dev:backend")
            EnvFile = Join-Path $repoRoot "apps/backend/.env"
        }
    }
}

$portOwner = Get-ListeningPortOwner -Port $serviceConfig.Port
if ($portOwner) {
    $processLabel = "PID $($portOwner.OwningProcess)"
    try {
        $process = Get-Process -Id $portOwner.OwningProcess -ErrorAction Stop
        $processLabel = "$processLabel ($($process.ProcessName))"
    } catch {
    }

    Write-Host "$($serviceConfig.Name) dev server port $($serviceConfig.Port) is already in use by $processLabel."
    Write-Host "Skipping duplicate startup."
    exit 0
}

if ($serviceConfig.EnvFile) {
    Import-DotEnv -Path $serviceConfig.EnvFile
}

Write-Host "Starting $($serviceConfig.Name) dev server on port $($serviceConfig.Port)..."
Push-Location -LiteralPath $repoRoot
try {
    & $serviceConfig.Command @($serviceConfig.Args)
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
