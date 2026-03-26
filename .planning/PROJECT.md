# Reading the Reader Thesis Platform

## What This Is

This project is the software thesis implementation for the Reading the Reader research initiative. It is a researcher-operated adaptive reading system that connects to Tobii eye tracking hardware, runs controlled reading sessions, mirrors the participant view in real time, and applies context-aware micro-interventions while exporting experiment data for later analysis.

The thesis focus is not only to ship a working system, but to defend a modular architecture that cleanly separates sensing, decision-making strategies, intervention execution, and user interface adaptation so future teams can plug in new interventions and external AI-driven decision providers without rewriting the core application.

## Core Value

Build a defendable, modular adaptive reading platform that supports real Tobii-backed experiments and interchangeable intervention and decision modules without breaking the participant reading flow or the researcher workflow.

## Requirements

### Validated

- [x] Researchers can detect, select, and license a Tobii eye tracker through the application - existing
- [x] Researchers can run in-app calibration and validation and the system prevents session start until mandatory setup is complete - existing
- [x] Researchers can follow a guided setup workflow for participant, reading material, calibration, and session start/stop - existing
- [x] Participants can read Markdown-based material in the application with configurable presentation and appearance settings - existing
- [x] Researchers can observe a real-time mirrored participant view and manually apply interventions from a second-screen interface - existing
- [x] The system streams gaze data and tracks live session state through REST plus WebSocket transport - existing
- [x] The system exports replay-ready session data and supports JSON/CSV export and replay workflows - existing
- [x] Phase 1 established one backend experiment authority plus explicit ingress, reader-observation, sensing, and query seams for thesis-defensible modularity - Phase 1

### Active

- [ ] Make the intervention architecture thesis-defensible as a plug-and-play module boundary for new intervention types
- [ ] Make the decision-strategy architecture thesis-defensible so manual, rule-based, hybrid, and external AI-driven strategies can be added or swapped cleanly
- [ ] Preserve reading context and rhythmic flow during layout-changing interventions with behavior strong enough to defend in the thesis
- [ ] Keep the researcher platform and participant reading experience both usable, with slight priority given to researcher-operated experiment workflows
- [ ] Produce architectural documentation and design guidance that future Reading the Reader contributors can build on
- [ ] Support thesis validation through experiment-ready logging, exports, and enough researcher tooling to run and defend evaluation work within time constraints

### Out of Scope

- Implementing AI intervention models inside this thesis codebase - the system must support external AI-style decision providers, but model implementation belongs to a separate team
- PDF reading support - this thesis system uses Markdown-based reading material only

## Context

This work is being built as thesis material inside the broader Reading the Reader project. The public project description states that Reading the Reader aims to use eye tracking and other biometric signals to analyze individual reading patterns and dynamically adapt typography, spacing, contrast, and related presentation variables to improve reading outcomes for visually impaired readers.

The thesis proposal narrows that broad research vision into a software-engineering problem: how to build an adaptive reading application that is modular, experimentally flexible, and user-centered. The key thesis outcomes are a modular architecture, a working adaptive reading system, a real-time researcher mirror and control paradigm, validation using software engineering and HCI practices, and documentation/design guidance for future work.

This repository is already a brownfield implementation. The current codebase includes a Next.js frontend, a layered .NET backend, Tobii device integration, calibration workflows, a participant reading interface, a researcher live view, manual intervention controls, replay/export support, and a shared realtime session model. The remaining thesis work is therefore not a blank-slate product build. It is the work needed to strengthen, justify, and finish the platform so the thesis can defend both the architecture and the implemented experiment flows.

The primary end-to-end scenarios that must work for thesis defense are: eye tracker setup and calibration, session start, participant reading in the Markdown reader, real-time researcher mirroring and intervention control, session export/replay support, and convincingly modular decision/intervention boundaries that others can extend.

## Constraints

- **Hardware**: Tobii eye tracker integration must work with real hardware - the thesis needs a real experiment-capable sensing pipeline
- **Architecture**: Strong modularity is mandatory - sensing, decision strategies, intervention execution, and UI adaptation must be separable and defensible
- **Operator model**: The system is researcher-operated - researcher workflows have slightly higher priority than participant-only polish because participants are invited and managed by researchers
- **Scope**: AI support must be architectural, not implemented end-to-end in this repo - external teams or future contributors can supply AI decision providers
- **Content format**: Reading material is Markdown only - PDF support is explicitly excluded
- **Time**: Thesis deadline pressure matters - lower-priority study tooling can be trimmed if needed, but the architecture, adaptive runtime, and researcher-control story cannot
- **Validation**: The result must be defendable as thesis material - implementation choices need to support architectural argumentation, experimentation, and documentation

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Prioritize a modular adaptive reading platform over a narrow feature demo | The thesis must defend architecture, extensibility, and experiment readiness, not just isolated UI behavior | Confirmed in Phase 1 through authority, ingress, observation, sensing, and query seam extraction |
| Treat the system as both participant-facing and researcher-facing, with a slight bias toward researcher workflows | Researchers are the operators of the platform and need dependable experiment control | - Pending |
| Support external AI-driven decision providers without implementing AI models in this thesis repo | AI implementation is owned elsewhere, but the platform must still prove clean integration boundaries | - Pending |
| Standardize on Markdown reading content and explicitly exclude PDF support | Time is limited and Markdown is sufficient for the thesis reading interface and experiments | - Pending |
| Use the existing brownfield implementation as the foundation and focus thesis work on strengthening, validating, and documenting it | Many core flows already exist, so the best thesis value is in making the system defensible and extensible | Confirmed in Phase 1 by refactoring existing runtime flows instead of replacing them wholesale |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check -> still the right priority?
3. Audit Out of Scope -> reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-26 after Phase 1 execution*
