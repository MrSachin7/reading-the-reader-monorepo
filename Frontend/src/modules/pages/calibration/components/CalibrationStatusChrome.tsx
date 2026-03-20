"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"

export function CalibrationStatusChrome({
  statusMessage,
  errorMessage,
}: {
  statusMessage: string
  errorMessage: string | null
}) {
  return (
    <>
      <div className="pointer-events-none absolute top-5 left-1/2 z-20 w-[min(92vw,880px)] -translate-x-1/2 rounded-full border border-slate-900/10 bg-white/84 px-5 py-3 text-center shadow-sm backdrop-blur">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Calibration</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">{statusMessage}</p>
        {errorMessage ? (
          <p className="mt-2 text-sm leading-6 text-amber-700">{errorMessage}</p>
        ) : null}
      </div>

      <div className="absolute top-5 left-5 z-20">
        <Button asChild variant="outline" className="bg-white/88 backdrop-blur">
          <Link href="/experiment">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>
    </>
  )
}
