#!/usr/bin/env bash
# Re-render all Mermaid (.mmd) sources to vector PDF for the thesis.
#
# Uses mermaid-cli (mmdc) with:
#   -c mermaid-config.json : larger fonts (legible after \linewidth scaling)
#   --pdfFit               : crop the PDF page to the diagram (no Letter-page
#                            whitespace), so the diagram fills \linewidth and
#                            its text stays readable (supervisor feedback).
#
# Requires: npm i -g @mermaid-js/mermaid-cli
# Run from the Master-Thesis-Report directory: ./render-diagrams.sh
set -euo pipefail
cd "$(dirname "$0")"

CONFIG="mermaid-config.json"

while IFS= read -r -d '' mmd; do
  pdf="${mmd%.mmd}.pdf"
  echo "rendering $mmd -> $pdf"
  mmdc -i "$mmd" -o "$pdf" -c "$CONFIG" --pdfFit
done < <(find Chapters -name '*.mmd' -print0 | sort -z)

echo "done."
