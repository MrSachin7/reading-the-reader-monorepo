"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import type { ReplayQuizFrame, ReplaySessionFinishedFrame } from "@/lib/experiment-replay"
import type { ActiveQuizState, LiveReadingSessionSnapshot, ReadingContentSnapshot } from "@/lib/experiment-session"
import { ReaderShell } from "@/modules/pages/reading/components/ReaderShell"
import type { ReadingPresentationSettings } from "@/modules/pages/reading/lib/readingPresentation"
import type { RemoteTokenAttentionSnapshot } from "@/modules/pages/reading/lib/useRemoteTokenAttentionHeatmap"
import { ReplaySessionFinishedPanel } from "@/modules/pages/replay/components/ReplaySessionFinishedPanel"
import type { ReplayReaderOptions } from "@/modules/pages/replay/types"

type ReplayReaderColumnProps = {
  errorMessage: string | null
  content: ReadingContentSnapshot
  presentation: ReadingPresentationSettings
  readingSession: LiveReadingSessionSnapshot
  readerOptions: ReplayReaderOptions
  remoteTokenAttention: RemoteTokenAttentionSnapshot | null
  quiz: ReplayQuizFrame | null
  sessionFinished: ReplaySessionFinishedFrame | null
}

export function ReplayReaderColumn({
  errorMessage,
  content,
  presentation,
  readingSession,
  readerOptions,
  remoteTokenAttention,
  quiz,
  sessionFinished,
}: ReplayReaderColumnProps) {
  // After the participant has finished the experiment in the recording, swap the reader column
  // to a results panel — mirroring how the live participant view shows ThankYou and the
  // researcher live view shows QuizResultsMirrorPanel.
  if (sessionFinished && !quiz?.isActive) {
    return (
      <div className="order-1 min-h-0 min-w-0 overflow-hidden xl:order-2">
        {errorMessage ? (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Replay import warning</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}
        <ReplaySessionFinishedPanel sessionFinished={sessionFinished} />
      </div>
    )
  }

  // When the recording is in a quiz window, hand a reconstructed activeQuizState to the same
  // ReaderShell the live participant view uses. ReaderShell branches internally into the
  // ReaderShellQuiz subcomponent — same typography, same theme, same layout as live.
  const replayActiveQuizState: ActiveQuizState | null =
    quiz?.isActive
      ? {
          materialItemId: quiz.materialItemId,
          activeQuestionIndex: quiz.questionIndex ?? 0,
          selectionsByQuestionId: quiz.selectionsByQuestionId,
          quizPhase: "in-progress",
        }
      : null
  const replayComprehensionQuiz = quiz?.isActive ? quiz.comprehensionQuiz : null
  const replayQuizMaterialTitle = quiz?.isActive
    ? readingSession.experimentItems.find((item) => item.id === quiz.materialItemId)?.title ?? content.title
    : null
  const quizFocusedOptionId = quiz?.activeRegionType === "option" ? quiz.activeOptionId : null
  const quizFocusedRegion =
    quiz?.activeRegionType === "prompt" || quiz?.activeRegionType === "option"
      ? quiz.activeRegionType
      : null

  return (
    <div className="order-1 min-h-0 min-w-0 overflow-hidden xl:order-2">
      {errorMessage ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Replay import warning</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="relative h-full overflow-hidden rounded-xl border bg-card shadow-sm">
        {readerOptions.showFixationHeatmap ? (
          <div className="pointer-events-none absolute right-4 top-4 z-10">
            <span
              className={cn(
                "inline-flex rounded-full border border-accent/45 bg-accent/15 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-accent-foreground shadow-sm backdrop-blur"
              )}
            >
              Token heat map
            </span>
          </div>
        ) : null}
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
            updatedAtUnixMs: readingSession.focus.updatedAtUnixMs,
          }}
          remoteTokenAttention={readerOptions.showFixationHeatmap ? remoteTokenAttention : null}
          showRemoteFocusMarker={readerOptions.displayGazePosition}
          embedded
          latestIntervention={readingSession.latestIntervention ?? null}
          initialPresentation={readingSession.initialPresentation ?? null}
          activeQuizState={replayActiveQuizState}
          comprehensionQuiz={replayComprehensionQuiz}
          activeQuizMaterialTitle={replayQuizMaterialTitle}
          quizIsInteractive={false}
          quizFocusedOptionId={quizFocusedOptionId}
          quizFocusedRegion={quizFocusedRegion}
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
