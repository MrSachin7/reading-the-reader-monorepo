"use client"

import { ListChecks } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { ExperimentSequenceItemSnapshot } from "@/lib/experiment-session"

type Props = {
  items: ExperimentSequenceItemSnapshot[]
}

export function QuizProgressCard({ items }: Props) {
  const itemsWithQuiz = items.filter((item) => (item.comprehensionQuiz?.length ?? 0) > 0)
  if (itemsWithQuiz.length === 0) {
    return null
  }

  const completedCount = itemsWithQuiz.filter((item) => item.quizStatus === "completed").length

  return (
    <Card className="rounded-2xl bg-card/96 shadow-sm">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ListChecks className="size-3.5" />
            <span className="text-[10px] uppercase tracking-[0.2em]">Comprehension quizzes</span>
          </div>
          <Badge variant="outline">
            {completedCount} / {itemsWithQuiz.length}
          </Badge>
        </div>

        <ul className="mt-3 space-y-2">
          {itemsWithQuiz.map((item, index) => {
            const total = item.comprehensionQuiz?.length ?? 0
            const completed = item.quizStatus === "completed"
            return (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border bg-background/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {index + 1}. {item.title || "Untitled"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {total} question{total === 1 ? "" : "s"}
                  </p>
                </div>
                <Badge
                  variant={completed ? "default" : "outline"}
                  className="text-[10px] uppercase tracking-wider"
                >
                  {completed ? "Completed" : "Pending"}
                </Badge>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
