## Summary

Wave 3 exposed the new decision model through backend/frontend contracts and replay/export:

- `ExperimentSessionSnapshot` now includes `DecisionConfiguration` and `DecisionState`.
- Added `UpdateDecisionConfigurationRequest` and `UpdateDecisionConfigurationEndpoint`.
- Replay/export now distinguishes `DecisionProposalEventRecord` from applied intervention events and tracks `decisionProposalEventCount`.
- `ExperimentReplayExportSerializer` reads and writes the dedicated `decisionProposalEvent` section.
- Frontend mirrors now include decision configuration/state and decision proposal replay records in `experiment-session.ts`, `gaze-socket.ts`, `experiment-replay.ts`, and `experiment-session-api.ts`.

## Verification

Backend and frontend verification completed locally on 2026-03-31. Targeted replay serializer coverage passed, the full backend solution test command passed, and the frontend production build passed.
