"use client"

type ProgressPoint = {
  pointId: string
  status: string
}

export function CalibrationProgressDots({
  points,
  activePointIndex,
}: {
  points: ProgressPoint[]
  activePointIndex: number
}) {
  return (
    <div className="pointer-events-none absolute bottom-28 left-1/2 z-20 flex -translate-x-1/2 gap-2">
      {points.map((point, index) => (
        <span
          key={point.pointId}
          className={`h-2.5 rounded-full transition-all ${
            point.status === "collected"
              ? "w-10 bg-emerald-500"
              : index === activePointIndex
                ? "w-14 bg-slate-950"
                : "w-10 bg-slate-300"
          }`}
        />
      ))}
    </div>
  )
}
