You are working in a **Next.js (App Router) + TypeScript** frontend using:

* **shadcn/ui** components
* **Tailwind CSS only** (no extra CSS files unless absolutely unavoidable; prefer Tailwind utilities)
* **Small, modular components** (never create huge files; split by responsibility)
* **Real-time UI** (subject view + researcher mirror view), performance-sensitive (avoid re-render storms)

### Repository structure (STRICT)

```
src/
  app/        // routing only (pages, layouts). NO business logic here.
  modules/    // all actual code lives here: features, components, hooks, services, state, types
```

**Rule:** `src/app` must only orchestrate routing and compose module-level pages. All logic, UI components, state, services, and types must be inside `src/modules`.

---

## Architecture & module conventions

### Feature-first modules

Organize code by feature (not by technical type). Example:

```
src/modules/
  subject/
    pages/
    components/
    hooks/
    state/
    types.ts
  researcher/
    pages/
    components/
    hooks/
    state/
    types.ts
  setup/
    pages/
    components/
    hooks/
    state/
    types.ts
  interventions/
    registry/
    runtime/
    strategies/
    components/
    types.ts
  gaze/
    sdk/
    mapping/
    hooks/
    state/
    types.ts
  session/
    workflow/
    logging/
    export/
    types.ts
  shared/
    ui/            // shadcn wrappers ONLY when needed
    components/    // generic reusable components
    hooks/
    utils/
    types/
```

**Guideline:** if a component is only used by one feature, it lives in that feature. Only move to `shared/` once it is reused.

---

## UI requirements to implement (domain intent)

The app supports two primary UI surfaces (actors):

1. **Test Subject (Reader)**: reading interface, smooth flow, minimal disruption.
2. **Researcher (Experimenter)**: guided workflow + mirrored view + manual override + health metrics. 

Core flows to support in UI (in this order):

1. **Guided session workflow**: device → license → calibration → content → session start/stop.
2. **Subject reading view**: read text/PDF with presets (contrast/background/typography); preserve reading context during interventions.
3. **Researcher view (second screen)**: live mirror of subject view; show system health indicators (Hz, validity, latency); allow manual interventions & overrides; show when/why interventions triggered.
4. **Decision strategies**: allow enabling/disabling per session: manual, rule-based, automated, hybrid; log source + rationale.
5. **Logging/export**: session data export (JSON/CSV) including gaze, derived events, interventions, configs, calibration metadata, annotations. 

---

## Coding rules (STRICT)

### 1) No business logic in `src/app`

* `src/app/**` may import `modules/**` pages and render them.
* Anything more belongs in `modules`.

### 2) Component size & modularity

* Prefer **many small components** over “god components”.
* If a file exceeds ~200 lines, split it (unless it is a simple page composition file).
* Separate:

  * **UI** (presentational components)
  * **state** (stores, reducers, context)
  * **services** (websocket/client, SDK adapters)
  * **domain types** (types.ts)

### 3) Tailwind-only styling

* Use Tailwind classes for layout and styling.
* Do not create new CSS files.
* Only use inline styles when necessary for dynamic values that Tailwind cannot express.

### 4) shadcn/ui usage

* Prefer shadcn components for dialogs, buttons, cards, tables, tabs, forms.
* Wrap shadcn components only if you need consistent defaults (e.g., `shared/ui/Button.tsx`).

### 5) Real-time performance practices

* Avoid frequent state updates that trigger large subtree renders.
* Use memoization (`useMemo`, `useCallback`, `React.memo`) where it actually reduces churn.
* Use refs for high-frequency streams; batch updates to UI (e.g., sample rate/latency shown at ~2–10 Hz, not per gaze sample).
* Keep mirror view rendering efficient (e.g., snapshot state + minimal diffs).

### 6) State management

* Prefer **feature-local state**; only use shared/global state when required (session lifecycle, active device, active strategy).
* Keep stores small and explicit. Avoid “one store for everything”.

### 7) Type safety & boundaries

* Define stable **domain interfaces** for:

  * gaze samples + derived gaze events
  * intervention events (source, rationale, timestamps)
  * session config + workflow state
* “Pluggable interventions” and “interchangeable strategies” must compile-time enforce the contract through types. 

### 8) Testability

* Write logic in pure functions when possible.
* Keep SDK/websocket side effects in `services/` so they can be mocked.

---

## Implementation patterns Codex should follow

### Pages

* `src/app/.../page.tsx` should render a single module page:

  * `return <SubjectPage />` from `src/modules/subject/pages/SubjectPage.tsx`
* Module pages compose feature components and connect state.

### Session workflow UI

* Implement a stepper-like guided flow with clear “blocked until completed” behavior:

  * Prevent session start if license/calibration incomplete. 
* Use shadcn: `Card`, `Button`, `Tabs`, `Alert`, `Progress`, `Dialog`.

### Researcher mirror UI

* Mirror should reflect subject settings + current content position + interventions applied.
* Researcher view must include:

  * sample rate, validity, latency metrics
  * controls for manual trigger/override
  * event timeline (intervention + rationale)

### Intervention system (frontend-facing)

* Treat interventions as **declarative commands** that affect presentation (e.g., preset changes, typography tweak).
* Strategies decide *when*; interventions define *what changes*.
* UI must show: **what happened, why, and from which strategy**. 

---

## Output expectations when Codex generates code

When you generate or modify code:

1. Respect the folder rules (`app` = routing only; logic in `modules`).
2. Keep files small and named clearly.
3. Use Tailwind + shadcn.
4. Provide complete imports and correct relative paths.
5. If adding a feature, include:

   * types
   * state/hooks
   * UI components
   * a module page
   * a minimal `src/app` route wiring

If unsure, choose the simplest modular design that preserves:

* low latency real-time behaviour
* experimental flexibility (strategy swapping, intervention plugins)
* guided workflow and reproducibility-focused logging/export.  
