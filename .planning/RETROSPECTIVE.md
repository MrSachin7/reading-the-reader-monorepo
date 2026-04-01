# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 - Thesis Platform Foundation

**Shipped:** 2026-04-01  
**Phases:** 8 | **Plans:** 29 | **Sessions:** 1

### What Was Built

- A modular adaptive reading platform with explicit sensing, decision, intervention, and UI/runtime boundaries.
- A researcher-operated Tobii setup, calibration, and controlled reading workflow that keeps session start tied to authoritative readiness.
- A live researcher mirror and adaptive reading runtime that surfaces trust, continuity, and intervention evidence during active sessions.

### What Worked

- Phase-based delivery kept architectural seams explicit instead of letting cross-cutting runtime logic sprawl again.
- Backend-owned authority contracts made frontend workflow refinements easier to implement without reintroducing ambiguity.

### What Was Inefficient

- Planning state drifted behind execution late in the milestone, which made closeout more manual than it should have been.
- Final validation remained partly manual and environment-dependent, which weakened the normal audit path at the end.

### Patterns Established

- Treat transport and UI as projections of backend authority rather than alternate sources of experiment truth.
- Expose adaptive/runtime evidence in existing operator workflows instead of creating parallel supervision surfaces.

### Key Lessons

1. The thesis is strongest when architectural seams and researcher-operated workflows are treated as one delivery story, not separate tracks.
2. Milestone closeout should be kept current throughout execution; otherwise the archive step becomes a reconstruction exercise.

### Cost Observations

- Model mix: not recorded
- Sessions: 1
- Notable: Most execution value came from keeping changes aligned with the brownfield runtime instead of pursuing broad rewrites.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | 1 | 8 | Established the thesis platform foundation and the planning/archive structure |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | Mixed automated plus manual closeout evidence | Not recorded | Not recorded |

### Top Lessons (Verified Across Milestones)

1. Backend-owned runtime authority reduces ambiguity across setup, live operation, and adaptive behavior.
2. Researcher-facing evidence and trust cues matter as much as participant-facing behavior in this thesis scope.

