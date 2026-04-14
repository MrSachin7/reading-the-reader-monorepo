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
  type PendingInterventionSnapshot,
  type ParticipantViewportSnapshot,
  type ReadingContentSnapshot,
  type ReadingContextPreservationSnapshot,
  type ReadingFocusSnapshot,
  type ReadingInterventionPolicySnapshot,
  type ReadingPresentationSnapshot,
  type ReaderAppearanceSnapshot,
} from "@/lib/experiment-session"
import { cloneInterventionParameters } from "@/lib/intervention-modules"
import type { GazeData } from "@/lib/gaze-socket"
import type { ReadingAttentionSummarySnapshot } from "@/lib/reading-attention-summary"
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

export type ReadingContextPreservationEventRecord = {
  sequenceNumber: number
  occurredAtUnixMs: number
  elapsedSinceStartMs: number | null
  contextPreservation: ReadingContextPreservationSnapshot
}

export type DecisionProposalEventRecord = {
  sequenceNumber: number
  occurredAtUnixMs: number
  elapsedSinceStartMs: number | null
  proposal: DecisionProposalSnapshot
}

export type ScheduledInterventionEventRecord = {
  sequenceNumber: number
  occurredAtUnixMs: number
  elapsedSinceStartMs: number | null
  pendingIntervention: PendingInterventionSnapshot
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
    contextPreservationEvents: ReadingContextPreservationEventRecord[]
  }
  interventions: {
    decisionProposals: DecisionProposalEventRecord[]
    scheduledInterventions: ScheduledInterventionEventRecord[]
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
  contextPreservationRecord: ReadingContextPreservationEventRecord | null
  decisionProposalRecord: DecisionProposalEventRecord | null
  scheduledInterventionRecord: ScheduledInterventionEventRecord | null
  interventionRecord: InterventionEventRecord | null
  lifecycleRecord: ExperimentLifecycleEventRecord | null
}

export type ReplayKeyEvent = {
  id: string
  kind: "lifecycle" | "state" | "proposal" | "intervention" | "connection" | "recovery"
  timeMs: number
  title: string
  detail: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function decodeBase64Utf8(value: string) {
  const binary = atob(value)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function parseCsvRows(input: string) {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ""
  let index = 0
  let inQuotes = false

  while (index < input.length) {
    const char = input[index]!

    if (inQuotes) {
      if (char === "\"") {
        if (input[index + 1] === "\"") {
          currentCell += "\""
          index += 2
          continue
        }

        inQuotes = false
        index += 1
        continue
      }

      currentCell += char
      index += 1
      continue
    }

    if (char === "\"") {
      inQuotes = true
      index += 1
      continue
    }

    if (char === ",") {
      currentRow.push(currentCell)
      currentCell = ""
      index += 1
      continue
    }

    if (char === "\r") {
      currentRow.push(currentCell)
      rows.push(currentRow)
      currentRow = []
      currentCell = ""
      index += input[index + 1] === "\n" ? 2 : 1
      continue
    }

    if (char === "\n") {
      currentRow.push(currentCell)
      rows.push(currentRow)
      currentRow = []
      currentCell = ""
      index += 1
      continue
    }

    currentCell += char
    index += 1
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell)
    rows.push(currentRow)
  }

  return rows
}

function parseReplayExportFromCsv(input: string): ExperimentReplayExport {
  const rows = parseCsvRows(input.trim())
  if (rows.length < 2) {
    throw new Error("The uploaded file is not a supported replay CSV export.")
  }

  const headers = rows[0]!
  const recordRows = rows.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]))
  )
  const replayJsonRow = recordRows.find((row) => row.RowType === "replay-json")
  const encodedPayload = replayJsonRow?.Notes?.trim()

  if (!encodedPayload) {
    throw new Error("This CSV export does not include the replay payload. Export it again before replaying.")
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(decodeBase64Utf8(encodedPayload))
  } catch {
    throw new Error("The embedded replay payload in this CSV export is invalid.")
  }

  if (
    !isRecord(parsed) ||
    !isRecord(parsed.manifest) ||
    parsed.manifest.schema !== "rtr.experiment-export" ||
    parsed.manifest.version !== 2 &&
    parsed.manifest.version !== 3
  ) {
    throw new Error("Unsupported replay format. Upload a replay export generated by this application.")
  }

  return parsed as ExperimentReplayExport
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

function buildReadingInterventionPolicy(
  policy: ReadingInterventionPolicySnapshot | null | undefined
): ReadingInterventionPolicySnapshot {
  return {
    layoutCommitBoundary: policy?.layoutCommitBoundary ?? "paragraph-end",
    layoutFallbackBoundary: policy?.layoutFallbackBoundary ?? "sentence-end",
    layoutFallbackAfterMs: policy?.layoutFallbackAfterMs ?? 6000,
  }
}

function buildPendingIntervention(
  pendingIntervention: PendingInterventionSnapshot | null | undefined
): PendingInterventionSnapshot | null {
  if (!pendingIntervention) {
    return null
  }

  return {
    ...pendingIntervention,
    intervention: {
      ...pendingIntervention.intervention,
      parameters: cloneInterventionParameters(pendingIntervention.intervention.parameters),
      presentation: { ...pendingIntervention.intervention.presentation },
      appearance: { ...pendingIntervention.intervention.appearance },
    },
  }
}

function buildContextPreservation(
  contextPreservation: ReadingContextPreservationSnapshot
): ReadingContextPreservationSnapshot {
  return { ...contextPreservation }
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
    interventionPolicy: buildReadingInterventionPolicy(null),
    participantViewport: { isConnected: false, scrollProgress: 0, scrollTopPx: 0, viewportWidthPx: 0, viewportHeightPx: 0, contentHeightPx: 0, contentWidthPx: 0, updatedAtUnixMs: 0 },
    focus: { isInsideReadingArea: false, normalizedContentX: null, normalizedContentY: null, activeTokenId: null, activeBlockId: null, activeSentenceId: null, updatedAtUnixMs: 0 },
    pendingIntervention: null,
    latestContextPreservation: null,
    recentContextPreservationEvents: [],
    latestLayoutGuardrail: null,
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
      return parseReplayExportFromCsv(trimmed)
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

  if (
    parsed.manifest.schema !== "rtr.experiment-export" ||
    (parsed.manifest.version !== 2 && parsed.manifest.version !== 3)
  ) {
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

  const startedAtUnixMs = replay.experiment.startedAtUnixMs
  const latestRecordedTimeMs = Math.max(
    ...replay.experiment.lifecycleEvents.map((record) =>
      resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs)
    ),
    ...replay.sensing.gazeSamples.map((record) =>
      resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.capturedAtUnixMs)
    ),
    ...replay.derived.viewportEvents.map((record) =>
      resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs)
    ),
    ...replay.derived.focusEvents.map((record) =>
      resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs)
    ),
    ...replay.derived.attentionEvents.map((record) =>
      resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs)
    ),
    ...replay.derived.contextPreservationEvents.map((record) =>
      resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs)
    ),
    ...replay.interventions.decisionProposals.map((record) =>
      resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs)
    ),
    ...replay.interventions.scheduledInterventions.map((record) =>
      resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs)
    ),
    ...replay.interventions.interventionEvents.map((record) =>
      resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs)
    ),
    0
  )

  return Math.max(0, latestRecordedTimeMs)
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
  const contextPreservationIndex = findLatestIndexAtOrBefore(
    replay.derived.contextPreservationEvents,
    currentTimeMs,
    (record) => resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs)
  )
  const proposalIndex = findLatestIndexAtOrBefore(replay.interventions.decisionProposals, currentTimeMs, (record) =>
    resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs)
  )
  const scheduledInterventionIndex = findLatestIndexAtOrBefore(
    replay.interventions.scheduledInterventions,
    currentTimeMs,
    (record) => resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs)
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
  const contextPreservationRecord =
    contextPreservationIndex >= 0 ? replay.derived.contextPreservationEvents[contextPreservationIndex]! : null
  const decisionProposalRecord = proposalIndex >= 0 ? replay.interventions.decisionProposals[proposalIndex]! : null
  const scheduledInterventionRecord =
    scheduledInterventionIndex >= 0 ? replay.interventions.scheduledInterventions[scheduledInterventionIndex]! : null
  const interventionRecord = interventionIndex >= 0 ? replay.interventions.interventionEvents[interventionIndex]! : null
  const lifecycleRecord = lifecycleIndex >= 0 ? replay.experiment.lifecycleEvents[lifecycleIndex]! : null

  const readingSession = buildEmptyReadingSession(replay)
  const recentContextPreservationEvents =
    contextPreservationIndex >= 0
      ? replay.derived.contextPreservationEvents
          .slice(0, contextPreservationIndex + 1)
          .slice(-10)
          .reverse()
          .map((record) => buildContextPreservation(record.contextPreservation))
      : []
  const recentInterventions = interventionIndex >= 0
    ? replay.interventions.interventionEvents.slice(0, interventionIndex + 1).slice(-25).reverse().map((record) => buildIntervention(record.intervention))
    : []

  readingSession.participantViewport = viewportRecord ? { ...viewportRecord.viewport } : readingSession.participantViewport
  readingSession.focus = focusRecord ? { ...focusRecord.focus } : readingSession.focus
  readingSession.attentionSummary = attentionRecord ? normalizeReadingAttentionSummary(attentionRecord.summary) : null
  readingSession.recentContextPreservationEvents = recentContextPreservationEvents
  readingSession.latestContextPreservation = recentContextPreservationEvents[0] ?? null
  readingSession.pendingIntervention = scheduledInterventionRecord
    ? buildPendingIntervention(scheduledInterventionRecord.pendingIntervention)
    : null
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
    contextPreservationRecord,
    decisionProposalRecord,
    scheduledInterventionRecord,
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
      detail:
        record.intervention.waitDurationMs && record.intervention.waitDurationMs > 0
          ? `${record.intervention.reason} · ${record.intervention.appliedBoundary} after ${record.intervention.waitDurationMs} ms`
          : `${record.intervention.reason} · ${record.intervention.appliedBoundary}`,
    })
  }

  for (const record of replay.interventions.scheduledInterventions) {
    const pending = record.pendingIntervention
    const detailParts: string[] = [pending.requestedBoundary]
    if (pending.fallbackBoundary) {
      detailParts.push(`fallback ${pending.fallbackBoundary}`)
    }
    if (pending.waitDurationMs !== null) {
      detailParts.push(`wait ${pending.waitDurationMs} ms`)
    }
    if (pending.resolutionReason) {
      detailParts.push(pending.resolutionReason)
    }

    events.push({
      id: `scheduled-${record.sequenceNumber}`,
      kind: "state",
      timeMs: resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs),
      title: `Intervention ${pending.status}`,
      detail: detailParts.join(" · "),
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

  for (const record of replay.derived.contextPreservationEvents) {
    const context = record.contextPreservation
    const detailParts: string[] = [context.anchorSource]
    if (context.commitBoundary) {
      detailParts.push(context.commitBoundary)
    }
    if (context.waitDurationMs !== null) {
      detailParts.push(`wait ${context.waitDurationMs} ms`)
    }
    if (context.reason) {
      detailParts.push(context.reason)
    }

    events.push({
      id: `context-${record.sequenceNumber}`,
      kind: "recovery",
      timeMs: resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs),
      title: `Context ${context.status}`,
      detail: detailParts.join(" · "),
    })
  }

  return events.sort((left, right) => left.timeMs - right.timeMs)
}

export function findReplayKeyEventIndex(events: readonly ReplayKeyEvent[], timeMs: number) {
  return findLatestIndexAtOrBefore(events, timeMs, (event) => event.timeMs)
}
