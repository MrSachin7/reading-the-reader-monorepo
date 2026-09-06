# Implementation map for the paper

Paths below are primary implementation evidence. The thesis's design intent and the behaviour of the recorded version must still be distinguished from the current checkout.

## One cycle through the system

1. A Tobii adapter or mouse input supplies a domain gaze sample to the backend. The latest sample is published without taking the lifecycle semaphore, and recording uses a separate history lock.
2. The backend streams gaze to the browser. The participant reader measures the current DOM and maps gaze to line/word tokens; the researcher surface displays the session and overlays.
3. Token observations return to the backend. A selected analysis strategy processes them, or an external analysis provider supplies snapshots. The collaborator connector additionally receives the raw gaze stream.
4. A selected decision strategy consumes session context. Manual control supplies interventions directly; the reference external provider returns proposals. Advisory mode exposes proposals for researcher resolution.
5. The backend validates and schedules/applies presentation changes. The participant reader handles the resulting layout and performs an optional anchor restore, then returns a measured outcome.
6. The authoritative session record retains the relevant events for export and replay. Recording the event is distinct from proving the rendered frame's timing or the validity of its behavioural interpretation.

## Where to substantiate each part

| Concern | Primary source | Read for |
|---|---|---|
| Session authority | [ExperimentSessionManager.cs](../Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Session/ExperimentSessionManager.cs) and its adjacent partial classes | Shared state, lifecycle semaphore, provider status changes; the partial files compile to one class |
| Gaze acquisition | [ExperimentSessionManager.Gaze.cs](../Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Session/ExperimentSessionManager.Gaze.cs) | Tobii callbacks, mouse submission, latest sample, streaming |
| Gaze-to-word mapping | [useGazeTokenHighlight.ts](../Frontend/src/modules/pages/reading/lib/useGazeTokenHighlight.ts) | Live word boxes, line scoring, fixed current-line discount of 24, DOM refresh and stale observations |
| Analysis port | [IEyeMovementAnalysisStrategyCoordinator.cs](../Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Analysis/IEyeMovementAnalysisStrategyCoordinator.cs) | Strategy selected by configuration; snapshots passed into analysis |
| Built-in analysis | [BuiltInEyeMovementAnalysisStrategy.cs](../Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Analysis/BuiltInEyeMovementAnalysisStrategy.cs) | Dwell/AOI logic; distinguish this from the externally produced study events |
| External analysis ingestion | [ExperimentSessionManager.EyeMovementAnalysis.cs](../Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Session/ExperimentSessionManager.EyeMovementAnalysis.cs) | Provider/session validation, event extraction, snapshot broadcasts, decision evaluation |
| Decision contract | [DecisionStrategyCoordinator.cs](../Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Decisioning/DecisionStrategyCoordinator.cs) | Manual exclusion, configured strategy, proposal identity and lifecycle |
| Decision execution | [ExperimentSessionManager.Decisions.cs](../Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Session/ExperimentSessionManager.Decisions.cs) | Advisory/autonomous handling and the actual placement of latency instrumentation |
| Provider protocol | [ModuleProviderProtocol.cs](../Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Messaging/ModuleProviderProtocol.cs), [ModuleProviderGateway.cs](../Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Modules/ModuleProviderGateway.cs) | Handshake/envelope vocabulary and active-provider dispatch. Use source direction names, not the reversed inbound/outbound prose in the thesis listing |
| Provider request timing | [ModuleProviderRttTracker.cs](../Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Modules/ModuleProviderRttTracker.cs) | Correlation-matched sent/received times; conditional sample population |
| Reference providers | [mock_ai.py](../Decision-Maker/src/decision_maker/mock_ai.py), [mock_analyzer.py](../Eye-Movement-Analyzer/src/eye_movement_analyzer/mock_analyzer.py) | Executable integration examples, not new validated ML models |
| Collaborator connector | [pipeline.py](../reading-the-struggle/connector/src/struggle_connector/pipeline.py), [config.py](../reading-the-struggle/connector/src/struggle_connector/config.py), [preprocessor.py](../reading-the-struggle/code/preprocessor.py) | Translation into/out of the external contract, 180-sample default cadence, clock anchoring, saccade mapping/fallback, transport additions |
| Intervention modules | [IReadingInterventionModule.cs](../Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Interventions/IReadingInterventionModule.cs), [BuiltInReadingInterventionModules.cs](../Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Interventions/BuiltInReadingInterventionModules.cs) | Descriptor/validate/execute contract; eight existing module kinds |
| Scheduling and limits | [ExperimentSessionManager.Interventions.cs](../Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Session/ExperimentSessionManager.Interventions.cs) | Immediate versus queued commits, recorded focus/boundary, manual exemption from automated step/cooldown limits |
| Browser restoration | [usePreserveReadingContext.ts](../Frontend/src/modules/pages/reading/lib/usePreserveReadingContext.ts) | 120 ms anchor refresh; 15 s freshness test; sentence-first relocation; measured error; two animation-frame scheduling; 3 s highlight hold and 3 s fade |
| Browser surfaces | [ReaderShell.tsx](../Frontend/src/modules/pages/reading/components/ReaderShell.tsx), [current-live/index.tsx](../Frontend/src/modules/pages/researcher/current-live/index.tsx) | Participant presentation and researcher controls; keep UI screenshots focused on these roles |
| Telemetry | [gaze-socket.ts](../Frontend/src/lib/gaze-socket.ts), [ExperimentSessionManager.Replay.cs](../Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Session/ExperimentSessionManager.Replay.cs) | Five-second pings; recording lock; latest-gaze freshness timer and exclusions |
| Export construction | [ExperimentReplayExportFactory.cs](../Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Replay/ExperimentReplayExportFactory.cs) | Versioned manifest, initial content, final condition configuration, event streams |
| Replay reader | [experiment-replay.ts](../Frontend/src/lib/experiment-replay.ts) | Format checks and reconstruction at the playhead; distinct from rerunning a model |
| Behavioural estimator | [_lib.py](../Experiments/analysis/_lib.py), [_build_notebooks.py](../Experiments/analysis/_build_notebooks.py) | Discovery assumptions, event windows, missingness and aggregation |
| Geometric harness | [evaluation route](../Frontend/src/app/eval/context-displacement/page.tsx), [sweep-onoff.mjs](../Frontend/experiments/context-displacement/sweep-onoff.mjs), [analyze-three.mjs](../Frontend/experiments/context-displacement/analyze-three.mjs) | Production reader with deterministic fallback anchor; separate OFF/ON measurements; cross-version table construction |

## Existing test evidence

The verified command was:

```sh
dotnet test Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj --no-restore --nologo --verbosity minimal --disable-build-servers -m:1
```

Result: **101 passed, 0 failed, 0 skipped**. The suite includes:

- [ArchitectureBoundaryTests.cs](../Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ArchitectureBoundaryTests.cs): specified assembly dependency checks.
- [DecisionProposalLifecycleTests.cs](../Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/DecisionProposalLifecycleTests.cs): researcher and autonomous proposal handling.
- [ReadingInterventionRuntimeTests.cs](../Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingInterventionRuntimeTests.cs) and [InterventionModuleExecutionTests.cs](../Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/InterventionModuleExecutionTests.cs): intervention execution behaviour.
- [ExperimentReplayExportSerializerTests.cs](../Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ExperimentReplayExportSerializerTests.cs): JSON round trips and preservation of recorded event/provenance fields.
- [FileExperimentReplayRecoveryStoreAdapterTests.cs](../Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/FileExperimentReplayRecoveryStoreAdapterTests.cs): stored recovery data.

These tests are useful evidence of current behaviour. They do not certify the historical experimental protocol, absence of duplicated real-world events, browser restoration accuracy, operator usability, or Windows device performance.
