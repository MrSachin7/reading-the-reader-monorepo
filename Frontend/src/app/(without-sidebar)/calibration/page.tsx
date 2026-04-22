import { Suspense } from "react"
import CalibrationPage from "@/modules/pages/calibration"

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CalibrationPage />
    </Suspense>
  )
}
