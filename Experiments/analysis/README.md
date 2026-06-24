# Experiments / analysis

Reproducible analysis of the experiment exports, spined by research question. The thesis
framing is **architectural**: the platform produces analysable data. Reading-behaviour
numbers on this sample (N=2 participants) are **descriptive, not inferential**.

## Layout

| Path | Purpose |
| --- | --- |
| `_lib.py` | Loader + tidy-table builder + plotting/cache helpers. Importable. |
| `_build_notebooks.py` | Regenerates the `.ipynb` files from in-file cell definitions. |
| `_run_notebooks.py` | Executes the notebooks in place (populates `outputs/`). |
| `00_load.ipynb` | Discovers `../data/**`, builds the tidy tables, caches them, prints the session manifest. |
| `01_sensing_quality.ipynb` | RQ2 sensing: achieved Hz, inter-sample interval, gaze validity, calibration. |
| `02_latency.ipynb` | RQ2/NFR2: client RTT vs the 100 ms budget. (Decision-pipeline latency / provider RTT auto-appear when decision-mode runs are added.) |
| `03_context_preservation.ipynb` | RQ3: mechanism (within *with* runs) + behaviour (regression rate, with vs without). |
| `04_modularity_degradation.ipynb` | RQ1/NFR4: lifecycle trace incl. provider disconnect (graceful degradation). |
| `outputs/cache/` | Pickled tidy tables produced by `00`. |
| `outputs/figures/` | Vector **PDF** figures (thesis-ready). |
| `outputs/tables/` | CSV result tables. |

## Running

```powershell
python -m pip install pandas matplotlib numpy nbformat nbconvert nbclient ipykernel
python _build_notebooks.py     # (re)write the .ipynb files
python _run_notebooks.py       # execute them -> outputs/
# 00_load runs first; the others read the cache.
```

## Adding experiments (same format, append-only)

Drop new files into the condition folders and re-run — every table and figure extends:

```
data/
  with-context-preservation/
    <Participant>-with.json            # full export   (GET /experiment-session/export)
    telemetry/<Participant>.json        # telemetry     (GET /experiment-session/telemetry)
  without-context-preservation/
    <Participant>-without.json
    telemetry/<Participant>.json
```

Condition is inferred from the folder name, participant from the file stem. New conditions
are supported by adding a folder whose name contains (or omits) `without`. When sessions are
run with the rule-based or external **decision** strategy, the latency notebook (`02`)
auto-populates the `pipeline-decision` and `decision-provider-rtt` distributions.

## Caveats / interpretation notes

- **N=2, descriptive.** No inferential claims; effects are reported per participant.
- **Semantic-restart `anchorErrorPx`.** All interventions here are font-size changes, which
  trigger a *semantic-restart* restore. There `anchorErrorPx` measures the committed
  sentence's distance from its target (a deliberate reposition), **not** pixel-exact
  preservation of the reader's prior spot. So a large/"degraded" value is not a simple
  failure. `viewportDeltaPx` is the cleaner measure of the reader's induced displacement, and
  the **regression-rate** comparison is the cleaner on/off behavioural signal.
- **Manual mode.** This dataset was operated in manual mode (no automated decisions), so the
  A1/A2 decision-latency telemetry is absent here (the instrumentation is available but
  unexercised); RQ2 latency rests on sensing throughput + client RTT.
