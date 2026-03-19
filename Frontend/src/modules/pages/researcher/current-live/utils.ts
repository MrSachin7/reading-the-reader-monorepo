import type { FontTheme } from "@/hooks/use-font-theme"

export const PRESENTATION_FONT_LABELS: Record<FontTheme, string> = {
  geist: "Geist",
  inter: "Inter",
  "space-grotesk": "Space Grotesk",
  merriweather: "Merriweather",
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

export function formatNumeric(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-"
  }

  return value.toFixed(digits).replace(/\.0$/, "")
}

export function formatAbsoluteTime(unixMs: number | null | undefined) {
  if (!unixMs) {
    return "-"
  }

  return new Date(unixMs).toLocaleTimeString()
}

export function getLatencyTone(latencyMs: number | null | undefined) {
  if (latencyMs === null || latencyMs === undefined || Number.isNaN(latencyMs)) {
    return "text-muted-foreground"
  }

  if (latencyMs <= 60) {
    return "text-emerald-500"
  }

  if (latencyMs <= 120) {
    return "text-amber-500"
  }

  return "text-rose-500"
}

export function getLatencyBars(latencyMs: number | null | undefined) {
  if (latencyMs === null || latencyMs === undefined || Number.isNaN(latencyMs)) {
    return 0
  }

  if (latencyMs <= 60) {
    return 4
  }

  if (latencyMs <= 120) {
    return 3
  }

  if (latencyMs <= 180) {
    return 2
  }

  return 1
}
