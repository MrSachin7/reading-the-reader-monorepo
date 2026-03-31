import { z } from "zod"

import type {
  DecisionConfiguration,
  DecisionProposalSnapshot,
  DecisionState,
  ExperimentEyeTrackerSnapshot,
  ExperimentParticipantSnapshot,
  InterventionEventSnapshot,
  LiveReadingSessionSnapshot,
  ParticipantViewportSnapshot,
  ReadingFocusSnapshot,
} from "@/lib/experiment-session"
import { cloneInterventionParameters } from "@/lib/intervention-modules"
import type { ReadingAttentionSummarySnapshot } from "@/lib/reading-attention-summary"
import type { GazeData } from "@/lib/gaze-socket"

const gazeDataSchema = z.object({
  deviceTimeStamp: z.number(),
  leftEyeX: z.number(),
  leftEyeY: z.number(),
  leftEyeValidity: z.string(),
  rightEyeX: z.number(),
  rightEyeY: z.number(),
  rightEyeValidity: z.string(),
})

const participantSchema = z.object({
  name: z.string(),
  age: z.number(),
  sex: z.string(),
  existingEyeCondition: z.string(),
  readingProficiency: z.string(),
})

const eyeTrackerSchema = z.object({
  name: z.string(),
  model: z.string(),
  serialNumber: z.string(),
  hasSavedLicence: z.boolean(),
})

const readingPresentationSchema = z.object({
  fontFamily: z.string(),
  fontSizePx: z.number(),
  lineWidthPx: z.number(),
  lineHeight: z.number(),
  letterSpacingEm: z.number(),
  editableByResearcher: z.boolean(),
})

const readerAppearanceSchema = z.object({
  themeMode: z.enum(["light", "dark"]),
  palette: z.enum(["default", "sepia", "high-contrast"]),
  appFont: z.enum(["geist", "inter", "space-grotesk", "merriweather"]),
})

const readingContentSchema = z.object({
  documentId: z.string(),
  title: z.string(),
  markdown: z.string(),
  sourceSetupId: z.string().nullable(),
  updatedAtUnixMs: z.number(),
})

const participantViewportSchema = z.object({
  isConnected: z.boolean(),
  scrollProgress: z.number(),
  scrollTopPx: z.number(),
  viewportWidthPx: z.number(),
  viewportHeightPx: z.number(),
  contentHeightPx: z.number(),
  contentWidthPx: z.number(),
  updatedAtUnixMs: z.number(),
})

const readingFocusSchema = z.object({
  isInsideReadingArea: z.boolean(),
  normalizedContentX: z.number().nullable(),
  normalizedContentY: z.number().nullable(),
  activeTokenId: z.string().nullable(),
  activeBlockId: z.string().nullable(),
  updatedAtUnixMs: z.number(),
})

const interventionSchema = z.object({
  id: z.string(),
  source: z.string(),
  trigger: z.string(),
  reason: z.string(),
  appliedAtUnixMs: z.number(),
  appliedPresentation: readingPresentationSchema,
  appliedAppearance: readerAppearanceSchema.default({
    themeMode: "light",
    palette: "default",
    appFont: "geist",
  }),
  moduleId: z.string().nullable().default(null),
  parameters: z.record(z.string(), z.string().nullable()).nullable().default(null),
})

const decisionConfigurationSchema = z.object({
  conditionLabel: z.string(),
  providerId: z.string(),
  executionMode: z.string(),
})

const decisionSignalSchema = z.object({
  signalType: z.string(),
  summary: z.string(),
  observedAtUnixMs: z.number(),
  confidence: z.number().nullable(),
})

const decisionProposalInterventionSchema = z.object({
  source: z.string(),
  trigger: z.string(),
  reason: z.string(),
  moduleId: z.string().nullable().default(null),
  parameters: z.record(z.string(), z.string().nullable()).nullable().default(null),
  presentation: z.object({
    fontFamily: z.string().nullable(),
    fontSizePx: z.number().nullable(),
    lineWidthPx: z.number().nullable(),
    lineHeight: z.number().nullable(),
    letterSpacingEm: z.number().nullable(),
    editableByResearcher: z.boolean().nullable(),
  }),
  appearance: z.object({
    themeMode: z.string().nullable(),
    palette: z.string().nullable(),
    appFont: z.string().nullable(),
  }),
})

const decisionProposalSchema = z.object({
  proposalId: z.string(),
  conditionLabel: z.string(),
  providerId: z.string(),
  executionMode: z.string(),
  status: z.string(),
  signal: decisionSignalSchema,
  rationale: z.string(),
  proposedAtUnixMs: z.number(),
  resolvedAtUnixMs: z.number().nullable(),
  resolutionSource: z.string().nullable(),
  appliedInterventionId: z.string().nullable(),
  proposedIntervention: decisionProposalInterventionSchema,
})

const decisionStateSchema = z.object({
  automationPaused: z.boolean(),
  activeProposal: decisionProposalSchema.nullable(),
  recentProposalHistory: z.array(decisionProposalSchema),
})

const readingAttentionTokenStatsSchema = z.object({
  fixationMs: z.number(),
  fixationCount: z.number(),
  skimCount: z.number(),
  maxFixationMs: z.number(),
  lastFixationMs: z.number(),
})

const readingAttentionSummarySchema = z.object({
  updatedAtUnixMs: z.number(),
  tokenStats: z.record(z.string(), readingAttentionTokenStatsSchema),
  currentTokenId: z.string().nullable(),
  currentTokenDurationMs: z.number().nullable(),
  fixatedTokenCount: z.number(),
  skimmedTokenCount: z.number(),
})

const liveReadingSessionSchema = z.object({
  content: readingContentSchema.nullable(),
  presentation: readingPresentationSchema,
  appearance: readerAppearanceSchema.default({
    themeMode: "light",
    palette: "default",
    appFont: "geist",
  }),
  participantViewport: participantViewportSchema,
  focus: readingFocusSchema,
  latestIntervention: interventionSchema.nullable(),
  recentInterventions: z.array(interventionSchema),
  attentionSummary: readingAttentionSummarySchema.nullable().default(null),
})

const replaySessionSnapshotSchema = z.object({
  sessionId: z.string().nullable(),
  isActive: z.boolean(),
  startedAtUnixMs: z.number(),
  stoppedAtUnixMs: z.number().nullable(),
  participant: participantSchema.nullable(),
  eyeTrackerDevice: eyeTrackerSchema.nullable(),
  receivedGazeSamples: z.number(),
  latestGazeSample: gazeDataSchema.nullable(),
  readingSession: liveReadingSessionSchema.nullable(),
  decisionConfiguration: decisionConfigurationSchema,
  decisionState: decisionStateSchema,
})

const replayMetadataSchema = z.object({
  format: z.string(),
  version: z.number(),
  exportedAtUnixMs: z.number(),
  sessionId: z.string().nullable(),
  completionSource: z.string(),
  startedAtUnixMs: z.number(),
  endedAtUnixMs: z.number().nullable(),
  durationMs: z.number().nullable(),
  savedName: z.string().nullable().optional(),
})

const replayStatisticsSchema = z.object({
  lifecycleEventCount: z.number(),
  gazeSampleCount: z.number(),
  readingSessionStateCount: z.number(),
  participantViewportEventCount: z.number(),
  readingFocusEventCount: z.number(),
  decisionProposalEventCount: z.number(),
  interventionEventCount: z.number(),
})

const timedRecordSchema = z.object({
  sequenceNumber: z.number(),
  elapsedSinceStartMs: z.number().nullable(),
})

const lifecycleRecordSchema = timedRecordSchema.extend({
  eventType: z.string(),
  source: z.string(),
  occurredAtUnixMs: z.number(),
})

const gazeRecordSchema = timedRecordSchema.extend({
  capturedAtUnixMs: z.number(),
  sample: gazeDataSchema,
})

const readingSessionStateRecordSchema = timedRecordSchema.extend({
  reason: z.string(),
  occurredAtUnixMs: z.number(),
  session: liveReadingSessionSchema,
})

const participantViewportEventRecordSchema = timedRecordSchema.extend({
  occurredAtUnixMs: z.number(),
  viewport: participantViewportSchema,
})

const readingFocusEventRecordSchema = timedRecordSchema.extend({
  occurredAtUnixMs: z.number(),
  focus: readingFocusSchema,
})

const interventionEventRecordSchema = timedRecordSchema.extend({
  occurredAtUnixMs: z.number(),
  intervention: interventionSchema,
})

const decisionProposalEventRecordSchema = timedRecordSchema.extend({
  occurredAtUnixMs: z.number(),
  proposal: decisionProposalSchema,
})

const experimentReplayExportSchema = z.object({
  metadata: replayMetadataSchema,
  statistics: replayStatisticsSchema,
  initialSnapshot: replaySessionSnapshotSchema,
  finalSnapshot: replaySessionSnapshotSchema,
  lifecycleEvents: z.array(lifecycleRecordSchema),
  gazeSamples: z.array(gazeRecordSchema),
  readingSessionStates: z.array(readingSessionStateRecordSchema),
  participantViewportEvents: z.array(participantViewportEventRecordSchema),
  readingFocusEvents: z.array(readingFocusEventRecordSchema),
  decisionProposalEvents: z.array(decisionProposalEventRecordSchema),
  interventionEvents: z.array(interventionEventRecordSchema),
})

export type ReplaySessionSnapshot = {
  sessionId: string | null
  isActive: boolean
  startedAtUnixMs: number
  stoppedAtUnixMs: number | null
  participant: ExperimentParticipantSnapshot | null
  eyeTrackerDevice: ExperimentEyeTrackerSnapshot | null
  receivedGazeSamples: number
  latestGazeSample: GazeData | null
  readingSession: LiveReadingSessionSnapshot | null
  decisionConfiguration: DecisionConfiguration
  decisionState: DecisionState
}

export type ExperimentReplayMetadata = z.infer<typeof replayMetadataSchema>
export type ExperimentReplayStatistics = z.infer<typeof replayStatisticsSchema>
export type ExperimentLifecycleEventRecord = z.infer<typeof lifecycleRecordSchema>
export type GazeSampleRecord = z.infer<typeof gazeRecordSchema>
export type ReadingSessionStateRecord = z.infer<typeof readingSessionStateRecordSchema>
export type ParticipantViewportEventRecord = z.infer<typeof participantViewportEventRecordSchema>
export type ReadingFocusEventRecord = z.infer<typeof readingFocusEventRecordSchema>
export type DecisionProposalEventRecord = z.infer<typeof decisionProposalEventRecordSchema>
export type InterventionEventRecord = z.infer<typeof interventionEventRecordSchema>
export type ExperimentReplayExport = z.infer<typeof experimentReplayExportSchema>

export type ReplayFrame = {
  currentTimeMs: number
  durationMs: number
  progress: number
  session: ReplaySessionSnapshot
  gazeRecord: GazeSampleRecord | null
  viewportRecord: ParticipantViewportEventRecord | null
  focusRecord: ReadingFocusEventRecord | null
  readingSessionStateRecord: ReadingSessionStateRecord | null
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

function getErrorMessage(error: z.ZodError) {
  const details = error.issues
    .slice(0, 4)
    .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
    .join("; ")

  return details.length > 0 ? details : "The file does not match the replay export format."
}

function parseCsvRows(input: string) {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let index = 0
  let inQuotes = false

  while (index < input.length) {
    const character = input[index]!

    if (inQuotes) {
      if (character === "\"") {
        if (input[index + 1] === "\"") {
          field += "\""
          index += 1
        } else {
          inQuotes = false
        }
      } else {
        field += character
      }

      index += 1
      continue
    }

    if (character === "\"") {
      inQuotes = true
      index += 1
      continue
    }

    if (character === ",") {
      row.push(field)
      field = ""
      index += 1
      continue
    }

    if (character === "\r" || character === "\n") {
      row.push(field)
      field = ""

      if (row.some((value) => value.length > 0)) {
        rows.push(row)
      }

      row = []
      if (character === "\r" && input[index + 1] === "\n") {
        index += 2
      } else {
        index += 1
      }

      continue
    }

    field += character
    index += 1
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    if (row.some((value) => value.length > 0)) {
      rows.push(row)
    }
  }

  return rows
}

function parseReplayCsv(input: string) {
  const rows = parseCsvRows(input)
  if (rows.length < 2) {
    throw new Error("The uploaded file is not a valid replay CSV export.")
  }

  const [header, ...dataRows] = rows
  if (!header || header.length < 3) {
    throw new Error("The uploaded CSV is missing the replay export columns.")
  }

  const sectionIndex = header.findIndex((value) => value === "Section")
  const payloadIndex = header.findIndex((value) => value === "PayloadJson")
  const recordIndex = header.findIndex((value) => value === "Index")

  if (sectionIndex < 0 || payloadIndex < 0) {
    throw new Error("The uploaded CSV is missing the replay export columns.")
  }

  const buckets = new Map<string, Array<{ index: number | null; payload: unknown }>>()

  for (const row of dataRows) {
    const section = row[sectionIndex]?.trim()
    const payloadText = row[payloadIndex]

    if (!section || typeof payloadText !== "string" || payloadText.trim().length === 0) {
      continue
    }

    let payload: unknown
    try {
      payload = JSON.parse(payloadText)
    } catch {
      throw new Error(`The replay CSV contains invalid JSON payload data in section '${section}'.`)
    }

    const indexValue = recordIndex >= 0 ? row[recordIndex] : undefined
    const parsedIndex =
      typeof indexValue === "string" && indexValue.trim().length > 0 ? Number(indexValue) : null

    const entries = buckets.get(section) ?? []
    entries.push({
      index: Number.isFinite(parsedIndex) ? parsedIndex : null,
      payload,
    })
    buckets.set(section, entries)
  }

  const getSingle = (section: string) => {
    const item = buckets.get(section)?.[0]?.payload
    if (item === undefined) {
      throw new Error(`The replay CSV is missing the '${section}' section.`)
    }

    return item
  }

  const getMany = (section: string) =>
    [...(buckets.get(section) ?? [])]
      .sort((left, right) => (left.index ?? Number.MAX_SAFE_INTEGER) - (right.index ?? Number.MAX_SAFE_INTEGER))
      .map((item) => item.payload)

  return {
    metadata: getSingle("metadata"),
    statistics: getSingle("statistics"),
    initialSnapshot: getSingle("initialSnapshot"),
    finalSnapshot: getSingle("finalSnapshot"),
    lifecycleEvents: getMany("lifecycleEvent"),
    gazeSamples: getMany("gazeSample"),
    readingSessionStates: getMany("readingSessionState"),
    participantViewportEvents: getMany("participantViewportEvent"),
    readingFocusEvents: getMany("readingFocusEvent"),
    decisionProposalEvents: getMany("decisionProposalEvent"),
    interventionEvents: getMany("interventionEvent"),
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function copyIntervention(
  intervention: InterventionEventSnapshot | null | undefined
): InterventionEventSnapshot | null {
  if (!intervention) {
    return null
  }

  return {
    ...intervention,
    appliedPresentation: { ...intervention.appliedPresentation },
    appliedAppearance: { ...intervention.appliedAppearance },
    parameters: cloneInterventionParameters(intervention.parameters),
  }
}

function copyViewport(
  viewport: ParticipantViewportSnapshot | null | undefined
): ParticipantViewportSnapshot | null {
  if (!viewport) {
    return null
  }

  return { ...viewport }
}

function copyFocus(focus: ReadingFocusSnapshot | null | undefined): ReadingFocusSnapshot | null {
  if (!focus) {
    return null
  }

  return { ...focus }
}

function copyAttentionSummary(
  summary: ReadingAttentionSummarySnapshot | null | undefined
): ReadingAttentionSummarySnapshot | null {
  if (!summary) {
    return null
  }

  return {
    ...summary,
    tokenStats: Object.fromEntries(
      Object.entries(summary.tokenStats).map(([tokenId, stats]) => [tokenId, { ...stats }])
    ),
  }
}

function copyReadingSession(
  session: LiveReadingSessionSnapshot | null | undefined
): LiveReadingSessionSnapshot | null {
  if (!session) {
    return null
  }

  return {
    ...session,
    content: session.content ? { ...session.content } : null,
    presentation: { ...session.presentation },
    appearance: { ...session.appearance },
    participantViewport: { ...session.participantViewport },
    focus: { ...session.focus },
    latestIntervention: copyIntervention(session.latestIntervention),
    recentInterventions: session.recentInterventions.map((item) => ({
      ...item,
      appliedPresentation: { ...item.appliedPresentation },
      appliedAppearance: { ...item.appliedAppearance },
      parameters: cloneInterventionParameters(item.parameters),
    })),
    attentionSummary: copyAttentionSummary(session.attentionSummary),
  }
}

function copyDecisionProposal(
  proposal: DecisionProposalSnapshot | null | undefined
): DecisionProposalSnapshot | null {
  if (!proposal) {
    return null
  }

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

function copyDecisionConfiguration(
  configuration: DecisionConfiguration
): DecisionConfiguration {
  return { ...configuration }
}

function copyDecisionState(state: DecisionState): DecisionState {
  return {
    ...state,
    activeProposal: copyDecisionProposal(state.activeProposal),
    recentProposalHistory: state.recentProposalHistory.map((proposal) => copyDecisionProposal(proposal)!),
  }
}

function copySessionSnapshot(snapshot: ReplaySessionSnapshot): ReplaySessionSnapshot {
  return {
    ...snapshot,
    participant: snapshot.participant ? { ...snapshot.participant } : null,
    eyeTrackerDevice: snapshot.eyeTrackerDevice ? { ...snapshot.eyeTrackerDevice } : null,
    latestGazeSample: snapshot.latestGazeSample ? { ...snapshot.latestGazeSample } : null,
    readingSession: copyReadingSession(snapshot.readingSession),
    decisionConfiguration: copyDecisionConfiguration(snapshot.decisionConfiguration),
    decisionState: copyDecisionState(snapshot.decisionState),
  }
}

function resolveRecordTimeMs(
  startedAtUnixMs: number,
  elapsedSinceStartMs: number | null | undefined,
  absoluteUnixMs: number | null | undefined
) {
  if (typeof elapsedSinceStartMs === "number" && Number.isFinite(elapsedSinceStartMs)) {
    return Math.max(0, elapsedSinceStartMs)
  }

  if (typeof absoluteUnixMs === "number" && Number.isFinite(absoluteUnixMs) && startedAtUnixMs > 0) {
    return Math.max(0, absoluteUnixMs - startedAtUnixMs)
  }

  return 0
}

function findLatestIndexAtOrBefore<T>(
  records: readonly T[],
  targetTimeMs: number,
  getTimeMs: (record: T) => number
) {
  let low = 0
  let high = records.length - 1
  let answer = -1

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const timeMs = getTimeMs(records[mid]!)

    if (timeMs <= targetTimeMs) {
      answer = mid
      low = mid + 1
      continue
    }

    high = mid - 1
  }

  return answer
}

function normalizeStateTitle(reason: string) {
  switch (reason) {
    case "reading-session-configured":
      return "Reading material prepared"
    case "intervention-applied":
      return "Presentation updated"
    case "session-started":
      return "Playback baseline"
    default:
      return reason
        .split("-")
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" ")
  }
}

export function parseExperimentReplayExport(input: string | unknown): ExperimentReplayExport {
  let parsedInput = input

  if (typeof input === "string") {
    const trimmed = input.trim()
    if (trimmed.startsWith("{")) {
      try {
        parsedInput = JSON.parse(trimmed)
      } catch {
        throw new Error("The uploaded file is not valid JSON.")
      }
    } else {
      parsedInput = parseReplayCsv(input)
    }
  }

  const result = experimentReplayExportSchema.safeParse(parsedInput)
  if (!result.success) {
    throw new Error(getErrorMessage(result.error))
  }

  if (result.data.metadata.format !== "reading-the-reader.experiment-replay") {
    throw new Error("Unsupported export format. Upload a replay JSON or CSV exported from this application.")
  }

  return result.data
}

export function resolveReplayDurationMs(replay: ExperimentReplayExport) {
  if (typeof replay.metadata.durationMs === "number" && Number.isFinite(replay.metadata.durationMs)) {
    return Math.max(0, replay.metadata.durationMs)
  }

  if (
    replay.metadata.startedAtUnixMs > 0 &&
    typeof replay.metadata.endedAtUnixMs === "number" &&
    Number.isFinite(replay.metadata.endedAtUnixMs)
  ) {
    return Math.max(0, replay.metadata.endedAtUnixMs - replay.metadata.startedAtUnixMs)
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
  const currentTimeMs = clamp(requestedTimeMs, 0, durationMs)
  const startedAtUnixMs = replay.metadata.startedAtUnixMs

  const gazeIndex = findLatestIndexAtOrBefore(replay.gazeSamples, currentTimeMs, (record) =>
    resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.capturedAtUnixMs)
  )
  const viewportIndex = findLatestIndexAtOrBefore(replay.participantViewportEvents, currentTimeMs, (record) =>
    resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs)
  )
  const focusIndex = findLatestIndexAtOrBefore(replay.readingFocusEvents, currentTimeMs, (record) =>
    resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs)
  )
  const stateIndex = findLatestIndexAtOrBefore(replay.readingSessionStates, currentTimeMs, (record) =>
    resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs)
  )
  const decisionProposalIndex = findLatestIndexAtOrBefore(replay.decisionProposalEvents, currentTimeMs, (record) =>
    resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs)
  )
  const interventionIndex = findLatestIndexAtOrBefore(replay.interventionEvents, currentTimeMs, (record) =>
    resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs)
  )
  const lifecycleIndex = findLatestIndexAtOrBefore(replay.lifecycleEvents, currentTimeMs, (record) =>
    resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs)
  )

  const gazeRecord = gazeIndex >= 0 ? replay.gazeSamples[gazeIndex]! : null
  const viewportRecord = viewportIndex >= 0 ? replay.participantViewportEvents[viewportIndex]! : null
  const focusRecord = focusIndex >= 0 ? replay.readingFocusEvents[focusIndex]! : null
  const readingSessionStateRecord = stateIndex >= 0 ? replay.readingSessionStates[stateIndex]! : null
  const decisionProposalRecord = decisionProposalIndex >= 0 ? replay.decisionProposalEvents[decisionProposalIndex]! : null
  const interventionRecord = interventionIndex >= 0 ? replay.interventionEvents[interventionIndex]! : null
  const lifecycleRecord = lifecycleIndex >= 0 ? replay.lifecycleEvents[lifecycleIndex]! : null

  const snapshot = copySessionSnapshot(replay.initialSnapshot)
  const baseReadingSession =
    copyReadingSession(readingSessionStateRecord?.session ?? snapshot.readingSession ?? replay.finalSnapshot.readingSession) ??
    null

  if (baseReadingSession && viewportRecord) {
    baseReadingSession.participantViewport = copyViewport(viewportRecord.viewport) ?? baseReadingSession.participantViewport
  }

  if (baseReadingSession && focusRecord) {
    baseReadingSession.focus = copyFocus(focusRecord.focus) ?? baseReadingSession.focus
  }

  if (baseReadingSession && interventionRecord) {
    baseReadingSession.latestIntervention = copyIntervention(interventionRecord.intervention)
    baseReadingSession.presentation = { ...interventionRecord.intervention.appliedPresentation }
    baseReadingSession.appearance = { ...interventionRecord.intervention.appliedAppearance }
  }

  snapshot.readingSession = baseReadingSession
  snapshot.receivedGazeSamples = gazeIndex >= 0 ? gazeIndex + 1 : 0
  snapshot.latestGazeSample = gazeRecord ? { ...gazeRecord.sample } : null
  snapshot.isActive = currentTimeMs < durationMs
  snapshot.stoppedAtUnixMs = currentTimeMs >= durationMs ? replay.finalSnapshot.stoppedAtUnixMs : null
  if (decisionProposalRecord) {
    snapshot.decisionState = {
      ...snapshot.decisionState,
      activeProposal:
        decisionProposalRecord.proposal.status === "pending"
          ? copyDecisionProposal(decisionProposalRecord.proposal)
          : snapshot.decisionState.activeProposal?.proposalId === decisionProposalRecord.proposal.proposalId
            ? null
            : snapshot.decisionState.activeProposal,
      recentProposalHistory: [
        copyDecisionProposal(decisionProposalRecord.proposal)!,
        ...snapshot.decisionState.recentProposalHistory.filter(
          (proposal) => proposal.proposalId !== decisionProposalRecord.proposal.proposalId
        ),
      ].slice(0, 25),
    }
  }

  return {
    currentTimeMs,
    durationMs,
    progress: durationMs <= 0 ? 0 : currentTimeMs / durationMs,
    session: snapshot,
    gazeRecord,
    viewportRecord,
    focusRecord,
    readingSessionStateRecord,
    decisionProposalRecord,
    interventionRecord,
    lifecycleRecord,
  }
}

export function buildReplayKeyEvents(replay: ExperimentReplayExport): ReplayKeyEvent[] {
  const startedAtUnixMs = replay.metadata.startedAtUnixMs
  const events: ReplayKeyEvent[] = []

  for (const record of replay.readingSessionStates) {
    if (record.reason === "session-started") {
      continue
    }

    events.push({
      id: `state-${record.sequenceNumber}`,
      kind: "state",
      timeMs: resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs),
      title: normalizeStateTitle(record.reason),
      detail: record.session.content?.title ?? "Reading session",
    })
  }

  for (const record of replay.interventionEvents) {
    events.push({
      id: `intervention-${record.sequenceNumber}`,
      kind: "intervention",
      timeMs: resolveRecordTimeMs(startedAtUnixMs, record.elapsedSinceStartMs, record.occurredAtUnixMs),
      title: "Intervention applied",
      detail: record.intervention.reason,
    })
  }

  for (const record of replay.decisionProposalEvents) {
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
