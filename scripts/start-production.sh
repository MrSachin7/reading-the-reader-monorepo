#!/usr/bin/env bash
set -euo pipefail

BACKEND_URL="${BACKEND_URL:-http://localhost:5190}"
BACKEND_URL="${BACKEND_URL%/}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
INSTALL="${INSTALL:-0}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$REPO_ROOT/Frontend"
BACKEND_DIR="$REPO_ROOT/Backend"
BACKEND_PROJECT="$BACKEND_DIR/src/ReadingTheReader.WebApi/ReadingTheReader.WebApi.csproj"
API_BASE_URL="$BACKEND_URL/api"

if [[ "$BACKEND_URL" == https://* ]]; then
  WS_URL="wss://${BACKEND_URL#https://}/ws"
else
  WS_URL="ws://${BACKEND_URL#http://}/ws"
fi

command -v dotnet >/dev/null 2>&1 || {
  echo "dotnet was not found on PATH. Install the .NET SDK before running this script." >&2
  exit 1
}

command -v bun >/dev/null 2>&1 || {
  echo "bun was not found on PATH. Install Bun before running this script." >&2
  exit 1
}

if [[ ! -d "$FRONTEND_DIR" ]]; then
  echo "Frontend directory not found at $FRONTEND_DIR" >&2
  exit 1
fi

if [[ ! -f "$BACKEND_PROJECT" ]]; then
  echo "Backend project not found at $BACKEND_PROJECT" >&2
  exit 1
fi

if [[ "$INSTALL" == "1" ]]; then
  echo ""
  echo "==> Install frontend dependencies"
  (cd "$FRONTEND_DIR" && bun install)

  echo ""
  echo "==> Restore backend dependencies"
  (cd "$BACKEND_DIR" && dotnet restore "./reading-the-reader-backend.sln")
fi

echo ""
echo "==> Build frontend production bundle"
(
  cd "$FRONTEND_DIR"
  NEXT_PUBLIC_API_BASE_URL="$API_BASE_URL" \
  NEXT_PUBLIC_WS_URL="$WS_URL" \
  bun run build
)

echo ""
echo "==> Build backend Release configuration"
(cd "$BACKEND_DIR" && dotnet build "./reading-the-reader-backend.sln" --configuration Release)

cleanup() {
  jobs -p | xargs -r kill
}
trap cleanup EXIT INT TERM

echo ""
echo "Starting backend at $BACKEND_URL"
ASPNETCORE_ENVIRONMENT=Production \
  dotnet run --project "$BACKEND_PROJECT" --configuration Release --no-build --urls "$BACKEND_URL" &

echo "Starting frontend at http://localhost:$FRONTEND_PORT"
echo "Frontend API base URL: $API_BASE_URL"
echo "Frontend WebSocket URL: $WS_URL"
(
  cd "$FRONTEND_DIR"
  NEXT_PUBLIC_API_BASE_URL="$API_BASE_URL" \
  NEXT_PUBLIC_WS_URL="$WS_URL" \
  bun run start --port "$FRONTEND_PORT"
) &

wait
