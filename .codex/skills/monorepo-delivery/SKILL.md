---
name: monorepo-delivery
description: Use when a task spans Backend and Frontend, changes contracts or configuration, moves docs, or needs coordinated validation across the Reading The Reader monorepo.
---

# Monorepo Delivery

Coordinate changes across `Backend`, `Frontend`, and `docs` as one product.

## Repository map

- `Backend/` is the .NET backend solution and tests.
- `Frontend/` is the Next.js app.
- `docs/` holds shared project documentation.
- `.codex/skills/` holds repo-local agent skills.

## Workflow

1. Identify the shared boundary first: payload, session rule, setting, env variable, or docs contract.
2. Update backend behavior and contracts before frontend callers.
3. Update frontend integration and UI only after the contract is clear.
4. Update docs when setup, operator workflow, or protocol expectations changed.
5. Validate each touched surface with the narrowest useful command.

## Coordination rules

- Keep names consistent across DTOs, Redux state, socket messages, and docs.
- Call out breaking changes explicitly instead of hiding them in broad refactors.
- Prefer minimizing path churn unless the task is explicitly structural.
- Keep repo-level files at the root when they affect both apps.

## Done criteria

- Backend and frontend behavior match.
- Docs reflect the new behavior.
- No duplicate contract definitions or stale setup notes remain.
