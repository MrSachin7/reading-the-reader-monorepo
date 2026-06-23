# Evaluation Chapter — Completion Plan

Goal: when every phase below is complete, `Master-Thesis-Report/Chapters/07_Evaluation/07_Evaluation.tex` is a finished chapter.

Genre: engineering/design-science artifact thesis. Evaluation = verification (requirements + B-model test levels) + validation of architectural claims + measurement of runtime budgets. NOT a reading-behaviour efficacy study (out of scope).

Hard rule: **Evaluation = evidence (neutral); Discussion = interpretation.** Do not double-write. Discussion is out of scope for this plan.

Spine: organised **by RQ**, with a **requirements-coverage table** (every FR/NFR → verification method → verdict) as the backbone.

## Locked decisions (2026-06-23)
- Latency data: **real Tobii + simulated**.
- Empirical scope: **full platform-validation set**.
- `reading-the-struggle` connector: **headline RQ1 evidence** (collaborator's real model, never modified — closest to third-party contract validation).
- Sequencing: **hybrid** (write data-independent sections now with `\todo{verify N}`; fill numbers after runs).
- Functional verification: **manual E2E walkthroughs + backend xUnit**. Frontend has no test framework — state honestly, do NOT build one (deadline).
- Demo data: **`keerthi` session scrapped**. New experiments are being run now; do the analysis on the fresh exports.

## ⚠ URGENT
Experiments are being run now, but the latency/RTT telemetry and the context-preservation "off" arm do NOT exist in the export yet. Data collected before Phase A will not support RQ2 or the on/off half of RQ3. **Phase A must land before any kept runs.**

Owner key: 🟦 me (code/writing) · 🟨 you (hardware/experiments) · 🟩 joint/review.

---

## Phase A — Instrumentation & capture (🟦, BLOCKING, before kept runs)
- [x] **A1. Latency telemetry.** DONE. In-process built-in decision pipeline latency (freshest gaze ingest → decision dispatch, backend single-clock, excludes commit-boundary wait) recorded as telemetry role `pipeline-decision`. Touches `ExperimentSessionManager.{cs,Gaze,Replay,Decisions}`, `ExperimentTelemetryExport` roles. Appears in the telemetry export `Samples[]`. → RQ2/NFR2
- [x] **A2. Provider RTT logging.** DONE. Decision-path request→response RTT via backend-issued correlationId echoed by the mock decision-maker; recorded as telemetry role `decision-provider-rtt`. New `IModuleProviderRttTracker`/`ModuleProviderRttTracker`; wired in `InterventionsOutboundPublisher` (mark-sent) + `InterventionsInboundHandler` (complete+record); one-line echo in `Decision-Maker/mock_ai.py`. Build clean, 98/98 tests pass. → RQ1+RQ2 (cost of out-of-process modularity)
- [x] **A3. Context-preservation off arm.** DONE (better than a toggle): the hook now records BOTH `viewportDeltaPx` (uncompensated displacement = without preservation) and `anchorErrorPx` (residual = with preservation) per intervention, so the on/off comparison comes from a single run. Frontend-only change in `usePreserveReadingContext.ts` (`applyFinalAlignment`); typechecks clean. No backend/schema change. Lands in full export `derived.contextPreservationEvents[]`. → RQ3/FR9
- [x] **A4. Degradation in the export.** DONE. `OnModuleProviderSourceChanged` now records a `module-provider-attached`/`module-provider-detached` lifecycle event (FR19.3) into the exported record (`experiment.lifecycleEvents[]`). Build clean, 98/98 tests pass. → NFR4/FR19.3
- [x] **A5. Field checklist authored** in `Experiments/experiment-capture-checklist.md` (which two files to download, per-RQ field map, preconditions, mouse-mode dry-run steps). Mouse-mode dry run + real-Tobii run are user-executed. Key finding: download the **full** export (`/experiment-session/export`, `rtr.experiment-export` v7) — the processed export omits context-preservation + lifecycle. Latency is in `/experiment-session/telemetry`.
- Gate: nothing in Phase E happens until A1–A5 pass the dry run.

### Phase A — design notes (from code discovery 2026-06-23)
- A telemetry pipeline already exists: `ExperimentTelemetrySampleRecord(SequenceNumber, OccurredAtUnixMs, Role, RttMs, SampleRateHz, ValidityRate)` with a budgeted (100 ms) summary in `ExperimentTelemetryExportFactory`. Its `RttMs` is **client-reported** (browser→server ping; role participant/researcher) via `RecordClientTelemetrySampleAsync`. So sample-rate/validity/client-RTT for RQ2 (#9) are already captured — **no work**.
- **Clock-domain decision (made):** all latency measured **single-clock on the backend** (`UtcNow` millis, matching existing convention). Browser-clock timestamps (observation `ObservedAtUnixMs`, context-preservation `MeasuredAtUnixMs`) are NOT subtracted from backend timestamps. The thesis reports backend pipeline latency + provider RTT, and bounds the browser leg separately via the existing client RTT. State this scoping explicitly in prose.
- **A1 (pipeline latency), decided design:** record one telemetry sample (reuse the existing record, role `pipeline`) when an autonomous decision is dispatched, value = `dispatchUtcMs − freshestGazeIngestUtcMs`, measured at proposal formation in `EvaluateDecisionStrategiesAsync` so it EXCLUDES the intentional commit-boundary wait (`WaitDurationMs`). Touch points: store freshest gaze-ingest backend ms in `UpdateGazeSample`; compute+record in the decision path; add role to `ExperimentTelemetryRoles`. Minimal surface (no schema change; notebooks split by role).
- **A2 (provider RTT) — OPEN FORK (needs user):** RTT is only clean for **request/response** paths. The decision provider (mock decision-maker) is request/response (correlationId) → clean single-clock RTT. The analysis providers (struggle, eye-movement-analyzer) are **streaming** (gaze in continuously, analysis out every ~180 samples) → no natural RTT; would need a protocol-level ping/echo to get a comparable number, which means editing all three Python connectors. Decision pending: decision-path-only RTT vs. uniform protocol echo. Struggle is the RQ1 modularity headline regardless and needs no RTT.
- **A3 (context-preservation off arm):** mechanism already computes/logs `anchorErrorPx` + status (preserved/degraded/failed) per intervention. Need a session-level "restore disabled" control that still measures where the anchor landed (residual), so on vs off is a clean comparison. Touch points: a session flag + the front-end `usePreserveReadingContext.ts` restore short-circuit that still records the residual.

## Phase B — Architecture evidence (🟦, data-independent, parallel with A)
- [ ] **B1. Boundary inspection.** Project-reference DAG + NetArchTest/namespace assertion (no cross-boundary imports) → reusable test + figure/table. → RQ1/NFR1
- [ ] **B2. Modification locality.** From git history of past module additions (+ one fresh additive module if needed): files added vs. existing modified (expect 0). → RQ1/NFR6 + RQ4 DX
- [ ] **B3. Provider-integration runbook.** Reproducible steps + evidence for all three providers connecting with zero core edits; struggle headline. Fix stale "Phase 2" claim in smoke-test README. → RQ1

## Phase C — Analysis tooling for the new data (🟦)
- [ ] **C1.** Update `Experiments/analysis/_lib.py` loader for new export fields (latency, RTT, preservation on/off).
- [ ] **C2.** Notebooks output **vector PDF** (not PNG), parametrised over new sessions: latency distributions (p50/p95/p99 + tail vs 100 ms), RTT distribution, anchorErrorPx on-vs-off, sample yield/validity/Hz, degradation timeline, + a descriptive reading-signal plot if the new data supports one.

## Phase D — Data-independent writing (🟦, hybrid — now)
Two-stage: scaffold → prose. `\todo{verify N}` where live numbers go.
- [ ] **D1.** §Evaluation setup (recap strategy, hardware, sim+real runs, reproducibility).
- [ ] **D2.** §Functional verification + requirements-coverage table (FR/NFR → method → verdict; manual E2E + xUnit; honest FE note).
- [ ] **D3.** §Modularity & extensibility (RQ1) — B1/B2/B3, struggle headline.
- [ ] **D4.** §Threats to validity (self-eval bias, N, sim-vs-real, pupil/luminance caveat).
- [ ] **D5.** §Summary scaffold (verdict slot per RQ).
- [ ] Split the long "Experimentability and Developer Experience" heading (supervisor note).

## Phase E — Run experiments (🟨, gates F/G)
- [ ] **E1.** Many instrumented **simulated** load sessions → latency/RTT distributions.
- [ ] **E2.** Real **Tobii** session(s) → real latency, sample yield, calibration metrics, context-preservation on/off, live provider attach + deliberate mid-run provider kill (degradation).
- [ ] **E3.** Hand over export/telemetry JSONs.

## Phase F — Results prose from real numbers (🟦)
- [ ] **F1.** Run notebooks on the data → figures + tables.
- [ ] **F2.** Fill RQ2 (latency/RTT), RQ3 (context preservation), RQ4 (control/export/replay) results + descriptive demo.
- [ ] **F3.** Resolve every `\todo{verify N}`. Results only — no interpretation.

## Phase G — Integrate & finalise (🟩)
- [ ] **G1.** Vector figures wired, `\label`/`\cref`, full-sentence captions one size smaller than body.
- [ ] **G2.** Consistency pass vs methodology RQ→method table and FR/NFR IDs.
- [ ] **G3.** `latexmk -xelatex` clean (no new warnings); spell-check; British/American consistency.
- [ ] **G4.** Chapter-transition sentence into Discussion.
- [ ] **G5.** You review.

---

## Definition of done
- Every RQ (1–4) has a stated verdict backed by in-chapter evidence.
- Requirements-coverage table complete: every FR/NFR has method + verdict.
- All figures vector, referenced, captioned; every `\todo` resolved or consciously deferred.
- Builds clean, spell-checked; result/interpretation separation held.

## Critical path
A (now) → E (your runs) → F → G. B, C-tooling, D run in parallel while you experiment.
