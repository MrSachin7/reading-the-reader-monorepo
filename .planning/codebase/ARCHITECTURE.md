# Architecture

**Analysis Date:** 2026-03-26

## Pattern Overview

**Overall:** Monorepo with two independently runnable applications: a Next.js App Router frontend in `Frontend/` and a layered .NET Web API backend in `Backend/`.

**Key Characteristics:**
- Treat `Frontend/src/app` as route and layout wiring only; feature logic lives in `Frontend/src/modules`, `Frontend/src/lib`, and `Frontend/src/redux`.
- Treat `Backend/src/ReadingTheReader.WebApi` as transport and composition only; session rules and workflow orchestration live in `Backend/src/core/ReadingTheReader.core.Application`.
- Realtime behavior is split between REST commands under `/api` and a long-lived WebSocket channel under `/ws`, with both surfaces converging on `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs`.

## Frontend / Backend Responsibilities

**Frontend:**
- `Frontend/src/app/layout.tsx` and `Frontend/src/app/providers.tsx` bootstrap global providers, theming, error boundaries, and Redux.
- `Frontend/src/app/(with-sidebar)/*` hosts dashboard-style routes such as `Frontend/src/app/(with-sidebar)/experiment/page.tsx`, `Frontend/src/app/(with-sidebar)/settings/page.tsx`, and `Frontend/src/app/(with-sidebar)/reading-material/setup/page.tsx`.
- `Frontend/src/app/(without-sidebar)/*` hosts immersion and second-screen routes such as `Frontend/src/app/(without-sidebar)/reading/page.tsx`, `Frontend/src/app/(without-sidebar)/calibration/page.tsx`, `Frontend/src/app/(without-sidebar)/researcher/current-live/page.tsx`, and `Frontend/src/app/(without-sidebar)/replay/page.tsx`.
- `Frontend/src/modules/pages/*` owns feature UI, view composition, and page-local orchestration. Examples: `Frontend/src/modules/pages/experiment/index.tsx`, `Frontend/src/modules/pages/calibration/index.tsx`, `Frontend/src/modules/pages/researcher/current-live/index.tsx`, `Frontend/src/modules/pages/replay/index.tsx`.
- `Frontend/src/redux/api/*` owns REST transport via RTK Query, while `Frontend/src/lib/gaze-socket.ts` owns the singleton browser WebSocket client for realtime envelopes.

**Backend:**
- `Backend/src/ReadingTheReader.WebApi/Program.cs` composes the application, installs modules, configures CORS, FastEndpoints, Swagger, auth stubs, and the `/ws` middleware.
- `Backend/src/ReadingTheReader.WebApi/*Endpoints/*.cs` exposes REST endpoints that map HTTP contracts to application commands and snapshots.
- `Backend/src/ReadingTheReader.WebApi/Websockets/WebSocketConfiguration.cs` accepts sockets, deserializes inbound envelopes, and forwards commands to `IExperimentSessionManager`.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/*` contains use-case services, stateful orchestrators, DTO-like snapshots, and infrastructure-facing interfaces.
- `Backend/src/core/ReadingTheReader.core.Domain/*.cs` contains the most basic domain entities such as `GazeData`, `ExperimentSession`, `Participant`, and `EyeTrackerDevice`.
- `Backend/src/infrastructure/*` contains concrete adapters for Tobii hardware, WebSocket broadcasting, persistence, background checkpointing, and file-backed settings/setup storage.

## Layers

**Frontend Routing Layer:**
- Purpose: Define URL structure, route groups, and shared layouts.
- Location: `Frontend/src/app`
- Contains: `layout.tsx`, `page.tsx`, route-group layouts such as `Frontend/src/app/(with-sidebar)/layout.tsx`.
- Depends on: feature pages from `Frontend/src/modules/pages/*`, providers from `Frontend/src/app/providers.tsx`.
- Used by: the Next.js runtime.

**Frontend Feature Layer:**
- Purpose: Own user-facing pages, high-level feature composition, and page-local interaction state.
- Location: `Frontend/src/modules/pages`
- Contains: page entrypoints such as `Frontend/src/modules/pages/experiment/index.tsx`, feature components under `components/`, and feature hooks/helpers under `lib/`.
- Depends on: shared UI from `Frontend/src/components/ui`, Redux hooks from `Frontend/src/redux`, helpers from `Frontend/src/lib`.
- Used by: route files in `Frontend/src/app/**/page.tsx`.

**Frontend Shared State and Transport Layer:**
- Purpose: Centralize cross-feature REST access, persisted setup state, and realtime socket transport.
- Location: `Frontend/src/redux`, `Frontend/src/lib`
- Contains: store wiring in `Frontend/src/redux/store.ts`, RTK Query slices such as `Frontend/src/redux/api/experiment-session-api.ts`, and realtime helpers in `Frontend/src/lib/gaze-socket.ts`.
- Depends on: browser APIs, backend contracts mirrored in TypeScript, Redux Toolkit.
- Used by: feature pages and components across `Frontend/src/modules/pages/*`.

**Backend Transport Layer:**
- Purpose: Map HTTP/WebSocket traffic to application services.
- Location: `Backend/src/ReadingTheReader.WebApi`
- Contains: startup in `Backend/src/ReadingTheReader.WebApi/Program.cs`, REST endpoints such as `Backend/src/ReadingTheReader.WebApi/ExperimentSessionEndpoints/UpsertReadingSessionEndpoint.cs`, and WebSocket middleware in `Backend/src/ReadingTheReader.WebApi/Websockets/WebSocketConfiguration.cs`.
- Depends on: `Backend/src/core/ReadingTheReader.core.Application` and infrastructure project references declared in `Backend/src/ReadingTheReader.WebApi/ReadingTheReader.WebApi.csproj`.
- Used by: frontend REST calls and frontend WebSocket client.

**Backend Application Layer:**
- Purpose: Hold workflow rules, orchestration, validation, and application contracts.
- Location: `Backend/src/core/ReadingTheReader.core.Application`
- Contains: service installers in `Backend/src/core/ReadingTheReader.core.Application/ApplicationModuleInstaller.cs`, orchestration in `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs`, calibration rules in `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/CalibrationService.cs`, and infrastructure interfaces in `Backend/src/core/ReadingTheReader.core.Application/InfrastructureContracts/*.cs`.
- Depends on: domain project reference in `Backend/src/core/ReadingTheReader.core.Application/ReadingTheReader.core.Application.csproj`.
- Used by: Web API endpoints and infrastructure implementations.

**Backend Domain Layer:**
- Purpose: Keep core entity types separate from transport, filesystem, and Tobii SDK details.
- Location: `Backend/src/core/ReadingTheReader.core.Domain`
- Contains: `Backend/src/core/ReadingTheReader.core.Domain/GazeData.cs`, `Backend/src/core/ReadingTheReader.core.Domain/ExperimentSession.cs`, `Backend/src/core/ReadingTheReader.core.Domain/Participant.cs`, `Backend/src/core/ReadingTheReader.core.Domain/EyeTrackerDevice.cs`.
- Depends on: no internal project references.
- Used by: application services and snapshots.

**Backend Infrastructure Layer:**
- Purpose: Implement side effects required by the application layer.
- Location: `Backend/src/infrastructure`
- Contains: Tobii adapter in `Backend/src/infrastructure/ReadingTheReader.TobiiEyetracker/TobiiEyeTrackerAdapter.cs`, WebSocket broadcaster in `Backend/src/infrastructure/ReadingTheReader.RealtimeMessenger/WebSocketRealtimeMessenger.cs`, and file/in-memory persistence in `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/*.cs`.
- Depends on: `Backend/src/core/ReadingTheReader.core.Application`.
- Used by: `Program.cs` module installers and DI.

## Data Flow

**Experiment Setup and Session Start:**
1. `Frontend/src/modules/pages/experiment/components/experiment-stepper.tsx` coordinates setup steps and uses RTK Query endpoints such as `useSaveParticipantMutation`, `useUpsertReadingSessionMutation`, and `useStartExperimentSessionMutation`.
2. RTK Query slices in `Frontend/src/redux/api/participant-api.ts`, `Frontend/src/redux/api/reading-material-api.ts`, and `Frontend/src/redux/api/experiment-session-api.ts` call REST endpoints under `Backend/src/ReadingTheReader.WebApi/*Endpoints`.
3. Thin endpoint classes map request DTOs from `Backend/src/ReadingTheReader.WebApi/Contracts/*` into application commands handled by services such as `ParticipantService`, `ReadingMaterialSetupService`, `EyeTrackerService`, and `ExperimentSessionManager`.

**Calibration Flow:**
1. `Frontend/src/modules/pages/calibration/index.tsx` drives the visual calibration sequence and calls REST mutations from `Frontend/src/redux/api/calibration-api.ts` while also subscribing to calibration snapshots from `Frontend/src/lib/gaze-socket.ts`.
2. REST endpoints in `Backend/src/ReadingTheReader.WebApi/CalibrationEndpoints/*.cs` delegate to `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/CalibrationService.cs`.
3. `CalibrationService` pauses gaze streaming through `IExperimentSessionManager`, coordinates Tobii calibration/validation through `IEyeTrackerAdapter`, updates the shared session snapshot, and broadcasts `calibrationStateChanged` over `IClientBroadcasterAdapter`.

**Live Reading and Researcher Mirror:**
1. `Frontend/src/modules/pages/reading/pages/ReadingPage.tsx` registers the participant view, emits viewport and focus updates through `Frontend/src/lib/gaze-socket.ts`, and renders `Frontend/src/modules/pages/reading/components/ReaderShell.tsx`.
2. `Frontend/src/modules/pages/researcher/current-live/index.tsx` subscribes to the same experiment session snapshot via `Frontend/src/lib/use-live-experiment-session.ts` and to gaze data via `Frontend/src/modules/pages/gaze/lib/use-live-gaze-stream.ts`.
3. `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs` merges REST-driven setup state, participant viewport updates, reading focus updates, attention summaries, interventions, and incoming gaze samples into a single `ExperimentSessionSnapshot`.
4. `Backend/src/infrastructure/ReadingTheReader.RealtimeMessenger/WebSocketRealtimeMessenger.cs` broadcasts envelope messages to connected clients registered by `Backend/src/infrastructure/ReadingTheReader.RealtimeMessenger/WebSocketConnectionManager.cs`.

**Replay Export and Playback:**
1. `ExperimentSessionManager` records lifecycle events, gaze samples, reading session states, participant viewport changes, focus changes, and interventions while a session is active.
2. On finish, `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs` builds an `ExperimentReplayExport` and persists it through `IExperimentReplayExportStoreAdapter`.
3. `Frontend/src/modules/pages/replay/index.tsx` either imports a local export file or fetches a saved export through `Frontend/src/redux/api/experiment-session-api.ts`, then reconstructs frames with helpers in `Frontend/src/lib/experiment-replay.ts`.

**State Management:**
- Cross-route setup state lives in Redux slices in `Frontend/src/redux/slices/experiment-slice.ts` and `Frontend/src/redux/slices/app-slice.ts`.
- REST caching and invalidation live in RTK Query slices in `Frontend/src/redux/api/*.ts`.
- High-frequency realtime state is kept out of Redux and instead flows through the singleton socket client in `Frontend/src/lib/gaze-socket.ts`, local component state, refs, and requestAnimationFrame loops such as `Frontend/src/modules/pages/gaze/lib/use-live-gaze-stream.ts`.
- Backend session truth is centralized in the singleton `ExperimentSessionManager`; file-backed checkpointing is handled by `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/ExperimentStateCheckpointWorker.cs`.

## Key Abstractions

**Experiment Session Snapshot:**
- Purpose: Single backend-owned aggregate for session activity, setup completion, calibration state, latest gaze state, connected clients, and reading-session metadata.
- Examples: `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionSnapshot.cs`, `Frontend/src/lib/experiment-session.ts`.
- Pattern: Backend defines the canonical C# record; frontend mirrors the shape manually in TypeScript and updates it incrementally from WebSocket events.

**Application Service Interfaces:**
- Purpose: Give transport code stable entrypoints without exposing infrastructure details.
- Examples: `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/IEyeTrackerService.cs`, `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ICalibrationService.cs`, `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Participants/IParticipantService.cs`.
- Pattern: Endpoints depend on interfaces; implementations are registered in `Backend/src/core/ReadingTheReader.core.Application/ApplicationModuleInstaller.cs`.

**Infrastructure Contracts:**
- Purpose: Keep the application layer independent from hardware, broadcast transport, and persistence strategy.
- Examples: `Backend/src/core/ReadingTheReader.core.Application/InfrastructureContracts/IEyeTrackerAdapter.cs`, `Backend/src/core/ReadingTheReader.core.Application/InfrastructureContracts/IClientBroadcasterAdapter.cs`, `Backend/src/core/ReadingTheReader.core.Application/InfrastructureContracts/IExperimentStateStoreAdapter.cs`.
- Pattern: Application services code against interfaces; infrastructure projects bind concrete classes through installers such as `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/RealtimePersistenceModuleInstaller.cs`.

**Feature Module Pages:**
- Purpose: Give each user-facing flow a single composition root on the frontend.
- Examples: `Frontend/src/modules/pages/experiment/index.tsx`, `Frontend/src/modules/pages/calibration/index.tsx`, `Frontend/src/modules/pages/reading-material-setup/index.tsx`, `Frontend/src/modules/pages/replay/index.tsx`.
- Pattern: Route file imports one module page; module page imports feature-local components and shared hooks.

## Shared Contracts

**REST DTO Pairs:**
- Reading session: `Backend/src/ReadingTheReader.WebApi/Contracts/ExperimentSession/UpsertReadingSessionRequest.cs` is consumed from `Frontend/src/redux/api/experiment-session-api.ts`.
- Participant save: `Backend/src/ReadingTheReader.WebApi/Contracts/Participants/SaveParticipantRequest.cs` is shaped by `Frontend/src/redux/api/participant-api.ts`.
- Reading-material setup: `Backend/src/ReadingTheReader.WebApi/Contracts/ReadingMaterialSetups/*.cs` is mirrored by `Frontend/src/redux/api/reading-material-api.ts`.

**Realtime Envelope Contracts:**
- Backend message names live in `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/MessageTypes.cs`.
- Frontend envelope unions live in `Frontend/src/lib/gaze-socket.ts`.
- Session, calibration, and reading-session payloads are mirrored in `Frontend/src/lib/experiment-session.ts`, `Frontend/src/lib/calibration.ts`, and `Frontend/src/lib/reading-attention-summary.ts`.

**Important Constraint:**
- There is no generated shared package across `Frontend/` and `Backend/`. Contract alignment is manual, so changes to records such as `ExperimentSessionSnapshot`, `ReaderShellSettingsSnapshot`, or message type names must be updated on both sides.

## Entry Points

**Frontend Runtime:**
- Location: `Frontend/src/app/layout.tsx`
- Triggers: Next.js app startup.
- Responsibilities: load fonts, install `Providers`, and apply persisted palette/font attributes before hydration.

**Frontend Providers:**
- Location: `Frontend/src/app/providers.tsx`
- Triggers: root layout render.
- Responsibilities: mount Redux, theme providers, error boundary/reporting, and global error UI.

**Backend Runtime:**
- Location: `Backend/src/ReadingTheReader.WebApi/Program.cs`
- Triggers: ASP.NET Core startup.
- Responsibilities: install application and infrastructure modules, configure FastEndpoints and `/ws`, and start the HTTP server.

**Backend WebSocket Surface:**
- Location: `Backend/src/ReadingTheReader.WebApi/Websockets/WebSocketConfiguration.cs`
- Triggers: client connects to `/ws`.
- Responsibilities: accept sockets, read text frames, and forward messages to `IExperimentSessionManager`.

## Error Handling

**Strategy:** Transport layers convert predictable validation failures into `400` responses or `error` websocket messages, while long-running/background components prefer best-effort continuation over process crashes.

**Patterns:**
- FastEndpoints handlers such as `Backend/src/ReadingTheReader.WebApi/ExperimentSessionEndpoints/UpsertReadingSessionEndpoint.cs` and `Backend/src/ReadingTheReader.WebApi/CalibrationEndpoints/StartCalibrationEndpoint.cs` catch `InvalidOperationException` or `ArgumentException` and write `{ message }` responses.
- `Frontend/src/lib/gaze-socket.ts` reports parse failures and server-side `error` messages through `Frontend/src/redux/error-reporter.ts`.
- `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/ExperimentStateCheckpointWorker.cs` swallows non-cancellation exceptions so checkpoint failures do not stop the host.

## Cross-Cutting Concerns

**Logging:** Console logging is used directly in `Backend/src/ReadingTheReader.WebApi/Program.cs`, `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs`, and `Frontend/src/redux/api/base-api.ts` / `Frontend/src/lib/gaze-socket.ts` for transport visibility.

**Validation:** Frontend form validation is handled locally with `react-hook-form` and `zod` in files such as `Frontend/src/modules/pages/experiment/components/experiment-stepper.tsx`; backend validation is handled inside application services such as `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/ReadingMaterialSetups/ReadingMaterialSetupService.cs` and orchestration guards inside `ExperimentSessionManager`.

**Authentication:** `Backend/src/ReadingTheReader.WebApi/Program.cs` calls `AddAuthentication()` and `AddAuthorization()`, but all current endpoints call `AllowAnonymous()`, so request flows are effectively unauthenticated.

---

*Architecture analysis: 2026-03-26*
