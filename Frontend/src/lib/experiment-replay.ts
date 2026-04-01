import {
  EMPTY_DECISION_STATE,
  EMPTY_LIVE_MONITORING,
  type DecisionConfiguration,
  type DecisionProposalSnapshot,
  type DecisionState,
  type ExperimentEyeTrackerSnapshot,
  type ExperimentLiveMonitoringSnapshot,
  type ExperimentParticipantSnapshot,
  type InterventionEventSnapshot,
  type LiveReadingSessionSnapshot,
  type ParticipantViewportSnapshot,
  type ReadingAttentionSummarySnapshot,
  type ReadingContentSnapshot,
  type ReadingFocusSnapshot,
  type ReadingPresentationSnapshot,
  type ReaderAppearanceSnapshot,
} from "@/lib/experiment-session"
import { cloneInterventionParameters } from "@/lib/intervention-modules"
import type { GazeData } from "@/lib/gaze-socket"
import { normalizeReaderAppearance } from "@/lib/reader-appearance"

type ReplayProducer = {
  appName: string
  backendSdk: string
  backendSdkVersion: string
  exporterVersion: string
}

type ReplayManifest = {
  schema: string
  version: number
  exportedAtUnixMs: number
  completionSource: string
  exportProfile: string
  producer: ReplayProducer
  savedName?: string | null
}

type ReplayCalibrationSummary = {
  pattern: string | null
  applied: boolean
  validationPassed: boolean
  quality: string | null
  averageAccuracyDegrees: number | null
  averagePrecisionDegrees: number | null
  sampleCount: number
}

type ReplayParticipant = {
  name: string
  age: number | null
  sex: string | null
  existingEyeCondition: string | null
  readingProficiency: string | null
}

type ReplayDevice = {
  name: string | null
  model: string | null
  serialNumber: string | null
  hasSavedLicence: boolean | null
}

type ReplayEyePoint2D = { x: number | null; y: number | null; validity: string }
type ReplayEyePoint3D = { x: number | null; y: number | null; z: number | null }
type ReplayEyePupil = { diameterMm: number | null; validity: string }
type ReplayEyeOrigin3D = { x: number | null; y: number | null; z: number | null; validity: string }
type ReplayEyeTrackBoxPoint = { x: number | null; y: number | null; z: number | null }
type ReplayEyeSample = {
  gazePoint2D: ReplayEyePoint2D
  gazePoint3D: ReplayEyePoint3D | null
  pupil: ReplayEyePupil | null
  gazeOrigin3D: ReplayEyeOrigin3D | null
  gazeOriginTrackBox: ReplayEyeTrackBoxPoint | null
}

export type ExperimentLifecycleEventRecord = {
  sequenceNumber: number
  eventType: string
  source: string
  occurredAtUnixMs: number
  elapsedSinceStartMs: number | null
}

export type RawGazeSampleRecord = {
  sequenceNumber: number
  capturedAtUnixMs: number
  elapsedSinceStartMs: number | null
  deviceTimeStampUs: number
  systemTimeStampUs: number | null
  left: ReplayEyeSample | null
  right: ReplayEyeSample | null
}

export type ParticipantViewportEventRecord = {
  sequenceNumber: number
  occurredAtUnixMs: number
  elapsedSinceStartMs: number | null
  viewport: ParticipantViewportSnapshot
}

export type ReadingFocusEventRecord = {
  sequenceNumber: number
  occurredAtUnixMs: number
  elapsedSinceStartMs: number | null
  focus: ReadingFocusSnapshot
}

export type ReadingAttentionEventRecord = {
  sequenceNumber: number
  occurredAtUnixMs: number
  elapsedSinceStartMs: number | null
  summary: ReadingAttentionSummarySnapshot
}

export type DecisionProposalEventRecord = {
  sequenceNumber: number
  occurredAtUnixMs: number
  elapsedSinceStartMs: number | null
  proposal: DecisionProposalSnapshot
}

export type InterventionEventRecord = {
  sequenceNumber: number
  occurredAtUnixMs: number
  elapsedSinceStartMs: number | null
  intervention: InterventionEventSnapshot
}

export type ExperimentReplayExport = {
  manifest: ReplayManifest
  experiment: {
    sessionId: string | null
    startedAtUnixMs: number
    endedAtUnixMs: number | null
    durationMs: number | null
    condition: DecisionConfiguration
    participant: ReplayParticipant | null
    device: ReplayDevice | null
    calibration: ReplayCalibrationSummary
    lifecycleEvents: ExperimentLifecycleEventRecord[]
  }
  content: ReadingContentSnapshot & {
    contentHash: string
    tokenization: { strategy: string; version: string }
  }
  sensing: { gazeSamples: RawGazeSampleRecord[] }
  derived: {
    viewportEvents: ParticipantViewportEventRecord[]
    focusEvents: ReadingFocusEventRecord[]
    attentionEvents: ReadingAttentionEventRecord[]
  }
  interventions: {
    decisionProposals: DecisionProposalEventRecord[]
    interventionEvents: InterventionEventRecord[]
  }
  replay: {
    baseline: {
      presentation: ReadingPresentationSnapshot
      appearance: ReaderAppearanceSnapshot
    }
  }
  annotations: Array<{
    id: string
    sequenceNumber: number
    occurredAtUnixMs: number
    elapsedSinceStartMs: number | null
    author: string | null
    category: string | null
    note: string
    targetTokenId: string | null
    targetBlockId: string | null
  }>
}

export type ReplaySessionSnapshot = {
  sessionId: string | null
  isActive: boolean
  startedAtUnixMs: number
  stoppedAtUnixMs: number | null
  participant: ExperimentParticipantSnapshot | null
  eyeTrackerDevice: ExperimentEyeTrackerSnapshot | null
  receivedGazeSamples: number
  latestGazeSample: GazeData | null
  liveMonitoring: ExperimentLiveMonitoringSnapshot
  readingSession: LiveReadingSessionSnapshot | null
  decisionConfiguration: DecisionConfiguration
  decisionState: DecisionState
}

export type ReplayFrame = {
  currentTimeMs: number
  durationMs: number
  progress: number
  session: ReplaySessionSnapshot
  gazeRecord: RawGazeSampleRecord | null
  viewportRecord: ParticipantViewportEventRecord | null
  focusRecord: ReadingFocusEventRecord | null
  attentionRecord: ReadingAttentionEventRecord | null
  decisionProposalRecord: DecisionProposalEventRecord | null
  interventionRecord: InterventionEventRecord | null
  lifecycleRecord: ExperimentLifecycleEventRecord | null
}

export type ReplayKeyEvent = {
  id: string
  kind: "lifecycle" | "state" | "proposal" | "intervention" | "connection"
  timeMs: number
  title: string
  detail: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function resolveRecordTimeMs(startedAtUnixMs: number, elapsedSinceStartMs: number | null | undefined, absoluteUnixMs: number | null | undefined) {
  if (typeof elapsedSinceStartMs === "number" && Number.isFinite(elapsedSinceStartMs)) {
    return Math.max(0, elapsedSinceStartMs)
  }
  if (typeof absoluteUnixMs === "number" && Number.isFinite(absoluteUnixMs) && startedAtUnixMs > 0) {
    return Math.max(0, absoluteUnixMs - startedAtUnixMs)
  }
  return 0
}

function findLatestIndexAtOrBefore<T>(records: readonly T[], targetTimeMs: number, getTimeMs: (record: T) => number) {
  let low = 0
  let high = records.length - 1
  let answer = -1
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    if (getTimeMs(records[mid]!) <= targetTimeMs) {
      answer = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  return answer
}

function buildReadingContent(content: ExperimentReplayExport["content"]): ReadingContentSnapshot {
  return {
    documentId: content.documentId,
    title: content.title,
    markdown: content.markdown,
    sourceSetupId: content.sourceSetupId ?? null,
    updatedAtUnixMs: content.updatedAtUnixMs,
    usesSavedSetup: Boolean(content.sourceSetupId),
  }
}

function buildReadingPresentation(presentation: ReadingPresentationSnapshot): ReadingPresentationSnapshot {
  return { ...presentation, isPresentationLocked: !presentation.editableByResearcher }
}

function buildReaderAppearance(appearance: ReaderAppearanceSnapshot): ReaderAppearanceSnapshot {
  return normalizeReaderAppearance(appearance)
}

function buildIntervention(intervention: InterventionEventSnapshot): InterventionEventSnapshot {
  return {
    ...intervention,
    appliedPresentation: buildReadingPresentation(intervention.appliedPresentation),
    appliedAppearance: buildReaderAppearance(intervention.appliedAppearance),
    parameters: cloneInterventionParameters(intervention.parameters),
  }
}

function buildDecisionProposal(proposal: DecisionProposalSnapshot): DecisionProposalSnapshot {
  return {
    ...proposal,
    signal: { ...proposal.signal },
    proposedIntervention: {
      ...proposal.proposedIntervention,
      parameters: cloneInterventionParameters(proposal.proposedIntervention.parameters),
      presentation: { ...proposal.proposedIntervention.presentation },
      appearance: { ...proposal.proposedIntervention.appearance },
    },
  }
}

function buildEmptyReadingSession(replay: ExperimentReplayExport): LiveReadingSessionSnapshot {
  return {
    content: buildReadingContent(replay.content),
    presentation: buildReadingPresentation(replay.replay.baseline.presentation),
    appearance: buildReaderAppearance(replay.replay.baseline.appearance),
    participantViewport: { isConnected: false, scrollProgress: 0, scrollTopPx: 0, viewportWidthPx: 0, viewportHeightPx: 0, contentHeightPx: 0, contentWidthPx: 0, updatedAtUnixMs: 0 },
    focus: { isInsideReadingArea: false, normalizedContentX: null, normalizedContentY: null, activeTokenId: null, activeBlockId: null, updatedAtUnixMs: 0 },
    latestIntervention: null,
    recentInterventions: [],
    attentionSummary: null,
  }
}

function buildGazeData(sample: RawGazeSampleRecord): GazeData {
  return {
    deviceTimeStamp: sample.deviceTimeStampUs,
    systemTimeStamp: sample.systemTimeStampUs,
    leftEyeX: sample.left?.gazePoint2D.x ?? 0,
    leftEyeY: sample.left?.gazePoint2D.y ?? 0,
    leftEyeValidity: sample.left?.gazePoint2D.validity ?? "Invalid",
    rightEyeX: sample.right?.gazePoint2D.x ?? 0,
    rightEyeY: sample.right?.gazePoint2D.y ?? 0,
    rightEyeValidity: sample.right?.gazePoint2D.validity ?? "Invalid",
    leftEyePositionInUserX: sample.left?.gazePoint3D?.x ?? null,
    leftEyePositionInUserY: sample.left?.gazePoint3D?.y ?? null,
    leftEyePositionInUserZ: sample.left?.gazePoint3D?.z ?? null,
    leftPupilDiameterMm: sample.left?.pupil?.diameterMm ?? null,
    leftPupilValidity: sample.left?.pupil?.validity ?? "Invalid",
    leftGazeOriginInUserX: sample.left?.gazeOrigin3D?.x ?? null,
    leftGazeOriginInUserY: sample.left?.gazeOrigin3D?.y ?? null,
    leftGazeOriginInUserZ: sample.left?.gazeOrigin3D?.z ?? null,
    leftGazeOriginValidity: sample.left?.gazeOrigin3D?.validity ?? "Invalid",
    leftGazeOriginInTrackBoxX: sample.left?.gazeOriginTrackBox?.x ?? null,
    leftGazeOriginInTrackBoxY: sample.left?.gazeOriginTrackBox?.y ?? null,
    leftGazeOriginInTrackBoxZ: sample.left?.gazeOriginTrackBox?.z ?? null,
    rightEyePositionInUserX: sample.right?.gazePoint3D?.x ?? null,
    rightEyePositionInUserY: sample.right?.gazePoint3D?.y ?? null,
    rightEyePositionInUserZ: sample.right?.gazePoint3D?.z ?? null,
    rightPupilDiameterMm: sample.right?.pupil?.diameterMm ?? null,
    rightPupilValidity: sample.right?.pupil?.validity ?? "Invalid",
    rightGazeOriginInUserX: sample.right?.gazeOrigin3D?.x ?? null,
    rightGazeOriginInUserY: sample.right?.gazeOrigin3D?.y ?? null,
    rightGazeOriginInUserZ: sample.right?.gazeOrigin3D?.z ?? null,
    rightGazeOriginValidity: sample.right?.gazeOrigin3D?.validity ?? "Invalid",
    rightGazeOriginInTrackBoxX: sample.right?.gazeOriginTrackBox?.x ?? null,
    rightGazeOriginInTrackBoxY: sample.right?.gazeOriginTrackBox?.y ?? null,
    rightGazeOriginInTrackBoxZ: sample.right?.gazeOriginTrackBox?.z ?? null,
  }
}

function buildDecisionStateAtTime(replay: ExperimentReplayExport, currentTimeMs: number): DecisionState {
  const startedAtUnixMs = replay.experiment.startedAtUnixMs
  const lastIndex = findLatestIndexAtOrBefore(replay.interventions.decisionProposals, currentTimeMs, (record) =>
    resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs)
  )
  if (lastIndex < 0) {
    return { ...EMPTY_DECISION_STATE, automationPaused: false, recentProposalHistory: [] }
  }

  const latestById = new Map<string, { proposal: DecisionProposalSnapshot; timeMs: number }>()
  for (let index = 0; index <= lastIndex; index += 1) {
    const record = replay.interventions.decisionProposals[index]!
    latestById.set(record.proposal.proposalId, {
      proposal: record.proposal,
      timeMs: resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs),
    })
  }

  const latestEntries = [...latestById.values()].sort((left, right) => right.timeMs - left.timeMs)
  const active = latestEntries.find((entry) => entry.proposal.status === "pending")

  return {
    automationPaused: false,
    activeProposal: active ? buildDecisionProposal(active.proposal) : null,
    recentProposalHistory: latestEntries
      .filter((entry) => entry.proposal.status !== "pending")
      .slice(0, 25)
      .map((entry) => buildDecisionProposal(entry.proposal)),
  }
}

function buildLiveMonitoring(isActive: boolean, readingSession: LiveReadingSessionSnapshot, receivedGazeSamples: number): ExperimentLiveMonitoringSnapshot {
  const viewport = readingSession.participantViewport
  const focus = readingSession.focus
  return {
    ...EMPTY_LIVE_MONITORING,
    canStartSession: false,
    canFinishSession: isActive,
    isGazeStreamingActive: isActive && receivedGazeSamples > 0,
    hasParticipantViewConnection: viewport.isConnected,
    hasParticipantViewportData: viewport.isConnected && viewport.viewportWidthPx > 0 && viewport.viewportHeightPx > 0 && viewport.updatedAtUnixMs > 0,
    participantViewportUpdatedAtUnixMs: viewport.updatedAtUnixMs > 0 ? viewport.updatedAtUnixMs : null,
    hasReadingFocusSignal: focus.updatedAtUnixMs > 0,
    focusUpdatedAtUnixMs: focus.updatedAtUnixMs > 0 ? focus.updatedAtUnixMs : null,
  }
}

function normalizeLifecycleTitle(eventType: string) {
  if (eventType === "session-started") {
    return "Session started"
  }
  if (eventType === "session-stopped") {
    return "Session finished"
  }
  return eventType
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

function normalizeReadingAttentionSummary(summary: ReadingAttentionSummarySnapshot): ReadingAttentionSummarySnapshot {
  return {
    ...summary,
    tokenStats: Object.fromEntries(Object.entries(summary.tokenStats).map(([tokenId, stats]) => [tokenId, { ...stats }])),
  }
}

export function parseExperimentReplayExport(input: string | unknown): ExperimentReplayExport {
  let parsed: unknown = input
  if (typeof input === "string") {
    const trimmed = input.trim()
    if (!trimmed.startsWith("{")) {
      throw new Error("Unsupported replay format. Upload a replay JSON exported from this application.")
    }
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      throw new Error("The uploaded file is not valid JSON.")
    }
  }

  if (!isRecord(parsed) || !isRecord(parsed.manifest) || !isRecord(parsed.experiment) || !isRecord(parsed.content) || !isRecord(parsed.sensing) || !isRecord(parsed.derived) || !isRecord(parsed.interventions) || !isRecord(parsed.replay)) {
    throw new Error("The file does not match the replay export format.")
  }

  if (parsed.manifest.schema !== "rtr.experiment-export" || parsed.manifest.version !== 2) {
    throw new Error("Unsupported replay format. Upload a replay JSON exported from this application.")
  }

  return parsed as ExperimentReplayExport
}

export function resolveReplayDurationMs(replay: ExperimentReplayExport) {
  if (typeof replay.experiment.durationMs === "number" && Number.isFinite(replay.experiment.durationMs)) {
    return Math.max(0, replay.experiment.durationMs)
  }
  if (typeof replay.experiment.endedAtUnixMs === "number" && replay.experiment.startedAtUnixMs > 0) {
    return Math.max(0, replay.experiment.endedAtUnixMs - replay.experiment.startedAtUnixMs)
  }
  return 0
}

export function formatReplayClock(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

export function buildReplayFrame(replay: ExperimentReplayExport, requestedTimeMs: number): ReplayFrame {
  const durationMs = resolveReplayDurationMs(replay)
  const currentTimeMs = Math.min(Math.max(requestedTimeMs, 0), durationMs)
  const startedAtUnixMs = replay.experiment.startedAtUnixMs

  const gazeIndex = findLatestIndexAtOrBefore(replay.sensing.gazeSamples, currentTimeMs, (record) =>
    resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.capturedAtUnixMs)
  )
  const viewportIndex = findLatestIndexAtOrBefore(replay.derived.viewportEvents, currentTimeMs, (record) =>
    resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs)
  )
  const focusIndex = findLatestIndexAtOrBefore(replay.derived.focusEvents, currentTimeMs, (record) =>
    resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs)
  )
  const attentionIndex = findLatestIndexAtOrBefore(replay.derived.attentionEvents, currentTimeMs, (record) =>
    resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs)
  )
  const proposalIndex = findLatestIndexAtOrBefore(replay.interventions.decisionProposals, currentTimeMs, (record) =>
    resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs)
  )
  const interventionIndex = findLatestIndexAtOrBefore(replay.interventions.interventionEvents, currentTimeMs, (record) =>
    resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs)
  )
  const lifecycleIndex = findLatestIndexAtOrBefore(replay.experiment.lifecycleEvents, currentTimeMs, (record) =>
    resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs)
  )

  const gazeRecord = gazeIndex >= 0 ? replay.sensing.gazeSamples[gazeIndex]! : null
  const viewportRecord = viewportIndex >= 0 ? replay.derived.viewportEvents[viewportIndex]! : null
  const focusRecord = focusIndex >= 0 ? replay.derived.focusEvents[focusIndex]! : null
  const attentionRecord = attentionIndex >= 0 ? replay.derived.attentionEvents[attentionIndex]! : null
  const decisionProposalRecord = proposalIndex >= 0 ? replay.interventions.decisionProposals[proposalIndex]! : null
  const interventionRecord = interventionIndex >= 0 ? replay.interventions.interventionEvents[interventionIndex]! : null
  const lifecycleRecord = lifecycleIndex >= 0 ? replay.experiment.lifecycleEvents[lifecycleIndex]! : null

  const readingSession = buildEmptyReadingSession(replay)
  const recentInterventions = interventionIndex >= 0
    ? replay.interventions.interventionEvents.slice(0, interventionIndex + 1).slice(-25).reverse().map((record) => buildIntervention(record.intervention))
    : []

  readingSession.participantViewport = viewportRecord ? { ...viewportRecord.viewport } : readingSession.participantViewport
  readingSession.focus = focusRecord ? { ...focusRecord.focus } : readingSession.focus
  readingSession.attentionSummary = attentionRecord ? normalizeReadingAttentionSummary(attentionRecord.summary) : null
  readingSession.recentInterventions = recentInterventions
  readingSession.latestIntervention = recentInterventions[0] ?? null
  if (readingSession.latestIntervention) {
    readingSession.presentation = { ...readingSession.latestIntervention.appliedPresentation }
    readingSession.appearance = { ...readingSession.latestIntervention.appliedAppearance }
  }

  const receivedGazeSamples = gazeIndex >= 0 ? gazeIndex + 1 : 0
  const isActive = currentTimeMs < durationMs
  const session: ReplaySessionSnapshot = {
    sessionId: replay.experiment.sessionId,
    isActive,
    startedAtUnixMs: replay.experiment.startedAtUnixMs,
    stoppedAtUnixMs: isActive ? null : replay.experiment.endedAtUnixMs,
    participant: replay.experiment.participant
      ? { name: replay.experiment.participant.name, age: replay.experiment.participant.age ?? 0, sex: replay.experiment.participant.sex ?? "", existingEyeCondition: replay.experiment.participant.existingEyeCondition ?? "", readingProficiency: replay.experiment.participant.readingProficiency ?? "" }
      : null,
    eyeTrackerDevice: replay.experiment.device
      ? { name: replay.experiment.device.name ?? "", model: replay.experiment.device.model ?? "", serialNumber: replay.experiment.device.serialNumber ?? "", hasSavedLicence: replay.experiment.device.hasSavedLicence ?? false }
      : null,
    receivedGazeSamples,
    latestGazeSample: gazeRecord ? buildGazeData(gazeRecord) : null,
    liveMonitoring: buildLiveMonitoring(isActive, readingSession, receivedGazeSamples),
    readingSession,
    decisionConfiguration: { ...replay.experiment.condition },
    decisionState: buildDecisionStateAtTime(replay, currentTimeMs),
  }

  return {
    currentTimeMs,
    durationMs,
    progress: durationMs <= 0 ? 0 : currentTimeMs / durationMs,
    session,
    gazeRecord,
    viewportRecord,
    focusRecord,
    attentionRecord,
    decisionProposalRecord,
    interventionRecord,
    lifecycleRecord,
  }
}

export function buildReplayKeyEvents(replay: ExperimentReplayExport): ReplayKeyEvent[] {
  const startedAtUnixMs = replay.experiment.startedAtUnixMs
  const events: ReplayKeyEvent[] = []

  for (const record of replay.experiment.lifecycleEvents) {
    events.push({
      id: `lifecycle-${record.sequenceNumber}`,
      kind: "lifecycle",
      timeMs: resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs),
      title: normalizeLifecycleTitle(record.eventType),
      detail: record.source,
    })
  }

  let previousViewportConnection: boolean | null = null
  for (const record of replay.derived.viewportEvents) {
    if (previousViewportConnection === record.viewport.isConnected) {
      continue
    }
    previousViewportConnection = record.viewport.isConnected
    events.push({
      id: `connection-${record.sequenceNumber}`,
      kind: "connection",
      timeMs: resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs),
      title: record.viewport.isConnected ? "Participant view connected" : "Participant view disconnected",
      detail: record.viewport.isConnected ? "Viewport telemetry became available." : "Viewport telemetry stopped updating.",
    })
  }

  for (const record of replay.interventions.interventionEvents) {
    events.push({
      id: `intervention-${record.sequenceNumber}`,
      kind: "intervention",
      timeMs: resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs),
      title: "Intervention applied",
      detail: record.intervention.reason,
    })
  }

  for (const record of replay.interventions.decisionProposals) {
    events.push({
      id: `proposal-${record.sequenceNumber}`,
      kind: "proposal",
      timeMs: resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs),
      title: `Proposal ${record.proposal.status}`,
      detail: record.proposal.rationale,
    })
  }

  return events.sort((left, right) => left.timeMs - right.timeMs)
}

export function findReplayKeyEventIndex(events: readonly ReplayKeyEvent[], timeMs: number) {
  return findLatestIndexAtOrBefore(events, timeMs, (event) => event.timeMs)
}
