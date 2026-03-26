# Technology Stack

**Project:** Reading the Reader
**Researched:** 2026-03-26

## Recommended Stack

This project should stay a **browser frontend plus .NET control backend** system, not collapse into a single full-stack runtime and not turn into a heavier distributed platform than the thesis needs. The defensible argument is simple: the browser is best for participant and researcher UX, while the hardware-facing eye-tracker and experiment orchestration logic belong in a long-running backend process with explicit boundaries.

The stack should optimize for five things:

1. Real Tobii-backed experiment control on the researcher machine.
2. Low-latency realtime mirroring and intervention commands.
3. Strong boundaries between sensing, decision logic, intervention execution, and UI.
4. Replay/export durability for thesis evaluation.
5. Low migration cost from the current brownfield codebase.

### Core Frameworks

| Layer | Recommended Technology | Version | Purpose | Why |
|------|-------------------------|---------|---------|-----|
| Frontend app | Next.js App Router | 16.x LTS | Researcher and participant web UI | Next 16 is the current Active LTS line and fits the existing route- and module-based UI well. App Router is a stable, defensible choice for a browser-first research UI without inventing custom routing or SSR plumbing. |
| UI runtime | React | 19.x | Interactive reader, live mirror, experiment controls | React 19 is stable and improves async UI flows. It is a good fit for dense stateful interfaces like calibration, reading, replay, and researcher control surfaces. |
| Frontend language | TypeScript | 5.x | Typed domain models and UI logic | Strong typing matters here because replay, intervention, calibration, and realtime envelopes are all easy places for thesis-undermining drift. |
| Backend runtime | .NET / ASP.NET Core | 10 LTS | Hardware integration, experiment orchestration, REST, realtime | .NET 10 is the current LTS line. It is well suited to long-running services, explicit DI, hosted workers, and a hardware-adjacent application layer. |
| API transport shell | FastEndpoints on ASP.NET Core | 8.x | Thin REST endpoint layer | Keep this only as a transport convenience. It is fine for concise endpoint code, but it should stay outside the thesis-critical architecture. The thesis should defend the application/infrastructure boundaries, not FastEndpoints itself. |

### Realtime and Experiment Runtime

| Concern | Recommended Technology | Version | Purpose | Why |
|---------|------------------------|---------|---------|-----|
| High-frequency session channel | Raw WebSockets with typed envelopes | Platform-native | Gaze streaming, live mirror updates, intervention commands | For this project, a single explicit protocol is defensible because the message set is bounded and domain-specific. Raw WebSockets avoid extra hub abstraction in the most latency-sensitive path. |
| Session orchestration | Singleton application services plus hosted background worker | .NET 10 | Experiment lifecycle, checkpointing, export persistence | Research sessions are operator-controlled, stateful, and sequential. A process-local runtime with checkpointing is simpler and easier to defend than introducing a broker or distributed event bus. |
| REST control plane | HTTP JSON endpoints plus OpenAPI | ASP.NET Core 10 | Setup flows, reading material, calibration settings, export listing/download | REST is the right split for coarse control flows; WebSockets should stay for live state, not replace the whole API. |

### Persistence, Export, and Content

| Concern | Recommended Technology | Version | Purpose | Why |
|---------|------------------------|---------|---------|-----|
| Canonical experiment storage | File-backed adapters with explicit DTOs | Current approach | Durable snapshots and replay exports for thesis runs | For a researcher-operated thesis system, local file persistence is a defensible default. It matches the operator model, keeps deployment simple, and supports immediate export/replay without adding database operations work that does not strengthen the thesis. |
| Exchange/export format | JSON as canonical, CSV as analyst-friendly derivative | Versioned payloads | Replay, later analysis, manual inspection | JSON preserves structure; CSV lowers friction for non-developer analysis. Keep both, but treat JSON as source of truth. |
| Reading content format | Constrained Markdown pipeline | Project-specific | Study texts with stable token/block mapping | Because the thesis explicitly excludes PDF and needs token-level gaze mapping, a limited Markdown subset is more defensible than a full HTML-capable Markdown renderer. |
| Boundary validation | Zod on the frontend and typed C# contracts in backend | Current approach plus extension | Replay/import validation and API safety | Realtime and export payloads must fail loudly when contracts drift. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Redux Toolkit / RTK Query | 2.x | REST data fetching and cache invalidation | Keep for server state and setup flows; do not force all live reading state into Redux. |
| Zod | 4.x | Replay/import and boundary validation | Use at file-import and untrusted input boundaries. |
| Tailwind CSS | 4.x | Fast UI iteration for researcher tools and reading UI | Good fit for the existing frontend, but keep presentation tokens centralized. |
| xUnit | 2.9.x | Backend unit and persistence tests | Use for export serialization, store adapters, and application service behavior. |
| CsvHelper | 33.x | CSV export serialization | Keep only for export/import boundary work, not as a general data model. |

## Brownfield Fit: Where The Current Repo Already Aligns

The current repository is already close to the right stack for the thesis:

- The frontend already uses `Next.js 16`, `React 19`, `TypeScript 5`, `Tailwind 4`, `Redux Toolkit`, and `Zod` in `Frontend/package.json`.
- The route shell is thin and the page logic is mostly kept in modules, which is the right direction for a browser UI with distinct researcher and participant surfaces, for example `Frontend/src/app/(without-sidebar)/reading/page.tsx` and `Frontend/src/app/(without-sidebar)/researcher/current-live/page.tsx`.
- The backend already separates transport, application, and infrastructure concerns through project boundaries in `Backend/src/ReadingTheReader.WebApi/ReadingTheReader.WebApi.csproj`, `Backend/src/core/ReadingTheReader.core.Application/ReadingTheReader.core.Application.csproj`, and the infrastructure projects under `Backend/src/infrastructure/`.
- The hardware boundary is already explicit through `IEyeTrackerAdapter` in `Backend/src/core/ReadingTheReader.core.Application/InfrastructureContracts/IEyeTrackerAdapter.cs` and the Tobii implementation in `Backend/src/infrastructure/ReadingTheReader.TobiiEyetracker/TobiiEyeTrackerAdapter.cs`.
- The realtime boundary is already explicit and domain-shaped rather than framework-shaped in `Backend/src/ReadingTheReader.WebApi/Websockets/WebSocketConfiguration.cs`, `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/MessageTypes.cs`, and `Frontend/src/lib/gaze-socket.ts`.
- Export/replay support is already structurally strong: backend export metadata is versioned in `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentReplayExport.cs` and produced in `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs`; the frontend validates replay imports with Zod in `Frontend/src/lib/experiment-replay.ts`.
- The Markdown-only thesis scope is already reflected in the custom constrained parser and renderer in `Frontend/src/modules/pages/reading/lib/minimalMarkdown.ts` and `Frontend/src/modules/pages/reading/components/MarkdownReader.tsx`.
- File and in-memory persistence are already hidden behind interfaces such as `IExperimentStateStoreAdapter`, `IExperimentReplayExportStoreAdapter`, and `IReadingMaterialSetupStoreAdapter`, with implementations wired in `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/RealtimePersistenceModuleInstaller.cs`.

## Recommended Decisions For This Thesis

### 1. Keep the browser/frontend/backend split

Do not move Tobii or experiment orchestration concerns into the browser. The browser should remain the interaction shell. The backend should remain the source of truth for experiment session state, hardware state, calibration state, export generation, and intervention application.

This is already the repo’s strongest stack decision and should be defended, not replaced.

### 2. Keep raw WebSockets for the bounded realtime protocol

The current protocol is a good fit for this thesis because it carries a small, explicit message vocabulary tied directly to the experiment domain. SignalR would become more attractive only if the project needed richer connection groups, cross-node fanout, more complex auth, or multiple heterogeneous clients beyond the current researcher/participant pairing.

For this thesis, the stronger argument is:

- REST for setup and durable control actions.
- WebSockets for live gaze, mirroring, viewport/focus updates, and intervention events.
- Replay/export as the durable analysis boundary.

### 3. Keep file-backed persistence as the experiment default

Do not introduce PostgreSQL or a broader cloud data platform unless the roadmap explicitly adds multi-researcher concurrency, remote collaboration, or long-term study administration features. For the current thesis, file-backed storage plus durable exports is simpler, more transparent, and easier to defend.

The repo already has the right abstraction seam for future change. What matters is using the file provider for real experiment runs rather than relying on the development-time in-memory default in `Backend/src/ReadingTheReader.WebApi/appsettings.json`.

### 4. Keep Markdown constrained and study-oriented

A constrained Markdown dialect is the right stack choice because the system needs predictable block/token mapping for gaze and intervention logic. Avoid expanding the parser piecemeal into half of CommonMark. If future work truly needs richer authoring, introduce a real Markdown AST pipeline deliberately rather than gradually accreting parser edge cases.

### 5. Treat extension seams as first-class stack choices

For the thesis, the most important “stack” choice is not a library name. It is the use of explicit interfaces and DTOs at the hardware, persistence, broadcaster, and replay/export seams. The current interfaces in `Backend/src/core/ReadingTheReader.core.Application/InfrastructureContracts/` are exactly the kind of stack decision the thesis can defend because they make future intervention engines, alternative trackers, or alternate storage backends plausible without rewriting the core runtime.

## Cautions

### Current repo cautions that matter

| Area | Current Repo State | Why To Be Careful |
|------|--------------------|-------------------|
| Tobii runtime host OS | `Backend/src/infrastructure/ReadingTheReader.TobiiEyetracker/ReadingTheReader.TobiiEyetracker.csproj` only includes `Tobii.Research.x64` on Windows, while `Backend/src/ReadingTheReader.WebApi/ReadingTheReader.WebApi.csproj` still declares `DockerDefaultTargetOS` as `Linux`. | Real eye-tracker-backed runs are effectively Windows-hosted today. That is acceptable, but it must be documented explicitly so the thesis does not imply hardware-capable Linux deployment. |
| Default persistence mode | `Backend/src/ReadingTheReader.WebApi/appsettings.json` defaults `RealtimePersistence.Provider` to `InMemory`. | Fine for development, not fine for experiment durability. Real study sessions should run with file-backed persistence enabled. |
| Preview package usage | `Backend/src/core/ReadingTheReader.core.Application/ReadingTheReader.core.Application.csproj` and `Backend/src/infrastructure/ReadingTheReader.TobiiEyetracker/ReadingTheReader.TobiiEyetracker.csproj` reference `Microsoft.Extensions.DependencyInjection.Abstractions` `11.0.0-preview.1...`. | This weakens the “stable thesis platform” story unnecessarily. Prefer stable package alignment with the .NET 10 runtime unless there is a proven requirement for the preview build. |
| Realtime contract duplication | The WebSocket envelope shape is manually mirrored between `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/MessageTypes.cs` and `Frontend/src/lib/gaze-socket.ts`. | This is acceptable for now, but the message contract should be documented and versioned to reduce silent drift. |
| Markdown parser scope | `Frontend/src/modules/pages/reading/lib/minimalMarkdown.ts` is intentionally narrow. | That is good for the thesis, but only if the team keeps it intentionally narrow. Scope creep here can create subtle rendering/tokenization mismatches. |

### What not to add unless requirements change

| Category | Do Not Add Yet | Why Not |
|----------|----------------|---------|
| Database | PostgreSQL, Prisma, EF-heavy schema work | Adds operational and migration work without improving the current thesis argument. |
| Realtime middleware | Kafka, RabbitMQ, Redis pub/sub | Overbuilt for a single operator-controlled experiment runtime. |
| Rich content engine | PDF stack, generic WYSIWYG, arbitrary HTML Markdown rendering | Conflicts with the Markdown-only study scope and complicates gaze/token mapping. |
| Full microservice split | Separate services for calibration, gaze, export, interventions | Harder to defend within thesis scope; hurts iteration and verification. |
| Generic AI platform glue | Vector DBs, model orchestration frameworks | Out of scope. The thesis must support external decision providers architecturally, not embed AI infrastructure. |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Frontend framework | Next.js App Router | Plain React + Vite | Vite would work technically, but the repo already uses Next well and there is no thesis value in replacing it. |
| Realtime | Raw WebSockets | SignalR | SignalR is strong when you need hub features, groups, and broader connection management. The current bounded protocol does not clearly justify the added abstraction yet. |
| Persistence | File-backed adapters | Relational database | Database-backed persistence is future-valid, but premature for a local researcher-operated thesis deployment. |
| Markdown pipeline | Constrained internal parser | Full CommonMark/HTML renderer | The study needs predictable token mapping more than authoring breadth. |
| Hardware integration host | .NET backend on researcher machine | Browser-only integration | Browsers are the wrong place for Tobii SDK integration and experiment authority. |

## Thesis-Defensible Stack Position

If the thesis needs one short stack statement, it should be this:

> Reading the Reader uses a typed Next.js/React frontend for participant and researcher interfaces, a layered .NET backend as the hardware and experiment authority, raw WebSockets for bounded low-latency session updates, and file-backed/versioned replay exports as the primary experiment durability mechanism.

That is a defensible brownfield direction because it matches the actual implementation, supports the real Tobii constraint, preserves clear extension boundaries, and avoids introducing infrastructure that the thesis cannot justify or validate.

## Sources

- HIGH: Next.js Support Policy, https://nextjs.org/support-policy
- HIGH: Next.js 16 release post, https://nextjs.org/blog/next-16
- HIGH: Next.js App Router docs, https://nextjs.org/docs/app
- HIGH: React 19 stable release post, https://react.dev/blog/2024/12/05/react-19
- HIGH: .NET and .NET Core Support Policy, https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core
- HIGH: ASP.NET Core SignalR tutorial/introduction, https://learn.microsoft.com/en-us/aspnet/core/tutorials/signalr?view=aspnetcore-9.0&tabs=visual-studio
- HIGH: .NET Worker services guidance, https://learn.microsoft.com/en-us/dotnet/core/extensions/workers
- MEDIUM: Tobii Pro SDK .NET documentation landing page, https://developer.tobiipro.com/dotnet.html
- MEDIUM: Tobii Pro SDK reference for screen-based calibration concepts, https://developer.tobiipro.com/tobii.research/matlab/reference/2.1.0.3-alpha-gd8b35e1b/ScreenBasedCalibration.html

