# Chapter 6 — Implementation: Authoring Plan

> This file is the authoring brief for Chapter 6. It defines the subsections,
> what each argues, the figures, the Ch5/Ch6/Ch7 boundary, and what each must
> NOT contain. It is a plan, not prose. Mirrors the Ch5 plan in
> `Chapters/05_SystemDesign/section.md`.

---

## Chapter mandate (do not drift)

- **Ch4** owns *what* the system must do. **Ch5** owns *why* the structure is
  shaped this way (conceptual ports, drivers, decisions; argued). **Ch7** owns
  *how well* it works (measurements against RQ1–RQ4).
- **Ch6 owns *how the architecture becomes running code*** — the concrete
  projects, the experiment session in motion, selected realizations, the UI it
  is operated through, and the engineering practice around it.
- The chapter's job is **realization and evidence**, not re-argument: "the
  architecture of Ch5 is not just a diagram, here it is in the build." It should
  make the reader believe the system genuinely exists and works.

### Guardrails enforced in every subsection

1. **Realization, not re-architecture.** Show how a structure is *realized*;
   do not re-derive or re-justify it (that was Ch5). When a section is tempted
   to argue *why* a boundary exists, cut it and `\cref` the Ch5 section instead.
   Each subsection lists what it must **defer** (to Ch5 or an appendix).
2. **Proportionate UI.** This is an architecture thesis, not a UX thesis. UI
   *appearance* is evidence (screenshots); UI *architecture* already lives in
   Ch5 §5.6. Keep UI to one focused section + an appendix gallery (decided).
3. **Code listings are sparing and illustrative** (decided). A few short
   snippets only — an interface signature, a one-line registration, a small
   method that makes a point. Never a file dump. The `listings` package is
   loaded. Larger code goes to an appendix or stays in the repo (cite the path).
4. **Screenshots come from the user** (decided; see CLAUDE.md §2.4). Do **not**
   launch the app. When a screen is needed, ask the user for it and wait.
5. **Verify before claiming.** Every concrete claim (a project reference, a
   class name, a CI step) must be checked against the actual repo, not assumed.

### Organizing principle (decided): session-walkthrough spine

Chapter 6 is anchored on **tracing one real experiment session end-to-end**
(setup → device/calibration → reading with live adaptation → comprehension/quiz
→ export). The walkthrough is the narrative heart (§6.2); the code-structure map
precedes it (§6.1) so the reader has the territory before the tour; deeper dives,
UI, and engineering practice follow. This naturally explains the experiment
session, ties architecture to running code, and surfaces the concerns' code in
the order a reader meets them.

### Scope boundary — where related artifacts live

| Artifact | Home | Note |
|---|---|---|
| Drivers, decisions, conceptual ports, the "why" | Ch5 | Do not re-argue; `\cref` it. |
| Project/solution layout, dependency rule in the build | **Ch6 §6.1** | The structural figure that earns its place. |
| Experiment-session lifecycle in code | **Ch6 §6.2** | The spine. |
| Concrete realizations of the four concerns | **Ch6 §6.2 inline + §6.3 deep dives** | Pick 2–4; do not narrate every file. |
| Detailed design class diagram | **Ch6 only if it argues something; else appendix** | Avoid exhaustive UML. |
| UI architecture (control/presentation split) | Ch5 §5.6 | Already argued. |
| UI appearance (screenshots, screen walkthrough) | **Ch6 §6.4 + appendix gallery** | Raster exception; from the user. |
| Latency / capability *measurements* | Ch7 | Ch6 describes the mechanism; Ch7 measures it. |

### RQ linkage (Ch6 supplies realization evidence; Ch7 measures)

- **RQ1 (modularity):** §6.2/§6.3 — the registry/seam realized + a worked
  "add a module" showing the additive path in actual code.
- **RQ2 (sensing pipeline):** §6.3 — the real-time gaze pipeline mechanism
  (lock-free hot path, transport); the latency number is Ch7.
- **RQ3 (context-preserving intervention):** §6.2 — the two-phase commit /
  anchor restoration in code.
- **RQ4 (researcher control & experimentability):** §6.2/§6.4 — session control,
  advisory/autonomous, and replay realized.

---

## Section plan

## §6.0 — Chapter preamble (unlabeled, no `\section`)

- **Role:** on-ramp. ~4–6 sentences: Ch5 justified the architecture; this chapter
  goes inside, following a real experiment session through the running code and
  documenting the engineering practice around it. Roadmap sentence (§6.1–§6.6),
  matching the Ch4/Ch5 opener convention (`\cref` roadmap).
- **Defer:** any new architecture claims.
- **Budget:** ~0.3 pp.

## §6.1 — Code Structure / Solution Layout  `sec:impl-structure`

- **Role:** give the reader the territory before the tour, and show the
  architecture realized in the build.
- **Covers:** the monorepo (`Frontend/` + `Backend/`); how Ch5's four layers and
  the ports map onto real projects (`core.Domain`, `core.Application` with the
  contracts, `infrastructure/*` adapters, `WebApi` transport; frontend
  `app`/`modules`/`redux`/`lib`); the boundary that keeps the Tobii SDK in its
  own infrastructure project (C1).
- **Key figure:** a **project-dependency map** (TikZ) derived from real
  `ProjectReference` edges (backend) and import direction (frontend), showing
  dependencies point inward — empirical proof that the Ch5 dependency rule holds
  in the build. *Verify from the `.csproj` files before drawing.*
- **Defer:** the "why" of the layering (Ch5 §5.2/§5.3); per-file narration.
- **Budget:** ~1.5–2 pp.

## §6.2 — Anatomy of an Experiment Session  `sec:impl-session`  *(the spine)*

- **Role:** the heart of the chapter; trace one real session end-to-end through
  the actual code, grounding the abstract loop of Ch5 §5.4.
- **Covers, in phase order:** setup (participant, material, condition) → device
  selection + calibration/validation (readiness gating) → reading with the live
  adaptive loop (sensing → analysis → decision → intervention) → comprehension/
  quiz → export/seal. `ExperimentSessionManager` as the orchestrator (its
  partial-class organisation), the session lifecycle/state, the authoritative
  snapshot broadcast to the control surface.
- **Surfaces inline:** the real-time gaze path at the reading phase; pluggable
  decision/intervention at the adaptation phase; the record/checkpoint at export;
  a **UI screenshot in context at each phase** (ask the user for: setup/stepper,
  calibration, reader, researcher live monitor, replay).
- **Key figure:** a **session state / lifecycle diagram** (phases + transitions),
  derived from the session lifecycle code. Possibly one small class-collaboration
  sketch for the session manager + its adapters *only if it argues something*.
- **Defer:** deep mechanism detail that deserves its own dive → §6.3; UI
  decisions/rationale → §6.4; measurements → Ch7.
- **Budget:** ~4–5 pp (largest section).

## §6.3 — Implementation Highlights  `sec:impl-highlights`

- **Role:** the 2–4 deeper dives the walkthrough flags, where a code-level detail
  is genuinely interesting and worth more than the tour gave it.
- **Candidate dives (pick 2–4 when scaffolding):**
  - Real-time gaze pipeline: lock-free hot path (`Interlocked`/`Volatile`, no
    lifecycle gate), WebSocket transport, gaze→content observation. (RQ2)
  - Pluggable modules in practice: the registry + DI registration, built-in vs
    external, and a **worked "add an intervention"** showing the additive change.
    (RQ1)
  - The external-provider framework realized: module definition + inbound handler
    + gateway routing/fallback in code. (RQ1)
  - Session record, checkpointing, and replay: the versioned schema, CsvHelper
    export, schema-validated (zod) import. (RQ4)
- **Form:** each dive = prose + at most one short listing + (optionally) one small
  figure. Avoid a code tour.
- **Defer:** the "why" (Ch5); numbers (Ch7); exhaustive code (appendix/repo path).
- **Budget:** ~3–4 pp.

## §6.4 — User Interface Realization  *(REMOVED 2026-06-22 — was `sec:impl-ui`)*

- **Status:** deleted as redundant. Its slimmed scope (single Next.js front-end;
  thin routing `app/` vs feature UI `modules/pages`; the two route groups
  realizing console vs reader; shared realtime state in `lib`) was already
  covered by §6.1; the in-context screenshots live in §6.2 and the UI behaviour
  in §6.3. The one unique point (the `useLiveExperimentSession` hook +
  control/presentation separation) was folded into §6.1. The fuller screenshot
  set still belongs in an appendix UI gallery (not yet created).

## §6.4 — Engineering Practice  `sec:impl-engineering`  *(was §6.5)*

- **Role:** the practices that make the system buildable, operable, and credible.
- **Covers:** build & CI (`frontend-ci`, `backend-ci` workflows; per-subproject
  dependency management; the Windows/Tobii constraint on hardware paths);
  cross-cutting concerns (error handling per the repo conventions, concurrency
  model of the hot path vs gated control, configuration, logging style);
  testing approach where present; **challenges and resolutions** (gaze-to-content
  mapping over Markdown, latency, Windows-only Tobii SDK, context preservation
  across re-render).
- **Defer:** anything already covered in Ch3 tools; deep CI YAML.
- **Budget:** ~2–3 pp.

## §6.5 — Summary  `sec:impl-summary`  *(was §6.6)*

- **Role:** recap what was realized (code structure, the session in motion,
  selected realizations, the UI, the engineering practice), and hand off to Ch7.
- **Close:** one sentence pointing to \cref{ch:evaluation}, which measures how
  well the realized system meets RQ1–RQ4.
- **Budget:** ~0.4 pp.

---

## Figures (apply the Ch5 bar: does it show a relation prose can't state?)

- **Fig. 6.1 — Project-dependency map** (§6.1, TikZ): projects + inward
  references. High value (empirical dependency-rule evidence). Verify from
  `.csproj`/imports.
- **Fig. 6.2 — Session state/lifecycle diagram** (§6.2): phases + transitions.
- **UI screenshots** (§6.2 inline, §6.4, appendix gallery): from the user; raster
  exception; `\includegraphics`.
- Optional: one small class-collaboration sketch for the session manager (§6.2)
  or a highlight diagram (§6.3) — only if it clears the bar.

## Open items / decisions to confirm while writing

- [ ] Which 2–4 §6.3 dives (recommend: gaze hot path, add-a-module, replay).
- [ ] Whether the session-manager class sketch earns a figure or stays prose.
- [ ] Appendix: create a "UI gallery" appendix (`app:ui-gallery`) and confirm the
      appendix file location/convention used by the thesis.
- [ ] Confirm no new acronyms beyond those already introduced; define any genuinely
      new implementation term (e.g. a CI tool) on first use.
- [ ] Collect screenshots from the user per phase before drafting §6.2/§6.4.

## Writing workflow and sequence (how to execute this plan)

Same as Ch5: write iteratively, one subsection at a time, two-stage
(scaffold → user-approved → prose → build check). Phase 0 prerequisites:
verify the project layout/references for §6.1, confirm citation needs (Ch6 is
mostly our own artifact; few if any new citations — ask before adding), and pick
the §6.3 dives. Recommended order: §6.1 (map, freezes structural vocabulary) →
§6.2 (spine) → §6.3 (dives) → §6.4 (UI) → §6.5 (engineering) → §6.0 preamble +
§6.6 summary last. Redesign `06_Implementation.tex` into a thin shell that
`\input`s per-section files (`01_structure`, `02_session`, `03_highlights`,
`04_ui`, `05_engineering`, `06_summary`), as Ch5 is organised.
