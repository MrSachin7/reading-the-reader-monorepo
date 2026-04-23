import {
  ExperimentStepper,
  type ExperimentStepperMode,
} from "./components/experiment-stepper"

type ExperimentPageProps = {
  mode?: ExperimentStepperMode
}

export default function ExperimentPage({ mode = "researcher" }: ExperimentPageProps) {
  const isParticipantMode = mode === "participant"
  const title = "Researcher experiment control"
  const description =
    "Prepare the device and reading baseline first, then follow the participant steps and start the session when everything is ready."

  return (
    <section
      className={
        isParticipantMode
          ? "w-full space-y-6 px-4 py-6 md:px-8 md:py-8"
          : "w-full space-y-6"
      }
    >
      {!isParticipantMode ? (
        <>
          <header>
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              {description}
            </p>
          </header>
          <div className="w-full">
            <ExperimentStepper mode={mode} />
          </div>
        </>
      ) : (
        <div className="mx-auto w-full max-w-6xl">
          <ExperimentStepper mode={mode} />
        </div>
      )}
    </section>
  )
}
