---
name: research-data-privacy
description: Use when reviewing or changing participant data, gaze samples, experiment exports, Tobii license handling, WebSocket payloads, or any feature with privacy or security impact in the Reading The Reader workspace.
---

# Research Data Privacy

Treat participant identity, gaze telemetry, reading materials, and experiment exports as sensitive research data by default.

## Focus areas

- Participant identifiers and session metadata
- Gaze samples, calibration data, and replay exports
- Tobii license files and other local secrets
- WebSocket payload exposure and logging
- Documentation or examples that may accidentally include sensitive values

## Checklist

1. Keep secrets, license files, and environment-specific values out of tracked source unless they are clearly non-sensitive test fixtures.
2. Avoid logging raw participant data, full gaze streams, bearer tokens, or exported payloads without a clear need.
3. Validate incoming requests before persistence, broadcast, or export.
4. Minimize what is broadcast over WebSocket to the fields the UI actually needs.
5. Review sample data, markdown docs, and exported examples for accidental sensitive content.

## Project-specific rules

- Participant and reading-session data should be easy to delete, not just easy to collect.
- Researcher-facing diagnostics should surface state without exposing unnecessary personal detail.
- Replay and export features should preserve experiment usefulness without casually widening data exposure.
- If a change increases data retention, payload size, or operator visibility, call that out explicitly.

## Output expectation

- For reviews, lead with concrete findings and residual risks.
- For implementation work, prefer least-privilege defaults and explicit validation.

## Validation

- Re-read touched logs, DTOs, and docs before finishing.
- If the change affects exports or sample data, inspect the produced file shape directly.
