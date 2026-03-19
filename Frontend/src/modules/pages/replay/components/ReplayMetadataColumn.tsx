"use client"

import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatReplayClock, type ReplayFrame, type ReplayKeyEvent } from "@/lib/experiment-replay"
import type { LiveReadingSessionSnapshot } from "@/lib/experiment-session"
import { cn } from "@/lib/utils"
import { formatAbsoluteTime, formatEventKind, formatNumeric, getEventTone } from "@/modules/pages/replay/utils"

function MetadataRow({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-4 px-4 py-3">
      <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm leading-5 font-medium text-foreground">{value}</dd>
    </div>
  )
}

type ReplayMetadataColumnProps = {
  frame: ReplayFrame
  readingSession: LiveReadingSessionSnapshot
  activeWord: string | null | undefined
  replayEvents: ReplayKeyEvent[]
  activeEventIndex: number
  onSeek: (timeMs: number) => void
}

export function ReplayMetadataColumn({
  frame,
  readingSession,
  activeWord,
  replayEvents,
  activeEventIndex,
  onSeek,
}: ReplayMetadataColumnProps) {
  return (
    <div className="order-3 min-h-0 min-w-0 overflow-hidden xl:order-3">
      <Card className="h-full min-h-0 rounded-[1.6rem] bg-card/96 shadow-sm">
        <CardContent className="min-h-0 pt-6">
          <ScrollArea className="h-64 xl:h-full">
            <div className="space-y-4 pr-4">
              <div className="overflow-hidden rounded-[1.2rem] border bg-background/80">
                <dl className="divide-y">
                  <MetadataRow label="Participant" value={frame.session.participant?.name ?? "Unknown"} />
                  <MetadataRow label="Age" value={frame.session.participant?.age ?? "-"} />
                  <MetadataRow label="Sex" value={frame.session.participant?.sex ?? "-"} />
                  <MetadataRow
                    label="Eye condition"
                    value={frame.session.participant?.existingEyeCondition ?? "-"}
                  />
                  <MetadataRow
                    label="Proficiency"
                    value={frame.session.participant?.readingProficiency ?? "-"}
                  />
                  <MetadataRow
                    label="Focus"
                    value={
                      readingSession.focus.isInsideReadingArea
                        ? activeWord ?? "Inside area"
                        : "Outside area"
                    }
                  />
                  <MetadataRow
                    label="Coordinates"
                    value={
                      readingSession.focus.isInsideReadingArea
                        ? `${formatNumeric(readingSession.focus.normalizedContentX, 3)}, ${formatNumeric(readingSession.focus.normalizedContentY, 3)}`
                        : "-"
                    }
                  />
                  <MetadataRow
                    label="Presentation"
                    value={`${readingSession.presentation.fontFamily}, ${readingSession.presentation.fontSizePx}px`}
                  />
                  <MetadataRow label="Eyetracker" value={frame.session.eyeTrackerDevice?.name ?? "-"} />
                  <MetadataRow label="Samples" value={frame.session.receivedGazeSamples.toLocaleString()} />
                </dl>
              </div>

              <div className="rounded-[1.2rem] border bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Latest intervention</p>
                <div className="mt-3">
                  {readingSession.latestIntervention ? (
                    <div className="rounded-[1rem] border bg-muted/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <Badge variant="outline">{readingSession.latestIntervention.source}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatAbsoluteTime(readingSession.latestIntervention.appliedAtUnixMs)}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6">{readingSession.latestIntervention.reason}</p>
                    </div>
                  ) : (
                    <div className="rounded-[1rem] border border-dashed bg-muted/10 p-4 text-sm text-muted-foreground">
                      No intervention yet.
                    </div>
                  )}
                </div>
              </div>

              {replayEvents.length > 0 ? (
                <div className="rounded-[1.2rem] border bg-background/80 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Timeline</p>
                  <div className="mt-3 space-y-3">
                    {replayEvents.map((event, index) => {
                      const isActive = index === activeEventIndex

                      return (
                        <button
                          key={event.id}
                          type="button"
                          className={cn(
                            "block w-full rounded-[1.1rem] border p-3 text-left transition-colors",
                            getEventTone(event.kind, isActive)
                          )}
                          onClick={() => onSeek(event.timeMs)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <Badge variant={isActive ? "default" : "outline"}>{formatEventKind(event.kind)}</Badge>
                            <span className="text-xs text-muted-foreground">{formatReplayClock(event.timeMs)}</span>
                          </div>
                          <p className="mt-3 text-sm font-medium">{event.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{event.detail}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
