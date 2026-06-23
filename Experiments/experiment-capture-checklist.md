# Experiment capture checklist (Phase A5)

What to capture per run so the evaluation analysis (Phase C/F) has every field it needs.
Validate the **mouse-mode dry run** below *before* any real-Tobii session, because the
hardware session is a one-shot.

## Two files to download per session

| File | Endpoint | Schema | Carries |
| --- | --- | --- | --- |
| **Full experiment export** | `GET /experiment-session/export` | `rtr.experiment-export` (v7) | gaze, fixations/saccades, **context-preservation events (RQ3)**, **lifecycle events incl. provider detach (A4)**, decision proposals, intervention events, condition, calibration, screen |
| **Telemetry export** | `GET /experiment-session/telemetry` | `rtr.experiment-telemetry` (v1) | **latency samples (A1/A2)**, client RTT, sample rate, validity |

> The normal "processed" export (`GET /experiment-session/export/processed`, the
> `*_processed_v3.json` shape) is **not enough on its own**: it omits context-preservation
> and lifecycle events. Always grab the **full** export above for the evaluation.

## Field map (what each RQ reads)

### RQ2 — latency (telemetry export)
`samples[]` each `{ role, rttMs, sampleRateHz, validityRate, occurredAtUnixMs }`:
- `role = "pipeline-decision"` → **A1** in-process decision pipeline latency (ms) in `rttMs`.
- `role = "decision-provider-rtt"` → **A2** out-of-process decision RTT (ms) in `rttMs`.
- `role = "participant" | "researcher"` → client browser↔server RTT, `sampleRateHz`, `validityRate`.
- `summary.rttMs` = client-RTT distribution + `overBudgetPct` vs `budgetMs` (100 ms).

### RQ3 — context preservation (full export)
`derived.contextPreservationEvents[].contextPreservation` each:
- `anchorErrorPx` → residual error **with** preservation.
- `viewportDeltaPx` → uncompensated displacement (what the reader would experience **without** preservation). On/off comparison = `viewportDeltaPx` vs `anchorErrorPx`, per intervention.
- `status` (preserved/degraded/failed), `anchorSource`, `commitBoundary`, `waitDurationMs`, `interventionAppliedAtUnixMs`, `measuredAtUnixMs`.

### RQ4 / degradation (full export)
- `experiment.lifecycleEvents[]` `{ eventType, source, occurredAtUnixMs }` — look for `module-provider-attached` / `module-provider-detached` (**A4**), plus session start/stop.
- `interventions.{decisionProposals, scheduledInterventions, interventionEvents}`; `experiment.condition.{providerId, executionMode, conditionLabel}`; `experiment.calibration`; `experiment.screen`.

### Sensing yield (full export)
`sensing.gazeSamples[]` `{ sequenceNumber, capturedAtUnixMs, deviceTimeStampUs, systemTimeStampUs, left/right { gazePoint2D{validity}, pupil } }`; `derived.{fixationEvents, saccadeEvents}`.

## Preconditions (no data appears unless these hold)
- **A1 (pipeline-decision):** built-in **rule-based** decision strategy active and forming proposals (advisory or autonomous). No external decision provider for this arm.
- **A2 (decision-provider-rtt):** the **Decision-Maker** mock connected and active (advisory or autonomous); it now echoes the backend correlation id.
- **A3 (context-preservation):** `preserveContextOnIntervention` enabled and at least one **layout-changing** intervention fired (font size/family/line width/height/spacing).
- **A4 (provider detach):** deliberately stop a connected provider mid-session.

## Mouse-mode dry run (do this first, no hardware)
1. Start backend (`dotnet run` in `Backend/src/ReadingTheReader.WebApi`) and frontend (`bun dev` in `Frontend`).
2. New session in **mouse** sensing mode; open the participant reader; move the cursor to generate gaze.
3. Set decision strategy to **rule-based**, autonomous; let it fire at least one font-size intervention → exercises **A1** + **A3**.
4. Connect the **Decision-Maker** provider; switch strategy to **external** (advisory/autonomous); let it propose → exercises **A2**.
5. **Kill the Decision-Maker process** mid-session → exercises **A4** (expect a `module-provider-detached` lifecycle event; session keeps running).
6. Finish the session. Download both files (full export + telemetry).
7. Verify: telemetry `samples[]` contains rows with `role` `pipeline-decision` and `decision-provider-rtt`; full export `derived.contextPreservationEvents[]` has non-null `anchorErrorPx` and `viewportDeltaPx`; `experiment.lifecycleEvents[]` has `module-provider-detached`.

If any of step 7 is missing, fix before the hardware run.

## Real-Tobii run (after the dry run passes)
Same as above but with the eye tracker as the sensing source (calibration completed). Capture
at least one real session, plus several mouse-mode sessions for distribution sample size.
For RQ3, drive identical conditions where possible (same material, same intervention) so the
displacement/residual comparison is clean.
