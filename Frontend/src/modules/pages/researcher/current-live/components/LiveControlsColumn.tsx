"use client"

import { User } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import type { ExperimentLiveMonitoringSnapshot } from "@/lib/experiment-session"
import { cn } from "@/lib/utils"
import {
  getLatencyBars,
  getLatencyTone,
  getLiveHealthState,
} from "@/modules/pages/researcher/current-live/utils"

type LiveControlsColumnProps = {
  liveMonitoring: ExperimentLiveMonitoringSnapshot
  participantName: string | null
  sampleRateHz: number
  validityRate: number
  latencyMs: number | null
}

export function LiveControlsColumn({
  liveMonitoring,
  participantName,
  sampleRateHz,
  validityRate,
  latencyMs,
}: LiveControlsColumnProps) {
  const liveHealth = getLiveHealthState({
    sampleRateHz,
    validityRate,
    latencyMs,
    hasParticipantViewConnection: liveMonitoring.hasParticipantViewConnection,
    hasParticipantViewportData: liveMonitoring.hasParticipantViewportData,
  })

  return (
    <div className="order-2 flex min-h-0 min-w-0 flex-col gap-4 overflow-hidden xl:order-1">
      <Card className="rounded-2xl bg-card/96 shadow-sm">
        <CardContent className="pt-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="size-3.5" />
                <span className="text-[10px] uppercase tracking-[0.2em]">Participant</span>
              </div>
              <p className="mt-1 truncate text-base font-semibold">
                {participantName ?? "Not registered"}
              </p>
            </div>
            <HealthPill tone={liveHealth.tone as "positive" | "warning" | "negative"} label={liveHealth.label} />
          </div>

          <div className="flex items-center justify-between gap-3 border-t pt-4">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Latency</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {latencyMs === null ? "—" : `${latencyMs} ms`}
              </p>
            </div>
            <LatencySignal latencyMs={latencyMs} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function HealthPill({
  tone,
  label,
}: {
  tone: "positive" | "warning" | "negative"
  label: string
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
        tone === "positive" && "border-primary/40 bg-primary/10 text-primary",
        tone === "warning" && "border-accent/45 bg-accent/15 text-accent-foreground",
        tone === "negative" && "border-destructive/40 bg-destructive/10 text-destructive"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          tone === "positive" && "bg-primary",
          tone === "warning" && "bg-accent",
          tone === "negative" && "bg-destructive"
        )}
      />
      {label}
    </span>
  )
}

function LatencySignal({ latencyMs }: { latencyMs: number | null | undefined }) {
  const bars = getLatencyBars(latencyMs)
  const tone = getLatencyTone(latencyMs)

  return (
    <div className={cn("flex items-end gap-0.5", tone)} aria-hidden="true">
      {[0, 1, 2, 3].map((index) => (
        <span
          key={index}
          className={cn(
            "w-1 rounded-full bg-current transition-opacity",
            index < bars ? "opacity-100" : "opacity-20"
          )}
          style={{ height: `${5 + index * 2}px` }}
        />
      ))}
    </div>
  )
}
