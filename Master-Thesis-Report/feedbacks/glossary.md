# Terminology Lock (Glossary) — the consistency checklist

**Status:** authoritative for Phase 0–8. Every chapter, figure, caption, and label is swept against this in Phase 8.
**Principle:** the Introduction (`01_Introduction/03_contributions.tex`, `02_goal.tex`) already uses the right words. **Make everything else match the Introduction.** When in doubt, the canonical column wins.

How to use: when writing or editing, use the **USE** term. When sweeping, grep the **AVOID** terms and replace. The "where it's wrong now" column points at the known offenders (mostly diagrams).

---

## 1. Core nouns

| Concept | ✅ USE | ❌ AVOID (for this meaning) | Where it's wrong now |
|---|---|---|---|
| The whole system | **the platform** / **the adaptive reading platform** | "the app", "the tool", "the system" (used loosely), "the application" | scattered prose; verify Ch6 |
| The .NET runtime host (container level) | **the backend** (label: `Backend [ASP.NET Core]`) | "Backend Application Host", "Backend core", "backend application host" | Fig 5.2 ("Backend Application Host") vs Fig 5.3 ("Backend core / real-time loop") |
| The inner core layer (domain + application behind ports) | **the application core** | "Domain" (as a standalone centre label), "Reading Runtime (Application)" as a *synonym* | Fig 5.4 centre says "Domain" + "Reading Runtime (Application)" |
| The web UI | **the web frontend** (two surfaces, below) | "the client", "the UI" (loosely) | verify |
| Participant's screen | **the participant reading surface** (short: **reading surface**) | "reader screen", "participant screen" used interchangeably mid-passage | OK in Ch5; verify Ch6 |
| Researcher's screen | **the researcher console** (short: **the console**) | "control panel", "dashboard", "researcher view" used interchangeably | verify Ch6 / use cases |
| The two-screen idea | **the dual-screen / two-screen workflow** | "second screen" used as the *name* (fine as a descriptor only) | OK |

> Note on "reading runtime": it is a real, useful name for *the orchestrator that drives the loop* (the `ExperimentSessionManager` and friends). Keep it for that. Do **not** also use it as the label for the centre of the hexagon — that centre is **the application core**.

## 2. The four concerns (always this set, this order, these names)

**sensing → eye-movement analysis → decision → intervention**

| Concern | ✅ USE | ❌ AVOID |
|---|---|---|
| 1 | **sensing** | "gaze capture" as the *module* name |
| 2 | **eye-movement analysis** (short: **analysis**) | "processing", "detection" as the module name |
| 3 | **decision** | "decisioning" in prose (fine in code identifiers only) |
| 4 | **intervention** | "adaptation"/"change"/"modification" as the *module* name |

- A **module** is a replaceable unit behind a **contract** (= a **port**). Use *module* + *contract/port*. AVOID "component", "pizza", "block", "pillar" (for this meaning).
- The adjective **adaptive** describes the platform/loop. The noun for a text change is always **intervention** (never "an adaptation" as a countable noun).
- **pluggable** is the lead adjective for extensibility; **modular** describes the architectural quality. Do not swap them randomly sentence-to-sentence.

## 3. The decision/provider family (the worst offender — read carefully)

There is a real distinction. Encode it; do not blur it.

| Concept | ✅ USE | ❌ AVOID | Note |
|---|---|---|---|
| The general out-of-process framework / protocol actor (can serve analysis **or** decision) | **External Module Provider** | "External system provider", "external plugin" | This is the **use-case actor** and the protocol in Ch6 (`ModuleProvider*`) |
| The decision seam specifically (architecture views) | **External Decision Provider** | "External Provider", "External strategy", "External system" | Use this in Figs 5.1–5.4 for the decision seam |
| An implementation behind the decision port | **decision strategy** (built-in **rule-based strategy** / **external decision strategy**) | "decider", "decision module" (loosely) | matches code `IDecisionStrategy` |
| An implementation behind the analysis port | **analysis strategy** (built-in / **external analysis strategy**) | "External strategy" (ambiguous) | Fig 5.4 labels analysis impl "External strategy" — make it "External analysis strategy" |
| Source of a decision in the loop | **decision provider** (built-in or external) | "AI", "the model", "DCN" (loosely) | |

**The one sentence to add where they first co-occur (Ch5 §modules or §extensibility):**
> *An External Decision Provider is an External Module Provider that serves the decision port; the same out-of-process framework also serves the analysis port (as an external analysis provider).*

## 4. Control / human-in-the-loop

| Concept | ✅ USE | ❌ AVOID |
|---|---|---|
| Researcher applies a change directly | **manual** (operation/intervention) | "by hand" inconsistently |
| Provider proposes, researcher approves/rejects | **advisory mode** | "hybrid", "semi-auto" |
| Provider applies directly | **autonomous mode** | "automatic", "auto" (undefined) |
| Who operates the platform | **the researcher** | "the operator", "the user" |
| Who reads (in a study) | **the participant** | "the user", "the subject" |
| Who reads (general concept, Ch1/Ch2) | **the reader** | mixing reader/participant inside one passage |

## 5. Hardware / sensing

| Concept | ✅ USE | ❌ AVOID |
|---|---|---|
| The device (generic) | **the eye tracker** | "the Tobii" as if it is the only option, "I-tracker", "eye-tracker device" (except the use-case actor name) |
| The specific device | **the Tobii tracker** / **a Tobii device** (an *instance* of the generic) | implying Tobii ≡ eye tracker |
| Hardware-free source | **the simulated (mouse) source** / **mouse mode** | "fake gaze", "demo mode" (loosely) |
| Fixation detection method | **area-of-interest (I-AOI), dwell-based** | "I-VT", "I-DT", "velocity threshold" — **we do not use these; do not imply we do** |

## 6. Data / records / events

| Concept | ✅ USE | ❌ AVOID |
|---|---|---|
| The saved session | **the session record** (sealed, schema-versioned) | "the log", "the dump", "the data file" |
| Oculomotor events | **fixations, saccades, regressions** | omitting regressions (they are first-class — verified in code) |
| The provider seam dataflow | **context out, proposals in** (bidirectional) | "decision requests" (one-shot framing) |
| Restore-after-change | **context preservation** + **Reading Resume Time (RRT)** (define once) | "recovery" used for two different things |

## 7. Relationship-label conventions (figures)

- Arrowheads encode **who initiates** (not "one-way vs two-way"). State this in every legend that uses directional arrows.
- One visual style per relationship type, identical across all figures (defined in the shared figure-style file): real-time channel, request/response, external seam (dashed), incidental I/O. **If a line's style carries no meaning, remove the distinction.**
- Provider seam is always **dashed** and labelled **"context ↔ proposals"** with the **C3 (out-of-scope)** marker.

---

## 8. Phase 8 sweep — grep patterns for the violations

Run from `Master-Thesis-Report/`:

```
grep -rni "decision request"                 Chapters        # → context/proposals
grep -rni "external strategy\|external system provider" Chapters   # → External Decision/Analysis Provider
grep -rni "application host\|backend core"    Chapters        # → "Backend" / "application core"
grep -rni "reading runtime (application)"     Chapters        # → "application core" for the hexagon centre
grep -rniE "\bthe (app|tool)\b"               Chapters        # → "the platform"
grep -rni "operator"                          Chapters        # → "researcher" (unless quoting a driver)
grep -rni "I-VT\|I-DT\|velocity threshold"    Chapters        # → must be absent (we use I-AOI)
grep -rni "Tobii"                             Chapters        # audit each: instance vs generic
```

A term is "closed" only when its grep returns no illegitimate hits.
