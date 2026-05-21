"use client"

import { Check, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { ComprehensionAnswer } from "@/lib/comprehension-quiz"
import type { ExperimentSequenceItemSnapshot } from "@/lib/experiment-session"
import { cn } from "@/lib/utils"

type Props = {
  experimentItems: ExperimentSequenceItemSnapshot[]
  quizAnswersByItemId: Record<string, ComprehensionAnswer[]>
  participantName?: string | null
}

export function QuizResultsMirrorPanel({
  experimentItems,
  quizAnswersByItemId,
  participantName,
}: Props) {
  const completedQuizItems = experimentItems.filter(
    (item) =>
      (item.comprehensionQuiz?.length ?? 0) > 0 &&
      item.quizStatus === "completed"
  )

  return (
    <div className="order-1 min-h-0 min-w-0 overflow-hidden xl:order-2">
      <div className="h-full overflow-hidden rounded-[1.75rem] border border-border/70 bg-background/70 shadow-sm backdrop-blur-[2px]">
        <div className="flex h-full flex-col">
          <header className="border-b border-border/60 px-6 py-5">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Session complete
            </p>
            <h2 className="mt-1 text-lg font-semibold">
              Quiz results
              {participantName ? (
                <span className="text-muted-foreground font-normal"> · {participantName}</span>
              ) : null}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The participant has finished the experiment and is on the thank-you screen.
              Review their answers below.
            </p>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {completedQuizItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No comprehension quizzes were completed in this session.
              </p>
            ) : (
              <ol className="space-y-6">
                {completedQuizItems.map((item, materialIndex) => {
                  const answers = quizAnswersByItemId[item.id] ?? []
                  const answersByQuestionId = new Map(
                    answers.map((answer) => [answer.questionId, answer])
                  )
                  const total = item.comprehensionQuiz?.length ?? 0
                  const correctCount = answers.reduce(
                    (sum, answer) => sum + (answer.isCorrect ? 1 : 0),
                    0
                  )

                  return (
                    <li key={item.id} className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            Material {materialIndex + 1}
                            {item.title ? ` — ${item.title}` : ""}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {total} question{total === 1 ? "" : "s"}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {correctCount} / {total} correct
                        </Badge>
                      </div>

                      <ul className="space-y-2">
                        {(item.comprehensionQuiz ?? []).map((question, questionIndex) => {
                          const answer = answersByQuestionId.get(question.id) ?? null
                          const selectedOption = answer
                            ? question.options.find((o) => o.id === answer.selectedOptionId) ?? null
                            : null
                          const correctOption =
                            question.options.find((o) => o.id === question.correctOptionId) ?? null
                          const isCorrect = answer?.isCorrect ?? false

                          return (
                            <li
                              key={question.id}
                              className={cn(
                                "rounded-2xl border bg-card/80 px-4 py-3",
                                isCorrect
                                  ? "border-emerald-400/40"
                                  : "border-rose-400/40"
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={cn(
                                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                                    isCorrect
                                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                      : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                                  )}
                                >
                                  {isCorrect ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                                </div>
                                <div className="min-w-0 flex-1 space-y-1">
                                  <p className="text-sm font-medium">
                                    Q{questionIndex + 1}. {question.prompt}
                                  </p>
                                  <p className="text-[12px] text-muted-foreground">
                                    Selected:{" "}
                                    <span
                                      className={cn(
                                        "font-medium",
                                        isCorrect
                                          ? "text-emerald-700 dark:text-emerald-300"
                                          : "text-rose-700 dark:text-rose-300"
                                      )}
                                    >
                                      {selectedOption?.text ?? "(no answer)"}
                                    </span>
                                  </p>
                                  {!isCorrect ? (
                                    <p className="text-[12px] text-muted-foreground">
                                      Correct answer:{" "}
                                      <span className="font-medium text-emerald-700 dark:text-emerald-300">
                                        {correctOption?.text ?? question.correctOptionId}
                                      </span>
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
