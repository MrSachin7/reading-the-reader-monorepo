import type { CalibrationSessionSnapshot } from "@/lib/calibration"
import {
  EMPTY_DECISION_CONFIGURATION,
  EMPTY_DECISION_STATE,
  EMPTY_EYE_MOVEMENT_ANALYSIS,
  EMPTY_EYE_MOVEMENT_ANALYSIS_CONFIGURATION,
  EMPTY_EYE_MOVEMENT_ANALYSIS_PROVIDER_STATUS,
  EMPTY_EXTERNAL_PROVIDER_STATUS,
  EMPTY_LIVE_MONITORING,
  EMPTY_READING_SESSION,
  type DecisionRealtimeUpdate,
  type EyeMovementAnalysisSnapshot,
  type ExperimentSessionSnapshot,
  type ExperimentLiveMonitoringSnapshot,
  type InterventionEventSnapshot,
  type LiveReadingSessionSnapshot,
  type ParticipantViewportSnapshot,
  type ReadingGazeObservationSnapshot,
  type ReadingContextPreservationSnapshot,
  type ReadingFocusSnapshot,
} from "@/lib/experiment-session"
import type { InterventionParameterValues } from "@/lib/intervention-modules"
import type { ReadingAttentionSummarySnapshot } from "@/lib/reading-attention-summary"
import { reportAppError } from "@/redux/error-reporter"

export interface GazeData {
  deviceTimeStamp: number;
  systemTimeStamp?: number | null;
  leftEyeX: number;
  leftEyeY: number;
  leftEyeValidity: string;
  rightEyeX: number;
  rightEyeY: number;
  rightEyeValidity: string;
  leftEyePositionInUserX?: number | null;
  leftEyePositionInUserY?: number | null;
  leftEyePositionInUserZ?: number | null;
  leftPupilDiameterMm?: number | null;
  leftPupilValidity?: string;
  leftGazeOriginInUserX?: number | null;
  leftGazeOriginInUserY?: number | null;
  leftGazeOriginInUserZ?: number | null;
  leftGazeOriginValidity?: string;
  leftGazeOriginInTrackBoxX?: number | null;
  leftGazeOriginInTrackBoxY?: number | null;
  leftGazeOriginInTrackBoxZ?: number | null;
  rightEyePositionInUserX?: number | null;
  rightEyePositionInUserY?: number | null;
  rightEyePositionInUserZ?: number | null;
  rightPupilDiameterMm?: number | null;
  rightPupilValidity?: string;
  rightGazeOriginInUserX?: number | null;
  rightGazeOriginInUserY?: number | null;
  rightGazeOriginInUserZ?: number | null;
  rightGazeOriginValidity?: string;
  rightGazeOriginInTrackBoxX?: number | null;
  rightGazeOriginInTrackBoxY?: number | null;
  rightGazeOriginInTrackBoxZ?: number | null;
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
      type: "readingContextPreservationChanged";
      sentAtUnixMs: number;
      payload: ReadingContextPreservationSnapshot;
    }
  | {
      type: "readingAttentionSummaryChanged";
      sentAtUnixMs: number;
      payload: ReadingAttentionSummarySnapshot;
    }
  | {
      type: "eyeMovementAnalysisChanged";
      sentAtUnixMs: number;
      payload: EyeMovementAnalysisSnapshot;
    }
  | {
      type: "interventionEvent";
      sentAtUnixMs: number;
      payload: InterventionEventSnapshot;
    }
  | {
      type: "decisionProposalChanged";
      sentAtUnixMs: number;
      payload: DecisionRealtimeUpdate;
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
  | { type: "mouseGazeSample"; payload: GazeData }
  | { type: "registerParticipantView"; payload: Record<string, never> }
  | { type: "unregisterParticipantView"; payload: Record<string, never> }
  | {
      type: "participantViewportUpdated";
      payload: {
        scrollProgress: number;
        scrollTopPx: number;
        viewportWidthPx: number;
        viewportHeightPx: number;
        contentHeightPx: number;
        contentWidthPx: number;
        activePageIndex: number;
        pageCount: number;
        lastPageTurnAtUnixMs: number | null;
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
        activeSentenceId: string | null;
      };
    }
  | {
      type: "readingGazeObservationUpdated";
      payload: ReadingGazeObservationSnapshot;
    }
  | {
      type: "readingContextPreservationUpdated";
      payload: ReadingContextPreservationSnapshot;
    }
  | {
      type: "readingAttentionSummaryUpdated";
      payload: ReadingAttentionSummarySnapshot;
    }
  | {
      type: "applyIntervention";
      payload: {
        source: string;
        trigger: string;
        reason: string;
        moduleId?: string | null;
        parameters?: InterventionParameterValues | null;
        presentation: {
          fontFamily?: string | null;
          fontSizePx?: number | null;
          lineWidthPx?: number | null;
          lineHeight?: number | null;
          letterSpacingEm?: number | null;
          editableByResearcher?: boolean | null;
        };
        appearance: {
          themeMode?: string | null;
          palette?: string | null;
          appFont?: string | null;
        };
      };
    }
  | {
      type: "approveDecisionProposal" | "rejectDecisionProposal";
      payload: {
        proposalId: string;
      };
    }
  | {
      type: "pauseDecisionAutomation" | "resumeDecisionAutomation";
      payload: Record<string, never>;
    }
  | {
      type: "setDecisionExecutionMode";
      payload: {
        executionMode: string;
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
  scrollTopPx: number;
  viewportWidthPx: number;
  viewportHeightPx: number;
  contentHeightPx: number;
  contentWidthPx: number;
  activePageIndex: number;
  pageCount: number;
  lastPageTurnAtUnixMs: number | null;
};
type ReadingFocusPayload = {
  isInsideReadingArea: boolean;
  normalizedContentX: number | null;
  normalizedContentY: number | null;
  activeTokenId: string | null;
  activeBlockId: string | null;
  activeSentenceId: string | null;
};
type ReadingGazeObservationPayload = ReadingGazeObservationSnapshot;
type ReadingContextPreservationPayload = ReadingContextPreservationSnapshot;
type ReadingAttentionSummaryPayload = ReadingAttentionSummarySnapshot;
type ApplyInterventionPayload = {
  source: string;
  trigger: string;
  reason: string;
  moduleId?: string | null;
  parameters?: InterventionParameterValues | null;
  presentation: {
    fontFamily?: string | null;
    fontSizePx?: number | null;
    lineWidthPx?: number | null;
    lineHeight?: number | null;
    letterSpacingEm?: number | null;
    editableByResearcher?: boolean | null;
  };
  appearance: {
    themeMode?: string | null;
    palette?: string | null;
    appFont?: string | null;
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
    liveMonitoring: deriveLiveMonitoringSnapshot(
      latestExperimentSession.liveMonitoring,
      latestExperimentSession.isActive,
      latestExperimentSession.setup.isReadyForSessionStart,
      latestReadingSession
    ),
    readingSession: latestReadingSession,
  };
  emitExperimentSession();
}

function deriveLiveMonitoringSnapshot(
  current: ExperimentLiveMonitoringSnapshot,
  isActive: boolean,
  isReadyForSessionStart: boolean,
  readingSession: LiveReadingSessionSnapshot | null
): ExperimentLiveMonitoringSnapshot {
  const viewport = readingSession?.participantViewport
  const focus = readingSession?.focus
  const hasParticipantViewConnection = viewport?.isConnected ?? false
  const hasParticipantViewportData =
    hasParticipantViewConnection &&
    (viewport?.viewportWidthPx ?? 0) > 0 &&
    (viewport?.viewportHeightPx ?? 0) > 0 &&
    (viewport?.updatedAtUnixMs ?? 0) > 0
  const hasReadingFocusSignal = (focus?.updatedAtUnixMs ?? 0) > 0

  return {
    ...current,
    canStartSession: isReadyForSessionStart && !isActive,
    canFinishSession: isActive,
    hasParticipantViewConnection,
    hasParticipantViewportData,
    participantViewportUpdatedAtUnixMs:
      (viewport?.updatedAtUnixMs ?? 0) > 0 ? viewport?.updatedAtUnixMs ?? null : null,
    hasReadingFocusSignal,
    focusUpdatedAtUnixMs: (focus?.updatedAtUnixMs ?? 0) > 0 ? focus?.updatedAtUnixMs ?? null : null,
  }
}

function patchDecisionRealtimeUpdate(update: DecisionRealtimeUpdate) {
  if (!latestExperimentSession) {
    return
  }

  latestExperimentSession = {
    ...latestExperimentSession,
    decisionConfiguration: update.decisionConfiguration,
    decisionState: update.decisionState,
  }
  emitExperimentSession()
}

function patchEyeMovementAnalysis(analysis: EyeMovementAnalysisSnapshot) {
  if (!latestExperimentSession) {
    return
  }

  latestExperimentSession = {
    ...latestExperimentSession,
    eyeMovementAnalysis: analysis,
    readingSession: latestReadingSession
      ? {
          ...latestReadingSession,
          attentionSummary: latestReadingSession.attentionSummary,
        }
      : latestReadingSession,
  }
  emitExperimentSession()
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
        sensingMode: message.payload.sensingMode ?? "eyeTracker",
        liveMonitoring: deriveLiveMonitoringSnapshot(
          message.payload.liveMonitoring ?? EMPTY_LIVE_MONITORING,
          message.payload.isActive,
          message.payload.setup.isReadyForSessionStart,
          latestReadingSession
        ),
        externalProviderStatus:
          message.payload.externalProviderStatus ?? EMPTY_EXTERNAL_PROVIDER_STATUS,
        eyeMovementAnalysisProviderStatus:
          message.payload.eyeMovementAnalysisProviderStatus ??
          EMPTY_EYE_MOVEMENT_ANALYSIS_PROVIDER_STATUS,
        eyeMovementAnalysisConfiguration:
          message.payload.eyeMovementAnalysisConfiguration ??
          EMPTY_EYE_MOVEMENT_ANALYSIS_CONFIGURATION,
        eyeMovementAnalysis: message.payload.eyeMovementAnalysis ?? EMPTY_EYE_MOVEMENT_ANALYSIS,
        readingSession: latestReadingSession,
        decisionConfiguration: message.payload.decisionConfiguration ?? EMPTY_DECISION_CONFIGURATION,
        decisionState: message.payload.decisionState ?? EMPTY_DECISION_STATE,
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

    if (message.type === "readingContextPreservationChanged") {
      patchReadingSession((current) => ({
        ...current,
        latestContextPreservation: message.payload,
        recentContextPreservationEvents: [
          message.payload,
          ...current.recentContextPreservationEvents,
        ]
          .sort((left, right) => right.measuredAtUnixMs - left.measuredAtUnixMs)
          .slice(0, 10),
      }));
      return;
    }

    if (message.type === "readingAttentionSummaryChanged") {
      patchReadingSession((current) => ({
        ...current,
        attentionSummary: message.payload,
      }));
      return;
    }

    if (message.type === "eyeMovementAnalysisChanged") {
      patchEyeMovementAnalysis(message.payload)
      patchReadingSession((current) => ({
        ...current,
        attentionSummary: current.attentionSummary,
      }))
      return
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
        appearance: message.payload.appliedAppearance,
      }));
      return;
    }

    if (message.type === "decisionProposalChanged") {
      patchDecisionRealtimeUpdate(message.payload)
      return
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

export function updateReadingContextPreservation(payload: ReadingContextPreservationPayload) {
  connect();
  send({
    type: "readingContextPreservationUpdated",
    payload,
  });
}

export function updateReadingGazeObservation(payload: ReadingGazeObservationPayload) {
  connect()
  send({
    type: "readingGazeObservationUpdated",
    payload,
  })
}

export function applyInterventionCommand(payload: ApplyInterventionPayload) {
  connect();
  send({
    type: "applyIntervention",
    payload,
  });
}

export function updateReadingAttentionSummary(payload: ReadingAttentionSummaryPayload) {
  connect();
  send({
    type: "readingAttentionSummaryUpdated",
    payload,
  });
}

export function sendMouseGazeSample(payload: GazeData) {
  connect()
  send({
    type: "mouseGazeSample",
    payload,
  })
}

export function approveDecisionProposal(proposalId: string) {
  connect()
  send({
    type: "approveDecisionProposal",
    payload: { proposalId },
  })
}

export function rejectDecisionProposal(proposalId: string) {
  connect()
  send({
    type: "rejectDecisionProposal",
    payload: { proposalId },
  })
}

export function pauseDecisionAutomation() {
  connect()
  send({
    type: "pauseDecisionAutomation",
    payload: {},
  })
}

export function resumeDecisionAutomation() {
  connect()
  send({
    type: "resumeDecisionAutomation",
    payload: {},
  })
}

export function setDecisionExecutionMode(executionMode: string) {
  connect()
  send({
    type: "setDecisionExecutionMode",
    payload: { executionMode },
  })
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
