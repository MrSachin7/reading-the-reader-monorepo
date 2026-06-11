param()

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ReportDir = Join-Path $ScriptDir ".." "Master-Thesis-Report" | Resolve-Path

# Check if latexmk is available
$LatexmkPath = Get-Command latexmk -ErrorAction SilentlyContinue
if (-not $LatexmkPath) {
  Write-Error "latexmk was not found on PATH. Install a LaTeX distribution (e.g. MiKTeX or TeX Live) before running this script."
  exit 1
}

Write-Host "==> Clean previous build artifacts"
Push-Location $ReportDir
try {
  latexmk -C main.tex
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to clean build artifacts"
    exit $LASTEXITCODE
  }
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "==> Compile thesis report"
Push-Location $ReportDir
try {
  latexmk -xelatex -interaction=nonstopmode -file-line-error main.tex
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to compile thesis report"
    exit $LASTEXITCODE
  }
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "Build complete: $ReportDir/main.pdf"
