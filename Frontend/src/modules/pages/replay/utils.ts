import type { ReplayKeyEvent } from "@/lib/experiment-replay"

export function formatAbsoluteTime(unixMs: number | null | undefined) {
  if (!unixMs) {
    return "-"
  }

  return new Date(unixMs).toLocaleTimeString()
}

export function formatNumeric(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-"
  }

  return value.toFixed(digits).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1")
}

export function formatEventKind(kind: ReplayKeyEvent["kind"]) {
  switch (kind) {
    case "lifecycle":
      return "Session"
    case "face":
      return "Face"
    case "proposal":
      return "Proposal"
    case "state":
      return "State"
    case "intervention":
      return "Intervention"
    case "connection":
      return "Connection"
    case "recovery":
      return "Recovery"
    case "quiz":
      return "Quiz"
    default:
      return "Event"
  }
}

export function getEventTone(kind: ReplayKeyEvent["kind"], active: boolean) {
  if (active) {
    return "border-primary/50 bg-primary/5"
  }
  return "border-border/60 bg-background/80 hover:bg-muted/40"
}

/**
 * Returns a Tailwind class for a small color dot indicating the event kind. Keeps the
 * card body neutral so the timeline doesn't feel like a rainbow when many events stack.
 */
export function getEventKindDotColor(kind: ReplayKeyEvent["kind"]) {
  switch (kind) {
    case "face":
      return "bg-slate-400"
    case "intervention":
      return "bg-amber-400"
    case "connection":
      return "bg-emerald-400"
    case "lifecycle":
      return "bg-violet-400"
    case "recovery":
      return "bg-cyan-400"
    case "state":
      return "bg-slate-400"
    case "quiz":
      return "bg-fuchsia-400"
    case "proposal":
      return "bg-indigo-400"
    default:
      return "bg-muted-foreground"
  }
}
