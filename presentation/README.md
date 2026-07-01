# Reading the Reader, Defense Presentation

A reveal.js deck for the MSc thesis defense. Web-based so we get full control
over the recurring **adaptive-loop device**, custom transitions, and the
embedded demo clips, while reveal.js gives us speaker view, timer, clicker
navigation, and PDF export for free.

## Run

```bash
bun install
bun run dev        # http://localhost:4321
```

## Present

- **Navigate:** arrow keys / clicker. `Esc` = slide overview.
- **Speaker view:** press `S`, opens a second window with the current slide,
  the next slide, speaker notes, and a running timer. Put this on your laptop,
  the deck on the projector.
- **The story:** the deck is an *argument*, not a chapter walk. Slide "jobs" and
  the exact bridge lines live in each slide's speaker notes.

## The loop-spine device

Each slide declares which adaptive-loop stage it is about via
`data-loop-stage` on its `<section>` (`sense` / `analyse` / `decide` /
`intervene` / `all`, or a comma list). A small ring in the top-right corner
lights the active stage. Slides with no attribute hide the ring. See
[src/loop-spine.js](src/loop-spine.js).

## Exam-room fallbacks (build these before the defense)

1. **PDF:** open `http://localhost:4321/?print-pdf` and Print → Save as PDF.
2. **Static build:** `bun run build` → `dist/` opens from `file://` (offline).
3. **Raw demo video:** keep the recorded demo clips on the machine independently,
   so a browser failure can never sink the demo.

Always rehearse once on the actual machine / room you will present from.

## Status

Act 1 (slides 1–2) built for real; slides 3–15 + backups B1–B6 are stubs
carrying each slide's job and bridge line in speaker notes. Built iteratively.
