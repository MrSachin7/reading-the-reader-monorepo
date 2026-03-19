---
name: realtime-experiment-workflows
description: Use when changing eye-tracker discovery, calibration, experiment start or stop, WebSocket payloads, gaze streaming, replay and export flows, or reader-researcher synchronization across backend and frontend.
---

# Realtime Experiment Workflows

Treat the experiment session as one coordinated system across REST, WebSocket, backend state, and frontend UI.

## Read first

- `../../../docs/backend/backend-architecture.md`
- `../../../docs/backend/frontend-backend-integration-guide.md`

## System model

- REST and WebSocket controls must drive the same underlying experiment session state.
- Reader and researcher surfaces must agree on the active session, calibration state, and reading context.
- Gaze samples are high-frequency transport data; UI metrics and summaries should update at human-readable frequencies.

## Workflow

1. Start from the contract boundary: endpoint shape, WebSocket envelope, or session state transition.
2. Update backend contracts and message handling first.
3. Update frontend API slices, socket helpers, and state mapping second.
4. Update reader, researcher, replay, or calibration UI last.
5. Update docs when message types, sequencing, or operator steps changed.

## Guardrails

- Do not invent parallel session states on frontend and backend.
- Keep message names and payload fields consistent across HTTP, WebSocket, Redux, and UI labels.
- Preserve timestamps, validity flags, and session identifiers end-to-end.
- Prefer additive protocol changes over silent breaking changes when possible.
- Keep live rendering throttled or buffered so gaze traffic does not overwhelm the UI.

## Validation

- Run `dotnet build Backend/reading-the-reader-backend.sln`.
- Run `cd Frontend && bun run lint`.
- Verify the happy path mentally or manually: discover tracker, calibrate, start, stream, stop, replay.
