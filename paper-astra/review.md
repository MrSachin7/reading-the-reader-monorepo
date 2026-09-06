# Independent thesis and implementation review

## What the paper can be about

The strongest contribution is an instrument for conducting and inspecting adaptive-reading experiments: it separates gaze acquisition, analysis, intervention proposals, and presentation changes while keeping the researcher in control and retaining a session record. This is grounded in the thesis's stated architectural scope, the implemented interfaces, the two browser surfaces, the provider examples, and the exported sessions.

The useful research question is what these boundaries let a researcher vary and observe. A paper organised around that question can explain the system through one concrete experiment, then evaluate integration, sensing, transport, and the observable consequences of an intervention. A catalogue of software features would obscure this contribution.

Context preservation is a valuable worked example. The record exposed a restore strategy that could move the text farther than the reflow itself. That is a reason to make adaptations measurable. The present results do not justify claiming that the revised restore improves human reading, eliminates displacement, or guarantees continuity.

## Review scope and verification

The review followed the thesis's introduction and contribution statements, related work and problem statement, research methodology, architectural requirements, system design, implementation, evaluation, discussion, and conclusion. Requirements were inspected for the properties relevant to publication rather than treated as a manuscript outline. The LaTeX source was the thesis text; no compiled full-thesis PDF was found in the supplied file inventory. The reading-resume and revised-restore PDF figures were rendered and visually inspected.

Implementation inspection covered the gaze ingest and DOM mapping path, analysis and decision strategies, provider gateway and connector, intervention scheduling and restoration, replay/export, and the associated backend tests. [The code map](code-map.md) provides specific paths.

The independent [audit](analysis/audit_evidence.py) reads the original JSON exports and the original/revised displacement results. It reproduces the published reading-resume and regression summaries and verifies their agreement numerically with the committed CSVs. It also checks sample ordering, repeated payloads, intervention identities, telemetry/session matching, cohort membership, missing observations, and cross-version sweep comparability. It does not re-execute the historical reading sessions or the browser sweep.

The existing backend test project passed **101/101 tests** under .NET 10.0.103. Existing nullable-reference and xUnit analyser warnings were emitted. The first attempt was blocked by the sandbox's restriction on MSBuild process communication; the authorised retry succeeded. This verifies the current core/persistence suite on macOS, not Tobii hardware or browser behaviour. The thesis's 100/100 count is historical and should be tied to its original revision if retained.

## Evidence that reproduces

| Evidence | Recomputed result | What it supports |
|---|---|---|
| Main cohort | 4 participants, 8 sessions, 175,860 gaze samples | Small laboratory demonstration of operation and recording |
| Sampling rate | Session mean 89.886 Hz; sample SD 0.207 Hz; range approximately 89.41–90.06 Hz | Delivered device-timestamp throughput near the nominal 90 Hz |
| Gaze validity | Session mean 95.556%; range 92.473–98.012% | At least one eye has a tracker-valid gaze point; not word-assignment accuracy |
| Calibration | All eight validations pass; accuracy approximately 0.30–0.69 degrees; precision 0.08–0.33 degrees | Reported calibration quality in these sessions |
| Participant client RTT, main cohort | n=387; median 1 ms; p95 3 ms; max 41 ms | Local client/backend ping-pong response |
| Researcher client RTT, main cohort | n=393; median 1 ms; p95 8.4 ms; max 28 ms | Same transport measure for the console |
| Applied interventions | 19 with preservation, 26 without; all 45 record source `manual` and boundary `immediate` | Manual interventions were applied and exported |
| Reading-resume proxy | Median 482 ms with preservation, 650 ms without; observed n=19 and n=25 | Descriptive time to next forward movement; one of 26 events has no observation |
| Original regression estimator | Mean post-event proportion 22.760% with versus 33.013% without | Reproduction of the existing estimator, subject to event-duplication concerns below |
| Preservation outcomes | 19 outcomes: 3 preserved, 16 degraded; each matches an intervention timestamp | The original mechanism reported outcomes, including poor ones |
| Separate advisory session | 91.19 s; 8,004 gaze samples; 8 unique proposal IDs represented by 16 lifecycle records | A reference provider exercised the advisory path |
| Advisory provider RTT | n=8; median 4.5 ms; p95 6.3 ms; max 7 ms | Returned, correlated provider responses in this run |

Sources: [machine-readable audit](analysis/outputs/evidence-audit.json), [session table](analysis/outputs/session-audit.csv), and [event table](analysis/outputs/post-intervention-audit.csv). Quantiles use linear interpolation. Hz uses `(n-1)/(last device timestamp-first device timestamp)`; validity is the proportion of all recorded gaze samples with either eye marked `Valid`. These are session-level measurements, not an isolated reading-phase benchmark.

Reading-resume time follows the original analysis: from backend `appliedAtUnixMs` to the first saccade start labelled `forward` or `line-change-forward`, capped at 30 seconds or the next intervention. It is not observed comprehension recovery or display-onset latency. Pre/post regression proportions use up to five seconds, truncated at adjacent interventions, and are averaged **over non-empty intervention windows**, not pooled over every saccade. Neither the 45 interventions nor the gaze samples are independent participants.

## Findings to resolve before manuscript claims are fixed

### 1. Repeated derived events affect the behavioural evidence

**High priority; confirmed data finding, root cause not yet established.** Across 9,311 fixation records, 280 are repeats of an identical fixation payload within their session. Across 3,225 saccade records, 652 are repeats of an identical saccade payload, approximately 20.2%. This counts extra copies, not the number of duplicate groups. Raw gaze timestamps and gaze sequence numbers have no duplicates or non-increasing device timestamps in the checked sessions; intervention IDs are also unique.

The original analysis counts each exported saccade row. An exact-payload deduplication sensitivity leaves the reading-resume medians unchanged but changes the with-preservation pre/post means from 29.296/22.760% to 30.884/23.020%; the without-preservation means change from 31.961/33.013% to 32.691/33.015%. The direction survives this check, but that does not validate either an event-identity definition or an efficacy claim.

The current `RecordNewEyeMovementEvents` / `ExtractNewRecentItems` implementation compares recent snapshot lists against their previous head. Repeated snapshots or changes to a record's metadata are plausible places to investigate. The provider can also synthesize word transitions when its cross-word event collection is empty. These are candidate explanations, not a proven diagnosis of the historical exports.

**Action:** establish canonical fixation/saccade identity and provenance, trace a repeated event through the provider and exporter, then regenerate event counts and plots. Keep exact-payload deduplication labelled as a sensitivity analysis until that is done. Do not silently replace the thesis's estimator. See [integrity results](analysis/outputs/integrity-audit.csv).

### 2. Latency claims need different names and endpoints

**High priority; confirmed in code and exports.** Client RTT is a ping-pong measurement sampled approximately every five seconds, using the browser clock. It is not latency for each gaze sample. In the eight-session cohort all 780 recorded client pings are under 100 ms; that wording is supported.

The external `pipeline-decision` measurement subtracts the backend's **latest** gaze-ingest timestamp from the time a decision-context request is published. It does not correlate a triggering gaze sample to a returned proposal. It excludes provider work, human approval, commit-boundary waiting, browser receipt, layout, restoration, and repaint. Calling it end-to-end gaze-to-intervention latency is therefore unsupported. The 14,015 observations in the advisory run have median 6 ms, p95 11 ms and max 46 ms, but they are dispatch-time freshness measurements, not 14,015 interventions.

The eight provider RTT samples measure requests with matched returned responses. The exact median is 4.5 ms; the thesis rounds it to 5 ms. These response times and freshness observations cannot be added as separate distribution summaries to estimate total latency.

The advisory session also contains **one participant-client RTT of 315 ms among 17 pings**. It does not contradict the eight-session cohort result, but it rules out an unqualified claim covering all collected telemetry.

The collaborator connector's default submission interval is 180 samples, approximately two seconds at 90 Hz. That configuration is an additional reason to separate gaze acquisition, analysis update cadence, and proposal dispatch. Its actual historical configuration should be documented; a low dispatch freshness value cannot establish fresh analysis input.

**Action:** keep the current RTT and freshness results accurately labelled. If the paper needs an end-to-end claim, add correlation IDs and explicit timestamps from triggering input through provider return and browser presentation. Measure deliberate boundary waiting separately. Treat 100 ms as a design target, not a demonstrated perceptual threshold for this particular reader.

### 3. The behavioural protocol is incompletely and inconsistently described

**High priority; confirmed export differences, protocol explanation requires the authors.** The evaluation and threats sections describe one content item. The exports contain two distinct texts:

| Participant | With preservation | Without preservation | Recorded condition order |
|---|---|---|---|
| P1 | Metal Detectors | Nuclear Science | With → without |
| P2 | Nuclear Science | Metal Detectors | Without → with |
| P3 | Metal Detectors | Nuclear Science | Without → with |
| P4 | Nuclear Science | Metal Detectors | Without → with |

Each text occurs twice per condition, but order is three-to-one, and intervention types, counts, and session lengths vary. Balanced text counts alone do not establish randomisation, matched difficulty, or a controlled causal comparison. Both conditions contain palette changes as well as layout interventions; the preservation condition bundles positional restoration with highlighting.

P3/without has final provider metadata `rule-based`/`advisory`, while all 11 of its interventions are manual and it has no recorded proposals. The export factory takes condition metadata from the **final** snapshot. This may reflect a setting change, but it cannot be resolved from the label alone. Say that all recorded interventions were manual; do not assert that no automated strategy was ever configured.

All 45 interventions record `immediate`, so these sessions do not demonstrate the benefit of sentence/paragraph boundary scheduling. Scheduling is an implemented and tested capability, not a tested reading effect here. Every session also contains quiz answers (3 or 5), despite the requirements coverage table saying the quiz was not exercised. Quiz presence is not evidence of a validated comprehension comparison.

The ethics section says no human participants or personal data were involved during engineering, while the evaluation reports four participants and the limitations identify authors/acquaintances as the convenience sample. These accounts need one accurate explanation of the recorded sessions, consent, and the applicable institutional review or exemption determination. This review makes no determination about approval requirements and invents no approval statement.

**Action:** reconstruct the session protocol and condition history, distinguish complete-session duration from reading duration, and obtain the factual participant/consent account. Use descriptive case-study language throughout. Do not infer a highlight effect from a condition that bundles highlighting with restoration.

### 4. The displacement sweep needs matching and missingness checks

**High priority; confirmed in raw sweep files.** There are 66 scheduled trials per version, crossing 11 interventions with six page positions. Both on/off word displacements are available for **62 original trials and 63 revised trials**. With the implemented `ON > OFF + 1 px` definition, over-repositioning occurs in **45/62** original pairs and **4/63** revised pairs. The thesis prose uses 66 as the denominator, while the plotted legend already uses 62 and 63. The harness README has another stale original numerator, 46.

Available-case medians reproduce approximately 104.4 px with the original restore and 32.4 px with the revised restore. However, the baseline OFF medians differ between runs: 32.39 px in the original file and 34.34 px in the revised file. More seriously, **21/66 matching intervention/page keys have different recorded anchor token IDs**, and 26 have an OFF displacement difference above 1 px where both values exist. This prevents treating the files as a perfectly matched, otherwise identical comparison without further investigation.

Missing measurements occur in line-width trials where the word may no longer be in the rendered page. A missing word must not be counted as zero displacement or a successful restore. The published figure's axes also call the on/off word measurements “residual” and “induced displacement,” terms used elsewhere for the hook's different sentence-anchor diagnostics. The plotting script reads the word-level OFF/ON data: the paper should label those quantities directly.

The current hook captures a word's offset but tries to relocate a sentence wrapper before the token. A low sentence-anchor error therefore does not guarantee the original word stayed still. The harness uses a deterministic viewport fallback with gaze disabled, not a participant's actual gaze. The reader study used the original restore; the revised version has no corresponding reader study.

**Action:** pin both implementation versions and the browser/font environment, use the same preselected token in all conditions, log baseline geometry and on/off anchor identity, and explicitly record disappearance. Regenerate the three-condition table and figure from matched trials. Existing numbers may be described as exploratory engineering evidence, with these caveats, but should not lead the abstract.

### 5. Several architecture descriptions exceed what was verified

**Medium priority; high-confidence source inspection, not a full fault-injection audit.**

| Thesis wording | More accurate manuscript wording |
|---|---|
| All four modules have compiler-enforced boundaries | The backend's project references point inward, and two tests check specified assembly dependencies. Several strategies and interventions share the application assembly; this is not four separately enforced deployment units. |
| Every violating reference must fail to compile | The existing graph prevents use of absent references and tests guard named dependencies. The compiler alone does not enforce an architectural policy against every possible future project-reference change. |
| Gaze recording is lock-free | Latest-sample publication avoids the lifecycle semaphore, but `RecordGazeSample` takes `_historyGate`. |
| Three outside decision providers | One reference decision provider, one reference analysis provider, and a collaborator-analysis connector. These are three provider implementations, not three decision models. |
| An independent team validated the contract | The thesis authors wrote the connector around another team's analysis code. This demonstrates integration with collaborator software, not an unaided external developer study. |
| Collaborator source was unmodified | The current preprocessor contains transport-only `cross_word_saccades` additions. State exactly what was adapted and pin the upstream baseline before claiming unchanged source or unchanged algorithms. |
| Disconnect automatically falls back to the built-in strategy | The inspected external strategy/gateway path returns no result when unavailable; the coordinators do not select the built-in strategy on that basis. A detach status and a continuing session are not sufficient evidence of algorithm fallback. Verify or narrow this claim. |
| Any new intervention is one registration | Registration adds backend modules within the existing presentation/appearance vocabulary. New rendering behaviour may require extending frontend contracts and code. |
| Session replay proves full reproducibility | Replay and export support reconstruction of recorded events. Scientific reproduction also needs exact code/provider versions, processing parameters, fonts, clock assumptions, and a valid protocol. |

**Action:** use the concrete contract and lifecycle behaviour as the systems contribution. Include one small integration example and its change footprint. A new browser benchmark, independent integration, or fault-injection test would be additional evidence, not something already demonstrated by the thesis sessions.

### 6. The existing analysis entry point no longer isolates the cohort

**High priority for reproducibility; confirmed source/data mismatch.** `Experiments/analysis/_lib.py::discover` recursively takes JSON files outside directories named `telemetry`, infers a preservation condition from the parent folder, and assigns participant labels before checking schema. The two root-level advisory files are therefore discovered as cohort candidates, including a telemetry file that `load_file` will reject as the wrong schema. Their names would also change the sorted participant aliases. The committed outputs remain useful historical artifacts, but the advertised rerun path is not currently a reliable reproduction of them.

**Action:** adopt an explicit session inclusion manifest, classify by schema, join telemetry by session ID, and allocate stable study labels independently of file discovery. The independent audit in this folder already implements the needed separation for this review, leaving the original analysis untouched. The old README/notebook generator also has stale `N=2` and “all font-size changes” descriptions.

## Implication for drafting

Start drafting around the modular experiment workflow and precisely scoped technical evidence. Treat the preservation comparison as an instrument-development example until event identity, protocol reporting, and geometry matching have been resolved. There is no need to make improved reading, validated AI decisions, universal platform novelty, or sub-100-ms visible adaptation the paper's claim.

The next planning conversation can use [the planning brief](planning-brief.md). The principal factual questions for the authors are the session protocol and consent account, the final provider-setting discrepancy, the exact historical code/configuration for each dataset, and the collaborator integration's provenance. These do not prevent outlining the systems paper now, but they must be resolved before publication-ready methods and results.
