Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serviceRoot = Split-Path -Parent $scriptDir
$venvPython = Join-Path $serviceRoot ".venv\Scripts\python.exe"

function Get-PythonCommand {
    if (Test-Path $venvPython) {
        return $venvPython
    }

    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if ($null -ne $pythonCommand) {
        return $pythonCommand.Source
    }

    throw "Python was not found. Install Python first, then rerun this script."
}

$python = Get-PythonCommand

if (-not (Test-Path $venvPython)) {
    Write-Host "Creating local virtual environment for Decision-Maker..."
    & $python -m venv (Join-Path $serviceRoot ".venv")
    $python = $venvPython
}

Write-Host "Installing Decision-Maker package into local virtual environment..."
& $python -m pip install -e $serviceRoot | Out-Host

Push-Location $serviceRoot
try {
    Write-Host "Starting mock Decision-Maker service..."
    & $python -m decision_maker
}
finally {
    Pop-Location
}
