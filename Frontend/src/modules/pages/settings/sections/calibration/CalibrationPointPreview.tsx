"use client"

import type { CalibrationPointDefinition } from "@/lib/calibration"

export function CalibrationPointPreview({ points }: { points: CalibrationPointDefinition[] }) {
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-[1.75rem] border bg-card shadow-sm">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.04),transparent_30%)]" />
      <div className="absolute inset-6 rounded-[1.25rem] border border-dashed border-border" />
      <div className="absolute inset-[18%_26%] rounded-[1rem] border bg-muted/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]" />
      {points.map((point) => (
        <div
          key={point.pointId}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
        >
          <div className="flex h-4 w-4 items-center justify-center rounded-full border bg-background shadow-[0_0_0_4px_rgba(255,255,255,0.82)]">
            <div className="h-1.5 w-1.5 rounded-full bg-slate-950" />
          </div>
        </div>
      ))}
    </div>
  )
}
