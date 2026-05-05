import { Suspense } from "react";
import ExperimentPage from "@/modules/pages/experiment";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ExperimentPage mode="researcher" />
    </Suspense>
  );
}
