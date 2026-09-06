# Formatting basis

Revised 6 September 2026. The current PDF is an internal full-paper draft in ACM's **two-column conference layout**, as requested by the authors. It retains the thesis authors' names for discussion and does not assert submission or acceptance. This revision replaces the earlier single-column review layout.

The authors subsequently requested a comparison with the other drafts' formatting. Their LaTeX preambles and first-page layouts confirmed that both use the `sigconf` family. Only layout informed this revision; the independently written manuscript, bibliography, and audited evidence remain the basis of this paper.

The [ACM-authored primary template on Overleaf](https://www.overleaf.com/latex/templates/acm-conference-proceedings-primary-article-template/wbvnghjbzwpc) distinguishes the review manuscript from the production layout. This draft uses the installed official `acmart` class, version 2.16 (27 August 2025), with its standard Letter paper size, typefaces, margins, two-column body, and heading hierarchy. The online template listed version 2.19 when checked; update and recheck the required class version before submission. The class was not modified or copied from another paper folder.

Implementation choices:

- `sigconf,screen,nonacm`: two-column conference typography without review line numbers or publication-rights boilerplate.
- Standard running author/title headers and page numbers; black clickable citations and cross-references.
- Natural vertical spacing via `\raggedbottom`, avoiding stretched gaps between paragraphs and headings. A small `\emergencystretch` prevents long technical phrases from overflowing the narrow columns without changing the margins or font size.
- A full-width vector architecture figure and full-width session/timing tables. Geometry and participant tables use compact column arrangements that retain the audited values.
- `\citestyle{acmauthoryear}` with `ACM-Reference-Format.bst`: author-year citations and a real BibTeX bibliography.
- A 145-word abstract, numbered sections, and a text description for the architecture figure.
- No invented DOI, ISBN, acceptance date, author email, or rights statement.

## Submission background

The [official ETRA 2026 submission instructions](https://etra.acm.org/2026/submissionprocess.html), checked during the initial formatting research, specify `manuscript,review,anonymous`, author-year citations, embedded fonts, and an abstract of at most 150 words. The single-column limits are 14 pages for full papers and 8 for short papers, excluding references. Accepted full papers use PACM HCI or PACM CGIT production styles; short papers use conference proceedings. The [ETRA 2027 landing page](https://etra.acm.org/2027/) was available, but its corresponding submission-process page did not provide usable instructions when checked. The current two-column PDF is the authors' preferred reading copy; select the required submission layout when the track and current instructions are confirmed. Its eight-page count is not an assertion of eligibility for an eight-page submission limit in another layout.

The [ETRA 2026 call](https://etra.acm.org/2026/cfp.html) also requests a short privacy/ethics statement and disclosure of LLM use. Both are present. Actual participant-procedure facts remain explicitly unresolved.

Before blind submission, confirm the current track instructions and author list, select the required class options, remove internal drafting notes, verify PDF metadata and artifact anonymity, and account for appendices in the applicable page budget.
