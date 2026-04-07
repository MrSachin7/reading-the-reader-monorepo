# Backend Architecture

## Purpose
The backend exposes two integration surfaces:

- **REST endpoints** (FastEndpoints under `/api`) for eye-tracker discovery and explicit start/stop.
- **Realtime WebSocket channel** (`/ws`) for low-latency session control and gaze sample streaming to frontend clients.

The architecture is organized into:

- `WebApi`: HTTP/WebSocket transport and endpoint wiring.
- `core.Application`: session orchestration and message routing.
- `core.Domain`: core entities (`GazeData`, `ExperimentSession`, `EyeTrackerDevice`).
- `infrastructure.TobiiEyetracker`: Tobii SDK adapter and gaze event source.
- `infrastructure.RealtimeMessenger`: WebSocket connection registry and broadcast transport.
- `infrastructure.Realtime.Persistence`: optional live replay file persistence and final replay export storage.

## High-Level Component Diagram
```mermaid
flowchart LR
    FE[Frontend App] -->|HTTP /api/eyetrackers| API[Web API]
    FE -->|HTTP /api/eyetrackers/start| API
    FE -->|HTTP /api/eyetrackers/stop| API
    FE <-->|WebSocket /ws| WS[WebSocket Endpoint]

    API --> PUB[IEyeTrackerPublisher]
    PUB --> SESS[IExperimentSessionManager]
    WS --> SESS

    SESS --> EYE[IEyeTrackerManager]
    EYE --> TOBII[TobiiEyeTrackerManager]
    TOBII --> SDK[Tobii SDK / Device]

    TOBII -->|GazeDataReceived event| SESS
    SESS --> BROAD[IClientBroadcaster]
    BROAD --> WSMSG[WebSocketRealtimeMessenger]
    WSMSG --> FE

    SESS --> SNAP[IExperimentStateStore]
    SNAP --> FILE[(File/InMemory Live Replay)]
```

## Request and Data Flow
```mermaid
sequenceDiagram
    participant F as Frontend
    participant A as Web API
    participant S as ExperimentSessionManager
    participant T as TobiiEyeTrackerManager
    participant D as Tobii Device

    F->>A: POST /api/eyetrackers/start
    A->>S: StartSessionAsync()
    S->>T: Subscribe GazeDataReceived
    S->>T: StartEyeTracking()
    T->>D: Begin SDK stream
    S-->>F: experimentStarted (via /ws)

    loop While session active
        D-->>T: Gaze sample
        T-->>S: GazeDataReceived(GazeData)
        S-->>F: gazeSample envelope via /ws
    end

    F->>A: POST /api/eyetrackers/stop
    A->>S: StopSessionAsync()
    S->>T: StopEyeTracking()
    S-->>F: experimentStopped (via /ws)
```

## Eye-Tracker Data Collection
Data collection is driven by `TobiiEyeTrackerManager`:

- On **Windows**, it uses `Tobii.Research` APIs.
- `StartEyeTracking()` discovers connected trackers and picks the first available tracker.
- It attempts to load/apply a Tobii license file if present.
- It subscribes to Tobii SDK's `GazeDataReceived` callback.
- Each SDK callback is mapped into backend `GazeData` and raised through `IEyeTrackerManager.GazeDataReceived`.

`GazeData` fields currently produced:

- `deviceTimeStamp`
- `leftEyeX`, `leftEyeY`, `leftEyeValidity`
- `rightEyeX`, `rightEyeY`, `rightEyeValidity`

On **non-Windows** environments, the manager is a mock implementation (device discovery mock + no real Tobii stream).

## Session Lifecycle and Realtime Routing
`ExperimentSessionManager` is the core orchestrator:

- Guards start/stop with a `SemaphoreSlim` lifecycle gate.
- Tracks active session metadata (`sessionId`, start/stop timestamps, sample count, latest sample).
- Subscribes/unsubscribes to `GazeDataReceived` when session starts/stops.
- Broadcasts realtime events using `IClientBroadcaster`.

Broadcast behavior:

- On start: emits `experimentStarted` with full snapshot.
- During run: emits `gazeSample` for each incoming gaze event.
- On stop: emits `experimentStopped` with full snapshot.

## Transport Contracts
### REST APIs
All FastEndpoints are prefixed with `/api`:

- `GET /api/eyetrackers`: returns `EyeTrackerDevice[]`.
- `POST /api/eyetrackers/start`: starts session/tracking.
- `POST /api/eyetrackers/stop`: stops session/tracking.

### WebSocket Endpoint
- URL: `/ws` (no `/api` prefix).
- Inbound frame format:
```json
{
  "type": "startExperiment",
  "payload": {}
}
```
- Outbound frame format:
```json
{
  "type": "gazeSample",
  "sentAtUnixMs": 1740000000000,
  "payload": {
    "deviceTimeStamp": 123,
    "leftEyeX": 0.42,
    "leftEyeY": 0.51,
    "leftEyeValidity": "Valid",
    "rightEyeX": 0.44,
    "rightEyeY": 0.52,
    "rightEyeValidity": "Valid"
  }
}
```

Supported inbound `type` values include:

- `ping`
- `startExperiment`
- `stopExperiment`
- `getExperimentState`
- `researcherCommand` (`payload.command` can be start/stop)

Common outbound `type` values include:

- `pong`
- `experimentStarted`
- `experimentStopped`
- `experimentState`
- `gazeSample`
- `error`

## Persistence and Live Replay File
Realtime persistence now keeps one active replay-ready JSON file for the running session.

- Provider is configurable: `File` (default) or `InMemory`.
- Save cadence is configurable via `RealtimePersistence.ActiveReplaySaveIntervalMilliseconds`.
- File mode writes the current partial replay export to a per-session folder under `RealtimePersistence.ActiveReplayDirectoryPath`.
- The live file uses the same `rtr.experiment-export` schema that the replay page imports.
- The default live-save cadence is `10000ms` to avoid synchronous UI-impacting writes on every reading event.

The default layout is:

- `data/live-experiments/<sessionId>/experiment-session-live.json`
- `data/latest/experiment-session-export.json`
- `data/saved-exports/<saved-export-files>`

During the experiment, the backend continuously rewrites that file so the current run is durable even before `Finish experiment` is clicked. On normal finish, the backend flushes the live replay JSON, uses it to produce the final JSON/CSV export outputs, saves the latest completed export, and clears the active live file.

If the backend stops unexpectedly, startup does not restore the unfinished run into the current session. The frontend returns to its normal idle state, while the unfinished replay-ready JSON remains on disk for manual replay use.

## Key Practical Notes
- WebSocket is required for realtime gaze ingestion on frontend.
- REST `start/stop` and WebSocket `startExperiment/stopExperiment` both control the same session manager.
- If there is no Tobii device on Windows, start will fail.
- If running on non-Windows, you will not receive real Tobii gaze samples.
