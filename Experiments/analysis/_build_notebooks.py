"""One-shot script: generates the three .ipynb notebooks from in-file cell lists.

Run once after editing the cell contents below, then execute the notebooks via:

    jupyter nbconvert --to notebook --execute --inplace 00_load.ipynb
    jupyter nbconvert --to notebook --execute --inplace 01_data_quality.ipynb
    jupyter nbconvert --to notebook --execute --inplace 02_reading_signals.ipynb
"""
from __future__ import annotations

import nbformat as nbf
from pathlib import Path

HERE = Path(__file__).parent


def make_notebook(cells: list[tuple[str, str]], path: Path) -> None:
    nb = nbf.v4.new_notebook()
    nb.cells = [
        nbf.v4.new_markdown_cell(src) if kind == "md" else nbf.v4.new_code_cell(src)
        for kind, src in cells
    ]
    nb.metadata.update({
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python"},
    })
    nbf.write(nb, path)
    print("wrote", path.relative_to(HERE.parent))


# ----------------------------------------------------------------------------
# 00 — load + cache
# ----------------------------------------------------------------------------
cells_00 = [
    ("md", """# 00 — Load processed exports → cache

Streams every `*processed*v3*.json` in `Experiments/data/` into three parquet
files under `outputs/cache/`. Re-run this whenever a new participant export lands.
"""),
    ("code", """from pathlib import Path
from _lib import load_all, write_cache, SUPPORTED_SCHEMA, SUPPORTED_VERSIONS

DATA_DIR = Path("../data")
CACHE_DIR = Path("outputs/cache")
PATTERN = "*processed*v3*.json"

print(f"Scanning {DATA_DIR.resolve()} for {PATTERN!r}...")
loaded = load_all(DATA_DIR, pattern=PATTERN)
print(f"Loaded {len(loaded.sessions)} session(s), {len(loaded.materials)} materials, {len(loaded.samples):,} gaze samples.")
"""),
    ("code", """paths = write_cache(loaded, CACHE_DIR)
for name, p in paths.items():
    size_mb = p.stat().st_size / (1024 * 1024)
    print(f"  {name:10s} {p.relative_to(Path.cwd()) if p.is_relative_to(Path.cwd()) else p}  ({size_mb:.1f} MB)")
"""),
    ("code", """loaded.sessions[[
    "sessionId", "participantName", "schemaVersion",
    "conditionLabel", "durationMs",
    "calibrationAccuracyDegrees", "calibrationPrecisionDegrees", "calibrationQuality",
]]
"""),
    ("code", """loaded.materials[[
    "sessionId", "order", "title", "wordCount",
    "gazeSampleCount", "focusEventCount",
]]
"""),
]

# ----------------------------------------------------------------------------
# 01 — data quality / pipeline integrity
# ----------------------------------------------------------------------------
cells_01 = [
    ("md", """# 01 — Data quality & pipeline integrity

Defends the claim *"the platform produces analyzable data"*. Each plot answers
one question a thesis examiner might ask about whether the sensing,
persistence, and focus-inference pipelines work end-to-end.

Run `00_load.ipynb` first to populate the cache.
"""),
    ("code", """from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from _lib import read_cache, per_sample_interval_ms

CACHE_DIR = Path("outputs/cache")
FIG_DIR = Path("outputs/figures/01_data_quality")
FIG_DIR.mkdir(parents=True, exist_ok=True)

data = read_cache(CACHE_DIR)
print(f"Loaded cache: {len(data.sessions)} session(s), {len(data.samples):,} samples")
"""),
    ("md", """## Sample yield per material

How many gaze samples did the pipeline persist for each material, and what
effective sampling rate did that translate to? Tobii IS4 nominal is 250 Hz.
"""),
    ("code", """yield_rows = []
for _, mat in data.materials.iterrows():
    duration_ms = (mat["lastObservedAtUnixMs"] or 0) - (mat["firstObservedAtUnixMs"] or 0)
    hz = (mat["gazeSampleCount"] / (duration_ms / 1000)) if duration_ms else float("nan")
    yield_rows.append({
        "material": mat["title"],
        "samples": int(mat["gazeSampleCount"]),
        "duration_s": round(duration_ms / 1000, 1),
        "effective_hz": round(hz, 1),
    })
pd.DataFrame(yield_rows)
"""),
    ("md", """## Validity rates

Fraction of samples Tobii flagged as `Valid` on each eye for both gaze position
and pupil diameter. Drops correspond to blinks, look-away, or track loss.
"""),
    ("code", """def pct_valid(series):
    return (series.fillna("").str.lower() == "valid").mean() * 100

for sid, group in data.samples.groupby("sessionId"):
    label = data.sessions.loc[data.sessions.sessionId == sid, "participantName"].iat[0] or sid
    print(f"{label}")
    print(f"  left  gaze valid : {pct_valid(group['leftValidity']):.2f}%")
    print(f"  right gaze valid : {pct_valid(group['rightValidity']):.2f}%")
    print(f"  left  pupil valid: {pct_valid(group['leftPupilValidity']):.2f}%")
    print(f"  right pupil valid: {pct_valid(group['rightPupilValidity']):.2f}%")
"""),
    ("md", """## Inter-sample interval histogram

Per-session distribution of the time between consecutive samples (ms). A clean
sensing pipeline produces a narrow spike around `1000 / nominal_hz`. A long
tail indicates jitter, drops, or blocking on the persistence layer.
"""),
    ("code", """intervals = per_sample_interval_ms(data.samples).dropna()
median = float(intervals.median())
p99 = float(intervals.quantile(0.99))
p999 = float(intervals.quantile(0.999))
print(f"median = {median:.3f} ms  ({1000/median:.1f} Hz)")
print(f"p99    = {p99:.3f} ms")
print(f"p99.9  = {p999:.3f} ms")
print(f"max    = {intervals.max():.1f} ms")

fig, ax = plt.subplots(figsize=(9, 4))
ax.hist(intervals, bins=200, range=(0, 50), color="#1f77b4", edgecolor="white")
ax.set_yscale("log")
ax.set_xlabel("Inter-sample interval (ms, clipped at 50)")
ax.set_ylabel("Sample count (log)")
ax.set_title(f"Sampling-rate stability — median {median:.2f} ms ({1000/median:.0f} Hz), p99 {p99:.2f} ms")
ax.axvline(median, color="k", linestyle="--", linewidth=1, label=f"median = {median:.2f} ms")
ax.axvline(p999, color="#d62728", linestyle=":", linewidth=1, label=f"p99.9 = {p999:.2f} ms")
ax.legend()
ax.ticklabel_format(useOffset=False, axis="x")
fig.tight_layout()
fig.savefig(FIG_DIR / "inter_sample_interval.png", dpi=150)
plt.show()
"""),
    ("md", """## Sequence-number gap audit

`sequenceNumber` is monotonic per session — assigned by the export factory in
capture order. Any gap means a sample was lost between Tobii and persistence.
"""),
    ("code", """for sid, group in data.samples.sort_values("sequenceNumber").groupby("sessionId"):
    seq = group["sequenceNumber"].to_numpy()
    expected = np.arange(seq.min(), seq.max() + 1)
    missing = np.setdiff1d(expected, seq)
    label = data.sessions.loc[data.sessions.sessionId == sid, "participantName"].iat[0] or sid
    print(f"{label}: {len(seq):,} samples, sequence span {seq.min()}..{seq.max()}, missing = {len(missing)}")
"""),
    ("md", """## Focus-inference success rate

When the participant was looking inside the reading area, did the system
resolve which token they were on? This is what makes the processed export
*analysis-ready* — focus is pre-joined to every gaze sample, so analysts don't
re-implement DOM hit testing.
"""),
    ("code", """rows = []
for sid, group in data.samples.groupby("sessionId"):
    inside = group["isInsideReadingArea"]
    has_token = group["activeTokenId"].notna() & (group["activeTokenId"].astype(str) != "")
    rows.append({
        "session": data.sessions.loc[data.sessions.sessionId == sid, "participantName"].iat[0] or sid,
        "inside_reading_area_pct": inside.mean() * 100,
        "has_active_token_pct": has_token.mean() * 100,
        "token_inferred_when_inside_pct": (has_token[inside].mean() if inside.any() else float("nan")) * 100,
    })
pd.DataFrame(rows).round(2)
"""),
    ("md", """## Material-boundary cleanliness

When the participant transitioned from material 0 to material 1, did the
gaze stream stay continuous? Any large gap or out-of-order sample around the
boundary would indicate the orchestration mis-handled the switch.
"""),
    ("code", """boundary_rows = []
samples_sorted = data.samples.sort_values(["sessionId", "sequenceNumber"])
for sid, group in samples_sorted.groupby("sessionId"):
    mats = group[group["materialRunId"].notna()].copy()
    if mats["materialIndex"].nunique() < 2:
        continue
    mats["transition"] = mats["materialRunId"].ne(mats["materialRunId"].shift())
    transitions = mats[mats["transition"] & mats["materialRunId"].shift().notna()]
    for _, t in transitions.iterrows():
        prev_idx = mats.index.get_loc(t.name) - 1
        prev = mats.iloc[prev_idx]
        gap_ms = t["capturedAtUnixMs"] - prev["capturedAtUnixMs"]
        boundary_rows.append({
            "session": data.sessions.loc[data.sessions.sessionId == sid, "participantName"].iat[0] or sid,
            "from_material_idx": int(prev["materialIndex"]),
            "to_material_idx": int(t["materialIndex"]),
            "gap_ms": int(gap_ms),
            "seq_jump": int(t["sequenceNumber"] - prev["sequenceNumber"]),
        })
pd.DataFrame(boundary_rows) if boundary_rows else "No material boundaries detected in this dataset."
"""),
    ("md", """## Calibration QA

Tobii rule-of-thumb: accuracy below ~1° and precision below ~0.3° is good
quality for reading research. We log both per session.
"""),
    ("code", """cal = data.sessions[[
    "participantName", "calibrationApplied", "calibrationValidationPassed",
    "calibrationQuality", "calibrationAccuracyDegrees", "calibrationPrecisionDegrees",
    "calibrationSampleCount",
]].copy()
cal["calibrationAccuracyDegrees"] = cal["calibrationAccuracyDegrees"].round(3)
cal["calibrationPrecisionDegrees"] = cal["calibrationPrecisionDegrees"].round(3)
cal
"""),
    ("md", """## Three-clock comparison

The processed export carries three independent timestamps per sample:

- `deviceTimeStampUs` — Tobii's internal hardware clock
- `systemTimeStampUs` — Tobii driver clock on the OS
- `capturedAtUnixMs` — when the .NET backend received the sample

Plotting the intervals from each clock together lets us **localize where any
jitter or loss comes from**. Tobii itself is essentially perfect; jitter shows
up in the delivery path, and the persistence layer captures every sample
regardless.
"""),
    ("code", """clock_rows = data.samples.sort_values(["sessionId", "sequenceNumber"]).copy()
clock_rows["dev_ms"] = clock_rows.groupby("sessionId")["deviceTimeStampUs"].diff() / 1000
clock_rows["sys_ms"] = clock_rows.groupby("sessionId")["systemTimeStampUs"].diff() / 1000
clock_rows["cap_ms"] = clock_rows.groupby("sessionId")["capturedAtUnixMs"].diff()

clock_stats = []
for col, label in [("dev_ms", "Tobii device clock"),
                   ("sys_ms", "Tobii system/driver clock"),
                   ("cap_ms", ".NET capture clock")]:
    v = clock_rows[col].dropna()
    v = v[(v > 0) & (v < 200)]
    clock_stats.append({
        "clock": label,
        "median_ms": round(float(v.median()), 3),
        "std_ms": round(float(v.std()), 3),
        "p99_ms": round(float(v.quantile(0.99)), 3),
        "max_under_200ms": round(float(v.max()), 1),
    })
pd.DataFrame(clock_stats)
"""),
    ("code", """fig, ax = plt.subplots(figsize=(9, 4.5))
bins = np.linspace(0, 25, 120)
for col, label, color in [("dev_ms", "Tobii device", "#1f77b4"),
                           ("sys_ms", "Tobii driver", "#2ca02c"),
                           ("cap_ms", ".NET capture", "#d62728")]:
    v = clock_rows[col].dropna()
    v = v[(v > 0) & (v < 25)]
    ax.hist(v, bins=bins, alpha=0.55, label=label, color=color, edgecolor="white")
ax.set_yscale("log")
ax.set_xlabel("Inter-sample interval (ms)")
ax.set_ylabel("Sample count (log)")
ax.set_title("Three-clock jitter comparison")
ax.legend(loc="upper right")
ax.ticklabel_format(useOffset=False, axis="x")
fig.tight_layout()
fig.savefig(FIG_DIR / "three_clock_comparison.png", dpi=150)
plt.show()
"""),
    ("md", """**Reading:** the blue (device) and green (driver) histograms collapse into
a single delta function at 11.1 ms — Tobii produces and the driver delivers
with zero jitter. The red (.NET capture) histogram has a visible spread of
1–2 ms with rare excursions to ~20 ms. That spread is .NET/GC scheduling, not
the sensing pipeline. **No samples were lost** — the persistence layer just
sometimes batches them.
"""),
    ("md", """## Material timeline

Each gaze sample is tagged with the material the participant was focused on
at the time. Plotting `materialIndex` over time shows whether materials were
strictly sequential or whether the participant moved between them.
"""),
    ("code", """timeline = data.samples.dropna(subset=["materialIndex"]).copy()
timeline["t_min"] = (timeline["capturedAtUnixMs"] - timeline["capturedAtUnixMs"].min()) / 60_000
material_titles = data.materials.set_index("order")["title"].to_dict()

fig, ax = plt.subplots(figsize=(10, 3))
colors_idx = {0: "#1f77b4", 1: "#d62728", 2: "#2ca02c", 3: "#ff7f0e"}
for idx in sorted(timeline["materialIndex"].unique()):
    g = timeline[timeline["materialIndex"] == idx]
    ax.scatter(g["t_min"], [int(idx)] * len(g), s=1, alpha=0.3,
               color=colors_idx.get(int(idx), "#888"),
               label=f"material {int(idx)} — {material_titles.get(int(idx), '?')}")
ax.set_yticks(sorted(timeline["materialIndex"].unique().astype(int)))
ax.set_yticklabels([material_titles.get(int(i), str(i)) for i in sorted(timeline["materialIndex"].unique())])
ax.set_xlabel("Time from first sample (minutes)")
ax.set_title("Per-sample material focus over the session")
ax.legend(markerscale=8, loc="upper right")
fig.tight_layout()
fig.savefig(FIG_DIR / "material_timeline.png", dpi=150)
plt.show()
"""),
    ("code", """# Quantify any cross-material overlap
mats = sorted(timeline["materialIndex"].unique().astype(int))
overlap_rows = []
for a, b in zip(mats, mats[1:]):
    ga = timeline[timeline["materialIndex"] == a]
    gb = timeline[timeline["materialIndex"] == b]
    overlap_start = gb["capturedAtUnixMs"].min()
    overlap_end = ga["capturedAtUnixMs"].max()
    if overlap_end > overlap_start:
        in_a = ((ga["capturedAtUnixMs"] >= overlap_start) & (ga["capturedAtUnixMs"] <= overlap_end)).sum()
        in_b = ((gb["capturedAtUnixMs"] >= overlap_start) & (gb["capturedAtUnixMs"] <= overlap_end)).sum()
        overlap_rows.append({
            "from": material_titles.get(a, str(a)),
            "to": material_titles.get(b, str(b)),
            "overlap_s": round((overlap_end - overlap_start) / 1000, 1),
            "from_samples_in_overlap": int(in_a),
            "to_samples_in_overlap": int(in_b),
        })
pd.DataFrame(overlap_rows) if overlap_rows else "Materials were strictly sequential — no overlap."
"""),
    ("md", """## Takeaway

Each cell above answers one pipeline-integrity question:

| Section                       | Defends |
| ----------------------------- | ------- |
| Sample yield & effective Hz   | Sensing → persistence throughput |
| Validity rates                | Hardware signal integrity |
| Inter-sample interval         | Sampling-rate stability under load |
| Sequence-gap audit            | No data loss in persistence pipeline |
| Focus-inference success       | DOM/token mapping works during real reading |
| Material-boundary cleanliness | Orchestration handles material transitions |
| Three-clock comparison        | Localizes jitter to .NET delivery, not sensing |
| Material timeline             | Shows whether materials interleaved (UX/architecture observation) |
| Calibration QA                | Hardware setup meets reading-research standards |

This is the *"platform produces analyzable data"* exhibit set.
"""),
]

# ----------------------------------------------------------------------------
# 02 — reading signals (illustrative)
# ----------------------------------------------------------------------------
cells_02 = [
    ("md", """# 02 — Reading signals (illustrative)

Demonstrates that the processed export carries enough information to run
established reading-research analyses. The thesis claim is architectural, so
these plots are illustrative on a single participant, not population-level
findings. With multiple participants in `Experiments/data/`, every plot below
extends automatically.
"""),
    ("code", """from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from _lib import read_cache

CACHE_DIR = Path("outputs/cache")
FIG_DIR = Path("outputs/figures/02_reading_signals")
FIG_DIR.mkdir(parents=True, exist_ok=True)

data = read_cache(CACHE_DIR)
print(f"Loaded {len(data.sessions)} session(s), {len(data.samples):,} samples")
"""),
    ("md", """## Per-material reading speed (WPM)

Words-per-minute is the textbook first contrast for "easy text vs difficult
text". Word count comes from the material markdown; reading time is the
duration the participant spent inside the reading area on that material.
"""),
    ("code", """samples = data.samples.copy()
samples = samples.sort_values(["sessionId", "sequenceNumber"])
samples["intervalMs"] = samples.groupby(["sessionId", "materialRunId"])["capturedAtUnixMs"].diff()
samples["intervalMs"] = samples["intervalMs"].clip(upper=200)  # cap blink-sized gaps

wpm_rows = []
for sid, group in samples.groupby("sessionId"):
    pname = data.sessions.loc[data.sessions.sessionId == sid, "participantName"].iat[0] or sid
    for mrid, mgroup in group.groupby("materialRunId"):
        mat_def = data.materials[(data.materials.sessionId == sid) & (data.materials.materialRunId == mrid)]
        if mat_def.empty:
            continue
        title = mat_def.iloc[0]["title"]
        words = int(mat_def.iloc[0]["wordCount"])
        time_inside_s = mgroup.loc[mgroup["isInsideReadingArea"], "intervalMs"].sum() / 1000
        wpm = (words / (time_inside_s / 60)) if time_inside_s else float("nan")
        wpm_rows.append({
            "participant": pname,
            "material": title,
            "words": words,
            "time_inside_s": round(time_inside_s, 1),
            "wpm": round(wpm, 1),
        })
wpm_df = pd.DataFrame(wpm_rows)
wpm_df
"""),
    ("code", """fig, ax = plt.subplots(figsize=(7, 4))
labels = wpm_df["participant"] + "\\n" + wpm_df["material"]
ax.bar(labels, wpm_df["wpm"], color=["#1f77b4" if "easy" in m.lower() else "#d62728" for m in wpm_df["material"]])
ax.set_ylabel("Words per minute")
ax.set_title("Reading speed per material")
for i, v in enumerate(wpm_df["wpm"]):
    ax.text(i, v + 1, f"{v:.0f}", ha="center")
fig.tight_layout()
fig.savefig(FIG_DIR / "reading_speed_wpm.png", dpi=150)
plt.show()
"""),
    ("md", """## Token-level dwell time distribution

For each token, sum the sample-intervals during which it was the active token.
This is the per-word dwell time. Reading literature reports mean fixation
durations of 200–250 ms; difficult text shifts the distribution rightward.
"""),
    ("code", """tokens = samples.dropna(subset=["activeTokenId"]).copy()
tokens = tokens[tokens["isInsideReadingArea"]]
dwell = (
    tokens.groupby(["sessionId", "materialRunId", "activeTokenId"])["intervalMs"]
    .sum()
    .reset_index(name="dwellMs")
)
dwell = dwell.merge(
    data.materials[["sessionId", "materialRunId", "title"]],
    on=["sessionId", "materialRunId"],
)
dwell.head()
"""),
    ("code", """fig, ax = plt.subplots(figsize=(9, 4.5))
materials_sorted = dwell["title"].drop_duplicates().tolist()
colors = {"easy text": "#1f77b4", "difficult text": "#d62728"}
for title in materials_sorted:
    values = dwell.loc[dwell.title == title, "dwellMs"]
    values = values[(values > 0) & (values < 3000)]
    ax.hist(values, bins=50, alpha=0.55, label=f"{title} (n={len(values)})",
            color=colors.get(title), edgecolor="white")
ax.set_xlabel("Per-token dwell time (ms)")
ax.set_ylabel("Token count")
ax.set_title("Per-token dwell distribution by material")
ax.legend()
fig.tight_layout()
fig.savefig(FIG_DIR / "token_dwell_distribution.png", dpi=150)
plt.show()
"""),
    ("code", """summary = dwell.groupby("title")["dwellMs"].agg(["count", "mean", "median", "std"]).round(1)
summary.columns = ["tokens_fixated", "mean_dwell_ms", "median_dwell_ms", "std_dwell_ms"]
summary
"""),
    ("md", """## Pupillometry — cognitive load proxy

Mean pupil diameter (averaged across both eyes when both valid) per material,
after subtracting a per-session baseline (mean over the first 30 seconds of
the session). The reading literature treats sustained pupil dilation as a
proxy for cognitive effort.

**Caveats:** no ambient-luminance logging in this build, so the contrast is
illustrative. Larger baseline-corrected pupil on difficult vs easy text is
*consistent with* increased load but not proof of it.
"""),
    ("code", """pupil = samples.copy()
pupil["leftPupilMm"] = pd.to_numeric(pupil["leftPupilMm"], errors="coerce")
pupil["rightPupilMm"] = pd.to_numeric(pupil["rightPupilMm"], errors="coerce")
mask_l = pupil["leftPupilValidity"].fillna("").str.lower() == "valid"
mask_r = pupil["rightPupilValidity"].fillna("").str.lower() == "valid"
pupil.loc[~mask_l, "leftPupilMm"] = np.nan
pupil.loc[~mask_r, "rightPupilMm"] = np.nan
pupil["pupilMm"] = pupil[["leftPupilMm", "rightPupilMm"]].mean(axis=1)

baselines = {}
for sid, group in pupil.groupby("sessionId"):
    start = group["capturedAtUnixMs"].min()
    baseline_window = group[group["capturedAtUnixMs"] <= start + 30_000]
    baselines[sid] = baseline_window["pupilMm"].mean()

pupil["baselineMm"] = pupil["sessionId"].map(baselines)
pupil["pupilDeltaMm"] = pupil["pupilMm"] - pupil["baselineMm"]
pupil = pupil.merge(
    data.materials[["sessionId", "materialRunId", "title"]],
    on=["sessionId", "materialRunId"],
    how="left",
)
load_summary = pupil.dropna(subset=["pupilDeltaMm", "title"]).groupby(["sessionId", "title"])["pupilDeltaMm"].agg(["mean", "std", "count"]).round(4)
load_summary.columns = ["mean_delta_mm", "std_delta_mm", "valid_samples"]
load_summary
"""),
    ("code", """fig, ax = plt.subplots(figsize=(7, 4))
for sid, group in pupil.dropna(subset=["pupilDeltaMm", "title"]).groupby("sessionId"):
    pname = data.sessions.loc[data.sessions.sessionId == sid, "participantName"].iat[0] or sid
    for title in materials_sorted:
        values = group.loc[group.title == title, "pupilDeltaMm"]
        if values.empty:
            continue
        offset = 0 if "easy" in title.lower() else 1
        ax.boxplot(values, positions=[offset], widths=0.4, patch_artist=True,
                   boxprops=dict(facecolor=colors.get(title, "#888"), alpha=0.6),
                   medianprops=dict(color="black"))
ax.set_xticks([0, 1])
ax.set_xticklabels(["easy text", "difficult text"])
ax.set_ylabel("Pupil diameter — baseline (mm)")
ax.set_title("Baseline-corrected pupil diameter by material")
ax.axhline(0, color="k", linewidth=0.5, linestyle="--")
fig.tight_layout()
fig.savefig(FIG_DIR / "pupil_cognitive_load.png", dpi=150)
plt.show()
"""),
    ("md", """## Token coverage per material

What fraction of the words in each material did the participant actually
fixate on? Skimming → low coverage; thorough reading → high coverage.
"""),
    ("code", """coverage_rows = []
for _, m in data.materials.iterrows():
    fixated = dwell[dwell.materialRunId == m.materialRunId]["activeTokenId"].nunique()
    coverage_rows.append({
        "material": m.title,
        "words_in_text": int(m.wordCount),
        "tokens_fixated": int(fixated),
        "coverage_pct": round(fixated / m.wordCount * 100, 1),
    })
coverage_df = pd.DataFrame(coverage_rows)
coverage_df
"""),
    ("code", """fig, ax = plt.subplots(figsize=(7, 4))
ax.bar(coverage_df["material"], coverage_df["coverage_pct"],
       color=[colors.get(t, "#888") for t in coverage_df["material"]])
ax.set_ylabel("Tokens fixated (% of words)")
ax.set_ylim(0, 100)
ax.set_title("Token coverage per material")
for i, v in enumerate(coverage_df["coverage_pct"]):
    ax.text(i, v + 1, f"{v:.0f}%", ha="center")
fig.tight_layout()
fig.savefig(FIG_DIR / "token_coverage.png", dpi=150)
plt.show()
"""),
    ("md", """## Regression rate per material

A *regression* is a token-to-token gaze move that goes **backward** in
reading order. Reading research consistently finds regressions increase with
text difficulty — readers re-read to repair comprehension.

Implementation: rank each token by the time it was first fixated within a
material, then walk the in-time-order token transitions and count moves to a
lower rank.
"""),
    ("code", """regression_rows = []
for mrid, mat_title in data.materials[["materialRunId", "title"]].itertuples(index=False):
    mt = tokens[tokens.materialRunId == mrid].copy()
    if mt.empty:
        continue
    first_seen = mt.groupby("activeTokenId")["sequenceNumber"].min().rank(method="min").to_dict()
    mt["tokenOrder"] = mt["activeTokenId"].map(first_seen)
    mt = mt.sort_values("sequenceNumber")
    trans = mt[mt["activeTokenId"] != mt["activeTokenId"].shift()]
    fwd = int((trans["tokenOrder"].diff() > 0).sum())
    rev = int((trans["tokenOrder"].diff() < 0).sum())
    minutes = (mt["capturedAtUnixMs"].max() - mt["capturedAtUnixMs"].min()) / 60_000
    regression_rows.append({
        "material": mat_title,
        "forward_moves": fwd,
        "regressions": rev,
        "regression_pct": round(rev / (fwd + rev) * 100, 1) if (fwd + rev) else float("nan"),
        "regressions_per_min": round(rev / minutes, 1) if minutes else float("nan"),
    })
regression_df = pd.DataFrame(regression_rows)
regression_df
"""),
    ("code", """fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4))
ax1.bar(regression_df["material"], regression_df["regression_pct"],
        color=[colors.get(t, "#888") for t in regression_df["material"]])
ax1.set_ylabel("Regressions (% of token moves)")
ax1.set_title("Regression rate (% of moves)")
for i, v in enumerate(regression_df["regression_pct"]):
    ax1.text(i, v + 0.3, f"{v:.1f}%", ha="center")

ax2.bar(regression_df["material"], regression_df["regressions_per_min"],
        color=[colors.get(t, "#888") for t in regression_df["material"]])
ax2.set_ylabel("Regressions per minute")
ax2.set_title("Regression rate (per minute)")
for i, v in enumerate(regression_df["regressions_per_min"]):
    ax2.text(i, v + 0.5, f"{v:.1f}", ha="center")
fig.tight_layout()
fig.savefig(FIG_DIR / "regression_rate.png", dpi=150)
plt.show()
"""),
    ("md", """## Honest note on pupillometry

The pupil-delta plot above shows the two materials are essentially
indistinguishable (means within 0.005 mm of each other — well inside sensor
noise). Three plausible reasons:

1. **Baseline contamination** — "first 30 s" overlaps with material-0
   reading. A clean baseline would use a pre-reading-area window.
2. **No ambient luminance logging** — pupil is dominated by light, not
   cognition. With constant illumination this would still work; we don't
   know the illumination is constant.
3. **The difficulty contrast may not be large enough for this reader.**
   Keerthi is self-reported intermediate proficiency on what are general-
   audience texts — the cognitive-load gap may genuinely be small.

This is a *null result*, not a broken pipeline. The signal is captured,
faithfully exported, and analyzable — it just doesn't tell the story we
hoped for here. Future sessions with a documented baseline window and
controlled ambient light should resolve this.
"""),
    ("md", """## Takeaway

Five plots, five signals, one participant:

| Plot                        | Reading-research metric           | Result for Keerthi |
|-----------------------------|------------------------------------|--------------------|
| WPM per material            | Reading fluency                   | 205 vs 171 — clear ↓ on difficult |
| Token dwell distribution    | Per-word reading time             | Means similar, difficult has fatter tail |
| Token coverage              | Skim vs thorough reading          | 63% vs 79% — strongest difficulty signal |
| Regression rate             | Comprehension repair              | Difficult ↑ ~30% regressions/min |
| Pupil delta by material     | Cognitive load proxy              | Null result (see honest note above) |

All five are computed off the processed v3 export with no extra hardware
logging. Adding more participants in `Experiments/data/` extends every plot
without changing the code.
"""),
]


if __name__ == "__main__":
    make_notebook(cells_00, HERE / "00_load.ipynb")
    make_notebook(cells_01, HERE / "01_data_quality.ipynb")
    make_notebook(cells_02, HERE / "02_reading_signals.ipynb")
