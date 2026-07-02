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
- The four research questions are the spine. They are posed before the platform
  overview, the demo answers them, one scorecard measures all four, two deep
  dives tell the interesting ones as stories (modularity and
  context preservation), the limitations say which are only partly answered, and
  the contribution is named once it has been earned. The sensing and replay
  charts moved to backups B7/B8 so the evidence act stops reading like the report.

| Act | Slides | Minutes |
|---|---|---|
| 1 Problem, reframe | S1 to S6 | 5.0 |
| 2 The artifact + questions | S7 to S8 | 3.7 |
| Demo | S9 + clips | 9.0 |
| 3 Evidence (scorecard, 2 deep dives), limits, future | S10 to S14 | 4.5 |
| Close + contribution | S15 to S18 | 2.0 |

Build status: the main deck is built (points below match the slides); only the
Thanks slide is still a stub. The one large piece still to produce is the
**8 to 10 min recorded demo**. Backup cards B1 to B6 stay sparse; B7 and B8 hold
the sensing and replay charts for Q&A.

---

## ACT 1: Problem and reframe (~5 min)

### S1 Title (P1, ~25-30s)
- Welcome (time-neutral, talk is at 14:30) + names + title. Do not dive in yet.
- Roadmap the room: over the next ~25 min we cover the problem, the platform we
  built, and what we found; about a third of the way in we hand to a short live
  demo of the system running end to end.
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
- Bridge: "So how does the programme picture all this coming together?"

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
- Handover to P2: "So I will hand over to Sachin, who will show how we turned
  this concept into an architecture."

---

## ACT 2: The artifact (~4 min)

### S7 The four steps (P2, ~60s) [script]
Thanks, Satish.

So the way we approached this was to take the programme's own concept and turn it
into a loop with four parts that can each be replaced.

On the left, the original concept starts with sensing. In our architecture, that
becomes Sensing: the part of the system that receives gaze data from the tracker or
from a simulated source.

The next step is feature extraction. We call that Analysis, because this is where
raw gaze becomes reading events like fixations, saccades, and regressions.

Then comes the classifier. In our architecture, that is the Decision step: some
strategy looks at the current reading context and decides whether an intervention
should be proposed.

Finally, the intervention changes the reading presentation. That is our Intervention
step.

Together, those four steps form one live adaptive loop: gaze comes in, reading
behaviour is analysed, a decision is made, the text adapts, and the loop
continues.

The important move is what happens to the classifier. We do not build the final
classifier in this thesis. Instead, we make it a provider that can plug into a
decision seam. That provider could be a human researcher, a rule-based strategy,
or later an AI model. So the loop is built around replaceability from the start.

Now that the loop has a name, we can state the project goal more precisely.

### S6 Project goal (P2, ~55s) [script]
So our goal is not to build the classifier itself.

Our goal is to build the research platform that the classifier, and the
intervention studies around it, need before they can be evaluated properly.

More precisely, we set out to design and evaluate a modular, researcher-operated
adaptive reading platform: a platform that lets researchers run controlled
reading sessions, change one part of the adaptive loop at a time, and still
reproduce what happened afterwards.

That goal has four parts.

First, the loop has to be replaceable. Sensing, Analysis, Decision, and Intervention have
to sit behind stable contracts, so changing one does not mean rewriting the rest.

Second, it has to run real sessions. The platform has to work with a physical
Tobii eye tracker, not only with simulated data.

Third, it has to be researcher-operated. The researcher needs a console where
they can see the participant's gaze, control the session, approve or trigger
interventions, and export the full record.

And fourth, it has to expose the decision boundary. A human, a rule-based
strategy, or a future AI provider should be able to plug in without changing the
core platform.

This is why we frame the thesis as Design Science. The project is not an efficacy
study of one intervention, and it is not an AI-classifier thesis. It is the design
and evaluation of the platform that makes those studies possible.

From that goal, we get the four research questions.

### S5 The research questions (P2, ~45s) [script]
So the question is not simply whether reading can adapt. The earlier prototypes
already showed that the adaptive loop can exist.

The question for us is whether the platform can be architected well enough to
support real research. We break that into four research questions.

The first is modularity. Can we separate sensing, analysis, decision, and
intervention so that a new module, or even a new decision provider, can be added
without touching the core reading runtime?

The second is the sensing pipeline. Can a real Tobii stream be turned into
reading events quickly enough to support live adaptation?

The third is context preservation. If the text changes while someone is reading,
can the platform preserve their place instead of throwing them out of the flow?

And the fourth is researcher control. Can the researcher operate the session,
steer what reaches the participant, and reproduce the session afterwards from an
auditable record?

These four questions become the spine of the rest of the presentation. The demo
shows them in motion, and the evidence section measures whether they actually
hold.

Now we can place those questions in the full platform.

### S8 The whole platform (P1, ~50s) [reuses thesis Fig. 5.1]
- Those four steps, now where the people are, the whole platform in one picture.
- It sits between the two people it serves. Participant reads plain text on one
  screen. The eye tracker on the boundary is the sensing interface, streaming
  gaze live.
- Researcher sees the same reading mirrored, with a fixation heat map and
  saccades (not just where but how they read), and holds the controls.
- The decision seam sits on the boundary, where an external provider may attach,
  out of scope by design.
- Bridge (hand to P2): "Now the demo should not feel like a product tour. It
  should answer the four research questions we just named."

---

## HINGE 1 to DEMO

### S9 What to watch for (P2, ~15s then play)
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

## HINGE 2 from DEMO; ACT 3: Does it hold up (~4 min)

The evidence act is NOT the report read back. One fast scorecard, then two deep
dives told as stories, then the honest limits. Full charts live in the report and
in backups B7/B8.

### S11 Scorecard, answered live and measured (P2, ~45s)
- Re-anchor after the demo. A scorecard, not a new explanation: the four questions,
  one headline number each, delivered with confidence.
  - **RQ1 Modularity:** 3 outside models plugged in, zero core changes.
  - **RQ2 Sensing:** 90 Hz, every sample under the 100 ms budget.
  - **RQ3 Context preservation:** resume time 650 down to 482 ms.
  - **RQ4 Researcher control:** the whole evaluation chapter rebuilt from one record.
- Say once, then move on: "the full distributions are in section 7.4."
- Bridge: "Two of these are worth a closer look. The first goes beyond our own code."

### S12 Deep dive, modularity as a story (P2, ~55s)
- Lead with the story, not the metric: an outside collaborator's reading-difficulty
  model connected through the seam with no change to our code and none to theirs.
- The technique (keep the code on screen): the ports-and-adapters boundary is an
  executable test, so a violating dependency is a compile error, not a promise.
- Bridge: "That is the seam holding. Now the result a reader actually feels."

### S14-ev Deep dive, context preservation as a question (P1, ~55s)
- Open with the question you did not know the answer to: "every time the text
  reflows, do we throw the reader off?" Then let the two charts answer it.
- Resume time median 482 ms with preservation vs 650 without; post-intervention
  regressions 23% vs 33%. Four participants, so descriptive, not an effect study
  (owned in the limits).
- Bridge: "That is what it can do. Now, honestly, what it cannot."

### S13 Limitations (P1, ~55s), the maturity slide
- State them first, before being asked:
  - No efficacy claim, small convenience sample; the controlled effect study is
    future work by design.
  - AI decision-making is architectural, not built: a fixed-rule reference provider
    on a single validation run, not a learned model at campaign scale.
  - Context restore fixed geometrically (the original over-repositioned about 38 px
    on small reflows), not yet re-tested with readers.
- One honest lesson: line stabilisation is a "poor man's Kalman filter" (the
  intuition, not the machinery).
- Bridge: "Each of those points forward to a next step."

### S14 Future work, a payoff not a to-do list (P2, ~45s)
- Callback to the S4 concept (reuse the classifier image): "remember the classifier?
  It needed data and could be a human or an AI. We produce the data and expose the
  seam; the next team trains it."
- One vivid scenario: a year from now a psychologist loads a hypothesis, attaches an
  AI decider, runs 200 sessions overnight, replays any of them, and none of it
  touches the core.
- Nearer-term, smaller: re-test the revised restore with readers; a principled
  Kalman filter over the gaze signal.
- Bridge: "And this is not only future work. It already started to happen."

### S15 Reading the Struggle reuse (P2, ~40s)
- Show the photos as proof that the platform was used in a real lab workflow, not
  just in our demo.
- Say the key point plainly: the concurrent project **Reading the Struggle** used
  the platform to gather reading-session data.
- Their own analyser connected through the same external-analysis/decision
  boundary, instead of requiring a fork or a separate experiment system.
- Land it: this is the modularity claim in practice; another team brought its own
  intelligence without rewriting the reading platform.
- Bridge: "Now we can name what the thesis contributes."

### S16 Contribution (P2, ~45s)
- Name the two layers from the thesis:
  - **Artifact:** a working, researcher-operated adaptive reading platform with
    two screens, Tobii-backed sensing, pluggable decision providers,
    context-preserving interventions, and replayable records.
  - **Design knowledge:** four transferable principles:
    enforce boundaries in the build; validate contracts from outside; measure the
    cost of claimed qualities; separate decision from commit.
- Bridge: "So if you remember one sentence from the thesis, it is this."

### S17 Close (P2, ~25s)
- The memorable claim, slowly; this is the sentence they repeat in deliberation: a
  researcher can watch someone read in real time and reshape the text without
  costing them their place, and every part of the loop is swappable without touching
  the core.
- Then land the thesis callback: we did not build the classifier; we built the
  platform it presupposes, with quality data and a live loop where it can be
  connected, run, and judged.
- End cleanly: "Thank you."

### S18 Thanks and pointer (P2, ~15s) [STUB]
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
- **B7 Sensing performance.** Per-session rate/validity plus the client RTT CDF:
  mean 89.9 Hz, validity 92.5 to 98.0%, every sample under the 100 ms budget. The
  headline sits on the S11 scorecard; the full charts live here for Q&A.
- **B8 Reproducibility / replay.** The replay screenshot (also shown live in demo
  beat 5): the whole evaluation chapter rebuilt from exported records.
