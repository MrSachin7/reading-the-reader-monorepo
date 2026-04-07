# Reading The Reader Monorepo

This workspace now contains the full Reading The Reader application as a single repository.

## Structure

- `Backend/` - .NET backend solution, source code, tests, and backend-specific repo files
- `Frontend/` - Next.js frontend app and frontend-specific repo files
- `Decision-Maker/` - Python mock external decision-provider service
- `docs/` - shared project documentation moved to the root of the monorepo
- `.github/` - root-level GitHub Actions workflows
- `.codex/` - root-level Codex config for the monorepo

## Common Workflows

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
