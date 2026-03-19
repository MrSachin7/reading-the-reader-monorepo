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
    const unsubscribe = subscribeToExperimentSession((nextSession) => {
      setSession(nextSession);
    });

    requestExperimentState();

    return unsubscribe;
  }, []);

  return session;
}
