"use client"

import type { LiveReadingSessionSnapshot, ReadingContentSnapshot } from "@/lib/experiment-session"
import { ReaderShell } from "@/modules/pages/reading/components/ReaderShell"
import type { ReadingPresentationSettings } from "@/modules/pages/reading/lib/readingPresentation"
import type { LiveReaderOptions } from "@/modules/pages/researcher/current-live/types"

type LiveReaderColumnProps = {
  content: ReadingContentSnapshot
  presentation: ReadingPresentationSettings
  readingSession: LiveReadingSessionSnapshot
  followParticipant: boolean
  readerOptions: LiveReaderOptions
}

export function LiveReaderColumn({
  content,
  presentation,
  readingSession,
  followParticipant,
  readerOptions,
}: LiveReaderColumnProps) {
  return (
    <div className="order-1 min-h-0 min-w-0 overflow-hidden xl:order-2">
      <div className="h-full overflow-hidden rounded-xl border bg-card shadow-sm">
        <ReaderShell
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
          viewportScrollProgress={
            followParticipant ? readingSession.participantViewport.scrollProgress : null
          }
          remoteFocus={{
            isInsideReadingArea: readingSession.focus.isInsideReadingArea,
            normalizedContentX: readingSession.focus.normalizedContentX,
            normalizedContentY: readingSession.focus.normalizedContentY,
            activeTokenId: readingSession.focus.activeTokenId,
          }}
          showRemoteFocusMarker={readerOptions.displayGazePosition}
          embedded
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
