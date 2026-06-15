"use client";

import { useEffect, useState } from "react";

import {
  requestExperimentState,
  subscribeToExperimentSession,
} from "@/lib/gaze-socket";
import type { ExperimentSessionSnapshot } from "@/lib/experiment-session";

export function useLiveExperimentSession() {
  const [session, setSession] = useState<ExperimentSessionSnapshot | null>(null);

  useEffect(() => {
    // The session is re-emitted several times per gaze observation (eye-movement
    // analysis, attention summary, focus, viewport...). Coalesce those bursts to
    // a single React commit per animation frame so the whole live tree re-renders
    // at most ~60Hz regardless of inbound message rate. `latest` always holds the
    // newest snapshot, so no update is lost — only deferred by up to one frame.
    let frameId: number | null = null;
    let latest: ExperimentSessionSnapshot | null = null;
    let hasPending = false;

    const flush = () => {
      frameId = null;
      if (!hasPending) {
        return;
      }
      hasPending = false;
      setSession(latest);
    };

    const unsubscribe = subscribeToExperimentSession((nextSession) => {
      latest = nextSession;
      hasPending = true;
      if (frameId === null) {
        frameId = window.requestAnimationFrame(flush);
      }
    });

    requestExperimentState();

    return () => {
      unsubscribe();
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return session;
}
