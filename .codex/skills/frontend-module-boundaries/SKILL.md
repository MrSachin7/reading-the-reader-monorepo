---
name: frontend-module-boundaries
description: Use when changing the Reading The Reader frontend structure, adding pages, refactoring routes, moving state, or reviewing whether Next.js code respects the current app-versus-modules boundaries.
---

# Frontend Module Boundaries

Keep the frontend aligned with the existing Next.js structure and the repo's local Codex guidance.

## Read first

- `../../prompts/base.md` for the project's frontend architecture and real-time UI constraints

## Repository map

- `../../../Frontend/src/app` is routing and layout wiring only.
- `../../../Frontend/src/modules` holds feature pages, components, hooks, and business logic.
- `../../../Frontend/src/components/ui` holds reusable UI primitives.
- `../../../Frontend/src/redux` holds shared app state and API slices when state crosses feature boundaries.
- `../../../Frontend/src/lib` holds cross-feature helpers and transport helpers.

## Boundary rules

- Do not add business logic, data shaping, or complex UI state to `src/app`.
- Add new routes by composing a module page, not by building logic-heavy route files.
- Keep feature-specific components close to the owning page under `src/modules/pages/...`.
- Move code into shared locations only after it is genuinely reused.
- Keep high-frequency gaze and live-session logic isolated so route-level renders stay cheap.

## Change workflow

1. Identify the user-facing page or flow that owns the change.
2. Place UI and orchestration in the relevant module page.
3. Add feature-local helpers, hooks, and types near that module first.
4. Promote code to `components`, `lib`, or `redux` only if multiple features need it.
5. Keep route files thin and obvious.

## Guardrails

- Prefer small components over large page files.
- Keep live streaming and replay state explicit; avoid hidden singleton state.
- Reuse existing UI primitives before creating new shared abstractions.
- Follow the repo's Tailwind and shadcn patterns instead of ad hoc styling systems.

## Validation

- Run `cd Frontend && bun run lint`.
- If routes, layouts, or config changed, also run `cd Frontend && bun run build`.
