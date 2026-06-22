# Excalidraw master-diagram prompt

**How to use (for us):** copy everything below the line into a fresh AI chat (one that can output an
importable `.excalidraw` JSON scene, e.g. Claude/GPT). It is fully self-contained. The DTU colours,
labels, and layout are locked so the result is consistent with the thesis. After you get the JSON,
import it in Excalidraw (hamburger menu → Open) and fine-tune by hand.

The authoritative spec is THIS prompt. (A rough TikZ mock-up exists at
`Chapters/05_SystemDesign/platform-master.tikz` / `feedbacks/master-diagram-preview.pdf` for visual
reference only — note the advisory/auto/proposal chips shown there are intentionally **dropped** here.)

---------------------------------- COPY EVERYTHING BELOW THIS LINE ----------------------------------

# Task

You are drawing a clean, friendly, **hand-drawn-style architecture diagram** in **Excalidraw** for a
master's thesis (DTU, software engineering). Produce a **valid, importable Excalidraw scene as JSON**
(`{"type":"excalidraw","version":2,"source":"https://excalidraw.com","elements":[...],"appState":{"viewBackgroundColor":"#ffffff"},"files":{}}`).
Use real Excalidraw element objects (`rectangle`, `ellipse`, `diamond`, `text`, `arrow`, `line`,
`freedraw`) with `roughness: 1` (the sketchy look), `strokeWidth: 2`, rounded corners, and bound text
where sensible. If you cannot guarantee perfectly valid JSON, instead output a precise element-by-element
build list (every shape with x/y/size/colour/label and every arrow with endpoints), but JSON is preferred.

# What the diagram must communicate (intent — read first)

It depicts a research platform called **Reading the Reader**: a *researcher-operated, gaze-driven adaptive
reading system with two screens*. A **participant** reads text on their screen while an **eye tracker at the
foot of that screen** captures their gaze. A central **backend** turns gaze into reading events and adapts
the text live, while **mirroring** the participant's gaze to a second screen — the **researcher's console** —
from which the researcher steers the session. The decision of *when/how* to adapt can come from the
researcher, a built-in rule, or a **pluggable external/AI decision provider** that connects through a
**well-defined API** (the API is part of the thesis; the AI itself is out of scope). Every session is saved
to a **reproducible record**. The whole thing is a closed **real-time loop** between two people.

The single most important visual ideas:
1. **The two humans are the focus**, one at each end; the platform lives *between* them.
2. **The eye tracker is an interface drawn at the bottom of the participant's monitor**, not a separate box.
3. **The external provider is reached through our API** (draw it as a cloud just outside the system).
It must look as clear and approachable as a good explainer illustration: real-looking monitors, simple
people, a cloud for external software, generous whitespace, gently curved labelled arrows.

# Canvas & layout (≈ 1700 wide × 1000 tall, origin top-left, x→right, y→down)

Left-to-right the scene reads: Participant → their monitor (with tracker) → Backend → Researcher's
monitor → Researcher. The external provider sits as a cloud above-right; the session record sits below the
backend. Approximate centres (place, then nudge for balance):

| Element | Centre (x, y) | Notes |
|---|---|---|
| Participant (person) | (150, 470) | simple bust, facing right |
| Participant monitor | (470, 420) | screen ≈ 300×210 on a stand |
| Tobii eye tracker | (470, 530) | thin dark bar across the **bottom of that screen** |
| Backend (hub) | (860, 420) | rounded rectangle ≈ 280×190 |
| Researcher monitor | (1250, 420) | same monitor, different screen content |
| Researcher (person) | (1570, 470) | bust, facing left |
| External decision provider | (1080, 130) | **cloud**, above-right |
| Session record | (860, 760) | database cylinder |
| Legend | (150, 920) | bottom-left row |

# Elements (draw each; labels are verbatim)

1. **Participant** — a simple person/bust (head circle + rounded shoulders). Colour DTU navy `#030F4F`
   (filled light, `#030F4F` stroke). Text label **"Participant"** (bold) just below.
2. **Participant monitor** — a desktop monitor: a rounded rectangle screen with a dark navy bezel
   (`#030F4F`), a short stand-neck and a base (grey `#DADADA`). Inside the white screen show **three or four
   light-grey horizontal "text lines"**, and a small typography cue **"a  a  a"** in increasing sizes (this
   signals adaptive type). Put a small **DTU-red `#990000` dot** on the text = the current gaze fixation.
3. **Tobii eye tracker** — a thin dark rounded bar spanning the **bottom edge of the participant's screen**,
   with two tiny red sensor dots. Small italic label beneath: **"Tobii eye tracker (at the foot of the screen)"**.
4. **Backend** — a rounded rectangle, DTU-red `#990000` stroke, very light red fill. Title (bold)
   **"Reading the Reader backend"**, then smaller **"(application core)"**, then a small line
   **"sensing · analysis · decision · intervention"**.
5. **Researcher monitor** — same monitor style. Inside: a couple of grey "text lines" (the **mirror** of the
   participant's text) **overlaid with a cluster of small orange `#FC7634` squares** = a live gaze heat
   overlay. **Do NOT draw any buttons, toggles, or mode chips** (no "Advisory/Autonomous/Apply/proposal").
   Small italic caption beneath the screen: **"live mirror + gaze overlay"**.
6. **Researcher** — person/bust like the participant (use a slightly lighter navy fill to distinguish).
   Bold label **"Researcher"** below.
7. **External decision provider** — a **cloud** (overlapping ellipses or a cloud freedraw), DTU-red `#990000`,
   **dashed** outline, light fill. Inside small bold red text **"AI / rule-based"**. Caption beneath the
   cloud: bold **"External decision provider"** then italic **"well-defined API · out of scope"**.
8. **Session record** — a database **cylinder** (an ellipse top on a rectangle). Navy `#030F4F`. Label bold
   **"Session record"** then small **"export · replay · re-import"**.

# Connections (arrows — gently curved, labelled; an arrowhead shows who initiates)

Use these four visual styles (define once, reuse — consistency matters):
- **real-time** = solid navy `#030F4F`, medium-thick.
- **control** = solid DTU-blue `#2F3EEA`.
- **looks/operates** = thin dashed grey `#5B5B5B`.
- **external API seam** = dashed DTU-red `#990000`, double-headed.

| From → To | Label | Style |
|---|---|---|
| Participant → participant screen | `gaze` | looks (dashed grey) |
| Participant monitor (tracker) → Backend | `gaze` | real-time |
| Backend → Participant monitor | `adapted text` | real-time (curve over the top) |
| Backend → Researcher monitor | `live mirror` | real-time |
| Researcher monitor → Backend | `control` | control (blue) |
| Researcher → researcher screen | `operates` | looks (dashed grey) |
| Backend ↔ External provider cloud | `context / proposals` | external API seam (dashed red, double-headed) |
| Backend → Session record | `writes` | real-time |

No arrow labels may overlap each other or any shape — keep them in open space, short, one line where possible.

# Legend (bottom-left, one compact row, with a leading note)

Italic note: **"Legend (an arrowhead shows who initiates):"** then four key swatches with text:
`real-time loop (gaze + adaptation)` · `researcher control` · `looks at / operates the screen` ·
`external API seam (out of scope)`.

# Style rules (non-negotiable)

- **Hand-drawn aesthetic** (`roughness: 1`), rounded corners, friendly but professional.
- **Palette only:** DTU red `#990000`, navy `#030F4F`, blue `#2F3EEA`, orange `#FC7634`, grey `#DADADA`,
  white `#ffffff`, dark text `#1e1e1e`. No other colours.
- **Generous whitespace.** Do not crowd. The two people and two monitors should be visually dominant; the
  cloud and the record are secondary (slightly smaller / lighter).
- **One name per concept**, exactly as written above (e.g. always "backend", "External decision provider",
  "Tobii eye tracker", "Session record"; never invent synonyms).
- Fonts: use Excalidraw's hand-drawn font; titles ~20px bold, body ~16px, captions ~13px italic.
- The result will later be cropped into close-up figures (sensing pipeline, backend internals, researcher
  console, provider API, record/replay), so keep each region cleanly separable with clear surrounding space.

# Caption (for reference, do not draw inside the canvas)

"The Reading the Reader platform as a researcher–participant adaptive loop. The participant reads on one
screen while a Tobii eye tracker at the foot of that screen senses their gaze; the backend turns gaze into
reading events, adapts the text, and mirrors the gaze and analysis to the researcher's screen, where the
session is steered. An external decision provider may propose interventions through a defined API, and every
session is written to a reproducible record."

Now output the Excalidraw JSON scene.

---------------------------------- REVISION 1 (legibility) ----------------------------------

The layout and style of the generated scene are good; the only problem is that filled shapes use
dense hachure that hides their text. Apply these fixes and keep everything else unchanged:

1. **Backend box** — change the fill from hachure to a **solid, very light red** (`backgroundColor`
   "#ffecec", `fillStyle` "solid"), keeping the red `#990000` border. Make its text fully legible,
   dark `#1e1e1e`, in three stacked lines with clear vertical spacing (never overlapping):
   - line 1 (bold, ~20px): "Reading the Reader backend"
   - line 2 (~14px): "(application core)"
   - line 3 (~14px): "sensing · analysis · decision · intervention"
   Increase the box height so the three lines sit comfortably with padding.
2. **External decision provider cloud** — change the fill from dense hachure to a **light solid red**
   (`backgroundColor` "#fbeaea", `fillStyle` "solid"), keep the **dashed** red `#990000` outline, and
   make the inside label "AI / rule-based" small but fully readable (red `#990000`, ~13px), centred.
3. Everything else stays: two monitors, the people, the Tobii bar with red dots, the participant
   "a a a" + gaze dot, the researcher heat overlay, the session-record cylinder, all arrows, the legend.
4. (Optional) rename the "participant monitor → backend" arrow label from "gaze" to "gaze stream" so it
   differs from the participant→screen "gaze".
Keep the hand-drawn style (roughness 1), the DTU palette only, and the generous whitespace. Re-output the
full Excalidraw JSON.

---------------------------------- REVISION 2 (provider flow, API, intervention hints) ----------------------------------

Apply to the current scene; keep everything else (layout, monitors, people, Tobii bar, record, legend, legibility fixes).

A) **External provider data flow** — replace the single double-headed "context / proposals" seam with TWO
   clearly directed arrows between the backend and the provider cloud (our app feeds gaze + context; the
   provider returns commands):
   - backend → cloud, label "gaze + context"
   - cloud → backend, label "commands (interventions)"
B) **Make the well-defined API visible** — midway on that seam add a small rounded-rectangle node, bold
   "Provider API" + smaller "(WebSocket contract)", solid navy `#030F4F` border, white solid fill (crisp,
   legible). Route the two arrows through it: backend↔API segment SOLID navy `#030F4F` (we own/define it);
   API↔cloud segment DASHED red `#990000` (external / out of scope). Fallback if too complex: keep both
   arrows dashed red and just place the labelled "Provider API" node on the seam.
C) **Hint the typographic interventions** on the participant screen (subtle): keep "a a a" (size), render one
   line noticeably larger and one with wide letter-spacing (e.g. "s p a c i n g"), keep the red gaze dot, and
   add a small italic grey note near the "adapted text" arrow: "e.g. font size · line width · line height ·
   letter spacing · theme". A hint, not a control panel. (Real intervention set per §6.3 / ResearcherLiveView:
   font family, font size, line width, line height, letter spacing, theme mode, colour palette.)
Keep hand-drawn style (roughness 1), DTU palette only, whitespace, and all prior fixes. Re-output full JSON.

---------------------------------- REVISION 3 (solid fills, controls, approve/reject) ----------------------------------

Apply to the current scene; keep the layout, two monitors, people, Tobii bar, participant screen
(a a a + "spacing" + red gaze dot), the Provider API node + its two directed arrows, the record, and the legend.

1) **CRITICAL — remove the red diagonal stripes** (main bug). The backend box and the provider cloud are still
   rendered with Excalidraw's default `fillStyle:"hachure"`, which stripes red over the text. Set
   `fillStyle:"solid"` on BOTH (not "hachure", not "cross-hatch"); zero diagonal stripes.
   - Backend: `fillStyle:"solid"`, `backgroundColor:"#fdeced"`, border red `#990000`; text on top, legible dark
     `#1e1e1e`, three spaced lines (bold "Reading the Reader backend" / "(application core)" /
     "sensing · analysis · decision · intervention"); enlarge box to fit with padding.
   - Cloud: `fillStyle:"solid"`, `backgroundColor:"#fbeaea"`, dashed red `#990000` border; "AI / rule-based"
     centred, legible red.
2) **Intervention controls on the researcher screen** — below the mirror + orange overlay, add a small
   settings panel: two compact horizontal sliders (track + knob) labelled "font size" and "letter spacing".
   Enlarge the researcher monitor slightly if needed.
3) **Researcher approves / rejects proposals** — on the researcher screen add a small "proposal" row with two
   chips: "✓ approve" (DTU green `#1FD082`) and "✗ reject" (red `#990000`). NOT the old Advisory/Autonomous
   toggle — just a clean approve/reject. Caption under the researcher screen:
   "live mirror · gaze overlay · controls · approve / reject".
Palette (only): red `#990000`, navy `#030F4F`, blue `#2F3EEA`, orange `#FC7634`, green `#1FD082`,
grey `#DADADA`, white `#ffffff`, text `#1e1e1e`. Hand-drawn (roughness 1), whitespace. Re-output full JSON.
