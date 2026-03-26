---
phase: 01
slug: experiment-authority-sensing-boundary
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 01 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | xUnit (.NET) |
| **Config file** | `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj` |
| **Quick run command** | `dotnet test Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj --no-restore` |
| **Full suite command** | `dotnet test Backend/reading-the-reader-backend.sln --no-restore` |
| **Estimated runtime** | ~30-90 seconds |

---

## Sampling Rate

- **After every task commit:** Run `dotnet test Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj --no-restore`
- **After every plan wave:** Run `dotnet test Backend/reading-the-reader-backend.sln --no-restore`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-XX-01 | TBD | TBD | MOD-01 | characterization | `dotnet test Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj --no-restore` | ❌ W0 | ⬜ pending |
| 01-XX-02 | TBD | TBD | MOD-05 | architecture/build | `dotnet test Backend/reading-the-reader-backend.sln --no-restore` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ExperimentSessionManagerTests.cs` - characterization tests for lifecycle, setup gating, and snapshot authority
- [ ] `Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/RealtimeIngressTests.cs` - command-ingress tests proving transport parsing is outside orchestration
- [ ] Shared test doubles or fixtures for session authority, broadcaster, and state-store collaborators as needed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Researcher and participant realtime flows still behave coherently after ingress and boundary extraction | MOD-05 | Boundary correctness is partly architectural and partly runtime-integrated | Run the guided setup path, connect the reading and researcher views, and confirm session state remains synchronized while observation updates and interventions still appear correctly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all missing references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
