# Introduction Chapter — Writing Guide

> Reference this file before writing or editing any section of Chapter 1.
> It records the plan, available sources, and what each section must and must not do.

---

## Chapter role in the thesis

Chapter 1 is the funnel. It starts at the world-level problem, narrows to the project context, identifies the engineering gap, and ends with a precise preview of what this thesis contributes. It does **not** contain the final problem statement or formal RQs — those live at the **end of Chapter 2** (`sec:final-problem-statement`) after the literature review has motivated them fully.

The introduction must make a reader feel the problem is real *before* they read the evidence for it. Keep it forward-pointing: every claim should make the reader want to read the next chapter.

---

## Prior theses in the Reading the Reader project

These are the three predecessor MSc theses this work builds on. Cite them when describing the engineering gap.

| Key | Authors | Year | Focus |
|-----|---------|------|-------|
| `refsgaard2024rtr` | Refsgaard & Farooq | 2024 | Intelligent system for CVL typography |
| `pereira2024typography` | Pereira & Andrei | 2024 | Typography-adaptive interface for CVL |
| `palinec2024reactive` | Palinec | 2024 | Reactive frontend for dynamic ML |

All three: tightly coupled, not pluggable, cannot support systematic intervention comparison.

---

## Section-by-section plan

---

### 1. Motivation and Context (`01_motivation.tex`)

**Role:** Establish why this problem matters to the world, then zoom into the project.

**Three moves — one paragraph each:**

**Move 1 — The world-level problem**
Reading is a fundamental life skill; impaired reading affects participation in education, work, and daily life. Vision impairment (including CVL/AMD) affects hundreds of millions globally. Digital text is the dominant medium and also the most tractable place to intervene — you can change what the screen shows in real time in a way you cannot change print.

- Cite: `nnf2023rtr` (400 million figure), `kanonidou2011reading` (CVL effect on reading), `hakobyan2013mobile` (digital accessibility)
- Do NOT cite anything not already in `bibliography.bib`

**Move 2 — The Reading the Reader project**
The Reading the Reader initiative at DTU Compute, funded by the Novo Nordisk Foundation, aims to improve reading accessibility for people with impaired vision or cognition using eye-tracking and AI-driven typographic adaptation. CVL/AMD is the primary motivating condition. Prior MSc theses in this project (Refsgaard & Farooq 2024; Pereira & Andrei 2024; Palinec 2024) demonstrated that real-time, eye-tracking-based adaptation is technically feasible. Each delivered a working prototype.

- Cite: `dtucompute2025rtr`, `nnf2023rtr`, `refsgaard2024rtr`, `pereira2024typography`, `palinec2024reactive`

**Move 3 — The engineering gap**
Those prototypes, however, were tightly coupled: sensing, decision logic, and UI were intertwined. Adding a new intervention technique or replacing the decision strategy required extensive code changes. No prototype supported systematic comparison of interventions or the plug-in of external AI decision providers — both of which the broader project requires. This thesis proposes to close that gap by building a modular, researcher-operated platform with stable contracts between layers.

- Cite: `refsgaard2024rtr`, `pereira2024typography`, `palinec2024reactive`
- This move ends with one sentence bridging to the problem statement section.

**What NOT to do here:**
- Do not define fixations, saccades, oculomotor events — that is Chapter 2
- Do not list RQs — that is Section 1.3
- Do not discuss the DSR paradigm — that is Chapter 3
- Do not describe the system architecture in any detail — that is Chapter 5

---

### 2. Problem Statement (`02_problem_statement.tex`)

**Role:** State the initial, informal problem this thesis addresses. This is the *pre-literature* version. The refined, measurable final problem statement with sub-questions lives at the end of Chapter 2 and must be explicitly pointed to from here.

**Content:**
One opening sentence framing the problem space. Then the three core concerns as a short list or short prose:

1. **Modularity** — sensing, decision, intervention, and UI must be independently replaceable
2. **Experimentability** — researchers must be able to observe, override, and compare sessions
3. **Context preservation** — interventions must not disrupt reading flow

Close with: "The refined problem statement, decomposed into four measurable research questions, is presented at the end of Chapter 2 after the supporting literature has been established (Sec.~\ref{sec:final-problem-statement})."

**Available cites:** `dtucompute2025rtr`, prior theses for the coupling problem.

**What NOT to do:**
- Do not paste in the full formal problem statement from Ch.2 — just the informal framing
- Do not number the RQs here — that belongs in Section 1.3

---

### 3. Research Questions and Objectives (`03_research_questions.tex`)

**Role:** Preview the four RQs. These should match exactly what is in `sec:final-problem-statement` in Chapter 2 — same numbering, same wording.

**The four RQs (from `05_final_problem_statement.tex`):**

- **RQ1 (Modularity)** — Can sensing, analysis, decision, and intervention be separated into modules with stable contracts, such that a new intervention or decision provider can be added without modifying the core runtime?
- **RQ2 (Sensing pipeline)** — Can a real Tobii stream be converted into oculomotor events within a latency budget that preserves live adaptation?
- **RQ3 (Context-preserving intervention)** — Can typographic micro-interventions be committed at controlled boundaries so they adapt text while preserving the reader's context?
- **RQ4 (Researcher control and experimentability)** — Does the platform give the researcher the control and auditable record needed to operate experiments and compare strategies?

After listing them, add one sentence: these questions emphasise architecture and runtime feasibility over a controlled human-subjects effect study; the contribution is a defensible platform, not an end-to-end empirical result for any single intervention.

**Engineering objectives** (one per RQ): map each RQ to the concrete system capability that answers it:
- RQ1 → module boundary contracts (IEyeTrackerAdapter, IDecisionStrategy, intervention executor)
- RQ2 → Tobii adapter + fixation pipeline with latency logging
- RQ3 → context-preserving commit logic + RRT-observable instrumentation
- RQ4 → live researcher mirror + session replay + override controls

**Cites:** None required here; forward-reference `sec:final-problem-statement` and `ch:evaluation`.

---

### 4. Contributions (`04_contributions.tex`)

**Role:** A concrete, bulleted list of what this thesis delivers. These must be things you actually built and evaluated — no speculative future work.

**Suggested contributions:**

1. **A modular adaptive reading platform** — a researcher-operated system separating sensing, eye-movement analysis, decision strategy, and intervention execution into independently replaceable modules behind stable contracts
2. **A Tobii eye-tracking sensing pipeline** — a real-hardware integration that converts raw gaze samples into fixations, saccades, and regressions within a live reading session
3. **Context-preserving micro-intervention execution** — a commit mechanism that fires typographic changes at controlled reading boundaries and instruments recovery-observable metrics (Reading Resume Time proxy)
4. **Researcher workflow tools** — live session mirror, researcher override controls, and session replay with full gaze and intervention export
5. **An external provider contract** — a defined integration boundary that lets future AI-driven or rule-based decision providers plug in without modifying the core runtime
6. **A documented, deployable monorepo** — frontend (Next.js), backend (ASP.NET Core), and a mock decision provider with documentation sufficient for future contributors

**Tone:** use "we contribute" or "this thesis contributes", not "this thesis proves" or "this thesis shows that X is better than Y".

---

### 5. Scope and Delimitations (`05_scope.tex`)

**Role:** Pre-empt examiner objections. State clearly what is in and out of scope so the reader does not spend the thesis waiting for things that were never promised.

**In scope:**
- Tobii eye tracker integration (real hardware, Windows)
- Modular backend runtime with swappable decision strategies and intervention modules
- Markdown-only reading content
- Researcher-facing control and observation tools
- Architectural AI support (a pluggable provider contract), not end-to-end AI inference
- Evaluation of architecture properties (modularity, latency, intervention control, experimentability)

**Out of scope:**
- Built-in production AI inference or an ML model for reading state classification
- PDF as a reading format
- Clinical recruitment of CVL/AMD participants (lab sessions use general participants; see `subsec:central-vision-loss` in Ch.2)
- Broad productisation, multi-tenancy, or deployment beyond thesis scenarios
- A controlled human-subjects effect study measuring reading improvement

**Closing sentence:** these delimitations keep the thesis focused on the defensible, reproducible system whose architecture can be extended by future teams rather than on a single experimental outcome.

**Cites:** No citations needed here; forward-reference to `ch:evaluation` for what is evaluated.

---

### 6. Thesis Outline (`06_thesis_outline.tex`)

**Role:** One short paragraph per remaining chapter. Each paragraph states the chapter's purpose and its key contribution to the overall argument.

**Paragraph skeletons:**

- **Chapter 2 (Background & Related Work):** Surveys eye-tracking in reading, adaptive reading systems, the market landscape, and identifies three gaps. Closes with the refined problem statement and four RQs.
- **Chapter 3 (Methodology):** Positions the work within Design Science Research and the Double Diamond model. Describes the requirements elicitation process, development process, evaluation strategy, and ethical considerations.
- **Chapter 4 (Requirements):** Derives functional and non-functional requirements from stakeholder analysis and use cases. Introduces the domain model.
- **Chapter 5 (System Design and Architecture):** Presents the modular architecture — the four-layer closed loop, module contracts, data flow, and key design decisions.
- **Chapter 6 (Implementation):** Describes the monorepo structure, selected implementation highlights, and how the architecture is realised in code.
- **Chapter 7 (Evaluation):** Evaluates the system against RQ1–RQ4 through capability demonstration, calibration validation, and data export analysis.
- **Chapter 8 (Discussion):** Interprets the evaluation results, compares findings against related work, addresses limitations, and outlines future directions.
- **Chapter 9 (Conclusion):** Summarises the contributions and answers the research questions directly. Introduces no new content.

---

## Cross-cutting rules for this chapter

- Use **"we"** throughout (two-author thesis). Never "I".
- No em dashes in prose parentheticals — use `(...)` instead.
- No invented citations. Every `\cite{}` must exist in `bibliography.bib`.
- The final problem statement and formal RQs belong in **Chapter 2**, not here. Chapter 1 previews them; Chapter 2 earns them.
- Keep total length to **3–5 pages** in the compiled PDF. Introduction chapters are short.
- Follow the two-stage writing workflow (Stage 1: evidence scaffold; Stage 2: prose) for any section that requires citations.

---

## Available citations for this chapter

| Key | What it supports |
|-----|-----------------|
| `dtucompute2025rtr` | Reading the Reader project scope and goals |
| `nnf2023rtr` | 400 million figure; CVL as primary motivation; NNF funding |
| `refsgaard2024rtr` | Prior prototype; CVL focus; coupling problem |
| `pereira2024typography` | Prior prototype; coupling problem |
| `palinec2024reactive` | Prior prototype; coupling problem |
| `kanonidou2011reading` | CVL effect on reading performance |
| `hakobyan2013mobile` | Digital tools for visually impaired readers |
| `jensen2025context` | Context preservation; RRT metric; intervention design matters |
| `hevner2004designscience` | DSR paradigm (use sparingly in intro; detail in Ch.3) |

---

## TODOs flagged during planning

- [ ] Confirm the "400 million" vs "216 million" discrepancy: NNF page says 400 million (vision impairment broadly); earlier search said 216 million (moderate to severe). Pick one and verify against `nnf2023rtr` or a WHO source before writing.
- [ ] Decide whether to add a WHO citation for the global vision impairment statistic in Motivation (currently no WHO entry in `bibliography.bib`).
