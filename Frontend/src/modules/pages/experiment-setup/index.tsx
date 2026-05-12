"use client"

import * as React from "react"
import { ArrowDown, ArrowUp, BookOpen, Library, LoaderCircle, Save, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { FONTS, type FontTheme } from "@/hooks/use-font-theme"
import { getErrorMessage, getErrorStatus } from "@/lib/error-utils"
import {
  type CreateExperimentSetupRequest,
  type CreateExperimentSetupRequestItem,
  type ExperimentSetup,
  type ExperimentSetupItem,
  type ExperimentTemplateOrderMode,
  type ExperimentTemplateStatus,
  type ReadingMaterialSetup,
  useCreateExperimentSetupMutation,
  useAppDispatch,
  useGetReadingMaterialSetupsQuery,
  useLazyGetExperimentSetupByIdQuery,
  useLazyGetReadingMaterialSetupByIdQuery,
  useUpdateExperimentSetupMutation,
  setReadingSessionCustomMarkdown,
  setReadingSessionExperimentSelection,
  setReadingSessionResearcherQuestions,
  setReadingSessionTitle,
} from "@/redux"
import { applyReadingPresentationSettings } from "@/modules/pages/reading/lib/useReadingSettings"

type DraftItem = ExperimentSetupItem & {
  localId: string
}

type DraftState = {
  name: string
  description: string
  status: ExperimentTemplateStatus
  orderMode: ExperimentTemplateOrderMode
  defaultFontFamily: FontTheme
  defaultFontSizePx: number
  defaultLineWidthPx: number
  defaultLineHeight: number
  defaultLetterSpacingEm: number
  defaultEditableByExperimenter: boolean
  decisionProviderId: string
  decisionExecutionMode: string
  calibrationRequired: boolean
  items: DraftItem[]
}

const FONT_LABELS: Record<FontTheme, string> = {
  "roboto-flex": "Roboto Flex",
  geist: "Geist",
  inter: "Inter",
  "space-grotesk": "Space Grotesk",
  merriweather: "Merriweather",
}

const emptyDraft: DraftState = {
  name: "",
  description: "",
  status: "draft",
  orderMode: "fixed",
  defaultFontFamily: "merriweather",
  defaultFontSizePx: 18,
  defaultLineWidthPx: 680,
  defaultLineHeight: 1.7,
  defaultLetterSpacingEm: 0.02,
  defaultEditableByExperimenter: true,
  decisionProviderId: "manual",
  decisionExecutionMode: "advisory",
  calibrationRequired: true,
  items: [],
}

function createLocalId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function formatDate(unixMs: number) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(unixMs))
}

function buildDraftItem(setup: ReadingMaterialSetup): DraftItem {
  return {
    localId: createLocalId(),
    id: "",
    order: 0,
    sourceReadingMaterialSetupId: setup.id,
    sourceReadingMaterialTitle: setup.title,
    title: setup.title,
    markdown: setup.markdown,
    researcherQuestions: setup.researcherQuestions,
    fontFamily: setup.fontFamily,
    fontSizePx: setup.fontSizePx,
    lineWidthPx: setup.lineWidthPx,
    lineHeight: setup.lineHeight,
    letterSpacingEm: setup.letterSpacingEm,
    editableByExperimenter: setup.editableByExperimenter,
  }
}

function mapExperimentToDraft(setup: ExperimentSetup): DraftState {
  return {
    name: setup.name,
    description: setup.description,
    status: setup.status ?? "draft",
    orderMode: setup.orderMode ?? "fixed",
    defaultFontFamily: setup.defaultFontFamily ?? "merriweather",
    defaultFontSizePx: setup.defaultFontSizePx ?? 18,
    defaultLineWidthPx: setup.defaultLineWidthPx ?? 680,
    defaultLineHeight: setup.defaultLineHeight ?? 1.7,
    defaultLetterSpacingEm: setup.defaultLetterSpacingEm ?? 0.02,
    defaultEditableByExperimenter: setup.defaultEditableByExperimenter ?? true,
    decisionProviderId: setup.decisionProviderId ?? "manual",
    decisionExecutionMode: setup.decisionExecutionMode ?? "advisory",
    calibrationRequired: setup.calibrationRequired ?? true,
    items: setup.items.map((item) => ({
      ...item,
      localId: item.id || createLocalId(),
    })),
  }
}

function toCreateRequest(draft: DraftState): CreateExperimentSetupRequest {
  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    status: draft.status,
    orderMode: draft.orderMode,
    defaultFontFamily: draft.defaultFontFamily,
    defaultFontSizePx: draft.defaultFontSizePx,
    defaultLineWidthPx: draft.defaultLineWidthPx,
    defaultLineHeight: draft.defaultLineHeight,
    defaultLetterSpacingEm: draft.defaultLetterSpacingEm,
    defaultEditableByExperimenter: draft.defaultEditableByExperimenter,
    decisionProviderId: draft.decisionProviderId,
    decisionExecutionMode: draft.decisionExecutionMode,
    calibrationRequired: draft.calibrationRequired,
    items: draft.items.map<CreateExperimentSetupRequestItem>((item) => ({
      sourceReadingMaterialSetupId: item.sourceReadingMaterialSetupId,
      sourceReadingMaterialTitle: item.sourceReadingMaterialTitle,
      title: item.title.trim(),
      markdown: item.markdown,
      researcherQuestions: item.researcherQuestions,
      fontFamily: item.fontFamily,
      fontSizePx: item.fontSizePx,
      lineWidthPx: item.lineWidthPx,
      lineHeight: item.lineHeight,
      letterSpacingEm: item.letterSpacingEm,
      editableByExperimenter: item.editableByExperimenter,
    })),
  }
}

export default function ExperimentSetupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dispatch = useAppDispatch()
  const requestedId = searchParams.get("id")
  const startInCustomMode = searchParams.get("mode") === "custom"
  const [selectedSetupId, setSelectedSetupId] = React.useState<string | null>(requestedId)
  const [draft, setDraft] = React.useState<DraftState>(emptyDraft)
  const [saveAsTemplate, setSaveAsTemplate] = React.useState(!startInCustomMode)
  const [selectionError, setSelectionError] = React.useState<string | null>(null)
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = React.useState<string | null>(null)

  const { data: readingMaterialSetups = [], isLoading: isLoadingReadingMaterials } =
    useGetReadingMaterialSetupsQuery()
  const [getExperimentSetupById, { isFetching: isLoadingSelectedSetup }] =
    useLazyGetExperimentSetupByIdQuery()
  const [getReadingMaterialSetupById, { isFetching: isLoadingReadingMaterialDetail }] =
    useLazyGetReadingMaterialSetupByIdQuery()
  const [createExperimentSetup, { isLoading: isCreating }] =
    useCreateExperimentSetupMutation()
  const [updateExperimentSetup, { isLoading: isUpdating }] =
    useUpdateExperimentSetupMutation()

  const isSaving = isCreating || isUpdating

  React.useEffect(() => {
    if (!requestedId) {
      return
    }

    setSelectedSetupId(requestedId)
  }, [requestedId])

  const loadSetup = React.useCallback(
    async (id: string) => {
      setSelectionError(null)
      setSaveSuccess(null)

      try {
        const setup = await getExperimentSetupById(id).unwrap()
        setDraft(mapExperimentToDraft(setup))
        setSelectedSetupId(setup.id)
      } catch (error) {
        if (getErrorStatus(error) === 404) {
          setSelectionError("That saved experiment no longer exists.")
          return
        }

        setSelectionError(getErrorMessage(error, "Could not load that experiment setup."))
      }
    },
    [getExperimentSetupById]
  )

  React.useEffect(() => {
    if (!selectedSetupId || draft.items.length > 0 || draft.name.trim().length > 0) {
      return
    }

    void loadSetup(selectedSetupId)
  }, [draft.items.length, draft.name, loadSetup, selectedSetupId])

  const handleAddReadingMaterial = React.useCallback(
    async (setupId: string) => {
      setSelectionError(null)

      try {
        const source = await getReadingMaterialSetupById(setupId).unwrap()
        setDraft((current) => ({
          ...current,
          items: [...current.items, buildDraftItem(source)],
        }))
        setSaveSuccess(null)
      } catch (error) {
        if (getErrorStatus(error) === 404) {
          setSelectionError("That reading material no longer exists.")
          return
        }

        setSelectionError(getErrorMessage(error, "Could not add that reading material."))
      }
    },
    [getReadingMaterialSetupById]
  )

  const updateItem = React.useCallback((localId: string, updater: (item: DraftItem) => DraftItem) => {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) => (item.localId === localId ? updater(item) : item)),
    }))
    setSaveSuccess(null)
  }, [])

  const moveItem = React.useCallback((localId: string, direction: -1 | 1) => {
    setDraft((current) => {
      const index = current.items.findIndex((item) => item.localId === localId)
      if (index < 0) {
        return current
      }

      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= current.items.length) {
        return current
      }

      const items = [...current.items]
      const [moved] = items.splice(index, 1)
      items.splice(nextIndex, 0, moved)
      return {
        ...current,
        items,
      }
    })
    setSaveSuccess(null)
  }, [])

  const removeItem = React.useCallback((localId: string) => {
    setDraft((current) => ({
      ...current,
      items: current.items.filter((item) => item.localId !== localId),
    }))
    setSaveSuccess(null)
  }, [])

  const handleSave = React.useCallback(async () => {
    setSaveError(null)
    setSaveSuccess(null)

    try {
      if (selectedSetupId) {
        const updated = await updateExperimentSetup({
          id: selectedSetupId,
          body: {
            ...toCreateRequest(draft),
            items: draft.items.map((item) => ({
              id: item.id || undefined,
              sourceReadingMaterialSetupId: item.sourceReadingMaterialSetupId,
              sourceReadingMaterialTitle: item.sourceReadingMaterialTitle,
              title: item.title.trim(),
              markdown: item.markdown,
              researcherQuestions: item.researcherQuestions,
              fontFamily: item.fontFamily,
              fontSizePx: item.fontSizePx,
              lineWidthPx: item.lineWidthPx,
              lineHeight: item.lineHeight,
              letterSpacingEm: item.letterSpacingEm,
              editableByExperimenter: item.editableByExperimenter,
            })),
          },
        }).unwrap()
        setDraft(mapExperimentToDraft(updated))
        setSaveSuccess(`Updated "${updated.name}".`)
        return
      }

      const created = await createExperimentSetup(toCreateRequest(draft)).unwrap()
      setSelectedSetupId(created.id)
      setDraft(mapExperimentToDraft(created))
      setSaveSuccess(`Saved "${created.name}".`)
    } catch (error) {
      setSaveError(getErrorMessage(error, "Could not save the experiment setup."))
    }
  }, [createExperimentSetup, draft, selectedSetupId, updateExperimentSetup])

  const applyDraftToRuntime = React.useCallback((setupId: string | null, setupName: string | null) => {
    const firstItem = draft.items[0]
    if (!firstItem) {
      setSaveError("Add at least one reading material before starting.")
      return false
    }

    dispatch(setReadingSessionTitle(firstItem.title))
    dispatch(setReadingSessionCustomMarkdown(firstItem.markdown))
    dispatch(setReadingSessionResearcherQuestions(firstItem.researcherQuestions))
    dispatch(
      setReadingSessionExperimentSelection({
        experimentSetupId: setupId,
        experimentSetupName: setupName,
        experimentSetupItemId: setupId ? firstItem.id || firstItem.localId : null,
        readingMaterialSetupId: firstItem.sourceReadingMaterialSetupId,
        itemCount: setupId ? draft.items.length : 0,
      })
    )
    applyReadingPresentationSettings({
      id: firstItem.sourceReadingMaterialSetupId ?? firstItem.localId,
      name: firstItem.title,
      fontFamily: firstItem.fontFamily,
      fontSizePx: firstItem.fontSizePx,
      lineWidthPx: firstItem.lineWidthPx,
      lineHeight: firstItem.lineHeight,
      letterSpacingEm: firstItem.letterSpacingEm,
      editableByExperimenter: firstItem.editableByExperimenter,
    })
    return true
  }, [dispatch, draft.items])

  const handleStart = React.useCallback(async () => {
    setSaveError(null)
    setSaveSuccess(null)

    try {
      if (saveAsTemplate) {
        const saved = selectedSetupId
          ? await updateExperimentSetup({
              id: selectedSetupId,
              body: {
                ...toCreateRequest(draft),
                status: draft.items.length > 0 ? "ready" : draft.status,
                items: draft.items.map((item) => ({
                  id: item.id || undefined,
                  sourceReadingMaterialSetupId: item.sourceReadingMaterialSetupId,
                  sourceReadingMaterialTitle: item.sourceReadingMaterialTitle,
                  title: item.title.trim(),
                  markdown: item.markdown,
                  researcherQuestions: item.researcherQuestions,
                  fontFamily: item.fontFamily,
                  fontSizePx: item.fontSizePx,
                  lineWidthPx: item.lineWidthPx,
                  lineHeight: item.lineHeight,
                  letterSpacingEm: item.letterSpacingEm,
                  editableByExperimenter: item.editableByExperimenter,
                })),
              },
            }).unwrap()
          : await createExperimentSetup({
              ...toCreateRequest(draft),
              status: draft.items.length > 0 ? "ready" : draft.status,
            }).unwrap()

        router.push(`/researcher/experiment?templateId=${saved.id}`)
        return
      }

      if (applyDraftToRuntime(null, null)) {
        router.push("/researcher/experiment")
      }
    } catch (error) {
      setSaveError(getErrorMessage(error, "Could not start this experiment."))
    }
  }, [
    applyDraftToRuntime,
    createExperimentSetup,
    draft,
    router,
    saveAsTemplate,
    selectedSetupId,
    updateExperimentSetup,
  ])

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <Link
          href="/experiment-templates"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Experiment templates
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">
          {selectedSetupId ? "Edit template" : "New template"}
        </h1>
        <p className="max-w-4xl text-sm leading-7 text-muted-foreground">
          Compose reusable or one-off experiment setups from saved materials. Each template stores
          copied markdown, resolved presentation settings, order mode, and runtime strategy.
        </p>
      </header>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Template settings</CardTitle>
            <CardDescription>
              Define overview, order, defaults, runtime strategy, and the materials that belong to it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectionError ? (
              <Alert variant="destructive">
                <AlertTitle>Load issue</AlertTitle>
                <AlertDescription>{selectionError}</AlertDescription>
              </Alert>
            ) : null}

            {saveError ? (
              <Alert variant="destructive">
                <AlertTitle>Save issue</AlertTitle>
                <AlertDescription>{saveError}</AlertDescription>
              </Alert>
            ) : null}

            {saveSuccess ? (
              <Alert>
                <AlertTitle>Saved</AlertTitle>
                <AlertDescription>{saveSuccess}</AlertDescription>
              </Alert>
            ) : null}

              <FieldGroup className="grid gap-6 md:grid-cols-2">
                <Field>
                  <FieldLabel>Template name</FieldLabel>
                  <FieldDescription>Required. This is the reusable setup name shown to researchers.</FieldDescription>
                  <Input
                    value={draft.name}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Example: Danish reading baseline study"
                  />
                </Field>
                <Field className="md:col-span-2">
                  <FieldLabel>Description</FieldLabel>
                  <Textarea
                    value={draft.description}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, description: event.target.value }))
                    }
                    rows={3}
                    placeholder="Optional notes for researchers about the sequence or purpose of this experiment."
                  />
                </Field>
                <Field>
                  <FieldLabel>Status</FieldLabel>
                  <Select
                    value={draft.status}
                    onValueChange={(value: ExperimentTemplateStatus) =>
                      setDraft((current) => ({ ...current, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="ready">Ready</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Material order</FieldLabel>
                  <Select
                    value={draft.orderMode}
                    onValueChange={(value: ExperimentTemplateOrderMode) =>
                      setDraft((current) => ({ ...current, orderMode: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed order</SelectItem>
                      <SelectItem value="random">Fully random at session start</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Decision strategy</FieldLabel>
                  <Select
                    value={`${draft.decisionProviderId}:${draft.decisionExecutionMode}`}
                    onValueChange={(value) => {
                      const [decisionProviderId, decisionExecutionMode] = value.split(":")
                      setDraft((current) => ({
                        ...current,
                        decisionProviderId,
                        decisionExecutionMode,
                      }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual:advisory">Manual researcher control</SelectItem>
                      <SelectItem value="rule-based:advisory">Rule-based advisory</SelectItem>
                      <SelectItem value="rule-based:autonomous">Rule-based autonomous</SelectItem>
                      <SelectItem value="external:advisory">External advisory</SelectItem>
                      <SelectItem value="external:autonomous">External autonomous</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div>
                    <FieldLabel>Require calibration</FieldLabel>
                    <FieldDescription>Keep enabled for real eye-tracker sessions.</FieldDescription>
                  </div>
                  <Switch
                    checked={draft.calibrationRequired}
                    onCheckedChange={(checked) =>
                      setDraft((current) => ({ ...current, calibrationRequired: checked }))
                    }
                  />
                </Field>
              </FieldGroup>

              <FieldGroup className="grid gap-6 md:grid-cols-2">
                <Field>
                  <FieldLabel>Default font family</FieldLabel>
                  <Select
                    value={draft.defaultFontFamily}
                    onValueChange={(value: FontTheme) =>
                      setDraft((current) => ({ ...current, defaultFontFamily: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a font" />
                    </SelectTrigger>
                    <SelectContent>
                      {FONTS.map((font) => (
                        <SelectItem key={font} value={font}>
                          {FONT_LABELS[font]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div>
                    <FieldLabel>Default live adjustments</FieldLabel>
                    <FieldDescription>Allow researchers to adjust baseline display at runtime.</FieldDescription>
                  </div>
                  <Switch
                    checked={draft.defaultEditableByExperimenter}
                    onCheckedChange={(checked) =>
                      setDraft((current) => ({ ...current, defaultEditableByExperimenter: checked }))
                    }
                  />
                </Field>
                <Field>
                  <div className="flex items-center justify-between gap-3">
                    <FieldLabel>Default font size</FieldLabel>
                    <span className="text-sm text-muted-foreground">{draft.defaultFontSizePx}px</span>
                  </div>
                  <Slider
                    value={[draft.defaultFontSizePx]}
                    min={14}
                    max={32}
                    step={1}
                    onValueChange={([value]) =>
                      setDraft((current) => ({ ...current, defaultFontSizePx: value ?? current.defaultFontSizePx }))
                    }
                  />
                </Field>
                <Field>
                  <div className="flex items-center justify-between gap-3">
                    <FieldLabel>Default line width</FieldLabel>
                    <span className="text-sm text-muted-foreground">{draft.defaultLineWidthPx}px</span>
                  </div>
                  <Slider
                    value={[draft.defaultLineWidthPx]}
                    min={480}
                    max={980}
                    step={10}
                    onValueChange={([value]) =>
                      setDraft((current) => ({ ...current, defaultLineWidthPx: value ?? current.defaultLineWidthPx }))
                    }
                  />
                </Field>
              </FieldGroup>

              <FieldGroup className="space-y-3">
                <Field>
                  <div className="flex items-center justify-between gap-3">
                    <FieldLabel>Add reading material</FieldLabel>
                    <Link href="/reading-materials">
                      <Button variant="outline" size="sm" type="button">
                        <Library className="mr-2 h-4 w-4" />
                        Material Library
                      </Button>
                    </Link>
                  </div>
                  <FieldDescription>
                    Each added item snapshots the text plus its experiment-specific styling.
                  </FieldDescription>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {readingMaterialSetups.map((setup) => (
                      <button
                        key={setup.id}
                        type="button"
                        onClick={() => void handleAddReadingMaterial(setup.id)}
                        disabled={isLoadingReadingMaterialDetail}
                        className="rounded-2xl border p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/20"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm font-semibold">{setup.name}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">{setup.title}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  {!isLoadingReadingMaterials && readingMaterialSetups.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                      Save a reading material first, then come back here to compose experiments.
                    </div>
                  ) : null}
                </Field>
              </FieldGroup>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Experiment sequence</h2>
                    <p className="text-sm text-muted-foreground">
                      Order matters. The first text becomes the initial live reading baseline.
                    </p>
                  </div>
                  <Badge variant="outline">{draft.items.length} texts</Badge>
                </div>

                {draft.items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                    Add one or more saved reading materials to start composing the experiment.
                  </div>
                ) : null}

                {draft.items.map((item, index) => (
                  <Card key={item.localId}>
                    <CardHeader>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">Text {index + 1}</Badge>
                            <Badge variant="outline">{item.sourceReadingMaterialTitle}</Badge>
                          </div>
                          <CardTitle className="text-xl">{item.title || "Untitled text"}</CardTitle>
                          <CardDescription>
                            Source material: {item.sourceReadingMaterialTitle}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => moveItem(item.localId, -1)}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => moveItem(item.localId, 1)}
                            disabled={index === draft.items.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeItem(item.localId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <FieldGroup className="grid gap-6 md:grid-cols-2">
                        <Field>
                          <FieldLabel>Displayed title</FieldLabel>
                          <Input
                            value={item.title}
                            onChange={(event) =>
                              updateItem(item.localId, (current) => ({
                                ...current,
                                title: event.target.value,
                              }))
                            }
                          />
                        </Field>
                        <Field>
                          <FieldLabel>Font family</FieldLabel>
                          <Select
                            value={item.fontFamily}
                            onValueChange={(value: FontTheme) =>
                              updateItem(item.localId, (current) => ({
                                ...current,
                                fontFamily: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a font" />
                            </SelectTrigger>
                            <SelectContent>
                              {FONTS.map((font) => (
                                <SelectItem key={font} value={font}>
                                  {FONT_LABELS[font]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field className="md:col-span-2">
                          <FieldLabel>Researcher questions</FieldLabel>
                          <Textarea
                            value={item.researcherQuestions}
                            onChange={(event) =>
                              updateItem(item.localId, (current) => ({
                                ...current,
                                researcherQuestions: event.target.value,
                              }))
                            }
                            rows={3}
                          />
                        </Field>
                      </FieldGroup>

                      <div className="grid gap-6 lg:grid-cols-2">
                        <Field>
                          <div className="flex items-center justify-between gap-3">
                            <FieldLabel>Font size</FieldLabel>
                            <span className="text-sm text-muted-foreground">{item.fontSizePx}px</span>
                          </div>
                          <Slider
                            value={[item.fontSizePx]}
                            min={14}
                            max={32}
                            step={1}
                            onValueChange={([value]) =>
                              updateItem(item.localId, (current) => ({
                                ...current,
                                fontSizePx: value ?? current.fontSizePx,
                              }))
                            }
                          />
                        </Field>
                        <Field>
                          <div className="flex items-center justify-between gap-3">
                            <FieldLabel>Line width</FieldLabel>
                            <span className="text-sm text-muted-foreground">{item.lineWidthPx}px</span>
                          </div>
                          <Slider
                            value={[item.lineWidthPx]}
                            min={480}
                            max={980}
                            step={10}
                            onValueChange={([value]) =>
                              updateItem(item.localId, (current) => ({
                                ...current,
                                lineWidthPx: value ?? current.lineWidthPx,
                              }))
                            }
                          />
                        </Field>
                        <Field>
                          <div className="flex items-center justify-between gap-3">
                            <FieldLabel>Line height</FieldLabel>
                            <span className="text-sm text-muted-foreground">
                              {item.lineHeight.toFixed(2)}
                            </span>
                          </div>
                          <Slider
                            value={[item.lineHeight]}
                            min={1.2}
                            max={2.2}
                            step={0.05}
                            onValueChange={([value]) =>
                              updateItem(item.localId, (current) => ({
                                ...current,
                                lineHeight: value ?? current.lineHeight,
                              }))
                            }
                          />
                        </Field>
                        <Field>
                          <div className="flex items-center justify-between gap-3">
                            <FieldLabel>Letter spacing</FieldLabel>
                            <span className="text-sm text-muted-foreground">
                              {item.letterSpacingEm.toFixed(2)}em
                            </span>
                          </div>
                          <Slider
                            value={[item.letterSpacingEm]}
                            min={0}
                            max={0.12}
                            step={0.01}
                            onValueChange={([value]) =>
                              updateItem(item.localId, (current) => ({
                                ...current,
                                letterSpacingEm: value ?? current.letterSpacingEm,
                              }))
                            }
                          />
                        </Field>
                      </div>

                      <Field className="flex items-center justify-between rounded-2xl border p-4">
                        <div className="space-y-1">
                          <FieldLabel>Allow live presentation adjustments</FieldLabel>
                          <FieldDescription>
                            If turned off, this text starts from a locked baseline during the live
                            session.
                          </FieldDescription>
                        </div>
                        <Switch
                          checked={item.editableByExperimenter}
                          onCheckedChange={(checked) =>
                            updateItem(item.localId, (current) => ({
                              ...current,
                              editableByExperimenter: checked,
                            }))
                          }
                        />
                      </Field>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                  <Switch checked={saveAsTemplate} onCheckedChange={setSaveAsTemplate} />
                  Save as template
                </label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleStart()}
                  disabled={isSaving || isLoadingSelectedSetup || draft.items.length === 0}
                >
                  <BookOpen className="h-4 w-4" />
                  Start
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={isSaving || isLoadingSelectedSetup}
                >
                  {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {selectedSetupId ? "Update template" : "Save template"}
                </Button>
                {isLoadingSelectedSetup ? (
                  <span className="text-sm text-muted-foreground">Loading saved template...</span>
                ) : null}
                {isLoadingReadingMaterialDetail ? (
                  <span className="text-sm text-muted-foreground">Loading reading material...</span>
                ) : null}
              </div>
            </CardContent>
          </Card>
      </div>
    </section>
  )
}
