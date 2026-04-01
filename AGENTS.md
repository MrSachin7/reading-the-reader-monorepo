<!-- GSD:project-start source:PROJECT.md -->
## Project

**Reading the Reader Thesis Platform**

This project is the software thesis implementation for the Reading the Reader research initiative. It is a researcher-operated adaptive reading system that connects to Tobii eye tracking hardware, runs controlled reading sessions, mirrors the participant view in real time, and applies context-aware micro-interventions while exporting experiment data for later analysis.

The thesis focus is not only to ship a working system, but to defend a modular architecture that cleanly separates sensing, decision-making strategies, intervention execution, and user interface adaptation so future teams can plug in new interventions and external AI-driven decision providers without rewriting the core application.

**Core Value:** Build a defendable, modular adaptive reading platform that supports real Tobii-backed experiments and interchangeable intervention and decision modules without breaking the participant reading flow or the researcher workflow.

### Constraints

- **Hardware**: Tobii eye tracker integration must work with real hardware - the thesis needs a real experiment-capable sensing pipeline
- **Architecture**: Strong modularity is mandatory - sensing, decision strategies, intervention execution, and UI adaptation must be separable and defensible
- **Operator model**: The system is researcher-operated - researcher workflows have slightly higher priority than participant-only polish because participants are invited and managed by researchers
- **Scope**: AI support must be architectural, not implemented end-to-end in this repo - external teams or future contributors can supply AI decision providers
- **Content format**: Reading material is Markdown only - PDF support is explicitly excluded
- **Time**: Thesis deadline pressure matters - lower-priority study tooling can be trimmed if needed, but the architecture, adaptive runtime, and researcher-control story cannot
- **Validation**: The result must be defendable as thesis material - implementation choices need to support architectural argumentation, experimentation, and documentation
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Repository Shape
- Monorepo with two independent application roots: `Frontend/` for the UI and `Backend/` for the .NET solution.
- Root-level coordination lives in `README.md`, `.github/workflows/frontend-ci.yml`, `.github/workflows/backend-ci.yml`, and shared docs under `docs/`.
- No root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `nx.json`, `global.json`, or `Directory.Packages.props` was detected; dependency management is per subproject.
## Languages
- TypeScript 5.x - frontend application code in `Frontend/src/app/`, `Frontend/src/modules/`, `Frontend/src/redux/`, and `Frontend/src/lib/`.
- C# targeting .NET 10 - backend API, core, infrastructure, and tests in `Backend/src/` and `Backend/tests/`.
- CSS - global styling in `Frontend/src/app/globals.css`.
- Markdown - reading content and project docs in `Frontend/src/modules/pages/reading/content/mock-reading.md` and `docs/frontend/`.
- YAML - CI pipelines in `.github/workflows/frontend-ci.yml` and `.github/workflows/backend-ci.yml`.
## Runtime
- Frontend runtime is Next.js on React 19 from `Frontend/package.json`; dev entrypoint is `Frontend/src/app/layout.tsx`.
- Backend runtime is ASP.NET Core 10 from `Backend/src/ReadingTheReader.WebApi/ReadingTheReader.WebApi.csproj`; HTTP entrypoint is `Backend/src/ReadingTheReader.WebApi/Program.cs`.
- Observed local tools in this workspace: Bun `1.3.10`, Node `v24.14.0`, and .NET SDK `10.0.103`.
- Frontend uses Bun with lockfile `Frontend/bun.lock`.
- Backend uses NuGet through SDK-style `.csproj` files and `dotnet restore` against `Backend/reading-the-reader-backend.sln`.
- Lockfile: present for frontend (`Frontend/bun.lock`), not detected for NuGet (`packages.lock.json` missing).
## Frameworks
- Next.js `16.1.6` - React App Router frontend from `Frontend/package.json` with routes under `Frontend/src/app/`.
- React `19.2.3` - UI runtime used throughout `Frontend/src/app/providers.tsx` and `Frontend/src/modules/pages/**`.
- ASP.NET Core Web API on `Microsoft.NET.Sdk.Web` / `net10.0` - backend host in `Backend/src/ReadingTheReader.WebApi/ReadingTheReader.WebApi.csproj`.
- FastEndpoints `8.0.1` - REST endpoint framework used in `Backend/src/ReadingTheReader.WebApi/*Endpoints/*.cs`.
- xUnit `2.9.3` with `Microsoft.NET.Test.Sdk` `17.14.1` - backend tests in `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/`.
- No frontend test framework is configured in `Frontend/package.json`; `.github/workflows/frontend-ci.yml` only runs tests if a `test` script exists.
- Tailwind CSS `^4` with PostCSS via `Frontend/postcss.config.mjs` and `Frontend/src/app/globals.css`.
- ESLint `^9` with Next presets in `Frontend/eslint.config.mjs`.
- React Compiler enabled in `Frontend/next.config.ts` with `babel-plugin-react-compiler` in `Frontend/package.json`.
- Swagger/OpenAPI via `FastEndpoints.Swagger` and `Microsoft.AspNetCore.OpenApi` in `Backend/src/ReadingTheReader.WebApi/ReadingTheReader.WebApi.csproj`.
- Docker multi-stage publish image for the backend in `Backend/src/ReadingTheReader.WebApi/Dockerfile`.
## Key Dependencies
- `@reduxjs/toolkit` `^2.11.2` and `react-redux` `^9.2.0` - app state and RTK Query API clients in `Frontend/src/redux/store.ts` and `Frontend/src/redux/api/base-api.ts`.
- `zod` `^4.3.6` - schema validation for replay imports in `Frontend/src/lib/experiment-replay.ts`.
- `next-themes` `^0.4.6` - theme switching wrapper in `Frontend/src/app/providers.tsx`.
- `FastEndpoints` `8.0.1` - request handling for routes like `Backend/src/ReadingTheReader.WebApi/ExperimentSessionEndpoints/GetExperimentSessionEndpoint.cs`.
- `CsvHelper` `33.1.0` - replay export CSV serialization in `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/ExperimentReplayExportSerializer.cs`.
- `Tobii.Research.x64` `1.11.0.1334` - Windows-only eye tracker SDK in `Backend/src/infrastructure/ReadingTheReader.TobiiEyetracker/ReadingTheReader.TobiiEyetracker.csproj`.
- shadcn registry config in `Frontend/components.json` and UI primitives in `Frontend/src/components/ui/`.
- `@base-ui/react`, `radix-ui`, `sonner`, `lucide-react`, `react-hook-form`, and `recharts` - UI/form/chart tooling from `Frontend/package.json`, used across `Frontend/src/components/` and `Frontend/src/modules/pages/`.
- `Microsoft.Extensions.Options.ConfigurationExtensions` and `Microsoft.Extensions.Configuration.Binder` - configuration binding in `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/RealtimePersistenceModuleInstaller.cs`.
## Configuration
- Frontend reads `NEXT_PUBLIC_API_BASE_URL` in `Frontend/src/redux/api/base-api.ts` and `NEXT_PUBLIC_WS_URL` in `Frontend/src/lib/gaze-socket.ts`.
- Backend environment selection uses `ASPNETCORE_ENVIRONMENT` in `Backend/src/ReadingTheReader.WebApi/Properties/launchSettings.json`.
- No tracked `.env`, `.env.*`, or root secret-management files were detected.
- Frontend config files: `Frontend/package.json`, `Frontend/tsconfig.json`, `Frontend/next.config.ts`, `Frontend/postcss.config.mjs`, `Frontend/eslint.config.mjs`, and `Frontend/components.json`.
- Backend config files: `Backend/reading-the-reader-backend.sln`, `Backend/src/ReadingTheReader.WebApi/appsettings.json`, `Backend/src/ReadingTheReader.WebApi/appsettings.Development.json`, `Backend/src/ReadingTheReader.WebApi/Properties/launchSettings.json`, and `Backend/src/ReadingTheReader.WebApi/Dockerfile`.
- CI config files: `.github/workflows/frontend-ci.yml` and `.github/workflows/backend-ci.yml`.
## Platform Requirements
- Frontend development expects Bun and a browser; commands are documented in `Frontend/README.md`.
- Backend development expects .NET 10 and, for real hardware integration, Windows with the Tobii SDK package path in `Backend/src/infrastructure/ReadingTheReader.TobiiEyetracker/ReadingTheReader.TobiiEyetracker.csproj`.
- Local default ports are `http://localhost:3000` for the frontend from `Frontend/README.md` and `http://localhost:5190` / `https://localhost:7248` for the backend from `Backend/src/ReadingTheReader.WebApi/Properties/launchSettings.json`.
- Backend has an explicit Linux container target via `Backend/src/ReadingTheReader.WebApi/Dockerfile`.
- Frontend production hosting is not pinned in repo config; the build artifact is standard Next.js output from `Frontend/package.json`.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Frontend route files under `Frontend/src/app/**/page.tsx` use Next.js defaults and stay thin. `Frontend/src/app/(with-sidebar)/experiment/page.tsx` and `Frontend/src/app/(without-sidebar)/reading/page.tsx` only hand off to module entry points.
- Frontend feature entry files under `Frontend/src/modules/pages/**/index.tsx` use PascalCase page component names with a default export, for example `Frontend/src/modules/pages/experiment/index.tsx` exports `ExperimentPage`.
- Frontend feature component files use PascalCase names such as `Frontend/src/modules/pages/settings/sections/CalibrationSettingsSection.tsx` and `Frontend/src/modules/pages/reading/components/ReaderShell.tsx`.
- Frontend shared UI, hook, lib, slice, and API filenames are lowercase kebab-case, for example `Frontend/src/components/ui/button.tsx`, `Frontend/src/hooks/use-font-theme.tsx`, `Frontend/src/lib/error-utils.ts`, `Frontend/src/redux/slices/experiment-slice.ts`, and `Frontend/src/redux/api/participant-api.ts`.
- Backend C# files use PascalCase and usually match the public type name, for example `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/ReadingMaterialSetups/ReadingMaterialSetupService.cs` and `Backend/src/ReadingTheReader.WebApi/CalibrationEndpoints/StartCalibrationEndpoint.cs`.
- Frontend functions use camelCase. Hooks are prefixed with `use`, for example `useFontTheme` in `Frontend/src/hooks/use-font-theme.tsx` and `useReadingSettings` in `Frontend/src/modules/pages/reading/lib/useReadingSettings.ts`.
- Redux action creators are verb-based camelCase names such as `setStepTwoAge` and `hydrateExperimentFromSession` in `Frontend/src/redux/slices/experiment-slice.ts`.
- Backend async methods almost always use verb-based `*Async` names and accept `CancellationToken ct = default`, for example `SaveAsync`, `UpdateAsync`, and `StartCalibrationAsync` in `Backend/src/core/ReadingTheReader.core.Application/**`.
- Frontend local state and helpers use camelCase, while compile-time constants are uppercase snake case, for example `PRESET_DESCRIPTIONS` in `Frontend/src/modules/pages/settings/sections/CalibrationSettingsSection.tsx` and `FONT_STORAGE_KEY` in `Frontend/src/hooks/use-font-theme.tsx`.
- Backend private fields use `_camelCase`, for example `_readingMaterialSetupStoreAdapter` in `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/ReadingMaterialSetups/ReadingMaterialSetupService.cs`.
- Frontend TypeScript types use PascalCase with descriptive suffixes such as `ExperimentStepNavigationProps`, `AppErrorRecord`, `SaveParticipantPayload`, and `RootState` in `Frontend/src/modules/pages/experiment/components/experiment-stepper.tsx`, `Frontend/src/lib/error-utils.ts`, and `Frontend/src/redux/store.ts`.
- Backend interfaces use `I` prefixes, such as `IReadingMaterialSetupService`, `IExperimentSessionManager`, and `IEyeTrackerAdapter` under `Backend/src/core/ReadingTheReader.core.Application`.
## Code Style
- Frontend relies on TypeScript strict mode in `Frontend/tsconfig.json` and ESLint in `Frontend/eslint.config.mjs`. No Prettier, Biome, or `.editorconfig` file is detected at repo root or in `Frontend/`.
- Frontend formatting is locally consistent but globally mixed. Hand-authored files like `Frontend/src/redux/store.ts` are mostly semicolon-free, while route wrappers and some generated or registry-derived files such as `Frontend/src/app/providers.tsx`, `Frontend/src/modules/pages/experiment/index.tsx`, and `Frontend/src/hooks/use-font-theme.tsx` use semicolons. Match the surrounding file instead of reformatting unrelated code.
- Backend formatting follows standard modern C# conventions: file-scoped namespaces, braces on new lines, nullable enabled, and implicit usings enabled in `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj`.
- Frontend linting comes from `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript` in `Frontend/eslint.config.mjs`.
- The discoverable frontend lint command is `lint: eslint` in `Frontend/package.json`.
- No standalone backend analyzer configuration file is detected. Backend quality enforcement is currently driven by compiler settings and CI build/test execution in `.github/workflows/backend-ci.yml`.
## Import Organization
- Frontend uses the `@/*` alias from `Frontend/tsconfig.json`.
- The `Frontend/components.json` registry aliases point `components`, `ui`, `lib`, and `hooks` back into `Frontend/src/**`.
## Error Handling
- Frontend normalizes errors through `Frontend/src/lib/error-utils.ts`. Use `getErrorMessage`, `getErrorStatus`, `normalizeAppError`, or `normalizeApiError` instead of surfacing raw unknown errors.
- RTK Query failures are intercepted centrally in `Frontend/src/redux/middleware/error-middleware.ts`, then pushed into app state through `pushError` in `Frontend/src/redux/slices/app-slice.ts`.
- Global runtime failures are captured in `Frontend/src/app/providers.tsx`, `Frontend/src/components/error/app-error-boundary.tsx`, `Frontend/src/components/error/error-runtime-monitor.tsx`, and `Frontend/src/redux/error-reporter.ts`.
- Feature components catch async UI errors locally and reduce them to user-facing strings, for example `Frontend/src/modules/pages/settings/sections/CalibrationSettingsSection.tsx` and `Frontend/src/modules/pages/experiment/components/eyetracker-setup.tsx`.
- Backend application services throw domain or argument exceptions and do not write HTTP responses directly. Examples include `ReadingMaterialSetupValidationException` from `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/ReadingMaterialSetups/ReadingMaterialSetupValidationException.cs` and `InvalidOperationException` throws in `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Calibration/CalibrationService.cs`.
- Backend endpoint classes translate service exceptions into HTTP responses close to the transport boundary, as shown in `Backend/src/ReadingTheReader.WebApi/ReadingMaterialSetupEndpoints/CreateReadingMaterialSetupEndpoint.cs` and `Backend/src/ReadingTheReader.WebApi/CalibrationEndpoints/StartCalibrationEndpoint.cs`.
- Realtime transport layers intentionally swallow disconnected-socket failures after cancellation checks in `Backend/src/infrastructure/ReadingTheReader.RealtimeMessenger/WebSocketRealtimeMessenger.cs` and `Backend/src/ReadingTheReader.WebApi/Websockets/WebSocketConfiguration.cs`.
## Logging
- Frontend logging is concentrated in transport and debugging utilities, not general UI rendering. See `Frontend/src/redux/api/base-api.ts` for REST request/response logs and `Frontend/src/lib/gaze-socket.ts` for WebSocket logs and parse failures.
- Backend logging uses `Console.WriteLine` directly in `Backend/src/ReadingTheReader.WebApi/Program.cs`, `Backend/src/ReadingTheReader.WebApi/Websockets/WebSocketConfiguration.cs`, `Backend/src/infrastructure/ReadingTheReader.TobiiEyetracker/TobiiEyeTrackerAdapter.cs`, and `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Session/ExperimentSessionManager.cs`.
- No `ILogger` usage is detected. Follow the existing lightweight console logging style unless a broader logging refactor is introduced.
## Comments
- Comments are sparse and usually reserved for boundary notes or intentional ignores, for example `// Modules installation` in `Backend/src/ReadingTheReader.WebApi/Program.cs` and `// Ignore disconnected sockets and send failures.` in `Backend/src/infrastructure/ReadingTheReader.RealtimeMessenger/WebSocketRealtimeMessenger.cs`.
- Most business rules are expressed through type names, guard clauses, and helper names rather than explanatory comments. Prefer that style over verbose inline commentary.
- Not used in normal frontend code.
- XML documentation appears only occasionally in backend infrastructure, for example the summaries in `Backend/src/ReadingTheReader.WebApi/Websockets/WebSocketConfiguration.cs`.
## Function Design
- Frontend page containers can be large and orchestration-heavy, for example `Frontend/src/modules/pages/experiment/components/experiment-stepper.tsx` and `Frontend/src/modules/pages/calibration/index.tsx`. Split shared UI into child components and move reusable side effects into hooks or `lib/` helpers.
- Backend services keep public methods focused on one action and push repeated validation or persistence details into private helpers, for example `Validate` in `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/ReadingMaterialSetups/ReadingMaterialSetupService.cs`.
- Frontend mutations and queries usually accept typed payload objects, for example `SaveParticipantPayload` in `Frontend/src/redux/api/participant-api.ts`.
- Backend methods accept strongly typed command objects or primitives plus `CancellationToken`, for example `SaveReadingMaterialSetupCommand` and `UpdateReadingMaterialSetupCommand` in `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/ReadingMaterialSetups/**`.
- Frontend RTK Query calls usually use `.unwrap()` and then update local UI state from the typed payload, as seen in `Frontend/src/modules/pages/settings/sections/CalibrationSettingsSection.tsx` and `Frontend/src/modules/pages/experiment/components/experiment-stepper.tsx`.
- Backend uses `Task` or `ValueTask` return types consistently. Queries often return nullable domain values from adapters and non-null validated values from services, for example `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/InMemoryReadingMaterialSetupStoreAdapter.cs` versus `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/ReadingMaterialSetups/ReadingMaterialSetupService.cs`.
## Module Design
- Frontend route files default-export the page component expected by Next.js. Module entry points also default-export page components, while hooks and helpers use named exports.
- Redux slices default-export reducers and separately export named actions, as shown in `Frontend/src/redux/slices/experiment-slice.ts`.
- RTK Query modules export both the API slice object and generated hooks, for example `Frontend/src/redux/api/participant-api.ts`.
- Backend keeps one primary public type per file and registers implementations through installer modules such as `Backend/src/core/ReadingTheReader.core.Application/ApplicationModuleInstaller.cs`.
- Frontend uses barrel files for high-traffic boundaries. `Frontend/src/redux/index.ts` re-exports store types, hooks, API hooks, and slice actions.
- Avoid putting business logic in barrels. Barrels in the current codebase are export surfaces only.
## Patterns To Follow And Avoid
- Put frontend routing in `Frontend/src/app/**` and actual UI/state logic in `Frontend/src/modules/**`; `Frontend/AGENTS.md` states that `src/app` is routing only.
- Use `baseApi.injectEndpoints` for REST calls instead of ad hoc `fetch` usage when the call belongs in shared app state, following `Frontend/src/redux/api/participant-api.ts`.
- Normalize unknown frontend errors before display or storage; do not dispatch raw thrown values when `Frontend/src/lib/error-utils.ts` already handles message, status, and detail extraction.
- Keep backend HTTP concerns in `Backend/src/ReadingTheReader.WebApi/**` and keep validation/business rules in `Backend/src/core/**`.
- Match the style of the file you are touching. The frontend is not uniformly auto-formatted today.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Treat `Frontend/src/app` as route and layout wiring only; feature logic lives in `Frontend/src/modules`, `Frontend/src/lib`, and `Frontend/src/redux`.
- Treat `Backend/src/ReadingTheReader.WebApi` as transport and composition only; session rules and workflow orchestration live in `Backend/src/core/ReadingTheReader.core.Application`.
- Realtime behavior is split between REST commands under `/api` and a long-lived WebSocket channel under `/ws`, with both surfaces converging on `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Session/ExperimentSessionManager.cs`.
## Frontend / Backend Responsibilities
- `Frontend/src/app/layout.tsx` and `Frontend/src/app/providers.tsx` bootstrap global providers, theming, error boundaries, and Redux.
- `Frontend/src/app/(with-sidebar)/*` hosts dashboard-style routes such as `Frontend/src/app/(with-sidebar)/experiment/page.tsx`, `Frontend/src/app/(with-sidebar)/settings/page.tsx`, and `Frontend/src/app/(with-sidebar)/reading-material/setup/page.tsx`.
- `Frontend/src/app/(without-sidebar)/*` hosts immersion and second-screen routes such as `Frontend/src/app/(without-sidebar)/reading/page.tsx`, `Frontend/src/app/(without-sidebar)/calibration/page.tsx`, `Frontend/src/app/(without-sidebar)/researcher/current-live/page.tsx`, and `Frontend/src/app/(without-sidebar)/replay/page.tsx`.
- `Frontend/src/modules/pages/*` owns feature UI, view composition, and page-local orchestration. Examples: `Frontend/src/modules/pages/experiment/index.tsx`, `Frontend/src/modules/pages/calibration/index.tsx`, `Frontend/src/modules/pages/researcher/current-live/index.tsx`, `Frontend/src/modules/pages/replay/index.tsx`.
- `Frontend/src/redux/api/*` owns REST transport via RTK Query, while `Frontend/src/lib/gaze-socket.ts` owns the singleton browser WebSocket client for realtime envelopes.
- `Backend/src/ReadingTheReader.WebApi/Program.cs` composes the application, installs modules, configures CORS, FastEndpoints, Swagger, auth stubs, and the `/ws` middleware.
- `Backend/src/ReadingTheReader.WebApi/*Endpoints/*.cs` exposes REST endpoints that map HTTP contracts to application commands and snapshots.
- `Backend/src/ReadingTheReader.WebApi/Websockets/WebSocketConfiguration.cs` accepts sockets, deserializes inbound envelopes, and forwards commands to `IExperimentSessionManager`.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/*` contains use-case services, stateful orchestrators, DTO-like snapshots, and infrastructure-facing interfaces.
- `Backend/src/core/ReadingTheReader.core.Domain/*.cs` contains the most basic domain entities such as `GazeData`, `ExperimentSession`, `Participant`, and `EyeTrackerDevice`.
- `Backend/src/infrastructure/*` contains concrete adapters for Tobii hardware, WebSocket broadcasting, persistence, background checkpointing, and file-backed settings/setup storage.
## Layers
- Purpose: Define URL structure, route groups, and shared layouts.
- Location: `Frontend/src/app`
- Contains: `layout.tsx`, `page.tsx`, route-group layouts such as `Frontend/src/app/(with-sidebar)/layout.tsx`.
- Depends on: feature pages from `Frontend/src/modules/pages/*`, providers from `Frontend/src/app/providers.tsx`.
- Used by: the Next.js runtime.
- Purpose: Own user-facing pages, high-level feature composition, and page-local interaction state.
- Location: `Frontend/src/modules/pages`
- Contains: page entrypoints such as `Frontend/src/modules/pages/experiment/index.tsx`, feature components under `components/`, and feature hooks/helpers under `lib/`.
- Depends on: shared UI from `Frontend/src/components/ui`, Redux hooks from `Frontend/src/redux`, helpers from `Frontend/src/lib`.
- Used by: route files in `Frontend/src/app/**/page.tsx`.
- Purpose: Centralize cross-feature REST access, persisted setup state, and realtime socket transport.
- Location: `Frontend/src/redux`, `Frontend/src/lib`
- Contains: store wiring in `Frontend/src/redux/store.ts`, RTK Query slices such as `Frontend/src/redux/api/experiment-session-api.ts`, and realtime helpers in `Frontend/src/lib/gaze-socket.ts`.
- Depends on: browser APIs, backend contracts mirrored in TypeScript, Redux Toolkit.
- Used by: feature pages and components across `Frontend/src/modules/pages/*`.
- Purpose: Map HTTP/WebSocket traffic to application services.
- Location: `Backend/src/ReadingTheReader.WebApi`
- Contains: startup in `Backend/src/ReadingTheReader.WebApi/Program.cs`, REST endpoints such as `Backend/src/ReadingTheReader.WebApi/ExperimentSessionEndpoints/UpsertReadingSessionEndpoint.cs`, and WebSocket middleware in `Backend/src/ReadingTheReader.WebApi/Websockets/WebSocketConfiguration.cs`.
- Depends on: `Backend/src/core/ReadingTheReader.core.Application` and infrastructure project references declared in `Backend/src/ReadingTheReader.WebApi/ReadingTheReader.WebApi.csproj`.
- Used by: frontend REST calls and frontend WebSocket client.
- Purpose: Hold workflow rules, orchestration, validation, and application contracts.
- Location: `Backend/src/core/ReadingTheReader.core.Application`
- Contains: service installers in `Backend/src/core/ReadingTheReader.core.Application/ApplicationModuleInstaller.cs`, orchestration in `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Session/ExperimentSessionManager.cs`, calibration rules in `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Calibration/CalibrationService.cs`, and infrastructure interfaces in `Backend/src/core/ReadingTheReader.core.Application/InfrastructureContracts/*.cs`.
- Depends on: domain project reference in `Backend/src/core/ReadingTheReader.core.Application/ReadingTheReader.core.Application.csproj`.
- Used by: Web API endpoints and infrastructure implementations.
- Purpose: Keep core entity types separate from transport, filesystem, and Tobii SDK details.
- Location: `Backend/src/core/ReadingTheReader.core.Domain`
- Contains: `Backend/src/core/ReadingTheReader.core.Domain/GazeData.cs`, `Backend/src/core/ReadingTheReader.core.Domain/ExperimentSession.cs`, `Backend/src/core/ReadingTheReader.core.Domain/Participant.cs`, `Backend/src/core/ReadingTheReader.core.Domain/EyeTrackerDevice.cs`.
- Depends on: no internal project references.
- Used by: application services and snapshots.
- Purpose: Implement side effects required by the application layer.
- Location: `Backend/src/infrastructure`
- Contains: Tobii adapter in `Backend/src/infrastructure/ReadingTheReader.TobiiEyetracker/TobiiEyeTrackerAdapter.cs`, WebSocket broadcaster in `Backend/src/infrastructure/ReadingTheReader.RealtimeMessenger/WebSocketRealtimeMessenger.cs`, and file/in-memory persistence in `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/*.cs`.
- Depends on: `Backend/src/core/ReadingTheReader.core.Application`.
- Used by: `Program.cs` module installers and DI.
## Data Flow
- Cross-route setup state lives in Redux slices in `Frontend/src/redux/slices/experiment-slice.ts` and `Frontend/src/redux/slices/app-slice.ts`.
- REST caching and invalidation live in RTK Query slices in `Frontend/src/redux/api/*.ts`.
- High-frequency realtime state is kept out of Redux and instead flows through the singleton socket client in `Frontend/src/lib/gaze-socket.ts`, local component state, refs, and requestAnimationFrame loops such as `Frontend/src/modules/pages/gaze/lib/use-live-gaze-stream.ts`.
- Backend session truth is centralized in the singleton `ExperimentSessionManager`; file-backed checkpointing is handled by `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/ExperimentStateCheckpointWorker.cs`.
## Key Abstractions
- Purpose: Single backend-owned aggregate for session activity, setup completion, calibration state, latest gaze state, connected clients, and reading-session metadata.
- Examples: `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Session/ExperimentSessionSnapshot.cs`, `Frontend/src/lib/experiment-session.ts`.
- Pattern: Backend defines the canonical C# record; frontend mirrors the shape manually in TypeScript and updates it incrementally from WebSocket events.
- Purpose: Give transport code stable entrypoints without exposing infrastructure details.
- Examples: `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Sensing/IEyeTrackerService.cs`, `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Calibration/ICalibrationService.cs`, `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Participants/IParticipantService.cs`.
- Pattern: Endpoints depend on interfaces; implementations are registered in `Backend/src/core/ReadingTheReader.core.Application/ApplicationModuleInstaller.cs`.
- Purpose: Keep the application layer independent from hardware, broadcast transport, and persistence strategy.
- Examples: `Backend/src/core/ReadingTheReader.core.Application/InfrastructureContracts/IEyeTrackerAdapter.cs`, `Backend/src/core/ReadingTheReader.core.Application/InfrastructureContracts/IClientBroadcasterAdapter.cs`, `Backend/src/core/ReadingTheReader.core.Application/InfrastructureContracts/IExperimentStateStoreAdapter.cs`.
- Pattern: Application services code against interfaces; infrastructure projects bind concrete classes through installers such as `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/RealtimePersistenceModuleInstaller.cs`.
- Purpose: Give each user-facing flow a single composition root on the frontend.
- Examples: `Frontend/src/modules/pages/experiment/index.tsx`, `Frontend/src/modules/pages/calibration/index.tsx`, `Frontend/src/modules/pages/reading-material-setup/index.tsx`, `Frontend/src/modules/pages/replay/index.tsx`.
- Pattern: Route file imports one module page; module page imports feature-local components and shared hooks.
## Shared Contracts
- Reading session: `Backend/src/ReadingTheReader.WebApi/Contracts/ExperimentSession/UpsertReadingSessionRequest.cs` is consumed from `Frontend/src/redux/api/experiment-session-api.ts`.
- Participant save: `Backend/src/ReadingTheReader.WebApi/Contracts/Participants/SaveParticipantRequest.cs` is shaped by `Frontend/src/redux/api/participant-api.ts`.
- Reading-material setup: `Backend/src/ReadingTheReader.WebApi/Contracts/ReadingMaterialSetups/*.cs` is mirrored by `Frontend/src/redux/api/reading-material-api.ts`.
- Backend message names live in `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/Messaging/MessageTypes.cs`.
- Frontend envelope unions live in `Frontend/src/lib/gaze-socket.ts`.
- Session, calibration, and reading-session payloads are mirrored in `Frontend/src/lib/experiment-session.ts`, `Frontend/src/lib/calibration.ts`, and `Frontend/src/lib/reading-attention-summary.ts`.
- There is no generated shared package across `Frontend/` and `Backend/`. Contract alignment is manual, so changes to records such as `ExperimentSessionSnapshot`, `ReaderShellSettingsSnapshot`, or message type names must be updated on both sides.
## Entry Points
- Location: `Frontend/src/app/layout.tsx`
- Triggers: Next.js app startup.
- Responsibilities: load fonts, install `Providers`, and apply persisted palette/font attributes before hydration.
- Location: `Frontend/src/app/providers.tsx`
- Triggers: root layout render.
- Responsibilities: mount Redux, theme providers, error boundary/reporting, and global error UI.
- Location: `Backend/src/ReadingTheReader.WebApi/Program.cs`
- Triggers: ASP.NET Core startup.
- Responsibilities: install application and infrastructure modules, configure FastEndpoints and `/ws`, and start the HTTP server.
- Location: `Backend/src/ReadingTheReader.WebApi/Websockets/WebSocketConfiguration.cs`
- Triggers: client connects to `/ws`.
- Responsibilities: accept sockets, read text frames, and forward messages to `IExperimentSessionManager`.
## Error Handling
- FastEndpoints handlers such as `Backend/src/ReadingTheReader.WebApi/ExperimentSessionEndpoints/UpsertReadingSessionEndpoint.cs` and `Backend/src/ReadingTheReader.WebApi/CalibrationEndpoints/StartCalibrationEndpoint.cs` catch `InvalidOperationException` or `ArgumentException` and write `{ message }` responses.
- `Frontend/src/lib/gaze-socket.ts` reports parse failures and server-side `error` messages through `Frontend/src/redux/error-reporter.ts`.
- `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/ExperimentStateCheckpointWorker.cs` swallows non-cancellation exceptions so checkpoint failures do not stop the host.
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
