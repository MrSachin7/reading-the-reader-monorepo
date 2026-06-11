# Thesis Revision Plan — "Stop underselling the platform"

Source: supervision meeting (feedback1.pdf + transcript). Two supervisors.
Core verdict: *the work is excellent, the report reads like a boring software
document and hides the contribution.* This plan fixes the **story**, the
**diagrams**, and the **coherency** — section by section, phase by phase.

---

## 0. The Narrative Spine (the ONE story everything hangs on)

Every chapter, figure, and paragraph must serve this. If a sentence doesn't, cut or move it.

**Problem.** Prior Reading-the-Reader prototypes proved gaze-driven adaptive
reading *works*, but each was a monolithic fork — a new study meant copying the
whole frontend and editing core code. No existing tool lets a researcher *both*
run a controlled reading experiment *and* adapt the **text itself** in real time
with interchangeable decision logic. Recorders (Tobii Pro, EyeLink) capture gaze;
experiment builders (PsychoPy, Psychtoolbox) script trials. **Neither does
real-time typographic intervention driven by pluggable AI/human decisioning.**

**Contribution (what we actually built — say this LOUD and EARLY).**
A modular, researcher-operated **adaptive reading platform** with **two coupled
surfaces**:
- **Participant screen** — reads Markdown; gaze is sensed; text adapts live.
- **Researcher console** — mirrors the participant's **live gaze feed** in real
  time and lets the researcher steer the session.

Joined by a real-time **closed loop** where an intervention can be:
1. **applied manually** by the researcher (one hand on the button), or
2. **proposed by a pluggable decision provider** — rule-based *or* external AI —
   that the researcher can **approve, override, or reject** (`Advisory` mode), or
   that **auto-applies** (`Autonomous` mode).

Everything is recorded to a single authoritative session record that can be
**exported, replayed, and re-imported** — closing the loop *across* sessions so
an external/AI provider can be fine-tuned on prior data.

**Why it's unique.** It is the only system in the landscape that combines
real-time **text intervention** + **pluggable decisioning (incl. external AI)** +
**researcher-in-the-loop control** + **full reproducibility (record/replay)**.

> Litmus test for the whole report: a reader who reads only §1.1–1.2 + the
> conclusion should understand the problem, the two-screen platform, and why
> it's new.

---

## 1. Terminology Lock (consistency — pick ONE word per concept)

Supervisor flagged mixed vocabulary ("interchangeable modules" vs "modular
architecture" vs "pluggable"). Agree on these and sweep the whole document.

| Concept | USE this | Don't use |
|---|---|---|
| The system | **the platform** / **adaptive reading platform** | "the app", "the tool", "the system" (loosely) |
| Replaceable unit | **module** (behind a **contract/port**) | "component", "pizza", "block" |
| Text change | **intervention** | "adaptation", "change", "modification" (interchangeably) |
| Pluggability | **pluggable / modular** (pick lead term, use consistently) | switching between both randomly |
| Who reads | **participant** (in study), **reader** (general concept) | mixing mid-sentence |
| Who runs it | **researcher** | "operator", "user" |
| Decision source | **decision provider** (rule-based / external) | "DCN", "AI", "model" loosely |
| Human-in-loop | **advisory mode**; **autonomous mode** | "manual"/"auto" without defining |
| Eye tracker | **eye tracker** (generic); Tobii = *an instance* | "Tobii" as if it's the only one |

---

## 2. Figure / Diagram Inventory (each figure = ONE message)

| # | Figure | Where | The single message | Action |
|---|---|---|---|---|
| F1 | Conceptual loop | Ch2 §key concepts | "RTR is a closed loop of replaceable modules" | Split into **(a)** the RTR adaptive-interface concept and **(b)** OUR pluggable-module interpretation. Label as **flowchart**. Reader = **person icon**, not a box. Show the external-provider seam. |
| F2 | **Two-screen hero figure (NEW)** | Ch1 or Ch5 | "Participant reads ↔ researcher watches live gaze & steers interventions" | NEW. The single most important figure. Participant screen + researcher console + live gaze feed + intervention button + external-provider feedback arrow. |
| F3 | C4 system context | Ch5 | "The platform, with a swappable eye tracker and a pluggable decision provider" | **Redraw.** Merge external decision provider **with the researcher** (human augments/overrides). Eye tracker = **interface between participant and platform**, inside the platform boundary, generic name. |
| F4 | Decision lifecycle (NEW) | Ch5 | "Propose → researcher approves/overrides/rejects → apply (advisory) vs auto-apply (autonomous)" | NEW. Maps to `DecisionProposalStatus` state machine + `DecisionExecutionModes`. |
| F5 | Cross-session data loop (NEW) | Ch5 | "Record → export → re-import → provider fine-tuning" | NEW. Sells the adaptive-over-time capability. |
| F6 | Real screenshots | Ch6 (+ reuse in Ch8) | "This is what it actually looks like" | Use existing `ResearcherLiveView.png`, `ReadingView.png`; add fixation-duration/AOI overlay if built. |
| F7 | Market comparison matrix | Ch2 §market | "Others record OR script; only we intervene + plug in AI" | NEW table (see Phase 2). |

Keep diagrams editable (TikZ is fine; or draw.io). Consider real monitor photos
of researcher + participant setup (other theses do this).

---

## Phased Work Plan

### Phase 0 — Foundations (do ONCE, before editing chapters)
- [ ] Lock the **narrative spine** (§0 above) — both authors agree on the exact contribution sentences.
- [ ] Lock the **terminology table** (§1) — this becomes the consistency checklist.
- [ ] Lock the **figure inventory** (§2) — assign each figure its one message before drawing.
- [ ] Draft the **explicit contributions list** (3–5 bullets) reused in Abstract, Intro, Conclusion.

### Phase 1 — Chapter 1 Introduction  *(highest leverage)*
Files: `Chapters/01_Introduction/{01_motivation,02_goal,06_thesis_outline}.tex`
- [ ] Add an explicit **"Our contributions"** paragraph/list in the first 1–2 pages (the two-screen platform, live gaze mirroring, manual + AI-driven interventions, advisory/autonomous, export/replay/re-import).
- [ ] Make the **"two ends" framing explicit** in motivation: researcher end + reader end, joined by a live loop.
- [ ] Reword the **4 goals** to outcome-first plain language:
  - keep *Modular architecture*, *Real-time sensing pipeline*
  - "Researcher experiment workflow" → **"A live researcher console to observe gaze and steer interventions in real time."**
  - "External decision-provider contract" → **"A pluggable decision boundary so AI/external strategies can drive interventions without touching the core."**
- [ ] Fix the **scope/limitations first sentence** — don't state the obvious ("it's a thesis"). Reframe: *"As a thesis-scale effort, the work is deliberately bounded: …"*
- [ ] **Thesis outline**: add the actual **chapter titles**, not just numbers.
- [ ] Add a one-line **AI-tooling transparency** note (full treatment in Methodology).

### Phase 2 — Chapter 2 Key Concepts & Related Work
Files: `Chapters/02_KeyConceptsAndRelatedWork/{01_key_concepts,02_related_work,03_market_landscape,04_gaps_opportunities,05_final_problem_statement}.tex`
- [ ] **Redraw F1** (concept loop) — two-version approach + person icon + flowchart label + external seam.
- [ ] **Expand eye-tracking-in-reading** — signal field depth (more than one citation; decades of work).
- [ ] **Expand reproducibility / context-preservation** — acknowledge it's a large active topic.
- [ ] **Anchor prior RTR theses explicitly** ("prior work [refs], incl. previous master's theses, did X; we provide an extensible platform").
- [ ] **Market landscape → matrix.** Split **hardware** (Tobii, EyeLink) vs **software platforms** (Tobii Pro/Fusion, **PsychoPy**, **MATLAB Psychtoolbox** — currently missing). Matrix columns: *record gaze · design experiments · analyze · real-time text intervention · pluggable/modular decisioning*. Our row is the only one with the last two.
- [ ] **Reframe RQs as "How might we …?"** so answers become demonstrations, not yes/no.

### Phase 3 — Chapters 4 ↔ 5 Coherency  *(Requirements → Design)*
Files: `Chapters/04_Requirements/*`, `Chapters/05_SystemDesign/*`
- [ ] **Establish the logical chain**: constraints/limitations (Tobii = Windows-only, no PDF, no AI impl) + requirements → **drivers** → architecture decisions. No reverse-justification.
- [ ] **Move architecture-flavored decisions OUT of Ch4** into Ch5 (e.g. tech-stack/App-Router justification).
- [ ] Ch4: add **prioritization rationale** for MoSCoW/FR/NFR — *why* each rank, tied to stakeholders/use cases (the missing "how did you validate these").
- [ ] Ch5: **redraw C4 (F3)** — merge actors, generic eye tracker, platform boundary.
- [ ] Ch5: **explain researcher mode thoroughly** — the one-button + advisory feedback + override story.
- [ ] Ch5: **expand "decision" and "request" semantics** — what a decision *is*, how the provider makes it (rule-based now; external AI / pre-trained / KMK-style classifiers as the seam).
- [ ] Ch5: **add F4** (decision lifecycle: advisory vs autonomous) and **F5** (export/re-import cross-session loop).
- [ ] Ch5: **tech-stack section** — state the real reason (familiarity) + brief alternatives table (Python/Vue/Flutter); drop premature App-Router justification.

### Phase 4 — Highlight contribution in Implementation / Evaluation / Discussion
Files: `Chapters/06_Implementation/*`, `Chapters/07_Evaluation/*`, `Chapters/08_Discussion/*`
- [ ] Ch6: **lead the highlights** with the two-screen live system + manual/AI intervention path; use real screenshots (**F6**).
- [ ] Ch7/8: report against the **"how might we" RQs**; bring screenshots into Discussion; report the **latency NFR2** measured value (≤100 ms).
- [ ] Address technical eye-tracking asks (also in `todo.md`): state the **I-AOI** method explicitly (not I-VT/I-DT), report threshold constants, and consider **fixation-duration display** + **AOI bounding boxes per word** for the researcher view (low priority, only if cheap).

### Phase 5 — Whole-document consistency & polish  *(LAST)*
- [ ] **First-sentence audit** — every section/paragraph leads with its gist.
- [ ] **Terminology sweep** against §1 table.
- [ ] **Rewrite Abstract + Conclusion last** to reflect the locked spine.
- [ ] **5 Cs check**: Complete, Concise, Clear, Concrete, Correct.

---

## Suggested order
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5.
Phases 1–3 carry the most weight (they fix the framing the rest inherits).
Send the revised draft to supervisors ~weekly; a follow-up meeting is already booked.
