#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORT_DIR="$(cd "$SCRIPT_DIR/../Master-Thesis-Report" && pwd)"

command -v latexmk >/dev/null 2>&1 || {
  echo "latexmk was not found on PATH. Install a LaTeX distribution (e.g. MacTeX) before running this script." >&2
  exit 1
}

echo "==> Clean previous build artifacts"
(cd "$REPORT_DIR" && latexmk -C main.tex)

echo ""
echo "==> Compile thesis report"
(cd "$REPORT_DIR" && latexmk -xelatex -interaction=nonstopmode -file-line-error main.tex)

echo ""
echo "Build complete: $REPORT_DIR/main.pdf"
