# Chapter 5 — System Design and Architecture: Authoring Guide

This file is the **content brief** for `05_SystemDesign.tex`. Before writing or
expanding any section in this chapter, read the matching entry below. It states
what each section must contain, why it belongs there, and what an examiner is
checking. The `.tex` file mirrors this as inline comments; this file is the
fuller reasoning.

## Chapter role (do not blur with Ch4 or Ch6)

- **Ch4** owns *what* the system must do (FRs/NFRs, use cases, activity flow).
- **Ch6** owns *how the code was built* (highlights, CI, challenges).
- **Ch5** owns the layer between: the **justified structures and decisions**
  that turn requirements into a defendable, modular system.

Three constraints govern everything here:

1. **The architecture is the contribution.** Methodology commits to Design
   Science Research, where the architecture itself is the central claim
   (`03_Methodology/01_research_approach.tex`). Chapter 5 is the *evidence* for
   that claim — argue it, do not narrate it.
2. **It must visibly answer RQ1–RQ4** (`02_KeyConceptsAndRelatedWork/05_final_problem_statement.tex`):
   modularity (RQ1), sensing-pipeline feasibility (RQ2), context-preserving
   intervention (RQ3), researcher control/experimentability (RQ4). Each RQ has
   an obvious home below.
3. **No Ch4/Ch6 collision.** Design = structures + decisions, not requirements
   and not code-level build detail.

Note: the `architecture_propoal.md` direction (thin-domain → rich-domain,
module-area foldering) is **largely already implemented** — the backend has
`core.Domain/{Sensing/Calibration, EyeMovementAnalysis, Decisioning, Reading}`.
So this chapter describes a *realised* clean architecture, and the proposal's
reasoning is raw material for §5.8.

---

## 5.1 Architectural Drivers (`sec:design-drivers`)

- **Include:** A distillation of the *architecturally significant requirements*
  (not a re-list of all FRs): NFR1 modularity, NFR2 latency, NFR6 extensibility,
  NFR4/NFR7 reliability+recoverability, NFR5 reproducibility, NFR8 hardware
  independence, plus the scope constraint that AI support is *architectural, not
  implemented*.
- **Why:** Shows the design is *derived* from requirements, not invented. In DSR
  this is where evaluation criteria are pre-wired for `ch:evaluation`.
- **Examiner expects:** Traceability, and the modularity claim framed as
  *testable* (substitution at test time, per NFR1's own rationale).

## 5.2 Architectural Overview (`sec:design-overview`)

- **Include:** The big picture in 1–2 diagrams — a **C4 context/container view**
  and the **closed adaptive loop** (sensing → gaze-to-content mapping → event
  extraction → decision strategy → intervention execution → logging/replay),
  with the researcher control plane mirrored beside the participant plane. Name
  the frontend/backend split and the two transports (REST for commands,
  WebSocket for high-frequency gaze).
- **Why:** Gives the reader vocabulary and a mental model before drilling into
  seams; everything later refers back here.
- **Examiner expects:** A genuine architecture diagram at the right altitude
  (containers/components, not classes) and the closed-loop framing.

## 5.3 Architectural Style and Principles (`sec:design-style`)

- **Include:** The four-layer Clean/Onion arrangement (Domain → Application →
  Infrastructure/WebApi) and the inward-only **dependency rule**. Make explicit
  that **Ports & Adapters (Hexagonal)** is the *mechanism* of swappability:
  `InfrastructureContracts` interfaces are the ports, `infrastructure/*` are the
  adapters. State the ownership principle: Domain owns meaning, Application owns
  orchestration, Infrastructure owns side effects, WebApi owns transport.
- **Why:** Conceptual core of RQ1 — modularity is a *consequence* of dependency
  inversion, not a bolted-on feature.
- **Examiner expects:** That known patterns are named and cited (Clean
  Architecture, Hexagonal/Ports & Adapters, dependency inversion) rather than
  reinvented, and *why* they buy replaceability.
- **Citations:** verify in `bibliography.bib` first; if absent, ask the user for
  the source (do not invent). Marked `\todo{cite}` in the `.tex`.

## 5.4 Module Decomposition and Boundaries (`sec:design-modules`) — heart, RQ1

- **Include:** Walk the bounded module areas as they exist in
  `core.Domain`/`core.Application`: Sensing (devices + calibration),
  Eye-Movement Analysis/Observation, Decisioning, Interventions,
  Reading/Presentation, Session authority, Replay/Export. For *each*: single
  responsibility, the **contract/interface that defines its seam**, and what is
  swappable behind that seam without touching the core. A summary table
  (module → port interface → swappable implementations → FR/NFR satisfied) is
  strong.
- **Why:** Where the modularity claim becomes inspectable rather than rhetorical;
  Ch7 substitution tests answer directly to this.
- **Examiner expects:** Crisp boundaries, no leaky responsibilities, and honesty
  about `ExperimentSessionManager` being the strong center (it stays the
  orchestrator; policy moved to domain).
- **Grounding:** read the real interface files before writing
  (`IEyeTrackerAdapter`, decision-strategy/provider contracts, intervention
  descriptors). Every "swappable seam" claim must trace to actual code.

## 5.5 The Adaptive Runtime Loop (`sec:design-loop`) — RQ2 + RQ3

- **Include:** A **UML sequence diagram** of one cycle (raw sample →
  screen-space mapping → token mapping → fixation/saccade → decision →
  intervention command → context preservation → logging). Explain the realtime
  channel vs request/response separation (NFR2) and how the latency budget is
  allocated across the loop. Then context preservation in design terms (anchor
  reading position, commit at controlled boundaries) — FR9 / RQ3.
- **Why:** RQ2/RQ3 are behavioural; a static module map cannot discharge them.
- **Examiner expects:** A clear runtime story and a stated latency budget.
- **NFR2 number:** left as `\todo{cite}` until a literature-backed threshold is
  supplied — do **not** invent a millisecond value.

## 5.6 Extensibility and the External Provider Model (`sec:design-extensibility`)

- **Include:** Decision-strategy abstraction (built-in rule-based vs external
  provider), the four execution modes (control / manual / automated / hybrid),
  and the out-of-process module-provider framework: how a provider connects,
  declares capabilities, receives context envelopes, and routes commands through
  the same validation/logging path as built-ins. Covers FR8, FR18, FR19, FR20.
- **Why:** The "AI is architectural, not implemented" defence — decision
  intelligence is a pluggable provider behind a documented protocol.
- **Examiner expects:** A protocol-level argument (a third party could implement
  a provider from the docs, FR19.4) and graceful degradation on provider loss
  (FR19.3 / NFR4).
- **Diagram:** deployment/integration diagram with the provider as a separate
  process over the protocol.

## 5.7 Data Model, Interfaces and the Session Record (`sec:design-data`) — RQ4, NFR5

- **Include:** Domain model (key entities/snapshots), message-type contracts,
  the canonical authoritative session snapshot, and the manual frontend/backend
  contract mirroring (an honest design fact — defend or critique it). Then the
  export schema with versioning: the self-contained session record that makes a
  session reproducible from the artifact alone (Data Consumer actor).
- **Why:** RQ4 (auditable record, replay) and NFR5 (reproducibility) are
  data-shaped claims.
- **Examiner expects:** Schema/version discipline and a clear statement of what
  a session record contains and why it is sufficient to reconstruct the session.
  Naming the manual-mirroring trade-off (vs code-gen/shared package) is better
  than hiding it; it can seed a §5.8 entry and a Future Work note.

## 5.8 Design Decisions and Alternatives (`sec:design-decisions`) — rigor

- **Include:** ADR-style entries (table + paragraph each):
  context → options considered → criteria → choice → consequences. Candidates
  (reasoning already in `architecture_propoal.md`):
  - Clean/Onion architecture vs simpler pragmatic layering
  - Dual transport (WebSocket + REST) vs single channel
  - In-process strategy + out-of-process provider vs plugin DLLs vs microservices
  - Single authoritative `ExperimentSessionManager` vs distributed state
  - Monorepo vs polyrepo (rationale here; concrete package tree in `ch:implementation`)
  - Manual FE/BE contract mirroring vs code-gen / shared package
  - Rich-domain refactor (policy/presets/lifecycle out of Application)
  - Markdown-only content (scope constraint)
- **Why:** Hevner's DSR guidelines treat justified design decisions as
  first-class contributions; this separates a thesis from a project report.
- **Examiner expects:** Honest trade-offs, not post-hoc justification. A decision
  with no rejected alternative is not yet an argument.

## 5.9 Summary (`sec:design-summary`)

- 3–5 sentences recapping what the design establishes, then one sentence
  pointing to `ch:implementation`. Per authoring rules §2.6.

---

## Recommended diagrams

- §5.2: C4 container diagram + closed-loop block diagram
- §5.3: layered dependency diagram (inward-only rule)
- §5.4: module-seam / component diagram (ports = interfaces)
- §5.5: UML sequence diagram of one adaptive cycle
- §5.6: deployment/integration diagram (provider as separate process)

## Page budget

Target ~12–16 pages. If space tightens: §5.6 can merge into §5.4, and §5.3 can
shrink into §5.2. Do **not** sacrifice §5.4, §5.5, or §5.8 — they carry RQ1–RQ3
and the DSR rigor.
