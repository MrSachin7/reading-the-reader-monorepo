# Proposed direction for the planning stage

This brief is a proposal arising from the independent review. It is not a final venue/track decision or a claim that the identified evidence issues are already resolved.

## Working title and central claim

**Reading the Reader: A Modular Platform for Auditable Gaze-Contingent Reading Experiments**

One central claim: a researcher-operated platform can separate sensing, analysis, decision proposals, and typographic intervention while retaining the control and records needed to inspect their behaviour in live reading experiments.

The intended reader is a researcher building or operating gaze-contingent reading studies. The paper should make clear what they could change, how they would run it, and what evidence they would receive. Treat ETRA as the supervisor-suggested audience; leave track, template options, and page budget to the planning stage. No submission dates are part of this brief.

## Abstract seed: five sentences for discussion

Gaze-contingent reading studies must connect eye-tracking signals to changing text while preserving researcher control and an inspectable account of what happened. We present Reading the Reader, a platform with separate sensing, analysis, decision, and intervention contracts, a researcher console, and versioned session export and replay. Its implementation supports manual interventions and researcher-supervised external proposals, including a connector for a collaborator's reading-analysis pipeline. A technical evaluation draws on eight Tobii-backed sessions with four participants, a separate advisory-provider run, backend tests, and an exploratory browser displacement sweep. These sources demonstrate the platform's experimental workflow and expose limitations in event recording and context restoration, motivating further validation before conclusions about reading benefit or complete gaze-to-display latency.

This intentionally omits provisional behavioural and geometric effect sizes. Rewrite it after deciding which audit findings to repair and which to report as limitations.

## Proposed paper structure

| Section | What it must establish | Material to use |
|---|---|---|
| Introduction | A concrete research task: exchange an analysis or intervention strategy while keeping operator control and a comparable record. State the one contribution and its evaluation scope. | Thesis Chapters 1–2, narrowed by this review |
| Related work | Position against adaptive-reading interfaces, gaze-to-text mapping, and research platforms. Distinguish implemented domain workflow from functionality that can be scripted elsewhere. | Supervisor references plus a source-backed platform comparison |
| Platform and design rationale | Explain the two users and one complete loop. Cover replaceable contracts, proposal versus commit, and event provenance. Use framework names only where they clarify deployment. | Chapters 5–6 and the code map |
| Evaluation methods | Separate integration/tests, eight recorded sessions, the advisory run, and geometric trials. Specify participants, texts, order, intervention settings, exact metrics, clocks, versions, and exclusions. | Original exports and audit; author protocol clarification |
| Results | Report integration scope, sensing, precisely labelled telemetry, and restoration behaviour. If retained, present behavioural proxies descriptively with participants and missing observations visible. | Audited/repaired outputs with source hashes |
| Discussion and limitations | Explain the tradeoffs learned: where state belongs, why proposal/commit timing differs, and why a restore needs observable outcomes. Discuss duplication, mapping uncertainty, missing geometry and generalisability. | Findings that survive the evidence checks |
| Conclusion | Restate the instrument's contribution and the evidence that supports it. | Final body only |

Combine Method and System only if the chosen page budget requires it. Avoid reproducing the thesis's requirements chapter, market/pricing survey, development-process narrative, installer instructions, or long technology comparison. Webcam sensing, clinical benefits, learned decision intelligence, and a new fixation detector are outside the present paper's evidence-backed centre.

## Figure and table plan

| Candidate | Source to adapt | Decision |
|---|---|---|
| One overview of the two surfaces and four contracts | Thesis Chapter 5 architecture assets and Chapter 6 screenshots | Redraw compactly; distinguish data flow from ownership/dependencies |
| Proposal → approval/commit → browser restore → record | `adaptive-loop` and `context-preservation` assets in Chapters 5–6 | Combine into a small mechanism figure with the timing boundaries labelled |
| Runtime evidence table or compact plot | Session and RTT outputs in this folder | Use denominators, single-host scope, and separate advisory outlier; avoid a generic “latency” axis |
| Word displacement OFF/original/revised | Raw displacement sweep files | Regenerate only after anchor/baseline matching and missing-word accounting |
| Participant-level behavioural plot, if retained | Audited intervention events | Show four people and the observed event counts; do not reuse pooled dots as though independent participants |

Do not reuse figures merely because they already look finished. The inspected RRT figure hides participant grouping and its caption does not state the missing observation; the revised-restore figure mixes terminology used for different metrics. Both need editorial and methodological revision before reuse.

## Work sequence after this review

1. Settle the systems contribution and choose whether behavioural evidence belongs in the main paper or in a clearly exploratory supplement.
2. Resolve the participant/protocol account and dataset version history. Establish event identity, fix cohort discovery, and rebuild the result tables without changing original recordings.
3. Reconcile the original/revised geometry comparison using fixed anchors and a pinned rendering environment. Decide whether additional latency measurement is needed or current endpoints are sufficient for the narrower claim.
4. Read the two closest suggested papers in full and complete the platform comparison. Do not claim “first” or “no existing platform” on the present evidence.
5. Draft Platform/Methods and Results first; then Related Work, Introduction, Discussion/Conclusion, and finally rewrite the Abstract. Keep a source or analysis output beside every quantitative sentence.

The first factual questions for Sachin and Satish are the session/consent procedure, how text and condition order were chosen, which code/configuration each dataset used, and the scope of the collaborator-code changes. These are inputs to accurate methods reporting, not requests to approve routine writing.
