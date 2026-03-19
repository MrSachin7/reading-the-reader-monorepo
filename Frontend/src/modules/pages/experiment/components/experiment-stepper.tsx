"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import type { LucideIcon } from "lucide-react"
import { BookOpen, Crosshair, FileText, Plus, ScanEye } from "lucide-react"
import { useRouter } from "next/navigation"
import { Controller, useForm, useWatch } from "react-hook-form"
import * as z from "zod"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { getErrorMessage, getErrorStatus } from "@/lib/error-utils"
import {
  hydrateExperimentFromSession,
  setReadingSessionSource,
  setReadingSessionCustomMarkdown,
  setReadingSessionResearcherQuestions,
  setReadingSessionTitle,
  setStepTwoAge,
  setStepTwoEyeCondition,
  setStepTwoLastSyncedFingerprint,
  setStepTwoName,
  setStepTwoReadingProficiency,
  setStepTwoSex,
  useAppDispatch,
  useAppSelector,
  useGetExperimentSessionQuery,
  useGetReadingMaterialSetupsQuery,
  useLazyGetReadingMaterialSetupByIdQuery,
  useSaveParticipantMutation,
  useStartExperimentSessionMutation,
  useUpsertReadingSessionMutation,
} from "@/redux"
import type { RootState } from "@/redux"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  applyReadingPresentationSettings,
  useReadingSettings,
} from "@/modules/pages/reading/lib/useReadingSettings"
import { MOCK_READING_MD } from "@/modules/pages/reading/content/mockReading"
import { EyetrackerSetup } from "./eyetracker-setup"
import { CalibrationStep } from "./calibration-step"

export type ExperimentStep = {
  value: number
  name: string
  label: string
  description: string
  icon: LucideIcon
}

type ExperimentStepNavigationProps = {
  step: number
  onStepChange: (value: number) => void
  completion: Record<number, boolean>
  steps: ExperimentStep[]
}

export function ExperimentStepNavigation({
  step,
  onStepChange,
  completion,
  steps,
}: ExperimentStepNavigationProps) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Experiment flow</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Set up, register, calibrate, choose content.</h2>
      </div>
      {steps.map((stepItem) => {
        const Icon = stepItem.icon
        const isActive = step === stepItem.value
        const isCompleted = Boolean(completion[stepItem.value]) || step > stepItem.value
        const isLocked = step < stepItem.value
        const stepStatus = completion[stepItem.value]
          ? "Done"
          : isActive
            ? "Current"
            : isLocked
              ? "Locked"
              : "Available"

        return (
          <button
            key={stepItem.value}
            type="button"
            disabled={isLocked}
            onClick={() => {
              if (!isLocked) {
                onStepChange(stepItem.value)
              }
            }}
            className={cn(
              "w-full rounded-[1.5rem] border p-4 text-left transition-all",
              isActive && "border-primary bg-primary/5 shadow-[0_12px_40px_rgba(15,23,42,0.06)]",
              isCompleted && "border-emerald-300/60 bg-emerald-500/5",
              !isActive && !isCompleted && "bg-card hover:border-primary/40 hover:bg-primary/5",
              isLocked && "cursor-not-allowed opacity-55 hover:border-border hover:bg-card"
            )}
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : isCompleted
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700"
                      : "border-neutral-300 bg-neutral-100 text-neutral-500"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold">{stepItem.label}</p>
                  <Badge variant={isCompleted ? "secondary" : "outline"}>{stepStatus}</Badge>
                </div>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {stepItem.name}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{stepItem.description}</p>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

const steps: ExperimentStep[] = [
  {
    value: 0,
    name: "step1",
    label: "Choose eyetracker",
    description: "Select the device and its licence so the session can talk to the tracker.",
    icon: Crosshair,
  },
  {
    value: 1,
    name: "step2",
    label: "Participant info",
    description: "Capture the participant details used to identify and group the session.",
    icon: FileText,
  },
  {
    value: 2,
    name: "step3",
    label: "Calibration",
    description: "Confirm that calibration has been completed in the Tobii software.",
    icon: ScanEye,
  },
  {
    value: 3,
    name: "step4",
    label: "Reading material",
    description: "Choose the reading text and apply an experiment setup before starting.",
    icon: BookOpen,
  },
]

const participantSexOptions = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non-binary", label: "Non-binary" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
]

const participantEyeConditionOptions = [
  { value: "none", label: "None" },
  { value: "myopia", label: "Myopia" },
  { value: "hyperopia", label: "Hyperopia" },
  { value: "astigmatism", label: "Astigmatism" },
  { value: "color-vision-deficiency", label: "Color vision deficiency" },
]

const participantReadingProficiencyOptions = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
]

const participantFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  age: z
    .number({ error: "Age is required." })
    .int("Age must be a whole number.")
    .min(5, "Age must be at least 5.")
    .max(120, "Age must be at most 120."),
  sex: z.string().min(1, "Please select sex."),
  eyeCondition: z.string().min(1, "Please select an eye condition."),
  readingProficiency: z.string().min(1, "Please select a reading proficiency level."),
})

type ParticipantInformationFormProps = {
  onCompletionChange?: (isComplete: boolean) => void
  onSubmitRequestChange?: (submitHandler: (() => Promise<boolean>) | null) => void
  onSubmittingChange?: (isSubmitting: boolean) => void
}

function ParticipantInformationForm({
  onCompletionChange,
  onSubmitRequestChange,
  onSubmittingChange,
}: ParticipantInformationFormProps) {
  const dispatch = useAppDispatch()
  const stepTwoDraft = useAppSelector((state: RootState) => state.experiment.stepTwo)
  const [saveParticipant, { isLoading: isSavingParticipant }] = useSaveParticipantMutation()

  const form = useForm<z.infer<typeof participantFormSchema>>({
    resolver: zodResolver(participantFormSchema),
    mode: "onChange",
    defaultValues: {
      name: stepTwoDraft.name,
      age: stepTwoDraft.age,
      sex: stepTwoDraft.sex,
      eyeCondition: stepTwoDraft.eyeCondition,
      readingProficiency: stepTwoDraft.readingProficiency,
    },
  })

  const watchedName = useWatch({ control: form.control, name: "name" })
  const watchedAge = useWatch({ control: form.control, name: "age" })
  const watchedSex = useWatch({ control: form.control, name: "sex" })
  const watchedEyeCondition = useWatch({ control: form.control, name: "eyeCondition" })
  const watchedReadingProficiency = useWatch({
    control: form.control,
    name: "readingProficiency",
  })

  const [submitError, setSubmitError] = React.useState<string | null>(null)

  const isComplete = participantFormSchema.safeParse({
    name: watchedName,
    age: watchedAge,
    sex: watchedSex,
    eyeCondition: watchedEyeCondition,
    readingProficiency: watchedReadingProficiency,
  }).success

  React.useEffect(() => {
    dispatch(setStepTwoName(watchedName ?? ""))
  }, [dispatch, watchedName])

  React.useEffect(() => {
    dispatch(setStepTwoAge(Number(watchedAge) || 0))
  }, [dispatch, watchedAge])

  React.useEffect(() => {
    dispatch(setStepTwoSex(watchedSex ?? ""))
  }, [dispatch, watchedSex])

  React.useEffect(() => {
    dispatch(setStepTwoEyeCondition(watchedEyeCondition ?? ""))
  }, [dispatch, watchedEyeCondition])

  React.useEffect(() => {
    dispatch(setStepTwoReadingProficiency(watchedReadingProficiency ?? ""))
  }, [dispatch, watchedReadingProficiency])

  const submitParticipantForm = React.useCallback(async () => {
    setSubmitError(null)

    const isValid = await form.trigger()
    if (!isValid) {
      return false
    }

    const data = form.getValues()
    const currentFingerprint = JSON.stringify(data)

    if (stepTwoDraft.lastSyncedFingerprint === currentFingerprint) {
      return true
    }

    try {
      await saveParticipant({
        name: data.name,
        age: data.age,
        sex: data.sex,
        existingEyeCondition: data.eyeCondition,
        readingProficiency: data.readingProficiency,
      }).unwrap()
      dispatch(setStepTwoLastSyncedFingerprint(currentFingerprint))
      return true
    } catch (error) {
      setSubmitError(getErrorMessage(error, "Failed to save participant. Please try again."))
      return false
    }
  }, [dispatch, form, saveParticipant, stepTwoDraft.lastSyncedFingerprint])

  React.useEffect(() => {
    onCompletionChange?.(isComplete)
  }, [isComplete, onCompletionChange])

  React.useEffect(() => {
    onSubmittingChange?.(isSavingParticipant)
    return () => onSubmittingChange?.(false)
  }, [isSavingParticipant, onSubmittingChange])

  React.useEffect(() => {
    onSubmitRequestChange?.(submitParticipantForm)
    return () => onSubmitRequestChange?.(null)
  }, [onSubmitRequestChange, submitParticipantForm])

  return (
    <Card>
      <CardHeader className="border-b pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Step 2</Badge>
          <Badge variant="outline">Participant</Badge>
        </div>
        <CardTitle className="mt-3 text-3xl tracking-tight">Capture participant information.</CardTitle>
        <CardDescription className="max-w-3xl text-base leading-7">
          Record the participant details used to identify the session and group the reading data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <form id="participant-info-form" onSubmit={(event) => event.preventDefault()}>
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="participant-name">Name</FieldLabel>
                  <Input
                    {...field}
                    id="participant-name"
                    placeholder="Enter participant name"
                    aria-invalid={fieldState.invalid}
                    autoComplete="off"
                  />
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <Controller
              name="age"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="participant-age">Age</FieldLabel>
                  <Input
                    id="participant-age"
                    type="number"
                    min={5}
                    max={120}
                    value={field.value}
                    onChange={(event) => field.onChange(Number(event.target.value))}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <Controller
              name="sex"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="participant-sex">Sex</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="participant-sex" className="w-full" aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Select sex" />
                    </SelectTrigger>
                    <SelectContent>
                      {participantSexOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <Controller
              name="eyeCondition"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="participant-eye-condition">Existing eye condition</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="participant-eye-condition"
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue placeholder="Select eye condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {participantEyeConditionOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <Controller
              name="readingProficiency"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="participant-reading-proficiency">Reading proficiency</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="participant-reading-proficiency"
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue placeholder="Select reading proficiency" />
                    </SelectTrigger>
                    <SelectContent>
                      {participantReadingProficiencyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Choose the participant&apos;s reading level for baseline grouping.
                  </FieldDescription>
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />
          </FieldGroup>
        </form>

        {submitError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not continue</AlertTitle>
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  )
}

type SessionContentStepProps = {
  onCompletionChange?: (isComplete: boolean) => void
}

function SessionContentStep({ onCompletionChange }: SessionContentStepProps) {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const readingSession = useAppSelector((state: RootState) => state.experiment.readingSession)
  const { data: materialSetups = [], isLoading: isLoadingMaterialSetups, refetch } =
    useGetReadingMaterialSetupsQuery()
  const [getReadingMaterialSetupById, { isFetching: isLoadingSelectedMaterial }] =
    useLazyGetReadingMaterialSetupByIdQuery()
  const { experimentSetupId, resetReadingSettings } = useReadingSettings()

  const [selectionError, setSelectionError] = React.useState<string | null>(null)
  const hasSelectedMaterial = readingSession.title.trim().length > 0
  const selectedSavedSetup = React.useMemo(
    () => materialSetups.find((setup) => setup.id === experimentSetupId) ?? null,
    [experimentSetupId, materialSetups]
  )
  const selectedPresentationLabel =
    readingSession.source === "preset"
      ? "Default presentation"
      : selectedSavedSetup?.name ?? "Custom presentation"

  React.useEffect(() => {
    onCompletionChange?.(hasSelectedMaterial)
  }, [hasSelectedMaterial, onCompletionChange])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Step 4</Badge>
            <Badge variant="outline">Reading material</Badge>
          </div>
          <CardTitle className="mt-3 text-3xl tracking-tight">Choose the text and session setup.</CardTitle>
          <CardDescription className="max-w-3xl text-base leading-7">
            Pick a saved reading material setup or create a new one. Each card should already
            bundle the reading text, questions, and experiment setup.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {selectionError ? (
            <Alert variant="destructive">
              <AlertTitle>Selection issue</AlertTitle>
              <AlertDescription>{selectionError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <button
              type="button"
              onClick={() => {
                resetReadingSettings()
                dispatch(setReadingSessionSource("preset"))
                dispatch(setReadingSessionTitle("Reading as Deliberate Attention"))
                dispatch(setReadingSessionCustomMarkdown(""))
                dispatch(setReadingSessionResearcherQuestions(""))
              }}
              className={cn(
                "w-full rounded-2xl border p-5 text-left transition-colors",
                "bg-card hover:border-primary/40 hover:bg-accent/30",
                readingSession.source === "preset" && "border-primary bg-accent/50"
              )}
            >
              <div className="space-y-3">
                <div>
                  <p className="text-base font-semibold">Default text</p>
                  <p className="text-xs text-muted-foreground">Reading as Deliberate Attention</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <BookOpen className="h-3.5 w-3.5" />
                  Built-in fallback
                </div>
              </div>
            </button>

            {materialSetups.map((setup) => (
              <button
                key={setup.id}
                type="button"
                onClick={async () => {
                  setSelectionError(null)

                  try {
                    const savedSetup = await getReadingMaterialSetupById(setup.id).unwrap()
                    dispatch(setReadingSessionSource("custom"))
                    dispatch(setReadingSessionTitle(savedSetup.title))
                    dispatch(setReadingSessionCustomMarkdown(savedSetup.markdown))
                    dispatch(setReadingSessionResearcherQuestions(savedSetup.researcherQuestions))
                    applyReadingPresentationSettings(savedSetup)
                  } catch (error) {
                    if (getErrorStatus(error) === 404) {
                      setSelectionError("That saved reading material setup no longer exists.")
                      void refetch()
                      return
                    }

                    setSelectionError(
                      getErrorMessage(error, "Could not load that reading material setup.")
                    )
                  }
                }}
                disabled={isLoadingSelectedMaterial}
                className={cn(
                  "w-full rounded-2xl border p-5 text-left transition-colors",
                  "bg-card hover:border-primary/40 hover:bg-accent/30",
                  experimentSetupId === setup.id && "border-primary bg-accent/50"
                )}
              >
                <div className="space-y-3">
                  <div>
                    <p className="text-base font-semibold">{setup.name}</p>
                    <p className="text-xs text-muted-foreground">{setup.title}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5" />
                    Saved quick option
                  </div>
                </div>
              </button>
            ))}

            <button
              type="button"
              onClick={() => router.push("/reading-material/setup?mode=custom-empty")}
              disabled={isLoadingMaterialSetups}
              className="flex min-h-[170px] w-full flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 p-5 text-center transition-colors hover:border-primary/40 hover:bg-accent/30"
            >
              <Plus className="mb-3 h-6 w-6 text-muted-foreground" />
              <p className="text-base font-semibold">Create new</p>
            </button>
          </div>

          {hasSelectedMaterial ? (
            <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
              Selected: <span className="font-medium text-foreground">{readingSession.title}</span>
              {" · "}
              <span className="font-medium text-foreground">{selectedPresentationLabel}</span>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

export function ExperimentStepper() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const stepThree = useAppSelector((state: RootState) => state.experiment.stepThree)
  const readingSession = useAppSelector((state: RootState) => state.experiment.readingSession)
  const { presentation, experimentSetupId } = useReadingSettings()
  const { data: experimentSession } = useGetExperimentSessionQuery(undefined, {
    refetchOnMountOrArgChange: true,
  })
  const [upsertReadingSession, { isLoading: isSavingReadingSession }] =
    useUpsertReadingSessionMutation()
  const [startExperimentSession, { isLoading: isStartingExperimentSession }] =
    useStartExperimentSessionMutation()
  const [step, setStep] = React.useState(0)
  const [isStepSubmitting, setIsStepSubmitting] = React.useState(false)
  const [startError, setStartError] = React.useState<string | null>(null)
  const [stepCompletion, setStepCompletion] = React.useState<Record<number, boolean>>({
    0: false,
    1: false,
    2: false,
    3: false,
  })
  const stepSubmitHandlerRef = React.useRef<(() => Promise<boolean>) | null>(null)

  const isCurrentStepComplete = stepCompletion[step] ?? false
  const canAdvance = isCurrentStepComplete && !isStepSubmitting

  const handleStartReadingSession = React.useCallback(async () => {
    setStartError(null)

    const title =
      readingSession.title.trim().length > 0
        ? readingSession.title.trim()
        : "Reading as Deliberate Attention"
    const markdown =
      readingSession.source === "custom" && readingSession.customMarkdown.trim().length > 0
        ? readingSession.customMarkdown
        : MOCK_READING_MD
    const documentId =
      readingSession.source === "custom" && experimentSetupId
        ? experimentSetupId
        : "mock-reading-v1"

    try {
      await upsertReadingSession({
        documentId,
        title,
        markdown,
        sourceSetupId: readingSession.source === "custom" ? experimentSetupId : null,
        fontFamily: presentation.fontFamily,
        fontSizePx: presentation.fontSizePx,
        lineWidthPx: presentation.lineWidthPx,
        lineHeight: presentation.lineHeight,
        letterSpacingEm: presentation.letterSpacingEm,
        editableByResearcher: presentation.editableByExperimenter,
      }).unwrap()
      await startExperimentSession().unwrap()
      router.push("/reading")
    } catch (error) {
      setStartError(getErrorMessage(error, "Could not start the reading session."))
    }
  }, [
    experimentSetupId,
    presentation.editableByExperimenter,
    presentation.fontFamily,
    presentation.fontSizePx,
    presentation.letterSpacingEm,
    presentation.lineHeight,
    presentation.lineWidthPx,
    readingSession.customMarkdown,
    readingSession.source,
    readingSession.title,
    router,
    startExperimentSession,
    upsertReadingSession,
  ])

  React.useEffect(() => {
    if (!experimentSession) {
      return
    }

    const calibrationApplied =
      experimentSession.setup.calibrationCompleted ||
      experimentSession.calibration.result?.applied === true ||
      stepThree.externalCalibrationCompleted
    const backendStep = Math.min(
      Math.max(experimentSession.setup.currentStepIndex, 0),
      steps.length - 1
    )

    dispatch(hydrateExperimentFromSession(experimentSession))
    setStepCompletion({
      0: experimentSession.setup.eyeTrackerSetupCompleted,
      1: experimentSession.setup.participantSetupCompleted,
      2: calibrationApplied,
      3: Boolean(
        (experimentSession.setup as Record<string, unknown>).readingMaterialSetupCompleted
      ),
    })
    setStep(calibrationApplied ? Math.max(backendStep, 2) : backendStep)
  }, [dispatch, experimentSession, stepThree.externalCalibrationCompleted])

  const setStepComplete = React.useCallback((stepIndex: number, isComplete: boolean) => {
    setStepCompletion((prev) => {
      if (prev[stepIndex] === isComplete) {
        return prev
      }

      return { ...prev, [stepIndex]: isComplete }
    })
  }, [])

  const handleStepSubmitterChange = React.useCallback(
    (submitHandler: (() => Promise<boolean>) | null) => {
      stepSubmitHandlerRef.current = submitHandler
    },
    []
  )

  const handleStepSubmittingChange = React.useCallback((isSubmitting: boolean) => {
    setIsStepSubmitting((prev) => (prev === isSubmitting ? prev : isSubmitting))
  }, [])

  const handleStepZeroCompletionChange = React.useCallback(
    (isComplete: boolean) => {
      setStepComplete(0, isComplete)
    },
    [setStepComplete]
  )

  const handleStepOneCompletionChange = React.useCallback(
    (isComplete: boolean) => {
      setStepComplete(1, isComplete)
    },
    [setStepComplete]
  )

  const handleStepTwoCompletionChange = React.useCallback(
    (isComplete: boolean) => {
      setStepComplete(2, isComplete)
    },
    [setStepComplete]
  )

  const handleStepThreeCompletionChange = React.useCallback(
    (isComplete: boolean) => {
      setStepComplete(3, isComplete)
    },
    [setStepComplete]
  )

  const handleNext = async () => {
    if (step === steps.length - 1 || !canAdvance) {
      return
    }

    const submitStep = stepSubmitHandlerRef.current
    if (submitStep) {
      const success = await submitStep()
      if (!success) {
        return
      }
    }

    setStep((prev) => Math.min(prev + 1, steps.length - 1))
  }

  return (
    <div className="grid gap-6 2xl:grid-cols-[320px_minmax(0,1fr)] 2xl:gap-8">
      <aside className="2xl:sticky 2xl:top-24 2xl:self-start">
        <ExperimentStepNavigation
          step={step}
          onStepChange={setStep}
          completion={stepCompletion}
          steps={steps}
        />
      </aside>

      <section className="space-y-6">
        {step === 0 ? (
          <EyetrackerSetup
            onCompletionChange={handleStepZeroCompletionChange}
            onSubmittingChange={handleStepSubmittingChange}
            onSubmitRequestChange={handleStepSubmitterChange}
          />
        ) : step === 1 ? (
          <ParticipantInformationForm
            onCompletionChange={handleStepOneCompletionChange}
            onSubmittingChange={handleStepSubmittingChange}
            onSubmitRequestChange={handleStepSubmitterChange}
          />
        ) : step === 2 ? (
          <CalibrationStep
            onCompletionChange={handleStepTwoCompletionChange}
            onSubmittingChange={handleStepSubmittingChange}
            onSubmitRequestChange={handleStepSubmitterChange}
          />
        ) : (
          <SessionContentStep
            onCompletionChange={handleStepThreeCompletionChange}
          />
        )}

        {startError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not start</AlertTitle>
            <AlertDescription>{startError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border bg-card px-5 py-4">
          <Button disabled={step === 0} onClick={() => setStep(step - 1)}>
            Previous
          </Button>
          {step < steps.length - 1 ? (
            <Button
              disabled={step === steps.length - 1 || !canAdvance}
              onClick={handleNext}
            >
              Next
            </Button>
          ) : (
            <Button
              disabled={!isCurrentStepComplete || isSavingReadingSession || isStartingExperimentSession}
              onClick={() => void handleStartReadingSession()}
            >
              {isSavingReadingSession || isStartingExperimentSession
                ? "Starting session..."
                : "Start reading session"}
            </Button>
          )}
        </div>
      </section>
    </div>
  )
}
