#!/usr/bin/env python3
"""Before/after over-reposition scatter from the deterministic context-displacement sweep.

Companion to the live-session figure ``03_restore_overreposition`` (Fig. in the
Evaluation chapter). That one plots the *original* restore on real readers; this
one plots the same residual-vs-induced-displacement relationship for BOTH restore
versions from the controlled 66-trial sweep, so the fix is shown as vividly as the
problem.

Source data (committed): the on/off sweep run against each restore version,
``Frontend/experiments/context-displacement/results/onoff-{original,revised}-raw.json``.
For every intervention x reading position the sweep records the on-screen
displacement of the reading word with preservation OFF (``offDisplacementPx``,
the induced displacement) and ON (``onDisplacementPx``, the residual after the
restore). Points above the line of equality mean the restore moved the reader
*further* than the bare reflow did.

Run from Experiments/analysis with the analysis venv:
    .venv/bin/python 03b_restore_overreposition_fixed.py
"""
import json
from pathlib import Path

import matplotlib.pyplot as plt

import _lib

_lib.apply_style()

REPO_ROOT = Path(__file__).resolve().parents[2]
SWEEP = REPO_ROOT / "Frontend" / "experiments" / "context-displacement" / "results"


def load(name: str) -> list[tuple[float, float]]:
    rows = json.loads((SWEEP / name).read_text())["rows"]
    return [
        (r["offDisplacementPx"], r["onDisplacementPx"])
        for r in rows
        if r.get("offDisplacementPx") is not None and r.get("onDisplacementPx") is not None
    ]


orig = load("onoff-original-raw.json")
rev = load("onoff-revised-raw.json")

orig_over = sum(1 for x, y in orig if y > x)
rev_over = sum(1 for x, y in rev if y > x)
print(f"original: {orig_over}/{len(orig)} over-repositioned (ON > OFF)")
print(f"revised : {rev_over}/{len(rev)} over-repositioned (ON > OFF)")

fig, ax = plt.subplots(figsize=(5.6, 4.6))
lim = max(max(v for p in (orig, rev) for v, _ in p),
          max(v for p in (orig, rev) for _, v in p)) * 1.05 + 1
ax.plot([0, lim], [0, lim], ls="--", c="gray", lw=1,
        label="residual = induced displacement")
ax.scatter([x for x, _ in orig], [y for _, y in orig], s=44, zorder=3,
           color=_lib.CONDITION_COLORS["without"], marker="o",
           edgecolors="white", linewidths=0.4,
           label=f"Original restore ({orig_over}/{len(orig)} over)")
ax.scatter([x for x, _ in rev], [y for _, y in rev], s=44, zorder=4,
           color=_lib.CONDITION_COLORS["with"], marker="^",
           edgecolors="white", linewidths=0.4,
           label=f"Revised restore ({rev_over}/{len(rev)} over)")
ax.set_xlim(0, lim)
ax.set_ylim(0, lim)
ax.set_aspect("equal", adjustable="box")
ax.set_xlabel("Induced displacement (px)")
ax.set_ylabel("Restore residual (px)")
ax.legend(loc="upper left", framealpha=0.9)
fig.tight_layout()
out = _lib.save_fig(fig, "03_restore_overreposition_fixed")
print(f"wrote {out}")
