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

## Overleaf sync

This folder is mirrored to the Overleaf project `6aa8426de75b60b623d07ac4` through Overleaf's Git integration, linked with `git subtree` (remote `overleaf`, prefix `paper-merged`).
Commit locally first, then `make overleaf-push` sends the commits to Overleaf and `make overleaf-pull` merges supervisor edits made in the editor back into the monorepo.
Overleaf comments and tracked-change markers are not part of the Git export; read them in the editor's review panel (tracked insertions do arrive as plain text).
One-time setup on a new machine: generate a Git authentication token in Overleaf account settings and run `git clone https://git.overleaf.com/6aa8426de75b60b623d07ac4` once with username `git` and the token as password so the keychain stores it.

## Format

One source, two layouts, selected in `main.tex` by whether `\readinglayout` is defined:

- `make` (default, and what Overleaf compiles) produces `main.pdf`, the ETRA 2027 submission format: single-column `manuscript,review,anonymous` with line numbers and author-year citations. ETRA allows 14 pages for full papers excluding references and an abstract of at most 150 words. This is the file that is submitted and the one to review.
- `make reading` produces `main-reading.pdf`, an optional two-column `sigconf` copy with author names that is easier to read on screen. It is never submitted.

Wide floats (`widefigure`, `widetable`) are ordinary floats in the submission copy and span both columns in the reading copy; `\narrowwidth` sizes single-column plots.
For the camera-ready, remove `review` and `anonymous` from the class options.

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

1. Ethics statement: written from the authors' account (2026-09-23); confirm the consent form (written or verbal) and the no-review determination, marked CONFIRM in `main.tex`.
2. Author list and order with the supervisors (Ashkan Tashk, Aqdus Ilyas, Per Baekgaard); confirm contact emails; thank the supervisors in `acks` if they are not co-authors.
3. Reading the Struggle thesis (Kraljevic and Desu): cited in Section 4.3 from the DTU Findit record (2026-09-29).
4. CCS concepts: regenerate with the ACM CCS tool before submission; re-verify the Partial/No ratings in the capability table against current primary documentation.
5. Length: as of 2026-10-07 the submission build is exactly 14 pages before references; keep it there.
6. Matched sweep: `Frontend/experiments/context-displacement/sweep-matched.mjs` runs OFF, ON-original, and ON-revised from the same anchor in one browser session; run it and replace the two unmatched runs in Section 4.4.
7. Repository hygiene, outside the paper: the `Eye-Movement-Analyzer` tests (8 of 8) fail against the current provider envelopes. The names in the session exports were removed on 2026-09-23 (files renamed to `P1`..`P5`, name and eye-condition fields scrubbed), but the earlier commits still carry them; rewrite history or squash before citing the repository as an artifact.

## Corrections relative to the thesis text

The following thesis statements are not repeated in the paper because the code or the data contradict them: automatic fallback to the built-in strategy on provider disconnect; heartbeat-timeout enforcement; a single content item across sessions; "14,015 samples" for the decision path (they are evaluations); the collaborator code being used unmodified; the sweep's two restore versions being directly comparable trial by trial; and "every sample within budget" without scoping to the eight sessions.
