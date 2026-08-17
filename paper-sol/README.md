# Reading the Reader paper draft

This directory contains the anonymous ACM/ETRA-style manuscript source for:

> Reading the Reader: An Auditable, Modular Platform for Real-Time Gaze-Contingent Reading Experiments

Build it from this directory with:

```sh
latexmk -pdf -interaction=nonstopmode -halt-on-error main.tex
```

The manuscript reuses selected evaluation figures and bibliography entries from
`../Master-Thesis-Report/`. Paper-specific references are in `references.bib`.

Red draft notes mark three items that must be resolved before external circulation:

- approved recruitment, consent, ethics, and data-reuse wording;
- a pinned, matched rerun of the context-restoration benchmark;
- an institutionally approved privacy and artifact statement.

The reviewed PDF is exported to
`../output/pdf/reading-the-reader-paper-draft.pdf`.
