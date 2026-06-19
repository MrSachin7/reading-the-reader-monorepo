# Master Platform Diagram — Layout Spec (for hand-drawing / draw.io)

**Purpose.** One complete, **user-centric** picture of the whole platform. Both supervisors asked for exactly this ("make one whole big picture… then take parts of it"). Every per-section architecture figure (Fig 5.1 context, Fig 5.3 hero, Fig 5.5 cross-session) is then a **crop/zoom of this canvas**, which is what guarantees they stay consistent.

**The three rules this drawing must obey (the supervisors' core complaints):**
1. **Humans at the centre.** The participant and the researcher are the focal points, not the boxes. The platform exists *between* them.
2. **The eye tracker is an interface, not a 4th external box.** Draw it *on the participant→platform edge* — it senses the participant and feeds the platform.
3. **The external decision provider is not a stranger.** It attaches through a **well-defined API (our contribution)** and its proposals flow **to the researcher's authority** (approve/override in advisory mode). Draw it coupled to the researcher's decision, not floating in a corner.

Terminology must match `glossary.md` exactly.

---

## Composition (left → right)

```
   PARTICIPANT  ──(reads)──►  ┌──────────────────────────────────────────┐  ◄──(operates)──  RESEARCHER
     (person)                 │            THE PLATFORM (boundary)         │                    (person)
        │                     │                                            │                       │
        │ gaze               ┌┴┐  participant            researcher        │                       │ approve/
        ▼                    │E│  reading surface ◄──►  console            │ ◄─────────────────────┘ override /
   ┌─────────┐  gaze stream  │Y│  (text only)           (mirror + gaze     │   manual intervention   apply
   │ reading │ ─────────────►│E│        ▲                overlay + controls)│
   │ surface │               │ │        │                     ▲            │
   │ (text)  │ ◄──adapted────│T│   ┌─────┴───────────────────┴─────┐       │
   └─────────┘    text       │R│   │   BACKEND (application core)    │      │
                             │K│   │  sensing · analysis · decision  │      │
                             └┬┘   │        · intervention           │      │
                              │    └──────┬──────────────────┬───────┘      │
                              │           │ writes           │ context ↕    │
                              │           ▼ record           ▼ proposals    │
                              │    ┌────────────┐    ╔══════════════════╗   │
                              │    │  Session   │    ║ External Decision ║   │
                              │    │  record    │    ║ Provider (API,    ║   │
                              │    │ (cylinder) │    ║ out of scope C3)  ║   │
                              │    └─────┬──────┘    ╚════════╤═════════╝   │
                              │         export                │ proposals to │
                              └────────────────────────────────  researcher │
                                         │ corpus → fine-tune ▲  (advisory)  │
                                         └──────────────────┘               │
                                          (cross-session loop, dashed)      │
                                  └──────────────────────────────────────────┘
```
*(ASCII is only a sketch of relations — draw it cleanly with the role coding below.)*

---

## Nodes (label · role · visual)

| # | Node | Label (verbatim) | Visual / role |
|---|---|---|---|
| N1 | Participant | **Participant** *(Person)* | person icon, **navy**; focal left |
| N2 | Researcher | **Researcher** *(Person)* | person icon, **navy**; focal right |
| N3 | Reading surface | **Participant reading surface** — *text only* | screen glyph, navy outline; near participant |
| N4 | Console | **Researcher console** — *mirror · gaze overlay · controls* | screen glyph w/ a small heat-map + buttons; near researcher |
| N5 | Eye tracker | **Eye tracker** — *sensing interface (Tobii / mouse)* | small device band **on the participant→platform edge**, straddling the boundary; **not** a corner box |
| N6 | Backend core | **Backend** *(application core)* — *sensing · analysis · decision · intervention* | central rounded rect, **dtured** border (the platform's heart) |
| N7 | Session record | **Session record** — *sealed, schema-versioned* | **cylinder**, navy; export/replay/re-import |
| N8 | Provider | **External Decision Provider** — *well-defined API · out of scope (C3)* | **dashed** rect, grey fill w/ dtured edge; positioned toward the researcher side so its proposals meet the researcher's authority |

> Optional inset (only if it stays uncluttered): a small **External Module Provider** label note clarifying the provider attaches via the general module-provider API (the same seam also serves analysis).

## Edges (from → to · label · style · who initiates)

Arrowheads = **who initiates** (state this in the legend).

| From → To | Label | Style |
|---|---|---|
| Participant → Reading surface | reads | thin (incidental) |
| Participant → Eye tracker → Backend | gaze (raw) | **real-time channel** (bold navy), one-way into the platform |
| Backend → Reading surface | adapted text (intervention) | real-time channel |
| Backend ↔ Console | mirror + fixations/saccades/regressions | real-time channel, bidirectional |
| Researcher → Console → Backend | operate · manual intervention · approve/override | request/response (navy), researcher-initiated |
| Backend ↔ Provider | **context ↔ proposals** | **dashed external seam** (C3), bidirectional |
| Provider → (researcher authority on Console) | proposal awaits approval (advisory) | dashed, ending at the researcher's approve/override control |
| Backend → Session record | writes (incremental checkpoints) | thin |
| Session record → export → corpus → Provider | fine-tune offline | **dashed, out-of-scope** (cross-session loop) |
| Provider → Backend | drives interventions via the decision seam | dashed |

## Legend (exact wording)
- **real-time channel** (bold navy) — live gaze + adaptation loop (who the arrow points to = receiver)
- **request / response** (navy) — operator commands & setup
- **external seam · out of scope (C3)** (dashed) — the provider API we define but do not implement behind
- **arrowheads show who initiates**, not one-way vs two-way

## Emphasis / what must read at a glance
- The eye is drawn looking from **participant → reading surface**, and the eye tracker capturing that gaze is the **interface**.
- The **two humans** are the largest elements; the platform sits between them.
- The provider is visibly **subordinate to the researcher** in advisory mode (its proposals pass through the researcher's approve/override), which is the unique selling point.

---

## Crop map (how this single canvas becomes the chapter figures)

| Figure | Crop of the master |
|---|---|
| **Fig 5.1 system context** | the outer frame: N1, N2, platform boundary, N5 (eye-tracker interface), N8 (provider seam). Lean — no internal core detail. |
| **Fig 5.3 two-screen hero** | zoom on N3 + N4 + N6: what each screen presents, the loop arrows, the advisory/autonomous controls. *(This is the hand-drawn focal figure; promote to lead.)* |
| **Fig 5.5 cross-session loop** (`fig:design-cross-session`) | the lower loop: N6 → N7 → export → corpus → N8 → back. |
| **Fig 5.2 container / Fig 5.4 hexagon** | stay as separate TikZ figures (I draw these), but reuse the master's **role colours** (navy=human/container, dtured=core, dashed grey=external) so they visually belong to the same family. |

## Style tokens (match the DTU palette in `Setup/Settings.tex`)
- navy = `navyblue` (humans, surfaces, channels) · core accent = `dtured` · external/out-of-scope = `grey` fill + dashed · record = navy cylinder.
- Keep one icon style per role (person, screen, device, cylinder, cloud-for-external) — identical wherever reused.

---

**When you've drafted it:** drop the image in `Chapters/05_SystemDesign/` (e.g. `platform-master.pdf`) and I will (a) wire it in, (b) derive the lean context crop, (c) restyle the TikZ figures to match its role colours, and (d) re-check the 5.1/5.2/5.3 consolidation decision against the real drawing.
