"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useReaderAppearanceSync } from "@/hooks/use-reader-appearance-sync"
import { ExperimentCompletionActions } from "@/components/experiment/experiment-completion-actions"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  applyInterventionCommand,
  approveDecisionProposal,
  pauseDecisionAutomation,
  rejectDecisionProposal,
  resumeDecisionAutomation,
  setDecisionExecutionMode,
  subscribeToGaze,
  updateReadingAttentionSummary,
} from "@/lib/gaze-socket"
import {
  FALLBACK_INTERVENTION_MODULES,
  type InterventionParameterValues,
} from "@/lib/intervention-modules"
import { EMPTY_READING_ATTENTION_SUMMARY } from "@/lib/reading-attention-summary"
import { normalizeReaderAppearance, type ReaderAppearanceSettings } from "@/lib/reader-appearance"
import { READER_SHELL_SETTINGS_DEFAULTS } from "@/lib/reader-shell-settings"
import { useLiveExperimentSession } from "@/lib/use-live-experiment-session"
import { useRequiredFullscreen } from "@/hooks/use-required-fullscreen"
import { calculateGazePoint } from "@/modules/pages/gaze/lib/gaze-helpers"
import { useLiveGazeStream } from "@/modules/pages/gaze/lib/use-live-gaze-stream"
import { parseMinimalMarkdown } from "@/modules/pages/reading/lib/minimalMarkdown"
import { calculateLix } from "@/modules/pages/reading/lib/readingMetrics"
import type { RemoteTokenAttentionSnapshot } from "@/modules/pages/reading/lib/useRemoteTokenAttentionHeatmap"
import {
  DEFAULT_READING_PRESENTATION,
  normalizeReadingPresentation,
} from "@/modules/pages/reading/lib/readingPresentation"
import { tokenizeDocument } from "@/modules/pages/reading/lib/tokenize"
import { LiveControlsColumn } from "@/modules/pages/researcher/current-live/components/LiveControlsColumn"
import { LiveMetadataColumn } from "@/modules/pages/researcher/current-live/components/LiveMetadataColumn"
import { LiveReaderColumn } from "@/modules/pages/researcher/current-live/components/LiveReaderColumn"
import type {
  ActiveLiveExperimentSession,
  LiveMirrorTrustState,
  LiveReaderOptions,
} from "@/modules/pages/researcher/current-live/types"
import { getLiveMirrorTrustState } from "@/modules/pages/researcher/current-live/utils"
import { useGetInterventionModulesQuery, useGetReaderShellSettingsQuery } from "@/redux"

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
  const hasActiveEyeTracker = Boolean(session?.isActive && session?.eyeTrackerDevice)
  const liveGaze = useLiveGazeStream({ enabled: hasActiveEyeTracker })
  const [validityRate, setValidityRate] = useState(0)

  useEffect(() => {
    if (!hasActiveEyeTracker) {
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
  }, [hasActiveEyeTracker])

  const displayedValidityRate = hasActiveEyeTracker ? validityRate : 0

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
  const effectiveInterventionModules =
    interventionModules.length > 0 ? interventionModules : FALLBACK_INTERVENTION_MODULES
  const readingSession = session.readingSession
  const content = readingSession.content!
  const [tokenAttention, setTokenAttention] = useState<RemoteTokenAttentionSnapshot>(
    readingSession.attentionSummary ?? EMPTY_READING_ATTENTION_SUMMARY
  )
  const latestTokenAttentionRef = useRef<RemoteTokenAttentionSnapshot>(
    readingSession.attentionSummary ?? EMPTY_READING_ATTENTION_SUMMARY
  )
  const lastSyncedAttentionKeyRef = useRef("")
  const [followParticipant, setFollowParticipant] = useState(true)
  const persistedReaderOptions =
    readerShellSettings?.researcherMirror ?? READER_SHELL_SETTINGS_DEFAULTS.researcherMirror
  const [localReaderOptions, setLocalReaderOptions] = useState<LiveReaderOptions | null>(null)
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

  const activeBlock = tokenizedBlocks.find((block) => block.blockId === readingSession.focus.activeBlockId)
  const activeBlockLix =
    activeBlock && "lixScore" in activeBlock && typeof activeBlock.lixScore === "number"
      ? activeBlock.lixScore
      : null
  const documentLix = calculateLix(content.markdown)
  const topAttentionTokens = useMemo(() => {
    return Object.entries(tokenAttention.tokenStats)
      .filter(([, stats]) => stats.maxFixationMs > 0 || stats.skimCount > 0)
      .sort((left, right) => {
        if (right[1].maxFixationMs !== left[1].maxFixationMs) {
          return right[1].maxFixationMs - left[1].maxFixationMs
        }

        return right[1].fixationMs - left[1].fixationMs
      })
      .slice(0, 5)
      .map(([tokenId, stats]) => ({
        tokenId,
        tokenText: tokenTextLookup.get(tokenId) ?? tokenId,
        ...stats,
      }))
  }, [tokenAttention.tokenStats, tokenTextLookup])

  useEffect(() => {
    latestTokenAttentionRef.current = tokenAttention
  }, [tokenAttention])

  useEffect(() => {
    const syncTimer = window.setInterval(() => {
      const snapshot = latestTokenAttentionRef.current
      const serialized = JSON.stringify(snapshot)
      if (serialized === lastSyncedAttentionKeyRef.current) {
        return
      }

      updateReadingAttentionSummary(snapshot)
      lastSyncedAttentionKeyRef.current = serialized
    }, 750)

    return () => {
      window.clearInterval(syncTimer)
    }
  }, [])

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

  const participantViewport = readingSession.participantViewport
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
          <div className="pointer-events-auto w-full max-w-4xl rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 shadow-lg backdrop-blur">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                  {mirrorTrustState.headline}
                </p>
                <p className="mt-1 text-sm text-amber-900/85 dark:text-amber-100/85">
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
          interventionModules={effectiveInterventionModules}
          followParticipant={followParticipant}
          liveMonitoring={session.liveMonitoring}
          mirrorTrustState={mirrorTrustState}
          layoutGuardrail={readingSession.latestLayoutGuardrail}
          decisionConfiguration={session.decisionConfiguration}
          decisionState={session.decisionState}
          activeWord={activeWord}
          participantName={session.participant?.name ?? null}
          sampleRateHz={sampleRateHz}
          validityRate={validityRate}
          latencyMs={latencyMs}
          readingDynamicsEnabled={readerOptions.showFixationHeatmap}
          currentFixationDurationMs={
            readerOptions.showFixationHeatmap ? tokenAttention.currentTokenDurationMs : null
          }
          fixatedTokenCount={readerOptions.showFixationHeatmap ? tokenAttention.fixatedTokenCount : 0}
          skimmedTokenCount={readerOptions.showFixationHeatmap ? tokenAttention.skimmedTokenCount : 0}
          appearance={readerAppearance}
          presentation={presentation}
          readerOptions={readerOptions}
          onFollowParticipantChange={setFollowParticipant}
          onReaderOptionChange={setReaderOption}
          onCommitIntervention={commitIntervention}
          onApproveProposal={(proposalId) => approveDecisionProposal(proposalId)}
          onRejectProposal={(proposalId) => rejectDecisionProposal(proposalId)}
          onPauseAutomation={() => pauseDecisionAutomation()}
          onResumeAutomation={() => resumeDecisionAutomation()}
          onExecutionModeChange={(executionMode) => setDecisionExecutionMode(executionMode)}
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
          tokenAttention={tokenAttention}
          onTokenAttentionChange={setTokenAttention}
        />

        <LiveMetadataColumn
          interventionModules={effectiveInterventionModules}
          session={session}
          readingSession={readingSession}
          liveMonitoring={session.liveMonitoring}
          mirrorTrustState={mirrorTrustState}
          decisionConfiguration={session.decisionConfiguration}
          decisionState={session.decisionState}
          activeWord={activeWord}
          activeBlockLix={activeBlockLix}
          documentLix={documentLix}
          followParticipant={followParticipant}
          topAttentionTokens={topAttentionTokens}
        />
      </div>
    </main>
  )
}
