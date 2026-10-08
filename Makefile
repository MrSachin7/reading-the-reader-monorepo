.PHONY: all reading assets audit figures clean distclean overleaf-pull overleaf-push

# Default: ETRA submission format (single column, line numbers, anonymous) -> main.pdf
all: main.pdf

# Optional two-column reading copy with author names -> main-reading.pdf (same sources, \readinglayout defined)
reading: main-reading.pdf

main-reading.pdf: main.tex bibliography.bib $(wildcard sections/*.tex) analysis/outputs/evidence-audit.json analysis/build_paper_assets.py
	python3 analysis/build_paper_assets.py
	latexmk -pdf -interaction=nonstopmode -halt-on-error -file-line-error -usepretex -pretex='\def\readinglayout{1}' -outdir=build-reading main.tex
	cp build-reading/main.pdf main-reading.pdf

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
	latexmk -c -outdir=build-reading main.tex

distclean:
	rm -rf build build-reading

# Overleaf sync (run from anywhere; the targets cd to the monorepo root).
# The Overleaf project is the "overleaf" git remote, linked to this folder with git subtree.
# Comments and tracked-change markers do not travel through git; read them in the Overleaf editor.
overleaf-pull:
	cd $(dir $(realpath $(lastword $(MAKEFILE_LIST))))/.. && git subtree pull --prefix=paper-merged overleaf main -m "Merge Overleaf changes into paper-merged"

overleaf-push:
	cd $(dir $(realpath $(lastword $(MAKEFILE_LIST))))/.. && git subtree push --prefix=paper-merged overleaf main
