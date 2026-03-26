# Codebase Structure

**Analysis Date:** 2026-03-26

## Directory Layout

```text
reading-the-reader-monorepo/
+-- Backend/                         # .NET solution, Web API, core libraries, infrastructure, tests
+-- Frontend/                        # Next.js application
+-- docs/                            # Architecture and integration documentation
+-- .github/                         # Repository-level workflow automation
+-- .planning/codebase/              # Generated codebase reference documents
+-- README.md                        # Monorepo overview and common commands
`-- .codex/                          # Local Codex workflow and skill configuration
```

## Directory Purposes

**`Backend/`:**
- Purpose: Houses the backend solution and all backend-specific code.
- Contains: `reading-the-reader-backend.sln`, projects under `Backend/src`, and tests under `Backend/tests`.
- Key files: `Backend/reading-the-reader-backend.sln`, `Backend/src/ReadingTheReader.WebApi/Program.cs`.

**`Backend/src/ReadingTheReader.WebApi/`:**
- Purpose: Web entrypoint and transport surface.
- Contains: `Program.cs`, FastEndpoints classes under `*Endpoints/`, HTTP contracts under `Contracts/`, websocket middleware under `Websockets/`, and runtime data files under `data/`.
- Key files: `Backend/src/ReadingTheReader.WebApi/Program.cs`, `Backend/src/ReadingTheReader.WebApi/Websockets/WebSocketConfiguration.cs`, `Backend/src/ReadingTheReader.WebApi/appsettings.json`.

**`Backend/src/core/ReadingTheReader.core.Application/`:**
- Purpose: Application services, orchestration, snapshots, and infrastructure contracts.
- Contains: `ApplicationModuleInstaller.cs`, use-case folders under `ApplicationContracts/`, and interfaces under `InfrastructureContracts/`.
- Key files: `Backend/src/core/ReadingTheReader.core.Application/ApplicationModuleInstaller.cs`, `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs`.

**`Backend/src/core/ReadingTheReader.core.Domain/`:**
- Purpose: Core domain entities and low-level abstractions.
- Contains: entity records/classes only.
- Key files: `Backend/src/core/ReadingTheReader.core.Domain/GazeData.cs`, `Backend/src/core/ReadingTheReader.core.Domain/ExperimentSession.cs`.

**`Backend/src/infrastructure/`:**
- Purpose: Concrete adapters for external effects.
- Contains: `ReadingTheReader.TobiiEyetracker/`, `ReadingTheReader.RealtimeMessenger/`, and `ReadingTheReader.Realtime.Persistence/`.
- Key files: `Backend/src/infrastructure/ReadingTheReader.TobiiEyetracker/TobiiEyeTrackerAdapter.cs`, `Backend/src/infrastructure/ReadingTheReader.RealtimeMessenger/WebSocketRealtimeMessenger.cs`, `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/RealtimePersistenceModuleInstaller.cs`.

**`Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/`:**
- Purpose: Current backend test project.
- Contains: unit and adapter tests for replay export serialization, reading-material persistence, and intervention runtime behavior.
- Key files: `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingInterventionRuntimeTests.cs`, `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/FileReadingMaterialSetupStoreAdapterTests.cs`.

**`Frontend/src/app/`:**
- Purpose: Next.js App Router wiring.
- Contains: root `layout.tsx`, `providers.tsx`, route-group layouts, and one-file route entrypoints.
- Key files: `Frontend/src/app/layout.tsx`, `Frontend/src/app/providers.tsx`, `Frontend/src/app/(with-sidebar)/layout.tsx`, `Frontend/src/app/(without-sidebar)/layout.tsx`.

**`Frontend/src/modules/`:**
- Purpose: Main home for frontend feature code.
- Contains: `pages/` feature folders with feature-local components and helpers.
- Key files: `Frontend/src/modules/pages/experiment/index.tsx`, `Frontend/src/modules/pages/reading/pages/ReadingPage.tsx`, `Frontend/src/modules/pages/researcher/current-live/index.tsx`.

**`Frontend/src/components/`:**
- Purpose: Shared UI and app-wide components.
- Contains: `ui/` primitives, `theme/` controls, `error/` boundaries, and shared experiment UI.
- Key files: `Frontend/src/components/ui/sidebar.tsx`, `Frontend/src/components/error/app-error-boundary.tsx`, `Frontend/src/components/experiment/experiment-completion-actions.tsx`.

**`Frontend/src/redux/`:**
- Purpose: Shared client state and REST API definitions.
- Contains: store setup, hooks, middleware, RTK Query slices, and global slices.
- Key files: `Frontend/src/redux/store.ts`, `Frontend/src/redux/api/base-api.ts`, `Frontend/src/redux/slices/experiment-slice.ts`.

**`Frontend/src/lib/`:**
- Purpose: Cross-feature helpers and transport code that do not belong to a single page module.
- Contains: websocket client, contract mirrors, calibration/session/replay helpers, and generic utilities.
- Key files: `Frontend/src/lib/gaze-socket.ts`, `Frontend/src/lib/use-live-experiment-session.ts`, `Frontend/src/lib/experiment-session.ts`.

**`docs/backend/`:**
- Purpose: Human-authored backend architecture and integration notes.
- Contains: `backend-architecture.md`, `frontend-backend-integration-guide.md`.
- Key files: `docs/backend/backend-architecture.md`, `docs/backend/frontend-backend-integration-guide.md`.

## Key File Locations

**Entry Points:**
- `Frontend/src/app/layout.tsx`: Next.js root layout and global HTML/body shell.
- `Frontend/src/app/providers.tsx`: client-only provider composition.
- `Backend/src/ReadingTheReader.WebApi/Program.cs`: ASP.NET Core startup.
- `Backend/src/ReadingTheReader.WebApi/Websockets/WebSocketConfiguration.cs`: `/ws` endpoint mapping.

**Configuration:**
- `Frontend/package.json`: frontend scripts and package set.
- `Frontend/tsconfig.json`: TypeScript config and `@/*` alias.
- `Frontend/next.config.ts`: Next.js config with React Compiler enabled.
- `Backend/src/ReadingTheReader.WebApi/appsettings.json`: runtime defaults for persistence and calibration.
- `Backend/src/ReadingTheReader.WebApi/ReadingTheReader.WebApi.csproj`: backend transport project references.

**Core Logic:**
- `Frontend/src/modules/pages/experiment/components/experiment-stepper.tsx`: setup workflow orchestration.
- `Frontend/src/modules/pages/reading/components/ReaderShell.tsx`: participant reading shell.
- `Frontend/src/modules/pages/researcher/current-live/index.tsx`: researcher mirror and intervention UI.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs`: session state hub.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/CalibrationService.cs`: calibration and validation flow.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/ReadingMaterialSetups/ReadingMaterialSetupService.cs`: reading-material setup rules.

**Testing:**
- `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/*.cs`: current backend tests.
- `Frontend/`: no dedicated test directory detected in the current tree.

## Naming Conventions

**Files:**
- Frontend route files use Next.js conventions: `Frontend/src/app/**/page.tsx` and `Frontend/src/app/**/layout.tsx`.
- Frontend feature entrypoints usually use `index.tsx` inside a page folder, for example `Frontend/src/modules/pages/replay/index.tsx`.
- Frontend feature helpers stay near the owning page under `components/`, `lib/`, `types.ts`, or `utils.ts`, for example `Frontend/src/modules/pages/researcher/current-live/components/LiveReaderColumn.tsx`.
- Backend transport files use `*Endpoint.cs` naming under feature-specific folders, for example `Backend/src/ReadingTheReader.WebApi/EyeTrackerEndpoints/StartTrackingEndpoint.cs`.
- Backend service and contract files are named after the use case or snapshot they expose, for example `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ReaderShellSettingsService.cs`.

**Directories:**
- Frontend route groups use parentheses, for example `Frontend/src/app/(with-sidebar)` and `Frontend/src/app/(without-sidebar)`.
- Frontend feature folders are feature-first under `Frontend/src/modules/pages/<feature>`.
- Backend solution folders map directly to architectural layers: `Backend/src/core`, `Backend/src/infrastructure`, `Backend/src/ReadingTheReader.WebApi`.

## Route-to-Module Placement

**Dashboard and setup routes:**
- `Frontend/src/app/(with-sidebar)/experiment/page.tsx` -> `Frontend/src/modules/pages/experiment/index.tsx`
- `Frontend/src/app/(with-sidebar)/reading-material/setup/page.tsx` -> `Frontend/src/modules/pages/reading-material-setup/index.tsx`
- `Frontend/src/app/(with-sidebar)/settings/page.tsx` -> `Frontend/src/modules/pages/settings/index.tsx`

**Fullscreen / immersive routes:**
- `Frontend/src/app/(without-sidebar)/calibration/page.tsx` -> `Frontend/src/modules/pages/calibration/index.tsx`
- `Frontend/src/app/(without-sidebar)/reading/page.tsx` -> `Frontend/src/modules/pages/reading/pages/ReadingPage.tsx`
- `Frontend/src/app/(without-sidebar)/researcher/current-live/page.tsx` -> `Frontend/src/modules/pages/researcher/current-live/index.tsx`
- `Frontend/src/app/(without-sidebar)/replay/page.tsx` -> `Frontend/src/modules/pages/replay/index.tsx`

## Backend Subsystem Placement

**Transport / Web API:**
- Add REST endpoints under the closest folder in `Backend/src/ReadingTheReader.WebApi`, such as `EyeTrackerEndpoints/`, `CalibrationEndpoints/`, `ExperimentSessionEndpoints/`, `ParticipantEndpoints/`, `ReadingMaterialSetupEndpoints/`, or `ReaderShellSettingsEndpoints/`.
- Put request DTOs under `Backend/src/ReadingTheReader.WebApi/Contracts/<feature>/`.

**Application services and snapshots:**
- Put use-case orchestration under `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/<feature>/`.
- Put interfaces to hardware, persistence, and broadcast adapters under `Backend/src/core/ReadingTheReader.core.Application/InfrastructureContracts/`.

**Infrastructure implementations:**
- Put hardware code in `Backend/src/infrastructure/ReadingTheReader.TobiiEyetracker/`.
- Put broadcast/socket transport in `Backend/src/infrastructure/ReadingTheReader.RealtimeMessenger/`.
- Put persistence and file-backed adapters in `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/`.

## Where to Add New Code

**New frontend route-backed feature:**
- Primary code: create a feature folder under `Frontend/src/modules/pages/<feature>/`.
- Route wiring: add a thin file under `Frontend/src/app/.../page.tsx` that renders the module page.
- Shared state: only add Redux state in `Frontend/src/redux/` if the state must cross page boundaries; otherwise keep it under the owning module.

**New frontend shared component or helper:**
- Reusable UI primitive: `Frontend/src/components/ui/`.
- App-wide shared component: `Frontend/src/components/`.
- Cross-feature transport/helper code: `Frontend/src/lib/`.
- Feature-only helper: keep it under `Frontend/src/modules/pages/<feature>/lib/` or `components/`.

**New backend use case:**
- Application contract/service: `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/<feature>/`.
- Transport exposure: matching endpoint in `Backend/src/ReadingTheReader.WebApi/<Feature>Endpoints/`.
- External side effect implementation: matching adapter in `Backend/src/infrastructure/<project>/`.

**New backend persistence-backed artifact:**
- Interface: `Backend/src/core/ReadingTheReader.core.Application/InfrastructureContracts/`.
- File/in-memory adapter: `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/`.
- Runtime data path: under `Backend/src/ReadingTheReader.WebApi/data/` if it is part of the current file-backed runtime model.

## Special Directories

**`Backend/src/ReadingTheReader.WebApi/data/`:**
- Purpose: Stores runtime JSON/markdown artifacts such as saved reading-material setups and persisted settings/export files.
- Generated: Yes, at runtime.
- Committed: Yes, sample and current data files are present in the repo.

**`Frontend/public/`:**
- Purpose: Static assets served by Next.js.
- Generated: No.
- Committed: Yes.

**`Frontend/.next/`:**
- Purpose: Next.js build output.
- Generated: Yes.
- Committed: No.

**`Frontend/node_modules/`:**
- Purpose: Installed frontend dependencies.
- Generated: Yes.
- Committed: No.

**`Backend/src/**/bin` and `Backend/src/**/obj`:**
- Purpose: .NET build outputs and intermediates.
- Generated: Yes.
- Committed: No.

**`.planning/codebase/`:**
- Purpose: Generated architecture, stack, testing, conventions, and concerns documents for the GSD workflow.
- Generated: Yes.
- Committed: Yes, these docs are intended to be versioned workflow artifacts.

## Placement Rules To Follow

- Keep `Frontend/src/app` thin. If a route file grows beyond simple composition, move the logic into `Frontend/src/modules/pages/...`.
- Put feature-local React components next to the owning page before promoting them to `Frontend/src/components/`.
- Keep backend endpoint classes small and map transport DTOs into application commands instead of moving orchestration into `Backend/src/ReadingTheReader.WebApi`.
- Keep infrastructure details out of `Backend/src/core/ReadingTheReader.core.Domain` and `Backend/src/core/ReadingTheReader.core.Application`.
- When a frontend or backend contract changes, update the mirror type on the other side in the same change set.

---

*Structure analysis: 2026-03-26*
