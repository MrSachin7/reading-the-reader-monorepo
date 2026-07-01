# Defense Talk Script (key points, not verbatim)

Companion to the deck. Each slide lists **who speaks**, a **rough time**, the
**key points to cover** while the slide is up, and the **bridge line** into the
next slide. Speak to these points in your own words; do not read them out.

- Total: **25 min including an 8 to 10 min recorded demo**, then Q&A.
- Two presenters. Handoffs happen at act boundaries; the presenter not
  narrating drives the clicker.
- The one sentence the whole talk proves: *reading can adapt to a struggling
  reader in real time, and we built the platform that lets researchers run,
  control, and reproduce that, with every part of the loop swappable without
  touching the core.*
- The four research questions are the spine. They are now posed after the first
  architecture slide, and then the demo answers them (S10), the evidence
  measures them (S12), the limitations say which are only partly answered
  (S13), and the close restates them (S15).

| Act | Slides | Minutes |
|---|---|---|
| 1 Problem, reframe | S1 to S6 | 5.0 |
| 2 The artifact + questions | S7 to S9 | 4.5 |
| Demo | S10 + clips | 9.0 |
| 3 Evidence, limits, future | S11 to S14 | 5.0 |
| Close | S15 to S16 | 1.0 |

Build status: **S1 to S9 are finalized** (points below match the slides).
**S10 to S16 and backups are still stubs**; their points are the plan, to be
locked when those slides are built.

---

## ACT 1: Problem and reframe (~5 min)

### S1 Title (P1, ~10s)
- Welcome only. Names, title, DTU Compute, date. Do not start explaining.
- Bridge: "Before the system, the person it is for."

### S2 The human problem (P1, ~45s)
- Some readers (dyslexia, age-related vision loss) find text harder to process
  than they can comfortably manage.
- Digital text can reshape itself as it is read; an eye tracker can tell *when*
  a reader is struggling.
- The hard constraint to plant: adaptation must not cost the reader their place
  or flow.
- Bridge: "This is not a new idea in our group, and that is where the real
  problem starts."

### S3 The programme (P1, ~45s)
- Reading the Reader is a funded, interdisciplinary programme at DTU Compute
  (Novo Nordisk Foundation, about DKK 8 million).
- Goal (make it prominent): help readers with age-related central vision loss
  and dyslexia through personalised, gaze-driven typographic adaptation.
- It puts computer science, typography, psychology, and ophthalmology in one
  room. The real user of what we built is the researcher inside this programme.
- Bridge: "Here is the concept the programme is chasing."

### S4 The concept and the gap (P1, ~60s)
- Walk the concept loop: a reader is sensed, the signal becomes features, a
  classifier decides, an intervention adapts the text, closing the loop.
- Two points about the classifier: it is trained on a database of readers (so
  someone must first produce that data, cleanly and reproducibly), and the
  decider can be a human or an AI.
- The gap: to learn what helps, a researcher runs many hypotheses, each needing
  different sensing, intervention, and decision logic.
- Reveal the two example questions on click (letter spacing, highlight cue),
  then the punch: prior prototypes proved the loop but were too coupled to swap
  pieces in and out. There was no platform to do the research.
- Bridge (hand to P2): "So what do we build to make that research possible?"

### S6 Our approach, Design Science (P2, ~50s)
- We do not build the classifier; we build the platform it presupposes: it
  produces reproducible session data and exposes a seam where a decider (human
  or AI) plugs in under researcher control.
- Where we fit: no existing system unites all of it (real-time sensing,
  context-preserving adaptation, researcher control, reproducible + pluggable
  decisions). That gap is our niche.
- Meet the "is this research or just an app?" challenge head on: this is Design
  Science. The contribution is two things together, the **artifact** (a working
  platform) plus the **design knowledge** (principles and trade-offs others can
  reuse).
- Bridge (hand to P1): "So let me show you that architecture, starting with how it
  works."

---

## ACT 2: The artifact (~4 min)

### S7 The four steps (P1, ~60s) [translation from the S4 concept; loop device born here]
- Argue directly off their diagram (point at the thumbnail on the left).
- On their concept: sensing first, then feature extraction, then the classifier,
  then the intervention. We named that loop as four replaceable steps, revealed
  one at a time:
  - sensing to **Sense**, feature extraction to **Analyse**, classifier to
    **Decide**, intervention to **Intervene**.
- Those four run as one live loop: gaze in, events, a decision, an adapted view,
  round again.
- The key move (revealed last): the classifier is not ours to build; it becomes
  an **external decision provider (human or AI) on a decision seam**. We built
  the whole loop around that seam.
- Bridge: "With that architecture in view, we can name the four questions it had
  to satisfy."

### S5 The research questions (P2, ~45s) [HANDOFF to P2; now after S7]
- Once the loop is visible, the RQs become concrete: prior work proved the loop,
  but the open question is whether the platform is architected well enough to
  support real research.
- Pose four plain questions, revealed one at a time (click each):
  - **RQ1 Modularity:** can sensing, analysis, decision, and intervention be
    separated, so a new module, even a new decider, plugs in without touching
    the core?
  - **RQ2 Sensing:** can a real Tobii stream become reading events fast enough to
    adapt live?
  - **RQ3 Intervention:** can the text change mid-read without costing the reader
    their place?
  - **RQ4 Control:** can the researcher steer the session and reproduce it
    exactly, afterwards?
- Land it: "these four drive the thesis; the demo answers each, the evidence
  measures them." Do not over-explain each yet.
- Bridge: "Now put those four questions where the people actually are."

### S8 The whole platform (P1, ~50s) [reuses thesis Fig. 5.1]
- Those four steps, now where the people are, the whole platform in one picture.
- It sits between the two people it serves. Participant reads plain text on one
  screen. The eye tracker on the boundary is the sensing interface, streaming
  gaze live.
- Researcher sees the same reading mirrored, with a fixation heat map and
  saccades (not just where but how they read), and holds the controls.
- The decision seam sits on the boundary, where an external provider may attach,
  out of scope by design.
- Bridge (hand to P2): "Three principles keep those seams stable, and that is
  the design knowledge, the part another team can reuse."

### S9 Design principles (P2, ~50s)
- The "knowledge" half of Design Science, not a feature list. Four principles,
  each answering one research question (this is the transferable part):
  - **RQ1 Modularity:** one seam shape, immutable snapshots. Every module is
    identity-in, a read-only snapshot in, an optional result out; new modules
    are additive, none can mutate the core.
  - **RQ2 Sensing:** gaze on its own real-time channel, off the control path, so
    the loop stays lock-free and inside its latency budget.
  - **RQ3 Context-preserving:** validate, then commit at a controlled boundary
    with a position anchor, so text adapts without costing the reader their
    place.
  - **RQ4 Reproducibility:** one authoritative, schema-versioned record,
    reconstructable by replay, so nothing can disagree with it.
- Bridge (THE PROMISE that launches the demo): "Everything so far is a claim,
  independent modules, a preserved reading position, researcher control,
  reproducible records. Claims are cheap. So let us watch the platform do all
  four, live."

---

## HINGE 1 to DEMO

### S10 What to watch for (P2, ~15s then play)
- Open with one instruction: "watch this as evidence, not as a tour."
- The slide names the 5 proof points the audience should track in the recording:
  - two-screen gaze mirroring
  - context-preserving intervention and resume time
  - approve or override control
  - live module swap behind the same seam
  - export and replay from one record
- Keep it to about 15 seconds, then start the recorded silent clips and narrate
  live. The loop-spine stays up as the visual anchor.

## The demo (recorded, narrated live, ~9 min)
Narrate against the loop; the presenter not narrating drives clicks. Each beat
ends on a hold-frame so speaker/clip swaps are invisible.

1. **Two-screen gaze mirroring (RQ2, P1, ~1.5m).** Reader passage + gaze
   highlight; console mirrors the same gaze live.
   Out-cue: "Now watch what happens when the researcher decides the text should
   change."
2. **Context-preserving intervention + resume time (RQ3, P1, ~2.5m, HERO).**
   Intervention fires, text reflows, reader keeps place, resume-time metric
   appears on console.
   Out-cue: "That change was triggered by hand. But the researcher does not have
   to be the one deciding."
3. **Advisory mode, approve/override (RQ4, P1, ~1.5m).** Proposal pops; approve
   applies; a second proposal is overridden and nothing changes reader-side.
   Out-cue: "And that provider, any part of this loop, can be swapped without
   touching the core."
4. **Live module swap (RQ1, P2, ~2m).** Swap sensing to a simulated source
   behind the same contract, and/or an external decision provider attaches over
   the seam and serves proposals.
   Out-cue: "Everything you have seen was recorded, and it can all be replayed
   from a single file."
5. **Replay a re-imported session (RQ4, P2, ~1.5m).** Export, re-import, scrub;
   gaze and interventions reconstructed from the record alone.
   EXIT out-cue: "And every number we are about to show you came out of records
   exactly like this one." (cut back to slides, land on S11)

---

## HINGE 2 from DEMO; ACT 3: Does it hold up (~5 min)

### S11 The four questions, answered live (P2, ~40s)
- Re-anchor after time off-slides. This is a scorecard, not a new explanation.
- Map each RQ to the beat that just answered it:
  - **RQ1 Modularity -> Beat 4:** a module changed behind the seam without core changes.
  - **RQ2 Sensing -> Beat 1:** live gaze reached the console in sync with the reader.
  - **RQ3 Intervention -> Beat 2:** the text adapted and the reader kept their place.
  - **RQ4 Control and replay -> Beat 3 + 5:** the researcher could override a proposal, and the session could be replayed from one record.
- Bridge: "A demo can be staged, so here is the measured evidence."

### S12 The evidence (P2, ~90s) [STUB]
Numbers grouped by the four RQs / loop stages. State results plainly;
interpretation comes later.
- Modularity: dependency boundary is build-enforced and checked by a test;
  in-process module added in one registration; 3 external providers connected
  with no core change (one wraps a third party's model).
- Sensing: streamed at rated 90 Hz, validity above 92%, client transport
  latency inside the budget on every sample.
- Context preservation: reading-resume time down and post-intervention
  regressions down with place-keeping on vs off.
- Control/reproducibility: the whole evaluation chapter was reconstructed from
  exported records alone.
- Bridge: "We will also tell you where it is not finished."

### S13 Limitations (P1, ~50s) [STUB; this is the "learned something" slide]
State them yourselves, before being asked; name which RQs are only partly
answered.
- Automated decision path (RQ1/RQ4) validated in a single advisory run, not at
  campaign scale.
- Revised context-preserving restore (RQ3) confirmed geometrically (the original
  over-repositioned about 38 px on small reflows), not yet re-tested with
  readers.
- Honest lesson: line stabilisation is a hand-tuned hysteresis bias, a "poor
  man's Kalman filter" (shares the intuition, not the machinery).
- Bridge: "Each of those points forward to a next step."

### S14 Future work (P2, ~45s) [STUB]
- Run the decision path autonomously at scale over the same provider seam, where
  external AI deciders plug in (architectural, by design).
- A real Kalman filter over the gaze signal.
- The controlled efficacy study the platform now makes possible.
- Bridge: "So, to close."

### S15 Close (P2, ~40s) [STUB]
- Restate the claim (mirror the S6 reframe), now with the four RQs from S5
  checked and the whole loop shown. The adaptive reading loop can be cleanly
  separated under a real 90 Hz Tobii loop, giving future studies, including
  AI-driven ones, a solid base.
- Answered + learned + fit, in one breath: we answered the four questions,
  learned where the design bites (the Kalman lesson), and filled a gap nobody
  else had.
- This is the sentence you want them repeating in deliberation.

### S16 Thanks and pointer (P2, ~15s) [STUB]
- Names, documentation site / repo link, "happy to go deeper." Leave it up
  during Q&A. Do not over-talk.

---

## Backups (jump on demand in Q&A, do not present)
Both presenters should be able to answer these cold.

- **B1 Fixation detection = I-AOI (dwell/area-of-interest based)**,
  Salvucci-Goldberg taxonomy. NOT I-DT, NOT I-VT; there is no velocity
  threshold. Dwell thresholds about 90 ms initial / 70 ms same-line / 135 ms
  new-line (skim 45, fixation 130).
- **B2 Line-bias vs Kalman.** Deterministic hysteresis (a discount to the
  current line) to reject vertical jitter. Shares a Kalman filter's intuition,
  not its probabilistic machinery. A real Kalman filter is future work; do not
  claim it "is" one.
- **B3 AOI survives reflow.** Word boxes are re-measured from the live DOM on
  every mutation/resize/scroll, so post-intervention mapping uses fresh
  coordinates.
- **B4 Design decision register (DR1 to DR9).** For any "why did you choose X":
  the trade-off against its driver.
- **B5 Tech stack + Tobii SDK.** SDK bindings (.NET/Python) so we chose .NET;
  adapter normalises the gaze callback to the GazeData contract; Windows-only
  SDK quarantined behind the sensing port.
- **B6 Requirements: build to demo to feedback to refine.** The iteration table
  (stakeholder sessions, what was demoed, feedback, resulting requirement
  change).
