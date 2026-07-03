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
| 1 Problem, reframe | S1 to S4 | 3.3 |
| 2 The artifact + questions | S5 to S8 | 3.7 |
| Demo | S9 + clips | 9.0 |
| 3 Evidence (scorecard, 2 deep dives), limits, future | S10 to S14 | 4.5 |
| Close + contribution | S15 to S18 | 2.0 |

Build status: the main deck is built (points below match the slides); only the
Thanks slide is still a stub. The one large piece still to produce is the
**8 to 10 min recorded demo**. Backup cards B1 to B6 stay sparse; B7 and B8 hold
the sensing and replay charts for Q&A.

---

## ACT 1: Problem and reframe (~5 min)

### S1 Title (id s1-title, P1, ~25-30s)
- Welcome (time-neutral, talk is at 14:30) + names + title. Do not dive in yet.
- Roadmap the room: over the next ~25 min we cover the problem, the platform we
  built, and what we found; about a third of the way in we hand to a short live
  demo of the system running end to end.
- Bridge: "Before the system, the person it is for."

### S2 The human problem (id s2-problem, P1, ~45s)
- Some readers (dyslexia, age-related vision loss) find text harder to process
  than they can comfortably manage.
- The figure is a simulation of how reading can *feel*, not a model of either
  condition (say this out loud; dyslexia is primarily phonological, and the
  censor knows it).
- Digital text can reshape itself as it is read; an eye tracker can tell *when*
  a reader is struggling.
- The hard constraint to plant: adaptation must not cost the reader their place
  or flow.
- Bridge: "This is not a new idea in our group, and that is where the real
  problem starts."

### S3 The programme (id s3-programme, P1, ~45s)
- Reading the Reader is a funded, interdisciplinary programme at DTU Compute
  (Novo Nordisk Foundation, about DKK 8 million).
- Goal (make it prominent): help readers with age-related central vision loss
  and dyslexia through personalised, gaze-driven typographic adaptation.
- It puts computer science, typography, psychology, and ophthalmology in one
  room. The real user of what we built is the researcher inside this programme.
- Bridge: "So how does the programme picture all this coming together?"

### S4 The concept and the gap (id s4-concept, P1, ~60s)
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

### S5 The four steps (id s7-loop, P2, ~60s) [script]
Thanks, Satish.

So how did we get to this? We did not start from a blank page. We started from the
concept diagram of the wider Reading the Reader programme, the one on the left. We
studied that diagram, and we sat down with our stakeholders, who are also our
supervisors and the researchers driving the programme. Out of that analysis, their
single high-level picture decomposed cleanly into four concrete components. That
decomposition is the first design move of the thesis, so let me build it up one part
at a time.

[reveal Sensing] The first component is Sensing. This is where the hardware meets the
system: the eye tracker produces raw gaze samples, and Sensing is the part that
receives them, whether they come from a real Tobii device or from a simulated source.

[reveal Analysis] The second is Analysis. On their diagram this was feature
extraction. Analysis is where raw gaze stops being coordinates and becomes reading
behaviour: fixations, saccades, and regressions, the oculomotor events that actually
describe how someone is reading.

[reveal Decision] The third is Decision. On their diagram this was the classifier.
Decision is the part that looks at those reading events and identifies struggle: it
decides whether an intervention is needed right now, and if so, proposes one.

[reveal Intervention] The fourth is Intervention. This is the part that actually
changes the text the reader sees.

And now that all four are up, look at how they connect. The output of each one feeds
the next: gaze is sensed, sensing feeds analysis, analysis feeds the decision, the
decision drives an intervention, and the changed text feeds straight back into how
the person reads. That closed cycle is what we call the adaptive loop: one live
reading session, running continuously.

[reveal provider seam] Now the important part, and the reason we bothered to name
four components instead of one. These four are exactly the pieces that have to be
interchangeable. A researcher has to be able to swap one out without rewriting the
other three. And the sharpest example is Decision. We do not build the final
classifier in this thesis. We turn it into a provider that plugs into a decision
seam, and that provider can be a human researcher, a rule-based strategy, or later an
AI model. So replaceability is not something we bolted on afterwards; it is what the
whole decomposition was for.

Now that the loop has a name and four seams, we can state the project goal more
precisely.

### S6 Project goal (id s6-approach, P2, ~55s) [script]
So our goal is not to build the classifier itself.

Our goal is to build the research platform that the classifier, and the
intervention studies around it, need before they can be evaluated properly.

More precisely, we set out to design and evaluate a modular, researcher-operated
adaptive reading platform: a platform that lets researchers run controlled
reading sessions, change one part of the adaptive loop at a time, and still
reproduce what happened afterwards.

That goal has four parts.

First, the loop itself has to be modular. All four stages, Sensing, Analysis, Decision,
and Intervention, sit behind stable contracts, so we can replace any one of them with a
different implementation without rewriting the other three. This is about swapping our
own modules in and out.

Second, it has to run real sessions. The platform has to work with a physical
Tobii eye tracker, not only with simulated data.

Third, adaptation must not cost the reader their place. When the text changes
mid-session, the platform has to keep the person anchored where they were reading, not
throw them back to the top of the paragraph. Preserving context through change is a
first-class goal, not an afterthought.

And fourth, it has to be researcher-operated. The researcher needs a console where they
can see the participant's gaze, control the session, approve or trigger interventions,
and export the full record.

This is why we frame the thesis as Design Science. The project is not an efficacy study
of one intervention, and it is not an AI-classifier thesis. As the headline says, we do
not build the classifier; we build and evaluate the platform that makes those studies
possible.

And these four goals are exactly the four research questions we set out to answer, so
let us state them as questions.

### S7 The research questions (id s5-rqs, P2, ~45s) [script]
So the question is not simply whether reading can adapt. The earlier prototypes
already showed that the adaptive loop can exist.

The question for us is whether the platform can be architected well enough to support
real research. Those four goals, stated as questions, are exactly what the evaluation
has to answer.

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

### S8 The whole platform (id s8-hero, P1, ~50s) [reuses thesis Fig. 5.1]
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

### S9 The demo, embedded (id s10-demo-video, ~9 min)
- The recorded demo is embedded on this slide; press play and let it run. Logo and
  loop-spine are hidden so the video fills the frame.
- One framing line before playing: "watch this as evidence, not as a tour."
- Narrate live over the recording using the five beats below; the presenter not
  narrating drives playback. Each beat's out-cue carries into the next.
- Needs internet in the room (YouTube embed). If offline is a risk, swap to a local
  video file.

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
   exactly like this one." (cut back to slides, land on S10)

---

## HINGE 2 from DEMO; ACT 3: Does it hold up (~4 min)

The evidence act is NOT the report read back. One fast demo recap, then two deep
dives told as stories, then the honest limits. Full charts live in the report and
in backups B7/B8.

### S10 Demo recap (id s11-rqs-checked, P2, ~45s)
- Re-anchor after the demo. This is not the measured scorecard anymore; it is the
  audience's memory map of what they just saw.
  - **RQ1 Modularity:** an external provider connected without any code changes.
  - **RQ2 Sensing:** the researcher could see live gaze.
  - **RQ3 Context preservation:** the anchor was highlighted during the text change.
  - **RQ4 Researcher control + reproducibility:** the replay could reconstruct the session.
- Land it: "the demo answered each question in motion; now we show the evidence
  behind the two most important ones."
- Bridge: "Two of these are worth a closer look. The first goes beyond our own code."

### S11 Deep dive, modularity as a story (id s12-ev-modularity, P2, ~55s)
- Lead with the story, not the metric: an outside collaborator's reading-difficulty
  model connected through the seam with no change to our code and none to theirs.
- The technique (keep the code on screen): the ports-and-adapters boundary is an
  executable test, so a violating dependency is a compile error, not a promise.
- Bridge: "That is the seam holding. Now the result a reader actually feels."

### S12 Deep dive, context preservation as a question (id s14-ev-intervention, P1, ~55s)
- Open with the question you did not know the answer to: "every time the text
  reflows, do we throw the reader off?" Then let the two charts answer it.
- Resume time median 482 ms with preservation vs 650 without; post-intervention
  regressions 23% vs 33%. Four participants, so descriptive, not an effect study
  (owned in the limits).
- Bridge: "That is what it can do. Now, honestly, what it cannot."

### S13 Limitations (id s13-limits, P1, ~55s), the maturity slide
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

### S14 Future work, a payoff not a to-do list (id s14-future, P2, ~45s)
- Callback to the S4 concept (reuse the classifier image): "remember the classifier?
  It needed data and could be a human or an AI. We produce the data and expose the
  seam; the next team trains it."
- One vivid scenario: a year from now a psychologist loads a hypothesis, attaches an
  AI decider, runs a study participant by participant, replays any session
  afterwards, and none of it touches the core. (Between studies, a new provider can
  be evaluated offline against the recorded corpus, overnight if they like; sessions
  themselves always need a human reader, so never say "200 sessions overnight.")
- Nearer-term, smaller: re-test the revised restore with readers; a principled
  Kalman filter over the gaze signal.
- Bridge: "And this is not only future work. It already started to happen."

### S15 Reading the Struggle reuse (id s15-struggle, P2, ~40s)
- Show the photos as proof that the platform was used in a real lab workflow, not
  just in our demo.
- Say the key point plainly: the concurrent project **Reading the Struggle** used
  the platform to gather reading-session data.
- Their own analyser connected through the same external-analysis/decision
  boundary, instead of requiring a fork or a separate experiment system.
- Land it: this is the modularity claim in practice; another team brought its own
  intelligence without rewriting the reading platform.
- Precision guard (have it loaded, this is where the question lands): their code
  unmodified, our backend unmodified, and the connector between them written by
  us. The contract absorbed an independently designed system; no outside team has
  yet implemented the protocol from the docs alone, and that is named future work.
  Never say "they validated the contract independently."
- Bridge: "Now we can name what the thesis contributes."

### S16 Contribution (id s15-contribution, P2, ~45s)
- Name the two layers from the thesis:
  - **Artifact:** a working, researcher-operated adaptive reading platform with
    two screens, Tobii-backed sensing, pluggable decision providers,
    context-preserving interventions, and replayable records.
  - **Design knowledge:** four transferable principles:
    enforce boundaries in the build; validate contracts from outside; measure the
    cost of claimed qualities; separate decision from commit.
- Bridge: "So if you remember one sentence from the thesis, it is this."

### S17 Close (id s16-close, P2, ~25s)
- The memorable claim, slowly; this is the sentence they repeat in deliberation: a
  researcher can watch someone read in real time and reshape the text as it
  happens, with the cost to the reader's place measured on every change, and every
  part of the loop is swappable without touching the core.
- If challenged on "measured": that word is deliberate. The platform records a
  graded outcome and residual for every intervention; that measurement caught our
  own restore's over-repositioning, and the revised restore brings displacement
  back to or below the no-preservation baseline. We claim the measuring, not
  perfection.
- Then land the thesis callback: we did not build the classifier; we built the
  platform it presupposes, with quality data and a live loop where it can be
  connected, run, and judged.
- End cleanly: "Thank you."

### S18 Thanks and pointer (id s17-thanks, P2, ~15s) [STUB]
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
  headline sits on the S10 scorecard; the full charts live here for Q&A.
- **B8 Reproducibility / replay.** The replay screenshot (also shown live in demo
  beat 5): the whole evaluation chapter rebuilt from exported records.
