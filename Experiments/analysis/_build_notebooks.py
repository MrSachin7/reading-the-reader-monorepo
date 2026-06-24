"""Regenerate the analysis notebooks from in-file cell definitions.

    python _build_notebooks.py            # write the .ipynb files
    python _run_notebooks.py              # execute them (produces outputs/)

Keeping the notebooks generated from plain-text cell lists makes them
review-friendly and reproducible. Logic that is reused lives in `_lib.py`;
the notebooks carry the analysis narrative and plotting.
"""
from __future__ import annotations

from pathlib import Path

import nbformat as nbf

HERE = Path(__file__).resolve().parent

HEADER = """\
import sys, pathlib
sys.path.insert(0, str(pathlib.Path.cwd()))
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import _lib
_lib.apply_style()
try:
    data = _lib.read_cache()
except FileNotFoundError:
    data = _lib.load_all(); _lib.write_cache(data)
"""


def nb(*cells) -> nbf.NotebookNode:
    node = nbf.v4.new_notebook()
    node.cells = list(cells)
    node.metadata = {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python"},
    }
    return node


def md(text: str):
    return nbf.v4.new_markdown_cell(text)


def code(text: str):
    return nbf.v4.new_code_cell(text)


# --------------------------------------------------------------------------- #
NOTEBOOKS: dict[str, nbf.NotebookNode] = {}

# 00 — load --------------------------------------------------------------- #
NOTEBOOKS["00_load"] = nb(
    md("# 00 — Load experiment data\n\n"
       "Discovers every export under `Experiments/data/<condition>/`, builds the tidy "
       "tables, and caches them. **Append-only**: drop in more participants or conditions "
       "(same format) and re-run this notebook; every downstream notebook extends automatically.\n\n"
       "The thesis framing is *architectural* — the platform produces analysable data. "
       "Reading-behaviour numbers on this sample (N=2 participants) are descriptive, not inferential."),
    code("import _lib\n"
         "data = _lib.load_all()\n"
         "_lib.write_cache(data)\n"
         "{name: len(getattr(data, name)) for name in "
         "['sessions','gaze','fixations','saccades','interventions','context_preservation','lifecycle','telemetry']}"),
    md("### Session manifest"),
    code("import pandas as pd\n"
         "pd.set_option('display.max_columns', 40); pd.set_option('display.width', 200)\n"
         "manifest = data.sessions[['participant','condition','gazeSource','achievedHz',\n"
         "    'calibrationValidationPassed','calibrationAccuracyDeg','calibrationPrecisionDeg',\n"
         "    'durationSec','nGazeSamples','nFixations','nSaccades','nInterventions','nContextPreservationEvents']]\n"
         "_lib.save_table(manifest, 'session_manifest')\n"
         "manifest"),
)

# 01 — sensing quality ---------------------------------------------------- #
NOTEBOOKS["01_sensing_quality"] = nb(
    md("# 01 — Sensing pipeline quality (RQ2)\n\n"
       "Claim: the platform acquires a real Tobii stream at the rated rate with high validity. "
       "Evidence: achieved sampling rate, inter-sample interval, and gaze validity per session."),
    code(HEADER),
    code("g = data.gaze.copy()\n"
         "g['leftValid'] = g['leftValidity'].eq('Valid')\n"
         "g['rightValid'] = g['rightValidity'].eq('Valid')\n"
         "g['anyValid'] = g['leftValid'] | g['rightValid']\n"
         "valid = g.groupby('sessionKey')['anyValid'].mean().rename('gazeValidityRate')\n"
         "summ = data.sessions.set_index('sessionKey')[['participant','condition','achievedHz',\n"
         "    'calibrationAccuracyDeg','calibrationPrecisionDeg','durationSec','nGazeSamples']].join(valid)\n"
         "summ = summ.reset_index(drop=True)\n"
         "_lib.save_table(summ, 'sensing_summary')\n"
         "summ.round(3)"),
    md("### Achieved sampling rate and validity per session"),
    code("fig, axes = plt.subplots(1, 2, figsize=(9, 3.4))\n"
         "order = summ.sort_values(['condition','participant'])\n"
         "labels = order['participant'] + '\\n(' + order['condition'] + ')'\n"
         "colors = [_lib.CONDITION_COLORS[c] for c in order['condition']]\n"
         "axes[0].bar(labels, order['achievedHz'], color=colors)\n"
         "axes[0].axhline(90, ls='--', c='gray', lw=1)\n"
         "axes[0].set_ylabel('Achieved rate (Hz)'); axes[0].set_title('Sampling rate'); axes[0].set_ylim(0, 100)\n"
         "axes[1].bar(labels, order['gazeValidityRate']*100, color=colors)\n"
         "axes[1].set_ylabel('Gaze validity (%)'); axes[1].set_title('Validity'); axes[1].set_ylim(0, 100)\n"
         "fig.tight_layout(); _lib.save_fig(fig, '01_sensing_rate_validity'); fig"),
    md("### Inter-sample interval (device clock)\n"
       "Tight clustering near the nominal period confirms a steady real-time stream."),
    code("iv = data.gaze.sort_values(['sessionKey','sequenceNumber']).copy()\n"
         "iv['intervalMs'] = iv.groupby('sessionKey')['deviceTimeStampUs'].diff() / 1000.0\n"
         "vals = iv['intervalMs'].dropna()\n"
         "vals = vals[(vals > 0) & (vals < 30)]\n"
         "fig, ax = plt.subplots(figsize=(6, 3.2))\n"
         "ax.hist(vals, bins=60, color=_lib.CONDITION_COLORS['with'])\n"
         "ax.axvline(1000/90, ls='--', c='gray', lw=1, label='90 Hz (11.1 ms)')\n"
         "ax.set_xlabel('Inter-sample interval (ms)'); ax.set_ylabel('Samples'); ax.legend()\n"
         "ax.set_title(f'median = {vals.median():.2f} ms')\n"
         "fig.tight_layout(); _lib.save_fig(fig, '01_inter_sample_interval'); fig"),
)

# 02 — latency ------------------------------------------------------------ #
NOTEBOOKS["02_latency"] = nb(
    md("# 02 — Latency budget (RQ2 / NFR2)\n\n"
       "The participant- and researcher-client round-trip times are reported against the "
       "100 ms budget. The decision-pipeline latency (`pipeline-decision`) and out-of-process "
       "decision round-trip (`decision-provider-rtt`) are recorded by the platform when an "
       "automated decision strategy runs; this dataset was operated in **manual** mode, so "
       "those roles are absent here (the instrumentation is available but unexercised)."),
    code(HEADER),
    code("tel = data.telemetry.copy()\n"
         "print('roles present:', sorted(tel['role'].dropna().unique()))\n"
         "rtt = tel[tel['role'].isin(['participant','researcher'])].dropna(subset=['rttMs'])\n"
         "def stats(s):\n"
         "    s = s.sort_values()\n"
         "    return pd.Series({'n': len(s), 'p50': s.quantile(.5), 'p95': s.quantile(.95),\n"
         "        'p99': s.quantile(.99), 'max': s.max(),\n"
         "        'over_100ms_pct': 100*(s > _lib.LATENCY_BUDGET_MS).mean()})\n"
         "by_role = rtt.groupby('role')['rttMs'].apply(stats).unstack().round(2)\n"
         "_lib.save_table(by_role.reset_index(), 'client_rtt_by_role')\n"
         "by_role"),
    md("### Client RTT distribution vs the 100 ms budget"),
    code("fig, ax = plt.subplots(figsize=(6, 3.4))\n"
         "for role, c in [('participant', _lib.CONDITION_COLORS['with']), ('researcher', _lib.CONDITION_COLORS['without'])]:\n"
         "    s = np.sort(rtt.loc[rtt['role'] == role, 'rttMs'].values)\n"
         "    if len(s):\n"
         "        ax.step(s, np.linspace(0, 1, len(s)), where='post', label=role, color=c)\n"
         "ax.axvline(_lib.LATENCY_BUDGET_MS, ls='--', c='gray', lw=1, label='100 ms budget')\n"
         "ax.set_xlabel('Client round-trip time (ms)'); ax.set_ylabel('Cumulative fraction')\n"
         "ax.set_title('All samples within budget'); ax.legend()\n"
         "fig.tight_layout(); _lib.save_fig(fig, '02_client_rtt_ecdf'); fig"),
    md("Sample rate and validity are also reported through the same telemetry channel "
       "(see notebook 01 for the sensing view)."),
)

# 03 — context preservation ---------------------------------------------- #
NOTEBOOKS["03_context_preservation"] = nb(
    md("# 03 — Context preservation, on vs off (RQ3)\n\n"
       "**Headline (behaviour):** measures taken in the window *after* each intervention, "
       "aligned to the intervention rather than averaged over the session: the reading-resume "
       "time and the post-intervention regression rate, with vs without preservation.\n\n"
       "**Mechanism (and its limitation):** within the *with* runs the reader records, per "
       "intervention, the displacement the reflow induced (`viewportDeltaPx`) and the residual "
       "after the restore (`anchorErrorPx`), plus a graded outcome. All interventions in this "
       "dataset are font-size changes (layout-changing → *semantic-restart*).\n\n"
       "N=2: descriptive, not inferential."),
    code(HEADER),
    md("## 1 — Behaviour after each intervention, with vs without (headline)\n"
       "Context preservation acts in the moments after a reflow, so each measure is aligned "
       "to an intervention's apply time rather than averaged over the session. The reading-resume "
       "time (RRT) is the time to the first forward saccade after the intervention; the regression "
       "rate is taken in the 5 s after it, against a matched 5 s baseline before it. Windows are "
       "capped at the neighbouring interventions so they never overlap."),
    code("pi = _lib.compute_post_intervention(data, window_s=5.0)\n"
         "by = pi.groupby('condition').agg(n=('rrtMs','size'),\n"
         "    rrt_median_ms=('rrtMs','median'), rrt_mean_ms=('rrtMs','mean'),\n"
         "    pre_reg_rate=('preRegressionRate','mean'), post_reg_rate=('postRegressionRate','mean'),\n"
         "    delta=('regressionRateDelta','mean'))\n"
         "by = by.reindex([c for c in _lib.CONDITION_ORDER if c in by.index])\n"
         "_lib.save_table(pi, 'post_intervention_events')\n"
         "_lib.save_table(by.reset_index(), 'post_intervention_summary')\n"
         "by.round(3)"),
    md("### Reading-resume time (time to the next forward saccade)"),
    code("conds = [c for c in _lib.CONDITION_ORDER if c in pi['condition'].unique()]\n"
         "rng = np.random.default_rng(0)\n"
         "fig, ax = plt.subplots(figsize=(6, 3.6))\n"
         "for i, c in enumerate(conds):\n"
         "    v = pi.loc[pi['condition'] == c, 'rrtMs'].dropna().values\n"
         "    ax.scatter(i + (rng.random(len(v)) - 0.5)*0.18, v, s=42, alpha=0.85,\n"
         "               color=_lib.CONDITION_COLORS[c], zorder=3)\n"
         "    ax.plot([i-0.22, i+0.22], [np.median(v)]*2, color='black', lw=2, zorder=4)\n"
         "ax.set_xticks(range(len(conds))); ax.set_xticklabels([_lib.CONDITION_LABELS[c] for c in conds])\n"
         "ax.set_ylabel('Reading-resume time (ms)')\n"
         "ax.set_title('Time to first forward saccade after intervention (bar = median)')\n"
         "fig.tight_layout(); _lib.save_fig(fig, '03_rrt'); fig"),
    md("### Regression rate before vs after the intervention\n"
       "Without preservation the regression rate rises after an intervention; with it, it does not."),
    code("conds = [c for c in _lib.CONDITION_ORDER if c in by.index]\n"
         "x = np.arange(len(conds)); w = 0.38\n"
         "fig, ax = plt.subplots(figsize=(6, 3.6))\n"
         "ax.bar(x - w/2, [by.loc[c, 'pre_reg_rate']*100 for c in conds], w, label='before (baseline)', color='#9aa0a6')\n"
         "ax.bar(x + w/2, [by.loc[c, 'post_reg_rate']*100 for c in conds], w, label='after intervention',\n"
         "       color=[_lib.CONDITION_COLORS[c] for c in conds])\n"
         "ax.set_xticks(x); ax.set_xticklabels([_lib.CONDITION_LABELS[c] for c in conds])\n"
         "ax.set_ylabel('Regression rate (%)'); ax.legend()\n"
         "ax.set_title('Regressions in the 5 s before vs after each intervention')\n"
         "fig.tight_layout(); _lib.save_fig(fig, '03_post_regression'); fig"),
    md("### Sensitivity to the window length"),
    code("rows = []\n"
         "for wsec in (3.0, 5.0, 10.0):\n"
         "    p = _lib.compute_post_intervention(data, window_s=wsec)\n"
         "    for c in [x for x in _lib.CONDITION_ORDER if x in p['condition'].unique()]:\n"
         "        sub = p[p['condition'] == c]\n"
         "        rows.append({'window_s': wsec, 'condition': c,\n"
         "            'post_reg_rate_pct': round(100*sub['postRegressionRate'].mean(), 1),\n"
         "            'rrt_median_ms': round(float(sub['rrtMs'].median()), 0)})\n"
         "sens = pd.DataFrame(rows)\n"
         "_lib.save_table(sens, 'post_intervention_sensitivity')\n"
         "sens"),
    md("## 2 — Mechanism and its limitation\n"
       "The restore runs and is fully audited, but the outcome is mostly graded *degraded*. The "
       "reason is informative rather than a recording failure: the reader's reading position "
       "drifted only a little (`viewportDeltaPx`), yet the semantic-restart strategy repositions "
       "the committed sentence to its target, so the residual (`anchorErrorPx`) *exceeds* the "
       "induced displacement. For small font-size reflows the restore is over-aggressive — a "
       "limitation we return to as future work (a gentler, Kalman-filter-style stabilisation, or "
       "keeping the reader's exact offset for small changes)."),
    code("cp = data.context_preservation.copy()\n"
         "iv = data.interventions[['sessionKey','appliedAtUnixMs','affectedProperties','restoreMode','fontSizePx']]\n"
         "cp = cp.sort_values('interventionAppliedAtUnixMs')\n"
         "iv = iv.sort_values('appliedAtUnixMs')\n"
         "cp = pd.merge_asof(cp, iv, left_on='interventionAppliedAtUnixMs', right_on='appliedAtUnixMs',\n"
         "                   by='sessionKey', direction='nearest', tolerance=2000)\n"
         "outcome = cp.groupby('status').agg(n=('status','size'),\n"
         "    median_anchorErrorPx=('anchorErrorPx','median'),\n"
         "    median_viewportDeltaPx=('viewportDeltaPx','median')).reset_index()\n"
         "_lib.save_table(cp, 'context_preservation_events')\n"
         "_lib.save_table(outcome, 'context_preservation_outcomes')\n"
         "outcome.round(2)"),
    code("# Honest limitation figure: restore residual vs the displacement actually induced.\n"
         "# Points above the dashed line mean the restore moved the reader MORE than the reflow did.\n"
         "ev = cp.reset_index(drop=True).copy()\n"
         "m = ev['anchorErrorPx'].notna() & ev['viewportDeltaPx'].notna()\n"
         "ev = ev[m]\n"
         "fig, ax = plt.subplots(figsize=(5.2, 4.4))\n"
         "ax.scatter(ev['viewportDeltaPx'], ev['anchorErrorPx'], s=48, zorder=3,\n"
         "           color=_lib.CONDITION_COLORS['with'])\n"
         "lim = float(max(ev['viewportDeltaPx'].max(), ev['anchorErrorPx'].max())) * 1.05 + 1\n"
         "ax.plot([0, lim], [0, lim], ls='--', c='gray', lw=1, label='residual = induced displacement')\n"
         "ax.set_xlim(0, lim); ax.set_ylim(0, lim)\n"
         "ax.set_xlabel('Induced displacement  viewportDeltaPx (px)')\n"
         "ax.set_ylabel('Restore residual  anchorErrorPx (px)')\n"
         "ax.set_title('Semantic-restart over-repositions on small reflows')\n"
         "ax.legend(loc='lower right')\n"
         "fig.tight_layout(); _lib.save_fig(fig, '03_restore_overreposition'); fig"),
)

# 04 — modularity & degradation ------------------------------------------ #
NOTEBOOKS["04_modularity_degradation"] = nb(
    md("# 04 — Modularity & graceful degradation (RQ1 / NFR4)\n\n"
       "The static modularity evidence (dependency DAG, the architecture test, modification "
       "locality, the three external providers) lives in `Experiments/architecture-evidence.md`. "
       "Here we show the runtime trace: lifecycle events recorded in the session record, "
       "including an external module provider disconnecting mid-session without interrupting "
       "the run (graceful degradation, FR19.3)."),
    code(HEADER),
    code("life = data.lifecycle.copy()\n"
         "_lib.save_table(life, 'lifecycle_events')\n"
         "life[['participant','condition','eventType','source','occurredAtUnixMs']]"),
    code("print('lifecycle event types:', data.lifecycle['eventType'].value_counts().to_dict())\n"
         "degr = data.lifecycle[data.lifecycle['eventType'] == 'module-provider-detached']\n"
         "print('\\nprovider-detach events (graceful degradation):')\n"
         "degr[['participant','condition','source','occurredAtUnixMs']]"),
)


def main():
    for name, node in NOTEBOOKS.items():
        path = HERE / f"{name}.ipynb"
        nbf.write(node, path)
        print(f"wrote {path.name} ({len(node.cells)} cells)")


if __name__ == "__main__":
    main()
