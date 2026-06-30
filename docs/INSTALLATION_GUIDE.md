# Reading the Reader — Installation Guide

A setup handbook for getting the Reading the Reader adaptive reading platform running on a
researcher machine, from a clean checkout to a verified, experiment-ready system.

## 1. Overview

The platform is a small distributed system made up of a few cooperating parts:

- a **backend** service (.NET / ASP.NET Core) that owns the experiment session and the realtime
  channel;
- a **frontend** web application (Next.js, served with Bun) that the researcher and participant
  use in the browser;
- the **Tobii eye tracker** and its Windows-only SDK, used for real eye-tracking sessions;
- two **optional external services** (Python) that demonstrate the pluggable decision and
  eye-analysis seams.

There are two supported ways to install and run the system:

1. **One-command launch** with the bundled scripts (recommended for most cases).
2. **Manual, component-by-component setup**, useful for development or troubleshooting.

> **Note:** Real Tobii experiments must be run on **Windows**, because the Tobii SDK and USB
> device access are Windows-bound. macOS and Linux can run the same stack in **mouse / demo
> mode** (synthetic gaze), but not with real hardware.

## 2. Prerequisites

Install the following before you begin. Versions are the ones the project is developed and tested
against.

| Component | Requirement | Needed for |
|--------------------|-------------------------------|------------------------------------|
| **Operating system** | Windows 11 (recommended). macOS / Linux work for mouse / demo mode only. | Real Tobii sessions require Windows. |
| **.NET SDK** | .NET 10 SDK | Backend build and run. |
| **Bun** | 1.3 or newer | Frontend install, dev, and build. |
| **Git** | Any recent version | Cloning the repository. |
| **Python** | 3.11 or newer | Optional external services only. |
| **Browser** | A Chromium-based browser | Running the app; fullscreen is required for calibration. |
| **Tobii eye tracker** | A Tobii Pro screen-based tracker or a Tobii Eye Tracker 4C, with its Tobii software and a device **licence file** | Real eye-tracking sessions (Windows). |

Supported eye-tracker hardware is covered in [Section 6](#6-tobii-eye-tracker-setup).

## 3. Getting the Source

Clone the monorepo and move into it:

```bash
git clone https://github.com/MrSachin7/reading-the-reader-monorepo.git
cd reading-the-reader-monorepo
```

The repository is organised into independent roots, the most relevant of which are:

| Folder | Contents |
|------------------------------------------|----------------------------------------------------------|
| `Backend/` | The .NET backend solution, source, and tests. |
| `Frontend/` | The Next.js frontend application. |
| `Decision-Maker/` | The optional mock external decision-provider service (Python). |
| `Eye-Movement-Analyzer/` | The optional mock external eye-analysis service (Python). |
| `scripts/` | One-command launchers for the frontend and backend together. |
| `docs/` | Project documentation, including this guide. |

## 4. Quick Start (One-Command Launch)

This is the recommended path. From the **repository root**, in PowerShell on Windows:

```powershell
.\scripts\start-dev.ps1 -Install -OpenBrowser
```

This single command:

- restores and installs backend and frontend dependencies (because of `-Install`);
- starts the **backend** at `http://localhost:5190`;
- starts the **frontend** at `http://localhost:3000`;
- points frontend REST calls at `http://localhost:5190/api` and WebSocket traffic at
  `ws://localhost:5190/ws`;
- opens the app in your browser (because of `-OpenBrowser`).

On later runs you can drop `-Install` and simply run `.\scripts\start-dev.ps1`. A non-Windows
shell equivalent exists for mouse / demo workflows:

```bash
INSTALL=1 ./scripts/start-dev.sh
```

You can override the defaults, for example to avoid a port clash:

```powershell
.\scripts\start-dev.ps1 -BackendUrl "http://localhost:5191" -FrontendPort 3001
```

## 5. Manual Setup (Component by Component)

Use this path for development, or when you want to start the services in separate terminals.

### 5.1 Backend

From the repository root:

```bash
cd Backend
dotnet build reading-the-reader-backend.sln
dotnet run --project src/ReadingTheReader.WebApi/ReadingTheReader.WebApi.csproj
```

The backend listens on `http://localhost:5190`. The interactive API documentation (Swagger UI) is
served at `http://localhost:5190/swagger`, which is a quick way to confirm the backend is up.

### 5.2 Frontend

In a second terminal, from the repository root:

```bash
cd Frontend
bun install
bun dev
```

Open `http://localhost:3000`. The frontend reads two environment variables to find the backend;
they default to a local backend, so no configuration is needed for the standard local setup:

| Variable | Default | Purpose |
|------------------------------------|----------------------------------|------------------------------|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:5190/api` | Base URL for backend REST calls. |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:5190/ws` | Backend realtime WebSocket endpoint. |

To point the frontend at a non-default backend, create a `Frontend/.env.local` file:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:5191/api
NEXT_PUBLIC_WS_URL=ws://localhost:5191/ws
```

## 6. Tobii Eye Tracker Setup

This section applies only to real eye-tracking sessions on Windows. For mouse / demo mode you can
skip it (see the User Guide, Sensing Modes).

The platform integrates the **Tobii Pro SDK** (the `Tobii.Research` library), so it works with two
families of device:

| Device | Notes |
|------------------------------------------|----------------------------------------------------------|
| **Tobii Pro** screen-based eye trackers | Research-grade devices supported directly by the Tobii Pro SDK. |
| **Tobii Eye Tracker 4C** | Consumer device, usable through the same SDK once it is licensed for analytical use. |

The setup is the same for both; only the Tobii software and the licence differ by device:

1. Install the Tobii software appropriate to your device on the Windows machine, and use it to
   confirm the device is detected.
2. Connect the device by USB.
3. Have the device **licence file** ready. You upload it inside the app during experiment setup
   (see the User Guide, Step 1 — Choose eyetracker).

Once the device is connected and licensed, the application discovers it in **Step 1** of the
experiment stepper, where the licence file is uploaded and calibration is later run.

## 7. Production Build Mode

To run optimised builds instead of the development servers, use the production launcher from the
repository root:

```powershell
.\scripts\start-production.ps1 -Install
```

This first **builds** both applications and only starts the servers if the builds succeed:

- frontend: `bun run build`, then served with `bun run start`;
- backend: `dotnet build --configuration Release`, then run with `--configuration Release --no-build`.

Build output and any errors stay visible in the terminal. A non-Windows shell equivalent
(`./scripts/start-production.sh`) is also available.

## 8. Optional: External Decision and Analysis Services

These two Python services are **mocks** that demonstrate the platform's pluggable provider seam.
They are not required to run experiments; install them only if you want to exercise the external
decision or eye-analysis modes (see the User Guide, Runtime Plugins).

### 8.1 Decision-Maker

```bash
cd Decision-Maker
python -m venv .venv
.venv\Scripts\activate
pip install -e .
python -m decision_maker
```

It connects to the backend provider WebSocket at `ws://localhost:5190/ws/module-provider`. Its
shared secret must match the backend's module-provider secret (the default is
`change-me-local-module-provider-secret`); configure it through the service's `.env` values.

### 8.2 Eye-Movement-Analyzer

```bash
cd Eye-Movement-Analyzer
python -m venv .venv
.venv\Scripts\activate
pip install -e .
python -m eye_movement_analyzer
```

It registers with the backend as the `fixation-analysis` module and, like the Decision-Maker, must
share the backend's module-provider secret.

With either service running, select it in **Step 2** of the experiment stepper; the runtime-plugin
status badges then show it as **Connected**.

## 9. Verifying the Installation

Confirm the install with a quick end-to-end check:

1. **Backend up** — open `http://localhost:5190/swagger` and confirm the API documentation loads.
2. **Frontend up** — open `http://localhost:3000` and confirm the app home screen loads.
3. **End-to-end demo** — switch **Settings → Input mode** to **Use mouse mode** and run a short
   session, following the Quick Start in the User Guide. This exercises the full pipeline without
   hardware.

## 10. Troubleshooting

**`bun` is not recognised.**
Bun is not installed or not on `PATH`. Install Bun, then open a new terminal so the updated `PATH`
is picked up.

**`dotnet` build fails or reports the wrong SDK.**
Confirm the **.NET 10 SDK** is installed (`dotnet --info`). Older SDKs will not build the solution.

**A port is already in use (5190 or 3000).**
Another process is bound to the port. Stop it, or override the ports with `-BackendUrl` and
`-FrontendPort` (PowerShell) or `BACKEND_URL` and `FRONTEND_PORT` (shell).

**The frontend loads but cannot reach the backend.**
Check that the backend is running on `http://localhost:5190` and that
`NEXT_PUBLIC_API_BASE_URL` / `NEXT_PUBLIC_WS_URL` match the backend address. The backend only
allows local origins by default.

**The Tobii device is not detected in Step 1.**
Confirm the device is connected and visible in Tobii's own software, that the licence file is
valid, and use the refresh control in Step 1 to re-scan.

**An external service will not connect.**
Confirm the service's WebSocket URL points at `ws://localhost:5190/ws/module-provider` and that its
shared secret matches the backend's module-provider secret.
