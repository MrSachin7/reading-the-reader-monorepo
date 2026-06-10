"use client";

export function ReadingDynamicsLegend() {
  return (
    <span className="inline-flex items-center gap-3 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground shadow-sm backdrop-blur">
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="inline-block h-1 w-3 rounded-full"
          style={{ backgroundColor: "rgba(251, 191, 36, 0.85)" }}
        />
        Read
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="inline-block h-2.5 w-2.5 rounded-[3px]"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(251, 146, 60, 0.95) 0%, rgba(239, 68, 68, 0.95) 100%)",
          }}
        />
        Struggle
      </span>
      <span className="inline-flex items-center gap-1.5">
        <svg aria-hidden="true" width="18" height="8" viewBox="0 0 18 8">
          <path d="M 1 6 Q 9 -2 15 5" fill="none" stroke="rgb(14, 165, 233)" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M 12.4 2.4 L 16.4 5.8 L 11.4 6.6 Z" fill="rgb(14, 165, 233)" />
        </svg>
        Saccades
      </span>
      <span className="inline-flex items-center gap-1.5">
        <svg aria-hidden="true" width="18" height="8" viewBox="0 0 18 8">
          <path d="M 17 6 Q 9 -2 3 5" fill="none" stroke="rgb(225, 29, 72)" strokeWidth="2" strokeLinecap="round" />
          <path d="M 5.6 2.4 L 1.6 5.8 L 6.6 6.6 Z" fill="rgb(225, 29, 72)" />
        </svg>
        Regressions
      </span>
    </span>
  );
}
