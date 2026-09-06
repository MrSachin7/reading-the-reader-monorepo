.PHONY: all assets audit clean distclean

all: main.pdf

# Regenerate the LaTeX macros and tables from the audited JSON summary.
assets:
	python3 analysis/build_paper_assets.py

# Recompute the evidence from the original exports, then regenerate the assets.
audit:
	python3 analysis/audit_evidence.py
	python3 analysis/build_paper_assets.py

main.pdf: main.tex bibliography.bib $(wildcard sections/*.tex) analysis/outputs/evidence-audit.json analysis/build_paper_assets.py
	python3 analysis/build_paper_assets.py
	latexmk -pdf -interaction=nonstopmode -halt-on-error -file-line-error -outdir=build main.tex
	cp build/main.pdf main.pdf

# Regenerate the sweep scatter plot (needs matplotlib; not required for the audit).
figures:
	python3 analysis/plot_sweep.py

clean:
	latexmk -c -outdir=build main.tex

distclean:
	rm -rf build
