---
phase: 05
slug: controlled-markdown-reading-baseline
status: completed
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-31
---

# Phase 05 - Validation Strategy

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

- **After every backend reading-baseline contract task:** Run `dotnet test Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj --no-restore`
- **After every frontend reader/setup workflow task:** Run `bun run build` from `Frontend/`
- **After every phase wave:** Run `dotnet test Backend/reading-the-reader-backend.sln --no-restore`
- **Before `$gsd-verify-work`:** Backend full suite plus `bun run build` from `Frontend/` must be green

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 05-01 | 1 | READ-01, READ-04 | backend baseline contract | `dotnet test Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj --no-restore --filter "FullyQualifiedName~ExperimentSetupWorkflowTests|FullyQualifiedName~ExperimentSessionAuthorityTests|FullyQualifiedName~ReadingSession|FullyQualifiedName~ExperimentReplayExportSerializerTests|FullyQualifiedName~FileExperimentReplayExportStoreAdapterTests"` | ✅ existing | ✅ green |
| 05-01-02 | 05-01 | 1 | READ-02, READ-04 | backend regression build | `dotnet build Backend/reading-the-reader-backend.sln -v minimal` | ✅ existing | ✅ green |
| 05-02-01 | 05-02 | 2 | READ-01, READ-02, READ-04 | setup workflow build | `bun run build` from `Frontend/` | ✅ existing | ✅ green |
| 05-02-02 | 05-02 | 2 | READ-02, READ-04 | reading setup regression build | `bun run build` from `Frontend/` | ✅ existing | ✅ green |
| 05-03-01 | 05-03 | 3 | READ-01, READ-03, READ-04 | participant reader build | `bun run build` from `Frontend/` | ✅ existing | ✅ green |
| 05-03-02 | 05-03 | 3 | READ-03 | session-reader regression | `bun run build` from `Frontend/` | ✅ existing | ✅ green |
| 05-04-01 | 05-04 | 4 | READ-01, READ-02, READ-03, READ-04 | contract compatibility build | `dotnet build Backend/reading-the-reader-backend.sln -v minimal` plus `bun run build` from `Frontend/` | ✅ existing | ✅ green |
| 05-04-02 | 05-04 | 4 | READ-01, READ-02, READ-03, READ-04 | end-to-end regression | `dotnet test Backend/reading-the-reader-backend.sln -v minimal` plus `bun run build` from `Frontend/` | ✅ existing | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Added focused backend tests that pin the authoritative reading-session baseline, especially active content/presentation ownership and session lock semantics
- [x] Updated setup-workflow coverage so saved reading setups, authoritative session content, and start-gate reading readiness remain aligned
- [x] Confirmed the frontend build stays green after removing ambiguous active-session fallbacks from the participant route

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Participant can read a saved Markdown session comfortably for the full setup flow | READ-01, READ-03 | Automated checks cannot judge readability stability | Start a session with a saved reading setup and read through the participant route, confirming headings, paragraphs, lists, spacing, and focus mode feel stable and legible |
| Researcher can tell whether a reading baseline is locked or adjustable before session start | READ-02, READ-04 | Operator clarity is semantic, not only structural | In the reading-material setup and experiment setup flow, confirm the saved condition makes it obvious whether participant-side presentation changes are allowed |
| Active session never silently substitutes draft or mock content | READ-01, READ-03, READ-04 | Requires interactive navigation judgment | Open the participant route before and after saving a session baseline, and confirm the UI shows explicit unavailable/loading states instead of placeholder experiment text when the backend baseline is absent |

## Execution Results

- 2026-03-31: `dotnet test Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj --no-restore --filter "FullyQualifiedName~ExperimentSetupWorkflowTests|FullyQualifiedName~ExperimentSessionAuthorityTests|FullyQualifiedName~ReadingSession|FullyQualifiedName~ExperimentReplayExportSerializerTests|FullyQualifiedName~FileExperimentReplayExportStoreAdapterTests"` passed with 12/12 tests while closing Wave 0 authority coverage.
- 2026-03-31: `bun run build` from `Frontend/` passed after the baseline-workflow and participant-reader stabilization changes landed.
- 2026-03-31: `dotnet build Backend/reading-the-reader-backend.sln -v minimal` passed after the richer reading-baseline transport contract and fixture updates.
- 2026-03-31: `dotnet test Backend/reading-the-reader-backend.sln -v minimal` passed with 39/39 tests at phase close.

---

## Validation Sign-Off

- [x] All planned tasks include automated verification or Wave 0 dependencies
- [x] Sampling continuity avoids long unverified runs
- [x] Wave 0 is aimed at backend authority before broader reader UX changes
- [x] No watch-mode flags
- [x] Feedback latency target remains below 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** executed on 2026-03-31
