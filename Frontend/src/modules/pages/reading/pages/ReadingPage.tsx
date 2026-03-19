"use client"

import { useCallback, useEffect } from "react"

import { ExperimentCompletionActions } from "@/components/experiment/experiment-completion-actions"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  registerParticipantView,
  unregisterParticipantView,
  updateParticipantViewport,
  updateReadingFocus,
} from "@/lib/gaze-socket"
import {
  READER_SHELL_SETTINGS_DEFAULTS,
  getReaderShellViewSettings,
} from "@/lib/reader-shell-settings"
import { useLiveExperimentSession } from "@/lib/use-live-experiment-session"
import { useLiveGazeStream } from "@/modules/pages/gaze/lib/use-live-gaze-stream"
import { ReaderShell, type ReaderViewportMetrics } from "@/modules/pages/reading/components/ReaderShell"
import { MOCK_READING_MD } from "@/modules/pages/reading/content/mockReading"
import { normalizeReadingPresentation } from "@/modules/pages/reading/lib/readingPresentation"
import type { GazeFocusState } from "@/modules/pages/reading/lib/useGazeTokenHighlight"
import { useAppSelector, useGetReaderShellSettingsQuery } from "@/redux"

const MOCK_DOC_ID = "mock-reading-v1"

export function ReadingPage() {
  const liveSession = useLiveExperimentSession()
  const liveGaze = useLiveGazeStream()
  const draftReadingSession = useAppSelector((state) => state.experiment.readingSession)
  const { data: readerShellSettings } = useGetReaderShellSettingsQuery()
  const readerOptions = getReaderShellViewSettings(
    readerShellSettings ?? READER_SHELL_SETTINGS_DEFAULTS,
    "reading"
  )

  useEffect(() => {
    registerParticipantView()

    return () => {
      unregisterParticipantView()
    }
  }, [])

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
    })
  }, [])

  const liveReadingSession = liveSession?.readingSession
  const markdown =
    liveReadingSession?.content?.markdown ??
    (draftReadingSession.source === "custom" && draftReadingSession.customMarkdown.trim().length > 0
      ? draftReadingSession.customMarkdown
      : MOCK_READING_MD)
  const docId = liveReadingSession?.content?.documentId ?? MOCK_DOC_ID
  const title =
    liveReadingSession?.content?.title ??
    (draftReadingSession.title.trim().length > 0
      ? draftReadingSession.title.trim()
      : "Reading as Deliberate Attention")
  const presentation = normalizeReadingPresentation({
    fontFamily: liveReadingSession?.presentation.fontFamily,
    fontSizePx: liveReadingSession?.presentation.fontSizePx,
    lineWidthPx: liveReadingSession?.presentation.lineWidthPx,
    lineHeight: liveReadingSession?.presentation.lineHeight,
    letterSpacingEm: liveReadingSession?.presentation.letterSpacingEm,
    editableByExperimenter: liveReadingSession?.presentation.editableByResearcher,
  })

  if (!liveSession?.isActive) {
    const isCompleted = Boolean(liveSession?.stoppedAtUnixMs)

    return (
      <main className="min-h-screen bg-background px-4 py-10 md:px-8">
        <div className="mx-auto max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>{isCompleted ? "Experiment completed" : "No active experiment"}</CardTitle>
              <CardDescription>
                {isCompleted
                  ? "The experiment has been finished. Download the replay-ready JSON export below."
                  : "Start the reading session from the experiment setup flow before opening the participant view."}
              </CardDescription>
              <ExperimentCompletionActions
                session={liveSession ?? null}
                source="participant-view"
                className="pt-4"
              />
            </CardHeader>
          </Card>
        </div>
      </main>
    )
  }

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
        docId={docId}
        markdown={markdown}
        presentation={presentation}
        experimentSetupName={title}
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
      />
    </div>
  )
}
