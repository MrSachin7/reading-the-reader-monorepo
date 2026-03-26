import { Suspense } from "react"
import SettingsPage from "@/modules/pages/settings"

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SettingsPage />
    </Suspense>
  )
}
