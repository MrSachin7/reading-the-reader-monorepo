#!/usr/bin/env bash
#
# Sync the Master-Thesis-Report subfolder with an Overleaf project, both ways.
#
# Overleaf's git bridge forbids force-push and the thesis is a subfolder of this
# monorepo, so plain `git subtree` can't be seeded here. Instead this script syncs
# at the tree level: each push creates a commit whose tree is exactly the thesis
# subfolder, parented on Overleaf's current head (always a fast-forward). Pull does
# a real 3-way merge against the last synced point and writes the result back into
# the subfolder. No monorepo branch checkouts, no force-push.
#
# One-time setup (already done once):
#   git remote add overleaf https://git@git.overleaf.com/<PROJECT-ID>
#   # token stored in macOS keychain: username 'git', password = Overleaf git token
#   # baseline ref refs/overleaf/synced is created by the first push
#
# Usage:
#   scripts/overleaf-sync.sh push     # send committed thesis changes to Overleaf
#   scripts/overleaf-sync.sh pull      # bring supervisor edits back into the monorepo
#   scripts/overleaf-sync.sh status    # compare local / overleaf / last-synced trees
#
# Notes:
#   * Commit your Master-Thesis-Report changes before pushing (push only sends commits).
#   * refs/overleaf/synced is local-only state. It lives in this clone; if you sync
#     from a different machine, run a push there first to establish the baseline.
#
set -euo pipefail

PREFIX="Master-Thesis-Report"
REMOTE="overleaf"
BRANCH="main"
SYNCED_REF="refs/overleaf/synced"

ROOT="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"
cd "$ROOT"

die() { echo "error: $*" >&2; exit 1; }

require_clean_prefix() {
  if ! git diff --quiet -- "$PREFIX" || ! git diff --cached --quiet -- "$PREFIX"; then
    die "uncommitted changes under $PREFIX/. Commit them first."
  fi
}

remote_tree() { git rev-parse "$REMOTE/$BRANCH^{tree}"; }
synced_tree() { git rev-parse "$SYNCED_REF^{tree}" 2>/dev/null || echo "none"; }
local_tree()  { git rev-parse "HEAD:$PREFIX"; }

cmd="${1:-}"
case "$cmd" in
  push)
    require_clean_prefix
    git fetch -q "$REMOTE" "$BRANCH"
    if [ "$(remote_tree)" != "$(synced_tree)" ]; then
      die "Overleaf has changes you haven't pulled yet. Run '$0 pull' first."
    fi
    if [ "$(local_tree)" = "$(remote_tree)" ]; then
      echo "Already up to date."
      exit 0
    fi
    new=$(git commit-tree "$(local_tree)" -p "$(git rev-parse "$REMOTE/$BRANCH")" -m "Sync thesis from monorepo")
    git push "$REMOTE" "$new":"$BRANCH"
    git update-ref "$SYNCED_REF" "$new"
    git fetch -q "$REMOTE" "$BRANCH"
    echo "Pushed thesis to Overleaf."
    ;;

  pull)
    require_clean_prefix
    git fetch -q "$REMOTE" "$BRANCH"
    base=$(git rev-parse "$SYNCED_REF" 2>/dev/null) || die "no sync baseline; run '$0 push' first."
    if [ "$(remote_tree)" = "$(synced_tree)" ]; then
      echo "No new Overleaf changes."
      exit 0
    fi
    ours=$(git commit-tree "$(local_tree)" -m ours)
    theirs=$(git rev-parse "$REMOTE/$BRANCH")
    if merged=$(git merge-tree --write-tree --merge-base="$base" "$ours" "$theirs" 2>/dev/null); then
      git rm -r -q --cached "$PREFIX" >/dev/null
      git read-tree --prefix="$PREFIX/" "$merged"
      git checkout -q -- "$PREFIX"
      git commit -q -m "Pull supervisor edits from Overleaf"
      # Converge: push the merged result so Overleaf matches and advance the baseline.
      new=$(git commit-tree "$(local_tree)" -p "$(git rev-parse "$REMOTE/$BRANCH")" -m "Sync merged thesis from monorepo")
      git push "$REMOTE" "$new":"$BRANCH"
      git update-ref "$SYNCED_REF" "$new"
      git fetch -q "$REMOTE" "$BRANCH"
      echo "Pulled supervisor edits and reconciled with Overleaf."
    else
      die "merge conflicts between your edits and Overleaf. Resolve manually:
  git merge-tree --write-tree --merge-base=$base $ours $theirs"
    fi
    ;;

  status)
    git fetch -q "$REMOTE" "$BRANCH"
    echo "local subfolder tree : $(local_tree)"
    echo "overleaf tree        : $(remote_tree)"
    echo "last synced tree     : $(synced_tree)"
    if [ "$(local_tree)" = "$(remote_tree)" ]; then
      echo "=> in sync"
    elif [ "$(remote_tree)" != "$(synced_tree)" ]; then
      echo "=> Overleaf has unpulled changes (run pull)"
    else
      echo "=> local has unpushed changes (run push)"
    fi
    ;;

  *)
    cat >&2 <<EOF
usage: $0 {push|pull|status}
  push    send committed Master-Thesis-Report changes to Overleaf
  pull    bring supervisor edits from Overleaf into the monorepo
  status  compare local / overleaf / last-synced trees
EOF
    exit 1
    ;;
esac
