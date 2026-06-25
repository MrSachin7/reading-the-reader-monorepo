#!/usr/bin/env bash
#
# Sync the Master-Thesis-Report subfolder with an Overleaf project via git subtree.
#
# One-time setup (run once from the monorepo root):
#   git remote add overleaf https://git.overleaf.com/<PROJECT-ID>
#   ./Master-Thesis-Report/overleaf-sync.sh init     # first push, overwrites the blank Overleaf project
#
# Day-to-day:
#   ./Master-Thesis-Report/overleaf-sync.sh push     # send your committed thesis changes to Overleaf
#   ./Master-Thesis-Report/overleaf-sync.sh pull      # bring supervisor edits back into the monorepo
#
# Auth: when git prompts, username = git, password = your Overleaf git token
#       (Overleaf -> Account Settings -> Git Integration -> Generate token).
#
set -euo pipefail

PREFIX="Master-Thesis-Report"
REMOTE="overleaf"
BRANCH="main"   # this Overleaf project's git bridge branch

# Always operate from the monorepo root (one level up from this script).
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

require_clean() {
  if ! git diff --quiet -- "$PREFIX" || ! git diff --cached --quiet -- "$PREFIX"; then
    echo "error: you have uncommitted changes under $PREFIX/. Commit them first." >&2
    exit 1
  fi
}

cmd="${1:-}"
case "$cmd" in
  init)
    require_clean
    src_branch="$(git rev-parse --abbrev-ref HEAD)"
    echo ">> First-time push: force-pushing $PREFIX history to $REMOTE/$BRANCH"
    git push "$REMOTE" "$(git subtree split --prefix="$PREFIX" "$src_branch")":"$BRANCH" --force
    ;;
  push)
    require_clean
    git subtree push --prefix="$PREFIX" "$REMOTE" "$BRANCH"
    ;;
  pull)
    git subtree pull --prefix="$PREFIX" "$REMOTE" "$BRANCH" --squash
    ;;
  *)
    echo "usage: $0 {init|push|pull}" >&2
    exit 1
    ;;
esac
