export type ComprehensionOption = {
  id: string
  text: string
}

export type ComprehensionQuestion = {
  id: string
  order: number
  prompt: string
  options: ComprehensionOption[]
  correctOptionId: string
}

export type QuizStatus = "not-started" | "completed"

export type ComprehensionAnswer = {
  questionId: string
  selectedOptionId: string
  isCorrect: boolean
  answeredAtUnixMs: number
}

export type SubmitQuizAnswerEntry = {
  questionId: string
  selectedOptionId: string
}
