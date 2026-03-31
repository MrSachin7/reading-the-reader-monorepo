---
phase: 02
slug: swappable-decision-strategies
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-26
---

# Phase 02 - Validation Strategy

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
| 02-01-01 | 02-01 | 1 | MOD-02 | contract test | `dotnet test Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj --no-restore --filter "FullyQualifiedName~DecisionStrategyContractTests"` | ✅ existing | ✅ green |
| 02-01-02 | 02-01 | 1 | MOD-02 | context mapping | `dotnet test Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj --no-restore --filter "FullyQualifiedName~DecisionContextFactoryTests"` | ✅ existing | ✅ green |
| 02-02-01 | 02-02 | 2 | MOD-02 | lifecycle test | `dotnet test Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj --no-restore --filter "FullyQualifiedName~DecisionProposalLifecycleTests"` | ✅ existing | ✅ green |
| 02-02-02 | 02-02 | 2 | MOD-02 | integration/build | `dotnet test Backend/reading-the-reader-backend.sln --no-restore` | ✅ existing | ✅ green |
| 02-03-01 | 02-03 | 3 | MOD-02 | serializer test | `dotnet test Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj --no-restore --filter "FullyQualifiedName~ExperimentReplayExportSerializerTests"` | ✅ existing | ✅ green |
| 02-03-02 | 02-03 | 3 | MOD-02 | frontend contract build | `bun run build --cwd Frontend` | ✅ existing | ✅ green |
| 02-04-01 | 02-04 | 4 | MOD-02 | frontend supervisory build | `bun run build --cwd Frontend` | ✅ existing | ✅ green |
| 02-04-02 | 02-04 | 4 | MOD-02 | end-to-end regression | `dotnet test Backend/reading-the-reader-backend.sln --no-restore` | ✅ existing | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/DecisionStrategyContractTests.cs` - pins provider contract semantics, provider ids, and proposal status defaults
- [x] `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/DecisionContextFactoryTests.cs` - proves curated decision context is derived from authoritative session state without exposing full runtime internals
- [x] `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/DecisionProposalLifecycleTests.cs` - proves advisory, autonomous, superseded, and manual-override behavior

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Researcher can understand and switch experiment conditions before session start | MOD-02 | This is a workflow coherence check, not just a compile/build property | In the experiment setup flow, confirm the researcher can select a named condition, see provider/mode semantics clearly, and start a session without hidden defaults |
| Researcher supervisory controls remain coherent during live operation | MOD-02 | Build validation cannot judge operator clarity | In researcher live view, verify the pending proposal card, approve/reject actions, pause/resume control, and advisory/autonomous switch are understandable and do not obscure the existing manual intervention controls |
| Replay/export meaningfully distinguishes proposals from applied interventions | MOD-02 | Replay fidelity and thesis readability require semantic inspection | Run one advisory and one autonomous session, export the replay, and confirm proposals, resolutions, and applied interventions can be explained from the resulting chronology |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers missing strategy/proposal tests before lifecycle refactors
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-31 based on local automated verification; manual UAT checks remain recommended for later thesis sessions.
