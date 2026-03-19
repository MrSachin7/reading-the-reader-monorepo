"use client"

import * as React from "react"
import { AlertTriangle, BellRing, ChevronDown, ChevronUp, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAppDispatch, useAppSelector } from "@/redux"
import { clearErrors, dismissError } from "@/redux/slices/app-slice"

function formatTimestamp(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp))
}

function getSourceLabel(source: string) {
  if (source === "api") {
    return "API"
  }

  if (source === "websocket") {
    return "WebSocket"
  }

  if (source === "validation") {
    return "Validation"
  }

  return "Runtime"
}

export function GlobalErrorCenter() {
  const dispatch = useAppDispatch()
  const errors = useAppSelector((state) => state.app.errors)
  const [isExpanded, setIsExpanded] = React.useState(false)

  const latestError = errors[0] ?? null

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 w-[min(92vw,26rem)]">
      {latestError ? (
        <section className="pointer-events-auto overflow-hidden rounded-[1.75rem] border border-destructive/25 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--background)_88%,var(--destructive)_12%),var(--background))] shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur transition-all duration-200">
          <div className="border-b border-border/70 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-destructive/14 text-destructive">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-destructive/80">
                    Error center
                  </p>
                  <h2 className="mt-1 text-base font-semibold">{latestError.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {latestError.message}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 rounded-full"
                onClick={() => dispatch(dismissError(latestError.id))}
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-4 px-5 py-4">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <span>{getSourceLabel(latestError.source)}</span>
              <span>{formatTimestamp(latestError.timestamp)}</span>
              {latestError.statusCode ? <span>Status {latestError.statusCode}</span> : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setIsExpanded((value) => !value)}>
                <BellRing className="size-4" />
                {isExpanded ? "Hide queue" : `Show queue (${errors.length})`}
                {isExpanded ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={() => dispatch(clearErrors())}>
                Dismiss all
              </Button>
            </div>

            {isExpanded ? (
              <div className="overflow-hidden">
                <div className="space-y-2 border-t border-border/70 pt-4">
                  {errors.map((error) => (
                    <div
                      key={error.id}
                      className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{error.title}</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {error.message}
                          </p>
                          <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            {getSourceLabel(error.source)} {error.statusCode ? `· ${error.statusCode}` : ""}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0 rounded-full"
                          onClick={() => dispatch(dismissError(error.id))}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  )
}
