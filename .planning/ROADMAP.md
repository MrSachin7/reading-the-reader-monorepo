# Roadmap: Reading the Reader Thesis Platform

## Overview

This roadmap treats Reading the Reader as a brownfield thesis platform that already has core experiment flows in place. The remaining work is sequenced to make the system defensible: first lock the architectural seams and experiment authority, then harden the researcher-run workflow and participant baseline, then prove context-preserving adaptive behavior, and finally close replay, export, and documentation gaps needed for thesis validation.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Experiment Authority & Sensing Boundary** - Isolate sensing and orchestration so the thesis has a defensible core runtime.
- [x] **Phase 2: Swappable Decision Strategies** - Make decision logic pluggable for manual, rule-based, hybrid, and external-provider modes.
- [x] **Phase 3: Pluggable Intervention Modules** - Make micro-interventions additive, inspectable, and safe to integrate.
- [x] **Phase 4: Device Setup & Calibration Workflow** - Make the full Tobii setup path reliable and gate session start correctly.
- [x] **Phase 5: Controlled Markdown Reading Baseline** - Keep Markdown reading stable while researchers configure and lock presentation conditions.
- [x] **Phase 6: Researcher Live Mirror & Session Operations** - Keep the live researcher console trustworthy during active experiment runs.
- [ ] **Phase 7: Context-Preserving Adaptive Reading** - Preserve reading position and rhythm when live interventions change layout.
- [ ] **Phase 8: Replayable Experiment Evidence & Thesis Guidance** - Produce reproducible exports, replay fidelity, and extension guidance for thesis defense.

## Phase Details

### Phase 1: Experiment Authority & Sensing Boundary
**Goal**: The platform has one defensible experiment authority and a stable sensing seam that isolates eye-tracker integration from decisions and UI adaptation.
**Depends on**: Nothing (first phase)
**Requirements**: MOD-01, MOD-05
**Success Criteria** (what must be TRUE):
  1. Eye-tracker integration can change behind a stable sensing contract without rewriting decision, intervention, or reader modules.
  2. Experiment lifecycle control remains consistent across setup, live operation, and data capture because one authoritative orchestration path owns session state.
  3. A contributor can identify distinct ownership for sensing, session orchestration, decision strategy, intervention execution, researcher controls, and participant adaptation without ambiguous cross-layer coupling.
**Plans**: 5 plans
Plans:
- [x] 01-01-PLAN.md - Add characterization tests and guardrails for runtime authority plus ingress regression coverage.
- [x] 01-02-PLAN.md - Extract typed websocket command ingress in front of the backend runtime authority.
- [x] 01-03-PLAN.md - Separate reader-observation handling from the orchestration authority and align participant websocket reporting.
- [x] 01-04-PLAN.md - Harden the device-facing sensing seam behind application-facing sensing operations.
- [x] 01-05-PLAN.md - Finish DI and REST contract cleanup so transport depends on focused authority, ingress, sensing, observation, and query interfaces.

### Phase 2: Swappable Decision Strategies
**Goal**: The adaptive runtime can swap decision strategies cleanly without destabilizing the rest of the platform.
**Depends on**: Phase 1
**Requirements**: MOD-02
**Success Criteria** (what must be TRUE):
  1. Manual, rule-based, hybrid, and external AI-driven decision providers can be added or swapped through one stable strategy contract.
  2. Decision strategies can request or approve interventions without embedding strategy-specific branching across sensing, reader, live-control, or export code paths.
  3. Adding a new decision strategy requires additive registration and contract compliance rather than edits across unrelated modules.
**Plans**: 4 plans
Plans:
- [x] 02-01-PLAN.md - Establish the stable strategy contract, curated decision context, and contract tests before runtime lifecycle changes.
- [x] 02-02-PLAN.md - Wire additive provider registration, proposal lifecycle handling, and researcher-first supervision into authoritative runtime behavior.
- [x] 02-03-PLAN.md - Expose decision configuration and proposal provenance through backend/frontend contracts plus replay/export.
- [x] 02-04-PLAN.md - Surface named experiment conditions and live supervisory controls in researcher workflows.

### Phase 3: Pluggable Intervention Modules
**Goal**: New intervention types can be integrated as explicit modules with inspectable contracts instead of invasive runtime rewrites.
**Depends on**: Phase 2
**Requirements**: MOD-03, MOD-04
**Success Criteria** (what must be TRUE):
  1. New micro-interventions can be added through a defined module boundary without invasive rewrites to session orchestration or the reader runtime.
  2. Each intervention exposes its supported parameters, required inputs, and safe application rules in a form future contributors and researchers can inspect.
  3. Researcher controls and runtime APIs can reference intervention modules through consistent metadata instead of type-specific special cases.
**Plans**: 4 plans
Plans:
- [x] 03-01-PLAN.md - Define explicit intervention-module contracts, first catalog descriptors, additive registry wiring, and catalog guardrail tests.
- [x] 03-02-PLAN.md - Migrate runtime execution, decision proposals, and replay/export provenance to the intervention-module boundary.
- [x] 03-03-PLAN.md - Expose an authoritative intervention-module catalog API and align frontend contract mirrors to module-based provenance.
- [x] 03-04-PLAN.md - Refactor researcher live controls and metadata/history views to consume module metadata while preserving the current workflow.
**UI hint**: yes

### Phase 4: Device Setup & Calibration Workflow
**Goal**: Researchers can reliably prepare a real Tobii-backed session from inside one guided workflow.
**Depends on**: Phase 3
**Requirements**: SETUP-01, SETUP-02, SETUP-03, SETUP-04, SETUP-05, SETUP-06
**Success Criteria** (what must be TRUE):
  1. Researcher can detect connected eye trackers, choose one active device, and provide license material from the guided workflow.
  2. Researcher can complete calibration and validation in the application and review calibration quality before starting a session.
  3. Session start stays blocked until device, licensing, calibration, reading material, and other required setup inputs are valid.
  4. Researcher can move through the setup workflow without leaving the platform or losing experiment context.
**Plans**:
- [x] 04-01-PLAN.md - Add authoritative setup-readiness contracts and Wave 0 backend coverage for device/licence/calibration/start blockers.
- [x] 04-02-PLAN.md - Align device-selection and calibration transport/frontend contracts around authoritative workflow state.
- [x] 04-03-PLAN.md - Refactor the experiment page into one guided setup workflow driven by authoritative readiness and calibration summary.
- [x] 04-04-PLAN.md - Harden calibration-route return/interruption handling and verify the full Tobii-ready setup flow end to end.
**UI hint**: yes

### Phase 5: Controlled Markdown Reading Baseline
**Goal**: Participants can read Markdown experiment material in a stable view while researchers control the allowed presentation conditions.
**Depends on**: Phase 4
**Requirements**: READ-01, READ-02, READ-03, READ-04
**Success Criteria** (what must be TRUE):
  1. Participant can read Markdown experiment content inside the application with reliable rendering.
  2. Researcher can configure typography, spacing, contrast, and related readability settings for a session.
  3. Researcher can lock or constrain presentation conditions so the participant view stays experimentally controlled.
  4. Participant reading view remains usable and visually stable throughout a live session under the configured conditions.
**Plans**: 4 plans
Plans:
- [x] 05-01-PLAN.md - Harden the backend-owned reading baseline contract and pin active-session authority with Wave 0 tests.
- [x] 05-02-PLAN.md - Clarify researcher reading-baseline setup, saved setup semantics, and experiment-stepper baseline application.
- [x] 05-03-PLAN.md - Stabilize the participant reading route by removing ambiguous fallbacks and enforcing lock-aware reader behavior.
- [x] 05-04-PLAN.md - Align dependent contract consumers, run closeout regressions, and finalize Phase 5 validation evidence.
**UI hint**: yes

### Phase 6: Researcher Live Mirror & Session Operations
**Goal**: Researchers can run and monitor an active experiment from a trustworthy live control surface.
**Depends on**: Phase 5
**Requirements**: LIVE-01, LIVE-02, LIVE-03, LIVE-04, LIVE-05
**Success Criteria** (what must be TRUE):
  1. Researcher can start, stop, and monitor a session from the same experiment workflow used to run the study.
  2. Researcher can watch a real-time mirrored participant view on a second screen during an active session.
  3. Researcher can see experiment health indicators, including sample rate, validity rate, and latency, while the session is running.
  4. Researcher can manually trigger micro-interventions and immediately see what fired, when it happened, and what source or rationale was associated with it.
**Plans**: 4 plans
Plans:
- [x] 06-01-PLAN.md - Harden the live-session monitoring contract and pin Phase 6 authority assumptions with Wave 0 tests.
- [x] 06-02-PLAN.md - Promote exact-mirror-first rendering and explicit degraded-fallback trust signaling in the researcher live reader.
- [x] 06-03-PLAN.md - Restructure the live controls into a coherent operator console and tighten the workflow handoff between setup, live run, and finish.
- [x] 06-04-PLAN.md - Clarify live chronology and latest-status evidence, then close the phase with regressions and validation evidence.
**UI hint**: yes

### Phase 7: Context-Preserving Adaptive Reading
**Goal**: Live adaptations preserve reading continuity strongly enough to defend the intervention approach in the thesis.
**Depends on**: Phase 6
**Requirements**: FLOW-01, FLOW-02, FLOW-03, FLOW-04
**Success Criteria** (what must be TRUE):
  1. Layout-changing interventions preserve the participant's reading position well enough that reading can continue without obvious loss of place.
  2. The currently read text region is anchored or restored when live adaptations change layout or presentation.
  3. Micro-interventions apply with guardrails that minimize perceived disruption and support rhythmic reading flow during live sessions.
  4. Cases where context preservation degrades or fails are surfaced in runtime indicators or logs for later inspection.
**Plans**: TBD
**UI hint**: yes

### Phase 8: Replayable Experiment Evidence & Thesis Guidance
**Goal**: The finished platform produces replayable, reproducible experiment evidence and documents how future teams can extend it safely.
**Depends on**: Phase 7
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DOCS-01
**Success Criteria** (what must be TRUE):
  1. Raw gaze samples, intervention events, and key session milestones are recorded with timestamps through the full experiment chronology.
  2. Researchers can export session data in JSON and CSV with schema versioning and enough configuration and provenance metadata to reproduce the run.
  3. The platform can replay recorded session chronology closely enough for post-session inspection of what the participant and researcher saw.
  4. Future contributors can use architectural documentation and design guidance to extend sensing, decision, intervention, and replay flows safely.
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Experiment Authority & Sensing Boundary | 5/5 | Completed | 2026-03-26 |
| 2. Swappable Decision Strategies | 4/4 | Completed | 2026-03-31 |
| 3. Pluggable Intervention Modules | 4/4 | Completed | 2026-03-31 |
| 4. Device Setup & Calibration Workflow | 4/4 | Completed | 2026-03-31 |
| 5. Controlled Markdown Reading Baseline | 4/4 | Completed | 2026-03-31 |
| 6. Researcher Live Mirror & Session Operations | 4/4 | Completed | 2026-03-31 |
| 7. Context-Preserving Adaptive Reading | 0/TBD | Not started | - |
| 8. Replayable Experiment Evidence & Thesis Guidance | 0/TBD | Not started | - |
