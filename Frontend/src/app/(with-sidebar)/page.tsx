"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const PARTICIPANT_FLOW_STARTED_KEY = "participant-flow-started-v2"

export default function HomePage() {
  const handleStartExperimentClick = () => {
    if (typeof window === "undefined") {
      return
    }

    window.localStorage.setItem(PARTICIPANT_FLOW_STARTED_KEY, `${Date.now()}`)
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-5xl items-center">
      <div className="grid w-full gap-6">
        <Card className="rounded-[2rem] border-slate-200/80 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <CardHeader>
            <CardTitle className="text-2xl">Experiment flow</CardTitle>
            <CardDescription>
              Start the experiment as the researcher, prepare the device and reading baseline, then
              hand over the participant information and calibration steps in the dedicated
              participant view.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg" variant="outline">
              <Link href="/researcher/experiment" onClick={handleStartExperimentClick}>
                Start Experiment
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
