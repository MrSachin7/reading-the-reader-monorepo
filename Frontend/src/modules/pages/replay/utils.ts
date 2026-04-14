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
    default:
      return "Event"
  }
}

export function getEventTone(kind: ReplayKeyEvent["kind"], active: boolean) {
  if (active) {
    return "border-sky-400/50 bg-sky-500/10 text-sky-950 dark:text-sky-100"
  }

  switch (kind) {
    case "intervention":
      return "border-amber-400/30 bg-amber-500/10"
    case "connection":
      return "border-emerald-400/30 bg-emerald-500/10"
    case "lifecycle":
      return "border-violet-400/30 bg-violet-500/10"
    case "recovery":
      return "border-cyan-400/30 bg-cyan-500/10"
    case "state":
      return "border-slate-400/30 bg-slate-500/10"
    default:
      return "border-border bg-background/80"
  }
}
