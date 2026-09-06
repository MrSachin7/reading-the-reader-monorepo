# Formatting basis

Checked 6 September 2026. `main.pdf` is an internal full-paper draft in ACM's **single-column review manuscript** layout. It retains the thesis authors' names for discussion and does not assert submission or acceptance.

The [official ETRA 2026 submission instructions](https://etra.acm.org/2026/submissionprocess.html) specify `manuscript,review,anonymous`, author-year citations, embedded fonts, and an abstract of at most 150 words. The single-column limits are 14 pages for full papers and 8 for short papers, excluding references. Accepted full papers use PACM HCI or PACM CGIT production styles; short papers use conference proceedings. Therefore, a two-column `sigconf` layout is not the review format prescribed by these instructions. The [ETRA 2027 landing page](https://etra.acm.org/2027/) was available, but its corresponding submission-process page did not provide usable instructions when checked. The 2026 rules are a documented drafting baseline, not a claim about final 2027 requirements.

The [ACM-authored primary template on Overleaf](https://www.overleaf.com/latex/templates/acm-conference-proceedings-primary-article-template/wbvnghjbzwpc) also distinguishes the review manuscript from the final production layout. This draft uses the installed official `acmart` class, version 2.16 (27 August 2025), with its standard Letter paper size, typefaces, margins, and heading hierarchy. The online template lists version 2.19; update and recheck the required class version before submission. The class was not modified or copied from another paper folder.

Implementation choices:

- `manuscript,review,screen,nonacm`: review line numbers and a screen-readable PDF; `nonacm` suppresses publication-rights boilerplate in this unpublished draft.
- `\citestyle{acmauthoryear}` with `ACM-Reference-Format.bst`: author-year citations and a real BibTeX bibliography.
- A 145-word abstract, numbered sections, vector architecture figure with a text description, and result tables generated from the independent audit.
- No invented conference assignment, DOI, ISBN, acceptance date, author email, or rights statement.

The [ETRA 2026 call](https://etra.acm.org/2026/cfp.html) also requests a short privacy/ethics statement and disclosure of LLM use. Both are present. Actual participant-procedure facts remain explicitly unresolved; formatting compliance does not resolve that scientific reporting issue.

Before blind submission, confirm the current track instructions and author list, add `anonymous`, remove internal drafting notes, verify PDF metadata and artifact anonymity, and account for appendices in the applicable page budget. The current PDF is for author review, not a submission-ready certification.
