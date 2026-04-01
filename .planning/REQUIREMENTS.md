# Requirements: Reading the Reader Thesis Platform

**Defined:** 2026-03-26
**Core Value:** Build a defendable, modular adaptive reading platform that supports real Tobii-backed experiments and interchangeable intervention and decision modules without breaking the participant reading flow or the researcher workflow.

## Scope Note

This is a brownfield thesis platform. Some v1 requirements are already partly or largely implemented in the repository, but they remain part of the thesis scope because the final system must still deliver them convincingly enough to defend the architecture, the experiment workflow, and the adaptive reading runtime.

## v1 Requirements

### Setup and Calibration

- [x] **SETUP-01**: Researcher can detect connected eye trackers from inside the application without manual device configuration.
- [x] **SETUP-02**: Researcher can select exactly one active eye tracker and provide the required license material before streaming begins.
- [x] **SETUP-03**: Researcher can complete calibration and validation from inside the application without using separate external calibration software.
- [x] **SETUP-04**: Researcher can view calibration quality metrics before starting a session.
- [x] **SETUP-05**: System blocks session start until required setup steps are completed successfully.
- [x] **SETUP-06**: Researcher can follow a guided experiment workflow covering device, license, calibration, reading content, and session start.

### Participant Reading Experience

- [x] **READ-01**: Participant can read Markdown-based experiment content inside the application.
- [x] **READ-02**: Researcher can configure session presentation settings such as typography, spacing, contrast, and related readability controls.
- [x] **READ-03**: Participant reading view stays usable and visually stable during a live experiment session.
- [x] **READ-04**: Researcher can lock or constrain presentation conditions for a session so experimental conditions remain controlled.

### Researcher Live Observation and Control

- [x] **LIVE-01**: Researcher can view a real-time mirrored representation of the participant reading session on a second screen.
- [x] **LIVE-02**: Researcher live view displays experiment health indicators including sample rate, validity rate, and latency.
- [x] **LIVE-03**: Researcher can manually trigger micro-interventions during an active session.
- [x] **LIVE-04**: Researcher can see what intervention was triggered, when it happened, and what source or rationale was associated with it.
- [x] **LIVE-05**: Researcher can start, stop, and monitor an experiment session from the platform without leaving the experiment workflow.

### Modularity and Extensibility

- [x] **MOD-01**: System exposes a stable sensing boundary that isolates eye-tracker integration from decision-making and UI adaptation logic.
- [x] **MOD-02**: System exposes a stable decision-strategy boundary so manual, rule-based, hybrid, and external AI-driven strategies can be added or swapped without rewriting the whole application.
- [x] **MOD-03**: System exposes a stable intervention boundary so new micro-intervention modules can be added with additive code rather than invasive rewrites.
- [x] **MOD-04**: Intervention modules declare their supported parameters or required inputs clearly enough for researchers and future developers to understand how to use them.
- [x] **MOD-05**: Architecture and code organization preserve strict separation between sensing, session orchestration, decision strategy, intervention application, researcher controls, and participant UI adaptation.

### Context Preservation and Reading Flow

- [ ] **FLOW-01**: System preserves the participant's reading position during layout-changing interventions strongly enough that reading can continue without obvious loss of place.
- [ ] **FLOW-02**: System anchors the currently read text region or equivalent reading context during layout-changing interventions.
- [ ] **FLOW-03**: Failures or degraded cases in context preservation are observable or logged for later inspection.
- [ ] **FLOW-04**: Micro-interventions are applied in a way intended to minimize perceived disruption and support rhythmic reading flow.

### Experiment Data, Replay, and Documentation

- [ ] **DATA-01**: System records raw gaze samples and key derived session events with timestamps.
- [ ] **DATA-02**: System records intervention events with source and rationale metadata.
- [ ] **DATA-03**: System exports session data in JSON and CSV formats.
- [ ] **DATA-04**: Exported session data includes schema versioning and enough metadata to support reproducibility.
- [ ] **DATA-05**: Platform can reconstruct or replay session chronology from recorded experiment data.
- [ ] **DOCS-01**: Thesis deliverables include architectural documentation and design guidance that explain how future contributors can extend the platform safely.

## v2 Requirements

### Study Tooling

- **STUDY-01**: Researcher can annotate sessions during runtime with structured notes or markers.
- **STUDY-02**: Platform includes richer workflows for managing experiment conditions and study runs inside the app.
- **STUDY-03**: Platform includes built-in capture of post-session usability or evaluation responses.

### Analytics and Polish

- **ANALYT-01**: Researcher has richer dashboards or post-session summaries beyond the current export and replay flows.
- **ANALYT-02**: Platform includes deeper replay analysis UX for intervention timing and reading-flow interpretation.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Built-in AI model implementation | The thesis must support external AI-driven decision providers, but model implementation belongs to a separate team |
| PDF reading support | The thesis has explicitly standardized on Markdown-based reading content |
| Production-grade auth, cloud deployment, and multi-tenant operations | The thesis focuses on a researcher-operated experiment platform, not a production SaaS system |
| Mobile-native application support | Desktop/browser-based researcher and participant workflows are sufficient for the thesis scope |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SETUP-01 | Phase 4 | Validated (Phase 4 Plan 02) |
| SETUP-02 | Phase 4 | Validated (Phase 4 Plan 02) |
| SETUP-03 | Phase 4 | Validated (Phase 4 Plan 04) |
| SETUP-04 | Phase 4 | Validated (Phase 4 Plan 04) |
| SETUP-05 | Phase 4 | Validated (Phase 4 Plan 04) |
| SETUP-06 | Phase 4 | Validated (Phase 4 Plan 04) |
| READ-01 | Phase 5 | Validated (Phase 5 Plan 03) |
| READ-02 | Phase 5 | Validated (Phase 5 Plan 02) |
| READ-03 | Phase 5 | Validated (Phase 5 Plan 03) |
| READ-04 | Phase 5 | Validated (Phase 5 Plan 04) |
| LIVE-01 | Phase 6 | Validated (Phase 6 Plan 02) |
| LIVE-02 | Phase 6 | Validated (Phase 6 Plan 03) |
| LIVE-03 | Phase 6 | Validated (Phase 6 Plan 03) |
| LIVE-04 | Phase 6 | Validated (Phase 6 Plan 04) |
| LIVE-05 | Phase 6 | Validated (Phase 6 Plan 03) |
| MOD-01 | Phase 1 | Validated (Phase 1) |
| MOD-02 | Phase 2 | Validated (Phase 2) |
| MOD-03 | Phase 3 | Validated (Phase 3) |
| MOD-04 | Phase 3 | Validated (Phase 3) |
| MOD-05 | Phase 1 | Validated (Phase 1) |
| FLOW-01 | Phase 7 | Pending |
| FLOW-02 | Phase 7 | Pending |
| FLOW-03 | Phase 7 | Pending |
| FLOW-04 | Phase 7 | Pending |
| DATA-01 | Phase 8 | Pending |
| DATA-02 | Phase 8 | Pending |
| DATA-03 | Phase 8 | Pending |
| DATA-04 | Phase 8 | Pending |
| DATA-05 | Phase 8 | Pending |
| DOCS-01 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 30 total
- Mapped to phases: 30
- Unmapped: 0

---
*Requirements defined: 2026-03-26*
*Last updated: 2026-03-31 after Phase 6 plan 06-04 execution*
