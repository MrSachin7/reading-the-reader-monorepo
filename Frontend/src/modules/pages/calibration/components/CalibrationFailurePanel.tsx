"use client"
import { XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"

export function CalibrationFailurePanel({
  errorMessage,
  onReset,
  onReturnToWorkflow,
}: {
  errorMessage: string | null
  onReset: () => void
  onReturnToWorkflow: () => void
}) {
  return (
    <div className="absolute top-1/2 left-1/2 z-20 w-[min(92vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-accent/45 bg-card/95 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
      <div className="flex items-start gap-4">
        <XCircle className="mt-1 h-8 w-8 shrink-0 text-accent" />
        <div className="min-w-0">
          <p className="text-sm uppercase tracking-[0.22em] text-accent-foreground">Retry needed</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            The calibration flow did not complete.
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Returning to the experiment page keeps the calibration step blocked until this route
            finishes with a passed validation result.
          </p>
          {errorMessage ? (
            <p className="mt-3 text-sm leading-7 text-accent-foreground">{errorMessage}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={onReset}>Reset calibration</Button>
        <Button variant="outline" onClick={onReturnToWorkflow}>
          Return to setup workflow
        </Button>
      </div>
    </div>
  )
}
