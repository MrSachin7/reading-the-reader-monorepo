"use client"

import * as React from "react"
import { Eye, LoaderCircle, Lock, Save, SlidersHorizontal, Upload } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

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
import { parseReadingMaterialImport } from "@/lib/setup-portability"
import { ComprehensionQuizEditor } from "@/modules/pages/reading-material-setup/components/ComprehensionQuizEditor"
import { MarkdownReader } from "@/modules/pages/reading/components/MarkdownReader"
import { parseMinimalMarkdown } from "@/modules/pages/reading/lib/minimalMarkdown"
import {
  applyReadingPresentationDraft,
  applyReadingPresentationSettings,
  useReadingSettings,
} from "@/modules/pages/reading/lib/useReadingSettings"
import { tokenizeDocument } from "@/modules/pages/reading/lib/tokenize"
import {
  type CreateReadingMaterialSetupRequest,
  type ReadingMaterialSetup,
  setReadingSessionComprehensionQuiz,
  setReadingSessionCustomMarkdown,
  setReadingSessionTitle,
  useAppDispatch,
  useCreateReadingMaterialSetupMutation,
  useGetReadingMaterialSetupsQuery,
  useLazyGetReadingMaterialSetupByIdQuery,
  useUpdateReadingMaterialSetupMutation,
} from "@/redux"

type DraftState = CreateReadingMaterialSetupRequest

const FONT_LABELS: Record<FontTheme, string> = {
  "roboto-flex": "Roboto Flex",
  geist: "Geist",
  inter: "Inter",
  "space-grotesk": "Space Grotesk",
  merriweather: "Merriweather",
}

const FONT_FAMILY_STYLES: Record<FontTheme, string> = {
  "roboto-flex": "var(--font-roboto-flex)",
  geist: "var(--font-geist-sans)",
  inter: "var(--font-inter)",
  "space-grotesk": "var(--font-space-grotesk)",
  merriweather: "var(--font-merriweather)",
}

const emptyDraft: DraftState = {
  name: "",
  title: "",
  markdown: "",
  comprehensionQuiz: [],
  fontFamily: "merriweather",
  fontSizePx: 18,
  lineWidthPx: 680,
  lineHeight: 1.7,
  letterSpacingEm: 0.02,
  editableByExperimenter: true,
}

function formatDate(unixMs: number) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(unixMs))
}

function describeControlState(editableByExperimenter: boolean) {
  return editableByExperimenter ? "Live-adjustable baseline" : "Locked baseline"
}

function normalizeReadingMaterialSetup(
  value: unknown,
  fallback: DraftState
): ReadingMaterialSetup | null {
  if (typeof value !== "object" || !value) {
    return null
  }

  const setup = value as Partial<ReadingMaterialSetup>
  const id = typeof setup.id === "string" && setup.id.length > 0 ? setup.id : null
  const name = typeof setup.name === "string" && setup.name.length > 0 ? setup.name : fallback.name

  if (!id) {
    return null
  }

  return {
    id,
    name,
    title: typeof setup.title === "string" ? setup.title : fallback.title,
    markdown: typeof setup.markdown === "string" ? setup.markdown : fallback.markdown,
    comprehensionQuiz: Array.isArray(setup.comprehensionQuiz)
      ? setup.comprehensionQuiz
      : fallback.comprehensionQuiz,
    fontFamily:
      setup.fontFamily === "roboto-flex" ||
      setup.fontFamily === "geist" ||
      setup.fontFamily === "inter" ||
      setup.fontFamily === "space-grotesk" ||
      setup.fontFamily === "merriweather"
        ? setup.fontFamily
        : fallback.fontFamily,
    fontSizePx: typeof setup.fontSizePx === "number" ? setup.fontSizePx : fallback.fontSizePx,
    lineWidthPx: typeof setup.lineWidthPx === "number" ? setup.lineWidthPx : fallback.lineWidthPx,
    lineHeight: typeof setup.lineHeight === "number" ? setup.lineHeight : fallback.lineHeight,
    letterSpacingEm:
      typeof setup.letterSpacingEm === "number" ? setup.letterSpacingEm : fallback.letterSpacingEm,
    editableByExperimenter:
      typeof setup.editableByExperimenter === "boolean"
        ? setup.editableByExperimenter
        : fallback.editableByExperimenter,
    createdAtUnixMs:
      typeof setup.createdAtUnixMs === "number" ? setup.createdAtUnixMs : Date.now(),
    updatedAtUnixMs:
      typeof setup.updatedAtUnixMs === "number" ? setup.updatedAtUnixMs : Date.now(),
  }
}

export default function ReadingMaterialSetupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dispatch = useAppDispatch()
  const { resetReadingSettings } = useReadingSettings()
  const [draft, setDraft] = React.useState<DraftState>(emptyDraft)
  const [selectedSetupId, setSelectedSetupId] = React.useState<string | null>(null)
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [selectionError, setSelectionError] = React.useState<string | null>(null)

  const { refetch } = useGetReadingMaterialSetupsQuery()
  const [getReadingMaterialSetupById, { isFetching: isLoadingSelectedSetup }] =
    useLazyGetReadingMaterialSetupByIdQuery()
  const [createReadingMaterialSetup, { isLoading: isCreating }] =
    useCreateReadingMaterialSetupMutation()
  const [updateReadingMaterialSetup, { isLoading: isUpdating }] =
    useUpdateReadingMaterialSetupMutation()

  const isSaving = isCreating || isUpdating

  const PREVIEW_CHAR_LIMIT = 8_000

  const [debouncedMarkdown, setDebouncedMarkdown] = React.useState(
    draft.markdown.slice(0, PREVIEW_CHAR_LIMIT)
  )
  React.useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedMarkdown(draft.markdown.slice(0, PREVIEW_CHAR_LIMIT)),
      350
    )
    return () => clearTimeout(timer)
  }, [draft.markdown])

  const previewBlocks = React.useMemo(() => {
    const parsed = parseMinimalMarkdown(debouncedMarkdown)
    return tokenizeDocument(parsed, "reading-material-setup-preview")
  }, [debouncedMarkdown])
  // Debounce the markdown Redux dispatch — the string can be large and dispatching it
  // synchronously on every keystroke blocks the main thread via Redux DevTools serialization.
  React.useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(setReadingSessionCustomMarkdown(draft.markdown))
    }, 400)
    return () => clearTimeout(timer)
  }, [draft.markdown, dispatch])

  const syncReadingSession = React.useCallback(
    (nextDraft: DraftState) => {
      dispatch(setReadingSessionTitle(nextDraft.title))
      dispatch(setReadingSessionComprehensionQuiz(nextDraft.comprehensionQuiz))
    },
    [dispatch]
  )

  const setupIdParam = searchParams.get("id")

  React.useEffect(() => {
    if (setupIdParam) {
      void handleLoadSavedSetup(setupIdParam)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally only on mount

  const applySetup = React.useCallback(
    (next: { id: string; name: string } & DraftState) => {
      setDraft({
        name: next.name,
        title: next.title,
        markdown: next.markdown,
        comprehensionQuiz: next.comprehensionQuiz,
        fontFamily: next.fontFamily,
        fontSizePx: next.fontSizePx,
        lineWidthPx: next.lineWidthPx,
        lineHeight: next.lineHeight,
        letterSpacingEm: next.letterSpacingEm,
        editableByExperimenter: next.editableByExperimenter,
      })
      setSelectedSetupId(next.id)
      syncReadingSession(next)
      applyReadingPresentationSettings(next)
    },
    [syncReadingSession]
  )

  const handleLoadSavedSetup = React.useCallback(
    async (id: string) => {
      setSelectionError(null)

      try {
        const response = await getReadingMaterialSetupById(id).unwrap()
        const setup = normalizeReadingMaterialSetup(response, draft)
        if (!setup) {
          setSelectionError("The saved reading material setup is invalid.")
          return
        }

        applySetup(setup)
      } catch (error) {
        if (getErrorStatus(error) === 404) {
          setSelectionError("That reading material setup no longer exists.")
          void refetch()
          return
        }

        setSelectionError(getErrorMessage(error, "Could not load that reading material setup."))
      }
    },
    [applySetup, draft, getReadingMaterialSetupById, refetch]
  )

  const applyLocalDraft = React.useCallback(
    (nextDraft: DraftState, syncPresentation = false) => {
      setSelectedSetupId(null)
      setSaveError(null)
      setSelectionError(null)
      setDraft(nextDraft)
      syncReadingSession(nextDraft)
      if (syncPresentation) {
        applyReadingPresentationDraft(nextDraft)
      }
    },
    [syncReadingSession]
  )

  const handleMarkdownFileImport = React.useCallback(
    async (file: File | null | undefined) => {
      if (!file) {
        return
      }

      const markdown = await file.text()
      const titleFromFile = file.name.replace(/\.(md|markdown|txt)$/i, "").replace(/[-_]+/g, " ")
      applyLocalDraft({
        ...draft,
        title: draft.title.trim().length > 0 ? draft.title : titleFromFile,
        markdown,
      })
    },
    [applyLocalDraft, draft]
  )

  const handleJsonFileImport = React.useCallback(
    async (file: File | null | undefined) => {
      if (!file) {
        return
      }

      try {
        const imported = parseReadingMaterialImport(JSON.parse(await file.text()))
        if (!imported) {
          setSelectionError("That JSON file is not a valid reading material export.")
          return
        }

        applyLocalDraft(imported, true)
      } catch {
        setSelectionError("That JSON file could not be read.")
      }
    },
    [applyLocalDraft]
  )

  const handleSave = React.useCallback(async () => {
    setSaveError(null)

    try {
      const response = selectedSetupId
        ? await updateReadingMaterialSetup({
            id: selectedSetupId,
            body: draft,
          }).unwrap()
        : await createReadingMaterialSetup(draft).unwrap()

      const savedSetup = normalizeReadingMaterialSetup(response, draft)
      if (!savedSetup) {
        setSaveError("The saved reading material setup is invalid.")
        return
      }

      applySetup(savedSetup)
      void refetch()
      router.push("/reading-materials")
    } catch (error) {
      if (getErrorStatus(error) === 404) {
        setSelectedSetupId(null)
        setSaveError("This reading material setup no longer exists.")
        void refetch()
        return
      }

      setSaveError(getErrorMessage(error, "Could not save the reading material setup."))
    }
  }, [applySetup, createReadingMaterialSetup, draft, refetch, selectedSetupId, updateReadingMaterialSetup])

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border bg-card shadow-sm">
        <div className="px-6 py-6 md:px-8">
          <div className="space-y-4">
            <div>
              <Link
                href="/reading-materials"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                ← Material Library
              </Link>
            </div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                  {selectedSetupId ? `Editing: ${draft.name}` : "New material"}
                </h1>
                <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
                  Paste Markdown or import a file, then store questions and presentation defaults together.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent/30">
                <Upload className="h-4 w-4" />
                Import JSON
                <input
                  type="file"
                  accept=".json,application/json"
                  className="sr-only"
                  onChange={(event) => {
                    void handleJsonFileImport(event.target.files?.[0])
                    event.currentTarget.value = ""
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {selectionError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {selectionError}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Reading text</CardTitle>
              <CardDescription>
                Edit a local draft here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="reading-material-name">Setup name</FieldLabel>
                  <Input
                    id="reading-material-name"
                    value={draft.name}
                    onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Enter reading material setup name"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="reading-material-title">Text title</FieldLabel>
                  <Input
                    id="reading-material-title"
                    value={draft.title}
                    onChange={(event) => {
                      const nextDraft = { ...draft, title: event.target.value }
                      applyLocalDraft(nextDraft)
                    }}
                    placeholder="Enter a title for this reading text"
                  />
                </Field>

                <Field>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <FieldLabel htmlFor="reading-material-text">Markdown text</FieldLabel>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent/30">
                      <Upload className="h-4 w-4" />
                      Import .md
                      <input
                        type="file"
                        accept=".md,.markdown,.txt,text/markdown,text/plain"
                        className="sr-only"
                        onChange={(event) => {
                          void handleMarkdownFileImport(event.target.files?.[0])
                          event.currentTarget.value = ""
                        }}
                      />
                    </label>
                  </div>
                  <Textarea
                    id="reading-material-text"
                    value={draft.markdown}
                    onChange={(event) => {
                      const nextDraft = { ...draft, markdown: event.target.value }
                      applyLocalDraft(nextDraft)
                    }}
                    className="min-h-56 resize-y"
                  />
                </Field>

              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Comprehension quiz</CardTitle>
              <CardDescription>
                Questions shown to the reader after they finish this material. Each question must have
                at least two options and one marked correct.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ComprehensionQuizEditor
                value={draft.comprehensionQuiz}
                onChange={(nextQuiz) => {
                  const nextDraft = { ...draft, comprehensionQuiz: nextQuiz }
                  applyLocalDraft(nextDraft)
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-xl">Presentation settings</CardTitle>
              </div>
              <CardDescription>Applied together with the text.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {saveError ? (
                <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                  {saveError}
                </div>
              ) : null}

              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="material-font-family">Font family</FieldLabel>
                  <Select
                    value={draft.fontFamily}
                    onValueChange={(value) => {
                      const nextDraft = { ...draft, fontFamily: value as FontTheme }
                      applyLocalDraft(nextDraft, true)
                    }}
                  >
                    <SelectTrigger id="material-font-family" className="w-full">
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

                <Field>
                  <div className="flex items-center justify-between gap-4">
                    <FieldLabel>Font size</FieldLabel>
                    <span className="text-sm text-muted-foreground">{draft.fontSizePx}px</span>
                  </div>
                  <Slider
                    min={14}
                    max={28}
                    step={1}
                    value={[draft.fontSizePx]}
                    onValueChange={(value) => {
                      const nextDraft = { ...draft, fontSizePx: value[0] ?? draft.fontSizePx }
                      applyLocalDraft(nextDraft, true)
                    }}
                  />
                </Field>

                <Field>
                  <div className="flex items-center justify-between gap-4">
                    <FieldLabel>Line width</FieldLabel>
                    <span className="text-sm text-muted-foreground">{draft.lineWidthPx}px</span>
                  </div>
                  <Slider
                    min={520}
                    max={920}
                    step={20}
                    value={[draft.lineWidthPx]}
                    onValueChange={(value) => {
                      const nextDraft = { ...draft, lineWidthPx: value[0] ?? draft.lineWidthPx }
                      applyLocalDraft(nextDraft, true)
                    }}
                  />
                </Field>

                <Field>
                  <div className="flex items-center justify-between gap-4">
                    <FieldLabel>Line height</FieldLabel>
                    <span className="text-sm text-muted-foreground">{draft.lineHeight.toFixed(2)}</span>
                  </div>
                  <Slider
                    min={1.2}
                    max={2.2}
                    step={0.05}
                    value={[draft.lineHeight]}
                    onValueChange={(value) => {
                      const nextDraft = { ...draft, lineHeight: value[0] ?? draft.lineHeight }
                      applyLocalDraft(nextDraft, true)
                    }}
                  />
                </Field>

                <Field>
                  <div className="flex items-center justify-between gap-4">
                    <FieldLabel>Letter spacing</FieldLabel>
                    <span className="text-sm text-muted-foreground">
                      {draft.letterSpacingEm.toFixed(2)}em
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={0.12}
                    step={0.01}
                    value={[draft.letterSpacingEm]}
                    onValueChange={(value) => {
                      const nextDraft = {
                        ...draft,
                        letterSpacingEm: value[0] ?? draft.letterSpacingEm,
                      }
                      applyLocalDraft(nextDraft, true)
                    }}
                  />
                </Field>

                <Field>
                  <div className="flex items-start justify-between gap-4 rounded-xl border bg-muted/20 p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {draft.editableByExperimenter ? (
                          <Eye className="h-4 w-4 text-primary" />
                        ) : (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        )}
                        <FieldLabel className="text-sm">Allow live researcher adjustments</FieldLabel>
                      </div>
                      <FieldDescription>
                        If enabled, the researcher may still tune typography during the live session.
                        If disabled, this becomes a locked participant baseline.
                      </FieldDescription>
                    </div>
                    <Switch
                      checked={draft.editableByExperimenter}
                      onCheckedChange={(checked) => {
                        const nextDraft = { ...draft, editableByExperimenter: checked }
                        applyLocalDraft(nextDraft, true)
                      }}
                    />
                  </div>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Save reusable baseline</CardTitle>
              <CardDescription>
                Save the text and presentation condition as one reusable reading baseline. You will still
                choose and save it into the active experiment session separately.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-2xl border bg-muted/30 p-4">
                <p className="text-sm font-medium">Current baseline draft</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Text: {draft.title.trim().length > 0 ? draft.title : "Untitled"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Quiz: {draft.comprehensionQuiz.length > 0 ? `${draft.comprehensionQuiz.length} question(s)` : "None"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Font: {FONT_LABELS[draft.fontFamily]} {draft.fontSizePx}px
                </p>
                <p className="text-sm text-muted-foreground">
                  Control: {describeControlState(draft.editableByExperimenter)}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  This page edits local preview state and reusable saved setups. The participant route
                  follows the authoritative session baseline only after you save one in the experiment setup flow.
                </p>
              </div>

              <Button
                onClick={() => void handleSave()}
                className="w-full"
                disabled={
                  isSaving ||
                  draft.name.trim().length === 0 ||
                  draft.title.trim().length === 0 ||
                  draft.markdown.trim().length === 0
                }
              >
                {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {selectedSetupId ? "Update reading material setup" : "Save reading material setup"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="xl:sticky xl:top-8 xl:self-start">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-xl">Live preview</CardTitle>
              <CardDescription>Uses the main markdown text.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border bg-background">
                <div className="flex items-center justify-between border-b px-4 py-3 text-sm text-muted-foreground">
                  <span>Participant reading preview</span>
                  {draft.markdown.length > PREVIEW_CHAR_LIMIT ? (
                    <span className="text-xs">
                      Preview capped at {PREVIEW_CHAR_LIMIT.toLocaleString()} chars — full text saves correctly
                    </span>
                  ) : null}
                </div>
                <div className="max-h-[70vh] overflow-y-auto px-4 py-6 md:px-8">
                  <div
                    className="mx-auto w-full"
                    style={{
                      maxWidth: `${draft.lineWidthPx}px`,
                      fontSize: `${draft.fontSizePx}px`,
                      lineHeight: draft.lineHeight,
                      letterSpacing: `${draft.letterSpacingEm}em`,
                      fontFamily: FONT_FAMILY_STYLES[draft.fontFamily],
                    }}
                  >
                    <MarkdownReader blocks={previewBlocks} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
