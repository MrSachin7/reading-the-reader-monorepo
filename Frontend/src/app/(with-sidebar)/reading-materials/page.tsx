import { Suspense } from "react";
import ReadingMaterialLibraryPage from "@/modules/pages/reading-material-library";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ReadingMaterialLibraryPage />
    </Suspense>
  );
}
