# Supervision Meeting 2 — Deep-Dive Analysis

**Source:** `feedback2-transcript.md` (chapter-by-chapter walkthrough of the full draft).
**Date:** ~2026-06-18. **Hand-in:** 2 July 2026. **Possible defense:** 3 July (or ~2 weeks later).
**Companion docs:** the feedback-1 distilled plan lives in `../revision-plan.md`; technical TODOs in `../todo.md`. This file does **not** duplicate them — it records what meeting 2 added, what it *repeated*, and exactly how to close each item.

---

## 0. One-paragraph verdict

The work is strong and the supervisors said so repeatedly ("your design makes a lot of sense", "it's nice that you use C4", "this is nice to have for the next students"). The problem is **not** the system and **not** the report's skeleton — it is that the *explanation* is harder to follow than the thing it explains. Meeting 2 is, at its core, **one meta-concern wearing many hats: consistency**. The same concept appears under different names and different drawings in different chapters, so a reader (especially the external examiner) cannot tell whether two boxes are the same thing or two different things. Everything below is either (a) a specific instance of that, (b) a "you under-sold / under-explained a strength" instance, or (c) a stub chapter that simply has not been written yet. A second, independent theme from both supervisors: the architecture diagrams are **system-centric, not user-centric** — the participant and researcher (the whole point of the platform) are pushed to the margins while the boxes take centre stage.

> **The single highest-leverage fix:** draw **one** complete master diagram of the platform with the **participant and researcher at the centre** and the eye tracker drawn as the *interface between participant and platform* (not a separate external box). Then crop/zoom that one master into every per-chapter view so terminology and shapes are guaranteed identical. Both supervisors proposed exactly this, independently.

---

## 1. What was satisfactory (preserve these — do not "fix" them)

Record these so revision does not accidentally regress them, and so they can be re-used as defense talking points.

- **The report structure / IMRAD skeleton is right.** "It has the right structure… if you follow through with what you set out to do it'll have the part that needs to be there."
- **The C4 approach** to the architecture views was explicitly liked ("nice that you are using C4 module").
- **The implementation walkthrough spine** (`06_Implementation/02_session.tex` → `03_highlights.tex`) hits the right altitude: a supervisor confirmed that given this report someone could "go in and add functionality or figure out what happens where." Keep the "one flow, then guide where the code belongs" approach. Hiding bodies behind `Finish…Async` and pointing to where the real work happens is the correct level of abstraction, not a gap.
- **The checkpoint/recovery system** (incremental checkpointing so an abrupt end still leaves data) landed well.
- **The supplementary website / protocol guide idea** was liked — a screenshot + link at the end of the Implementation chapter "for the next students" is encouraged.
- **The gaze line-stabilisation intuition is correct** ("your intuition is correct") — see §6.
- **The AOI-survives-reflow behaviour is already implemented and is a strength** (see §6.3) — it is documented in `lst:impl-tokenmap` (FR5.4). This is a "we already solved your concern" point, not a fix.
- **Placement of "Anatomy of an Experiment Session" in Implementation** was accepted as a "good choice" after discussion (with one caveat — see §5.4).

---

## 2. The master concern: terminology + diagram consistency 🔴 P1

This is the spine of the whole meeting and a **direct repeat of feedback 1** (`revision-plan.md` §1 "Terminology Lock" already flagged it). It resurfacing means it has not yet landed. Below is the concrete evidence from the actual figures, which is what makes it defensible to fix.

### 2.1 The same concept is named 4–5 different ways

| Concept | Where it appears | Name used | File |
|---|---|---|---|
| The external decision/AI seam | Fig 5.1 (context) | **External Decision Provider** | `05_SystemDesign/02_approach.tex` |
| " | Fig 5.2 (containers) | **External Decision Provider** | same |
| " | Fig 5.3 (two-screen hero) | **External decision provider** | `05_SystemDesign/two-screen-hero.tikz` |
| " | Fig 5.4 (decomposition) | **External strategy** (analysis) / **External provider** (decision) | `05_SystemDesign/03_decomposition.tex` |
| " | Use-case diagram | **External Module Provider** | `04_Requirements/03_use_cases.tex` |
| The backend | Fig 5.2 | **Backend Application Host** | `02_approach.tex` |
| " | Fig 5.3 | **Backend core / real-time loop** | `two-screen-hero.tikz` |
| " | Fig 5.4 | **Domain** + **Reading Runtime (Application)** | `03_decomposition.tex` |

The supervisor's exact words: *"Here it's called external system provider, but then decision requests… where can I see the back end core? He has called it backend application host… it cannot be the same thing, it must be something else, right?"* That is the reader's reflex when names drift — they assume two names = two things.

**What was the idea.** Each diagram was drawn for its own section in isolation, optimising the label for local clarity. Individually each is fine; together they collide. There *is* a real distinction hiding in the mess (a **module provider** is the general out-of-process framework that can serve *either* an analysis *or* a decision module; a **decision provider** is the special case serving the decision port) — but the diagrams blur it instead of teaching it.

**What to fix / how:**
1. Adopt the locked vocabulary from `revision-plan.md` §1 and **sweep all four figures + the use-case diagram**:
   - Decision seam in the architecture views (5.1/5.2/5.3) → **"External Decision Provider"** everywhere.
   - The general framework actor (use cases, decomposition rim) → **"External Module Provider"**, and add **one sentence** where both first co-occur: *"A decision provider is a module provider that serves the decision port; the same out-of-process framework also serves the analysis port."* This turns the inconsistency into a taught distinction.
   - Backend → pick **one** of "Backend Application Host" / "Backend core". Recommend **"Backend (application core)"** and use it in 5.2 and 5.3 identically. Drop "Reading Runtime (Application)" as a *third* name in 5.4, or footnote it as the same thing.
2. **"Domain" in the centre of Fig 5.4** drew a direct question ("why is it domain? why not something else?"). Either label it **"Application core (domain + runtime)"** or add a one-line note in the caption defining "domain" = the core entities (`GazeData`, `ExperimentSession`, …). Do not leave a bare word the examiner has to guess.

### 2.2 Relationship labels disagree (and the simpler one is wrong)

Fig 5.1/5.2 label the provider edge **"decision requests"**; Fig 5.3 labels it **"context / proposals"**. The supervisor's point was sharper than "inconsistent": *"isn't it actually a double flow? Something flows to this provider in real time, and a command comes back. It's not a request, it's sending insights, and a command comes from there."*

**The mistake:** "decision requests" implies a one-shot request/response and **undersells the bidirectional, streaming nature** of the seam (context/insights stream **out** continuously; proposals/commands come **back**). The hero figure (5.3) already gets this right ("context / proposals"); 5.1/5.2 lag behind.

**Fix:** make 5.1/5.2 match 5.3 — label the seam **"context → / ← proposals"** (or "context out / decisions in") with a genuine bidirectional arrow, everywhere.

### 2.3 The fix that makes consistency automatic

Both supervisors proposed it: **draw one complete master figure, then crop it.** A "June?/draw it" moment in the transcript and the second supervisor's *"make one whole big picture… then you can take parts of it and explain further where you need it"* are the same suggestion. Doing this once removes the entire class of bug because every per-section figure is literally a sub-region of the same canvas.

---

## 3. User-centric architecture (the eye tracker is an interface, not a box) 🔴 P1

Both supervisors hit this hard and **independently** — strongest signal of the meeting. It is also a **partial repeat of feedback 1** (`revision-plan.md` F3: "Eye tracker = interface between participant and platform; merge decision provider with the researcher"). The current Fig 5.1 took *some* of that advice (person icons, generic "Eye Tracker" name) but **kept the symmetric four-box layout**, so the core objection stands.

**Current state (`fig:design-context`, `02_approach.tex:46-54`):** four equal external boxes at the four corners — Researcher (top-left), Participant (top-right), Eye Tracker (bottom-left), External Decision Provider (bottom-right) — all wired symmetrically to a central platform box.

**What the supervisors said:**
- *"There are two kinds of people: those who draw the system in the centre, and those who put the user in the centre. Here the user is just some random component we don't care about."* → be **user-centric**.
- The **eye tracker is the sensing interface between the participant and the platform**, not a peer external system: *"I-tracker is the interface between researcher and participant and the system… these are connected lines."* The 2nd supervisor: *"it should be here, as an interface between participant and the model, not as a separate thing."* Suggestion: draw a rectangle labelled "eye tracking" sitting **on the participant→platform link**, whose output also feeds the researcher.
- The **external decision provider is not fully external** — *"you define the API, there's a well-defined API you provide"* — and it is **coupled to the researcher**, who augments/overrides/approves its proposals. Consider associating it with the researcher rather than floating it as a stranger.

**Why it matters (defense risk):** the diagram silently signals that the architecture, not the human reading experience, is the thesis's centre of gravity. That is the *opposite* of the contribution you are trying to sell (a researcher↔participant adaptive loop).

**What to fix / how:**
1. Redraw the system-context view (Fig 5.1) **user-centric**: participant and researcher prominent (person icons already exist); the **eye tracker drawn on the participant→platform edge** as the sensing interface (it both *senses the participant* and *feeds the researcher's mirror*), inside or straddling the platform boundary rather than as a fourth corner box.
2. Keep the eye tracker **generic** ("Eye Tracker", Tobii as *an instance*) — already done, keep it.
3. Show the decision provider's **well-defined API** explicitly (it is part of *your* work) and draw its proposals as flowing *through the researcher's control* in advisory mode (approve/override/reject), which is precisely the unique selling point.
4. Reconcile with Fig 5.3 (hero) which is already the most user-centric of the set — a supervisor said *"if you want two drawings, this one (the hero) would be better than the other one."* Consider promoting the hero to the lead architecture figure and demoting/merging the four-box context view.

---

## 4. Diagram hygiene: arrows, legends, captions 🟠 P2

### 4.1 Arrow semantics in Fig 5.2 are ambiguous

The container diagram (`02_approach.tex`) mixes three arrow styles: navy bold (`chan`/`chanbi` = REST/WebSocket), thin grey (`flow` = "operates", "reads", "raw gaze", "checkpoints"), and dashed red (`extseam`). The legend decodes only the navy and dashed ones; the **grey arrows and the single-vs-double-headed distinction are unexplained**.

- Supervisor on single vs double heads: *"the difference is single vs double arrow… one-direction vs two-direction communication."* Student clarified it's really **who can initiate**. Supervisor agreed and noted request/response is *also* two-way, so "one-way/two-way" is the wrong mental model. → **Relabel the legend to "arrow direction = who initiates"** (or similar), not communication directionality.
- Supervisor on grey arrows: *"the rule is, if you don't need it, kill it. If there's no meaningful difference between a thin grey arrow and a bold one, just remove the distinction."*

**Fix:** (a) add the grey "incidental I/O" style to the legend **or** restyle those edges to match so there is no unexplained third class; (b) reword the legend so the arrowhead distinction means **initiation**, not direction; (c) apply the same arrow conventions identically across 5.1–5.4 (Fig 5.4 uses plain inward arrows with no legend tie-in to the others).

### 4.2 Captions: font size and length 🟠 P2

Two concrete, universal asks:
1. **Caption font must be one step smaller than body text.** Currently captions render at body size. Fix globally in `Setup/` via the `caption` package: `\usepackage[font=small,labelfont=bf]{caption}` (or `footnotesize`). One line, fixes every figure at once. *(Note: `CLAUDE.md` §2.5 says do not edit `Setup/` without asking — so flag this one-liner to the team, then apply.)*
2. **Captions are far too long** — they currently carry explanation that belongs in the body. Supervisor: *"captions should be guidance to the figure… explain what to expect in the main text, not a huge number of sentences in the caption."* Worst offenders: `fig:design-containers`, `fig:design-twoscreen`, `fig:impl-gazemap`, `fig:impl-context-decision` — each is a full paragraph. **Move the explanatory prose into the section body where the figure is referenced; leave the caption to name the graphical elements only** (a sentence or two, ending in a period per `CLAUDE.md` §2.4).

This also helps the "every figure must be discussed in the body" rule (`CLAUDE.md` §2.4) — moving caption prose into the body satisfies both at once.

### 4.3 Real screenshots alongside schematics 🟢 P3

Supervisor liked the idea of showing the **real two-screen situation** (researcher view + participant view photos/screenshots), not only schematics, and noted other theses do this. Screenshots already exist (`06_Implementation/screenshots/ResearcherLiveView.png`, `ReadingView.png`). Per `CLAUDE.md`, screenshots come from the user and are the permitted raster exception. **Action:** reuse those in the Discussion / a UI gallery, and consider a real-setup photo of the two-monitor rig.

---

## 5. Long / multi-concept section titles 🟠 P2

The 2nd supervisor: a title you cannot name with one phrase is usually two sections (the same smell as a function that "does X and also Y"). Concrete hits, all verified in the source:

| Current title | File | Problem | Suggested fix |
|---|---|---|---|
| **5.2 Architectural Approach and System Overview** | `05_SystemDesign/02_approach.tex:1` | two ideas joined by "and" | split: **Architectural Approach** + **System Overview** |
| **5.6 Extensibility, the Provider Seam, and Researcher Control** | `05_SystemDesign/06_extensibility.tex:1` | **three** concepts in one title | either one umbrella term, or split into 3 subsections (provider extensibility / the seam / researcher control) |
| **7.4 Experimentability and Developer Experience** | `07_Evaluation/07_Evaluation.tex:16` | two ideas joined by "and" | split into two subsections |

**Why it matters:** titles are the reader's table-of-contents cues; the examiner skims them to build a mental map. Crisp single-concept titles = a navigable report.

---

## 6. Technical eye-tracking depth (the part that will be probed in defense) 🔴 P1 / 🟠 P2

The 2nd supervisor is an eye-tracking person and went deep. These are **defense-critical** because they exposed at least one *uncertain/incorrect* live answer. Get the facts straight and write them down.

### 6.1 Fixation detection method: it is I-AOI, NOT I-DT or I-VT 🔴 P1

**What happened (risk):** asked "IVT or IDT?", the student answered *"It should be something like IDT. I guess so."* — **uncertain and not accurate.** Then, asked about a **velocity threshold**, the student said *"we explain that somewhere… we're planning to but I don't think we will"* — implying a velocity threshold that **does not exist**.

**The truth (from the code, already in `todo.md`):** detection is **dwell/area-of-interest based — I-AOI** in the Salvucci & Goldberg (2000) taxonomy, *not* dispersion (I-DT) and *not* velocity (I-VT). Two stages:
1. front-end hit-tests the gaze point against rendered word boxes to resolve a token (`useGazeTokenHighlight.ts`, `lst:impl-tokenmap`);
2. backend thresholds **dwell time** per token into fixations/saccades (`BuiltInEyeMovementAnalysisStrategy.cs`, `lst:impl-saccade`), thresholds **90 ms initial / 70 ms same-line / 135 ms new-line** (+ skim 45 / fixation 130 ms).

**There is no velocity threshold.** The honest, correct line is: *"we use dwell-time thresholds on AOI hits, i.e. the I-AOI branch, not a velocity criterion."*

**Fix:**
- Write the I-AOI choice **explicitly** in System Design and/or Implementation (`todo.md` already has this as an item) — name the taxonomy, name the branch, justify it (AOI maps gaze straight to words, which is exactly what the decision layer consumes), and report the real threshold constants.
- **Both authors rehearse this answer** so the live answer in the defense is "I-AOI / dwell-based, here are the thresholds" — never "I guess IDT."
- Do **not** claim a velocity threshold anywhere.

### 6.2 The gaze line-bias is a "poor man's Kalman filter" — own it in the Discussion 🟠 P2 (high value)

**What was the idea.** In `pickBestLine` (`lst:impl-tokenmap`) a sample is charged for vertical distance to each line band, and the line *already being read* gets a fixed **−24 discount** (hysteresis), so vertical jitter on the order of line spacing does not flicker the mapping to a neighbouring line. The student described this as "we add a bias to the current line."

**What the supervisor did with it.** He recognised the intuition as a **Kalman-filter-like** idea (predict from prior state + weigh the uncertainty of the new measurement + update), gave the GPS-on-a-road analogy, and said the framing is *"perfect"* for the Discussion: *"you can say we implemented a Kalman-filter-ish version, and discuss it."* He affirmed *"your intuition is correct."*

**The nuance (be honest):** it is **not literally a Kalman filter** — there is no probabilistic state model, no covariance, no predict/update cycle. It is a **deterministic hysteresis/bias heuristic** that shares the *intuition* (use the prior position to disambiguate a noisy current point). Claiming it *is* a Kalman filter would be wrong; claiming it is a lightweight stand-in that a Kalman filter would generalise is exactly right.

**Fix (Discussion + Future Work, `08_Discussion.tex`):**
- Lessons learned: *"our line-stability mechanism is a hand-tuned hysteresis bias; conceptually it approximates the role a Kalman filter plays — exploiting temporal continuity to reject single-sample noise — without its probabilistic machinery."*
- Future work: *"a Kalman filter over the gaze signal would replace the hand-tuned constants with a principled uncertainty model and is a natural next step."*
- This is free, high-quality reflective content the examiner has *already told you he wants to hear*. Capture it now.

### 6.3 AOI under interventions — already solved, say it louder 🟢 P3 (turn into a strength)

**The question:** if an intervention changes font size/family/spacing, does the per-word AOI mapping break (since boxes are computed in pixels)?

**The answer is YES, it is handled** (and it is a genuinely good piece of engineering): word boxes are **re-measured from the live DOM on every mutation, resize, and scroll** (FR5.4, `lst:impl-tokenmap` Stage 2 comment + `03_highlights.tex:203`). So after a reflow the mapping uses fresh coordinates, not stale ones.

**Fix:** make this explicit and prominent in the sensing-pipeline prose (it is currently one clause). It directly answers an examiner question and demonstrates the system survives its own interventions — a selling point, not a footnote. *Caveat to verify before claiming:* this handles **layout reflow**; if you ran on a **different display/resolution**, normalisation (FR4.2) covers the gaze coordinates, but confirm the box re-measurement is resolution-independent end-to-end before asserting it.

### 6.4 Fixation duration + per-word AOI overlay for the researcher view 🟢 P3 (optional)

Supervisor asked whether the researcher view could show **fixation duration per word** and **AOI bounding boxes** (useful for KMK collaboration on reading-pattern extraction). The data exists (dwell time is what the detector thresholds on). Explicitly marked **low priority** by the supervisor ("don't spend your time on it, but if it's possible it would be nice"). Only do this if cheap; otherwise note it as future work / collaboration hook. Already in `todo.md`.

---

## 7. Requirements ↔ evidence: show the iterative refinement 🔴 P1

**The concern.** The user stories (`04_Requirements/02_user_stories.tex`) currently say they "were elicited through a series of structured discussions" — but there is **no evidence of the process**. The supervisor wants traceability of the *narrative arc*: *"this part needs some evidence… not pages and pages, but a table — we had ~5 sessions, you built something, we gave feedback, it led to new requirements."* He gave concrete examples of requirements that *emerged from iterations*: **run without a license**, the **webcam/face component**, etc.

**What was the idea.** The current text states the *outcome* of elicitation (the stories) but skips the *evidence* that they came from a real, validated, iterative process with the stakeholders (= the supervisors themselves). The supervisor explicitly does **not** want meeting minutes ("not Monday afternoon"), just enough to show the decisions are grounded, not invented.

**Why it matters.** "There's a narrative arc in all theses… we made this decision based on some method and some evidence; somebody wanted this." Without it, requirements read as if the authors just decided what felt important.

**What to fix / how:**
- Add a short **refinement / validation table** to Ch4 (or Ch3 Methodology where elicitation is described): columns ≈ *Iteration · What was demoed · Feedback · Resulting requirement change*. 4–6 rows covering the real arc (e.g. "license-free operation" → FR/NFR; "webcam sensing mode" → FR17; etc.).
- One paragraph framing it as a **build→demo→feedback→refine** cycle across ~5 stakeholder sessions.
- Add **MoSCoW / FR / NFR prioritisation rationale** (`revision-plan.md` Phase 3 already lists this) — *why* each rank, tied to stakeholders/use cases. This is the "how did you validate the priorities" gap.
- This connects to the existing meeting cadence — the supervisors confirmed "we've had regular meetings", so the evidence is real; it just needs to be on the page.

---

## 8. Backend / frontend specifics + the Tobii SDK interface 🟠 P2

**The concern (2nd supervisor).** He could not find clear, headlined coverage of the concrete stack: *"for front-end I see JavaScript, React… but nothing about the SDK, the screen, the resolution. And how do you extract data from the eye tracker — did you make a communication interface with the SDK?"* He asked for **dedicated topics/headlines** for backend and frontend so the reader can follow.

**What was the idea / current state.** The selection *rationale* lives in `05_SystemDesign/07_decisions.tex` (`tab:technology-selection`), and `todo.md` already tracks "Ch6 must document the concrete stack" (versions: Next.js 16, React 19, TS 5, .NET 10, Bun 1.3; libs: RTK Query, Tailwind v4, FastEndpoints 8, CsvHelper 33, Tobii.Research.x64 1.11; CI). The Tobii geometry *is* shown in `lst:impl-validation`, and acquisition in `lst:impl-hotpath` — but there is **no clearly-headlined "how we talk to the Tobii SDK" section**, and screen/resolution handling is implicit.

**What to fix / how:**
- In Ch6, add explicit subsections (clear headlines) for the **concrete stack** and for the **Tobii SDK integration / sensing adapter** — how `TobiiEyeTrackerAdapter` subscribes to the SDK's gaze callback, what it receives, how it normalises to the `GazeData` contract, and the licensing/device-detection path. This is the "communication interface with the SDK" the supervisor asked to see named.
- Document **screen / resolution assumptions**: how gaze is normalised (FR4.2), the second-screen setup, and any resolution dependence (ties to §6.3).
- Keep selection *rationale* in Ch5; put concrete *realisation* (versions, libs, CI) in Ch6 — that division is already the plan, just execute it with visible headings.

---

## 9. The stub chapters: Evaluation (Ch7) and Discussion (Ch8) 🔴 P1

Both are skeletons (section headers only). The supervisor gave a detailed brief for each — treat the transcript as a spec.

### 9.1 Evaluation (`07_Evaluation.tex`)

- Supervisor: *"why does it actually work? what methodology?"* He framed it as a **V-model**: unit testing → integration testing → functional/system testing → performance testing, **plus** requirement-by-requirement verification and **walkthroughs** ("walks and white-box walks"). He *liked* the plan to verify every requirement.
- The **NFR2 latency budget (≤100 ms)** is set (`todo.md`); the Evaluation must **report the measured value** against it. Same for calibration accuracy/precision (real-hardware numbers, referenced from `lst:impl-validation`).
- Split **7.4 "Experimentability and Developer Experience"** into two (see §5).
- Keep results **descriptive here** (what the data show); interpretation goes to Discussion (`CLAUDE.md` §2.6 "separate result from interpretation").
- **Honesty rule (`CLAUDE.md` §1.1):** do not invent measurements. Where a number isn't taken yet, `\todo{verify N}` and measure it before hand-in.

### 9.2 Discussion (`08_Discussion.tex`)

The supervisor's brief, almost verbatim — this is the chapter that **sells the contribution**:
- **80% achievements / 20% limitations.** *"It's important that you actually discuss what you achieved."* Most of the chapter is what worked.
- **Answer the problem statement directly:** "you said you'd do X, Y, Z — did you?" — at a higher level than per-requirement.
- **Connect to related work:** *"this is the point where you connect to related work — we did this; earlier work did something else; ours differs because…"* (the §2 comparison matrix from `revision-plan.md` feeds this).
- **Discuss design choices** (good *and* bad): e.g. the line-bias-vs-Kalman reflection (§6.2), the tech-stack-by-familiarity choice, the file-store-vs-DB choice.
- **Limitations + future work** last: license/Windows-only (C3), no PDF, AI architectural-only, Kalman filter, fixation-duration overlay, regression detection (`todo.md`).

---

## 10. Smaller / repeat items

- **Section title for 5.4's "Reading Runtime (Application)"** — yet another name for the core; fold into the locked vocabulary (§2.1). 🟠
- **Numbering 1–4 on the four-module diagram** drew a "is there an order?" question. There *is* a logical dependency (sensing→analysis→decision→intervention) even if the *ports* are symmetric. Either (a) keep the numbers and add a caption clause "numbers indicate the data-flow order of one cycle" (already partly there — `fig:design-modules` caption) **and draw the pipeline dependency arrows between the ports**, which the supervisor explicitly wanted (*"without sensing there's no analysis…"*); or (b) drop the numbers if you want to stress symmetry. Pick one and make the arrows match the claim. 🟠
- **"Built-in / rule-based strategy" appears in Fig 5.4 but not in the earlier figures** — another consistency gap; make sure the built-in vs external duality is visible (or at least consistent) across the set. 🟠
- **Use-case actor verbs ("operates", "reads") don't match the design-diagram vocabulary ("mirror", "fixations", "approve/apply")** — align so the examiner can trace a use case to its architecture. The supervisor noted the use-case keywords "must be something new" because they don't recur. 🟠
- **Hyphenation glitches** ("Ex-periment" in use-case diagram, "Deci-sion Provider" in Fig 5.1, "im-plementation" in Fig 5.6) — already in `todo.md`; widen nodes or `\mbox{}`. 🟢
- **Declaration of Generative AI use** — supervisor reminded *again* ("you used Claude… make a whole section"). Forward refs exist; populate `Backmatter/Appendix.tex` `tab:gai-tools` (`todo.md`, `CLAUDE.md` §1.4). 🟠
- **"Anatomy of an Experiment Session" title** (`02_session.tex`) — accepted as Implementation content, but the supervisor noted the headline *could* be misread as "what an experiment is" (which would belong earlier). Optional: a one-line opener clarifying it describes the *implemented* flow. 🟢

---

## 11. What is a REPEAT of feedback 1 (these must not slip a third time)

Meeting 2 re-raised several feedback-1 items that haven't fully landed. The fact they came back is the signal — prioritise them.

| Item | Feedback 1 (`revision-plan.md`) | Status after meeting 2 |
|---|---|---|
| Terminology consistency (one word per concept) | §1 Terminology Lock | **Still violated** across Figs 5.1–5.4 + use cases (§2) |
| Eye tracker = interface, not box; merge provider with researcher | F3 redraw | **Partially done** (icons/generic name) but four-box layout remains (§3) |
| Sell the contribution; Discussion connects to related work | Phase 4 | **Pending** (Ch8 still a stub) (§9.2) |
| Market comparison matrix (PsychoPy/Psychtoolbox) | Phase 2 | Not verified done — needed for Ch8 comparison |
| I-AOI method stated explicitly | Phase 4 / `todo.md` | **Still not written**; live answer was wrong (§6.1) |

---

## 12. Prioritised action checklist

**🔴 P1 — defense-critical, do first**
- [ ] Draw **one master platform diagram** (participant + researcher centred; eye tracker as the sensing interface; provider API coupled to researcher), then crop it into per-section views. (§2.3, §3)
- [ ] **Terminology sweep** across all figures + body: one name per concept; reconcile decision/module provider with a taught distinction; one backend name; define/rename "Domain". (§2)
- [ ] Write the **I-AOI** method explicitly; report real thresholds; **kill any implied velocity threshold**; both authors rehearse the answer. (§6.1)
- [ ] Add the **requirements refinement/validation table** + prioritisation rationale. (§7)
- [ ] Draft **Evaluation** (V-model + per-requirement verification + measured NFR2 latency + calibration numbers). (§9.1)
- [ ] Draft **Discussion** (80/20, answer the problem statement, related-work comparison, design-choice reflections incl. Kalman). (§9.2, §6.2)

**🟠 P2 — should-fix before hand-in**
- [ ] Fix arrow/legend semantics in Fig 5.2 ("who initiates", kill meaningless grey distinction); unify arrow conventions 5.1–5.4. (§4.1)
- [ ] Caption font one size smaller (one-line `Setup/` change — flag to team) + **shorten every caption**, move prose to body. (§4.2)
- [ ] Split long titles 5.2, 5.6, 7.4. (§5)
- [ ] Add headlined **backend/frontend + Tobii SDK integration** subsections in Ch6; document screen/resolution. (§8)
- [ ] Pipeline dependency arrows + consistent built-in/external on Fig 5.4. (§10)
- [ ] Populate the **Generative-AI declaration** appendix. (§10)

**🟢 P3 — nice-to-have / opportunistic**
- [ ] Real two-screen screenshots/photos in Discussion/gallery. (§4.3)
- [ ] Make the AOI-survives-reflow strength explicit + verify resolution-independence. (§6.3)
- [ ] Fixation-duration / per-word AOI overlay for researcher view (only if cheap). (§6.4)
- [ ] Hyphenation fixes; "Anatomy…" title opener. (§10)

---

## 13. Defense logistics (not a report fix — but plan around it)

- **Timeline:** hand-in **2 July** (midnight). Defense possibly **3 July** (day after) if the usual external examiner is available before his vacation, otherwise **~2 weeks later**. Supervisor will propose a date; being flexible to a slightly later slot buys prep time. (One author is working from August / wants to travel — flagged; not a blocker.)
- **Format (2-person):** ~**25 min presentation** + a few min **demo** (live or screen recording showing a participant reading with/without adaptation). Then joint Q&A (~30–40 min), then **individual questioning** (one author leaves the room, same/different questions each). Total ≈ **1h15–20**, then grade deliberation.
- **Both authors must speak** in the presentation and **both must answer** in Q&A — take turns, add to each other's answers. They explicitly do not want one person carrying it.
- **Slides:** include the report's key figures (requirements, architecture diagrams, results) at high level; don't walk code. Prepare **backup slides** for deep-dives; bring the report and cite page numbers.
- **Rehearse the technical answers** that were shaky live: I-AOI vs I-DT/I-VT (§6.1), the Kalman framing (§6.2), AOI-under-reflow (§6.3).
- Grade can be given jointly or individually (most groups: same grade).

---

*Bottom line: the system is not the problem and the supervisors know it. The hand-in turns on (1) making the diagrams consistent and user-centric, (2) writing the two stub chapters to actually sell and verify the work, and (3) getting the eye-tracking story straight on paper and in the authors' heads. Everything else is polish.*
