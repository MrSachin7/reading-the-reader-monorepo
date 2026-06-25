#!/usr/bin/env pwsh
#
# Sync the Master-Thesis-Report subfolder with an Overleaf project, both ways.
# PowerShell port of scripts/overleaf-sync.sh (for Windows). Same behaviour.
#
# Overleaf's git bridge forbids force-push and the thesis is a subfolder of this
# monorepo, so plain `git subtree` can't be seeded here. Instead this script syncs
# at the tree level: each push creates a commit whose tree is exactly the thesis
# subfolder, parented on Overleaf's current head (always a fast-forward). Pull does
# a real 3-way merge against the last synced point and writes the result back into
# the subfolder. No monorepo branch checkouts, no force-push.
#
# One-time setup:
#   git remote add overleaf https://git@git.overleaf.com/<PROJECT-ID>
#   # On Windows, Git Credential Manager stores the token on first push/pull:
#   # when prompted, username = git, password = your Overleaf git token
#   # (Overleaf -> Account Settings -> Git Integration -> Generate token).
#   # The baseline ref refs/overleaf/synced is created by the first push.
#
# Usage (run from anywhere in the repo):
#   ./scripts/overleaf-sync.ps1 push     # send committed thesis changes to Overleaf
#   ./scripts/overleaf-sync.ps1 pull      # bring supervisor edits back into the monorepo
#   ./scripts/overleaf-sync.ps1 status    # compare local / overleaf / last-synced trees
#
# Notes:
#   * Commit your Master-Thesis-Report changes before pushing (push only sends commits).
#   * refs/overleaf/synced is local-only state. It lives in this clone; if you sync
#     from a different machine, run a push there first to establish the baseline.

param(
    [Parameter(Position = 0)]
    [string]$Command = ""
)

$ErrorActionPreference = "Stop"
# Keep native git exit codes from throwing (PowerShell 7.4+): we inspect
# $LASTEXITCODE ourselves, and several git calls exit non-zero by design
# (git diff --quiet, rev-parse on a missing ref, merge-tree on conflict).
$PSNativeCommandUseErrorActionPreference = $false

$Prefix    = "Master-Thesis-Report"
$Remote    = "overleaf"
$Branch    = "main"
$SyncedRef = "refs/overleaf/synced"

function Die([string]$msg) {
    Write-Error "error: $msg"
    exit 1
}

# Operate from the repository root.
$repoRoot = (git -C $PSScriptRoot rev-parse --show-toplevel)
if ($LASTEXITCODE -ne 0) { Die "not inside a git repository" }
Set-Location $repoRoot.Trim()

function Require-CleanPrefix {
    git diff --quiet -- $Prefix
    $unstaged = $LASTEXITCODE
    git diff --cached --quiet -- $Prefix
    $staged = $LASTEXITCODE
    if ($unstaged -ne 0 -or $staged -ne 0) {
        Die "uncommitted changes under $Prefix/. Commit them first."
    }
}

function Remote-Tree { (git rev-parse "$Remote/$Branch^{tree}").Trim() }
function Local-Tree  { (git rev-parse "HEAD:$Prefix").Trim() }
function Synced-Tree {
    $t = git rev-parse "$SyncedRef^{tree}" 2>$null
    if ($LASTEXITCODE -ne 0) { return "none" }
    return $t.Trim()
}

switch ($Command) {

    "push" {
        Require-CleanPrefix
        git fetch -q $Remote $Branch
        if ((Remote-Tree) -ne (Synced-Tree)) {
            Die "Overleaf has changes you haven't pulled yet. Run '$PSCommandPath pull' first."
        }
        if ((Local-Tree) -eq (Remote-Tree)) {
            Write-Host "Already up to date."
            exit 0
        }
        $remoteHead = (git rev-parse "$Remote/$Branch").Trim()
        $new = (git commit-tree (Local-Tree) -p $remoteHead -m "Sync thesis from monorepo").Trim()
        git push $Remote "$($new):$Branch"
        if ($LASTEXITCODE -ne 0) { Die "push to Overleaf failed" }
        git update-ref $SyncedRef $new
        git fetch -q $Remote $Branch
        Write-Host "Pushed thesis to Overleaf."
    }

    "pull" {
        Require-CleanPrefix
        git fetch -q $Remote $Branch
        $base = git rev-parse $SyncedRef 2>$null
        if ($LASTEXITCODE -ne 0) { Die "no sync baseline; run '$PSCommandPath push' first." }
        $base = $base.Trim()
        if ((Remote-Tree) -eq (Synced-Tree)) {
            Write-Host "No new Overleaf changes."
            exit 0
        }
        $ours   = (git commit-tree (Local-Tree) -m ours).Trim()
        $theirs = (git rev-parse "$Remote/$Branch").Trim()
        $merged = git merge-tree --write-tree --merge-base=$base $ours $theirs 2>$null
        if ($LASTEXITCODE -ne 0) {
            Die ("merge conflicts between your edits and Overleaf. Resolve manually:`n" +
                 "  git merge-tree --write-tree --merge-base=$base $ours $theirs")
        }
        $merged = ($merged | Select-Object -First 1).Trim()
        git rm -r -q --cached $Prefix | Out-Null
        git read-tree --prefix="$Prefix/" $merged
        git checkout -q -- $Prefix
        git commit -q -m "Pull supervisor edits from Overleaf"
        # Converge: push the merged result so Overleaf matches and advance the baseline.
        $remoteHead = (git rev-parse "$Remote/$Branch").Trim()
        $new = (git commit-tree (Local-Tree) -p $remoteHead -m "Sync merged thesis from monorepo").Trim()
        git push $Remote "$($new):$Branch"
        if ($LASTEXITCODE -ne 0) { Die "push of merged result to Overleaf failed" }
        git update-ref $SyncedRef $new
        git fetch -q $Remote $Branch
        Write-Host "Pulled supervisor edits and reconciled with Overleaf."
    }

    "status" {
        git fetch -q $Remote $Branch
        $local  = Local-Tree
        $remote = Remote-Tree
        $synced = Synced-Tree
        Write-Host "local subfolder tree : $local"
        Write-Host "overleaf tree        : $remote"
        Write-Host "last synced tree     : $synced"
        if ($local -eq $remote) {
            Write-Host "=> in sync"
        } elseif ($remote -ne $synced) {
            Write-Host "=> Overleaf has unpulled changes (run pull)"
        } else {
            Write-Host "=> local has unpushed changes (run push)"
        }
    }

    default {
        Write-Host "usage: ./scripts/overleaf-sync.ps1 {push|pull|status}"
        Write-Host "  push    send committed Master-Thesis-Report changes to Overleaf"
        Write-Host "  pull    bring supervisor edits from Overleaf into the monorepo"
        Write-Host "  status  compare local / overleaf / last-synced trees"
        exit 1
    }
}
