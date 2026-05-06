import * as React from "react"

import ExperimentTemplateLibraryPage from "@/modules/pages/experiment-template-library"

export default function ExperimentTemplatesRoute() {
  return (
    <React.Suspense>
      <ExperimentTemplateLibraryPage />
    </React.Suspense>
  )
}
