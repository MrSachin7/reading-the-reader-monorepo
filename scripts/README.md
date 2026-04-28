# Local launch scripts

Use these scripts to start the frontend and backend together from the repository root.

## Windows hardware/development mode

```powershell
.\scripts\start-dev.ps1
```

Optional first-time dependency restore/install:

```powershell
.\scripts\start-dev.ps1 -Install
```

Open the browser after starting:

```powershell
.\scripts\start-dev.ps1 -OpenBrowser
```

This is the recommended path for real Tobii experiments because the Tobii SDK and USB device access are Windows-bound.

## Shell development mode

```bash
./scripts/start-dev.sh
```

Optional first-time dependency restore/install:

```bash
INSTALL=1 ./scripts/start-dev.sh
```

This starts the same app stack, but real Tobii hardware support still depends on the host OS and SDK availability.

## Production build mode

Windows:

```powershell
.\scripts\start-production.ps1
```

Shell:

```bash
./scripts/start-production.sh
```

These scripts first build both applications in the current terminal:

- frontend: `bun run build` with `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_WS_URL` set, then served with `bun run start`
- backend: `dotnet build --configuration Release`, then run with `--configuration Release --no-build`

Build output and errors stay visible in the terminal. If either build fails, the script stops before starting any servers.

## Defaults

- Backend: `http://localhost:5190`
- Frontend: `http://localhost:3000`
- Frontend API URL: `http://localhost:5190/api`
- Frontend WebSocket URL: `ws://localhost:5190/ws`

You can override the defaults:

```powershell
.\scripts\start-dev.ps1 -BackendUrl "http://localhost:5191" -FrontendPort 3001
```

```bash
BACKEND_URL=http://localhost:5191 FRONTEND_PORT=3001 ./scripts/start-dev.sh
```
