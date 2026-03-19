"use client"

export type CalibrationTargetPhase = "move" | "settle" | "hold" | "burst"

type CalibrationTargetProps = {
  x: number
  y: number
  phase: CalibrationTargetPhase
}

export function CalibrationTarget({ x, y, phase }: CalibrationTargetProps) {
  const isHoldPhase = phase === "hold"
  const isBurstPhase = phase === "burst"

  return (
    <div
      className="pointer-events-none absolute transition-[left,top,transform] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        transform: `translate(-50%, -50%) ${isBurstPhase ? "scale(1.8)" : "scale(1)"}`,
      }}
      aria-hidden="true"
    >
      <div
        className={`relative flex items-center justify-center rounded-full border border-slate-900/10 bg-slate-900/[0.03] transition-all duration-300 ${
          isHoldPhase ? "h-10 w-10" : isBurstPhase ? "h-24 w-24 opacity-0" : "h-14 w-14"
        }`}
      >
        <div
          className={`rounded-full border border-sky-500/70 bg-sky-200/45 transition-all duration-300 ${
            isHoldPhase ? "h-4.5 w-4.5" : isBurstPhase ? "h-16 w-16 opacity-0" : "h-7 w-7"
          }`}
        />
        <div
          className={`absolute rounded-full bg-slate-950 transition-all duration-300 ${
            isHoldPhase ? "h-1.5 w-1.5" : isBurstPhase ? "h-3 w-3 opacity-0" : "h-2.5 w-2.5"
          }`}
        />
      </div>
    </div>
  )
}
