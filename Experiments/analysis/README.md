# Experiments / analysis

Notebooks that demonstrate the processed-export schema (`rtr.processed-experiment-export` v3) carries enough information to support real data analysis. Framing is **architectural** — the thesis claim is that the platform produces analyzable data, not that any specific reading-research finding holds.

## Layout

| Path | Purpose |
| --- | --- |
| `_lib.py` | Streaming JSON loader and DataFrame builders. Importable. |
| `00_load.ipynb` | Scans `../data/` for `*processed*v3*.json`, builds parquet cache. |
| `01_data_quality.ipynb` | Pipeline-integrity exhibits: sample yield, validity, sequencing, focus inference, calibration. |
| `02_reading_signals.ipynb` | Illustrative reading-research metrics: WPM, token dwell, pupil cognitive load. |
| `outputs/cache/` | Parquet cache produced by `00`. |
| `outputs/figures/` | PNGs produced by `01` and `02`. |
| `_build_notebooks.py` | One-shot script that re-generates the three .ipynb files from in-file cell lists. |

## Running

```powershell
# from this directory
python -m pip install pandas matplotlib pyarrow jupyter ijson
python -m jupyter nbconvert --to notebook --execute --inplace 00_load.ipynb
python -m jupyter nbconvert --to notebook --execute --inplace 01_data_quality.ipynb
python -m jupyter nbconvert --to notebook --execute --inplace 02_reading_signals.ipynb
```

`00_load` must run first — `01` and `02` read from the parquet cache.

## Adding new participants

Drop another `*_processed_v3.json` into `Experiments/data/`, re-run `00_load`, then re-run `01` and `02`. Every plot iterates over all sessions in the cache and extends automatically.

## Caveats

- The cognitive-load (pupil) plot has no ambient-luminance correction. Treat as illustrative.
- Reading-research findings on N=1 are descriptive, not inferential.
- Word counts are whitespace-tokenized from raw markdown — close enough for WPM, not a substitute for proper tokenization.
- The baseline for pupil delta is the first 30 s of the session; this overlaps with material 0 reading and is a known weakness. A future improvement is to use the pre-material lifecycle window.
