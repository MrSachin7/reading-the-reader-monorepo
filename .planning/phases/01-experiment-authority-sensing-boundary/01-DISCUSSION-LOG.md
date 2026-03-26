# Phase 1: Experiment Authority & Sensing Boundary - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 1-Experiment Authority & Sensing Boundary
**Areas discussed:** Authority model, sensing contract shape, canonical state ownership, rewrite depth, reader observation boundary, command ingress boundary

---

## Authority Model

| Option | Description | Selected |
|--------|-------------|----------|
| One central authority forever | Keep one broad manager owning most runtime behavior permanently | |
| One experiment orchestration authority with module-owned internals | Keep one runtime authority for cross-module coordination while modules own their own responsibilities behind interfaces | ✓ |
| Fully split authorities per module | Let each module be independently authoritative, with no central orchestration path | |

**User's choice:** One experiment orchestration authority with module-owned internals.
**Notes:** The user emphasized a clean-architecture approach where modules should own only their own responsibility, avoid concrete dependencies, and receive only the information they actually need.

---

## Sensing Contract Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Broad runtime contract | Expose a large shared runtime object to downstream modules | |
| Minimal device-agnostic sensing contract | Expose only the sensing capabilities and data consumers need, without leaking Tobii specifics | ✓ |
| Tobii-shaped contract | Let downstream modules depend more directly on concrete Tobii-oriented capabilities and structures | |

**User's choice:** Minimal device-agnostic sensing contract.
**Notes:** The user clarified that modules should get neither more nor less information than they need.

---

## Canonical State Ownership

| Option | Description | Selected |
|--------|-------------|----------|
| Frontend-heavy ownership | Frontend owns most session truth and backend mirrors it | |
| Backend canonical ownership | Backend owns canonical experiment/session state while frontend reports participant-side observations | ✓ |
| Split authority | Backend and frontend each own different competing pieces of truth without a clear single authority | |

**User's choice:** Backend canonical ownership.
**Notes:** The discussion clarified that "canonical experiment truth" means the source of truth when system parts disagree, especially around reconnects, replay, and timeline consistency.

---

## Rewrite Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Wrapper pass | Introduce only cosmetic abstractions and defer real separation to later phases | |
| Foundational architectural extraction | Start the deeper rewrite now where it materially establishes the modular foundation | ✓ |
| Full plugin system now | Attempt to complete the full plug-and-play architecture in Phase 1 | |

**User's choice:** Foundational architectural extraction.
**Notes:** The user stated Phase 1 should already start the deep rewrite where relevant because this task is about building the foundation for the plug-and-play architecture.

---

## Reader Observation Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Fold into sensing | Treat viewport, focus, and attention summaries as part of the same sensing boundary as eye-tracker integration | |
| Separate observation boundary | Keep reader-observation signals distinct from hardware sensing | ✓ |
| Decide later | Leave the relationship unresolved for later phases | |

**User's choice:** Separate observation boundary.
**Notes:** The user explicitly agreed that observation and sensing must be different boundaries.

---

## Command Ingress Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Full ingress boundary | Both REST and WebSocket translate transport payloads into application-level commands before orchestration handles them | ✓ |
| WebSocket-first ingress boundary | Fix WebSocket coupling now and align REST later | |
| Minimal change | Keep direct orchestration entrypoints and defer ingress refactor | |

**User's choice:** Full ingress boundary.
**Notes:** The user preferred the command-boundary approach after seeing that WebSocket currently forwards raw envelopes directly into the orchestration runtime.

---

## the agent's Discretion

- Exact contract names and whether orchestration is split across smaller collaborators behind one runtime interface.
- Exact class/module placement for sensing, observation, and ingress services.

## Deferred Ideas

None.
