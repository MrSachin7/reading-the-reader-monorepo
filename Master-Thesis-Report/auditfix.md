# Audit Fix Log — What Was Fixed and What Remains

**Date:** 2026-06-26
**Scope:** Examiner-style audit of the full draft, then the fixes applied in this session. Build verified clean after every change (`latexmk -xelatex main.tex`, exit 0, no undefined references or citations; PDF 146 pp).

---

## ✅ Fixed in this session

| # | Problem | Resolution | Files |
|---|---|---|---|
| P1-1 | **NFR2 claimed "end-to-end gaze-to-intervention latency ≤100 ms" but only the transport + decision-dispatch legs were measured** (the client-side render of the change was never timed), yet marked "Met." | **Reworded NFR2** to bound the latency "from a gaze sample to the **dispatch** of the resulting intervention" (which is exactly what is instrumented), and added an explicit sentence in the performance section stating the client-side repaint is a single browser render that is **not** separately instrumented and is excluded from the figures. The "Met" verdict is now accurate to the reworded scope. | `04_Requirements/05_non_functional_requirements.tex`, `07_Evaluation/04_performance.tex` |
| P2-1 | **Unexplained tension:** with preservation the reader resumed *faster* (RRT 482 vs 650 ms) yet the restore *displaced them further* than the reflow did. | Confirmed cause with the authors: the with-preservation condition runs the semantic-restart restore **with its highlight cue active** (the restored sentence is briefly flashed, `sec:impl-context`), and that highlight — not the restore geometry — plausibly carries the behavioural gain (consistent with Jensen et al., who found highlighting drove the significant recovery improvement). Documented in three places: a factual note in the Evaluation setup, an interpretation in the Discussion RQ3 paragraph that reconciles the two measures, and a **third construct threat** flagging the restore-vs-highlight confound. | `07_Evaluation/05_context.tex`, `07_Evaluation/07_threats.tex`, `08_Discussion/01_problem_statement.tex` |
| P1-2 | **Abstract framing** of context preservation read as "the mechanism works well," which the geometric over-repositioning contradicts. | Softened the Abstract from "Context preservation lowered both…" to "With context preservation enabled, both… were lower," attributing the result to the **condition** rather than asserting the mechanism's geometry succeeded. The existing "two shortfalls stated openly" sentence (over-repositioning) stays adjacent. | `Frontmatter/Abstract.tex` |
| P2-3 | **Module-provider vs decision-provider** distinction was used consistently but never *taught* (supervisor feedback-2 §2.1 asked for one explicit sentence). | Added one sentence where the decision seam is made concrete: "An external decision provider is … a module provider specialised to the decision port; the same out-of-process framework serves the analysis port in exactly the same way." | `05_SystemDesign/06_extensibility.tex` |
| P2-2 | **Length** (~124 pp main content) flagged against the old ~60 pp / 100 pp ceiling guidance. | Per the authors: **there is no page limit.** Removed the page-target guidance from the thesis-authoring rules so it is not flagged again, and made **no content cuts**. | `Master-Thesis-Report/CLAUDE.md` |
| P3 | **`main.bcf-SAVE-ERROR`** (a biber build-error artifact) was committed to git in the last pull. | Deleted the file and added `*.bcf-SAVE-ERROR` and a general `*-SAVE-ERROR` pattern to `.gitignore` (it previously only ignored `*.bbl-SAVE-ERROR`, which is why this slipped through). | `.gitignore`, file deleted |
| — | **Captions too long** (feedback-2 §4.2). | Already fixed by co-author in `b182b99`: captions shortened, short `\caption[...]{...}` forms added for the new List of Figures, `font=small` set globally in `Setup/Settings.tex`. Verified, no further action. | — |

---

## ◻️ Remaining — polish only (no grade risk)

- **78 overfull `\hbox` warnings** (worst ~60 pt). Cosmetic margin overflow, mostly in tables and long identifiers. Fix opportunistically by wrapping long camelCase identifiers in `\idtt{}` (already defined in `Setup/Preamble.tex`) or rebreaking the offending table cells. Find them with: `grep -n "Overfull" main.log`. Not blocking.

---

## 🎤 Defense-prep only (no document change needed — rehearse these)

1. **NFR2:** "We bound and measured gaze→dispatch (transport 1–8 ms, decision pipeline ≤46 ms max). The client repaint is one browser frame, un-instrumented and excluded from the figures." Be ready for "so is the *perceived* response within budget?" → yes, by a wide margin even adding a frame.
2. **RRT vs displacement:** "The faster resume is carried by the highlight cue, not the restore geometry; the geometry over-repositions on small reflows and we treat that as a finding and future work. The conditions bundle restore + highlight, which we record as a confound."
3. **I-AOI** (dwell-based, 90/70/135 ms, no velocity threshold) — already correct in the text.
4. **Line-bias is not a Kalman filter** — hysteresis bias borrowing the intuition, not the machinery.
5. **Independent validation:** lead with Reading-the-Struggle being the **live analysis source** of the evaluation, not a one-off connection.
6. **Frontend has no automated tests** (acknowledged): "typed production build in CI + full mouse-sim walkthrough of read/intervene/replay."
7. **Capability matrix (Tab 2.2)** "Partial" cells for PsychoPy/Psychtoolbox are the authors' assessment — be ready to justify each concretely.

---

## Net effect on the claims

The two places where the draft's headline claims out-ran the evidence — the NFR2 latency scope and the "context-preserving" framing — are now calibrated to exactly what was measured, and the one apparent internal contradiction (faster resume despite larger displacement) is explained and its confound disclosed. These were the only substantive examiner exposures; the architecture-and-evaluation spine was already strong. The thesis is now internally consistent between what it claims, what it measures, and what it concedes.
