import { Suspense } from "react";
import ReadingMaterialSetupPage from "@/modules/pages/reading-material-setup";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ReadingMaterialSetupPage />
    </Suspense>
  );
}
