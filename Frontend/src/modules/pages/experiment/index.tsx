import { ExperimentStepper } from "./components/experiment-stepper";

export default function ExperimentPage() {
  return (
    <section className="w-full space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Experiment setup</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
          Work through the setup in order: connect the eyetracker, register the participant, and
          run the built-in Tobii calibration flow before starting.
        </p>
      </header>
      <div className="w-full">
        <ExperimentStepper />
      </div>
    </section>
  );
}
