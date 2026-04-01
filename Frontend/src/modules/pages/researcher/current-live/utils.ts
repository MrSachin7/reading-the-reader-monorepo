import type { FontTheme } from "@/hooks/use-font-theme"
import type { LiveMirrorTrustState } from "@/modules/pages/researcher/current-live/types"

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

export function formatDurationMs(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-"
  }

  return `${Math.round(value)} ms`
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

export function getLiveMirrorTrustState({
  followParticipant,
  hasParticipantViewConnection,
  hasParticipantViewportData,
  isFullscreen,
  isVisible,
}: {
  followParticipant: boolean
  hasParticipantViewConnection: boolean
  hasParticipantViewportData: boolean
  isFullscreen: boolean
  isVisible: boolean
}): LiveMirrorTrustState {
  if (!followParticipant) {
    return {
      kind: "manual",
      label: "Manual view",
      headline: "Researcher view is detached",
      detail: "The researcher can inspect the reading surface independently. This is not following the participant.",
      tone: "neutral",
    }
  }

  if (!hasParticipantViewConnection) {
    return {
      kind: "approximate",
      label: "Approximate follow",
      headline: "Exact mirror unavailable",
      detail: "The participant view has not connected yet, so the console is showing a supervisory fallback instead of the exact participant mirror.",
      tone: "warning",
    }
  }

  if (!hasParticipantViewportData) {
    return {
      kind: "approximate",
      label: "Approximate follow",
      headline: "Exact mirror unavailable",
      detail: "The participant viewport is connected but not fully measured yet, so the console is falling back to a supervisory reader view.",
      tone: "warning",
    }
  }

  if (!isFullscreen) {
    return {
      kind: "approximate",
      label: "Approximate follow",
      headline: "Exact mirror unavailable",
      detail: "Enter full screen to restore exact participant mirroring. Until then, this view is only an approximation.",
      tone: "warning",
    }
  }

  if (!isVisible) {
    return {
      kind: "approximate",
      label: "Approximate follow",
      headline: "Exact mirror unavailable",
      detail: "Bring this tab back to the front to restore exact participant mirroring. Hidden tabs fall back to supervisory mode.",
      tone: "warning",
    }
  }

  return {
    kind: "exact",
    label: "Exact mirror",
    headline: "Participant mirror is exact",
    detail: "This view is using the participant viewport and live reading position as the primary researcher trust surface.",
    tone: "positive",
  }
}

export function getLiveHealthState({
  sampleRateHz,
  validityRate,
  latencyMs,
  hasParticipantViewConnection,
  hasParticipantViewportData,
}: {
  sampleRateHz: number
  validityRate: number
  latencyMs: number | null
  hasParticipantViewConnection: boolean
  hasParticipantViewportData: boolean
}) {
  const reasons: string[] = []

  if (!hasParticipantViewConnection) {
    reasons.push("participant view offline")
  } else if (!hasParticipantViewportData) {
    reasons.push("participant viewport pending")
  }

  if (sampleRateHz < 20) {
    reasons.push("sample rate critically low")
  } else if (sampleRateHz < 60) {
    reasons.push("sample rate below target")
  }

  if (validityRate < 0.4) {
    reasons.push("validity critically low")
  } else if (validityRate < 0.7) {
    reasons.push("validity below target")
  }

  if (latencyMs !== null && latencyMs > 180) {
    reasons.push("latency high")
  } else if (latencyMs !== null && latencyMs > 120) {
    reasons.push("latency elevated")
  }

  const tone =
    reasons.some((reason) =>
      reason === "participant view offline" ||
      reason === "sample rate critically low" ||
      reason === "validity critically low" ||
      reason === "latency high"
    )
      ? "negative"
      : reasons.length > 0
        ? "warning"
        : "positive"

  const label =
    tone === "positive" ? "Healthy" : tone === "warning" ? "Warning" : "Degraded"

  const detail =
    reasons.length > 0
      ? reasons.join(" · ")
      : "mirror, streaming, and tracking signals are within the expected live range"

  return { label, detail, tone }
}
