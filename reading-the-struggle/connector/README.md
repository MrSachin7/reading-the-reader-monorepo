# Reading-The-Struggle Connector

Bridges the collaborator's Reading-The-Struggle analysis pipeline (in `../code/`)
to the Reading The Reader backend as an external **fixation-analysis** module
provider. The collaborator code is imported as-is and never modified.

## What it does

1. Connects to the backend module-provider WebSocket (`/ws/module-provider`)
   and registers via `moduleProviderHello`, claiming the `fixation-analysis`
   module (`fixation-analysis.v1`).
2. On `sessionSnapshot` it resets the pipeline, parses the experiment materials
   with their `EyeTracker.parse_text`, and applies the real screen geometry over
   their hardcoded screen constants.
3. Each live `gazeSample` is translated into the renamed-CSV row shape their
   pipeline expects (joining in the latest `readingObservation` token focus)
   and fed through `EyeTracker.delay_event`.
4. Every `STRUGGLE_CONNECTOR_PREDICTION_INTERVAL_SAMPLES` samples (default 180
   ≈ 2 s at 90 Hz) it runs their `StrugglePredictor` and sends a
   `submitAnalysis` message containing the full `analysisState`
   (fixations, saccades, token stats) plus the struggle labels
   (`readingStyle`, `cognitiveLoad`, `ripa2Load`).

If the trained model files are missing (`../data/models/scaling_params.csv`,
`kmeans_centers.csv`, `kmeans_cognitive_load.pkl`), the connector still runs
and submits fixation analysis — the struggle labels stay `null` until the
models are supplied.

## Run

```powershell
./scripts/startService.ps1
```

The script creates a local `.venv`, installs this package, and starts the
service. Configure via environment variables (see `.env.example`); the shared
secret must match the backend `ModuleProvider:SharedSecret` setting.

In the researcher experiment stepper, select the **external** eye movement
analysis source so the backend routes gaze data to this provider.
