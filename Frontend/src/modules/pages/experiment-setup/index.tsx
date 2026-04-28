"use client"

import * as React from "react"
import { ArrowDown, ArrowUp, BookOpen, FilePlus2, LoaderCircle, Save, Trash2 } from "lucide-react"
import { useSearchParams } from "next/navigation"

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
  type ReadingMaterialSetup,
  useCreateExperimentSetupMutation,
  useGetExperimentSetupsQuery,
  useGetReadingMaterialSetupsQuery,
  useLazyGetExperimentSetupByIdQuery,
  useLazyGetReadingMaterialSetupByIdQuery,
  useUpdateExperimentSetupMutation,
} from "@/redux"

type DraftItem = ExperimentSetupItem & {
  localId: string
}

type DraftState = {
  name: string
  description: string
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
  const searchParams = useSearchParams()
  const requestedId = searchParams.get("id")
  const [selectedSetupId, setSelectedSetupId] = React.useState<string | null>(requestedId)
  const [draft, setDraft] = React.useState<DraftState>(emptyDraft)
  const [selectionError, setSelectionError] = React.useState<string | null>(null)
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = React.useState<string | null>(null)

  const { data: experimentSetups = [], isLoading: isLoadingExperiments, refetch } =
    useGetExperimentSetupsQuery()
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
          void refetch()
          return
        }

        setSelectionError(getErrorMessage(error, "Could not load that experiment setup."))
      }
    },
    [getExperimentSetupById, refetch]
  )

  React.useEffect(() => {
    if (!selectedSetupId || draft.items.length > 0 || draft.name.trim().length > 0) {
      return
    }

    void loadSetup(selectedSetupId)
  }, [draft.items.length, draft.name, loadSetup, selectedSetupId])

  const handleStartNew = React.useCallback(() => {
    setSelectedSetupId(null)
    setSelectionError(null)
    setSaveError(null)
    setSaveSuccess(null)
    setDraft(emptyDraft)
  }, [])

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

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Reusable experiment builder</h1>
        <p className="max-w-4xl text-sm leading-7 text-muted-foreground">
          Compose a reusable experiment from saved reading materials. Each text keeps its own
          styling snapshot so researchers can reuse the full study setup, not only individual texts.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Saved experiments</CardTitle>
                <CardDescription>Load a reusable experiment or start a fresh one.</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleStartNew}>
                <FilePlus2 className="h-4 w-4" />
                New
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectionError ? (
              <Alert variant="destructive">
                <AlertTitle>Selection issue</AlertTitle>
                <AlertDescription>{selectionError}</AlertDescription>
              </Alert>
            ) : null}

            {experimentSetups.map((setup) => (
              <button
                key={setup.id}
                type="button"
                onClick={() => void loadSetup(setup.id)}
                className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                  selectedSetupId === setup.id ? "border-primary bg-accent/40" : "hover:border-primary/40"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{setup.name}</p>
                    <Badge variant="outline">{setup.items.length} texts</Badge>
                  </div>
                  {setup.description ? (
                    <p className="text-xs text-muted-foreground">{setup.description}</p>
                  ) : null}
                  <p className="text-[11px] text-muted-foreground">
                    Updated {formatDate(setup.updatedAtUnixMs)}
                  </p>
                </div>
              </button>
            ))}

            {!isLoadingExperiments && experimentSetups.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                No experiment setups saved yet.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{selectedSetupId ? "Edit experiment" : "Create experiment"}</CardTitle>
              <CardDescription>
                Give the experiment a name, then add the reading materials that belong to it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                  <FieldLabel>Experiment name</FieldLabel>
                  <FieldDescription>Required. This is the reusable experiment name shown to researchers.</FieldDescription>
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
              </FieldGroup>

              <FieldGroup className="space-y-3">
                <Field>
                  <FieldLabel>Add reading material</FieldLabel>
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
                <Button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={isSaving || isLoadingSelectedSetup}
                >
                  {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {selectedSetupId ? "Update experiment" : "Save experiment"}
                </Button>
                {isLoadingSelectedSetup ? (
                  <span className="text-sm text-muted-foreground">Loading saved experiment…</span>
                ) : null}
                {isLoadingReadingMaterialDetail ? (
                  <span className="text-sm text-muted-foreground">Loading reading material…</span>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
