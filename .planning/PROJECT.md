# Reading the Reader Thesis Platform

## What This Is

This project is the software thesis implementation for the Reading the Reader research initiative. It is a researcher-operated adaptive reading system that connects to Tobii eye tracking hardware, runs controlled reading sessions, mirrors the participant view in real time, and applies context-aware micro-interventions while preserving a modular architecture that future teams can extend.

The thesis implementation now covers the platform foundation needed to defend the architecture and the end-to-end experiment workflow: modular runtime seams, real device-backed setup and calibration, controlled Markdown reading, researcher live supervision, and context-preserving adaptive reading behavior.

## Core Value

Build a defendable, modular adaptive reading platform that supports real Tobii-backed experiments and interchangeable intervention and decision modules without breaking the participant reading flow or the researcher workflow.

## Current State

v1.0 was archived on 2026-04-01 as the first shipped thesis milestone.

Delivered in v1.0:

- One authoritative experiment runtime with explicit sensing, ingress, observation, decision, intervention, and query seams.
- Guided Tobii setup and calibration inside the application with authoritative readiness and session-start gating.
- Controlled Markdown reading with researcher-owned presentation constraints and participant-stable baseline behavior.
- Researcher live mirroring, intervention control, and runtime evidence for session trust and health.
- Context-preserving adaptive reading implementation with continuity contracts, guardrails, and live continuity evidence.

The milestone was force-closed. That decision accepted two known gaps at archive time:

- Phase 7 still had manual validation and UAT items pending.
- Replay/export/documentation packaging that had been planned as Phase 8 was deferred out of v1.0 rather than executed as a standalone closeout phase.

## Requirements

### Validated

- [x] Researchers can detect, select, and license a Tobii eye tracker through the application.
- [x] Researchers can run in-app calibration and validation and the system prevents session start until mandatory setup is complete.
- [x] Researchers can follow a guided setup workflow for participant, reading material, calibration, and session start/stop.
- [x] Participants can read Markdown-based material in the application with configurable presentation and appearance settings.
- [x] Researchers can observe a real-time mirrored participant view and manually apply interventions from a second-screen interface.
- [x] The system streams gaze data and tracks live session state through REST plus WebSocket transport.
- [x] The system exposes modular sensing, decision-strategy, and intervention boundaries suitable for future extension.
- [x] The platform preserves reading context and continuity strongly enough to ship the adaptive runtime foundation for the thesis, with remaining manual validation accepted at closeout.

### Active

No active milestone requirements are currently defined.

### Out of Scope

- Implementing AI intervention models inside this thesis codebase - the system must support external AI-style decision providers, but model implementation belongs to a separate team.
- PDF reading support - this thesis system uses Markdown-based reading material only.
- Additional replay/export reproducibility packaging and thesis-extension guidance beyond the v1.0 archive - deferred to future milestone planning.

## Context

This work is being built as thesis material inside the broader Reading the Reader project. The thesis value is not a blank-slate product build; it is the combination of modular architecture, experiment-capable runtime behavior, and researcher-operated workflows that can be defended and extended.

The repository now contains a Next.js frontend, a layered .NET backend, Tobii device integration, calibration workflows, a participant reading interface, a researcher live view, manual intervention controls, replay/export support already present in the brownfield base, and shared realtime session contracts that were hardened through the v1.0 milestone.

If future thesis or product work still needs stronger reproducibility packaging, richer replay analysis, or deeper documentation guidance, that should start as a new milestone rather than reopening the archived v1.0 scope.

## Constraints

- **Hardware**: Tobii eye tracker integration must work with real hardware - the thesis needs a real experiment-capable sensing pipeline.
- **Architecture**: Strong modularity is mandatory - sensing, decision strategies, intervention execution, and UI adaptation must be separable and defensible.
- **Operator model**: The system is researcher-operated - researcher workflows have slightly higher priority than participant-only polish because participants are invited and managed by researchers.
- **Scope**: AI support must be architectural, not implemented end-to-end in this repo - external teams or future contributors can supply AI decision providers.
- **Content format**: Reading material is Markdown only - PDF support is explicitly excluded.
- **Time**: Thesis deadline pressure matters - lower-priority study tooling can be trimmed if needed, but the architecture, adaptive runtime, and researcher-control story cannot.
- **Validation**: The result must be defendable as thesis material - implementation choices need to support architectural argumentation, experimentation, and documentation.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Prioritize a modular adaptive reading platform over a narrow feature demo | The thesis must defend architecture, extensibility, and experiment readiness, not just isolated UI behavior | Confirmed in v1.0 |
| Treat the system as both participant-facing and researcher-facing, with a slight bias toward researcher workflows | Researchers are the operators of the platform and need dependable experiment control | Confirmed in v1.0 |
| Support external AI-driven decision providers without implementing AI models in this thesis repo | AI implementation is owned elsewhere, but the platform must still prove clean integration boundaries | Confirmed in v1.0 |
| Standardize on Markdown reading content and explicitly exclude PDF support | Time is limited and Markdown is sufficient for the thesis reading interface and experiments | Confirmed in v1.0 |
| Use the existing brownfield implementation as the foundation and focus thesis work on strengthening, validating, and documenting it | Many core flows already exist, so the best thesis value is in making the system defensible and extensible | Confirmed in v1.0 |
| Force-close v1.0 with accepted residual gaps rather than reopening the milestone for Phase 8 packaging work | The milestone foundation was considered complete enough to archive, and remaining closeout work no longer justified blocking shipment | Accepted on 2026-04-01 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

Current status:

1. v1.0 is archived.
2. There is no active milestone in planning.
3. The next planning step, if needed, is `$gsd-new-milestone`.

---
*Last updated: 2026-04-01 after v1.0 milestone completion*
