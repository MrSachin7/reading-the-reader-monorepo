# Domain Pitfalls

**Domain:** Researcher-run adaptive reading and realtime experiment systems
**Researched:** 2026-03-26
**Overall confidence:** MEDIUM-HIGH

This project is already beyond prototype novelty. The main thesis risk is no longer "can we make something impressive happen live?" but "can we defend that the system is modular, experimentally trustworthy, and scoped well enough to finish?" In this domain, the most expensive mistakes are architectural overreach, hidden coupling in the realtime path, and weak experiment provenance.

The current repo already proves many core flows. That is good news, but it changes the failure mode. The wrong next step is not broadening the product. The wrong next step is deepening the most coupled parts of the current implementation without first creating boundaries, reproducibility guarantees, and data-handling discipline.

## Critical Pitfalls

### Pitfall 1: AI-First Thesis Scope
**Confidence:** HIGH

**What goes wrong:** The project turns into an "intelligent reading system" thesis instead of a modular experiment-platform thesis. Teams start building model training, prompt pipelines, live inference loops, or complex personalization logic before they have stable instrumentation, replay, and baseline rule/manual behaviors.

**Why it happens:** AI looks like the differentiator. It is tempting to treat the decision engine as the product instead of treating it as one replaceable module in a controlled experiment system.

**Consequences:** No defensible baseline, weak evaluation, unstable runtime dependencies, and a thesis that is judged on model quality instead of architectural clarity.

**Current repo warning signs:**
- The repo already has a cleanly limited intervention execution seam in `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/IReadingInterventionRuntime.cs` and `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ReadingInterventionRuntime.cs`.
- I did not find a parallel decision-strategy abstraction in `Backend/src/core/ReadingTheReader.core.Application/`; the easiest future mistake is to inject decision logic straight into `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs`.
- The realtime path already carries enough responsibility that adding external AI calls there would harden the worst coupling point instead of improving modularity.

**Prevention:**
- Keep the thesis decision story to `manual -> rule-based -> provider interface`, not `manual -> LLM product`.
- Require any future decision provider to work from replay/exported events first, then live mode.
- Make "researcher override" and "disable provider" mandatory capabilities of the decision layer.
- Do not put provider-specific SDKs or prompts in the participant or researcher UI.

**Detection:**
- New work introduces external model calls before replay-driven offline evaluation exists.
- A PR needs to change `ExperimentSessionManager.cs` to add decision logic.
- Success criteria shift from reproducibility and operator control to "smarter recommendations."

### Pitfall 2: Weak Module Boundaries in the Realtime Core
**Confidence:** HIGH

**What goes wrong:** One service becomes the lifecycle controller, realtime router, export assembler, gaze ingestion path, intervention executor, and persistence coordinator.

**Why it happens:** Brownfield systems grow around the first working orchestrator. Realtime code is especially prone to "just add one more branch" because integration bugs are easier to fix locally than by designing a new boundary.

**Consequences:** Small changes have a wide regression surface, architectural claims become hard to defend, and future extensibility is theoretical rather than real.

**Current repo warning signs:**
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs` owns session lifecycle, hardware subscription, inbound message handling, snapshot persistence, replay history, export building, participant viewport state, focus state, and intervention application.
- Frontend/backend contracts are mirrored manually across `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/MessageTypes.cs`, `Frontend/src/lib/gaze-socket.ts`, and `Frontend/src/lib/experiment-session.ts`.
- The repo-level architecture notes already flag this service as a monolithic realtime orchestrator in `.planning/codebase/CONCERNS.md`.

**Prevention:**
- Split control-plane command handling from hot-path gaze delivery.
- Split replay capture/export assembly from live session mutation.
- Introduce contract tests for message names and payload shapes before adding more live features.
- Treat intervention execution, decision selection, session state mutation, and broadcast fanout as separate responsibilities.

**Detection:**
- Adding one feature touches transport, session state, export code, and UI contracts in the same change.
- Developers must understand `ExperimentSessionManager.cs` end-to-end to ship unrelated work.
- Bugs present as "researcher page change broke calibration" or similar cross-flow regressions.

### Pitfall 3: Realtime Coupling Between Participant, Researcher, Analytics, and Control
**Confidence:** HIGH

**What goes wrong:** One WebSocket pathway carries both high-frequency telemetry and experiment control, while browser-side computations become part of the experimental truth.

**Why it happens:** It is convenient to use one shared session channel and reuse frontend state to derive analytics, mirror behavior, and interventions.

**Consequences:** Latency and UI load start changing study behavior. Slow subscribers, hidden retry behavior, or a busy researcher tab can affect what the participant experiences or what the system records.

**Current repo warning signs:**
- `Frontend/src/lib/gaze-socket.ts` is a singleton transport for gaze, session state, participant viewport, reading focus, attention summaries, and intervention commands.
- `Frontend/src/modules/pages/researcher/current-live/index.tsx` computes token-attention state in the browser and pushes summaries back to the backend every 750 ms.
- `Frontend/src/modules/pages/reading/pages/ReadingPage.tsx` streams participant viewport and focus directly from the participant tab.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs` sends gaze samples to subscribers sequentially.
- `Backend/src/ReadingTheReader.WebApi/Websockets/WebSocketConfiguration.cs` forwards all inbound realtime messages into the same session manager.

**Prevention:**
- Treat researcher-derived analytics as optional derived telemetry, not canonical state.
- Define separate policies for hot-path telemetry and control messages, even if they share one socket initially.
- Add explicit timestamping and lag metrics for focus updates, interventions, and summaries.
- Make the participant session continue correctly if the researcher mirror disconnects.
- Add backpressure or drop strategy for high-rate telemetry instead of assuming the channel is lossless.

**Detection:**
- Sample rate, latency, or intervention timing changes materially when the live mirror is open.
- Attention summaries differ depending on browser/tab performance.
- Realtime bugs only reproduce with multiple connected clients.

### Pitfall 4: Missing Experiment Reproducibility and Provenance
**Confidence:** HIGH

**What goes wrong:** The system exports "data" but cannot reconstruct the exact stimulus, rule set, software version, calibration context, or operator actions that produced the result.

**Why it happens:** Teams mistake event capture for reproducibility. A replay export feels comprehensive until someone asks which intervention policy, calibration preset, content version, or build produced it.

**Consequences:** The thesis can demo a workflow but cannot defend experimental repeatability. Follow-up studies become hard to compare. External AI/provider integrations become impossible to evaluate fairly.

**Current repo warning signs:**
- `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/ExperimentReplayExportSerializer.cs` correctly serializes snapshots and event streams, but I did not find explicit version stamping for decision policy, intervention ruleset, frontend build, backend build, or git commit.
- `Backend/src/ReadingTheReader.WebApi/appsettings.json` keeps persistence repo-local by default, which is convenient but not provenance-rich.
- Shared payload contracts are manual, so replay compatibility can drift silently between `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionSnapshot.cs` and `Frontend/src/lib/experiment-session.ts`.
- `Backend/src/core/ReadingTheReader.core.Domain/Participant.cs` and `ExperimentSessionSnapshot.cs` capture participant and device context, but not enough explicit protocol metadata to answer "what exact study configuration ran?"

**Prevention:**
- Stamp every export with software version, schema version, intervention ruleset version, decision-provider identifier, calibration preset/version, reading-material content hash, and environment/device metadata.
- Keep replay format backward compatible and versioned.
- Record researcher-issued interventions and automated interventions in the same auditable structure, with source and reason required.
- Make "can this session be reconstructed well enough to defend?" a release gate for study phases.

**Detection:**
- You cannot answer "which exact configuration produced this export?" within one minute.
- Re-running a replay after a code change changes interpretation because payload semantics drifted.
- Study notes outside the system are required to interpret the export correctly.

### Pitfall 5: Privacy and Security Deferred Because the System Is "Local"
**Confidence:** HIGH

**What goes wrong:** Gaze data, participant demographics, exports, and device-license files are treated like ordinary dev data because the system is run by researchers on trusted machines.

**Why it happens:** Localhost-only development creates a false sense that privacy and access control can wait until "deployment."

**Consequences:** Sensitive personal data leaks through logs, source control, replay files, or anonymous endpoints. The project becomes harder to defend ethically, not just technically.

**Current repo warning signs:**
- `Backend/src/core/ReadingTheReader.core.Domain/Participant.cs` stores direct participant name plus demographics and eye-condition fields.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionSnapshot.cs` includes participant identity, device information, gaze state, and reading session state in the canonical snapshot.
- `Backend/src/ReadingTheReader.WebApi/ParticipantEndpoints/SetCurrentParticipant.cs` and `Backend/src/ReadingTheReader.WebApi/ExperimentSessionEndpoints/GetSavedExperimentReplayExportByIdEndpoint.cs` both use `AllowAnonymous()`.
- `Backend/src/ReadingTheReader.WebApi/Program.cs` calls `AddAuthentication()` and `AddAuthorization()` but configures no real scheme.
- `Backend/src/ReadingTheReader.WebApi/Websockets/WebSocketConfiguration.cs` accepts WebSocket connections without explicit auth or origin validation.
- Runtime-like artifacts already exist inside tracked repo paths, for example `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/licence/IS404-100106340114_licence` and `Backend/src/ReadingTheReader.WebApi/data/reading-material-setups/text1-2825c893.json`.
- `Frontend/src/lib/gaze-socket.ts` logs realtime payloads, and the backend logs request/message activity in multiple transport files.

**Prevention:**
- Treat gaze and participant data as sensitive from the start, even if the exact legal classification varies by use.
- Move operational storage and device-license material outside the source tree.
- Pseudonymize participant identity in exports by default; keep direct identifiers in a separate controlled mapping if needed.
- Add access control to control surfaces and replay export routes before any non-solo usage.
- Redact payload logs and document retention/deletion rules.

**Detection:**
- Study data or license files appear in Git status or the repository tree.
- A replay export is human-readable and directly names participants.
- Anyone who can hit the backend can control or download experiments.

### Pitfall 6: Interventions That Break Reading Continuity and Invalidate the Study
**Confidence:** MEDIUM-HIGH

**What goes wrong:** The system changes font size, width, spacing, palette, or other presentation variables in ways that disrupt placekeeping more than they support comprehension.

**Why it happens:** Adaptive systems often optimize for visible intervention effects instead of for maintaining reading rhythm and context.

**Consequences:** The experiment measures the cost of layout disruption rather than the benefit of adaptation. Researchers lose the ability to distinguish intervention value from intervention shock.

**Current repo warning signs:**
- The thesis requirements already identify this risk explicitly in `.planning/PROJECT.md`.
- `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ReadingInterventionRuntime.cs` allows live changes to reflow-driving presentation properties.
- `Frontend/src/modules/pages/reading/pages/ReadingPage.tsx` and `Frontend/src/modules/pages/reading/lib/usePreserveReadingContext.ts` show that context preservation is already an active concern, which means the pitfall is real, not hypothetical.

**Prevention:**
- Define intervention guardrails: max frequency, max magnitude, cooldown windows, and researcher override.
- Preserve token/block anchors before and after layout-changing interventions.
- Record intervention intent and effect separately so you can inspect whether the system caused disorientation.
- Prefer replay-based evaluation of continuity before enabling automatic intervention policies.

**Detection:**
- Readers lose position after an intervention.
- Replays show repeated oscillation between styles.
- Researchers cannot explain whether a reading slowdown was user difficulty or intervention side effects.

### Pitfall 7: Thesis-Scope Drift Into Generic Platformization
**Confidence:** HIGH

**What goes wrong:** The roadmap expands toward a generic experimentation platform, multi-tenant product, or broad adaptive-reading suite before the thesis-defensible core is stabilized.

**Why it happens:** Brownfield systems already look product-like, so it is easy to rationalize extra actors, new content formats, cloud deployment, or generalized study builders as "just one more useful capability."

**Consequences:** Time is spent on the wrong work. The thesis ends with many half-finished surfaces and too little evidence that the core architecture is actually strong.

**Current repo warning signs:**
- The repo already has setup, calibration, participant reading, researcher mirroring, interventions, replay, and exports. The remaining value is mostly in making these defensible and extensible.
- The out-of-scope guardrails in `.planning/PROJECT.md` are clear, but the architecture still has enough open seams that new work can easily masquerade as "extensibility."
- The single-session singleton design in `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionManager.cs` is acceptable for thesis scope if stated explicitly; it becomes a pitfall only if the team starts solving multi-session or distributed orchestration prematurely.

**Prevention:**
- Write a strict "not this thesis" list and enforce it in planning.
- Prioritize boundary hardening, reproducibility, validation, and documentation over new roles and surfaces.
- Prefer narrow extension interfaces over fully generalized tooling.
- Treat cloud, multi-study scheduling, participant self-service, native mobile, and in-repo AI training as backlog work unless they directly unblock thesis defense.

**Detection:**
- New phases introduce new actors or deployment topologies without improving the core thesis scenario.
- More effort goes into configurability than into experiment trustworthiness.
- A feature is justified as "future-proofing" but has no direct thesis validation value.

## Moderate Pitfalls

### Pitfall 1: Manual Contract Drift Masquerading as Flexibility
**Confidence:** HIGH

**What goes wrong:** Frontend and backend evolve independently, but the shared session and message schema are only synchronized by discipline.

**Prevention:** Add contract tests or generated/shared schema for the realtime and export boundary before expanding payloads further.

**Current repo warning signs:** `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/MessageTypes.cs`, `Backend/src/core/ReadingTheReader.core.Application/ApplicationContracts/Realtime/ExperimentSessionSnapshot.cs`, `Frontend/src/lib/gaze-socket.ts`, and `Frontend/src/lib/experiment-session.ts` are clearly parallel definitions.

### Pitfall 2: Hidden Hardware and Environment Assumptions
**Confidence:** MEDIUM

**What goes wrong:** Teams treat successful local demos or container builds as proof that the real hardware study stack is portable and stable.

**Prevention:** Separate "real Tobii-backed study environment" from "dev/demo environment" in docs, tests, and deployment assumptions.

**Current repo warning signs:** the repo already contains both real-hardware integration and local/mock-friendly tooling, while `.planning/codebase/CONCERNS.md` notes non-Windows degradation risk.

### Pitfall 3: Repo-Local Storage Becomes Operational Truth
**Confidence:** HIGH

**What goes wrong:** Runtime state, exports, licenses, and study artifacts accumulate inside the repository because it is convenient during development.

**Prevention:** Move study data to environment-level storage, keep only fixtures/sanitized samples in Git, and document import/export boundaries explicitly.

**Current repo warning signs:** `Backend/src/ReadingTheReader.WebApi/appsettings.json` points at `./data/...`, and runtime-like files already exist under `Backend/src/ReadingTheReader.WebApi/data/` and `Backend/src/infrastructure/ReadingTheReader.Realtime.Persistence/licence/`.

## Minor Pitfalls

### Pitfall 1: Replay-Ready Claims Without Replay-Path Tests
**Confidence:** HIGH

**What goes wrong:** The export/replay story sounds strong, but regressions are only caught manually.

**Prevention:** Add focused verification around replay compatibility, session-export integrity, and schema versioning before thesis evaluation.

### Pitfall 2: Demo Fallbacks Polluting Study Confidence
**Confidence:** MEDIUM

**What goes wrong:** Mock content or convenience defaults survive too close to real experiment paths and weaken confidence about what was actually tested.

**Prevention:** Keep demo fallback content clearly isolated from experiment-ready paths and make study-mode configuration explicit.

**Current repo warning signs:** `Frontend/src/modules/pages/reading/pages/ReadingPage.tsx` still contains `MOCK_READING_MD` fallback behavior, which is practical for development but should stay outside defended study runs.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Decision architecture | AI provider logic lands inside realtime orchestration | Create a narrow decision-provider interface first; ship manual and rule-based providers before any external AI integration |
| Intervention architecture | New intervention types widen `ExperimentSessionManager.cs` instead of staying modular | Keep intervention execution pure and isolated; make the session manager consume results, not compute them |
| Realtime hardening | Researcher mirror and participant flow remain one failure domain | Define control-vs-telemetry rules, add lag metrics, and verify participant continuity when researcher view disconnects |
| Export/replay | Exports remain replayable but not scientifically reproducible | Stamp protocol, build, content, and calibration metadata into every export |
| Privacy/data handling | "Local only" is treated as an excuse for anonymous control and repo-local sensitive files | Add access control, externalize storage, pseudonymize exports, and redact logs before external studies |
| Thesis validation | Roadmap favors breadth over defensibility | Stop adding surfaces when the core scenario is stable, reproducible, and explainable |

## Sources

- Google, "Rules of Machine Learning" - https://developers.google.com/machine-learning/guides/rules-of-ml
  - Confidence: HIGH
  - Used for: avoiding premature AI complexity, instrumenting baselines, and getting the pipeline right before sophistication.
- OWASP, "WebSocket Security Cheat Sheet" - https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html
  - Confidence: HIGH
  - Used for: auth/origin validation, message validation, rate limiting, and avoiding sensitive payload logging.
- MDN, "WebSocket: bufferedAmount property" - https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/bufferedAmount
  - Confidence: HIGH
  - Used for: the practical reality that queued WebSocket data can accumulate when sends outpace transmission.
- MDN, "WebSocketStream" - https://developer.mozilla.org/en-US/docs/Web/API/WebSocketStream
  - Confidence: HIGH
  - Used for: browser-level acknowledgement that classic WebSocket APIs do not inherently give stream backpressure semantics.
- The Turing Way, "Version Control for Data" - https://book.the-turing-way.org/reproducible-research/vcs/vcs-data/
  - Confidence: HIGH
  - Used for: provenance, data versioning, and reproducibility expectations for evolving research datasets and artifacts.
- ICO, "What is personal data?" - https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/personal-information-what-is-it/what-is-personal-data/
  - Confidence: HIGH
  - Used for: treating participant and gaze-linked study data as personal data requiring deliberate handling.
- ICO, "How do we process biometric data lawfully?" - https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/biometric-data-guidance-biometric-recognition/how-do-we-process-biometric-data-lawfully/
  - Confidence: HIGH
  - Used for: caution around biometric-style processing, explicit legal basis, and why "research use" does not remove governance obligations.
- Apple, "Eyes, Hands & Privacy" - https://www.apple.com/legal/privacy/data/en/eyes-hands/
  - Confidence: MEDIUM
  - Used for: industry privacy-by-design precedent that eye-input data should be tightly scoped and minimally exposed.
- Tobii, "Mean validation error explained" - https://connect.tobii.com/articles/en_US/Knowledge/Mean-validation-error-explained
  - Confidence: MEDIUM
  - Used for: why calibration/validation quality should be treated as a study-quality gate, not as setup ceremony.
- Tobii, "How do I calibrate with the Tobii Pro Glasses 2 API?" - https://connect.tobii.com/articles/en_US/Knowledge/How-do-you-calibrate-with-the-Tobii-Pro-Glasses-2-API
  - Confidence: MEDIUM
  - Used for: the broader point that eye-tracking studies depend on explicit participant/project/calibration linkage and calibration retry discipline.
