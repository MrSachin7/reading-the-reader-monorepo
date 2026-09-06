"""Regenerate the sweep scatter plot with axis labels that name the measured quantities.

The thesis figure labelled the axes "induced displacement" and "restore residual",
terms the restore hook uses for its sentence-anchor diagnostics; the plotted data
are the anchor word's vertical displacement with preservation off (x) and on (y).
Reads the same raw sweep files as audit_evidence.py; writes only figures/.
Requires matplotlib (not needed for the audit itself).
"""
from __future__ import annotations

import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[2]
PAPER = Path(__file__).resolve().parents[1]
RESULTS = ROOT / "Frontend/experiments/context-displacement/results"


def pairs(version):
    rows = json.loads((RESULTS / f"onoff-{version}-raw.json").read_text())["rows"]
    return [(r["offDisplacementPx"], r["onDisplacementPx"]) for r in rows
            if r["offDisplacementPx"] is not None and r["onDisplacementPx"] is not None]


def main():
    fig, ax = plt.subplots(figsize=(5.2, 4.2))
    limit = 0
    for version, marker, colour in (("original", "o", "#c0392b"), ("revised", "^", "#1f3a93")):
        pts = pairs(version)
        over = sum(on > off + 1 for off, on in pts)
        limit = max(limit, *(v for p in pts for v in p))
        ax.scatter([p[0] for p in pts], [p[1] for p in pts], marker=marker, s=28,
                   color=colour, alpha=0.85, edgecolor="none",
                   label=f"{version.capitalize()} restore ({over}/{len(pts)} over)")
    limit = limit * 1.05
    ax.plot([0, limit], [0, limit], linestyle="--", color="grey", linewidth=1,
            label="on = off (line of equality)")
    ax.set_xlim(0, limit)
    ax.set_ylim(0, limit)
    ax.set_xlabel("Word displacement, preservation off (px)")
    ax.set_ylabel("Word displacement, preservation on (px)")
    ax.grid(True, linewidth=0.4, alpha=0.5)
    ax.legend(loc="upper left", frameon=True)
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    fig.tight_layout()
    out = PAPER / "figures/sweep-overreposition.pdf"
    fig.savefig(out)
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
