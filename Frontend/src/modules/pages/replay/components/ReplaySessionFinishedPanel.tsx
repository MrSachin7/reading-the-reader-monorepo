"use client"

import { Check, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { ReplaySessionFinishedFrame } from "@/lib/experiment-replay"
import { cn } from "@/lib/utils"

type Props = {
  sessionFinished: ReplaySessionFinishedFrame
}

export function ReplaySessionFinishedPanel({ sessionFinished }: Props) {
  return (
    <div className="h-full overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex h-full flex-col">
        <header className="border-b border-border/60 px-6 py-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Session complete
          </p>
          <h2 className="mt-1 text-lg font-semibold">Quiz results</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The participant finished the experiment at this point in the recording.
            All recorded quiz answers are below.
          </p>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <ol className="space-y-6">
            {sessionFinished.results.map((result, materialIndex) => (
              <li key={result.materialItemId} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      Material {materialIndex + 1}
                      {result.materialTitle ? ` — ${result.materialTitle}` : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {result.totalQuestions} question
                      {result.totalQuestions === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {result.correctCount} / {result.totalQuestions} correct
                  </Badge>
                </div>

                <ul className="space-y-2">
                  {result.comprehensionQuiz.map((question, questionIndex) => {
                    const answer = result.answersByQuestionId[question.id] ?? null
                    const selectedOption = answer
                      ? question.options.find((o) => o.id === answer.selectedOptionId) ?? null
                      : null
                    const isCorrect = answer?.isCorrect ?? false

                    return (
                      <li
                        key={question.id}
                        className={cn(
                          "rounded-2xl border bg-card/80 px-4 py-3",
                          isCorrect ? "border-emerald-400/40" : "border-rose-400/40"
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
                            {isCorrect ? (
                              <Check className="size-3.5" />
                            ) : (
                              <X className="size-3.5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="break-words text-sm font-medium">
                              Q{questionIndex + 1}. {question.prompt}
                            </p>
                            <p className="break-words text-[12px] text-muted-foreground">
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
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
