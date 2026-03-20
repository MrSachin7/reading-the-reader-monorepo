export function CalibrationReadyHero() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 text-center">
      <p className="text-sm uppercase tracking-[0.26em] text-slate-500">Ready</p>
      <h1 className="mt-4 text-5xl font-semibold tracking-tight">Follow the target.</h1>
      <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600">
        A live gaze preview is shown before calibration starts. Once the backend enters Tobii
        calibration mode, the preview is disabled so the hardware flow can run without streaming
        conflicts. Validation runs immediately after calibration to estimate accuracy and precision.
      </p>
    </div>
  )
}
