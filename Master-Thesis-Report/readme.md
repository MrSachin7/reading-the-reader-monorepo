# How do I change the information in the template?
Setup/Statics.tex

# Where can I suggest changes?
latex-support@student.dtu.dk

# Where can I go for help?
Check http://latex.dtu.dk/ for open office hours or send your question via email (latex-support@student.dtu.dk) or Facebook messenger (https://www.facebook.com/DTULatex/)

# Overleaf sync (for supervisor feedback)

This chapter folder is mirrored to an Overleaf project so supervisors can
read and comment on the thesis. The sync is bidirectional and runs through
`scripts/overleaf-sync.sh` at the monorepo root (not `git subtree`).

Commands (run from the monorepo root):

- `scripts/overleaf-sync.sh push` — send committed `Master-Thesis-Report/`
  changes up to Overleaf. Commit first; `push` only sends commits.
- `scripts/overleaf-sync.sh pull` — bring supervisor **text edits** back
  into the monorepo (does a 3-way merge; warns on conflicts).
- `scripts/overleaf-sync.sh status` — show whether local / Overleaf are in
  sync and who is ahead.

On **Windows**, use the PowerShell port with the same subcommands:
`./scripts/overleaf-sync.ps1 push|pull|status`. On first run Git Credential
Manager prompts for the Overleaf token (username `git`, password = token).

How it works: Overleaf forbids force-push and the thesis is a subfolder of
this monorepo, so plain `git subtree` cannot be seeded. The script instead
syncs at the tree level — each push commits the subfolder's tree directly
on top of Overleaf's head (always a fast-forward), and pull merges against
a local baseline ref (`refs/overleaf/synced`).

Notes:

- **Overleaf margin comments do not sync** — they live only in Overleaf's
  database. Read those in the Overleaf web UI. Only `.tex` edits flow back
  via `pull`.
- Auth uses an Overleaf git token stored in the macOS keychain. If it
  expires, regenerate it (Overleaf → Account Settings → Git Integration).
- `refs/overleaf/synced` is local to this clone. If you ever sync from a
  different machine, run `push` there once to establish the baseline.

---
Last updated 07/02/2022 by s164419@student.dtu.dk