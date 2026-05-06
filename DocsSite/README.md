# DocsSite

Standalone hosted documentation app for the Reading the Reader monorepo.

## Commands

```bash
bun install
bun run dev
bun run build
```

The static export is generated into `out/` and is intended for GitHub Pages deployment.

## App Launch Documentation

The main application launch scripts live in the repository root `scripts/` folder:

- `scripts/start-dev.ps1` for Windows development and Tobii hardware mode
- `scripts/start-production.ps1` for Windows production-build mode
- `scripts/start-dev.sh` and `scripts/start-production.sh` for shell/mock workflows

The detailed operating notes are documented in the docs site under `/development/local-setup/`.
