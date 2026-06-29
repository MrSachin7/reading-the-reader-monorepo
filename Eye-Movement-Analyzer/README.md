# Eye-Movement-Analyzer

This service is a mock external eye movement analysis provider for the Reading The Reader thesis platform.

It connects to the backend module-provider websocket at `/ws/module-provider` and registers as the `fixation-analysis` module. It consumes browser-authored reading gaze observations and submits mock fixation and saccade analysis back to the backend. It does not implement physiological eye movement classification. Instead, it imitates an external analysis engine while preserving the public integration boundary for future teams.

## What It Does

- registers with the backend using `moduleProviderHello`, declaring the `fixation-analysis` module (protocol `fixation-analysis.v1`) on the framework protocol `module-provider.v1`
- waits for `moduleProviderWelcome`, then sends regular `moduleProviderHeartbeat` messages
- receives `moduleProviderOutbound` envelopes carrying the inner fixation-analysis message types:
  - `sessionSnapshot`
  - `readingObservation`
  - `gazeSample`
  - `viewportChanged`
  - `stateChanged`
- derives token-level reading fixations and saccades from `readingObservation`
- submits authoritative analysis in a `moduleProviderInbound` envelope with inner message type `submitAnalysis`

## Setup

Install Python 3.11 or newer, then install the package:

```bash
cd Eye-Movement-Analyzer
python -m venv .venv
.venv\Scripts\activate
pip install -e .
```

## Configuration

Copy `.env.example` into your preferred local environment setup or export the variables directly in your shell.

Important values:

- `EYE_MOVEMENT_ANALYZER_WS_URL`
  - default: `ws://localhost:5190/ws/module-provider`
- `EYE_MOVEMENT_ANALYZER_SHARED_SECRET`
  - must match backend `ModuleProvider:SharedSecret`; when that section is absent from `appsettings.json` the backend uses its default `change-me-local-module-provider-secret`
- `EYE_MOVEMENT_ANALYZER_PROVIDER_ID`
  - default: `mock-python-analysis`

## Running

```bash
cd Eye-Movement-Analyzer
.venv\Scripts\activate
python -m eye_movement_analyzer
```

Or start it directly from PowerShell with the launcher script:

```powershell
.\Eye-Movement-Analyzer\scripts\startService.ps1
```

The script will:

- create `Eye-Movement-Analyzer/.venv` if it does not exist yet
- install the local package into that virtual environment
- start the mock analyzer service

## Using It With The App

1. Start the backend.
2. Start this service.
3. In the researcher app, select external eye movement analysis.
4. Start a session and open the participant reading page.
5. Generate reading gaze observations.

The backend remains authoritative. This service only submits analysis through the public analysis-provider contract.

## Notes

- This is intentionally a mock and thesis-supporting integration seam, not a production physiological classifier.
- Saccades are token-transition reading saccades, matching the phase-1 backend contract.
