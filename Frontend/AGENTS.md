# Frontend Agent Guidance

- For frontend UX work in this repo, use the `reading-research-ux` skill by default.
- When the task includes visual design quality, UI polish, layout refinement, typography, color, accessibility, or responsive behavior, also use the `ui-ux-pro-max` skill if it is installed. If it is not available, fall back to `reading-research-ux` and the repo's existing frontend design rules.
- Apply these UX principles consistently: protect reader continuity, keep researcher controls and system state obvious, prefer direct copy, treat empty/loading/error/disconnected states as first-class, avoid layout jumps during live updates, and validate both desktop and mobile where relevant.
- Preserve existing repo boundaries: `src/app` is for routing only, and application logic, UI, state, hooks, and types belong in `src/modules`.
- Inspect the codebase before editing, keep changes minimal, and run relevant verification before wrapping up.
