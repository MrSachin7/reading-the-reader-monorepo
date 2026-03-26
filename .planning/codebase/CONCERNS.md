# Codebase Concerns

**Analysis Date:** 2026-03-26

## Tech Debt

**Monolithic realtime orchestrator:**
- Issue: `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs` is a 1002-line singleton that mixes session lifecycle, gaze streaming, WebSocket command handling, replay export assembly, calibration state, participant view state, and persistence coordination.
- Files: `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs`, `Backend/src/core/ReadingTheReader.core.Application/ApplicationModuleInstaller.cs`, `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/IExperimentSessionManager.cs`
- Impact: small changes in one behavior can regress unrelated flows because the same class owns the control plane and hot data path.
- Fix approach: split transport command routing, session state mutation, gaze broadcast, and replay history/export concerns behind narrower services before adding more realtime features.

**Large frontend control modules with mixed responsibilities:**
- Issue: several frontend files combine UI rendering, websocket orchestration, domain mapping, and persistence logic in single modules.
- Files: `Frontend/src/modules/pages/experiment/components/experiment-stepper.tsx`, `Frontend/src/modules/pages/reading-material-setup/index.tsx`, `Frontend/src/lib/gaze-socket.ts`, `Frontend/src/lib/experiment-replay.ts`, `Frontend/src/modules/pages/reading/lib/useGazeTokenHighlight.ts`
- Impact: feature work in reading, replay, or experiment setup has a high regression surface because logic is not isolated behind narrow hooks or utilities.
- Fix approach: keep future edits localized, extract protocol/state helpers first, and avoid adding more responsibilities to these files.

**Contract drift in reading-material setup flow:**
- Issue: the frontend treats reading material setups as having `name` and `researcherQuestions`, but the backend request/response model does not define either field.
- Files: `Frontend/src/redux/api/reading-material-api.ts`, `Frontend/src/modules/pages/reading-material-setup/index.tsx`, `Backend/src/ReadingTheReader.WebApi/Contracts/ReadingMaterialSetups/CreateReadingMaterialSetupRequest.cs`, `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/ReadingMaterialSetups/ReadingMaterialSetup.cs`
- Impact: UI state can appear saved even though those fields are dropped server-side, which makes future schema work easy to misread.
- Fix approach: align the API contract first, then update frontend types and saved-data normalization together.

**Stale and misleading backend documentation artifacts:**
- Issue: the checked-in backend architecture docs describe types that do not exist in the codebase anymore, and placeholder artifacts remain beside active projects.
- Files: `docs/backend/backend-architecture.md`, `docs/backend/frontend-backend-integration-guide.md`, `Backend/src/infrastructure/ReadingTheReader.RealtimeMessenger/Class1.cs`, `Backend/reading-the-reader-backend.sln`, `docs/backend/Documentations.csproj`
- Impact: future agents can follow outdated class names and data flow assumptions instead of the actual implementation.
- Fix approach: treat docs as suspect until verified against code, remove placeholders, and refresh docs when transport or service names change.

## Known Bugs

**Reading material metadata is partially lost across the API boundary:**
- Symptoms: setup cards and local UI draft state use `name` and `researcherQuestions`, but backend persistence only stores `title`, `markdown`, and presentation fields.
- Files: `Frontend/src/modules/pages/reading-material-setup/index.tsx`, `Frontend/src/redux/api/reading-material-api.ts`, `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/FileReadingMaterialSetupStoreAdapter.cs`, `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/ReadingMaterialSetups/ReadingMaterialSetup.cs`
- Trigger: create or update a saved reading material setup from the frontend.
- Workaround: none in the backend; the frontend silently falls back to local defaults in `Frontend/src/modules/pages/reading-material-setup/index.tsx`.

**Non-Windows deployments silently degrade to mock eye tracking:**
- Symptoms: the backend starts, but real Tobii tracking is unavailable and the adapter logs that it is running a mock tracker.
- Files: `Backend/src/infrastructure/ReadingTheReader.TobiiEyetracker/TobiiEyeTrackerAdapter.cs`, `Backend/src/infrastructure/ReadingTheReader.TobiiEyetracker/ReadingTheReader.TobiiEyetracker.csproj`, `Backend/src/ReadingTheReader.WebApi/Dockerfile`, `Backend/src/ReadingTheReader.WebApi/ReadingTheReader.WebApi.csproj`
- Trigger: run the backend in Linux or in the provided Linux-oriented container image.
- Workaround: run the backend on Windows when hardware integration matters; do not treat container success as proof of real-device support.

## Security Considerations

**Experiment control and replay data are effectively unauthenticated:**
- Risk: the API and `/ws` channel expose participant/session control, reading session updates, replay downloads, and saved export reads without any access control.
- Files: `Backend/src/ReadingTheReader.WebApi/Program.cs`, `Backend/src/ReadingTheReader.WebApi/Websockets/WebSocketConfiguration.cs`, `Backend/src/ReadingTheReader.WebApi/ParticipantEndpoints/SetCurrentParticipant.cs`, `Backend/src/ReadingTheReader.WebApi/ExperimentSessionEndpoints/DownloadExperimentExportEndpoint.cs`, `Backend/src/ReadingTheReader.WebApi/ExperimentSessionEndpoints/GetSavedExperimentReplayExportByIdEndpoint.cs`
- Current mitigation: `Backend/src/ReadingTheReader.WebApi/Program.cs` restricts CORS to localhost for REST, but WebSockets still accept connections at `/ws`, and all endpoints call `AllowAnonymous()`.
- Recommendations: add a real auth scheme, gate replay/export routes, and validate websocket origin/session identity before exposing the service beyond a trusted local machine.

**Sensitive artifacts are committed into the repository tree:**
- Risk: device licence files and persisted reading-material data live under tracked repo paths, which creates accidental disclosure and accidental reuse risk.
- Files: `Backend/license_key_IS404-100106341184`, `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/licence/IS404-100106340114_licence`, `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/licence/IS404-100106340114_license`, `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/licence/IS404-100106341184_licence`, `Backend/src/ReadingTheReader.WebApi/data/reading-material-setups/text1-2825c893.json`, `Backend/src/ReadingTheReader.WebApi/data/reading-material-setups/text1-2825c893.md`
- Current mitigation: none in git; these paths are tracked.
- Recommendations: move runtime data and licence material out of the repository, rotate anything sensitive, and document these paths as non-source operational state.

**Verbose client and server logging can leak participant and session data:**
- Risk: request/response logging prints REST bodies, websocket messages, connection status, and some session identifiers during normal flows.
- Files: `Frontend/src/redux/api/base-api.ts`, `Frontend/src/lib/gaze-socket.ts`, `Backend/src/ReadingTheReader.WebApi/Program.cs`, `Backend/src/ReadingTheReader.WebApi/Websockets/WebSocketConfiguration.cs`, `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/InMemoryExperimentStateStoreAdapter.cs`
- Current mitigation: none beyond normal browser/server log access.
- Recommendations: strip or redact payload logs before any shared or production-like environment is used.

## Performance Bottlenecks

**Replay history grows without a ceiling during active sessions:**
- Problem: every gaze sample, reading-session state, viewport event, focus event, and intervention is appended to in-memory lists until session end.
- Files: `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs`, `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentReplayExport.cs`
- Cause: `_gazeSamples`, `_readingSessionStates`, `_participantViewportEvents`, `_readingFocusEvents`, and `_interventionEvents` are unbounded lists.
- Improvement path: cap in-memory history, stream to disk incrementally, or store summarized data separately from full replay capture.

**Per-sample websocket fanout is serialized and coupled to one process:**
- Problem: each gaze sample is sent connection-by-connection with awaited writes.
- Files: `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs`, `Backend/src/infrastructure/ReadingTheReader.RealtimeMessenger/WebSocketRealtimeMessenger.cs`, `Backend/src/infrastructure/ReadingTheReader.RealtimeMessenger/WebSocketConnectionManager.cs`
- Cause: `BroadcastGazeSampleAsync` loops through subscribers, and `WebSocketRealtimeMessenger` writes each socket sequentially.
- Improvement path: batch or parallelize fanout carefully, add backpressure/drop strategy, and isolate slow clients from the hot path.

**Replay listing and parsing scale with total export size, not just metadata:**
- Problem: listing saved replay exports loads and deserializes every export file; replay upload/load validates the entire payload in-browser.
- Files: `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/FileExperimentReplayExportStoreAdapter.cs`, `Frontend/src/lib/experiment-replay.ts`, `Frontend/src/modules/pages/replay/index.tsx`
- Cause: `ListSavedAsync()` calls `ReadExportAsync()` for each file, and the frontend uses full `zod` parsing on the entire JSON or CSV payload.
- Improvement path: persist sidecar metadata/indexes on the backend and move heavy replay parsing or summarization off the main UI thread for large exports.

**Reading focus and attention telemetry are expensive on the frontend:**
- Problem: token highlighting runs a permanent `requestAnimationFrame` loop with DOM measurement, while the researcher page serializes and pushes attention summaries every 750ms.
- Files: `Frontend/src/modules/pages/reading/lib/useGazeTokenHighlight.ts`, `Frontend/src/modules/pages/reading/pages/ReadingPage.tsx`, `Frontend/src/modules/pages/researcher/current-live/index.tsx`
- Cause: continuous layout scanning, DOM style mutation, websocket focus updates, and repeated `JSON.stringify` of attention snapshots.
- Improvement path: profile before changing this area, debounce outbound updates harder, and move attention aggregation off the main render path where possible.

## Fragile Areas

**Realtime reader/researcher synchronization path:**
- Files: `Frontend/src/lib/gaze-socket.ts`, `Frontend/src/lib/use-live-experiment-session.ts`, `Frontend/src/modules/pages/reading/pages/ReadingPage.tsx`, `Frontend/src/modules/pages/researcher/current-live/index.tsx`, `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs`
- Why fragile: participant view registration, focus updates, attention summaries, interventions, and session snapshots all share one message bus and one singleton backend session state.
- Safe modification: change transport message types, payloads, and consumers together; verify both participant and researcher pages after any websocket change.
- Test coverage: no frontend automated tests exercise this path, and backend tests do not cover websocket flows.

**Startup and persistence restoration path:**
- Files: `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs`, `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/FileSnapshotExperimentStateStoreAdapter.cs`, `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ReaderShellSettingsService.cs`
- Why fragile: services synchronously hydrate persisted state on construction and silently ignore malformed persisted settings.
- Safe modification: keep startup I/O behavior explicit, preserve backward compatibility of persisted JSON, and avoid introducing more blocking initialization in constructors.
- Test coverage: there are persistence adapter tests, but no startup/integration tests covering restoration through the full app host.

## Scaling Limits

**Single active experiment state per backend instance:**
- Current capacity: one in-memory `IExperimentSessionManager` singleton for all clients attached to a process.
- Limit: concurrent studies, multiple devices, or horizontal scaling will conflict because session state and subscriber sets are process-local.
- Scaling path: externalize session state and replay capture to a durable store/message bus before attempting multiple active sessions or multi-instance hosting.

**Repo-local file persistence as operational storage:**
- Current capacity: local filesystem persistence configured via `Backend/src/ReadingTheReader.WebApi/appsettings.json` and `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/ExperimentPersistenceOptions.cs`.
- Limit: data follows the app's working directory and can mix source files, runtime files, and tracked samples.
- Scaling path: separate operational storage paths from source-controlled directories and treat replay/setup storage as environment-level infrastructure.

## Dependencies at Risk

**Windows-only Tobii SDK integration with mixed platform signals:**
- Risk: `Tobii.Research.x64` is only referenced on Windows, while the web API still advertises Linux container defaults.
- Impact: developers can believe the backend is portable when hardware behavior is platform-specific.
- Migration plan: document Windows-only hardware support clearly and isolate mock-vs-real adapter behavior behind environment-specific deployment profiles.

**Preview DI abstractions package in production code:**
- Risk: `Backend/src/infrastructure/ReadingTheReader.TobiiEyetracker/ReadingTheReader.TobiiEyetracker.csproj` references `Microsoft.Extensions.DependencyInjection.Abstractions` version `11.0.0-preview.1.26104.118`.
- Impact: preview package drift can destabilize restores or produce avoidable compatibility noise in an otherwise `net10.0` solution.
- Migration plan: replace it with a stable matching version unless a preview-only API is required.

## Missing Critical Features

**Authentication, authorization, and export access controls:**
- Problem: there is no boundary between an operator UI and anyone who can reach the backend.
- Blocks: safe shared-network use, auditability of who changed participant/session state, and responsible handling of replay exports containing participant and gaze data.

## Test Coverage Gaps

**Frontend runtime behavior is untested and CI tolerates that:**
- What's not tested: websocket protocol handling, replay parsing/playback, reading material setup, gaze highlighting, and researcher live view.
- Files: `Frontend/package.json`, `.github/workflows/frontend-ci.yml`, `Frontend/src/lib/gaze-socket.ts`, `Frontend/src/lib/experiment-replay.ts`, `Frontend/src/modules/pages/reading-material-setup/index.tsx`, `Frontend/src/modules/pages/researcher/current-live/index.tsx`
- Risk: regressions in the main user flows ship as long as `bun run build` passes.
- Priority: High

**Backend tests miss transport, auth, and session orchestration behavior:**
- What's not tested: FastEndpoints routes, websocket handling, `ExperimentSessionManager`, eye-tracker service flows, and startup restoration through the web host.
- Files: `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj`, `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ExperimentReplayExportSerializerTests.cs`, `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/FileExperimentReplayExportStoreAdapterTests.cs`, `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/FileReadingMaterialSetupStoreAdapterTests.cs`, `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/InMemoryReadingMaterialSetupStoreAdapterTests.cs`, `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingInterventionRuntimeTests.cs`
- Risk: the most coupled runtime path has the least protection.
- Priority: High

---

*Concerns audit: 2026-03-26*
