# Module Provider Sample Client

Minimal smoke test for the generic module-provider framework (`/ws/module-provider`).

Purpose: verify the wire is alive, the framework correctly accepts/rejects hellos based on registered modules, and the handshake protocol works end-to-end.

## Prerequisites

- Backend running locally (`dotnet run` from `Backend/src/ReadingTheReader.WebApi/`)
- Node 18+ (`node --version`)

## Run

```bash
node handshake-smoke-test.js
```

## What it does

The smoke test runs four scenarios against the live backend:

1. **Unknown module** — sends a hello declaring a module the backend has never heard of. Expects `unknown-module` error and connection close.
2. **Wrong shared secret** — expects `auth-failed` error.
3. **Wrong framework protocol version** — expects `protocol-mismatch` error.
4. **No modules in hello** — expects `invalid-payload` error.

In Phase 2 no real modules are registered yet, so all scenarios should fail in predictable ways. Phase 3 will add the first real module (facial state); at that point a fifth scenario will exercise the happy path.

## Configuration

Set `WS_URL` env var to point at a non-default backend (default: `ws://localhost:5190/ws/module-provider`).
Set `SHARED_SECRET` to match the backend's `ModuleProvider:SharedSecret` config (default: `change-me-local-module-provider-secret`).
