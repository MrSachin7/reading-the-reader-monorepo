import { Suspense } from "react"

import ExperimentSetupPage from "@/modules/pages/experiment-setup"

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ExperimentSetupPage />
    </Suspense>
  )
}
