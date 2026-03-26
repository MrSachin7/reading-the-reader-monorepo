# Phase 2: Swappable Decision Strategies - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-03-26T13:03:43.0740279Z
**Phase:** 02-swappable-decision-strategies
**Areas discussed:** Strategy output model, Session configuration model, Hybrid supervision rules, Decision input boundary, Provenance and audit model

---

## Strategy Output Model

| Option | Description | Selected |
|--------|-------------|----------|
| Direct intervention command | Strategies emit a concrete intervention patch that is applied immediately. | |
| Recommendation first | Strategies emit a recommendation that must be approved or rejected before application. | |
| Mixed model | Manual path applies directly; non-manual strategies run through proposal handling with configurable advisory or autonomous execution. | ✓ |

**User's choice:** Mixed model, with the researcher retaining first priority at all times.
**Notes:** The user wanted a researcher setting that lets an external decision maker run either autonomously or through researcher approval/rejection. Manual researcher interventions must still apply immediately. During discussion, unresolved non-manual proposals were constrained so they do not stack indefinitely; newer outputs or manual overrides should supersede stale pending items.

---

## Session Configuration Model

| Option | Description | Selected |
|--------|-------------|----------|
| Predefined experiment conditions only | Researcher picks from named modes only. | |
| Raw provider plus execution settings | Researcher configures provider and execution mode directly. | |
| Predefined conditions in UI, separate provider/mode underneath | UI stays simple while the stored model remains composable. | ✓ |

**User's choice:** Use predefined experiment conditions in the UI while storing provider and execution mode separately under the hood.
**Notes:** This choice was preferred because it balances a simple researcher workflow with a cleaner architectural model and reproducible session logging.

---

## Hybrid Supervision Rules

| Option | Description | Selected |
|--------|-------------|----------|
| Manual override only | Researcher can intervene while automation keeps running. | |
| Approve/reject plus override | Advisory proposals can be accepted or rejected and the researcher can still intervene. | |
| Full supervisory control | Researcher can approve/reject, intervene manually, pause/resume automation, and switch advisory/autonomous during a session. | ✓ |

**User's choice:** Full supervisory control.
**Notes:** The user explicitly wanted the researcher to retain operational authority while still being able to let external automation take autonomous control temporarily when needed.

---

## Decision Input Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Full experiment snapshot | Strategies receive the full internal runtime snapshot. | |
| Curated decision-context contract only | Strategies receive a stable, purpose-built decision context with only decision-relevant signals. | ✓ |
| Split model | Internal strategies get the full snapshot while external providers get a curated context. | |

**User's choice:** Curated decision-context contract only.
**Notes:** The recommendation was accepted because it matches the Phase 1 principle that modules should not receive information they do not need, and it creates a cleaner thesis-defensible external provider boundary.

---

## Provenance and Audit Model

| Option | Description | Selected |
|--------|-------------|----------|
| Add a few more fields to intervention events | Keep provenance attached only to applied interventions. | |
| Put the full decision lifecycle into intervention events | Use one event model for both proposals and applied interventions. | |
| Separate decision-proposal log linked to intervention events | Keep proposal lifecycle and applied interventions distinct but related. | ✓ |

**User's choice:** Separate decision-proposal log linked to intervention events.
**Notes:** This was preferred because proposals, approvals, rejections, superseded items, and direct manual interventions are semantically different from applied interventions and should remain separable for replay, export, and thesis defense.

---

## the agent's Discretion

- Exact naming of the provider, mode, and proposal contracts.
- Proposal timeout/expiry rules.
- Whether the first implementation tracks one active unresolved proposal globally or one per provider, as long as the researcher only ever sees one unresolved item at a time.
- Exact curated-context field list in the first contract revision.

## Deferred Ideas

None.
