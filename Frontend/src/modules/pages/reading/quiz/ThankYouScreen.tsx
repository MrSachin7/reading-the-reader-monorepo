"use client"

import { Check } from "lucide-react"

export function ThankYouScreen() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <Check className="h-7 w-7 text-primary" />
      </div>
      <h1 className="mt-6 text-2xl font-semibold">Thank you</h1>
      <p className="mt-3 text-base text-muted-foreground">
        Your reading session is complete. The researcher will take it from here.
      </p>
    </div>
  )
}
