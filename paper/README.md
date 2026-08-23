# Paper draft: A Modular Platform for Real-Time, Context-Preserving Gaze-Adaptive Reading Experiments

(Earlier working title "Swappable Senses, Stable Contracts" is kept as a
commented alternative in `main.tex`.)

Fresh ETRA-style draft (2026-08-19) generated from the thesis and codebase,
written independently of the earlier `paper-fable/` and `paper-sol/` drafts.
Distinguishing choice: this draft includes a **dedicated webcam/facial-state
section** (Section 4) framed as work in progress, per the decision of
2026-08-19 (authors: Satish Gurung and Sachin Baral).

## Build

```bash
tectonic main.tex
```

or with TeX Live:

```bash
latexmk -pdf main.tex
```

Class is `acmart` `[sigconf,screen]`. For submission, switch to
`[sigconf,screen,review,anonymous]`, and check whether the target ETRA cycle
publishes through the PACM HCI track, which uses the single-column `acmsmall`
format (a one-line class change). Output: `main.pdf` (currently 7 pages).

## Layout

- `main.tex` — metadata, abstract, CCS/keywords, acknowledgments.
- `sections/01..07` — introduction, related work, platform, webcam WIP,
  evaluation, discussion, conclusion.
- `references.bib` — 31 entries copied verbatim from the thesis bibliography
  (`@thesis` converted to `@mastersthesis` for BibTeX) plus 5 new verified
  entries (Hutt 2020/2021, Mézière 2023, Lin 2022, D'Mello 2012).
- `figures/` — assets copied unmodified from `Master-Thesis-Report/`.

## Writing conventions (match the thesis)

British English, first-person plural, no contractions, no em dashes,
one sentence per line in `.tex` source. Every number traces to the thesis
evaluation chapter or `Experiments/analysis/outputs/`.

## Venue plan (researched 2026-08-19)

Primary: **ETRA 2027** (best topical fit; the 2026 cycle closed Nov 2025;
CFP expected autumn 2026 with a ~Nov deadline — watch etra.acm.org).
Rolling alternatives if earlier submission is wanted: IEEE TLT or
Computers & Education (reframe toward learning outcomes required).
CHI 2027 (deadline 2026-09-10) is considered too close to reach with a
properly revised draft.

## Open items (marked red in the PDF)

1. Consent/ethics statement for the eight recorded sessions.
2. NNF grant number + ACM generative-AI disclosure in acknowledgments.
3. Re-run `dotnet test` and confirm the exact backend test count (thesis
   says 100; the tree may contain 101).
4. Figure 5 legend denominators (45/62, 4/63) vs. text (45/66, 4/66) —
   reconcile against `Experiments/analysis` (likely trials with measurable
   residuals vs. all trials).
5. Public artifact URL, after anonymising `Experiments/data/` file names
   (they carry participant first names).
6. Author order + emails; decide whether supervisors join the author list.
7. Regenerate CCS concepts with the ACM tool.
8. Check whether the Kraljević & Desu "Reading the Struggle" thesis is now
   citable and add it to Section 5.3 if so.
