# Notes accompanying the first manuscript draft

The complete draft is [main.pdf](main.pdf); its editable entry point is [main.tex](main.tex). It was written independently from the thesis, code, raw exports, and primary literature. The initial manuscript did not consult other paper folders. A later revision, explicitly requested by the authors, compared the LaTeX preambles and first-page layouts of `paper-fable` and `paper-sol` for formatting only; their manuscript content was not reused. The `paper` folder was not consulted.

## Decisions made in this draft

The central contribution is a research instrument with configurable analysis, researcher-controlled proposals and interventions, and an inspectable session record. Context preservation supplies an implementation case and a source of technical findings. Reading benefit and complete gaze-to-display latency are not claims of the paper. This is a full-paper starting point rather than an artificially compressed short paper.

The behavioural comparison is retained in an appendix with participant counts, missingness, estimator definitions, and duplicate-payload sensitivity. The geometry table reports the saved runs separately and makes the cross-version matching problem explicit. Current-code capabilities are distinguished from the historical paths exercised by the recordings.

## Facts needed from the authors before submission

1. **Participant procedure:** who took part in what capacity; how recruitment, information, and consent occurred; the institutional review or exemption determination, if any. The thesis's engineering-only ethics account does not adequately describe its recorded human sessions. No approval or exemption has been invented.
2. **Study protocol:** text/condition assignment, order, intervention selection and timing, any practice period, questionnaire/quiz procedure, and which parts of session duration represent reading. The exports show two texts and unequal intervention sequences.
3. **Historical versions:** the code commit, browser, fonts, operating system, provider parameters and connector cadence for the eight sessions, advisory run, and each geometry sweep. The audit hashes identify files, not execution environments.
4. **Event identity and provider history:** explain repeated derived-event payloads and the final advisory configuration in P3/OFF. Establish a validated event-identity rule before using event-rate measures as primary evidence.
5. **Integration provenance:** pin the collaborator pipeline's upstream version and document the connector and transport changes. The current evidence is not an independent third-party developer evaluation.
6. **Authorship and release:** settle coauthors, order, affiliations, corresponding contact, acknowledgements/funding, and the scope of any public artifact or participant-data release. The two thesis authors are provisional in this internal draft; no supervisor has been silently assigned authorship.

These gaps do not prevent reading and revising the draft. They do prevent treating it as publication-ready methods reporting.

## Source and bibliography decisions

- Jensen et al. is cited for intervention/context-preservation lineage, without importing its effect estimates into this evaluation.
- Rummens and Beier is cited as *Ergonomics* 69(7), 2026, with its 2025 online-first date recorded. Only publisher-accessible abstract/metadata claims are used; no inaccessible full methods are reconstructed.
- The suggested line-assignment preprint now has a published version: [Kaltenberger et al., PACM CGIT 9(2)](https://mcml.ai/publications/kct%2B26/), DOI [10.1145/3803540](https://doi.org/10.1145/3803540). The draft cites that version.
- Medan and Pelman's paper is identified conservatively by its title and conference-hosted URL, without invented proceedings pagination or DOI.
- PsychoPy and OpenSesame are positioned as established extensible experiment software. There is no unsupported feature-ranking matrix or priority claim.
- Saunders and Woods provides a primary methodological reference for measuring the visible endpoint of a gaze-contingent loop.

The [review](review.md), [code map](code-map.md), and [audited outputs](analysis/outputs/evidence-audit.json) preserve the detailed evidence trail. The [planning brief](planning-brief.md) is the earlier review-stage proposal; the manuscript is the current drafting artifact.
