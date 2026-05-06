# Reading The Reader Monorepo

This workspace now contains the full Reading The Reader application as a single repository.

## Structure

- `Backend/` - .NET backend solution, source code, tests, and backend-specific repo files
- `Frontend/` - Next.js frontend app and frontend-specific repo files
- `Decision-Maker/` - Python mock external decision-provider service
- `scripts/` - one-command local launchers for the frontend and backend
- `docs/` - shared project documentation moved to the root of the monorepo
- `.github/` - root-level GitHub Actions workflows
- `.codex/` - root-level Codex config for the monorepo

## Common Workflows

### One-command application launch

The safest launch path for this thesis project is a host-side script, not Docker, because real Tobii hardware support depends on the Windows-only Tobii SDK and Windows USB/device access.

Development mode on Windows:

```powershell
.\scripts\start-dev.ps1
```

Production build mode on Windows:

```powershell
.\scripts\start-production.ps1
```

Both scripts start:

- the backend at `http://localhost:5190`
- the frontend at `http://localhost:3000`
- frontend API calls against `http://localhost:5190/api`
- frontend WebSocket traffic against `ws://localhost:5190/ws`

Use `-Install` on first run to install/restore dependencies:

```powershell
.\scripts\start-dev.ps1 -Install
.\scripts\start-production.ps1 -Install
```

Use `-OpenBrowser` to open the frontend after startup:

```powershell
.\scripts\start-dev.ps1 -OpenBrowser
```

Shell equivalents are available for non-Windows or mock/demo workflows:

```bash
./scripts/start-dev.sh
./scripts/start-production.sh
```

Real Tobii experiment mode should be run on Windows. The shell scripts can start the same application stack where the required SDK/runtime exists, but they should not be treated as a guarantee of real hardware support on macOS or Linux.

Production mode builds first and only starts servers if the builds succeed:

- frontend: `bun run build`, then `bun run start`
- backend: `dotnet build --configuration Release`, then `dotnet run --configuration Release --no-build`

Build output and errors remain visible in the terminal that launched the script.

### Backend

```bash
cd Backend
dotnet build reading-the-reader-backend.sln
dotnet test reading-the-reader-backend.sln
```

### Frontend

```bash
cd Frontend
bun install
bun dev
```

### Decision-Maker

```bash
cd Decision-Maker
python -m venv .venv
.venv\Scripts\activate
pip install -e .
python -m decision_maker
```

## Documentation

Project docs now live under the root `docs/` folder:

- `docs/backend/` - backend architecture and integration notes
- `docs/frontend/` - thesis and requirements docs

## Notes

- The previous nested frontend and backend Git repositories were removed.
- The backend solution still includes the documentation project, but it now resolves it from the root-level `docs/` folder.
- Root-level CI workflows now live in `.github/workflows/`.
- Docker is useful for mock/replay/demo workflows, but it is not the default hardware path because Docker Desktop normally runs Linux containers through a VM and does not remove the Tobii SDK platform constraint.
