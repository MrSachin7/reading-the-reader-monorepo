"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { useReaderAppearanceSync } from "@/hooks/use-reader-appearance-sync"
import { ExperimentCompletionActions } from "@/components/experiment/experiment-completion-actions"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  applyInterventionCommand,
  approveDecisionProposal,
  rejectDecisionProposal,
  subscribeToGaze,
} from "@/lib/gaze-socket"
import {
  FALLBACK_INTERVENTION_MODULES,
  type InterventionParameterValues,
} from "@/lib/intervention-modules"
import { EMPTY_READING_ATTENTION_SUMMARY } from "@/lib/reading-attention-summary"
import { normalizeReaderAppearance, type ReaderAppearanceSettings } from "@/lib/reader-appearance"
import { READER_SHELL_SETTINGS_DEFAULTS } from "@/lib/reader-shell-settings"
import {
  buildExperimentItemReadingSessionPayload,
  getExperimentSequencePositionFromSession,
} from "@/lib/experiment-sequence"
import { useLiveExperimentSession } from "@/lib/use-live-experiment-session"
import type { ReadingInterventionCommitBoundary } from "@/lib/experiment-session"
import { useRequiredFullscreen } from "@/hooks/use-required-fullscreen"
import { calculateGazePoint } from "@/modules/pages/gaze/lib/gaze-helpers"
import { useGazeConnectionStats } from "@/modules/pages/gaze/lib/use-live-gaze-stream"
import { parseMinimalMarkdown } from "@/modules/pages/reading/lib/minimalMarkdown"
import { toSaccadeOverlaySegments } from "@/modules/pages/reading/components/SaccadePathOverlay"
import type { RemoteTokenAttentionSnapshot } from "@/modules/pages/reading/lib/useRemoteTokenAttentionHeatmap"
import {
  DEFAULT_READING_PRESENTATION,
  normalizeReadingPresentation,
} from "@/modules/pages/reading/lib/readingPresentation"
import { tokenizeDocument } from "@/modules/pages/reading/lib/tokenize"
import { LiveControlsColumn } from "@/modules/pages/researcher/current-live/components/LiveControlsColumn"
import { LiveInterventionsColumn } from "@/modules/pages/researcher/current-live/components/LiveInterventionsColumn"
import { LiveReaderColumn } from "@/modules/pages/researcher/current-live/components/LiveReaderColumn"
import { LiveReaderControlsSheet } from "@/modules/pages/researcher/current-live/components/LiveReaderControlsSheet"
import type {
  ActiveLiveExperimentSession,
  LiveMirrorTrustState,
  LiveReaderOptions,
} from "@/modules/pages/researcher/current-live/types"
import { getLiveMirrorTrustState } from "@/modules/pages/researcher/current-live/utils"
import {
  useApplyPendingInterventionNowMutation,
  useGetInterventionModulesQuery,
  useGetReaderShellSettingsQuery,
  useUpsertReadingSessionMutation,
  useUpdateInterventionPolicyMutation,
} from "@/redux"
import { getErrorMessage } from "@/lib/error-utils"

function EmptyState({
  title,
  description,
  session,
}: {
  title: string
  description: string
  session?: ReturnType<typeof useLiveExperimentSession>
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-2xl rounded-[1.8rem] border-dashed bg-card/96 shadow-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="leading-7">{description}</CardDescription>
          {session ? (
            <div className="max-w-xl pt-4">
              <ExperimentCompletionActions
                session={session}
                source="researcher-live-view"
                layout="stacked"
              />
            </div>
          ) : null}
        </CardHeader>
      </Card>
    </main>
  )
}

export default function ResearcherCurrentLivePage() {
  const session = useLiveExperimentSession()
  const hasActiveGazeSource = Boolean(
    session?.isActive &&
      (session.sensingMode === "mouse" || session.sensingMode === "webcam" || session.eyeTrackerDevice)
  )
  const liveGaze = useGazeConnectionStats({ enabled: hasActiveGazeSource })
  const [validityRate, setValidityRate] = useState(0)

  useEffect(() => {
    if (!hasActiveGazeSource) {
      return
    }

    let totalSamples = 0
    let validSamples = 0

    const unsubscribe = subscribeToGaze((sample) => {
      totalSamples += 1
      if (calculateGazePoint(sample)) {
        validSamples += 1
      }
    })

    const timer = window.setInterval(() => {
      setValidityRate(totalSamples === 0 ? 0 : validSamples / totalSamples)
      totalSamples = 0
      validSamples = 0
    }, 1000)

    return () => {
      unsubscribe()
      window.clearInterval(timer)
    }
  }, [hasActiveGazeSource])

  const displayedValidityRate = hasActiveGazeSource ? validityRate : 0

  if (!session) {
    return (
      <EmptyState
        title="Connecting to live session"
        description="Waiting for the current experiment session to become available."
      />
    )
  }

  const isCompleted = Boolean(session.stoppedAtUnixMs)

  if (!session.isActive) {
    return (
      <main className="min-h-screen bg-background px-4 py-10 md:px-8">
        <div className="mx-auto max-w-3xl">
            <Card>
              <CardHeader>
                <CardTitle>{isCompleted ? "Session complete" : "No ongoing experiment"}</CardTitle>
                <CardDescription>
                  {isCompleted
                    ? "Export or save the session."
                    : "Start the participant reading session from the experiment setup flow before opening the researcher live view."}
                </CardDescription>
                <ExperimentCompletionActions
                session={session}
                source="researcher-live-view"
                className="pt-4"
              />
            </CardHeader>
          </Card>
        </div>
      </main>
    )
  }

  if (!session.readingSession?.content) {
    return (
      <EmptyState
        title="Waiting for reading material"
        description="The session is active, but the reading material has not been registered yet."
      />
    )
  }

  return (
    <ResearcherCurrentLiveBody
      key={session.readingSession.content.documentId}
      session={session as ActiveLiveExperimentSession}
      sampleRateHz={liveGaze.sampleRateHz}
      latencyMs={liveGaze.connectionStats?.lastRttMs ?? null}
      validityRate={displayedValidityRate}
    />
  )
}

type ResearcherCurrentLiveBodyProps = {
  session: ActiveLiveExperimentSession
  sampleRateHz: number
  latencyMs: number | null
  validityRate: number
}

function ResearcherCurrentLiveBody({
  session,
  sampleRateHz,
  latencyMs,
  validityRate,
}: ResearcherCurrentLiveBodyProps) {
  const { data: readerShellSettings } = useGetReaderShellSettingsQuery()
  const { data: interventionModules = [] } = useGetInterventionModulesQuery()
  const [updateInterventionPolicy] = useUpdateInterventionPolicyMutation()
  const [applyPendingInterventionNow] = useApplyPendingInterventionNowMutation()
  const [upsertReadingSession, { isLoading: isAdvancingExperimentText }] =
    useUpsertReadingSessionMutation()
  const effectiveInterventionModules =
    interventionModules.length > 0 ? interventionModules : FALLBACK_INTERVENTION_MODULES
  const readingSession = session.readingSession
  const content = readingSession.content!
  const [experimentSequenceError, setExperimentSequenceError] = useState<string | null>(null)
  const [tokenAttention, setTokenAttention] = useState<RemoteTokenAttentionSnapshot>(
    readingSession.attentionSummary ?? EMPTY_READING_ATTENTION_SUMMARY
  )
  const remoteAttentionSummary = readingSession.attentionSummary
  // Heatmap stats come from the authoritative summary (which may lag by the
  // external analyzer's window), but the current token must stay live and
  // never wait on the external provider, so it comes from the locally derived
  // focus tracker. Depend only on the live token id (which changes per word),
  // never on the local tracker's 100ms tick, so the merged object's identity
  // stays stable between word changes and downstream consumers do not re-run
  // per-tick (which previously inflated the live connection RTT).
  const liveCurrentTokenId = tokenAttention.currentTokenId
  const hasLocalFocusTracker = tokenAttention.updatedAtUnixMs > 0
  const effectiveTokenAttention = useMemo(() => {
    if (!remoteAttentionSummary) {
      return tokenAttention
    }

    if (!hasLocalFocusTracker || remoteAttentionSummary.currentTokenId === liveCurrentTokenId) {
      return remoteAttentionSummary
    }

    return {
      ...remoteAttentionSummary,
      currentTokenId: liveCurrentTokenId,
    }
  }, [remoteAttentionSummary, hasLocalFocusTracker, liveCurrentTokenId, tokenAttention])
  const [followParticipant, setFollowParticipant] = useState(true)
  const persistedReaderOptions =
    readerShellSettings?.researcherMirror ?? READER_SHELL_SETTINGS_DEFAULTS.researcherMirror
  const [localReaderOptions, setLocalReaderOptions] = useState<LiveReaderOptions | null>(null)
  const [isReaderControlsOpen, setIsReaderControlsOpen] = useState(false)
  const fullscreen = useRequiredFullscreen({ autoRequest: true })
  const readerOptions = localReaderOptions ?? persistedReaderOptions
  const readerAppearance = normalizeReaderAppearance(readingSession.appearance)

  useReaderAppearanceSync(readerAppearance)

  const presentation = normalizeReadingPresentation({
    fontFamily: readingSession.presentation.fontFamily,
    fontSizePx: readingSession.presentation.fontSizePx,
    lineWidthPx: readingSession.presentation.lineWidthPx,
    lineHeight: readingSession.presentation.lineHeight,
    letterSpacingEm: readingSession.presentation.letterSpacingEm,
    editableByExperimenter: readingSession.presentation.editableByResearcher,
  })

  // `recentSaccades` is a fresh array on every eyeMovementAnalysisChanged
  // broadcast (which fires per reading-gaze observation — many times/sec), even
  // when no new saccade actually completed. Keying the memo on the analysis
  // object identity therefore gave the overlay segments a new identity on every
  // broadcast, forcing SaccadePathOverlay to re-measure (dozens of
  // getBoundingClientRect reflows) far more often than saccades change — which
  // is what spikes latency once the reading-dynamics overlay is enabled. Key the
  // memo to a stable signature of the newest saccade + count so the segment
  // array identity only changes when a saccade actually arrives.
  const recentSaccades = session.eyeMovementAnalysis?.recentSaccades
  const newestSaccade = recentSaccades?.[0]
  const saccadeSignature = newestSaccade
    ? `${recentSaccades!.length}|${newestSaccade.fromTokenId}->${newestSaccade.toTokenId}@${newestSaccade.endedAtUnixMs}`
    : "none"
  const saccadeSegments = useMemo(
    () => toSaccadeOverlaySegments(recentSaccades ?? []),
    // Intentionally keyed on the stable signature rather than the array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [saccadeSignature]
  )

  // Struggle labels are only meaningful while the external eye analyzer service
  // is the selected provider and actually connected.
  const externalAnalysisActive =
    session.eyeMovementAnalysisConfiguration?.providerId === "external" &&
    Boolean(session.eyeMovementAnalysisProviderStatus?.isConnected)

  const parsedDoc = useMemo(() => parseMinimalMarkdown(content.markdown), [content.markdown])
  const tokenizedBlocks = useMemo(
    () => tokenizeDocument(parsedDoc, content.documentId),
    [content.documentId, parsedDoc]
  )
  const tokenTextLookup = useMemo(() => {
    const entries = new Map<string, string>()

    for (const block of tokenizedBlocks) {
      if ("runs" in block) {
        for (const run of block.runs) {
          for (const token of run.tokens) {
            if (token.kind === "word") {
              entries.set(token.id, token.text)
            }
          }
        }
      }

      if ("items" in block) {
        for (const item of block.items) {
          for (const run of item.runs) {
            for (const token of run.tokens) {
              if (token.kind === "word") {
                entries.set(token.id, token.text)
              }
            }
          }
        }
      }
    }

    return entries
  }, [tokenizedBlocks])

  const activeWord =
    readingSession.focus.activeTokenId && tokenTextLookup.has(readingSession.focus.activeTokenId)
      ? tokenTextLookup.get(readingSession.focus.activeTokenId) ?? null
      : readingSession.focus.activeTokenId
  const experimentSequencePosition = useMemo(
    () =>
      getExperimentSequencePositionFromSession(
        readingSession.experimentItems,
        readingSession.currentExperimentItemIndex,
        content
      ),
    [content, readingSession.currentExperimentItemIndex, readingSession.experimentItems]
  )
  const currentExperimentTextIndex = experimentSequencePosition?.currentIndex ?? null

  const setReaderOption = useCallback((key: keyof LiveReaderOptions, value: boolean) => {
    setLocalReaderOptions((previous) => ({
      ...(previous ?? persistedReaderOptions),
      [key]: value,
    }))
  }, [persistedReaderOptions])

  const commitIntervention = useCallback((
    next: {
      moduleId: string
      parameters: InterventionParameterValues
      presentation?: Partial<typeof DEFAULT_READING_PRESENTATION>
      appearance?: Partial<ReaderAppearanceSettings>
    },
    reason: string
  ) => {
    applyInterventionCommand({
      source: "manual",
      trigger: "researcher-ui",
      reason,
      moduleId: next.moduleId,
      parameters: next.parameters,
      presentation: {
        fontFamily: next.presentation?.fontFamily ?? null,
        fontSizePx: next.presentation?.fontSizePx ?? null,
        lineWidthPx: next.presentation?.lineWidthPx ?? null,
        lineHeight: next.presentation?.lineHeight ?? null,
        letterSpacingEm: next.presentation?.letterSpacingEm ?? null,
        editableByResearcher: next.presentation?.editableByExperimenter ?? null,
      },
      appearance: {
        themeMode: next.appearance?.themeMode ?? null,
        palette: next.appearance?.palette ?? null,
        appFont: next.appearance?.appFont ?? null,
      },
    })
  }, [])

  const handleInterventionPolicyChange = useCallback(
    async (patch: {
      layoutCommitBoundary?: ReadingInterventionCommitBoundary
      layoutFallbackBoundary?: ReadingInterventionCommitBoundary
      layoutFallbackAfterMs?: number
    }) => {
      const currentPolicy = readingSession.interventionPolicy
      const commitBoundary = patch.layoutCommitBoundary ?? currentPolicy.layoutCommitBoundary
      await updateInterventionPolicy({
        layoutCommitBoundary: commitBoundary,
        layoutFallbackBoundary: patch.layoutFallbackBoundary ?? commitBoundary,
        layoutFallbackAfterMs: patch.layoutFallbackAfterMs ?? 0,
      }).unwrap()
    },
    [readingSession.interventionPolicy, updateInterventionPolicy]
  )

  const handleApplyPendingInterventionNow = useCallback(async () => {
    await applyPendingInterventionNow().unwrap()
  }, [applyPendingInterventionNow])

  const handleApproveDecisionProposal = useCallback(async (proposalId: string) => {
    approveDecisionProposal(proposalId)
  }, [])

  const handleRejectDecisionProposal = useCallback(async (proposalId: string) => {
    rejectDecisionProposal(proposalId)
  }, [])

  const handleAdvanceExperimentText = useCallback(async () => {
    setExperimentSequenceError(null)

    if (!content.experimentSetupId || !experimentSequencePosition) {
      setExperimentSequenceError("The current live session is not linked to a reusable experiment sequence.")
      return
    }

    const nextItem = experimentSequencePosition.nextItem
    if (!nextItem) {
      setExperimentSequenceError("You are already on the last text in this experiment.")
      return
    }

    try {
      await upsertReadingSession(
        buildExperimentItemReadingSessionPayload({
          item: nextItem,
          appearance: readingSession.appearance,
          experimentSetupId: content.experimentSetupId,
          experimentItems: readingSession.experimentItems,
          currentExperimentItemIndex: experimentSequencePosition.currentIndex + 1,
        })
      ).unwrap()
    } catch (error) {
      setExperimentSequenceError(getErrorMessage(error, "Could not load the next text."))
    }
  }, [
    experimentSequencePosition,
    content.experimentSetupId,
    readingSession.appearance,
    readingSession.experimentItems,
    upsertReadingSession,
  ])

  const mirrorTrustState: LiveMirrorTrustState = getLiveMirrorTrustState({
    followParticipant,
    hasParticipantViewConnection: session.liveMonitoring.hasParticipantViewConnection,
    hasParticipantViewportData: session.liveMonitoring.hasParticipantViewportData,
    isFullscreen: fullscreen.isFullscreen,
    isVisible: fullscreen.isVisible,
  })
  const exactMirrorEnabled = mirrorTrustState.kind === "exact"

  return (
    <main className="h-screen overflow-hidden bg-background px-4 py-5 md:px-8 md:py-8">
      {mirrorTrustState.kind === "approximate" ? (
        <div className="pointer-events-none fixed inset-x-4 top-4 z-30 flex justify-center md:inset-x-8">
          <div className="pointer-events-auto w-full max-w-4xl rounded-2xl border border-accent/45 bg-accent/15 px-4 py-3 shadow-lg backdrop-blur">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-accent-foreground">
                  {mirrorTrustState.headline}
                </p>
                <p className="mt-1 text-sm text-accent-foreground/85">
                  {mirrorTrustState.detail}
                </p>
              </div>
              {!fullscreen.isFullscreen ? (
                <Button onClick={() => void fullscreen.requestFullscreen()} className="shrink-0">
                  Enter full screen
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      <div className="mx-auto grid h-full w-full max-w-[1680px] min-h-0 gap-4 overflow-hidden xl:grid-cols-[18rem_minmax(0,1fr)_19rem]">
        <LiveControlsColumn
          liveMonitoring={session.liveMonitoring}
          participantName={session.participant?.name ?? null}
          sampleRateHz={sampleRateHz}
          validityRate={validityRate}
          latencyMs={latencyMs}
          struggleSignals={session.eyeMovementAnalysis?.struggleSignals ?? null}
          externalAnalysisActive={externalAnalysisActive}
        />

        <LiveReaderColumn
          content={content}
          presentation={presentation}
          readingSession={readingSession}
          followParticipant={followParticipant}
          readerOptions={readerOptions}
          exactMirrorEnabled={exactMirrorEnabled}
          mirrorTrustState={mirrorTrustState}
          showReadingDynamics={readerOptions.showFixationHeatmap}
          tokenAttention={effectiveTokenAttention}
          saccades={saccadeSegments}
          onTokenAttentionChange={setTokenAttention}
          participantName={session.participant?.name ?? null}
        />

        <LiveInterventionsColumn
          session={session}
          interventionModules={effectiveInterventionModules}
          appearance={readerAppearance}
          presentation={presentation}
          interventionPolicy={readingSession.interventionPolicy}
          pendingIntervention={readingSession.pendingIntervention}
          activeProposal={session.decisionState.activeProposal}
          onCommitIntervention={commitIntervention}
          onInterventionPolicyChange={handleInterventionPolicyChange}
          onApproveDecisionProposal={handleApproveDecisionProposal}
          onRejectDecisionProposal={handleRejectDecisionProposal}
          onApplyPendingInterventionNow={handleApplyPendingInterventionNow}
        />
      </div>
      <LiveReaderControlsSheet
        open={isReaderControlsOpen}
        onOpenChange={setIsReaderControlsOpen}
        readerOptions={readerOptions}
        onReaderOptionChange={setReaderOption}
      />
    </main>
  )
}
