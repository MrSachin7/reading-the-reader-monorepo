# External Integrations

**Analysis Date:** 2026-03-26

## APIs & External Services

**Frontend-to-backend REST:**
- Reading The Reader Web API - all frontend HTTP calls go through RTK Query in `Frontend/src/redux/api/base-api.ts`.
  - SDK/Client: `@reduxjs/toolkit/query` from `Frontend/package.json`
  - Auth: none configured; requests use `NEXT_PUBLIC_API_BASE_URL` or default to `http://localhost:5190/api`
- REST route families are implemented in `Backend/src/ReadingTheReader.WebApi/EyeTrackerEndpoints/`, `Backend/src/ReadingTheReader.WebApi/ExperimentSessionEndpoints/`, `Backend/src/ReadingTheReader.WebApi/CalibrationEndpoints/`, `Backend/src/ReadingTheReader.WebApi/ReadingMaterialSetupEndpoints/`, `Backend/src/ReadingTheReader.WebApi/ReaderShellSettingsEndpoints/`, and `Backend/src/ReadingTheReader.WebApi/ParticipantEndpoints/`.

**Realtime session channel:**
- Native WebSocket endpoint at `/ws` - used for gaze samples, experiment state, viewport sync, focus sync, attention summaries, and intervention commands.
  - SDK/Client: browser `WebSocket` in `Frontend/src/lib/gaze-socket.ts`
  - Auth: none configured; URL comes from `NEXT_PUBLIC_WS_URL` or defaults to `ws://localhost:5190/ws` / `wss://localhost:7248/ws`
- Server-side WebSocket transport is implemented in `Backend/src/ReadingTheReader.WebApi/Websockets/WebSocketConfiguration.cs` and `Backend/src/infrastructure/ReadingTheReader.RealtimeMessenger/WebSocketRealtimeMessenger.cs`.
- Message names are centralized in `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/MessageTypes.cs`.

**Device SDK integration:**
- Tobii eye tracker hardware - discovery, license application, calibration, validation, and gaze streaming are handled by `Backend/src/infrastructure/ReadingTheReader.TobiiEyetracker/TobiiEyeTrackerAdapter.cs`.
  - SDK/Client: `Tobii.Research.x64` on Windows from `Backend/src/infrastructure/ReadingTheReader.TobiiEyetracker/ReadingTheReader.TobiiEyetracker.csproj`
  - Auth: per-device license bytes uploaded through `Backend/src/ReadingTheReader.WebApi/EyeTrackerEndpoints/SelectEyeTrackerEndpoint.cs`
- Non-Windows builds fall back to the mock implementation inside `Backend/src/infrastructure/ReadingTheReader.TobiiEyetracker/TobiiEyeTrackerAdapter.cs`.

## Data Storage

**Databases:**
- Not detected. No `DbContext`, SQL client, ORM, or external database package is present under `Backend/src/` or `Frontend/src/`.
  - Connection: Not applicable
  - Client: Not applicable

**File Storage:**
- Backend persists state to the local filesystem when `RealtimePersistence.Provider` is `"File"` in `Backend/src/ReadingTheReader.WebApi/appsettings.json`.
- Snapshot and replay export paths are configured by `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/ExperimentPersistenceOptions.cs`.
- Reading material setup storage is configured by `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/ReadingMaterialSetupStorageOptions.cs` and implemented in `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/FileReadingMaterialSetupStoreAdapter.cs`.
- Named replay exports are stored under the configured directory by `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/FileExperimentReplayExportStoreAdapter.cs`.
- Reader shell settings are persisted to `data/reader-shell-settings.json` by `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ReaderShellSettingsService.cs`.
- The frontend also supports local replay-file import and validation in `Frontend/src/lib/experiment-replay.ts`; this path does not require a server roundtrip.

**Caching:**
- None detected beyond in-memory singleton state in `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs` and RTK Query client caching in `Frontend/src/redux/api/`.

## Authentication & Identity

**Auth Provider:**
- Custom/no-op application auth only.
  - Implementation: `Backend/src/ReadingTheReader.WebApi/Program.cs` calls `AddAuthentication()` and `AddAuthorization()`, but no scheme or provider is configured, and all inspected endpoints explicitly call `AllowAnonymous()`.

## Monitoring & Observability

**Error Tracking:**
- None detected for external services such as Sentry, Application Insights, or Datadog.

**Logs:**
- Backend uses console logging and request tracing in `Backend/src/ReadingTheReader.WebApi/Program.cs`, `Backend/src/ReadingTheReader.WebApi/Websockets/WebSocketConfiguration.cs`, and `Backend/src/infrastructure/ReadingTheReader.TobiiEyetracker/TobiiEyeTrackerAdapter.cs`.
- Frontend logs REST and WebSocket traffic in `Frontend/src/redux/api/base-api.ts` and `Frontend/src/lib/gaze-socket.ts`, and surfaces runtime errors through `Frontend/src/components/error/` plus `Frontend/src/redux/error-reporter.ts`.

## CI/CD & Deployment

**Hosting:**
- Backend is prepared for container deployment via `Backend/src/ReadingTheReader.WebApi/Dockerfile` using `mcr.microsoft.com/dotnet/aspnet:10.0`.
- Frontend hosting is not pinned; the repo provides Bun build commands in `Frontend/package.json` and `Frontend/README.md`.

**CI Pipeline:**
- GitHub Actions frontend pipeline in `.github/workflows/frontend-ci.yml` installs with Bun, builds, and conditionally runs tests.
- GitHub Actions backend pipeline in `.github/workflows/backend-ci.yml` restores, builds, and tests `Backend/reading-the-reader-backend.sln` on `windows-latest`.

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_API_BASE_URL` - optional frontend REST base URL override in `Frontend/src/redux/api/base-api.ts`
- `NEXT_PUBLIC_WS_URL` - optional frontend WebSocket URL override in `Frontend/src/lib/gaze-socket.ts`
- `ASPNETCORE_ENVIRONMENT` - backend environment selection in `Backend/src/ReadingTheReader.WebApi/Properties/launchSettings.json`
- `RealtimePersistence` and `ReadingMaterialSetupStorage` config sections in `Backend/src/ReadingTheReader.WebApi/appsettings.json` control backend storage mode and local paths

**Secrets location:**
- No tracked secrets location is defined in the repository.
- No tracked `.env` files were detected.
- Eye tracker license bytes are accepted over multipart upload in `Backend/src/ReadingTheReader.WebApi/EyeTrackerEndpoints/SelectEyeTrackerEndpoint.cs` and persisted by `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/FileEyeTrackerLicenseStoreAdapter.cs`.

## Webhooks & Callbacks

**Incoming:**
- None detected. The only long-lived inbound callback-style transport is the WebSocket endpoint in `Backend/src/ReadingTheReader.WebApi/Websockets/WebSocketConfiguration.cs`.

**Outgoing:**
- None detected to third-party services.
- Backend-originated outbound messages are limited to broadcasting to connected browser clients through `Backend/src/infrastructure/ReadingTheReader.RealtimeMessenger/WebSocketRealtimeMessenger.cs`.

## Network Boundaries

- Browser clients call REST endpoints under `/api/*` using `Frontend/src/redux/api/*.ts`.
- Browser clients connect to `/ws` for realtime state using `Frontend/src/lib/gaze-socket.ts`.
- Backend CORS is intentionally restricted to `localhost` and `127.0.0.1` origins in `Backend/src/ReadingTheReader.WebApi/Program.cs`.
- The hardware boundary sits behind the backend: browsers never call the Tobii SDK directly; only `Backend/src/infrastructure/ReadingTheReader.TobiiEyetracker/TobiiEyeTrackerAdapter.cs` talks to the device.

---

*Integration audit: 2026-03-26*
