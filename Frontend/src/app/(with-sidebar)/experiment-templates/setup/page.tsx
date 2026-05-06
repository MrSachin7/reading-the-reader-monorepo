import * as React from "react"

import ExperimentSetupPage from "@/modules/pages/experiment-setup"

export default function ExperimentTemplateSetupRoute() {
  return (
    <React.Suspense>
      <ExperimentSetupPage />
    </React.Suspense>
  )
}
