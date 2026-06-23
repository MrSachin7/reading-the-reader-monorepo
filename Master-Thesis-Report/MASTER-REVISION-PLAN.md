# Master Revision Plan — Zero Supervisor Dissatisfaction

**Status:** authoritative. This document **supersedes and absorbs** `revision-plan.md` (feedback 1) and the task lists in `feedbacks/feedback2-analysis.md`, and stays in sync with `todo.md`. When they disagree, this file wins.

**The bar:** when every phase is complete, there must not be **a single** outstanding supervisor concern from either meeting, and the report must be **end-to-end consistent** — same concept, same name, same drawing, everywhere. Hand-in is **2 July 2026**.

**The ethos (non-negotiable for this effort):**
- **No laziness.** If a diagram is wrong, it is **redrawn from scratch**, not patched. If a section is incoherent, it is **rewritten or deleted**. We do not preserve work just because it exists.
- **Consistency by construction**, not by luck. We build a single source of truth *first* (glossary + one master diagram + one shared figure style), then everything is derived from it. We do not try to hand-align 50 places independently — that is how drift happens.
- **Close the loop with the supervisors.** The only way to *guarantee* zero dissatisfaction is to send them drafts at the review gates below and get sign-off before hand-in, not to guess at the end.

---

## Progress log (live)

- **2026-06-18 — Phase 0 started + first increment shipped (build green, 120 pp):**
  - ✅ Caption styling: one size smaller + italic, bold label (`Setup/Settings.tex`). Build verified.
  - ✅ Glossary / terminology lock → `feedbacks/glossary.md` (the sweep checklist).
  - ✅ Figure inventory & value analysis → `feedbacks/figure-inventory.md` (~30 figures; 5 substantive REDRAWs, 5 consolidation candidates, **no deletion without a read**).
  - ✅ Master diagram layout spec → `feedbacks/master-diagram-spec.md` (ready for you to hand-draw; hybrid decision).
  - ✅ Decision gates resolved: tooling = hybrid; regression detection = verified already implemented.
  - ✅ Master platform diagram designed + iterated in TikZ as a mock-up (abstract v5 → illustrative v6, build-verified, preview at `feedbacks/master-diagram-preview.pdf`), then **decision: draw the master in Excalidraw** for the friendly Fig-2.1-style look. **Self-contained Excalidraw prompt** delivered at `feedbacks/excalidraw-master-prompt.md` (DTU colours + labels + layout locked). Advisory/Autonomous/proposal chips **dropped** from the master (they move to the decision-lifecycle zoom-in). TikZ mock-up kept as visual reference only.
  - **Tooling (revised):** master + two-screen hero = **Excalidraw** (illustrative); structural figures (container 5.2, hexagon 5.4, use-case, sequences) = **TikZ/Mermaid** as before.
  - ⏳ Remaining Phase 0: ratify narrative spine + glossary terms (both authors); **deep-dive/zoom-in map** (how the master crops into section figures — still owed); derive crops + restyle 5.2/5.4 to match; measurement plan + Track M kickoff.

- **2026-06-19 — Master diagram drawn in Excalidraw + integrated into Ch5:**
  - Iterated the Excalidraw master over 3 revisions (legibility / solid fills; provider data-flow + a visible "Provider API" node; intervention sliders + ✓approve/✗reject). Prompt + revision log: `feedbacks/excalidraw-master-prompt.md`.
  - **Integrated** `Chapters/05_SystemDesign/architecture_overview.svg` as **Fig 5.1** (`fig:design-context`) via `\includesvg`, replacing the abstract C4 context box; **removed the two-screen hero** (old 5.3) and aligned the §5.2 prose (eye-tracker-as-interface, provider-via-API). Build green (xelatex + svg/inkscape); font + layout verified in the embedded PDF.
  - Closes matrix rows #4 (eye-tracker interface), #5 (provider↔researcher via API), #6 (user-centric), #7 (one master), #15 (fewer diagrams) **for the context figure**.
  - Housekeeping: `two-screen-hero.tikz` is now unused (left on disk); commit the editable `.excalidraw` source for reproducibility (`CLAUDE.md` §2.3).
  - **Consistency restyle of the remaining Ch5 figures (done, build green):**
    - **Fig 5.2 (container)** → "Backend (application core)" (was "Backend Application Host"); seam relabelled "context / proposals" (was "decision requests"); legend now reads "an arrowhead shows who initiates" and adds the grey **supporting I/O** key (the previously-unexplained arrows); datastore unified to "Session record"; caption shortened; prose aligned ("well-defined API").
    - **Fig 5.3 (hexagon)** → centre "Application core" (was "Domain"); "External analysis provider" / "External decision provider" naming; added the **sensing→analysis→decision→intervention cycle arrows** the supervisor asked for; both arrow kinds legended; caption updated.
    - Closes matrix rows #1 (terminology), #2 (decision-requests→context/proposals), #8 (Fig 5.2 arrow semantics), #12 (Domain rename + pipeline arrows), #10 (captions) across Ch5. The three System Design figures now share one vocabulary (backend/application core, External decision provider, context/proposals, eye tracker, session record) and one arrow convention.

- **2026-06-19 (later) — Fig 5.2 (C4 container view) SCRAPPED (deleted, not redrawn).** Re-reading the feedback confirmed 5.2 drew the most criticism: the redundant "third drawing" (he said *combine the drawings*), confusing single/double/grey arrows (*what are the grey flashes? · if no meaning, kill it*), and a wrong two-screen model (*why two screens? both read through the backend*). Since the master (5.1) is now the combined overview he asked for and the loop (5.4) carries the two-channel split *dynamically*, the container box-diagram had no unique job left. **Deleted** the figure; its one architectural point (one web front-end, two surfaces talking **only** to the backend over REST + WebSocket) is now stated crisply in §5.2 prose. References were self-contained; the `c4model` citation was kept (reframed as the context-level framing of the master); build green, no dangling refs; `section.md` brief updated so it is not re-added. Ch5 figure set is now **5.1 master · 5.2 hexagon · 5.3 loop · 5.4 decision-lifecycle · 5.5 record · 5.6 cross-session · 5.7 seam · 5.8 session-lifecycle** — down from the confusing context/container/hero trio to one clean overview.

---

- **2026-06-20 — Use-case diagram aligned with the glossary + design vocabulary (Phase 2, matrix #13; build green):**
  - The actor labels in `04_Requirements/03_use_cases.tex` were already glossary-clean (Researcher, Participant, Eye Tracker Device [§5 actor-name exception], External Module Provider [correct umbrella], Data Consumer). The defects were in the surrounding prose and one node label.
  - **Terminology fixes:** "primary operator" → "primary actor" (§4 retire "operator"); two "researcher control panel" → "researcher console" (§1); "automated mode"/"hybrid mode" → "autonomous mode"/"advisory mode" (§4 locked control terms); activity-diagram caption "applied automatically" → "applied autonomously".
  - **Traceability touch-ups (closes supervisor comment, `feedback2-analysis.md:237` — use-case keywords must recur in the architecture):** use case "Control Decision Automation" → "Control Decision Mode" (node + prose; echoes the advisory/autonomous *mode* vocabulary); the advisory-path sentence now reads "the researcher approves or rejects through Control Decision Mode" (echoes the approve/reject seam). "Monitor Live Session" already ties to the mirror/attention-summary wording in the prose; left as-is.
  - Out of scope (untouched): "Eye Tracker Device" actor name (glossary §5 explicitly permits it) and the "Ex-periment" hyphenation break (separate `todo.md` polish-pass item). Build green, Fig 4.1 rendered and verified.

- **2026-06-20 (later) — Concept loop F1 verified + closed (Phase 2, matrix #32; build green):** Reading `02_KeyConceptsAndRelatedWork/01_key_concepts.tex` showed the F1 redraw was **already substantially done**: the (a)/(b) split exists as two figures (`fig:reading-concept` = the published RTR concept PNG, part (a); `fig:adaptive-loop` = "our modular interpretation", part (b)), with explicit contrasting prose between them; the reader and researcher are both **person icons** (not boxes); and the **external-provider seam** is present (red "External / AI" chip + legend "external decision provider (contract; out of scope)"). The only outstanding F1 sub-item was "label it a flowchart". Since the figure is a data-flow pipeline rather than a strict flowchart (no decision diamonds), it was **not** mislabelled; instead the lead-in prose (line 19) now names the diagram type honestly: "redraws the same loop as a **flow diagram** of four sequential stages". No figure redraw. Optional chip-relabel for exact parity with the Fig 5.3 hexagon vocabulary ("External" → "External analysis/decision provider") was **deferred** to the Phase 8 sweep (chips are terse, non-contradictory, and tied to canonical terms by the legend). **This completes Phase 2's diagram set** — the redrawn figures are ready for Review Gate 1.

- **2026-06-22 — Fig 5.1 SVG re-rendered + I-AOI method stated explicitly (matrix #20; build green):**
  - **Fig 5.1 update:** integrated the author's revised Excalidraw master (`architecture_overview.svg`, now showing the four named modules inside the backend, a "Provider API (WebSocket contract)" node, researcher sliders + approve/reject). Build fix: Inkscape 1.4.4 corrupts the PDF export of this SVG because of the embedded Excalidraw "Virgil" woff2 font ("Catalog dictionary not located" → graphics "Division by 0"). Resolved by passing `inkscapeopt={--export-text-to-path}` on the single `\includesvg` line in `02_approach.tex:17` (vectorises the labels; no `Setup/` change). **Any future Excalidraw SVG re-export needs this flag.** §5.2 caption/prose already matched the new artwork — no text change. (Author confirmed the "realizes provider api for intervention" arrow is intentional as-is.)
  - **I-AOI (#20), the 🔴 wrong-live-answer fix:** the Salvucci & Goldberg citation + AOI declaration already existed in Ch2 (`01_key_concepts.tex:270-271`); the gap was the Implementation chapter. Edited `06_Implementation/03_highlights.tex` (the "Temporal analysis as a replaceable strategy" paragraph) to: name the **area-of-interest (I-AOI), dwell-based** branch and cross-ref `subsec:oculomotor-events`; state explicitly the detector uses **neither the velocity threshold of I-VT nor the dispersion threshold of I-DT**; justify AOI for reading (events already bound to words); and report **both** threshold families with the real code constants — fixation-confirmation dwell **90/70/135 ms** (initial / within-line / across-line) plus the attention-summary binning **<45 ms dropped, ≥130 ms = fixation, 45–130 ms = skim** (`SkimThresholdMs=45`, `FixationThresholdMs=130`, verified in `BuiltInEyeMovementAnalysisStrategy.cs`). Companion Ch2 edit (flagged, §3.5): added the standard abbreviations "velocity (I-VT), dispersion (I-DT), or area of interest (I-AOI)" and an explicit "and not the velocity- or dispersion-based variants" at the conceptual home. No fabricated numbers; citation pre-existing. Closes `todo.md` "describe I-AOI/dwell extraction".

- **2026-06-22 (later) — AOI-survives-reflow elevated to a first-class strength (matrix #21; build green):** The reflow-robustness point in `06_Implementation/03_highlights.tex` (spatial-mapping paragraph) was one buried sentence; it is now a stated strength of the I-AOI choice. **Verified in code first** (`Frontend/src/modules/pages/reading/lib/useGazeTokenHighlight.ts`): `refreshLayouts()` re-reads word boxes from the live DOM on MutationObserver, ResizeObserver (container + content + window resize), and scroll (synchronously, per the "Bug 6 fix" comment); the gaze sample arrives normalised (0–1) and is scaled to `window.innerWidth/innerHeight`, then matched against `getBoundingClientRect` boxes. New prose makes three points: (1) boxes refreshed from the rendered DOM on mutation/resize/scroll, so a reflowing intervention (larger font / narrower measure) moves every word without invalidating the mapping; (2) this is exactly the failure mode a coordinate-based detector would suffer, which is *why* analysis reasons over word tokens (reinforces #20); (3) the mapping is therefore independent of screen resolution and window size (resolution-independence claim verified, not assumed). No new citations. Closes the Phase-4 "make AOI-survives-reflow explicit" item.

- **2026-06-22 (later) — Concrete stack + Tobii SDK + resolution headlined (matrix #19; build green):** Two new headed subsections, all facts verified against repo files (no number unread). **§6.1.1 "Technology stack and dependencies"** (`01_structure.tex`, `subsec:impl-stack`) with **Table 6.1** (`tab:impl-stack`, tier/technology/version/role): backend .NET 10, ASP.NET Core + FastEndpoints 8.0.1, CsvHelper 33.1.0, Tobii.Research.x64 1.11.0.1334; frontend Next.js 16.1.6, React 19.2.3, TypeScript 5.x, Bun (left **unversioned** — CI pins `bun-version: latest`, not 1.3), Redux Toolkit/RTK Query 2.11.x, Tailwind 4.x. Rationale cross-refs §5.8 (no re-justification); CI = one-line pointer to §6.5 per the agreed option (a). **§6.3.3 "Tobii SDK integration"** (`03_highlights.tex`, `subsec:impl-tobii-sdk`) cross-refs the existing adapter listing `lst:impl-tobii` and adds the parts that were missing: device discovery (`FindAllEyeTrackers` → first connected tracker), licence path (`LicenseKey` → `TryApplyLicenses`, throws on invalid/empty licence — verified in `TobiiEyeTrackerAdapter.cs`), the `GazeData` field mapping, the `#if WINDOWS`/mock split, and the **screen/resolution assumptions** (gaze arrives as `PositionOnDisplayArea` normalised 0–1, so the mapping fixes no resolution — ties to the #21 resolution-independence). Fixed a self-introduced "Fas-tEndpoints" hyphenation in the table via `\mbox`. Closes `todo.md` "concrete stack and supporting libraries".

- **2026-06-22 (later) — Supplementary documentation pointer added (matrix #28; build green):** New subsection §6.5.1 "Supplementary documentation for future contributors" (`05_engineering.tex`, `subsec:impl-docs-site`) points to the published companion site `https://mrsachin7.github.io/reading-the-reader-monorepo/` (URL supplied by the author). Described accurately from the site's actual contents (verified by listing `DocsSite/app`): setup + run-an-experiment guide, REST/export-format reference, and — tied to the RQ1 extensibility claim — the module-provider integration protocol, a worked "adding a new module" guide, and mock providers; cross-refs §5.6. Placed in Engineering Practice (its logical home) above the still-pending build/CI `\todo`; the §6.6 summary stub was left untouched (written last). **Optional follow-up:** a screenshot of the site could go in the planned UI-gallery appendix (per the §6.4 todo box) — deferred, and would need a user-provided image per `CLAUDE.md` §2.4.

- **2026-06-22 (later) — Documentation reframed as a deliverable + registered as a contribution (author-approved; build green):** Per author direction that documentation is part of the software-engineering work, two changes. (1) §6.5.1 reworded from "Supplementary documentation for future contributors" to **"Documentation as an engineering deliverable"** (`05_engineering.tex`): now argues documentation on the system's own terms (extensibility needs documented contracts; reproducibility needs documented operation) and presents the companion site as a deliverable produced alongside the code. (2) Added a seventh **"Developer and operator documentation"** bullet to the Intro contributions list (`01_Introduction/03_contributions.tex`) — flagged as narrative-spine content per §3.5 and **author-approved before editing**; framed so it enables the extensibility/reproducibility claims rather than standing alone. Follow-on (when written): carry the framing into the Discussion (Phase 6, achievements + lessons) and optionally the Abstract pillars (Phase 7). Narrative-spine note: co-author may want a glance at the new contribution bullet.

- **2026-06-22 (later) — Missed P1 quick wins closed + matrix reconciled to reality (build green):** Pre-Evaluation audit found the matrix was stale (only this-session rows were ticked) and two P1 items genuinely *missed*. Both now done: **#11 (split long titles)** — §5.2 "Architectural Approach and System Overview" → **"Architectural Overview"**; §5.6 "Extensibility, the Provider Seam, and Researcher Control" → **"Extensibility and Researcher Control"** (3→2 concepts, seam folded in as mechanism; label `sec:design-extensibility` unchanged so the ~15 cross-refs still resolve); §7.4 stub "Experimentability and Developer Experience" → two sections **"Experimentability"** + **"Developer Experience"**. **#14 (hyphenation)** — use-case nodes rebroken to "Define\\Experiment\\Template" and "Start\\Experiment\\Session" (no more "Ex-periment"); Fig 5.6 "Built-in\\implementation\\in-process" (no more "im-plementation"). Note: the "Deci-sion Provider" glitch was already gone (old TikZ Fig 5.1 replaced by the SVG master). Both diagrams re-rendered and checked for overlap. **Matrix reconciled** with a ✅/◑/⊘/☐ legend: marked ✅ the genuinely-closed earlier-session diagram work (#4, #6, #8, #9, #12, #15) plus #11/#14; marked ◑ the items substantially done with residual P3-prose or P8-sweep work (#1, #2, #3, #5, #7, #10); #22 marked ⊘ (deferred future work).

- **2026-06-22 (later) — §6.4 "User Interface Realization" DELETED as redundant (author-approved; build green).** The section had been slimmed to "UI architecture realized", but that scope (single Next.js front-end; thin routing `app/` vs feature UI `modules/pages`; the two route groups realizing console vs reader; shared realtime state in `lib`) was already fully covered by §6.1, the in-context screenshots by §6.2, and the UI behaviour by §6.3 — no unique job left (same "redundant third drawing" pattern as the deleted Ch5 figures). Removed the `\input` and the file `04_ui.tex`; **no prose referenced `sec:impl-ui`** so nothing broke. Folded the one unique point into §6.1: the high-frequency realtime state is exposed through a single hook (`useLiveExperimentSession`, verified in `Frontend/src/lib/`) layered over the gaze socket, keeping presentation separate from transport (control/presentation separation). Chapter renumbered: Engineering Practice §6.5→**§6.4**, Summary §6.6→**§6.5** (the documentation deliverable subsection is now §6.4.1). Authoring brief (`section.md`) updated to mark the removal. Fuller screenshot set still belongs in an as-yet-uncreated appendix UI gallery (relates to #27).

- **2026-06-22 (later) — §6.4 Engineering Practice drafted (was a stub; build green).** Wrote the section from verified repo facts (no external citations): intro + §6.4.1 **Build and CI** (the two GitHub Actions workflows; per-root path filtering; frontend = ubuntu/Bun build-as-gate with a conditional test step; backend = **windows-latest** restore/build/test, the Windows runner being the CI consequence of the Tobii C1 constraint), §6.4.2 **Cross-cutting conventions** (tier-boundary error handling, lightweight console logging, typed-options vs env-var configuration, and the load-bearing data-plane/control-plane concurrency split cross-ref'd to §6.2), §6.4.3 **Testing** (the backend xUnit project exercising the core's contracts/authority/regression/setup; honestly states the **front-end has no automated suite** — its gate is the typed build + mouse-mode manual validation; front-end suite named as future work), §6.4.4 **Challenges and resolutions** (the four named challenges, each pointing to the mechanism that met it: gaze-over-Markdown→§6.3.2, latency→§6.2, Windows SDK→§6.3.3, context-across-reflow→§6.3.6). The §6.4.5 documentation-deliverable subsection (added earlier) stays last. All cross-refs verified resolved. **Ch6 is now complete except §6.5 Summary**, which is written last with the Abstract/Conclusion per `CLAUDE.md` §2.1.

## A. Current-state correction (do NOT redo these — verify only)

Reading the actual files shows several feedback-1 asks are **already done and good**. Marking them so we spend zero effort re-doing them:

| Already done | Evidence | Residual action |
|---|---|---|
| Explicit contributions list, two-screen framing, "no tool combines all four" claim, AI disclosure | `01_Introduction/03_contributions.tex` | Verify it matches the locked glossary; no rewrite |
| Goal reworded into 4 outcome-first objectives (incl. researcher console, pluggable decision boundary) | `01_Introduction/02_goal.tex` | Verify terminology; no rewrite |
| Market **capability matrix** + **positioning quadrant** incl. PsychoPy / Psychtoolbox / Tobii Pro Lab | `02_KeyConceptsAndRelatedWork/03_market_landscape.tex` (`tab:capability-matrix`, `fig:market-quadrant`) | Verify only; feed into Discussion §6 |
| Problem statement + 4 RQs ("How can …", maps to evaluation) | `02.../05_final_problem_statement.tex` | Optional: reword to "How might we" (low priority) |

**Implication:** the prose framing is largely in good shape and **already carries the correct vocabulary**. The inconsistency is concentrated in the **diagrams** (and some Ch5 prose), which drifted away from the good vocabulary the Intro/Contributions already use. So the terminology target is *"make the diagrams match what the Introduction already says."*

---

## B. The consistency machine (the backbone the supervisors demanded)

Four artifacts, built in Phase 0, that make consistency structural rather than aspirational:

1. **A locked glossary** (`feedbacks/glossary.md`) — one canonical term per concept, seeded from `revision-plan.md` §1 and the already-correct Intro vocabulary. Becomes the grep checklist for the final sweep.
2. **One master platform diagram** — user-centric (participant + researcher centred, eye tracker as the sensing *interface*). Every per-section architecture figure is a **crop/zoom of this one canvas**, so they cannot disagree.
3. **One shared figure style** (a single TikZ style include) — colours, node shapes, arrow conventions, legend wording. Every figure `\input`s it. Visual consistency by construction.
4. **A comment-traceability matrix** (§E below) — every individual supervisor comment mapped to a phase and a status. Nothing is "closed" until it is ticked here.

---

## C. The phases

Each phase lists: **goal · depends on · tasks (with file pointers) · definition of done · comments it closes · review gate.** Checkbox `[ ]`. "↻ REDRAW/REWRITE" marks scrap-and-redo work. "✎ verify" marks check-don't-redo.

---

### Phase 0 — Foundations & Locks  *(no chapter prose; everything else inherits this)*
**Goal:** establish the single sources of truth so all later work is consistent by construction.
**Depends on:** nothing. **Do this first.**

- [ ] **Lock the glossary** → `feedbacks/glossary.md`. Canonical term per concept: *platform · module (behind a contract/port) · intervention · pluggable/modular · participant vs reader · researcher · External Decision Provider vs External Module Provider (with the taught distinction) · backend (one name) · advisory/autonomous · eye tracker (generic, Tobii = an instance) · the core ("application core", retire "Domain"/"Reading Runtime" as separate names).*
- [ ] **Ratify the narrative spine** (already in `03_contributions.tex`) — both authors agree on the exact contribution sentences reused in Abstract/Intro/Conclusion.
- [ ] **DECISION GATE — diagram tooling** (see §D). Recommended: **TikZ with a shared style file** for the formal figures (reproducible, version-controlled, lets Claude maintain consistency); hand-draw / draw.io only if a figure genuinely cannot be expressed cleanly. Confirm before Phase 2.
- [ ] **Design the master platform diagram on paper** — user-centric layout; decide the crop set (which sub-region becomes Fig 5.1, 5.2, 5.3, the Ch2 concept figure).
- [ ] **Create the shared figure style** (`Setup/diagram-style.tex` or `Chapters/_shared/figstyle.tex`). *Flag to team: touching `Setup/` per `CLAUDE.md` §2.5.*
- [ ] **Figure inventory** → list every figure in the report, its single message, and a verdict: **keep / redraw / scrap**.
- [ ] **Kill list** (scrap candidates): the WebSocket-envelope diagram the authors themselves said "wasn't needed"; the symmetric four-box context view if replaced by the master crop; any figure with no single message. *Fewer, sharper diagrams was an explicit ask.*
- [ ] **Measurement plan + kick-off Track M** (see §D): enumerate every number Evaluation needs (NFR2 latency, calibration accuracy/precision, build/DX metrics); schedule the hardware session; decide the optional code work (regression detection, fixation-duration overlay). **Start now — it has lead time.**

**Definition of done:** glossary, master-diagram sketch, shared style file, figure inventory + kill list, and measurement plan all exist and are agreed by both authors.
**Closes:** sets up A1, B1, terminology backbone.

---

### Phase 1 — Quick mechanical wins  *(parallel, immediate; low risk)*
**Goal:** clear cheap, unambiguous items now to build momentum and remove noise.
**Depends on:** none (independent of the glossary).

- [ ] **Caption font one size smaller** — global, via `caption` package in `Setup/` (`\usepackage[font=small,labelfont=bf]{caption}`). One line fixes every figure. *Flag the `Setup/` edit.*
- [ ] ↻ **Split long section titles**: `5.2 Architectural Approach and System Overview` → two; `5.6 Extensibility, the Provider Seam, and Researcher Control` → one umbrella term or three subsections; `7.4 Experimentability and Developer Experience` → two. (`02_approach.tex`, `06_extensibility.tex`, `07_Evaluation.tex`)
- [ ] **Hyphenation fixes**: "Ex-periment" (use-case dia.), "Deci-sion Provider" (Fig 5.1), "im-plementation" (Fig 5.6) — widen nodes or `\mbox{}`. (`todo.md`)
- [ ] ✎ **Thesis outline shows chapter titles** not just numbers (verify `01_Introduction/06_thesis_outline.tex`).
- [ ] Optional: one-line opener clarifying "Anatomy of an Experiment Session" describes the *implemented* flow (`06_Implementation/02_session.tex`).

**Definition of done:** captions render smaller; no multi-concept titles remain in Ch5–7; no mid-word hyphen breaks in figures; build clean.
**Closes:** §4.2 (font), §5 (titles), §10 (hyphenation) of feedback2-analysis.

---

### Phase 2 — Diagram overhaul  🔴 *the critical redraw; the supervisors' sharpest comments live here*
**Goal:** every architecture diagram is **user-centric, mutually consistent, and minimal**.
**Depends on:** Phase 0 (glossary, master sketch, shared style, tooling decision).

- [ ] ↻ **Build the master platform diagram** *(HYBRID: team hand-draws / draw.io from my layout spec)* — participant + researcher centred; **eye tracker drawn as the sensing interface on the participant→platform edge** (not a 4th external box); decision provider shown with its **well-defined API** and **coupled to the researcher** (advisory approve/override/reject). This is the canvas everything else crops from. I deliver a precise spec (nodes, edges, labels, layout) before it is drawn.
- [ ] ↻ **Fig 5.1 (system context)** — replace the symmetric four-box layout with a user-centric crop of the master. Eye tracker = interface; generic name; provider not a stranger. (`02_approach.tex`)
- [ ] ↻ **Fig 5.2 (container)** — fix arrow semantics: arrowheads mean **"who initiates"** (not one-way/two-way); add the grey "incidental I/O" class to the legend **or** restyle it away (kill meaningless distinctions); bidirectional **"context ↔ proposals"** on the provider seam; one backend name. (`02_approach.tex`)
- [ ] ↻ **Fig 5.3 (two-screen hero)** — reconcile terms with 5.1/5.2 (it is currently the most user-centric and may be **promoted to the lead architecture figure**). (`two-screen-hero.tikz`)
- [ ] ↻ **Fig 5.4 (four-module hexagon)** — rename "Domain" per glossary; **draw the pipeline dependency arrows** sensing→analysis→decision→intervention (supervisor: "without sensing there's no analysis…"); make built-in/external naming consistent with the other figures; keep the cycle numbering only if the caption explains it. (`03_decomposition.tex`)
- [ ] ↻ **Use-case diagram** — align actor verbs/terms with the design diagrams so a use case traces to its architecture; fix hyphenation. (`04_Requirements/03_use_cases.tex`)
- [ ] ✎→↻ **Ch2 concept loop (F1)** — verify current state; if not already done, split into "RTR adaptive-interface concept" + "our pluggable-module interpretation", person icon, label it a **flowchart**, show the external seam. (`02.../01_key_concepts.tex`)
- [ ] **Apply the shared style to ALL diagrams** (including the Implementation-chapter TikZ figures) so colours/arrows/legends match report-wide.
- [ ] **Shorten every caption** as each figure is touched — move explanatory prose into the body; caption names the graphical elements only. Worst offenders: `fig:design-containers`, `fig:design-twoscreen`, `fig:impl-gazemap`, `fig:impl-context-decision`.
- [ ] **Execute the kill list** — delete scrapped figures and their references.

**Definition of done:** a reader can lay Figs 5.1–5.4 + use-case side by side and every shared concept has identical name + shape + arrow style; no figure has a paragraph-length caption; participant/researcher are visually central; eye tracker is an interface.
**Closes:** §2 (consistency), §3 (user-centric), §4.1 (arrows), §4.2 (captions), §10 (Fig 5.4, use-case terms) — the heart of both meetings.
**🚦 REVIEW GATE 1:** send the redrawn diagram set to supervisors for a consistency check (they offered to look). Do not proceed to heavy prose until they confirm the diagrams.

---

### Phase 3 — Requirements ↔ Design coherency  (Ch3/4/5 prose)
**Goal:** show the evidence and the logical chain the supervisor asked for; align prose to the new diagrams.
**Depends on:** glossary, Phase 2 diagrams.

- [ ] **Requirements refinement / validation table** — the missing *evidence of process*. Columns ≈ *Iteration · What was demoed · Supervisor feedback · Resulting requirement change.* 4–6 real rows (e.g. license-free operation, webcam sensing mode). One framing paragraph: build→demo→feedback→refine across ~5 stakeholder sessions. (`04_Requirements/02_user_stories.tex` or Methodology elicitation)
- [ ] **Prioritisation rationale** for MoSCoW / FR / NFR — *why* each rank, tied to stakeholders/use cases (the "how did you validate the priorities" gap). (`04_Requirements/04_*`, `05_*`)
- [ ] **Logical chain** constraints/limitations (Tobii=Windows, no PDF, no AI impl) + requirements → **drivers** → architecture decisions; remove any reverse-justification. (`05_SystemDesign/01_drivers.tex`)
- [ ] ↻ **Move architecture-flavoured decisions out of Ch4** into Ch5 (tech-stack/App-Router rationale) — ✎ verify whether already moved to `07_decisions.tex`.
- [ ] **Ch5 prose to match redrawn diagrams**: the researcher-mode "one button + advisory feedback + override" story; expand what a **decision** *is* and the bidirectional **context/proposal** semantics (retire "decision requests" framing); tech-stack rationale (familiarity + brief alternatives) ✎ verify in `07_decisions.tex`.

**Definition of done:** Ch4→Ch5 reads as one causal chain; the iterative-process evidence is on the page; no architecture decisions stranded in Ch4; Ch5 prose uses glossary terms and matches the figures.
**Closes:** §7 (requirements evidence), §2.2 (decision semantics in prose), feedback-1 Phase 3.

---

### Phase 4 — Implementation specifics  (Ch6)
**Goal:** get the eye-tracking story straight on paper and add the missing concrete-engineering headings.
**Depends on:** glossary. (Some items depend on Track M code work.)

- [ ] 🔴 **State the I-AOI method explicitly** — name the Salvucci & Goldberg taxonomy, declare the **dwell/area-of-interest (I-AOI)** branch (NOT I-DT, NOT I-VT, **no velocity threshold**), report the real thresholds (90/70/135 ms; skim 45 / fixation 130), justify AOI for reading. (`06_Implementation/03_highlights.tex` §sensing; `todo.md`)
- [ ] **Make AOI-survives-reflow explicit as a strength** (currently one clause) — boxes re-measured from live DOM on mutation/resize/scroll (FR5.4). ✎ Verify resolution-independence before claiming it.
- [ ] ↻ **Add headlined backend/frontend + Tobii SDK subsections**: concrete stack (Next.js 16, React 19, TS 5, .NET 10, Bun 1.3; RTK Query, Tailwind v4, FastEndpoints 8, CsvHelper 33, Tobii.Research.x64 1.11; CI) and a dedicated **"Tobii SDK integration"** section (how the adapter subscribes to the SDK gaze callback, normalises to `GazeData`, the licensing/detection path); document **screen/resolution** assumptions. (`todo.md`)
- [ ] **Supplementary website / protocol guide** — screenshot + link at the end of the chapter "for the next students" (supervisor liked this).
- [ ] **Describe regression detection** in the report (code already does it end-to-end — verified 2026-06-18, see Track M): it is computed in `BuiltInEyeMovementAnalysisStrategy.cs`, carried as `RegressionCount` through the analysis snapshot, the decision context, and the export. Ensure `lst:impl-saccade` prose names it as a first-class event; verification belongs in Ch7 (FR18/RQ2). No code change.

**Definition of done:** the I-AOI answer is unambiguous and rehearsable; the SDK/stack/resolution have visible headings; no claim of a velocity threshold exists anywhere.
**Closes:** §6.1 (I-AOI), §6.3 (AOI-reflow), §8 (stack/SDK/resolution), G5.

---

### Phase 5 — Evaluation  (Ch7 — currently a stub)
**Goal:** answer "why does it actually work?" with a defensible methodology and real numbers.
**Depends on:** Track M measurements; the verification approach.

- [ ] ↻ **Write the chapter.** Methodology as a **V-model**: unit → integration → functional/system → performance, **plus** per-requirement verification and **walkthroughs** (the supervisor liked verifying every requirement).
- [ ] **Report measured NFR2 latency** against the ≤100 ms budget; **calibration accuracy/precision** from real hardware (ref `lst:impl-validation`).
- [ ] **Split "Experimentability and Developer Experience"** into two sections.
- [ ] **Add acceptance criteria to NFR3/NFR4** (measurability) (`todo.md`).
- [ ] **Results descriptive only** — interpretation deferred to Discussion (`CLAUDE.md` §2.6).
- [ ] **Honesty:** no invented numbers; `\todo{verify N}` until measured (`CLAUDE.md` §1.1).

**Definition of done:** every RQ has stated verification evidence; NFR budgets have measured values; no number is fabricated.
**Closes:** §9.1, I2/I3/I4/I6.

---

### Phase 6 — Discussion  (Ch8 — currently a stub; this is where we SELL it)
**Goal:** convert results into the contribution argument the supervisors said is under-sold.
**Depends on:** Phase 5 (Eval results), Ch2 related work + market matrix.

- [ ] ↻ **Write the chapter, 80% achievements / 20% limitations.**
- [ ] **Answer the problem statement directly** — "we said we'd do X/Y/Z; did we?" above the per-requirement level.
- [ ] **Comparison with related work** — "earlier RTR prototypes did X (coupled); commercial tools record or script; ours adds real-time intervention + pluggable decisioning + researcher-in-the-loop" (uses the market matrix).
- [ ] **Design-choice reflections** (good and bad): the **Kalman-filter framing** (the `pickBestLine` −24 hysteresis is a *poor-man's* Kalman filter — frame honestly as a heuristic that a real Kalman filter generalises; supervisor called this framing "perfect"); tech-stack-by-familiarity; file-store-vs-DB.
- [ ] **Limitations + future work**: Windows/Tobii (C3), no PDF, AI architectural-only, Kalman filter, fixation-duration overlay, regression detection, clinical population.
- [ ] **Lessons learned.**

**Definition of done:** a reader finishes Ch8 convinced the contribution is unique and validated; every design choice is owned; the Kalman reflection is present.
**Closes:** §9.2, §6.2 (Kalman), feedback-1 Phase 4.

---

### Phase 7 — Abstract, Conclusion, AI declaration  *(written LAST, per `CLAUDE.md` §2.1)*
**Goal:** the bookends and the mandatory disclosure.
**Depends on:** Phases 3–6 stable.

- [ ] **Abstract** naming the pillars: dual-screen researcher-led workflow; advisory/autonomous + pluggable (incl. external/AI) decisioning; context-preserving intervention (RRT); reproducible session record (`todo.md`).
- [ ] **Conclusion** ≤ 1 page, mirrors the Abstract, no new content; intro+conclusion-only read must convey the whole thesis.
- [ ] **Populate the Generative-AI declaration** appendix (`Backmatter/Appendix.tex`, `tab:gai-tools`) with actual tools/tasks/validation (`CLAUDE.md` §1.4) — supervisor reminded twice.

**Definition of done:** Abstract + Conclusion ratified; AI declaration complete and truthful.
**Closes:** M1/M2, L1.

---

### Phase 8 — Global consistency sweep & closure  🔴 *the guarantee*
**Goal:** enforce the "super consistent" promise and prove every comment is closed.
**Depends on:** all content phases.

- [ ] **Terminology grep sweep** against `glossary.md` — every off-glossary term hunted and fixed (e.g. `grep -ri "decision request\|external strategy\|reading runtime\|application host"`).
- [ ] **Cross-figure visual audit** — all figures share the style; same concept = same shape/colour/arrow.
- [ ] **First-sentence audit** — every section/paragraph leads with its gist (`revision-plan.md` Phase 5).
- [ ] **Cross-reference audit** — every figure/table/equation is `\ref`/`\cref`'d **and discussed** in the body; delete any orphan (`CLAUDE.md` §2.4).
- [ ] **5 Cs** (Complete, Concise, Clear, Concrete, Correct) + **spell-check** + **clean `latexmk` build** with no new warnings.
- [ ] **Intro + Conclusion-only read test** — passes.
- [ ] **Walk the comment-traceability matrix (§E)** — every row marked closed.

**Definition of done:** the matrix is 100% closed; build clean; a cold read finds no naming/visual drift.
**Closes:** §2 (final), J2, N1–N5.
**🚦 REVIEW GATE 2:** send the full revised draft to supervisors (a meeting is already booked) **before hand-in**. Resolve anything they raise. This is the actual zero-dissatisfaction checkpoint.

---

### Phase 9 — Defense preparation  *(after hand-in)*
**Goal:** the presentation is part of the assessment — zero dissatisfaction there too.

- [ ] **Slides** (~25 min, 2-person): high-level what/why, key figures (requirements + redrawn architecture diagrams), results, RQs; do not walk code.
- [ ] **Demo** — live or screen recording of a participant reading with/without adaptation + the researcher console.
- [ ] **Backup slides** for deep-dives; bring the report, cite page numbers.
- [ ] **Both authors rehearse** — take turns presenting and answering; prep for the **individual** questioning round.
- [ ] **Drill the shaky technical answers**: I-AOI vs I-DT/I-VT (no velocity threshold), the Kalman framing, AOI-survives-reflow.

**Closes:** §13 (defense logistics).

---

## D. Parallel track + decision gates

**Track M — Measurement & app code (runs alongside Phases 2–4; start in Phase 0 for lead time):**
- Hardware session: capture calibration accuracy/precision + closed-loop latency (NFR2). Needed by Phase 5.
- ✅ **Regression detection: VERIFIED already implemented end-to-end** (2026-06-18). Computed in `BuiltInEyeMovementAnalysisStrategy.cs:101`; first-class `RegressionCount` on `EyeMovementAnalysisRuntimeState`/`EyeMovementAnalysisSnapshot`; carried into the decision context via `DecisionContextSnapshot.cs:21` + `DecisionContextFactory.cs:33` (built-in *and* external providers); exported via `ExperimentReplayExport.cs:487`; shown on the frontend (`ReadingDynamicsLegend.tsx`, `SaccadePathOverlay.tsx`, replay metadata). **No code work needed** — only the report obligation remains (describe in Ch6, verify against FR18/RQ2 in Ch7). `todo.md` item closed.
- Remaining optional code: fixation-duration / per-word AOI overlay → **deferred to future work** (supervisor marked it low-priority).

**Decision gates — RESOLVED 2026-06-18:**
1. **Diagram tooling** → **Hybrid.** I do TikZ (with the shared style file) for the clean structural diagrams (container, hexagon, use-case, impl-chapter figures); the team hand-draws the one user-centric **master / two-screen hero** figure where a human touch reads better. I will produce a precise layout spec for the hand-drawn one.
2. **Promote the hero figure** → recommended yes; confirm during Phase 2 once the master is sketched.
3. **Optional code work** → regression detection already done (above); fixation-duration overlay = future work. No app code on the critical path.

---

## E. Comment-traceability matrix  *(the closure guarantee — nothing ships until every row is "done")*

**Legend:** ✅ closed · ◑ substantially done, residual work in the noted phase (mostly the Phase 8 consistency sweep or Phase 3 prose alignment) · ⊘ deliberately deferred (future work) · ☐ not started.

| # | Supervisor comment (meeting 2 + open meeting 1) | Phase | Status |
|---|---|---|---|
| 1 | Same concept named differently across figures/chapters | P0+P2+P8 | ◑ (P8 sweep) |
| 2 | "decision requests" → bidirectional context/proposals | P2+P3 | ◑ (figures done; P3 prose) |
| 3 | Reconcile decision provider vs module provider vs strategy | P0+P2 | ◑ (glossary+figures done; P8 verify) |
| 4 | Eye tracker = interface, not a 4th external box | P2 | ✅ |
| 5 | Decision provider coupled to researcher; show the API | P2+P3 | ◑ (figure done; P3 prose) |
| 6 | Be user-centric (participant/researcher at centre) | P2 | ✅ |
| 7 | One master diagram, then crop into parts | P0+P2 | ◑ (master done; zoom-in crop map owed) |
| 8 | Fig 5.2 arrow/legend semantics (who initiates; kill grey) | P2 | ✅ (resolved by deleting Fig 5.2) |
| 9 | Captions one size smaller | P1 | ✅ |
| 10 | Captions too long → move prose to body | P2 | ◑ (touched figures done; P8 audit) |
| 11 | Split long titles 5.2 / 5.6 / 7.4 | P1 | ✅ |
| 12 | Fig 5.4: rename "Domain"; pipeline arrows; built-in/ext consistency; numbering | P2 | ✅ |
| 13 | Use-case actor terms must match design diagrams | P2 | ✅ |
| 14 | Hyphenation glitches | P1 | ✅ |
| 15 | Fewer diagrams / kill redundant ones (e.g. WS envelope) | P0+P2 | ✅ |
| 16 | Requirements: show iterative refinement evidence (table) | P3 | ☐ |
| 17 | Prioritisation rationale (MoSCoW/FR/NFR) | P3 | ☐ |
| 18 | Coherency Ch4→Ch5 (constraints→requirements→drivers→decisions) | P3 | ☐ |
| 19 | Backend/frontend + Tobii SDK + screen/resolution headings | P4 | ✅ |
| 20 | I-AOI method explicit; NO velocity threshold (fix wrong live answer) | P4 | ✅ |
| 21 | AOI survives interventions/reflow — say it louder | P4 | ✅ |
| 22 | Fixation duration / per-word AOI overlay (low priority) | Track M | ⊘ (deferred to future work, supervisor-marked low priority) |
| 23 | Kalman-filter framing in Discussion | P6 | ☐ |
| 24 | Evaluation methodology (V-model + per-requirement + walkthroughs) | P5 | ☐ |
| 25 | Report measured latency / calibration numbers | P5 (Track M) | ☐ |
| 26 | Discussion: 80/20, answer problem statement, compare related work | P6 | ☐ |
| 27 | Real two-screen screenshots/photos | P2/P6 | ☐ |
| 28 | Supplementary website/guide for next students | P4 | ✅ |
| 29 | Declare generative-AI use | P7 | ☐ |
| 30 | Abstract/Conclusion name the pillars | P7 | ☐ |
| 31 | Defense: both speak, demo, individual Q&A, drill answers | P9 | ☐ |
| 32 | (M1 open) Concept loop F1 split + person icon | P2 | ✅ |
| 33 | (M1 open) "How might we" RQs (optional) | P3 | ☐ |

---

## F. Suggested sequence & critical path  (hand-in 2 Jul; ~2 weeks)

**Critical path** = Diagrams (P2) → coherency/impl prose (P3/P4) → Eval (P5) → Discussion (P6) → sweep (P8). Track M (measurements) must finish before P5.

- **Now → next supervisor meeting:** P0 (locks) + P1 (quick wins) + start P2 (diagrams) + kick off Track M. Bring redrawn diagrams to **Review Gate 1**.
- **Mid:** finish P2, do P3 + P4; run Track M measurements.
- **Pre-hand-in week:** P5 → P6 → P7, then P8 sweep. Hit **Review Gate 2** with the full draft.
- **2 Jul:** hand in. **After:** P9 defense prep.

This is aggressive but the work is bounded and mostly known. If time compresses, the **order above is also the priority order** — diagrams and the two stub chapters are non-negotiable; the lowest-risk trims are the optional code work (#22) and "How might we" rewording (#33), which become future-work notes instead.

---

*Definition of "done" for the whole effort: §E matrix 100% closed, both review gates passed with supervisor sign-off, clean build, and a cold read that finds no naming or visual drift.*
