# Coding Conventions

**Analysis Date:** 2026-03-26

## Naming Patterns

**Files:**
- Frontend route files under `Frontend/src/app/**/page.tsx` use Next.js defaults and stay thin. `Frontend/src/app/(with-sidebar)/experiment/page.tsx` and `Frontend/src/app/(without-sidebar)/reading/page.tsx` only hand off to module entry points.
- Frontend feature entry files under `Frontend/src/modules/pages/**/index.tsx` use PascalCase page component names with a default export, for example `Frontend/src/modules/pages/experiment/index.tsx` exports `ExperimentPage`.
- Frontend feature component files use PascalCase names such as `Frontend/src/modules/pages/settings/sections/CalibrationSettingsSection.tsx` and `Frontend/src/modules/pages/reading/components/ReaderShell.tsx`.
- Frontend shared UI, hook, lib, slice, and API filenames are lowercase kebab-case, for example `Frontend/src/components/ui/button.tsx`, `Frontend/src/hooks/use-font-theme.tsx`, `Frontend/src/lib/error-utils.ts`, `Frontend/src/redux/slices/experiment-slice.ts`, and `Frontend/src/redux/api/participant-api.ts`.
- Backend C# files use PascalCase and usually match the public type name, for example `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/ReadingMaterialSetups/ReadingMaterialSetupService.cs` and `Backend/src/ReadingTheReader.WebApi/CalibrationEndpoints/StartCalibrationEndpoint.cs`.

**Functions:**
- Frontend functions use camelCase. Hooks are prefixed with `use`, for example `useFontTheme` in `Frontend/src/hooks/use-font-theme.tsx` and `useReadingSettings` in `Frontend/src/modules/pages/reading/lib/useReadingSettings.ts`.
- Redux action creators are verb-based camelCase names such as `setStepTwoAge` and `hydrateExperimentFromSession` in `Frontend/src/redux/slices/experiment-slice.ts`.
- Backend async methods almost always use verb-based `*Async` names and accept `CancellationToken ct = default`, for example `SaveAsync`, `UpdateAsync`, and `StartCalibrationAsync` in `Backend/src/core/ReadingTheReader.core.Application/**`.

**Variables:**
- Frontend local state and helpers use camelCase, while compile-time constants are uppercase snake case, for example `PRESET_DESCRIPTIONS` in `Frontend/src/modules/pages/settings/sections/CalibrationSettingsSection.tsx` and `FONT_STORAGE_KEY` in `Frontend/src/hooks/use-font-theme.tsx`.
- Backend private fields use `_camelCase`, for example `_readingMaterialSetupStoreAdapter` in `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/ReadingMaterialSetups/ReadingMaterialSetupService.cs`.

**Types:**
- Frontend TypeScript types use PascalCase with descriptive suffixes such as `ExperimentStepNavigationProps`, `AppErrorRecord`, `SaveParticipantPayload`, and `RootState` in `Frontend/src/modules/pages/experiment/components/experiment-stepper.tsx`, `Frontend/src/lib/error-utils.ts`, and `Frontend/src/redux/store.ts`.
- Backend interfaces use `I` prefixes, such as `IReadingMaterialSetupService`, `IExperimentSessionManager`, and `IEyeTrackerAdapter` under `Backend/src/core/ReadingTheReader.core.Application`.

## Code Style

**Formatting:**
- Frontend relies on TypeScript strict mode in `Frontend/tsconfig.json` and ESLint in `Frontend/eslint.config.mjs`. No Prettier, Biome, or `.editorconfig` file is detected at repo root or in `Frontend/`.
- Frontend formatting is locally consistent but globally mixed. Hand-authored files like `Frontend/src/redux/store.ts` are mostly semicolon-free, while route wrappers and some generated or registry-derived files such as `Frontend/src/app/providers.tsx`, `Frontend/src/modules/pages/experiment/index.tsx`, and `Frontend/src/hooks/use-font-theme.tsx` use semicolons. Match the surrounding file instead of reformatting unrelated code.
- Backend formatting follows standard modern C# conventions: file-scoped namespaces, braces on new lines, nullable enabled, and implicit usings enabled in `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj`.

**Linting:**
- Frontend linting comes from `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript` in `Frontend/eslint.config.mjs`.
- The discoverable frontend lint command is `lint: eslint` in `Frontend/package.json`.
- No standalone backend analyzer configuration file is detected. Backend quality enforcement is currently driven by compiler settings and CI build/test execution in `.github/workflows/backend-ci.yml`.

## Import Organization

**Order:**
1. External packages first, for example React, Next, Redux Toolkit, `zod`, or `FastEndpoints`.
2. Blank line.
3. Internal aliased imports from `@/` in frontend files, for example `Frontend/src/modules/pages/experiment/components/experiment-stepper.tsx`.
4. Relative imports last when staying within the same feature folder, for example `./eyetracker-setup` and `./calibration-step` in `Frontend/src/modules/pages/experiment/components/experiment-stepper.tsx`.

**Path Aliases:**
- Frontend uses the `@/*` alias from `Frontend/tsconfig.json`.
- The `Frontend/components.json` registry aliases point `components`, `ui`, `lib`, and `hooks` back into `Frontend/src/**`.

## Error Handling

**Patterns:**
- Frontend normalizes errors through `Frontend/src/lib/error-utils.ts`. Use `getErrorMessage`, `getErrorStatus`, `normalizeAppError`, or `normalizeApiError` instead of surfacing raw unknown errors.
- RTK Query failures are intercepted centrally in `Frontend/src/redux/middleware/error-middleware.ts`, then pushed into app state through `pushError` in `Frontend/src/redux/slices/app-slice.ts`.
- Global runtime failures are captured in `Frontend/src/app/providers.tsx`, `Frontend/src/components/error/app-error-boundary.tsx`, `Frontend/src/components/error/error-runtime-monitor.tsx`, and `Frontend/src/redux/error-reporter.ts`.
- Feature components catch async UI errors locally and reduce them to user-facing strings, for example `Frontend/src/modules/pages/settings/sections/CalibrationSettingsSection.tsx` and `Frontend/src/modules/pages/experiment/components/eyetracker-setup.tsx`.
- Backend application services throw domain or argument exceptions and do not write HTTP responses directly. Examples include `ReadingMaterialSetupValidationException` from `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/ReadingMaterialSetups/ReadingMaterialSetupValidationException.cs` and `InvalidOperationException` throws in `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/CalibrationService.cs`.
- Backend endpoint classes translate service exceptions into HTTP responses close to the transport boundary, as shown in `Backend/src/ReadingTheReader.WebApi/ReadingMaterialSetupEndpoints/CreateReadingMaterialSetupEndpoint.cs` and `Backend/src/ReadingTheReader.WebApi/CalibrationEndpoints/StartCalibrationEndpoint.cs`.
- Realtime transport layers intentionally swallow disconnected-socket failures after cancellation checks in `Backend/src/infrastructure/ReadingTheReader.RealtimeMessenger/WebSocketRealtimeMessenger.cs` and `Backend/src/ReadingTheReader.WebApi/Websockets/WebSocketConfiguration.cs`.

## Logging

**Framework:** `console` / `Console.WriteLine`

**Patterns:**
- Frontend logging is concentrated in transport and debugging utilities, not general UI rendering. See `Frontend/src/redux/api/base-api.ts` for REST request/response logs and `Frontend/src/lib/gaze-socket.ts` for WebSocket logs and parse failures.
- Backend logging uses `Console.WriteLine` directly in `Backend/src/ReadingTheReader.WebApi/Program.cs`, `Backend/src/ReadingTheReader.WebApi/Websockets/WebSocketConfiguration.cs`, `Backend/src/infrastructure/ReadingTheReader.TobiiEyetracker/TobiiEyeTrackerAdapter.cs`, and `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs`.
- No `ILogger` usage is detected. Follow the existing lightweight console logging style unless a broader logging refactor is introduced.

## Comments

**When to Comment:**
- Comments are sparse and usually reserved for boundary notes or intentional ignores, for example `// Modules installation` in `Backend/src/ReadingTheReader.WebApi/Program.cs` and `// Ignore disconnected sockets and send failures.` in `Backend/src/infrastructure/ReadingTheReader.RealtimeMessenger/WebSocketRealtimeMessenger.cs`.
- Most business rules are expressed through type names, guard clauses, and helper names rather than explanatory comments. Prefer that style over verbose inline commentary.

**JSDoc/TSDoc:**
- Not used in normal frontend code.
- XML documentation appears only occasionally in backend infrastructure, for example the summaries in `Backend/src/ReadingTheReader.WebApi/Websockets/WebSocketConfiguration.cs`.

## Function Design

**Size:** 
- Frontend page containers can be large and orchestration-heavy, for example `Frontend/src/modules/pages/experiment/components/experiment-stepper.tsx` and `Frontend/src/modules/pages/calibration/index.tsx`. Split shared UI into child components and move reusable side effects into hooks or `lib/` helpers.
- Backend services keep public methods focused on one action and push repeated validation or persistence details into private helpers, for example `Validate` in `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/ReadingMaterialSetups/ReadingMaterialSetupService.cs`.

**Parameters:** 
- Frontend mutations and queries usually accept typed payload objects, for example `SaveParticipantPayload` in `Frontend/src/redux/api/participant-api.ts`.
- Backend methods accept strongly typed command objects or primitives plus `CancellationToken`, for example `SaveReadingMaterialSetupCommand` and `UpdateReadingMaterialSetupCommand` in `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/ReadingMaterialSetups/**`.

**Return Values:** 
- Frontend RTK Query calls usually use `.unwrap()` and then update local UI state from the typed payload, as seen in `Frontend/src/modules/pages/settings/sections/CalibrationSettingsSection.tsx` and `Frontend/src/modules/pages/experiment/components/experiment-stepper.tsx`.
- Backend uses `Task` or `ValueTask` return types consistently. Queries often return nullable domain values from adapters and non-null validated values from services, for example `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/InMemoryReadingMaterialSetupStoreAdapter.cs` versus `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/ReadingMaterialSetups/ReadingMaterialSetupService.cs`.

## Module Design

**Exports:** 
- Frontend route files default-export the page component expected by Next.js. Module entry points also default-export page components, while hooks and helpers use named exports.
- Redux slices default-export reducers and separately export named actions, as shown in `Frontend/src/redux/slices/experiment-slice.ts`.
- RTK Query modules export both the API slice object and generated hooks, for example `Frontend/src/redux/api/participant-api.ts`.
- Backend keeps one primary public type per file and registers implementations through installer modules such as `Backend/src/core/ReadingTheReader.core.Application/ApplicationModuleInstaller.cs`.

**Barrel Files:** 
- Frontend uses barrel files for high-traffic boundaries. `Frontend/src/redux/index.ts` re-exports store types, hooks, API hooks, and slice actions.
- Avoid putting business logic in barrels. Barrels in the current codebase are export surfaces only.

## Patterns To Follow And Avoid

- Put frontend routing in `Frontend/src/app/**` and actual UI/state logic in `Frontend/src/modules/**`; `Frontend/AGENTS.md` states that `src/app` is routing only.
- Use `baseApi.injectEndpoints` for REST calls instead of ad hoc `fetch` usage when the call belongs in shared app state, following `Frontend/src/redux/api/participant-api.ts`.
- Normalize unknown frontend errors before display or storage; do not dispatch raw thrown values when `Frontend/src/lib/error-utils.ts` already handles message, status, and detail extraction.
- Keep backend HTTP concerns in `Backend/src/ReadingTheReader.WebApi/**` and keep validation/business rules in `Backend/src/core/**`.
- Match the style of the file you are touching. The frontend is not uniformly auto-formatted today.

---

*Convention analysis: 2026-03-26*
