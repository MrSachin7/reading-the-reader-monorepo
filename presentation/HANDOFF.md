# Defense Presentation, Agent Handoff / Context Dump

**Read this file top-to-bottom before touching the deck.** It is written for a
fresh AI agent (or a human) with zero prior context. It contains the full
backstory, every decision made and *why*, the strategy, the slide-by-slide plan,
the demo plan, the technical setup, what is built vs. stubbed, the traps to
avoid, and the exact next steps. If you read only one file, read this one.

Last updated: 2026-07-01. Author of this file: the AI agent that scaffolded the deck.

---

## 0. TL;DR (30-second version)

We are building the **oral-defense presentation** for a DTU MSc thesis called
**"Reading the Reader"**, a modular, researcher-operated platform for adaptive
reading (eye-tracking driven text adaptation). The presentation is a **reveal.js
web deck** in this `presentation/` folder. It is **25 minutes including an 8–10
minute recorded demo**, given by **two presenters**, then Q&A.

The deck is a **story / argument**, NOT a walk through the report chapters. The
examiners have already read the thesis. The single most important strategic move
is to establish, in the first ~3 minutes, that this is **research (Design
Science: the artifact + the design knowledge are the contribution)**, not "just a
software project."

**Status:** project scaffolded and running; Act 1 slides 1–2 built for real;
slides 3–15 + backups B1–B6 are stubs whose speaker notes contain the full brief
for each. Next job: build Act 1 (slides 3, 4, 5) for real. See §12.

---

## 1. How to run and verify the deck

```bash
cd presentation
bun install         # if node_modules missing (reveal.js v6 + vite)
bun run dev         # http://localhost:4321  (strict port 4321)
```

- **Present / navigate:** arrow keys or clicker. `Esc` = overview. `S` = speaker
  view (current + next slide + notes + timer), the two-presenter cockpit.
- **In the Claude Code harness**, prefer the `preview_*` MCP tools over Bash to
  run the server. There is a launch config named `presentation` in the repo-root
  `.claude/launch.json` (runs `bun run dev`, cwd `presentation`, port 4321).
  Use `preview_start` with name `presentation`.
- **Verify a change:** reload, check `preview_console_logs` (should be only vite
  `connecting/connected` debug lines), check `preview_logs` for the vite HTML
  parser (it errors on unescaped `<`, see §11), then `preview_screenshot`.

---

## 2. The conversation / decision history (what the user asked, in order)

This is the narrative arc of how we got here, so you understand intent, not just
outcomes.

1. **User:** "Plan the presentation for our thesis. Do NOT generate slides yet.
   First research how the best MSc thesis presentation for the *Application* type
   (per bardram.net/msc-thesis) works. Read the thesis first. What does the
   external supervisor want to know? Report top findings. Format: 25 min incl
   8–10 min demo."
   → We researched (see §5, §6), read the thesis, and reported findings.

2. **User:** "We start fresh, delete all of that. Don't get influenced by that at
   all."
   → There was a PREVIOUS locked plan + a generated `.pptx` from an earlier
   session. **We deleted both** (`presentation/Reading-the-Reader-Defense.pptx`
   and the `thesis-defense-presentation-plan.md` memory file + its MEMORY.md
   pointer). **DO NOT resurrect or be influenced by that old plan.** Everything
   in THIS file was re-derived fresh from the thesis + the defense-format rules.

3. **User:** "Make a draft of how the presentation shall flow, slide by slide
   ('On slide 1 we portray X…'). Don't make slides. It must tell a story, leave a
   good impression, and transition seamlessly into the demo and back."
   → We produced the slide-by-slide flow (see §8) and the two demo hinges (§9).

4. **User:** "1. We record the demo *around* the presentation, so the demo
   adapts to the presentation, not the other way around. 2. [loop-spine device]
   sounds good."
   → Two locks: (a) **the presentation is the master; the demo recording is cut
   to fit the narration** (build order in §9); (b) **the loop-spine device** is
   in (§7, §10).

5. **User:** "Let's start building. I'm thinking a web-style app (not PPT) for
   freedom. Your opinion?"
   → We advised: yes to web, but use a **framework, not a bespoke app**.
   Recommended **reveal.js**. User chose reveal.js, and said **runway is
   plenty, build gradually/iteratively together.**

6. **User:** "Perfect. Before moving on, write a super-detailed handoff file."
   → This file.

---

## 3. Hard constraints & user preferences (do not violate)

- **Two authors / two presenters.** Both must speak, and both must own hard
  content (framing AND architecture AND demo AND evaluation), because grades are
  **individual** and each is questioned alone after the joint part. Do not design
  a "one does intro, one does the real work" split.
- **Do NOT re-present the report chapter by chapter.** This is the #1 named
  mistake. The deck is an argument.
- **Do NOT be influenced by the deleted old plan/deck** (see §2.2).
- **Fresh, iterative build.** Build a slice, verify in-browser, show the user,
  react. Do not dump all 15 slides at once without feedback.
- **Thesis-fact integrity.** This deck sits inside a DTU thesis repo with strict
  anti-fabrication rules (`Master-Thesis-Report/CLAUDE.md`). Do NOT invent
  numbers, results, citations, or features for the slides. Every claim on a slide
  must trace to the thesis. If unsure, check the source files (§4) or ask.
- **Voice:** first-person plural ("we"). Formal but not stiff for spoken
  delivery. No hype words.
- **NEVER use em dashes** (the U+2014 character) anywhere: slides, notes, code,
  docs, or chat. Use commas, colons, parentheses, or rewrite. Hard rule from the
  user; also recorded in the repo root `CLAUDE.md`.
- **Aesthetic:** OFFICIAL DTU branding (user decision). Palette from
  designguide.dtu.dk/colours: Corporate Red `#990000` (primary), Navy Blue
  `#030F4F` (secondary / loop-spine active), Bright Green `#1FD082` (ticks), DTU
  greys, white ground. Headings are sans (DTU is a sans brand); the core-claim +
  problem-statement blocks use a serif as a small "reading" touch. All swappable
  via CSS variables in `theme.css`. Official DTU logo (corporate red PNG) is in
  `assets/`.

---

## 4. The thesis in brief (what the project actually is)

Grounded facts, drawn from the report. Source files are under
`../Master-Thesis-Report/`.

**One-liner:** A researcher-operated, two-screen adaptive-reading platform. A
participant reads on one screen where text adapts to their gaze; the researcher
watches live gaze on a second screen and can trigger/approve changes. Four
concerns, **sensing, analysis, decision, intervention**, are separate,
interchangeable modules behind stable contracts, so new interventions or decision
providers (incl. future AI) plug in without touching the core. Every gaze sample,
decision, and intervention is recorded so sessions can be exported, replayed, and
reproduced.

**Why it exists (the gap):** Prior "Reading the Reader" prototypes proved
adaptive reading is possible but were tightly coupled (sensing + decision +
reading screen tangled together), so every new study meant rewriting core code,
and none were reproducible. No existing product unites real-time gaze sensing +
context-preserving typographic adaptation + researcher-in-the-loop control +
reproducible capture + pluggable decisions.

**Problem statement (Ch2 end,
`02_KeyConceptsAndRelatedWork/05_final_problem_statement.tex`):** "How can a
researcher-operated adaptive reading platform be architected so that sensing,
eye-movement analysis, decision strategy, and intervention execution are
independently replaceable, while supporting real Tobii-backed reading sessions
and applying context-preserving micro-interventions without disrupting the
participant's reading flow?"

**Four research questions:**
- **RQ1 (Modularity):** separate the four concerns behind stable contracts so a
  new intervention/decision provider is added without modifying the core runtime.
- **RQ2 (Sensing pipeline):** convert a real Tobii stream into oculomotor events
  (fixations, saccades, regressions) within a latency budget that preserves live
  adaptation, inspectably and reproducibly.
- **RQ3 (Context-preserving intervention):** commit typographic micro-changes at
  controlled boundaries so text adapts while preserving the reader's context.
- **RQ4 (Researcher control & experimentability):** give the researcher control
  and an auditable record (incl. replay) to operate experiments and compare
  interventions/strategies.
- The RQs deliberately emphasize **architecture + runtime feasibility over a
  controlled human-subjects effect study**, that scoping choice is what invites
  the "is this research?" attack, hence the Design Science pre-empt (§7).

**Seven contributions (`01_Introduction/03_contributions.tex`):** (1) modular
adaptive reading platform; (2) dual-screen researcher-operated workflow; (3)
real-time sensing pipeline (real device + simulated source behind one contract);
(4) human-in-the-loop decision boundary (advisory: approve/override/reject; or
autonomous); (5) context-preserving intervention (position anchor + it
instruments recovery, e.g. reading-resume time); (6) reproducible session record
(export/replay/re-import); (7) developer/operator documentation site.

**Evaluation numbers (verified in `07_Evaluation/`, use these on slides):**
- 8 reading sessions on a real Tobii eye tracker.
- Modularity: dependency boundary is build-enforced + checked by an executable
  test; in-process module added in one registration; **3 external providers**
  connected with no core change (one wraps a third party's model).
- Sensing: streamed at rated **90 Hz** with validity **>92%**; client transport
  latency within the **<100 ms** budget on every sample.
- Automated decision path: exercised in **ONE advisory-mode validation run**
  (treat as a single-run check, NOT a campaign result).
- Context preservation: reading-resume time ↓ and post-intervention regression
  rate ↓ with place-keeping ON vs OFF. The original restore **over-repositioned
  on small reflows (~38 px too far)**; a revised restore holds the captured
  offset and fixes this **geometrically only** (not yet re-tested with readers).
- Control/reproducibility: sessions run through one gated console; the whole
  evaluation chapter's results were **reconstructed from exported records alone**.

**Two headline limitations (state them yourselves in the talk):**
1. Automated decision path validated in a single run, not at campaign scale.
2. Revised context-preserving restore confirmed geometrically, not behaviorally.

**Design decision register (Ch5 `07_decisions.tex`, DR1–DR9):** ports-and-adapters
inward layering; uniform seam shape + immutable snapshots; dedicated real-time
channel for gaze (separate from request/response); external concerns via a
uniform identity-keyed provider seam with fallback; two-phase validate-then-commit
intervention with a position anchor; one authoritative schema-versioned session
record; file-backed checkpointed store; sensing-source port behind an adapter
(quarantines the Windows-only Tobii SDK, admits a simulated source);
autonomous + advisory execution modes.

**Tech stack:** Frontend Next.js 16 / React 19 / TS 5 (Bun). Backend C# / .NET 10
(ASP.NET Core, FastEndpoints). Tobii Research SDK (.NET binding, Windows-only).
Reading content is **Markdown only** (PDF explicitly excluded). Realtime over a
WebSocket `/ws` channel; REST for commands.

---

## 5. Defense format (what actually happens in the room)

- **Presentation: 25 min including an 8–10 min recorded demo** → then **joint
  Q&A** → then **individual Q&A** (one presenter leaves the room at a time).
- Audience = **supervisor + external censor**, both have **read the full report**.
- **7-point scale; individual grades.**
- It is an **"Application"-type** thesis (Bardram taxonomy): a system that solves
  a real problem for real users; graded on technical soundness of the design +
  proof-of-concept + user-centered analysis/design/evaluation. **A demo of the
  main contribution is strongly recommended for this type.**

---

## 6. Defense best practices (researched, the rules we're designing to)

Sources: <https://www.bardram.net/msc-thesis/>,
<https://sunelehmann.com/masters-defence-notes/> (the canonical defense-notes page
Bardram links), and DTU thesis/exam rules.

1. **Do not re-present the report.** They've read it. Extract the *essence*;
   organize around contribution + evidence, not chapters. ("Don't have a
   presentation-version of your report, that will be boring to everyone.")
2. **Demo the main contribution.** For an Application thesis the demo *is* the
   proof. Recorded video narrated live is fully acceptable and de-risks hardware.
3. **Self-critical reflection scores.** Name what you'd do differently, problems
   hit, lessons learned. Overselling is detected instantly; avoiding weaknesses
   is penalized. → We state our two limitations proactively.
4. **Hit the time exactly.** No overrun is rewarded. Rehearse to the second;
   the demo is the biggest clock risk, so it's scripted (clip-per-beat).
5. **Q&A is collaborative, not adversarial.** "Everyone wants you to do well;
   no trick questions." But the eye-tracking censor WILL probe depth (§ backups).
6. **Situate the work** in its topic and against related work.

---

## 7. The presentation strategy (the spine)

**The one sentence the whole talk proves (the "core claim"):**
> Reading can adapt to a struggling reader in real time, and we built the
> platform that lets researchers run, control, and reproduce that, with every
> part of the loop swappable without touching the core.

Every slide must **set up**, **show**, or **back with evidence** that sentence.
If a slide does none of those three, it is a report slide, cut it.

**Strategic must-win:** pre-empt "is this research or just software?" in the
first ~3 min via the **Design Science** framing, the working artifact AND the
distilled design knowledge (design principles, the DR1–DR9 register) ARE the
research contribution. This is the most likely censor attack on a systems thesis;
raise it before they do (Slide 4).

**Seamlessness device, the loop-spine (IMPLEMENTED):** The adaptive loop
(sense → analyse → decide → intervene) is revealed full-screen once (Slide 7),
then lives shrunk as a ring in the top-right corner, with the current stage lit,
on every subsequent slide. The demo is narrated against the same loop; the
evaluation numbers are grouped by the same four stages. The examiner never loses
the map. See §10 for how it's wired.

**Story arc (four acts):**
- **Act 1 (Problem → Reframe):** human problem → prior prototypes were tangled &
  unreproducible (the gap) → reframe as an architecture question + Design Science
  → the one claim + the landscape gap. Goal: they accept this is research.
- **Act 2 (The artifact):** two-screen user-centric hero → the four-module loop →
  the design principles. Goal: give them the mental model the demo will confirm,
  ending on a *promise* the demo pays off.
- **Demo:** cash the promise; 5 beats carry the 4 RQs live.
- **Act 3 (Does it hold up):** back-from-demo RQ recap → measured evidence →
  limitations (stated first) → future work (AI seam leads) → close (restate
  claim). Goal: evidence + maturity.

---

## 8. Slide-by-slide flow (15 main + 6 backup)

Each stub slide's `<aside class="notes">` in `index.html` already contains its
JOB + the exact BRIDGE line to the next slide. This section is the same map in
one place. `[stage]` = the `data-loop-stage` value.

**ACT 1, Problem → Reframe (~5 min)**
- **S1 Title**, title, both names, supervisor/censor, date; quiet two-screen bg.
  10-sec welcome only. Bridge: "Before the system, the person it's for." *(BUILT)*
- **S2 Human problem**, who struggles (dyslexia, age-related vision loss); text
  can reshape in real time, eye tracker senses struggle, without breaking flow.
  Bridge: "This isn't new in our group, and that's where the real problem
  starts." *(BUILT)*
- **S3 The gap / pain**, prior prototypes proved it possible but tangled →
  rewrites per study, not reproducible. Bridge: "So the question isn't 'does it
  work', it's an architecture question." *(STUB)*
- **S4 Reframe + Design Science**, one-line problem statement + name the method;
  say out loud "artifact + design knowledge = contribution." *(STUB, critical)*
- **S5 Contribution claim + gap**, the core claim (big-claim style) + comparison
  strip (nothing unites all of this) + plant the 4 RQs small (don't read them).
  Hand-off to other presenter. *(STUB)*

**ACT 2, The artifact (~4 min)**
- **S6 Two-screen hero**, user-centric: participant reading | researcher console;
  eye tracker drawn ON the participant↔platform link, not a fourth box. *(STUB)*
- **S7 The adaptive loop** `[all]`, full-screen four-module loop + bidirectional
  provider seam (context →/← proposals). NO code. Loop device born here. *(STUB)*
- **S8 Design principles** `[all]`, 3–4 principles (uniform seam + immutable
  snapshots; gaze on a separate realtime channel; validate-then-commit with a
  position anchor; one replayable record). Bridge = THE PROMISE: "Claims are
  cheap, let's watch it do all four, live." *(STUB)*

**HINGE 1 → DEMO**
- **S9 Demo: what to watch for** `[all]`, 5 beat icons tagged to RQs (~15s), then
  cut to the recorded clips; persistent beat card + corner spine ride over the
  footage. *(STUB, needs the recorded video + player)*

**HINGE 2 ← DEMO ; ACT 3, Does it hold up (~5 min)**
- **S10 RQs answered live** `[all]`, the 4 RQs from S5, now each checked/pinned
  to its beat. Bridge: "A demo can be staged, here's the measured evidence."
  *(STUB)*
- **S11 The evidence** `[all]`, numbers grouped by the 4 stages (see §4 numbers).
  Bridge: "We'll also tell you where it isn't finished." *(STUB)*
- **S12 Limitations** `[all]`, the two shortfalls + the Kalman lesson (line-bias
  is a hand-tuned hysteresis, a "poor man's Kalman filter"). *(STUB)*
- **S13 Future work** `[decide]`, 3 arrows; AI decision provider over the seam
  leads; then Kalman filter; then the controlled efficacy study. *(STUB)*
- **S14 Close** `[all]`, restate the claim (mirror S5), 4 RQs checked, whole loop.
  The sentence you want them repeating in deliberation. *(STUB)*
- **S15 Thanks + pointer**, names, docs site/repo, keep up during Q&A. *(STUB)*

**BACKUP / Q&A (jump on demand, do not present), see §11 rehearsal facts**
- **B1** I-AOI fixation detection · **B2** line-bias vs Kalman · **B3** AOI
  survives reflow · **B4** design decision register DR1–DR9 · **B5** tech stack +
  Tobii SDK integration · **B6** requirements build→demo→feedback→refine table.

---

## 9. The demo (recorded, 5 clips, ~9 min), the linchpin

**Build-order rule (user decision #4): the presentation is the MASTER; the demo
recording is produced to FIT the narration.** So the order is:
1. Lock the story + the beats the story needs (done, below).
2. Write the live narration lines per beat.
3. **Record silent screen-capture to fit those lines**, not a rambling capture
   you later talk over.
4. Rehearse narration on top until frame-tight.

**Production rules:** record as **5 separate silent clips, one per beat, each
ending on a ~1s hold-frame** (so a speaker/clip swap is invisible and a narrator
who runs long pauses BETWEEN clips, never mid-motion). Same passage + same
two-screen framing across all five for visual continuity. Capture at the real
90 Hz so gaze motion is authentic; slow the hero beat in the edit if needed.
Optional lower-third label per beat; the corner loop-spine may be enough.

**The 5 beats (order tells a mini-story; each out-cue stitches to the next):**
1. **Two-screen gaze mirroring (RQ2, ~1.5m).** Reader passage + gaze
   dot/word-highlight; researcher console mirrors the same gaze live.
   Out-cue → "Now watch what happens when the researcher decides the text should
   change." (lights *intervene*)
2. **Context-preserving intervention + resume-time (RQ3, ~2.5m, HERO).**
   Intervention fires (font/spacing step), text reflows, reader KEEPS place,
   highlight cue on the resumed line, resume-time metric appears on console.
   Out-cue → "That change was triggered by hand. But the researcher doesn't have
   to be the one deciding." (→ control)
3. **Advisory mode: approve/override (RQ4, ~1.5m).** Proposal pops on console;
   approve → applies; second proposal → override/reject → nothing changes reader-
   side. Out-cue → "And that provider, any part of this loop, can be swapped
   without touching the core." (→ modularity)
4. **Live module swap (RQ1, ~2m).** Swap sensing source to a simulated (mouse)
   input behind the SAME contract, loop keeps running; and/or an external
   decision provider attaches over the seam (registration line in a terminal,
   then it serves proposals). Out-cue → "Everything you've seen was recorded, and it can all be replayed from a single file." (→ reproducibility)
5. **Replay a re-imported session (RQ4, ~1.5m).** Export a session → re-import →
   scrub the replay; gaze + interventions reconstructed from the record alone.
   **EXIT out-cue → "And every number we're about to show you came out of records
   exactly like this one."** → cut back to slides, land on S10.

That exit line is the seam of Hinge 2: it makes the demo the *qualitative* proof
and sets up Evaluation as the *quantitative* proof.

---

## 10. Two-presenter choreography + timing

**Handoffs ARE transitions**, put a speaker swap at each act boundary so the
handoff and the story-turn coincide. A split where both own framing + architecture
+ demo + evidence:
- **P1:** S1–S3 (problem/pain) → S7 (the loop) → demo beats 1–3 → S12 (limits).
- **P2:** S4–S5 (reframe + claim) → S6, S8 (hero + principles + the promise) →
  demo beats 4–5 + S10 (back-from-demo) → S11, S13, S14 (evidence + future +
  close).
- The presenter NOT narrating a demo beat drives the clicks, always a voice,
  always a hand, no dead air.

**Timing budget (~24 of 25 min; keep ~1 min slack for the demo):**
| Act | Slides | Min |
|---|---|---|
| 1 Problem→Reframe | S1–S5 | 5.0 |
| 2 Artifact | S6–S8 | 4.0 |
| Demo | S9 + clips | 9.0 |
| 3 Evidence/limits/future | S10–S13 | 5.0 |
| Close | S14–S15 | 1.0 |

---

## 11. Technical implementation notes (and traps)

**Stack:** reveal.js **v6.0.1** + Vite **8.x**, Bun. Plain JS + HTML + CSS. React
islands can be added later only where interactivity is needed (loop-spine already
works in vanilla JS; the demo player may want an island).

**File map (`presentation/`):**
- `index.html`, all slides as `<section>`; speaker notes in `<aside class="notes">`.
- `src/main.js`, Reveal init (16:9, 1280×720, Notes plugin) + loop-spine init.
- `src/theme.css`, palette/type as CSS variables + all slide styling + the
  loop-spine styles. Change the look here.
- `src/loop-spine.js`, the corner ring device.
- `assets/dtu-logo-red.png`, official DTU corporate-red logo (web); `.pdf` is the
  vector master. Persistent `#dtu-logo` (top-left) + the title-slide logo both use
  the PNG. A slide hides the corner logo with `data-logo="off"`.
- `vite.config.js`, `base: './'` (portable/offline build), strict port 4321.
- `README.md`, run/present/fallback instructions.
- `../.claude/launch.json`, has a `presentation` config for `preview_start`.

**reveal.js v6 gotchas (already handled, do not "fix" back to old paths):**
- Main import: `import Reveal from 'reveal.js'` (resolves to `dist/reveal.mjs`).
- CSS: `import 'reveal.js/reset.css'` and `import 'reveal.js/reveal.css'`, NOT `reveal.js/dist/reveal.css`.
- Notes plugin: `import RevealNotes from 'reveal.js/plugin/notes'`, NOT `.../plugin/notes/notes.esm.js` (that path is v5 and does not exist in v6).

**HTML parser trap:** Vite's HTML parser treats a bare `<` before a digit/space as
a tag start and errors ("invalid-first-character-of-tag-name"). In slide text or
notes, write `&lt;100 ms`, `&gt;92%`, etc. Grep before committing:
`grep -nE '<[0-9]|< ' index.html`.

**Loop-spine wiring:** put `data-loop-stage="sense|analyse|decide|intervene|all"`
(or a comma list) on a `<section>`. The ring shows + lights those stage(s) and
captions them; no attribute → ring hidden. Stages sit top/right/bottom/left to
read as a cycle. Logic in `src/loop-spine.js`; styles under `#loop-spine` in
`theme.css`.

**Styling helpers in theme.css:** `.kicker` (act label above heading),
`.big-claim` (the core-claim block), `.lead`, `.muted`, `.rq` (research-question
list), `.stub` (adds a "stub" badge, remove the class from a `<section>` when you
build that slide for real).

**Exam-room fallbacks (build before the defense):** PDF via
`http://localhost:4321/?print-pdf` → Print → Save as PDF; static offline build via
`bun run build` → `dist/` opens from `file://`; keep the raw demo video on the
machine independently. Rehearse once on the actual presentation machine.

---

## 12. Current build status & the next steps

**Built for real:** S1 (title, DTU-branded w/ logo), S2 (human problem), **S3
(the gap), S4 (Design Science reframe), S5 (claim + gap + RQs)**, all with real
content AND spoken speaker notes (SPEAK/BRIDGE format). Theme is DTU-branded;
official logo appears top-left on content slides (suppressed on the title via
`data-logo="off"`, which shows the large logo instead). Loop-spine + preview all
verified; no console errors.

**Stub (carry full briefs in their speaker notes):** S6–S15 + B1–B6, each marked
with a `stub` badge on-slide.

**Title slide (filled):** authors Sachin Baral (s243871@dtu.dk) and Satish Gurung
(s243872@dtu.dk); supervisors Per Bækgaard (pgba@dtu.dk), Ashkan Task
(ashta@dtu.dk), Chaudhary Muhammad Aqdus Ilyas (cmuai@dtu.dk); DTU Compute, July
2026. Title and subtitle match the report exactly: "Reading the Reader" /
"Adaptive Reading Systems: A Modular Software Architecture" (source:
`../Master-Thesis-Report/Setup/Statics.tex`). No external censor was provided, so
no censor line is shown; add one if needed.

**Known polish item:** content is vertically centered (reveal default), so
content slides have a large empty top band. To top-anchor instead, set
`center: false` in `main.js` and add top padding; keep the title slide centered.
Not yet applied, user's call.

**Recommended next iteration (in order):**
1. **Build Act 2 visual centerpiece: S6 (hero) + S7 (loop diagram).** These
   define the visual language the rest reuses. The S7 loop should visually match
   the corner spine's four stages. Consider reusing the thesis's own adaptive-loop
   figure (`../Master-Thesis-Report/Chapters/05_SystemDesign/adaptive-loop.*`, verify it exists first). Then S8 (design principles).
2. **S9 demo scaffolding** + then the actual recording (§9). Demo comes after the
   narration lines exist (build-order rule).
3. S10–S14 evidence/limits/future/close.
4. Backups B1–B6 (short reference cards; content already in their notes).

**Always:** build a slice → verify in-browser (console + screenshot) → show the
user → iterate. Do not batch-build silently.

---

## 13. Open questions awaiting the user

- **Palette/type:** RESOLVED, official DTU branding applied (see §3).
- **Layout:** vertical centering vs. top-anchored content (see §12 polish item), user's call.
- **Demo:** confirmed recorded (not live). Passage/content of the demo not chosen.
- Minor: exact author names / supervisor / censor / date / venue.

---

## 14. Key source files to consult (do not invent, read these)

Under `../Master-Thesis-Report/`:
- `Frontmatter/Abstract.tex`, the tight summary.
- `Chapters/01_Introduction/03_contributions.tex`, the 7 contributions.
- `Chapters/02_KeyConceptsAndRelatedWork/05_final_problem_statement.tex`, problem
  statement + 4 RQs.
- `Chapters/05_SystemDesign/07_decisions.tex`, DR1–DR9 register + tech selection.
- `Chapters/07_Evaluation/08_summary.tex` (+ `01_setup`…`07_threats`), the numbers.
- `Chapters/08_Discussion/04_limitations.tex`, `06_future_work.tex`, limits/future.
- `feedbacks/feedback2-analysis.md`, **critical**: what the censor probes, the
  eye-tracking depth (I-AOI, Kalman, AOI-reflow), user-centric diagram note.
- `Master-Thesis-Report/CLAUDE.md`, the thesis anti-fabrication authoring rules.

**Defense-critical rehearsal facts (from feedback2-analysis, the censor is an
eye-tracking expert and probed these; a shaky answer costs marks):**
- **Fixation detection = I-AOI (dwell/area-of-interest based)**, Salvucci–Goldberg
  taxonomy. **NOT I-DT, NOT I-VT. There is NO velocity threshold.** Real dwell
  thresholds ≈ 90 ms initial / 70 ms same-line / 135 ms new-line (+ skim 45 /
  fixation 130 ms). Files: `useGazeTokenHighlight.ts`,
  `BuiltInEyeMovementAnalysisStrategy.cs`.
- **Line-bias** in `pickBestLine` = deterministic hysteresis (−24 discount to the
  current line) to reject vertical jitter = a "poor man's Kalman filter" (shares
  the intuition, not the probabilistic machinery). A real Kalman filter is future
  work. Do NOT claim it "is" a Kalman filter.
- **AOI survives reflow:** word boxes are re-measured from the live DOM on every
  mutation/resize/scroll, so post-intervention mapping uses fresh coordinates.

---

*End of handoff. If you change a decision recorded here, update this file in the
same change so it never drifts from reality.*
