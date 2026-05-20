"use client"

import * as React from "react"
import Link from "next/link"
import { Copy, FilePlus2, Pencil, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getErrorMessage } from "@/lib/error-utils"
import {
  type CreateExperimentSetupRequest,
  type ExperimentSetup,
  useCreateExperimentSetupMutation,
  useDeleteExperimentSetupMutation,
  useGetExperimentSetupsQuery,
} from "@/redux"

function formatDate(unixMs: number) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(unixMs))
}

function toCreateRequest(setup: ExperimentSetup): CreateExperimentSetupRequest {
  return {
    name: `${setup.name} (copy)`,
    description: setup.description,
    status: "draft",
    orderMode: setup.orderMode,
    defaultFontFamily: setup.defaultFontFamily,
    defaultFontSizePx: setup.defaultFontSizePx,
    defaultLineWidthPx: setup.defaultLineWidthPx,
    defaultLineHeight: setup.defaultLineHeight,
    defaultLetterSpacingEm: setup.defaultLetterSpacingEm,
    defaultEditableByExperimenter: setup.defaultEditableByExperimenter,
    decisionProviderId: setup.decisionProviderId,
    decisionExecutionMode: setup.decisionExecutionMode,
    calibrationRequired: setup.calibrationRequired,
    items: setup.items.map((item) => ({
      sourceReadingMaterialSetupId: item.sourceReadingMaterialSetupId,
      sourceReadingMaterialTitle: item.sourceReadingMaterialTitle,
      title: item.title,
      markdown: item.markdown,
      fontFamily: item.fontFamily,
      fontSizePx: item.fontSizePx,
      lineWidthPx: item.lineWidthPx,
      lineHeight: item.lineHeight,
      letterSpacingEm: item.letterSpacingEm,
      editableByExperimenter: item.editableByExperimenter,
    })),
  }
}

export default function ExperimentTemplateLibraryPage() {
  const { data: templates = [], isLoading, refetch } = useGetExperimentSetupsQuery()
  const [createExperimentSetup] = useCreateExperimentSetupMutation()
  const [deleteExperimentSetup] = useDeleteExperimentSetupMutation()
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [actionError, setActionError] = React.useState<string | null>(null)

  const readyTemplates = templates.filter((t) => t.status === "ready")
  const draftTemplates = templates.filter((t) => t.status === "draft")
  const archivedTemplates = templates.filter((t) => t.status === "archived")

  const handleDuplicate = React.useCallback(
    async (setup: ExperimentSetup) => {
      setActionError(null)
      try {
        await createExperimentSetup(toCreateRequest(setup)).unwrap()
        void refetch()
      } catch (error) {
        setActionError(getErrorMessage(error, "Could not duplicate that template."))
      }
    },
    [createExperimentSetup, refetch]
  )

  const handleDelete = React.useCallback(
    async (id: string) => {
      setActionError(null)
      setDeletingId(id)
      try {
        await deleteExperimentSetup(id).unwrap()
      } catch (error) {
        setActionError(getErrorMessage(error, "Could not delete that template."))
      } finally {
        setDeletingId(null)
      }
    },
    [deleteExperimentSetup]
  )

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Templates
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Experiment templates</h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
            Manage reusable experiment setups. Each template defines the reading sequence,
            presentation defaults, and runtime strategy used during a session.
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/experiment-templates/setup">
            <FilePlus2 className="h-4 w-4" />
            New template
          </Link>
        </Button>
      </header>

      {actionError ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {actionError}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading templates…</p>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No experiment templates yet.{" "}
              <Link href="/experiment-templates/setup" className="underline underline-offset-4">
                Create your first template
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      ) : null}

      {readyTemplates.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Ready</h2>
            <Badge variant="outline">{readyTemplates.length}</Badge>
          </div>
          <TemplateGrid
            templates={readyTemplates}
            deletingId={deletingId}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />
        </section>
      ) : null}

      {draftTemplates.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Drafts</h2>
            <Badge variant="outline">{draftTemplates.length}</Badge>
          </div>
          <TemplateGrid
            templates={draftTemplates}
            deletingId={deletingId}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />
        </section>
      ) : null}

      {archivedTemplates.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Archived</h2>
            <Badge variant="outline">{archivedTemplates.length}</Badge>
          </div>
          <TemplateGrid
            templates={archivedTemplates}
            deletingId={deletingId}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />
        </section>
      ) : null}
    </section>
  )
}

type TemplateGridProps = {
  templates: ExperimentSetup[]
  deletingId: string | null
  onDuplicate: (setup: ExperimentSetup) => void
  onDelete: (id: string) => void
}

function TemplateGrid({ templates, deletingId, onDuplicate, onDelete }: TemplateGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {templates.map((template) => (
        <Card key={template.id}>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline">{template.status}</Badge>
              <Badge variant="outline">{template.orderMode}</Badge>
              <Badge variant="outline">{template.items.length} texts</Badge>
            </div>
            <CardTitle className="text-base">{template.name}</CardTitle>
            {template.description ? (
              <CardDescription className="line-clamp-2">{template.description}</CardDescription>
            ) : null}
            <p className="text-[11px] text-muted-foreground">
              Updated {formatDate(template.updatedAtUnixMs)}
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/experiment-templates/setup?id=${template.id}`}>
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => onDuplicate(template)}
            >
              <Copy className="h-3.5 w-3.5" />
              Duplicate
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={deletingId === template.id}
              onClick={() => onDelete(template.id)}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deletingId === template.id ? "Deleting…" : "Delete"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
