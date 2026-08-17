# ETRA Paper Draft

Draft v0.1 (2026-08-16) of the paper derived from the thesis, per the plan in [outline.md](outline.md).
Decision log: thesis data only (Option A, decided 2026-08-16); no new participants or sessions.

## Build

```bash
latexmk -pdf main.tex
```

Requires TeX Live with `acmart` (present in the local TeX Live 2026).
Output: `main.pdf` (currently 9 pages, ACM sigconf two-column).

## Layout

- `main.tex`: class options, metadata, abstract, teaser, statements. Switch to `[sigconf,screen,review,anonymous]` for submission.
- `sections/01..06`: introduction, related work, platform, evaluation, discussion, conclusion.
- `bibliography.bib`: entries copied from the thesis bibliography (types converted for BibTeX) plus four new, individually verified entries. Never write an at-sign inside comments in this file; BibTeX parses it as an entry start.
- `figures/`: assets copied from the thesis (evaluation PDFs regenerate from `Experiments/analysis/`; the sequence diagram from `Master-Thesis-Report/Chapters/05_SystemDesign/adaptive-loop.mmd`).

## Writing conventions (match the thesis)

- British English, first-person plural, formal register, no contractions.
- No em dashes anywhere.
- One sentence per line in `.tex` source.
- Every number must match the single-source-of-truth list in `outline.md` and trace to `Experiments/analysis` outputs or the thesis evaluation chapter. Reviewers check number consistency hard.
- No citation without having read the source or carried it over from the verified thesis bibliography.

## Open items (authors only), also marked red in the PDF

1. Ethics statement: the actual consent arrangement for the eight sessions.
2. Author list and order (supervisors: Ashkan Tashk, Aqdus Ilyas, Per Baekgaard); confirm contact emails.
3. Acknowledgments: NNF grant number, collaborator thanks, ACM generative-AI disclosure.
4. Reading the Struggle thesis (Kraljevic and Desu): check submission status and cite in the Section 4.3 footnote if citable.
5. Verify the exact title of the Ilyas et al. ETRA 2025 entry against the ACM DL (page currently bot-walled).
6. Availability: public artifact link; anonymise `Experiments/data/` file names (they carry participant first names) before pointing at the repo.
7. CCS concepts: regenerate with the ACM CCS tool before submission.
8. Cosmetic: BibTeX warns about missing publisher/address/pages on some ACM entries; fill for camera-ready. The Figure 3 sequence diagram occupies a full page; consider a more compact remake if space gets tight.

## Status

Complete first draft of all sections with final numbers; ready for author read-through, then the outline plus draft can go to Ashkan, Per, and Aqdus for feedback.
