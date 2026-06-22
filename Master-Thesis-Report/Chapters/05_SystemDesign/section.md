# Chapter 5 — System Design and Architecture: Authoring Plan

> This file is the authoring brief for Chapter 5. It defines the subsections,
> what each one argues, which drivers/RQs it discharges, what diagram it carries,
> and — critically — what it must **not** contain. It is a plan, not prose.

---

## Chapter mandate (do not drift)

- **Ch4** owns *what* the system must do (FRs/NFRs, use cases). **Ch6** owns *how the code was built* (highlights, libraries, CI). **Ch5 owns the layer between: the justified structures and decisions that turn requirements into a defendable, modular system.**
- This chapter carries the central thesis claim (DSR: *the architecture is the contribution*). It must be **argued, not narrated**, and must **visibly answer RQ1–RQ4**.
- This is the highest-value chapter. Spend the page budget here (~14–17 pp).

### Two guardrails enforced in every subsection

1. **Gradual reveal.** Move from most abstract to most detailed. Each subsection introduces *one* new structural idea and reuses vocabulary already established. Never front-load the whole system. A reader who has only read Ch1–4 must never meet two new concepts in the same paragraph.
2. **Architecture, not implementation.** Discuss structure, boundaries, contracts, decisions, and trade-offs at the conceptual level. **No code, no class names dumped, no library/framework names as the subject of a sentence, no CI, no file layout.** Concrete realisation is deferred to Ch6. Each subsection below lists what it must *defer*.

### Organising axis (decided)

The chapter body is organised **by concern-layer** (sensing → analysis → decision → intervention), **not** by deployment tier (frontend/backend). The concern-layer axis *is* the axis of replaceability and therefore the thesis claim. Frontend/backend appears once, as physical topology in §5.2, and is then left behind.

### View progression (the spine)

A short **chapter preamble (§5.0)** orients the reader first (roadmap + one-sentence system-in-a-nutshell), then the chapter reveals the system as a sequence of architectural *views*, each one zooming in:

- §5.2 **Physical/container view** — the runtime topology (context).
- §5.3 **Logical view** — the four concern-layers and their contracts (the claim).
- §5.4 **Runtime view** — the adaptive loop in motion.
- §5.5 **Data view** — the authoritative session record.
- §5.6 **Extension view** — how the seams are used to add modules.
- §5.7 **Decision register** — the consolidated defense.

### RQ / driver traceability (every section is tagged)

| RQ | Lives primarily in |
|----|--------------------|
| RQ1 Modularity | §5.3, §5.6 |
| RQ2 Sensing pipeline | §5.4 |
| RQ3 Context-preserving intervention | §5.4 |
| RQ4 Researcher control & experimentability | §5.5, §5.6 |

Drivers D1–D6 are defined in §5.1 (`tab:design-drivers`) and are the named currency used throughout: every decision cites the driver(s) it serves.

### Scope boundary — where related artifacts live (do not pull these into Ch5)

UI design and "class diagram" artifacts are distributed by the argument they serve, not gathered into Ch5 (and not given their own chapter). A future session must **not** pull UI appearance or detailed class diagrams into this chapter — doing so would signal UX as a primary contribution and dilute the architecture claim.

| Artifact | Home | Note |
|---|---|---|
| Domain model (conceptual entities) | Ch4 (`domain_model.tex`) | Analysis-level; already placed. |
| Component / contract / port diagram (four layers, seams, dependency direction) | **Ch5 §5.3** | Contract altitude only — responsibilities and dependency arrows, no fields/methods. |
| Detailed design class diagram (classes with methods, DI wiring) | Ch6 highlight, or appendix | Avoid the exhaustive version; include only if it carries an argument. |
| UI *architecture* (control-plane vs presentation split, second-screen mirror, readiness gating) | **Ch5 §5.6 / §5.3–§5.4** | Architectural because it is separation of concerns, not appearance. |
| UI *appearance* (dashboard / reader screenshots, screen walkthrough) | Ch6 realisation, or appendix gallery | Implementation evidence, not architecture. |
| Wireframes / mockups | Ch4, only if they elicited/validated requirements | Do not retrofit as decoration. |

Rule of thumb: Ch5 shows *contracts and dependency direction*; anything with methods, pixels, or screenshots belongs to Ch6 or an appendix.

---

## §5.0 — Chapter preamble (unlabeled, no `\section`)

- **What it is:** a short prose opener placed immediately after `\chapter{System Design and Architecture}` and *before* `\section{Architectural Drivers}`. It is the chapter's on-ramp, not a numbered section. ~4–6 sentences.
- **Why it exists:** the chapter currently crosses a chapter boundary straight into "Architectural Drivers" with no roadmap, and §5.1's driver table already names solution elements (sensing adapter, external-provider seam, second-screen mirror, session record) before the reader has any mental model. The preamble fixes both: it orients, and it gives that vocabulary a peg to land on.
- **Two jobs (keep to these, do not expand into §5.2):**
  1. **Roadmap / role.** State that this chapter carries the central claim (the architecture *is* the contribution, per the DSR framing in `sec:research-approach`), that it is organised as a sequence of architectural views descending from system context to the extension seams, and that it visibly answers RQ1–RQ4. One sentence may name the view progression.
  2. **System-in-a-nutshell.** Exactly one sentence giving the reader a mental model before the drivers arrive: the platform partitions adaptive reading into four replaceable concerns (sensing, analysis, decision, intervention) joined by a bounded real-time loop and backed by one authoritative session record. This is the peg for §5.1's vocabulary.
- **Hard limits:** introduces no new acronyms, no diagram, no driver IDs (those start in §5.1), and **no justification** — it asserts the shape in one sentence and defers all argument to §5.2 onward. It must not become a mini-overview; if it starts explaining *why*, it has overreached into §5.2.
- **Defer to Ch6:** everything implementation.
- **Pitfall:** the nutshell sentence is a *peg*, not a summary. Resist listing all six drivers or all the layers' contracts here — the reader should finish the preamble oriented but still curious.
- **Page budget:** ~0.3 pp (one short paragraph).

---

## §5.1 — Architectural Drivers `sec:design-drivers`  *(WRITTEN)*

- **Status:** complete. Isolates the architecturally significant subset of requirements as drivers D1–D6 plus the four fixed constraints C1–C4; `tab:design-drivers` maps each driver to origin, structural implication, and where it is evaluated.
- **Role for the rest of the chapter:** this is the contract the chapter must satisfy. Do not restate it; *reference* D1–D6 by ID from here on.
- **Page budget:** ~1.5 pp (done).

---

## §5.2 — Architectural Approach and System Overview `sec:design-style`

- **One idea introduced:** the overall *shape* of the system and the *style* chosen to satisfy D1.
- **Gradual reveal within the section:**
  1. Start at a **system-overview** altitude: the user-centric illustrative master (`architecture_overview.svg`, Fig `fig:design-context`) showing the participant and researcher, the two screens, the eye tracker as the sensing interface at the foot of the participant's screen, the backend (application core), the external decision provider via a well-defined API, and the session record. This orients a reader who has never seen the system.
  2. **Runtime parts in prose (no separate figure).** The old C4 *container* diagram was deleted on supervisor feedback (it was the most-criticised, redundant third drawing). Its content is now carried in prose: one web front-end with two surfaces (console + reading surface) that talk only to the backend over two channels (REST for commands, a WebSocket for the live gaze), the file-backed session record, and the external-provider API. The two-channel split is shown *dynamically* in the loop figure (§5.4), not as a static box diagram.
  3. Name and justify the **architectural style**: inward-dependency layering / ports-and-adapters, derived directly from **D1**. State the dependency rule in one sentence (concrete details depend inward on abstractions; the core depends on nothing outward).
- **The argument (why this shape):** contrast against the coupled prior RtR prototypes (`refsgaard2024rtr`, `pereira2024typography`, `palinec2024reactive`) whose tight coupling is the documented gap. Briefly note the alternative *not* taken (a single coupled application) and why D1 rules it out. Keep the full alternatives table for §5.7 — here, just one paragraph of motivation.
- **Discharges:** D1 (sets up the whole chapter).
- **Diagrams:** the **illustrative master** (`architecture_overview.svg`, drawn in Excalidraw) is the single overview figure for this section. The earlier C4 system-context and C4 container TikZ diagrams were both removed (context → replaced by the master; container → folded into prose + the loop). Do not re-create them.
- **Defer to Ch6:** the actual projects/solutions, language/framework names, the monorepo layout, how the socket or store is implemented.
- **Pitfall:** do not let this section become a tour of every box. It establishes *shape and style*, then hands off. Resist describing each container's internals — that is §5.3.
- **Page budget:** ~2.5–3 pp.

---

## §5.3 — The Four-Layer Modular Decomposition `sec:design-modules`

- **The centerpiece. This section is the thesis claim made structural.**
- **One idea introduced:** the system's behaviour is partitioned into four replaceable concerns along the axis of *replaceability*, each hidden behind a stable contract.
- **Gradual reveal within the section:** introduce the four concerns one at a time, in data-flow order, so each builds on the last:
  1. **Sensing** — produces a raw gaze/sample stream from a source. Contract admits Tobii *and* non-hardware sources (mouse, webcam) — this is where **D5** is satisfied and why the layer exists as an abstraction, not just a Tobii wrapper.
  2. **Analysis (eye-movement)** — turns samples into oculomotor events (fixations, saccades, regressions). Contract is "stream of samples in, stream of events out."
  3. **Decision (strategy)** — consumes events + context, decides whether/what to intervene. Contract is the **external-provider seam** (origin: **C3**); the thesis supplies the *boundary*, not the algorithm.
  4. **Intervention (execution)** — commits a context-preserving change to the presented text at a controlled boundary.
- **The dependency rule, made explicit:** each layer depends only on the *contract* of its neighbour, never the implementation; the reading runtime depends on none of the concrete modules. State precisely what "independently replaceable" means here: a new intervention / analysis / decision provider is **additive** (new code implementing an existing contract), requiring no modification to the core runtime. This sentence *is* RQ1.
- **Make the contracts legible:** describe each seam as an abstract port (responsibility, what crosses it, direction of dependency). Conceptual signatures only — no code.
- **Discharges:** **D1, D5; RQ1.**
- **Diagram (flag):** a **component/dependency diagram** showing the four layers, the ports between them, and the inward dependency arrows (i.e. the dependency rule visualised). This is the single most important figure in the thesis.
- **Defer to Ch6:** interface names, the DI/installer mechanism, how adapters are registered, language idioms.
- **Pitfall:** do not slide into "here is the IEyeTrackerAdapter interface." Stay at the level of *concern, responsibility, contract, dependency direction*. The moment a real type name becomes the subject, you are in Ch6.
- **Page budget:** ~3–4 pp (largest section).

---

## §5.4 — The Real-Time Adaptive Loop `sec:design-loop`

- **One idea introduced:** the four static layers of §5.3 set *in motion* as a closed, time-bounded loop, and the runtime concessions that liveness forces on the clean structure.
- **Gradual reveal within the section:**
  1. Present the loop abstractly: gaze → event → decision → intervention → re-render → (back to gaze). This is the **abstracted system sequence diagram** the reader was promised.
  2. Introduce the **dual-channel** design: high-frequency gaze travels a dedicated real-time channel, *not* the request/response path — derived from **D2** (responsiveness budget). Argue why the modular indirection of §5.3 must not delay an intervention past its point of validity.
  3. Introduce **robustness** (**D3**): graceful degradation when a device or external provider disconnects, and session-state checkpointing so an interrupted session is recoverable.
- **The honest tension (do not hide it):** the cleanest separation (§5.3) is rarely the fastest or most fault-tolerant at runtime. Name this tension explicitly and show how the design reconciles it (dedicated channel for the hot path; the indirection lives off the latency-critical path). This candour is what makes the chapter *defensible* rather than promotional.
- **Context-preservation (RQ3):** interventions are committed at *controlled boundaries* so text adapts without destroying the reader's place; tie to the recovery concerns in `jensen2025context`.
- **Discharges:** **D2, D3; RQ2, RQ3.**
- **Diagram (flag):** a **UML sequence diagram** of one loop iteration across the four layers + the two channels.
- **Defer to Ch6:** socket framing, serialization, the checkpoint file format, timer/loop mechanics, measured latency numbers (those are Ch7 results).
- **Pitfall:** this section *describes the design of* the loop; it does not *report measurements*. Latency budget = a design constraint here; latency *results* = Ch7. Keep them apart.
- **Page budget:** ~2.5–3 pp.

---

## §5.5 — Session Record and Reproducibility `sec:design-data`

- **One idea introduced:** a single authoritative, schema-versioned record is the architectural answer to reproducibility, and it is owned by the backend as the one source of truth.
- **Gradual reveal within the section:**
  1. Why one authoritative record exists (the Data Consumer stakeholder; **D4**): a session must be reconstructable *from the record alone*.
  2. What the record must capture at the conceptual level: parameters, calibration, events, presentation configuration — enough to reconstruct, no more (bounded by **C4**, GDPR).
  3. Replay as the proof that the record is sufficient (the record is "complete" iff a session can be replayed from it). Ties to **RQ4** and FR21.
- **The argument:** justify *file-backed, checkpointed* persistence over a full database as appropriate to the thesis scope and the single-operator model — but defer the *comparison row* to §5.7.
- **Discharges:** **D4; RQ4.**
- **Diagram (optional, flag):** a record/data-model sketch or a replay data-flow, only if it earns its place.
- **Defer to Ch6:** the concrete schema, serialization format, CSV/export specifics, the checkpoint worker.
- **Page budget:** ~1.5–2 pp.

---

## §5.6 — Extensibility and the External-Provider Seam `sec:design-extensibility`

- **One idea introduced:** the seams of §5.3 are *used*, not just declared — a concrete walkthrough of extension closes the loop on RQ1 and on the researcher-control story.
- **Gradual reveal within the section:**
  1. Walk through adding a **new intervention** end-to-end at the architectural level: which contract it implements, what it must *not* touch, why the core needs no change. This is the additive-extension claim made vivid.
  2. Walk through plugging an **external decision provider** across the seam (the C3 boundary): what crosses it, how the system degrades if the provider is absent (links back to **D3**).
  3. The **operator control plane** (**D6**): guided setup, readiness gating, the unified researcher control surface and second-screen mirror — framed as an architectural concern (separation of researcher control from participant presentation), not a UI tour.
- **Discharges:** **D1, D6; RQ1, RQ4.**
- **Diagram (flag, optional):** a small "before/after additive extension" or a seam-sequence showing an external provider responding.
- **Defer to Ch6:** the actual sample/mock providers, registration code, UI component structure.
- **Pitfall:** keep this about *the architecture enabling extension*. It is the payoff of §5.3, not a feature catalogue.
- **Page budget:** ~1.5–2 pp.

---

## §5.7 — Design Decision Register `sec:design-decisions`

- **Role:** the consolidated defense. Each prior structural section argues its *primary* decision inline; this section gathers them into one ADR-style register for traceability and examiner scrutiny. The §5.1 prose already forward-references this section, so it must exist.
- **Format:** a table — **Decision · Driver(s) served · Alternatives considered · Rationale for choice** — one row per significant decision. Tie every row to a driver ID; never present an alternative without saying which driver rules it out.
- **Candidate rows (each a genuine fork, not a strawman):**
  - Inward-dependency layering vs a single coupled application — D1 (vs prior prototypes).
  - High-frequency gaze on a dedicated channel vs through the request/response path or app state — D2.
  - External decision **seam** (contract) vs embedding decision logic in the core — D1, C3.
  - File-backed, checkpointed store vs a full database — D3, D4, scope.
  - Sensing **port** (Tobii + mouse + webcam) vs calling the Tobii SDK directly — D5, C1.
  - Authoritative server-side session record vs client-held state — D4.
- **Discharges:** traceability across all drivers; sets up the Ch7 evaluation criteria.
- **Defer to Ch6:** any "and here is how we coded it."
- **Pitfall:** alternatives must be ones a competent architect would actually weigh. A strawman alternative weakens the defense.
- **Page budget:** ~1.5–2 pp.

---

## Chapter close (per thesis CLAUDE.md §2.6)

End §5.7 / the chapter with a 3–5 sentence summary of what the architecture established (the four replaceable concerns, the bounded real-time loop, the reproducible record, the extension seams), then one sentence pointing to Ch6 (how this architecture is realised in code).

---

## Open items / decisions still to confirm with user

- [ ] Diagram toolchain: hand-drawn vector (PDF/SVG) vs generated (e.g. PlantUML/Mermaid → vector). CLAUDE.md requires vector and prefers reproducible-from-source.
- [ ] Whether §5.5 and §5.6 each warrant their own figure or stay prose-only (page pressure).
- [ ] Confirm no *new* acronyms beyond those already introduced in Ch1–4 (CLAUDE.md §1.5 forbids new ones here).
- [ ] Verify all `\cite{}` keys used (`refsgaard2024rtr`, `pereira2024typography`, `palinec2024reactive`, `jensen2025context`, `chen2013asr`, `hevner2004designscience`, `clegg1994moscow`) exist in `bibliography.bib` before drafting prose.

---

## Writing workflow and sequence (how to execute this plan)

We write Chapter 5 **iteratively, one subsection at a time**, not in a single pass. Each subsection goes through the two-stage workflow below before we move on.

### Phase 0 — prerequisites (before any prose)

- **Verify citations.** Confirm the seven keys in the open-items list exist in `bibliography.bib`. If any is missing, stop and ask the user — do not coin keys (thesis CLAUDE.md §1.1, §3.2).
- **Decide the diagram toolchain.** Vector output, reproducible-from-source preferred. Rough out the figures the spine depends on so prose can reference stable `\label`s: System-Context + Container (5.2), dependency/component diagram (5.3), sequence diagram (5.4).
- **Freeze the acronym inventory.** No new acronyms are introduced in Ch5 (CLAUDE.md §1.5); list the ones already defined in Ch1–4 that this chapter reuses.

### Per-subsection micro-workflow (every subsection, per thesis CLAUDE.md §3.7)

1. **Stage 1 — evidence scaffold.** A bullet list: one claim per bullet, each tagged with its `bibliography.bib` key OR `\todo{cite}` OR "author argument", plus the driver/RQ it discharges and any figure it needs. Stop and show the user. No prose yet.
2. **Stage 2 — prose.** Only after the user confirms the scaffold. One sentence per line in `.tex`; follow paragraph-shape and tense rules (§2.6).
3. **Build check.** `latexmk -xelatex main.tex` from the report directory; report new citation/reference warnings. Do not declare the subsection done if it introduced warnings (§3.4).

### Recommended writing order (not document order)

Write the spine first (it freezes the vocabulary everything else reuses), then build outward, and write the on-ramp last.

1. **§5.2 Approach & Overview** — establishes shape + style vocabulary.
2. **§5.3 Four-Layer Decomposition** — the centerpiece; defines layers / contracts / dependency rule that all later sections reuse. *(After this, vocabulary is frozen.)*
3. **§5.4 Adaptive Loop** — builds on the four layers.
4. **§5.5 Session Record.**
5. **§5.6 Extensibility** — uses the seams from §5.3.
6. **§5.7 Decision Register** — consolidates decisions argued in 5.2–5.6, so it must come last of the body.
7. **§5.0 Preamble + chapter-closing summary** — written last, once the body is fixed and we know exactly what to promise and recap.

Rationale: §5.1 is already written; §5.2/§5.3 own the shared vocabulary so they go first; §5.7 and §5.0 are both retrospective/preview artifacts that are cheapest and most accurate to write after the body exists.
