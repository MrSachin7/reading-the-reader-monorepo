"use client"

export type CalibrationPhase = "ready" | "calibrating" | "validating" | "review" | "failure"

export function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export function formatTime(unixMs: number | null) {
  if (!unixMs) {
    return "-"
  }

  return new Date(unixMs).toLocaleTimeString()
}

export function formatDegrees(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-"
  }

  return `${value.toFixed(2)}°`
}

export function titleCase(value: string | null | undefined) {
  if (!value) {
    return "Unknown"
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function qualityStyles(quality: string | null | undefined) {
  if (quality === "good") {
    return {
      badge: "text-emerald-700",
      border: "border-emerald-400/30",
      background: "bg-emerald-500/5",
    }
  }

  if (quality === "fair") {
    return {
      badge: "text-amber-700",
      border: "border-amber-400/30",
      background: "bg-amber-500/5",
    }
  }

  return {
    badge: "text-rose-700",
    border: "border-rose-400/30",
    background: "bg-rose-500/5",
  }
}
