param(
    [string]$BackendUrl = "http://localhost:5190",
    [int]$FrontendPort = 3000,
    [switch]$Install,
    [switch]$OpenBrowser
)

$ErrorActionPreference = "Stop"

function ConvertTo-WebSocketUrl {
    param([string]$Url)

    if ($Url.StartsWith("https://")) {
        return $Url.Replace("https://", "wss://") + "/ws"
    }

    return $Url.Replace("http://", "ws://") + "/ws"
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendDir = Join-Path $repoRoot "Frontend"
$backendDir = Join-Path $repoRoot "Backend"
$backendProject = Join-Path $backendDir "src\ReadingTheReader.WebApi\ReadingTheReader.WebApi.csproj"
$BackendUrl = $BackendUrl.TrimEnd("/")
$apiBaseUrl = "$BackendUrl/api"
$wsUrl = ConvertTo-WebSocketUrl $BackendUrl

if (-not (Test-Path $frontendDir)) {
    throw "Frontend directory not found at $frontendDir"
}

if (-not (Test-Path $backendProject)) {
    throw "Backend project not found at $backendProject"
}

if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    throw "dotnet was not found on PATH. Install the .NET SDK before running this script."
}

if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
    throw "bun was not found on PATH. Install Bun before running this script."
}

if ($Install) {
    Push-Location $frontendDir
    try {
        bun install
    }
    finally {
        Pop-Location
    }

    Push-Location $backendDir
    try {
        dotnet restore ".\reading-the-reader-backend.sln"
    }
    finally {
        Pop-Location
    }
}

Write-Host "Starting backend at $BackendUrl"
Write-Host "Starting frontend at http://localhost:$FrontendPort"
Write-Host "Frontend API base URL: $apiBaseUrl"
Write-Host "Frontend WebSocket URL: $wsUrl"

$backendCommand = @"
`$Host.UI.RawUI.WindowTitle = 'Reading the Reader - Backend'
`$env:ASPNETCORE_ENVIRONMENT = 'Development'
dotnet run --project "$backendProject" --urls "$BackendUrl"
"@

$frontendCommand = @"
`$Host.UI.RawUI.WindowTitle = 'Reading the Reader - Frontend'
`$env:NEXT_PUBLIC_API_BASE_URL = '$apiBaseUrl'
`$env:NEXT_PUBLIC_WS_URL = '$wsUrl'
Set-Location "$frontendDir"
bun dev --port $FrontendPort
"@

Start-Process powershell -ArgumentList @("-NoExit", "-Command", $backendCommand)
Start-Process powershell -ArgumentList @("-NoExit", "-Command", $frontendCommand)

if ($OpenBrowser) {
    Start-Process "http://localhost:$FrontendPort"
}
