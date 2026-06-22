# Figure Inventory & Value Analysis

**Status:** Phase 0 artifact. Complete census of every figure (~30) with a single-message, a verdict, and reasoning.
**Rule (per your instruction):** **no figure is deleted without first reading it and concluding it adds no new value.** Where I have not yet read a figure in full, it is marked `READ-FIRST` — it is a *candidate to assess*, never an automatic cut. The supervisor asked for *fewer, sharper* diagrams; the honest finding is that **most figures earn their place** and the real win is **consistency + consolidating overlaps**, not mass deletion.

**Verdict key:** `KEEP` (good; only terminology sweep) · `REFINE` (small fix) · `REDRAW` (substantive, per supervisor) · `CONSOLIDATE?` (overlaps another figure — decision needed) · `READ-FIRST` (not yet analysed; assess before any change) · `CITE` (needs source in caption per `CLAUDE.md` §2.4).

---

## Chapter 1 — Introduction
| Fig | Single message | Verdict | Reasoning |
|---|---|---|---|
| `fig:typo-intervention` | what a typographic micro-intervention looks like (before/after) | READ-FIRST → likely KEEP | Motivating visual; verify it is referenced + discussed and that the example is ours or cited. |

## Chapter 2 — Key Concepts & Related Work
| Fig | Single message | Verdict | Reasoning |
|---|---|---|---|
| `fig:reading-concept` (png) | the reading process concept | KEEP + **CITE** | Supervisor confirmed it is adopted from another source → caption must cite it (`CLAUDE.md` §2.4). Raster; acceptable as an adopted concept figure. |
| `fig:adaptive-loop` | RTR as a closed loop of replaceable modules | **REDRAW (F1)** | The feedback-1 concept figure. Split into (a) the RTR adaptive-interface concept and (b) our pluggable-module interpretation; person icon for the reader; label it a **flowchart**; show the external-provider seam. Do **not** confuse with Ch5 `fig:design-loop`. |
| `fig:oculomotor` | fixations vs saccades on text | KEEP + CITE if adapted | Foundational concept; verify source. |
| `fig:market-quadrant` | the unoccupied gaze×adaptation quadrant is ours | KEEP | Sells uniqueness; pairs with `tab:capability-matrix`. Already good. |

## Chapter 3 — Methodology
| Fig | Single message | Verdict | Reasoning |
|---|---|---|---|
| `fig:double-diamond` | the design process shape | READ-FIRST → likely KEEP | Standard DSR/process figure. Feedback 1 said "not sure about this diagram" about *a* methodology figure — confirm which, and whether it earns its place. |
| `fig:requirements-elicitation` | how requirements were elicited | READ-FIRST + **likely the home of the refinement-evidence** | This may be where the iterative-process table (Phase 3) belongs or attaches. Assess against the "show the process evidence" ask. Possible feedback-1 "not sure" target. |

## Chapter 4 — Requirements
| Fig | Single message | Verdict | Reasoning |
|---|---|---|---|
| `fig:domain-model` | the domain entities and relations | READ-FIRST → KEEP | Verify entity names match the glossary; UML domain model is expected here. |
| `fig:use-case-diagram` | all 21 use cases × 5 actors | **REDRAW** | Align actor verbs/terms with the design diagrams (so a use case traces to architecture); fix "Ex-periment" hyphenation; reconcile actor names with glossary (External Module Provider, eye tracker). |
| `fig:activity-session` | end-to-end session control flow | KEEP → REFINE | Good swimlane. Sweep terms; verify the intervention straddle matches the loop figure. |

## Chapter 5 — System Design  *(10 figures — the density + inconsistency hotspot)*
| Fig | Single message | Verdict | Reasoning |
|---|---|---|---|
| `fig:design-context` (5.1) | the platform + its actors | **REDRAW** + CONSOLIDATE? | User-centric; eye tracker as the sensing **interface**, not a 4th box; provider coupled to researcher. Candidate to merge with the hero (see decisions below). |
| `fig:design-containers` (5.2) | runtime containers + 2 channels | **REDRAW** | Arrowheads = "who initiates"; remove the unexplained grey class; one backend name; "context ↔ proposals"; shorten caption. |
| `fig:design-twoscreen` (5.3, hero) | what each screen presents + the loop | **REFINE + PROMOTE** | Already the most user-centric figure. Align terms; consider making it the lead architecture figure. Hand-drawn per the hybrid decision. |
| `fig:design-modules` (5.4, hexagon) | four ports on the core | **REDRAW** | "Domain"→**application core**; draw the **sensing→analysis→decision→intervention** pipeline arrows; "External strategy"→"External analysis strategy"; keep cycle numbers only with a caption note. |
| `fig:design-loop` | one adaptive cycle across the parties | KEEP | Dynamic sequence view; distinct message. Mermaid; terminology sweep. |
| `fig:design-decision-lifecycle` | proposal states (advisory vs autonomous) | KEEP | The F4 state machine; distinct. Resolve `\todo{verify Expired trigger}` (see `todo.md`). Mermaid. |
| `fig:design-record` | record written live, sealed, replayed/exported | KEEP | Reproducibility story; distinct. Terminology sweep. |
| `fig:design-cross-session` | record→corpus→fine-tune→reattach | KEEP | Sells the cross-session AI capability (F5); distinct and high-value. |
| `fig:design-seam` | provider-active? publish vs built-in fallback | KEEP → CONSOLIDATE? | Unique message = the **fallback mechanism**. Overlaps conceptually with 5.4 + loop; decide whether to keep standalone or fold the fallback into 5.4 (see decisions). |
| `fig:design-session-lifecycle` | configure→ready→run→seal lifecycle | KEEP | Researcher's view; distinct. Mermaid. **Check against Ch6 `fig:impl-session-states`** (possible cross-chapter duplicate). |

## Chapter 6 — Implementation  *(15 figures)*
| Fig | Single message | Verdict | Reasoning |
|---|---|---|---|
| `fig:impl-screens` (console + reader) | real screenshots of both surfaces | KEEP | The "real situation" the supervisor wanted. Raster (permitted). |
| `fig:impl-flow` | the session walkthrough spine | READ-FIRST | **Prime scrap candidate to verify:** the authors said a diagram (the WebSocket *envelope* one) "wasn't needed." Identify whether that is this figure or a listing, then decide. |
| `fig:impl-session-states` | implemented session state machine | READ-FIRST + CONSOLIDATE? | **Check overlap with Ch5 `fig:design-session-lifecycle`.** If it only repeats the design-level lifecycle, merge or cut; if it adds the *implemented* states (gates, recovery), keep. |
| `fig:impl-setup` (Stepper.png) | the setup stepper UI | KEEP | Screenshot evidence. |
| `fig:impl-calibration` (Calibration.png) | calibration UI/flow | KEEP | Screenshot evidence. |
| `fig:impl-replay` (Replay.png) | replay UI | KEEP | Screenshot evidence. |
| `fig:impl-tree` | code/repo directory tree | READ-FIRST → KEEP | Code layout; check it does not duplicate `fig:impl-structure`. |
| `fig:impl-structure` | solution structure / dependency flow | READ-FIRST + CONSOLIDATE? | **Check overlap with `fig:impl-tree`.** One is files, one is dependencies — likely both justified, confirm. |
| `fig:impl-session-manager` | ports-and-adapters at class level | KEEP | Distinct from 5.4 (class altitude vs concept). Good. |
| `fig:impl-provider-seq` | provider handshake protocol sequence | KEEP | Distinct from `fig:design-seam` (protocol sequence vs architectural routing). Mermaid. |
| `fig:impl-pipeline` | 3-stage sensing pipeline split across tiers | KEEP | Distinct; supports I-AOI write-up. |
| `fig:impl-gazemap` | two-stage gaze→word mapping (I-AOI) | KEEP | Excellent; the I-AOI mechanism. **Shorten caption** (currently a paragraph). |
| `fig:impl-context-seq` | capture-and-restore lifecycle | KEEP | The new context-preservation figure; distinct. |
| `fig:impl-context-decision` | residual error → graded outcome | KEEP | Distinct grading logic. **Shorten caption.** |
| `fig:impl-template` (ExperimentTemplate.png) | template editor UI | KEEP | Screenshot evidence. |

---

## Consolidation decisions (the only places a cut is even on the table)

Each needs a focused read, then a yes/no. **None is an automatic deletion.**

1. **5.1 / 5.2 / 5.3 trio (context / container / hero).** Three static views of the same system — the exact overlap that confused the supervisor. *Decision:* build the user-centric **master**, then derive crops. Likely outcome: hero (5.3) becomes the lead; 5.1 becomes a lean context crop; 5.2 stays (containers/channels are a genuinely different altitude). Net: possibly 3→2 if 5.1 adds nothing beyond the hero. **Assess after the master is drawn.**
2. **`fig:design-seam` vs 5.4.** The seam's unique value is the *fallback* (provider active? → publish vs built-in). *Decision:* keep standalone **iff** the fallback isn't already legible in 5.4/loop; otherwise fold a small fallback inset into 5.4. **Read both, then decide.**
3. **Ch5 `fig:design-session-lifecycle` vs Ch6 `fig:impl-session-states`.** *Decision:* keep both only if Ch6 adds *implemented* detail (gates, recovery, checkpoints) beyond the design-level lifecycle. If it is a near-duplicate, cut the Ch6 one and reference the Ch5 figure. **Read Ch6 fig first.**
4. **`fig:impl-tree` vs `fig:impl-structure`.** Files vs dependency flow — probably both justified. **Confirm with a read.**
5. **`fig:impl-flow` / the "WebSocket envelope" diagram the authors themselves doubted.** **Read first;** if it carries no message the prose doesn't already, this is the cleanest legitimate cut.

## Cross-chapter altitude check (keep, but make consistent)
These pairs are **not** duplicates (different altitude) but **must look consistent** (shared style, same terms): 5.4 hexagon ↔ `fig:impl-session-manager` (concept ports ↔ class ports); `fig:design-seam` ↔ `fig:impl-provider-seq` (routing ↔ protocol); `fig:design-loop` ↔ `fig:activity-session` (system loop ↔ actor activity).

---

## Tally
- **~30 figures total.** Confident KEEP: ~18. REDRAW (substantive): **5** (`adaptive-loop`, `design-context`, `design-containers`, `design-modules`, `use-case-diagram`). REFINE/PROMOTE: 2 (`design-twoscreen`, `activity-session`). CITE: 2 (`reading-concept`, `oculomotor`). READ-FIRST before verdict: ~7. Genuine consolidation candidates: **5 pairs/clusters**, yielding *at most* ~2–4 net deletions, each only after a read confirms no lost value.
- Caption-shortening applies report-wide as each figure is touched (Phase 2/4).
