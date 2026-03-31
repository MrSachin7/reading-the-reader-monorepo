---
phase: 03
slug: pluggable-intervention-modules
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-31
---

# Phase 03 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Backend framework** | xUnit (.NET) |
| **Backend config file** | `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj` |
| **Backend quick run** | `dotnet test Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj --no-restore` |
| **Backend full suite** | `dotnet test Backend/reading-the-reader-backend.sln --no-restore` |
| **Frontend build check** | `bun run build --cwd Frontend` |
| **Estimated feedback latency** | ~30-120 seconds |

---

## Sampling Rate

- **After every backend task commit:** Run `dotnet test Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj --no-restore`
- **After every phase wave:** Run `dotnet test Backend/reading-the-reader-backend.sln --no-restore`
- **After every frontend contract or UI task:** Run `bun run build --cwd Frontend`
- **Before `$gsd-verify-work`:** Backend full suite plus frontend build must be green

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 03-01 | 1 | MOD-03, MOD-04 | catalog contract | `dotnet test Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj --no-restore --filter "FullyQualifiedName~ReadingInterventionModuleCatalogTests"` | ✅ created | ✅ green |
| 03-01-02 | 03-01 | 1 | MOD-03 | backend build | `dotnet build Backend/reading-the-reader-backend.sln -v minimal` | ✅ existing | ✅ green |
| 03-02-01 | 03-02 | 2 | MOD-03, MOD-04 | module execution | `dotnet test Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj --no-restore --filter "FullyQualifiedName~InterventionModuleExecutionTests|FullyQualifiedName~ReadingInterventionRuntimeTests|FullyQualifiedName~DecisionProposalLifecycleTests"` | ✅ created | ✅ green |
| 03-02-02 | 03-02 | 2 | MOD-03 | replay serializer | `dotnet test Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj --no-restore --filter "FullyQualifiedName~ExperimentReplayExportSerializerTests"` | ✅ existing | ✅ green |
| 03-03-01 | 03-03 | 3 | MOD-04 | backend/frontend contract build | `dotnet build Backend/reading-the-reader-backend.sln -v minimal && bun run build --cwd Frontend` | ✅ existing | ✅ green |
| 03-03-02 | 03-03 | 3 | MOD-03, MOD-04 | frontend contract build | `bun run build --cwd Frontend` | ✅ existing | ✅ green |
| 03-04-01 | 03-04 | 4 | MOD-03, MOD-04 | researcher UI build | `bun run build --cwd Frontend` | ✅ existing | ✅ green |
| 03-04-02 | 03-04 | 4 | MOD-03, MOD-04 | end-to-end regression | `dotnet test Backend/reading-the-reader-backend.sln -v minimal && bun run build --cwd Frontend` | ✅ existing | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingInterventionModuleCatalogTests.cs` - pins module ids, metadata, and parameter declaration coverage for the first catalog
- [x] `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/InterventionModuleExecutionTests.cs` - proves runtime validation and execution route through explicit modules rather than one generic hardcoded path
- [x] Existing runtime/replay tests are updated to cover module provenance and strategy compatibility, especially `ReadingInterventionRuntimeTests.cs`, `DecisionProposalLifecycleTests.cs`, and `ExperimentReplayExportSerializerTests.cs`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Researcher intervention controls remain understandable after module-driven rendering | MOD-03, MOD-04 | Build validation cannot judge operator clarity | In the live researcher view, confirm the grouped controls still read like one coherent intervention panel even though they are now backed by module metadata |
| Intervention history and metadata are explainable in researcher terms | MOD-04 | Provenance readability is partly semantic, not just structural | Apply a few manual interventions and verify the UI surfaces meaningful module names and parameter semantics rather than only raw ids |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers missing module catalog and execution tests before runtime migration
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved on 2026-03-31 after backend targeted tests, backend full suite, backend build, and frontend production build all passed locally.
