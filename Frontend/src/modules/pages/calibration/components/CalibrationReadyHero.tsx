export function CalibrationReadyHero() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 text-center">
      <p className="text-sm uppercase tracking-[0.26em] text-slate-500">Step 3 · Calibration</p>
      <h1 className="mt-4 text-5xl font-semibold tracking-tight">Follow the target.</h1>
      <p className="mx-auto mt-3 max-w-2xl text-xs uppercase tracking-[0.22em] text-slate-500">
        Leaving full screen, hiding the tab, or backing out interrupts the run and keeps setup blocked.
      </p>
    </div>
  )
}
