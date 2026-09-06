.PHONY: all assets audit clean

all: main.pdf

assets:
	python3 analysis/build_paper_assets.py

audit:
	python3 analysis/audit_evidence.py
	python3 analysis/build_paper_assets.py

main.pdf: main.tex references.bib $(wildcard sections/*.tex) $(wildcard figures/*.tex) analysis/outputs/evidence-audit.json analysis/build_paper_assets.py
	python3 analysis/build_paper_assets.py
	latexmk -pdf -interaction=nonstopmode -halt-on-error -file-line-error -outdir=build main.tex
	cp build/main.pdf main.pdf

clean:
	latexmk -c -outdir=build main.tex
