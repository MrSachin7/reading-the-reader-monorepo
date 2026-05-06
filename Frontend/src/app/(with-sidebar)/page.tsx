"use client"

import * as React from "react"
import Link from "next/link"
import { BookOpen, Play, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useGetExperimentSetupsQuery } from "@/redux"

function formatDate(unixMs: number) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(unixMs))
}

function markParticipantFlowStarted() {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem("participant-flow-started-v2", `${Date.now()}`)
}

export default function HomePage() {
  const { data: templates = [], isLoading } = useGetExperimentSetupsQuery()
  const [query, setQuery] = React.useState("")
  const normalizedQuery = query.trim().toLowerCase()
  const filteredTemplates = normalizedQuery
    ? templates.filter((template) =>
        [
          template.name,
          template.description,
          template.status,
          template.orderMode,
          ...template.items.map((item) => item.title),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)
      )
    : templates
  const readyTemplates = filteredTemplates.filter((template) => template.status === "ready")
  const draftTemplates = filteredTemplates.filter(
    (template) => template.status !== "ready" && template.status !== "archived"
  )

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Researcher dashboard
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Experiment templates</h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
            Start a saved protocol or continue a draft.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/reading-materials">
            <BookOpen className="h-4 w-4" />
            Material Library
          </Link>
        </Button>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search templates by name, description, or material title"
        />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Ready to run</h2>
          <Badge variant="outline">{readyTemplates.length} ready</Badge>
        </div>
        <div className="grid gap-3">
          {readyTemplates.map((template) => (
            <Card key={template.id}>
              <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold">{template.name}</h3>
                    <Badge>{template.status}</Badge>
                    <Badge variant="outline">{template.orderMode}</Badge>
                    <Badge variant="outline">{template.items.length} materials</Badge>
                  </div>
                  <p className="max-w-3xl text-sm text-muted-foreground">
                    {template.description || "No description provided."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Updated {formatDate(template.updatedAtUnixMs)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button asChild onClick={markParticipantFlowStarted}>
                    <Link href={`/researcher/experiment?templateId=${template.id}`}>
                      <Play className="h-4 w-4" />
                      Start
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/experiment-templates/setup?id=${template.id}`}>Edit</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!isLoading && readyTemplates.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                No ready templates yet.{" "}
                <Link href="/experiment-templates" className="underline underline-offset-4">
                  Open the template library
                </Link>{" "}
                to create one.
              </CardContent>
            </Card>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Drafts</h2>
          <Badge variant="outline">{draftTemplates.length} drafts</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {draftTemplates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{template.status}</Badge>
                  <Badge variant="outline">{template.items.length} materials</Badge>
                </div>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <CardDescription>{template.description || "Draft template"}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link href={`/experiment-templates/setup?id=${template.id}`}>
                    Continue setup
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </section>
  )
}
