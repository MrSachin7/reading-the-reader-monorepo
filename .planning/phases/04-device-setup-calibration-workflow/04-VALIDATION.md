---
phase: 04
slug: device-setup-calibration-workflow
status: completed
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-31
---

# Phase 04 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Backend framework** | xUnit (.NET) |
| **Backend config file** | `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj` |
| **Backend quick run** | `dotnet test Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj --no-restore` |
| **Backend full suite** | `dotnet test Backend/reading-the-reader-backend.sln --no-restore` |
| **Frontend build check** | `bun run build` (run from `Frontend/`) |
| **Estimated feedback latency** | ~30-120 seconds |

---

## Sampling Rate

- **After every backend setup-contract or gate task:** Run `dotnet test Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj --no-restore`
- **After every frontend workflow or calibration-route task:** Run `bun run build` from `Frontend/`
- **After every phase wave:** Run `dotnet test Backend/reading-the-reader-backend.sln --no-restore`
- **Before `$gsd-verify-work`:** Backend full suite plus `bun run build` from `Frontend/` must be green

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 04-01 | 1 | SETUP-02, SETUP-05, SETUP-06 | setup readiness projection | `dotnet test Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj --no-restore --filter "FullyQualifiedName~ExperimentSetupWorkflowTests"` | ✅ created | ✅ green |
| 04-01-02 | 04-01 | 1 | SETUP-05 | backend gate regression | `dotnet test Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj --no-restore --filter "FullyQualifiedName~ExperimentSessionAuthorityTests"` | ✅ existing | ✅ green |
| 04-02-01 | 04-02 | 2 | SETUP-01, SETUP-02, SETUP-03, SETUP-04 | transport/contract build | `dotnet build Backend/reading-the-reader-backend.sln -v minimal` plus `bun run build` from `Frontend/` | ✅ existing | ✅ green |
| 04-02-02 | 04-02 | 2 | SETUP-03, SETUP-04 | frontend mirror regression build | `dotnet build Backend/reading-the-reader-backend.sln -v minimal` plus `bun run build` from `Frontend/` | ✅ existing | ✅ green |
| 04-03-01 | 04-03 | 3 | SETUP-02, SETUP-05, SETUP-06 | guided workflow build | `bun run build` from `Frontend/` | ✅ existing | ✅ green |
| 04-03-02 | 04-03 | 3 | SETUP-05, SETUP-06 | session-start workflow regression | `bun run build` from `Frontend/` | ✅ existing | ✅ green |
| 04-04-01 | 04-04 | 4 | SETUP-03, SETUP-04, SETUP-06 | calibration-route build | `bun run build` from `Frontend/` | ✅ existing | ✅ green |
| 04-04-02 | 04-04 | 4 | SETUP-01, SETUP-02, SETUP-03, SETUP-04, SETUP-05, SETUP-06 | end-to-end setup regression | `dotnet test Backend/reading-the-reader-backend.sln -v minimal` plus `bun run build` from `Frontend/` | ✅ existing | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ExperimentSetupWorkflowTests.cs` - pins authoritative setup readiness, blocker reasons, and start-gate projection before the guided workflow refactor expands
- [x] `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/CalibrationWorkflowProjectionTests.cs` - pins calibration quality and validation-summary projection before the frontend depends on richer calibration readiness data
- [x] Existing start-authority coverage in `ExperimentSessionAuthorityTests.cs` is updated so setup rejection messages and readiness remain aligned

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Researcher can complete the full setup flow without leaving the platform’s workflow context | SETUP-06 | Automated checks cannot judge operator clarity | On the experiment page, confirm the researcher can move from device selection to calibration launch, back from calibration, choose reading material, and understand the next required action without guessing |
| Calibration interruption states remain understandable | SETUP-03, SETUP-04, SETUP-06 | Full-screen/browser interruption behavior is interaction-heavy | Start calibration, then interrupt it by leaving full screen or hiding the tab. Verify the failure state and return path explain why calibration must be rerun |
| Start gating reads clearly before submission | SETUP-05 | Visual clarity and operator comprehension are semantic | Intentionally leave one prerequisite incomplete and confirm the workflow shows the blocker before pressing Start, then confirm the blocker clears once the prerequisite is satisfied |

---

Manual-only checks remain required on a real Tobii-connected browser session. The automated closeout did not attempt synthetic fullscreen/visibility UAT without a researcher walking the route.

## Execution Results

- 2026-03-31: `bun run build` from `Frontend/` passed after the calibration-route reliability changes landed.
- 2026-03-31: `dotnet test Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj --no-restore --filter "FullyQualifiedName~ExperimentSetupWorkflowTests"` passed with 6/6 tests while closing the setup workflow regressions.
- 2026-03-31: `dotnet test Backend/reading-the-reader-backend.sln -v minimal` passed with 38/38 tests after adding dedicated calibration workflow projection coverage.
- 2026-03-31: `bun run build` from `Frontend/` passed again at phase close with the final route and planning artifact updates in place.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 introduces missing workflow-projection tests before large UI refactors
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** executed 2026-03-31
