"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { ReplayQuizFrame } from "@/lib/experiment-replay"
import type { LiveReadingSessionSnapshot, ReadingContentSnapshot } from "@/lib/experiment-session"
import type { GazeData } from "@/lib/gaze-socket"
import { ReaderShell } from "@/modules/pages/reading/components/ReaderShell"
import type { ReadingPresentationSettings } from "@/modules/pages/reading/lib/readingPresentation"
import type { RemoteTokenAttentionSnapshot } from "@/modules/pages/reading/lib/useRemoteTokenAttentionHeatmap"
import { ReplayQuizPanel } from "@/modules/pages/replay/components/ReplayQuizPanel"
import type { ReplayReaderOptions } from "@/modules/pages/replay/types"

type ReplayReaderColumnProps = {
  errorMessage: string | null
  content: ReadingContentSnapshot
  presentation: ReadingPresentationSettings
  readingSession: LiveReadingSessionSnapshot
  readerOptions: ReplayReaderOptions
  remoteTokenAttention: RemoteTokenAttentionSnapshot | null
  quiz: ReplayQuizFrame | null
  gazeSample: GazeData | null
}

export function ReplayReaderColumn({
  errorMessage,
  content,
  presentation,
  readingSession,
  readerOptions,
  remoteTokenAttention,
  quiz,
  gazeSample,
}: ReplayReaderColumnProps) {
  if (quiz?.isActive) {
    return (
      <ReplayQuizPanel
        quiz={quiz}
        gaze={gazeSample}
        participantViewport={readingSession.participantViewport}
      />
    )
  }

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
          viewportScrollTopPx={readingSession.participantViewport.scrollTopPx}
          remoteFocus={{
            isInsideReadingArea: readingSession.focus.isInsideReadingArea,
            normalizedContentX: readingSession.focus.normalizedContentX,
            normalizedContentY: readingSession.focus.normalizedContentY,
            activeTokenId: readingSession.focus.activeTokenId,
            activeSentenceId: readingSession.focus.activeSentenceId,
          }}
          remoteTokenAttention={remoteTokenAttention}
          showRemoteFocusMarker={readerOptions.displayGazePosition}
          embedded
          latestIntervention={readingSession.latestIntervention ?? null}
          initialPresentation={readingSession.initialPresentation ?? null}
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
