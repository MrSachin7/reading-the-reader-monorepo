"use client"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"

export function CalibrationStatusChrome({
  statusMessage,
  errorMessage,
  onBack,
}: {
  statusMessage: string
  errorMessage: string | null
  onBack: () => void
}) {
  return (
    <>
      <div className="pointer-events-none absolute top-5 left-1/2 z-20 w-[min(92vw,880px)] -translate-x-1/2 rounded-full border border-slate-900/10 bg-white/84 px-5 py-3 text-center shadow-sm backdrop-blur">
        <p className="text-sm leading-6 text-slate-700">{statusMessage}</p>
        {errorMessage ? (
          <p className="mt-2 text-sm leading-6 text-accent-foreground">{errorMessage}</p>
        ) : null}
      </div>

      <div className="absolute top-5 left-5 z-20">
        <Button variant="outline" className="bg-white/88 backdrop-blur" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Return to setup
        </Button>
      </div>
    </>
  )
}
