# ETRA Paper Outline (v0.2, merged 2026-09-06; originally drafted 2026-08-16)

Status: framing locked and Option A decided (2026-08-16): the thesis is submitted and graded, no further data collection or participants; the paper uses thesis data only. A full v0.1 draft now exists in this directory (see README.md). This outline remains the reference for structure and the single source of truth for numbers.

Venue assumption: ACM ETRA, drafted in the ACM `acmart` template from day one. We draft toward the full-paper track and keep the short-paper track as the fallback (cutting is easy, stretching is not). Structural model: Jensen et al., ETRA 2025, DOI 10.1145/3715669.3725897 (thesis bib key `jensen2025context`).

## Working title

**Adapt Without Losing the Reader: A Modular Two-Screen Platform for Gaze-Contingent Reading Experiments**

Alternatives:
- A Researcher-Operated Platform for Real-Time, Context-Preserving Typographic Interventions
- From Prototype to Instrument: Modular Infrastructure for Gaze-Adaptive Reading Research

(We avoid leading with "Reading the Reader:" because it is the umbrella project name, not this system's claim, and ETRA 2025 already carried a similarly named paper.)

## The single contribution (every section serves this)

A modular, researcher-operated two-screen platform in which sensing, eye-movement analysis, decision strategy, and intervention execution are independently replaceable modules behind stable contracts, delivering real-time, context-preserving typographic interventions with reproducible session capture; evaluated on real Tobii hardware for real-time feasibility, external-provider integration, and the measured positional cost of every intervention it applies.

## Draft abstract (5 sentences, rewritten to match the body before submission)

Real-time gaze-driven text adaptation has been demonstrated repeatedly, but existing prototypes couple sensing, decision logic, and the reading interface, so studying which interventions actually help remains expensive. We present a researcher-operated, two-screen platform in which sensing, eye-movement analysis, decision strategy, and intervention execution are independently replaceable modules: a participant reads reflowable text that adapts to their gaze while a researcher mirrors the reading live and applies or approves typographic interventions, with every gaze sample, decision, and intervention captured in a replayable session record. Across eight reading sessions on real eye-tracking hardware the platform sustained the tracker's rated 90 Hz with gaze validity above 92 percent, kept every measured latency sample within its 100 ms budget, and had its evaluation sessions analysed live by an independent team's reading-difficulty pipeline connected through the platform's provider contract with no change to the core. Because the platform measures the positional cost of each intervention it applies, it revealed that our original context-preserving restore moved the reader about three times further than the reflow it compensated; we corrected the mechanism and verified the correction over a 66-trial deterministic sweep. The platform turns comparisons of interventions and decision strategies, including AI-driven ones, into configuration rather than reimplementation.

## Section skeleton

1. **Introduction** (about 1 page). The adaptation-versus-continuity tension; the bottleneck argument (feasibility is proven, the missing piece is the instrument for controlled study); the "gradual fade hypothesis" researcher anecdote from thesis Sec. 1.1 as the motivating scenario; contribution bullets (platform and architecture, two-screen researcher-in-the-loop workflow, context-preserving intervention mechanism whose disruption is measured rather than assumed, feasibility evaluation plus external-provider validation plus reproducible records).
2. **Related Work** (about 1 page, four threads). (a) Prior RtR prototypes and Jensen et al. 2025; (b) gaze-contingent reading interfaces (eyeBook; Rummens and Beier 2025; Medan and Pelman 2024; ETRA 2025 AI-text paper); (c) experiment tooling (Tobii Pro Lab, PsychoPy, Psychtoolbox) closed by the capability matrix; (d) real-time gaze-to-text processing (Salvucci and Goldberg; the 2026 confidence-based line-assignment preprint). Threads (b) and (d) need papers not yet in our bibliography (from Ashkan's list); we read them before citing them.
3. **The Platform** (2 to 2.5 pages). The four-module adaptive loop and its contracts; two screens, two channels (REST commands, one WebSocket realtime stream); the lock-free gaze hot path; two-stage gaze-to-word mapping over live DOM word boxes with line hysteresis (reflow-proof by construction, resolution-independent); dwell-based token-level analysis as a replaceable strategy; the decision boundary (manual, advisory, autonomous; module-provider protocol with heartbeat and graceful fallback); context preservation (commit boundaries, anchor capture every 120 ms, restore, graded outcome written to the record); the session record and replay.
4. **Evaluation** (2 to 2.5 pages, one subsection per research question). Setup (rig photo, 4 participants x 2 conditions = 8 sessions, single-host loopback); feasibility (sampling rate, validity, latency distributions); modularity (build-enforced boundary test, three external providers, the independent pipeline serving as the live analysis source); context preservation (live with/without comparison reported descriptively; the live over-repositioning observation; the 66-trial deterministic sweep comparing no preservation, original restore, revised restore).
5. **Discussion** (about 0.75 page). What the platform enables (Jensen-style studies become configuration); the transferable lesson "measure the cost of the quality attribute you claim" (the over-repositioning was only found because the mechanism grades itself); limitations stated plainly; future work (unbundled highlight-versus-geometry study, campaign-scale automated mode, powered efficacy study).
6. **Conclusion** (2 to 3 sentences).

Writing order (Ashkan's): Platform, Evaluation, Related Work, Introduction, Discussion, Abstract last.

## Figures and tables to reuse or remake

| Paper slot | Source in thesis | Note |
|---|---|---|
| Teaser: two-screen rig photo | Fig 7.1 (`experiment-setup.jpg`) | Faces already blurred; possibly pair with the two UI screenshots (Fig 6.3) |
| Architecture | Fig 5.2 hexagon, merged with the Fig 2.2 loop | Remake compact, one column |
| Gaze-to-word mapping | Fig 6.12 | The strongest mechanism figure; keep |
| Context preservation mechanism | Fig 6.13 or 6.14 | Pick one, compress |
| Sensing rate and validity | Fig 7.2 or fold into a small table | Table likely cheaper in space |
| Latency CDF against budget | Fig 7.4 | Keep |
| Resume time and regression rate | Fig 7.5 + 7.6 as one two-panel figure | Descriptive only, say so in the caption |
| Over-repositioning, original vs revised | Fig 7.8 | The money figure |
| Capability matrix | Tab 2.2 | Compact related-work table |
| Displacement sweep | Tab 7.3 | Possibly abbreviated to the overall row plus extremes |

Do not reuse thesis Fig 2.1 (reproduced from the project description; permission issue). All listed figures except the rig photo and screenshots are our own TikZ/Mermaid/matplotlib and regenerate from committed sources.

## Headline numbers (single source of truth while drafting)

Machine source of truth: `generated/results.tex`, produced by `analysis/build_paper_assets.py` from `analysis/outputs/evidence-audit.json`. The list below mirrors it as of 2026-09-06 and records the corrections made during the merge.

- Latency budget: 100 ms, reported against three distinct quantities (client round trip, gaze freshness at decision dispatch, provider round trip); none is complete gaze-to-display latency.
- Sampling: rated 90 Hz; achieved 89.89 Hz mean, 0.21 Hz SD, range 89.41 to 90.06 Hz across 8 sessions; 175,860 gaze samples.
- Validity: 92.5 to 98.0 percent, mean 95.6 percent, during naturalistic reading.
- Calibration: accuracy 0.30 to 0.69 degrees, precision 0.08 to 0.33 degrees (nine-point, gated).
- Client round trip, eight sessions: participant median 1 ms, p95 3 ms, max 41 ms (n=387); researcher median 1 ms, p95 8.4 ms, max 28 ms (n=393); all 780 under 100 ms.
- Advisory run (91.2 s, 8,004 gaze samples): gaze freshness at dispatch median 6 ms, p95 11 ms, max 46 ms over 14,015 evaluations (not samples); provider round trip median 4.5 ms, max 7 ms over 8 proposals; 16 proposal records for 8 proposals (2 approved, 6 superseded); one participant-client ping of 315 ms.
- Sessions: 4 participants x 2 conditions; two texts (Metal Detectors, Nuclear Science), each participant a different text per condition, each text twice per condition; order 1 with-first, 3 without-first; all 45 interventions manual with immediate commit; one export's final metadata says rule-based/advisory.
- Resume time: median 482 ms with (19 of 19 observed) vs 650 ms without (25 of 26 observed); means 670 vs 923 ms; per-participant medians favour with for 3 of 4; descriptive only.
- Regression rate, 5 s windows, event means: with 29.3 percent before and 22.8 percent after; without 32.0 and 33.0. After discarding exact duplicate saccade payloads: 30.9 / 23.0 and 32.7 / 33.0.
- Record integrity: 280 of 9,311 fixation records (3.0 percent) and 652 of 3,225 saccade records (20.2 percent) are exact repeats; root cause unknown.
- Live over-repositioning: 16 of 19 outcomes degraded, 3 preserved; degraded median residual 389 px against median induced displacement 38.7 px.
- Browser sweep: 66 scheduled trials per run; original run 62 complete pairs, revised run 63; OFF medians 32.4 px (original run) and 34.3 px (revised run); ON medians 104.4 px (original) and 32.4 px (revised); over-repositioned 45 of 62 vs 4 of 63 (ON exceeds OFF by more than 1 px); anchors differ across runs in 21 of 66 trial keys and OFF differs by more than 1 px in 26; one reading line = 32.4 px. The two runs are not matched.
- Modularity: build-enforced project references plus an executable boundary test; 101 backend tests pass; three external providers (reference decision, reference analysis, connector around the collaborator pipeline with small transport additions); the third analysed the eight sessions live. No automatic fallback and no heartbeat enforcement in the current runtime.

## Weaknesses we state honestly (and reviewers will check)

1. Four participants, descriptive statistics only, authors among the participants; no efficacy claim anywhere.
2. The with-preservation condition bundles positional restore with a highlight cue; prior work (Jensen et al.) suggests highlighting drives recovery, so the behavioural gap is not attributable to geometry alone.
3. The revised restore is verified geometrically, not yet with readers.
4. The automated decision path is a single-run validation, not a campaign.
5. Ethics and consent for the eight sessions must be stated explicitly in the paper; session data files currently carry participant first names and must be anonymised before any public artifact.
6. Citability of the Reading the Struggle thesis (Kraljevic and Desu): check whether it is now submitted; the connector evidence deserves a proper citation.

## Strengthening options (DECIDED 2026-08-16: Option A)

- **Option A: thesis data only. This is the decision.** Publishable as a platform-plus-feasibility paper with the over-repositioning finding as the empirical hook; all behavioural results reported descriptively and the confound stated plainly. Options B and C (new three-condition study; automated-mode campaign) are folded into the paper's future-work section instead of being run.

## Artifact plan

Public monorepo (MIT) plus the documentation site, anonymised session records, and the scripted analysis notebooks as supplementary material; anonymised repo link during review if the track requires it.
