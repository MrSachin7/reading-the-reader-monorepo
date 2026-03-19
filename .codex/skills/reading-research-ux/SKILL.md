---
name: reading-research-ux
description: Use when designing or reviewing the reader, researcher, calibration, replay, settings, or reading-material setup UX in the Reading The Reader frontend.
---

# Reading Research UX

Design for two actors at once: the reader needs calm continuity, and the researcher needs control and clarity.

## Read first

- `../../prompts/base.md` for the product intent and frontend implementation rules

## Core actors

- Reader: minimize disruption, preserve reading context, and keep visual changes legible and reversible.
- Researcher: expose session status, intervention state, calibration progress, and manual controls without ambiguity.

## UX principles

- Make the current experiment state obvious at a glance.
- Favor one clear decision per step during setup and calibration.
- Preserve the reader's place, typography context, and comprehension flow during live interventions.
- Make researcher actions explainable: what happened, why, and whether it was manual or automated.
- Treat loading, disconnected, and degraded states as first-class UI states.

## Screen guidance

- Setup and calibration: show blockers clearly, show what is complete, and make next steps explicit.
- Reader surface: prioritize text legibility, stable controls, and low visual noise.
- Live researcher view: prioritize health metrics, reader mirror accuracy, and safe manual override.
- Replay and export flows: make provenance and timestamps understandable, not just available.
- Settings: group by experiment intent, not by implementation detail.

## Interaction rules

- Use direct copy over clever copy.
- Confirm destructive or session-ending actions with plain consequences.
- Avoid layout jumps when live metrics or errors update.
- Keep primary actions visually dominant and secondary diagnostics readable but quieter.

## Validation

- Check empty, loading, disconnected, and error states.
- Check both reader and researcher surfaces after changes.
- Check mobile and desktop layouts when the touched screen can appear on both.
