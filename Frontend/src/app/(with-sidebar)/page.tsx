import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-5xl items-center">
      <div className="grid w-full gap-6">
        <Card className="rounded-[2rem] border-slate-200/80 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <CardHeader>
            <CardTitle className="text-2xl">Experiment flow</CardTitle>
            <CardDescription>
              This is a demo of the experiment flow, showcasing the reading material setup and live gaze overlay features. Click the button below to start the experiment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg" variant="outline">
              <Link href="/experiment">Start Experiment</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

