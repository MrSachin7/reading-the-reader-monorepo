.PHONY: all review assets audit figures clean distclean

# Default: two-column sigconf reading copy -> main.pdf
all: main.pdf

# ETRA single-column review manuscript -> main-review.pdf (same sources, \reviewlayout defined)
review: main-review.pdf

main-review.pdf: main.tex bibliography.bib $(wildcard sections/*.tex) analysis/outputs/evidence-audit.json analysis/build_paper_assets.py
	python3 analysis/build_paper_assets.py
	latexmk -pdf -interaction=nonstopmode -halt-on-error -file-line-error -usepretex -pretex='\def\reviewlayout{1}' -outdir=build-review main.tex
	cp build-review/main.pdf main-review.pdf

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
	latexmk -c -outdir=build-review main.tex

distclean:
	rm -rf build build-review
