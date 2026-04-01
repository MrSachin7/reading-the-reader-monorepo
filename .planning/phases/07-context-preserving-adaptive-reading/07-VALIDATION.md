---
phase: 07
slug: context-preserving-adaptive-reading
status: awaiting-manual-validation
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-01
updated: 2026-04-01
---

# Phase 07 Validation

## Execution Results

| Check | Command | Result | Notes |
|---|---|---|---|
| Backend application compile | `dotnet build Backend/src/core/ReadingTheReader.core.Application/ReadingTheReader.core.Application.csproj --no-restore -v minimal` | passed | Guardrail and contract changes compile in the core application project. |
| Frontend type validation | `bun x tsc --noEmit` from `Frontend/` | passed | Phase 7 contract, replay mirror, reader hook, and live UI typecheck cleanly. |
| Targeted backend authority tests | `dotnet test Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj --no-restore --filter "FullyQualifiedName~ExperimentSessionAuthorityTests" -v minimal` | pending manual | This environment hit an unstable `dotnet test` path for the test project after the new authority tests were added. |
| Backend full solution build | `dotnet build Backend/reading-the-reader-backend.sln --no-restore -v minimal` | pending manual | Direct solution-level build returned no diagnostics in this environment. |
| Backend full suite | `dotnet test Backend/reading-the-reader-backend.sln --no-restore -v minimal` | pending manual | Deferred until the local solution-level test path is run manually. |
| Frontend production build | `bun run build` from `Frontend/` | pending manual | Agent environment cannot fetch Google Fonts used by `next/font`, so production build verification needs a normal networked run. |

## Manual Commands To Run

1. `cd Backend\tests\ReadingTheReader.Realtime.Persistence.Tests`
2. `dotnet test ReadingTheReader.Realtime.Persistence.Tests.csproj --no-restore --filter "FullyQualifiedName~ExperimentSessionAuthorityTests" -v minimal`
3. `cd ..\..\src\core\ReadingTheReader.core.Application`
4. `dotnet build ReadingTheReader.core.Application.csproj --no-restore -v minimal`
5. `cd ..\..\..\..\Frontend`
6. `bun x tsc --noEmit`
7. `bun run build`
8. Optional closeout: `cd ..\Backend` then `dotnet test reading-the-reader-backend.sln --no-restore -v minimal`

## Manual UAT

| Behavior | Goal |
|---|---|
| Mild layout change preserves place | Confirm the participant stays in the same text region after a small font-size or line-width change. |
| Missing token falls back cleanly | Confirm degraded continuity is still reported when gaze token anchoring is unavailable and block-anchor or scroll-only fallback is used. |
| Repeated layout changes are held back | Trigger two layout-affecting interventions quickly and confirm the researcher live view surfaces `cooldown-active`. |
| Oversized layout jump is blocked | Attempt a large font-size or line-height jump and confirm the live view surfaces `change-too-large`. |
| Mirror trust remains aligned | Confirm continuity evidence reads like mirror-health evidence, not a separate supervision workflow. |

## Status

Phase 7 implementation is in place. Final closeout is waiting on the manual backend test/build runs and a network-capable frontend production build.
