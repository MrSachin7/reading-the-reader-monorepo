# Overleaf sync on Windows — quick guide

This repo's thesis (`Master-Thesis-Report/`) is mirrored to an Overleaf project
so supervisors can read and comment on it. You sync it with a small PowerShell
script: `scripts/overleaf-sync.ps1`. It works **both ways** — you push your
writing up, and pull supervisors' text edits back down.

## 1. One-time setup (do this once)

1. **Install Git for Windows** if you don't have it: https://git-scm.com/download/win
   (this also installs Git Credential Manager, which remembers your token).

2. **Get an Overleaf git token.** In Overleaf:
   `Account Settings → Git Integration → Generate token`. Copy it somewhere safe.

3. **Add the Overleaf remote** (run in the repo, e.g. in PowerShell or Git Bash):
   ```powershell
   git remote add overleaf https://git@git.overleaf.com/6a3cf173af8593f3a4540368
   ```

4. **Establish your local baseline** by doing the first push (see below). The very
   first time git talks to Overleaf it will pop up a login prompt:
   - **Username:** `git`
   - **Password:** paste the **token** from step 2 (not your Overleaf password)

   Credential Manager saves it, so you won't be asked again.

## 2. Everyday use

Run these from the repo root in **PowerShell**:

```powershell
# See whether you're in sync, ahead, or behind
./scripts/overleaf-sync.ps1 status

# Send your thesis changes up to Overleaf
./scripts/overleaf-sync.ps1 push

# Bring supervisors' edits down into the repo
./scripts/overleaf-sync.ps1 pull
```

**Golden rule for `push`:** commit your `Master-Thesis-Report/` changes in git
first. `push` only sends committed work — it will refuse if you have uncommitted
changes in that folder.

A normal session looks like:
```powershell
git add Master-Thesis-Report
git commit -m "write evaluation section"
./scripts/overleaf-sync.ps1 push
```

## 3. Good to know

- **Supervisor comments don't come down.** The yellow margin comments /
  suggestions in Overleaf live only inside Overleaf — read those in the Overleaf
  website. Only actual changes to the `.tex` text sync via `pull`.
- **Pull before you push if you're behind.** If `status` says *"Overleaf has
  unpulled changes"*, run `pull` first. `push` will refuse otherwise, so you can't
  accidentally overwrite a supervisor's edit.
- **First command should be `status`.** It's read-only and safe — a good way to
  check everything is wired up before pushing.

## 4. If something goes wrong

| Symptom | Fix |
|---|---|
| `running scripts is disabled on this system` | Run PowerShell once as: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| Asked for username/password every time | Make sure Git Credential Manager is installed (comes with Git for Windows). Username is `git`, password is the **token**. |
| `no sync baseline; run push first` | Expected on a fresh clone — do a `push` once to create the baseline. |
| `merge conflicts between your edits and Overleaf` | You and a supervisor changed the same lines. Run the `git merge-tree` command it prints, or ask Sachin to help reconcile. |
| `Overleaf has changes you haven't pulled yet` | Run `./scripts/overleaf-sync.ps1 pull` first, then `push`. |

That's it. When in doubt: `status` first, commit before `push`, and read margin
comments on the Overleaf website.
