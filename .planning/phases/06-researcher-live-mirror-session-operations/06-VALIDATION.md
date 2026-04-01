---
phase: 06
slug: researcher-live-mirror-session-operations
status: completed
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-31
---

# Phase 06 - Validation Strategy

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

- **After every backend live-contract task:** Run `dotnet test Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj --no-restore`
- **After every researcher-live frontend task:** Run `bun run build` from `Frontend/`
- **After every phase wave:** Run `dotnet test Backend/reading-the-reader-backend.sln --no-restore`
- **Before `$gsd-verify-work`:** Backend full suite plus `bun run build` from `Frontend/` must be green

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 06-01 | 1 | LIVE-02, LIVE-05 | backend live-authority contract | `dotnet test Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj --no-restore --filter "FullyQualifiedName~ExperimentSessionAuthorityTests|FullyQualifiedName~ExperimentSetupWorkflowTests"` | ✅ existing | ✅ green |
| 06-01-02 | 06-01 | 1 | LIVE-02 | backend regression build | `dotnet build Backend/reading-the-reader-backend.sln -v minimal` | ✅ existing | ✅ green |
| 06-02-01 | 06-02 | 2 | LIVE-01, LIVE-02 | mirror trust UI build | `bun run build` from `Frontend/` | ✅ existing | ✅ green |
| 06-02-02 | 06-02 | 2 | LIVE-01 | live mirror regression build | `bun run build` from `Frontend/` | ✅ existing | ✅ green |
| 06-03-01 | 06-03 | 3 | LIVE-03, LIVE-05 | supervision console build | `bun run build` from `Frontend/` | ✅ existing | ✅ green |
| 06-03-02 | 06-03 | 3 | LIVE-03, LIVE-05 | workflow regression build | `bun run build` from `Frontend/` | ✅ existing | ✅ green |
| 06-04-01 | 06-04 | 4 | LIVE-04, LIVE-05 | chronology and contract regression | `dotnet build Backend/reading-the-reader-backend.sln -v minimal` plus `bun run build` from `Frontend/` | ✅ existing | ✅ green |
| 06-04-02 | 06-04 | 4 | LIVE-01, LIVE-02, LIVE-03, LIVE-04, LIVE-05 | end-to-end regression | `dotnet test Backend/reading-the-reader-backend.sln -v minimal` plus `bun run build` from `Frontend/` | ✅ existing | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Added backend coverage around active-session authority so Phase 6 frontend work is grounded in stable monitorability/state assumptions
- [x] Confirmed the frontend build stays green after mirror trust, live-console, and chronology changes
- [x] Kept session-operation changes aligned with the existing setup/start gate instead of creating a second authority path

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Researcher can clearly tell when the mirror is exact versus approximate | LIVE-01 | Trust signaling is semantic and visual | Start an active session, open the live page in fullscreen, then deliberately break exact-mirror conditions and confirm the UI strongly signals the fallback state |
| Researcher can supervise an active session without losing operational context | LIVE-03, LIVE-05 | Workflow continuity spans multiple pages and timing states | Start from experiment setup, move into live monitoring, pause/resume automation, issue a manual intervention, then finish the session and confirm the path feels continuous |
| Researcher can explain what just happened during the session | LIVE-04 | In-the-moment chronology clarity is not fully assertable by build checks | During an active run, trigger proposals/interventions and confirm the live metadata/history surfaces show what fired, when, and why without needing export tools |
| Live health indicators feel actionable rather than decorative | LIVE-02 | Operator meaning depends on threshold language and UI emphasis | Simulate or observe degraded latency/validity states and confirm the researcher can tell whether the session is healthy, warning, or degraded |

## Execution Results

- 2026-03-31: `dotnet test Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj --no-restore --filter "FullyQualifiedName~ExperimentSessionAuthorityTests|FullyQualifiedName~ExperimentSetupWorkflowTests"` passed with 11/11 tests after the live-monitoring contract and disconnect coverage landed.
- 2026-03-31: `bun run build` from `Frontend/` passed after the mirror trust-state refactor and again after the operator-console/workflow handoff changes.
- 2026-03-31: `dotnet build Backend/reading-the-reader-backend.sln -v minimal` passed during Wave 1 and again at phase close.
- 2026-03-31: `dotnet test Backend/reading-the-reader-backend.sln -v minimal` passed with 41/41 tests at phase close.

---

## Validation Sign-Off

- [x] All planned tasks include automated verification or Wave 0 dependencies
- [x] Sampling continuity avoids long unverified runs
- [x] Wave 0 starts from backend/session authority before broader live-console tightening
- [x] No watch-mode flags
- [x] Feedback latency target remains below 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** executed on 2026-03-31
