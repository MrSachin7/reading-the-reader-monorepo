# Technology Stack

**Analysis Date:** 2026-03-26

## Repository Shape

- Monorepo with two independent application roots: `Frontend/` for the UI and `Backend/` for the .NET solution.
- Root-level coordination lives in `README.md`, `.github/workflows/frontend-ci.yml`, `.github/workflows/backend-ci.yml`, and shared docs under `docs/`.
- No root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `nx.json`, `global.json`, or `Directory.Packages.props` was detected; dependency management is per subproject.

## Languages

**Primary:**
- TypeScript 5.x - frontend application code in `Frontend/src/app/`, `Frontend/src/modules/`, `Frontend/src/redux/`, and `Frontend/src/lib/`.
- C# targeting .NET 10 - backend API, core, infrastructure, and tests in `Backend/src/` and `Backend/tests/`.

**Secondary:**
- CSS - global styling in `Frontend/src/app/globals.css`.
- Markdown - reading content and project docs in `Frontend/src/modules/pages/reading/content/mock-reading.md` and `docs/frontend/`.
- YAML - CI pipelines in `.github/workflows/frontend-ci.yml` and `.github/workflows/backend-ci.yml`.

## Runtime

**Environment:**
- Frontend runtime is Next.js on React 19 from `Frontend/package.json`; dev entrypoint is `Frontend/src/app/layout.tsx`.
- Backend runtime is ASP.NET Core 10 from `Backend/src/ReadingTheReader.WebApi/ReadingTheReader.WebApi.csproj`; HTTP entrypoint is `Backend/src/ReadingTheReader.WebApi/Program.cs`.
- Observed local tools in this workspace: Bun `1.3.10`, Node `v24.14.0`, and .NET SDK `10.0.103`.

**Package Manager:**
- Frontend uses Bun with lockfile `Frontend/bun.lock`.
- Backend uses NuGet through SDK-style `.csproj` files and `dotnet restore` against `Backend/reading-the-reader-backend.sln`.
- Lockfile: present for frontend (`Frontend/bun.lock`), not detected for NuGet (`packages.lock.json` missing).

## Frameworks

**Core:**
- Next.js `16.1.6` - React App Router frontend from `Frontend/package.json` with routes under `Frontend/src/app/`.
- React `19.2.3` - UI runtime used throughout `Frontend/src/app/providers.tsx` and `Frontend/src/modules/pages/**`.
- ASP.NET Core Web API on `Microsoft.NET.Sdk.Web` / `net10.0` - backend host in `Backend/src/ReadingTheReader.WebApi/ReadingTheReader.WebApi.csproj`.
- FastEndpoints `8.0.1` - REST endpoint framework used in `Backend/src/ReadingTheReader.WebApi/*Endpoints/*.cs`.

**Testing:**
- xUnit `2.9.3` with `Microsoft.NET.Test.Sdk` `17.14.1` - backend tests in `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/`.
- No frontend test framework is configured in `Frontend/package.json`; `.github/workflows/frontend-ci.yml` only runs tests if a `test` script exists.

**Build/Dev:**
- Tailwind CSS `^4` with PostCSS via `Frontend/postcss.config.mjs` and `Frontend/src/app/globals.css`.
- ESLint `^9` with Next presets in `Frontend/eslint.config.mjs`.
- React Compiler enabled in `Frontend/next.config.ts` with `babel-plugin-react-compiler` in `Frontend/package.json`.
- Swagger/OpenAPI via `FastEndpoints.Swagger` and `Microsoft.AspNetCore.OpenApi` in `Backend/src/ReadingTheReader.WebApi/ReadingTheReader.WebApi.csproj`.
- Docker multi-stage publish image for the backend in `Backend/src/ReadingTheReader.WebApi/Dockerfile`.

## Key Dependencies

**Critical:**
- `@reduxjs/toolkit` `^2.11.2` and `react-redux` `^9.2.0` - app state and RTK Query API clients in `Frontend/src/redux/store.ts` and `Frontend/src/redux/api/base-api.ts`.
- `zod` `^4.3.6` - schema validation for replay imports in `Frontend/src/lib/experiment-replay.ts`.
- `next-themes` `^0.4.6` - theme switching wrapper in `Frontend/src/app/providers.tsx`.
- `FastEndpoints` `8.0.1` - request handling for routes like `Backend/src/ReadingTheReader.WebApi/ExperimentSessionEndpoints/GetExperimentSessionEndpoint.cs`.
- `CsvHelper` `33.1.0` - replay export CSV serialization in `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/ExperimentReplayExportSerializer.cs`.
- `Tobii.Research.x64` `1.11.0.1334` - Windows-only eye tracker SDK in `Backend/src/infrastructure/ReadingTheReader.TobiiEyetracker/ReadingTheReader.TobiiEyetracker.csproj`.

**Infrastructure:**
- shadcn registry config in `Frontend/components.json` and UI primitives in `Frontend/src/components/ui/`.
- `@base-ui/react`, `radix-ui`, `sonner`, `lucide-react`, `react-hook-form`, and `recharts` - UI/form/chart tooling from `Frontend/package.json`, used across `Frontend/src/components/` and `Frontend/src/modules/pages/`.
- `Microsoft.Extensions.Options.ConfigurationExtensions` and `Microsoft.Extensions.Configuration.Binder` - configuration binding in `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/RealtimePersistenceModuleInstaller.cs`.

## Configuration

**Environment:**
- Frontend reads `NEXT_PUBLIC_API_BASE_URL` in `Frontend/src/redux/api/base-api.ts` and `NEXT_PUBLIC_WS_URL` in `Frontend/src/lib/gaze-socket.ts`.
- Backend environment selection uses `ASPNETCORE_ENVIRONMENT` in `Backend/src/ReadingTheReader.WebApi/Properties/launchSettings.json`.
- No tracked `.env`, `.env.*`, or root secret-management files were detected.

**Build:**
- Frontend config files: `Frontend/package.json`, `Frontend/tsconfig.json`, `Frontend/next.config.ts`, `Frontend/postcss.config.mjs`, `Frontend/eslint.config.mjs`, and `Frontend/components.json`.
- Backend config files: `Backend/reading-the-reader-backend.sln`, `Backend/src/ReadingTheReader.WebApi/appsettings.json`, `Backend/src/ReadingTheReader.WebApi/appsettings.Development.json`, `Backend/src/ReadingTheReader.WebApi/Properties/launchSettings.json`, and `Backend/src/ReadingTheReader.WebApi/Dockerfile`.
- CI config files: `.github/workflows/frontend-ci.yml` and `.github/workflows/backend-ci.yml`.

## Platform Requirements

**Development:**
- Frontend development expects Bun and a browser; commands are documented in `Frontend/README.md`.
- Backend development expects .NET 10 and, for real hardware integration, Windows with the Tobii SDK package path in `Backend/src/infrastructure/ReadingTheReader.TobiiEyetracker/ReadingTheReader.TobiiEyetracker.csproj`.
- Local default ports are `http://localhost:3000` for the frontend from `Frontend/README.md` and `http://localhost:5190` / `https://localhost:7248` for the backend from `Backend/src/ReadingTheReader.WebApi/Properties/launchSettings.json`.

**Production:**
- Backend has an explicit Linux container target via `Backend/src/ReadingTheReader.WebApi/Dockerfile`.
- Frontend production hosting is not pinned in repo config; the build artifact is standard Next.js output from `Frontend/package.json`.

---

*Stack analysis: 2026-03-26*
