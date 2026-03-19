import type { CalibrationSessionSnapshot } from "@/lib/calibration"
import {
  EMPTY_READING_SESSION,
  type ExperimentSessionSnapshot,
  type InterventionEventSnapshot,
  type LiveReadingSessionSnapshot,
  type ParticipantViewportSnapshot,
  type ReadingFocusSnapshot,
} from "@/lib/experiment-session"
import { reportAppError } from "@/redux/error-reporter"

export interface GazeData {
  deviceTimeStamp: number;
  leftEyeX: number;
  leftEyeY: number;
  leftEyeValidity: string;
  rightEyeX: number;
  rightEyeY: number;
  rightEyeValidity: string;
}

type ServerEnvelope =
  | {
      type: "pong";
      sentAtUnixMs: number;
      payload: { serverTimeUnixMs: number };
    }
  | {
      type: "gazeSample";
      sentAtUnixMs: number;
      payload: GazeData;
    }
  | {
      type: "experimentStarted" | "experimentStopped" | "experimentState";
      sentAtUnixMs: number;
      payload: ExperimentSessionSnapshot;
    }
  | {
      type: "readingSessionChanged";
      sentAtUnixMs: number;
      payload: LiveReadingSessionSnapshot;
    }
  | {
      type: "participantViewportChanged";
      sentAtUnixMs: number;
      payload: ParticipantViewportSnapshot;
    }
  | {
      type: "readingFocusChanged";
      sentAtUnixMs: number;
      payload: ReadingFocusSnapshot;
    }
  | {
      type: "interventionEvent";
      sentAtUnixMs: number;
      payload: InterventionEventSnapshot;
    }
  | {
      type: "calibrationStateChanged";
      sentAtUnixMs: number;
      payload: CalibrationSessionSnapshot;
    }
  | {
      type: "error";
      sentAtUnixMs: number;
      payload: { message: string };
    };

type ClientEnvelope =
  | { type: "ping"; payload: Record<string, never> }
  | { type: "getExperimentState"; payload: Record<string, never> }
  | { type: "subscribeGazeData"; payload: Record<string, never> }
  | { type: "unsubscribeGazeData"; payload: Record<string, never> }
  | { type: "registerParticipantView"; payload: Record<string, never> }
  | { type: "unregisterParticipantView"; payload: Record<string, never> }
  | {
      type: "participantViewportUpdated";
      payload: {
        scrollProgress: number;
        viewportWidthPx: number;
        viewportHeightPx: number;
        contentHeightPx: number;
        contentWidthPx: number;
      };
    }
  | {
      type: "readingFocusUpdated";
      payload: {
        isInsideReadingArea: boolean;
        normalizedContentX: number | null;
        normalizedContentY: number | null;
        activeTokenId: string | null;
        activeBlockId: string | null;
      };
    }
  | {
      type: "applyIntervention";
      payload: {
        source: string;
        trigger: string;
        reason: string;
        presentation: {
          fontFamily?: string | null;
          fontSizePx?: number | null;
          lineWidthPx?: number | null;
          lineHeight?: number | null;
          letterSpacingEm?: number | null;
          editableByResearcher?: boolean | null;
        };
      };
    };

export interface ConnectionStats {
  status: "connecting" | "open" | "closed";
  lastPongAtUnixMs: number | null;
  lastServerTimeUnixMs: number | null;
  lastRttMs: number | null;
}

type GazeListener = (data: GazeData) => void;
type StatsListener = (stats: ConnectionStats) => void;
type CalibrationStateListener = (snapshot: CalibrationSessionSnapshot) => void;
type ExperimentSessionListener = (snapshot: ExperimentSessionSnapshot) => void;
type ParticipantViewportPayload = {
  scrollProgress: number;
  viewportWidthPx: number;
  viewportHeightPx: number;
  contentHeightPx: number;
  contentWidthPx: number;
};
type ReadingFocusPayload = {
  isInsideReadingArea: boolean;
  normalizedContentX: number | null;
  normalizedContentY: number | null;
  activeTokenId: string | null;
  activeBlockId: string | null;
};
type ApplyInterventionPayload = {
  source: string;
  trigger: string;
  reason: string;
  presentation: {
    fontFamily?: string | null;
    fontSizePx?: number | null;
    lineWidthPx?: number | null;
    lineHeight?: number | null;
    letterSpacingEm?: number | null;
    editableByResearcher?: boolean | null;
  };
};

const gazeListeners = new Set<GazeListener>();
const statsListeners = new Set<StatsListener>();
const calibrationStateListeners = new Set<CalibrationStateListener>();
const experimentSessionListeners = new Set<ExperimentSessionListener>();

let socket: WebSocket | null = null;
let reconnectTimer: number | null = null;
let pingTimer: number | null = null;
let shouldReconnect = true;
let lastPingSentAt = 0;
let wantsGazeSubscription = false;
let wantsParticipantViewRegistration = false;

let stats: ConnectionStats = {
  status: "closed",
  lastPongAtUnixMs: null,
  lastServerTimeUnixMs: null,
  lastRttMs: null,
};
let latestExperimentSession: ExperimentSessionSnapshot | null = null;
let latestReadingSession: LiveReadingSessionSnapshot = EMPTY_READING_SESSION;

function emitStats() {
  for (const listener of statsListeners) {
    listener(stats);
  }
}

function emitExperimentSession() {
  if (!latestExperimentSession) {
    return;
  }

  for (const listener of experimentSessionListeners) {
    listener(latestExperimentSession);
  }
}

function setStats(next: Partial<ConnectionStats>) {
  stats = { ...stats, ...next };
  emitStats();
}

function getWsUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_WS_URL;
  if (fromEnv) {
    return fromEnv;
  }

  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  if (isLocalhost) {
    return window.location.protocol === "https:"
      ? "wss://localhost:7248/ws"
      : "ws://localhost:5190/ws";
  }

  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${window.location.host}/ws`;
}

function send(message: ClientEnvelope) {
  if (socket?.readyState !== WebSocket.OPEN) {
    console.log("WebSocket Request Skipped:", {
      url: getWsUrl(),
      readyState: socket?.readyState ?? null,
      message,
    });
    return;
  }

  console.log("WebSocket Request:", {
    url: getWsUrl(),
    message,
  });
  socket.send(JSON.stringify(message));
}

function syncGazeSubscription() {
  const nextWantsGazeSubscription = gazeListeners.size > 0;

  if (nextWantsGazeSubscription === wantsGazeSubscription) {
    return;
  }

  wantsGazeSubscription = nextWantsGazeSubscription;
  send({
    type: wantsGazeSubscription ? "subscribeGazeData" : "unsubscribeGazeData",
    payload: {},
  });
}

function startPingLoop() {
  if (pingTimer !== null) {
    window.clearInterval(pingTimer);
  }

  pingTimer = window.setInterval(() => {
    lastPingSentAt = Date.now();
    send({ type: "ping", payload: {} });
  }, 5_000);
}

function stopPingLoop() {
  if (pingTimer !== null) {
    window.clearInterval(pingTimer);
    pingTimer = null;
  }
}

function scheduleReconnect() {
  if (!shouldReconnect || reconnectTimer !== null) {
    return;
  }

  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, 1_000);
}

function patchReadingSession(
  updater: (current: LiveReadingSessionSnapshot) => LiveReadingSessionSnapshot
) {
  latestReadingSession = updater(latestReadingSession);

  if (!latestExperimentSession) {
    return;
  }

  latestExperimentSession = {
    ...latestExperimentSession,
    readingSession: latestReadingSession,
  };
  emitExperimentSession();
}

function handleMessage(raw: MessageEvent<string>) {
  try {
    const message = JSON.parse(raw.data) as ServerEnvelope;
    console.log("WebSocket Response:", {
      url: getWsUrl(),
      message,
    });

    if (message.type === "gazeSample") {
      for (const listener of gazeListeners) {
        listener(message.payload);
      }
      return;
    }

    if (message.type === "pong") {
      const now = Date.now();
      setStats({
        lastPongAtUnixMs: now,
        lastServerTimeUnixMs: message.payload.serverTimeUnixMs,
        lastRttMs: lastPingSentAt > 0 ? now - lastPingSentAt : null,
      });
      return;
    }

    if (
      message.type === "experimentStarted" ||
      message.type === "experimentStopped" ||
      message.type === "experimentState"
    ) {
      latestReadingSession = message.payload.readingSession ?? latestReadingSession ?? EMPTY_READING_SESSION;
      latestExperimentSession = {
        ...message.payload,
        readingSession: latestReadingSession,
      };
      emitExperimentSession();
      return;
    }

    if (message.type === "readingSessionChanged") {
      patchReadingSession(() => message.payload ?? EMPTY_READING_SESSION);
      return;
    }

    if (message.type === "participantViewportChanged") {
      patchReadingSession((current) => ({
        ...current,
        participantViewport: message.payload,
      }));
      return;
    }

    if (message.type === "readingFocusChanged") {
      patchReadingSession((current) => ({
        ...current,
        focus: message.payload,
      }));
      return;
    }

    if (message.type === "interventionEvent") {
      patchReadingSession((current) => ({
        ...current,
        latestIntervention: message.payload,
        recentInterventions: [
          message.payload,
          ...current.recentInterventions.filter((item) => item.id !== message.payload.id),
        ].slice(0, 25),
        presentation: message.payload.appliedPresentation,
      }));
      return;
    }

    if (message.type === "calibrationStateChanged") {
      for (const listener of calibrationStateListeners) {
        listener(message.payload);
      }
      return;
    }

    if (message.type === "error") {
      console.error("WebSocket error payload:", message.payload.message);
      reportAppError(message.payload.message, {
        title: "Realtime connection error",
        source: "websocket",
      })
    }
  } catch (error) {
    console.error("Failed to parse websocket message", error);
    reportAppError(error, {
      title: "Realtime message parse error",
      source: "websocket",
    })
  }
}

function connect() {
  if (typeof window === "undefined") {
    return;
  }

  shouldReconnect = true;

  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  setStats({ status: "connecting" });
  console.log("WebSocket Request:", {
    url: getWsUrl(),
    message: { type: "connect" },
  });
  socket = new WebSocket(getWsUrl());

  socket.addEventListener("open", () => {
    console.log("WebSocket Response:", {
      url: getWsUrl(),
      message: { type: "open" },
    });
    setStats({ status: "open" });
    requestExperimentState();
    if (wantsGazeSubscription) {
      send({ type: "subscribeGazeData", payload: {} });
    }
    if (wantsParticipantViewRegistration) {
      send({ type: "registerParticipantView", payload: {} });
    }
    startPingLoop();
  });

  socket.addEventListener("message", handleMessage);

  socket.addEventListener("close", () => {
    console.log("WebSocket Response:", {
      url: getWsUrl(),
      message: { type: "close" },
    });
    setStats({ status: "closed" });
    stopPingLoop();
    scheduleReconnect();
  });

  socket.addEventListener("error", () => {
    console.log("WebSocket Response:", {
      url: getWsUrl(),
      message: { type: "error" },
    });
    setStats({ status: "closed" });
    reportAppError("The realtime connection encountered an error.", {
      title: "Realtime connection error",
      source: "websocket",
    })
  });
}

export function requestExperimentState() {
  connect();
  send({ type: "getExperimentState", payload: {} });
}

export function subscribeToGaze(listener: GazeListener) {
  gazeListeners.add(listener);
  connect();
  syncGazeSubscription();

  return () => {
    gazeListeners.delete(listener);
    syncGazeSubscription();
  };
}

export function subscribeToConnectionStats(listener: StatsListener) {
  statsListeners.add(listener);
  listener(stats);
  connect();

  return () => {
    statsListeners.delete(listener);
  };
}

export function subscribeToCalibrationState(listener: CalibrationStateListener) {
  calibrationStateListeners.add(listener);
  connect();

  return () => {
    calibrationStateListeners.delete(listener);
  };
}

export function subscribeToExperimentSession(listener: ExperimentSessionListener) {
  experimentSessionListeners.add(listener);
  if (latestExperimentSession) {
    listener(latestExperimentSession);
  }
  connect();
  requestExperimentState();

  return () => {
    experimentSessionListeners.delete(listener);
  };
}

export function registerParticipantView() {
  wantsParticipantViewRegistration = true;
  connect();
  send({ type: "registerParticipantView", payload: {} });
}

export function unregisterParticipantView() {
  wantsParticipantViewRegistration = false;
  send({ type: "unregisterParticipantView", payload: {} });
}

export function updateParticipantViewport(payload: ParticipantViewportPayload) {
  connect();
  send({
    type: "participantViewportUpdated",
    payload,
  });
}

export function updateReadingFocus(payload: ReadingFocusPayload) {
  connect();
  send({
    type: "readingFocusUpdated",
    payload,
  });
}

export function applyInterventionCommand(payload: ApplyInterventionPayload) {
  connect();
  send({
    type: "applyIntervention",
    payload,
  });
}

export function stopGazeSocket() {
  shouldReconnect = false;
  stopPingLoop();
  wantsGazeSubscription = false;
  wantsParticipantViewRegistration = false;

  if (reconnectTimer !== null) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  socket?.close();
  socket = null;
}
