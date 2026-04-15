"use client"

import { useCallback, useEffect } from "react"

import { useReaderAppearanceSync } from "@/hooks/use-reader-appearance-sync"
import { ExperimentCompletionActions } from "@/components/experiment/experiment-completion-actions"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRequiredFullscreen } from "@/hooks/use-required-fullscreen"
import {
  registerParticipantView,
  unregisterParticipantView,
  updateReadingGazeObservation,
  updateReadingContextPreservation,
  updateParticipantViewport,
  updateReadingFocus,
} from "@/lib/gaze-socket"
import { READER_SHELL_SETTINGS_DEFAULTS, getReaderShellViewSettings } from "@/lib/reader-shell-settings"
import { normalizeReaderAppearance } from "@/lib/reader-appearance"
import { useLiveExperimentSession } from "@/lib/use-live-experiment-session"
import { useLiveGazeStream } from "@/modules/pages/gaze/lib/use-live-gaze-stream"
import { ReaderShell, type ReaderViewportMetrics } from "@/modules/pages/reading/components/ReaderShell"
import { normalizeReadingPresentation } from "@/modules/pages/reading/lib/readingPresentation"
import type { GazeFocusState } from "@/modules/pages/reading/lib/useGazeTokenHighlight"
import type { ReadingContextPreservationSnapshot, ReadingGazeObservationSnapshot } from "@/lib/experiment-session"
import { useGetReaderShellSettingsQuery } from "@/redux"

function FullscreenGate({
  isVisible,
  requestWasRejected,
  onEnterFullscreen,
}: {
  isVisible: boolean
  requestWasRejected: boolean
  onEnterFullscreen: () => Promise<boolean>
}) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/92 px-6 backdrop-blur">
      <Card className="w-full max-w-xl rounded-[1.8rem] border bg-card/96 shadow-xl">
        <CardHeader className="space-y-4">
          <CardTitle>Please go full screen to use this feature.</CardTitle>
          <CardDescription className="leading-7">
            The researcher mirror needs a stable participant viewport. Leaving full screen or hiding
            this page will pause the exact mirrored view.
          </CardDescription>
          {!isVisible ? (
            <p className="text-sm text-amber-700">
              Bring this page back to the front, then enter full screen again.
            </p>
          ) : null}
          {requestWasRejected ? (
            <p className="text-sm text-amber-700">
              The browser blocked the full screen request. Use the button below and allow full screen.
            </p>
          ) : null}
          <div className="pt-2">
            <Button onClick={() => void onEnterFullscreen()}>Enter full screen</Button>
          </div>
        </CardHeader>
      </Card>
    </div>
  )
}

export function ReadingPage() {
  const liveSession = useLiveExperimentSession()
  const hasActiveEyeTracker = Boolean(liveSession?.isActive && liveSession?.eyeTrackerDevice)
  const liveGaze = useLiveGazeStream({ enabled: hasActiveEyeTracker })
  const { data: readerShellSettings } = useGetReaderShellSettingsQuery()
  const fullscreen = useRequiredFullscreen({ autoRequest: true })
  const readerOptions = getReaderShellViewSettings(
    readerShellSettings ?? READER_SHELL_SETTINGS_DEFAULTS,
    "reading"
  )

  useEffect(() => {
    if (!liveSession?.isActive) {
      return
    }

    registerParticipantView()

    return () => {
      unregisterParticipantView()
    }
  }, [liveSession?.isActive])

  const handleViewportMetricsChange = useCallback((metrics: ReaderViewportMetrics) => {
    updateParticipantViewport(metrics)
  }, [])

  const handleFocusChange = useCallback((focus: GazeFocusState) => {
    updateReadingFocus({
      isInsideReadingArea: focus.isInsideReadingArea,
      normalizedContentX: focus.normalizedContentX,
      normalizedContentY: focus.normalizedContentY,
      activeTokenId: focus.activeTokenId,
      activeBlockId: focus.activeBlockId,
      activeSentenceId: focus.activeSentenceId,
    })
  }, [])

  const handleContextPreservationChange = useCallback(
    (snapshot: ReadingContextPreservationSnapshot) => {
      updateReadingContextPreservation(snapshot)
    },
    []
  )

  const handleObservationChange = useCallback((observation: ReadingGazeObservationSnapshot) => {
    updateReadingGazeObservation(observation)
  }, [])

  const liveReadingSession = liveSession?.readingSession
  const liveReaderAppearance =
    liveSession?.isActive ? normalizeReaderAppearance(liveReadingSession?.appearance) : null

  useReaderAppearanceSync(liveReaderAppearance)

  if (liveSession === null) {
    return (
      <main className="min-h-screen bg-background px-4 py-10 md:px-8">
        <div className="mx-auto max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>Loading reading session</CardTitle>
              <CardDescription>
                Waiting for the authoritative experiment state before rendering the participant view.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    )
  }

  if (!liveSession.isActive) {
    const isCompleted = Boolean(liveSession.stoppedAtUnixMs)

    return (
      <main className="min-h-screen bg-background px-4 py-10 md:px-8">
        <div className="mx-auto max-w-3xl">
            <Card>
              <CardHeader>
                <CardTitle>{isCompleted ? "Session complete" : "No active experiment"}</CardTitle>
                <CardDescription>
                  {isCompleted
                    ? "Export or save the session."
                    : "Start the reading session from the experiment setup flow before opening the participant view."}
                </CardDescription>
                <ExperimentCompletionActions
                session={liveSession}
                source="participant-view"
                className="pt-4"
              />
            </CardHeader>
          </Card>
        </div>
      </main>
    )
  }

  const liveContent = liveReadingSession?.content ?? null

  if (!liveContent || liveContent.markdown.trim().length === 0) {
    return (
      <main className="min-h-screen bg-background px-4 py-10 md:px-8">
        <div className="mx-auto max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>Reading baseline unavailable</CardTitle>
              <CardDescription>
                The session is active, but the authoritative reading baseline has not been configured yet.
                Return to the experiment setup flow and save the reading baseline before opening the
                participant view.
              </CardDescription>
              <ExperimentCompletionActions
                session={liveSession}
                source="participant-view"
                className="pt-4"
              />
            </CardHeader>
          </Card>
        </div>
      </main>
    )
  }

  const presentation = normalizeReadingPresentation({
    fontFamily: liveReadingSession?.presentation.fontFamily,
    fontSizePx: liveReadingSession?.presentation.fontSizePx,
    lineWidthPx: liveReadingSession?.presentation.lineWidthPx,
    lineHeight: liveReadingSession?.presentation.lineHeight,
    letterSpacingEm: liveReadingSession?.presentation.letterSpacingEm,
    editableByExperimenter: liveReadingSession?.presentation.editableByResearcher,
  })

  return (
    <div className="relative">
      <div className="pointer-events-none fixed right-4 top-4 z-30 md:right-6 md:top-6">
        <ExperimentCompletionActions
          session={liveSession}
          source="participant-view"
          className="pointer-events-auto rounded-2xl border bg-card/95 p-3 shadow-lg backdrop-blur"
        />
      </div>
      <ReaderShell
        key={liveContent.documentId}
        docId={liveContent.documentId}
        markdown={liveContent.markdown}
        presentation={presentation}
        experimentSetupName={liveContent.title}
        preserveContextOnIntervention={readerOptions.preserveContextOnIntervention}
        highlightContext={readerOptions.highlightContext}
        displayGazePosition={readerOptions.displayGazePosition}
        highlightTokensBeingLookedAt={readerOptions.highlightTokensBeingLookedAt}
        showToolbar={readerOptions.showToolbar}
        showBackButton={readerOptions.showBackButton}
        showLixScores={readerOptions.showLixScores}
        gazeOverlayPoint={liveGaze.smoothedPoint}
        gazeOverlayHasRecentPoint={liveGaze.hasRecentGaze}
        onViewportMetricsChange={handleViewportMetricsChange}
        onFocusChange={handleFocusChange}
        onObservationChange={handleObservationChange}
        onContextPreservationChange={handleContextPreservationChange}
        interventionAppliedAtUnixMs={liveReadingSession?.latestIntervention?.appliedAtUnixMs ?? null}
        interventionAppliedBoundary={liveReadingSession?.latestIntervention?.appliedBoundary ?? null}
        interventionWaitDurationMs={liveReadingSession?.latestIntervention?.waitDurationMs ?? null}
      />
      {!fullscreen.isFullscreen || !fullscreen.isVisible ? (
        <FullscreenGate
          isVisible={fullscreen.isVisible}
          requestWasRejected={fullscreen.requestWasRejected}
          onEnterFullscreen={fullscreen.requestFullscreen}
        />
      ) : null}
    </div>
  )
}
