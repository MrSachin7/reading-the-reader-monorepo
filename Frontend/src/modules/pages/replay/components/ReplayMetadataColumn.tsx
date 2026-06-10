"use client"

import * as React from "react"
import { ListChecks } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatReplayClock, type ReplayFrame, type ReplayKeyEvent } from "@/lib/experiment-replay"
import type { LiveReadingSessionSnapshot } from "@/lib/experiment-session"
import { cn } from "@/lib/utils"
import { formatEventKind, getEventKindDotColor, getEventTone } from "@/modules/pages/replay/utils"

type ReplayMetadataColumnProps = {
  frame: ReplayFrame
  readingSession: LiveReadingSessionSnapshot
  replayEvents: ReplayKeyEvent[]
  activeEventIndex: number
  onSeek: (timeMs: number) => void
  fixationCount?: number
  saccadeCount?: number
  regressionCount?: number
}

type FilterKey = "all" | "quiz" | "intervention" | "lifecycle"

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "quiz", label: "Quiz" },
  { key: "intervention", label: "Interventions" },
  { key: "lifecycle", label: "Lifecycle" },
]

function eventMatchesFilter(event: ReplayKeyEvent, filter: FilterKey) {
  if (filter === "all") return true
  if (filter === "quiz") return event.kind === "quiz"
  if (filter === "intervention") return event.kind === "intervention" || event.kind === "proposal"
  if (filter === "lifecycle") return event.kind === "lifecycle" || event.kind === "state" || event.kind === "recovery" || event.kind === "connection"
  return true
}

export function ReplayMetadataColumn({
  frame,
  readingSession,
  replayEvents,
  activeEventIndex,
  onSeek,
  fixationCount = 0,
  saccadeCount = 0,
  regressionCount = 0,
}: ReplayMetadataColumnProps) {
  const [filter, setFilter] = React.useState<FilterKey>("all")

  const participant = frame.session.participant
  const visibleEvents = replayEvents.filter((event) => eventMatchesFilter(event, filter))

  return (
    <div className="order-3 min-h-0 min-w-0 overflow-hidden xl:order-3">
      <div className="flex h-full min-h-0 flex-col gap-4">
        {/* Header strip — participant in one band, no card chrome. */}
        <div className="rounded-2xl border bg-card/80 px-5 py-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Participant</p>
          <p className="mt-1 truncate text-lg font-semibold">{participant?.name ?? "Unknown"}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {[
              participant?.age != null ? `${participant.age}y` : null,
              participant?.sex ?? null,
              `Page ${readingSession.participantViewport.activePageIndex + 1}/${readingSession.participantViewport.pageCount}`,
              frame.session.signalSources.gazeSource && frame.session.signalSources.gazeSource !== "none"
                ? `gaze: ${frame.session.signalSources.gazeSource}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {fixationCount > 0 || saccadeCount > 0 ? (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {`Fixations ${fixationCount} · Saccades ${saccadeCount} · Regressions ${regressionCount}`}
            </p>
          ) : null}
        </div>

        {/* Timeline — fills the rest. */}
        <Card className="flex min-h-0 flex-1 flex-col rounded-2xl bg-card/96 shadow-sm">
          <CardContent className="flex min-h-0 flex-1 flex-col gap-3 pt-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ListChecks className="size-3.5" />
              <span className="text-[10px] uppercase tracking-[0.22em]">Timeline</span>
              <span className="ml-auto text-[11px] text-muted-foreground">
                {visibleEvents.length} of {replayEvents.length}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    filter === key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-2 pr-3">
                {visibleEvents.length === 0 ? (
                  <p className="rounded-xl border border-dashed bg-muted/10 p-4 text-center text-xs text-muted-foreground">
                    No events for this filter.
                  </p>
                ) : (
                  visibleEvents.map((event) => {
                    const originalIndex = replayEvents.indexOf(event)
                    const isActive = originalIndex === activeEventIndex
                    return (
                      <button
                        key={event.id}
                        type="button"
                        className={cn(
                          "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                          getEventTone(event.kind, isActive)
                        )}
                        onClick={() => onSeek(event.timeMs)}
                      >
                        <span
                          className={cn(
                            "mt-1.5 size-1.5 shrink-0 rounded-full",
                            getEventKindDotColor(event.kind)
                          )}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                              {formatEventKind(event.kind)}
                            </span>
                            <span className="ml-auto shrink-0 text-[11px] text-muted-foreground tabular-nums">
                              {formatReplayClock(event.timeMs)}
                            </span>
                          </div>
                          <p className="mt-1 break-words text-sm font-medium leading-5">{event.title}</p>
                          {event.detail ? (
                            <p className="mt-0.5 line-clamp-2 break-words text-xs leading-4 text-muted-foreground">
                              {event.detail}
                            </p>
                          ) : null}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
