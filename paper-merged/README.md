# Merged paper draft (v0.2, 2026-09-06)

The merged manuscript for the paper derived from the thesis *Reading the Reader: Adaptive Reading Systems: A Modular Software Architecture* (Sachin Baral and Satish Gurung, DTU, 2026).
Decision log: thesis data only (Option A, 2026-08-16); no new participants or sessions.

## Provenance of the merge

Three independent drafts were produced first and remain untouched for the record:

- `paper-fable/` supplied the skeleton: structure, motivation, contribution framing, figure set, related-work breadth, tables, and the writing conventions.
- `paper-sol/` supplied the correctness audit: no automatic fallback or heartbeat enforcement, decision evaluations rather than samples, latency claims scoped to the eight sessions, the failing reference-analyzer tests, and the analysis-loader reproducibility problem.
- `paper-astra/` supplied the data audit and the numbers backbone: the dependency-free audit script and asset generator (copied into `analysis/` and extended), the repeated derived-event finding, the two-text protocol, the unbalanced condition order, the final-metadata anomaly, the unmatched sweep runs, the ETRA formatting rules, and corrected bibliography metadata (published Kaltenberger et al., Ergonomics issue for Rummens and Beier, exact Ilyas et al. title).

Every quantitative claim in the body comes from `generated/results.tex` or a generated table, which are produced from `analysis/outputs/evidence-audit.json`; that JSON is produced from the original exports in `Experiments/data/` and the sweep files in `Frontend/experiments/context-displacement/results/`, with the SHA-256 hash of each input recorded.
Design constants (dwell thresholds, tolerances, capture interval) are taken from the source code.

## Build

```bash
make
```

`make` regenerates the LaTeX assets from the audited JSON, runs `latexmk` into the ignored `build/` directory, and copies the PDF to `main.pdf`.
`make audit` first recomputes the evidence from the original data (Python 3.10+, standard library only).
Requirements: TeX Live with `acmart`, `latexmk`, Python 3.10+.

## Format

One source, two layouts, selected in `main.tex` by whether `\reviewlayout` is defined:

- `make` (default) produces `main.pdf`, the two-column `sigconf` reading copy with numeric citations that the authors prefer to read and circulate.
- `make review` produces `main-review.pdf` in the ETRA review layout confirmed on the ETRA 2026 submission page: single-column `manuscript,review` with line numbers and author-year citations. ETRA also requires an abstract of at most 150 words (currently 143) and allows 14 pages for full papers excluding references; the review build currently runs about a page over, of which roughly half is the red author-facing blocks and the rest a final editorial trim once the supervisors have said what they want kept.

Wide floats (`widefigure`, `widetable`) span both columns in the reading copy and are ordinary floats in the review copy; `\narrowwidth` sizes single-column plots.
Add `anonymous` to the review class options for submission and remove the author-facing notes.

## Layout

- `main.tex`: class options, metadata, abstract, teaser, statements.
- `sections/01..06`: introduction, related work, platform, evaluation, discussion, conclusion.
- `generated/`: macros and tables written by `analysis/build_paper_assets.py`; never edit by hand.
- `analysis/`: `audit_evidence.py` (reads the exports, writes `analysis/outputs/`) and `build_paper_assets.py` (reads the audit JSON, writes `generated/`).
- `bibliography.bib`: entries carried over from the thesis bibliography plus verified additions. Never write an at-sign inside a comment in this file.
- `figures/`: the rig photo, the two screenshots, the sequence diagram (source `Master-Thesis-Report/Chapters/05_SystemDesign/adaptive-loop.mmd`), and two evaluation plots reused from `Experiments/analysis/` outputs. `sweep-overreposition.pdf` is regenerated here by `analysis/plot_sweep.py` (`make figures`, needs matplotlib) because the thesis version labelled its axes with the hook's sentence-anchor terms rather than the plotted word displacements.
- `outline.md`: the plan and the single-source-of-truth list of headline numbers.

## Writing conventions

British English, first-person plural, formal register, no contractions, no em dashes, one sentence per line in `.tex` source.
No citation without having read the source or carried it over from the verified thesis bibliography.

## Open items for the authors (also marked red in the PDF)

1. Ethics statement: who took part and in what capacity, how consent was obtained, and the applicable review or exemption determination.
2. Author list and order with the supervisors (Ashkan Tashk, Aqdus Ilyas, Per Baekgaard); confirm contact emails.
3. Acknowledgments: NNF grant number, collaborator thanks, ACM generative-AI disclosure.
4. Reading the Struggle thesis (Kraljevic and Desu): check submission status and cite in the Section 4.3 footnote if citable.
5. Availability: public artifact link; anonymise `Experiments/data/` file names (they carry participant first names) before pointing at the repository.
6. CCS concepts: regenerate with the ACM CCS tool before submission; re-verify the Partial/No ratings in the capability table against current primary documentation.
7. Repository hygiene, outside the paper: the `Eye-Movement-Analyzer` tests (8 of 8) fail against the current provider envelopes; the `Experiments/analysis` loader picks up the root-level advisory files and its README still says N=2. Neither affects the paper, which uses its own audit script, but both should be fixed before the repository is cited as an artifact.

## Corrections relative to the thesis text

The following thesis statements are not repeated in the paper because the code or the data contradict them: automatic fallback to the built-in strategy on provider disconnect; heartbeat-timeout enforcement; a single content item across sessions; "14,015 samples" for the decision path (they are evaluations); the collaborator code being used unmodified; the sweep's two restore versions being directly comparable trial by trial; and "every sample within budget" without scoping to the eight sessions.
