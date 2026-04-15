"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { LiveReadingSessionSnapshot, ReadingContentSnapshot } from "@/lib/experiment-session"
import { ReaderShell } from "@/modules/pages/reading/components/ReaderShell"
import type { ReadingPresentationSettings } from "@/modules/pages/reading/lib/readingPresentation"
import type { ReplayReaderOptions } from "@/modules/pages/replay/types"

type ReplayReaderColumnProps = {
  errorMessage: string | null
  content: ReadingContentSnapshot
  presentation: ReadingPresentationSettings
  readingSession: LiveReadingSessionSnapshot
  readerOptions: ReplayReaderOptions
}

export function ReplayReaderColumn({
  errorMessage,
  content,
  presentation,
  readingSession,
  readerOptions,
}: ReplayReaderColumnProps) {
  return (
    <div className="order-1 min-h-0 min-w-0 overflow-hidden xl:order-2">
      {errorMessage ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Replay import warning</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="h-full overflow-hidden rounded-xl border bg-card shadow-sm">
        <ReaderShell
          key={content.documentId}
          docId={content.documentId}
          markdown={content.markdown}
          presentation={presentation}
          experimentSetupName={content.title}
          preserveContextOnIntervention={readerOptions.preserveContextOnIntervention}
          highlightContext={readerOptions.highlightContext}
          displayGazePosition={false}
          enableLiveGazeTracking={false}
          highlightTokensBeingLookedAt={false}
          highlightRemoteTokensBeingLookedAt={readerOptions.highlightTokensBeingLookedAt}
          showToolbar={readerOptions.showToolbar}
          showBackButton={readerOptions.showBackButton}
          showLixScores={readerOptions.showLixScores}
          viewportActivePageIndex={readingSession.participantViewport.activePageIndex}
          viewportPageCount={readingSession.participantViewport.pageCount}
          remoteFocus={{
            isInsideReadingArea: readingSession.focus.isInsideReadingArea,
            normalizedContentX: readingSession.focus.normalizedContentX,
            normalizedContentY: readingSession.focus.normalizedContentY,
            activeTokenId: readingSession.focus.activeTokenId,
            activeSentenceId: readingSession.focus.activeSentenceId,
          }}
          showRemoteFocusMarker={readerOptions.displayGazePosition}
          embedded
          interventionAppliedAtUnixMs={readingSession.latestIntervention?.appliedAtUnixMs ?? null}
          interventionAppliedBoundary={readingSession.latestIntervention?.appliedBoundary ?? null}
          interventionWaitDurationMs={readingSession.latestIntervention?.waitDurationMs ?? null}
          initialPresentation={readingSession.initialPresentation ?? null}
          interventionEvents={readingSession.recentInterventions}
          frameClassName="mx-auto rounded-none border-0 shadow-none"
          frameStyle={{
            width: "100%",
            maxWidth: "980px",
          }}
        />
      </div>
    </div>
  )
}
