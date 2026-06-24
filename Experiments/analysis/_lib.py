"""Loader and tidy-table builder for Reading-the-Reader experiment exports.

Reads the **full** experiment export (`rtr.experiment-export`, v7) plus its matched
**telemetry** export (`rtr.experiment-telemetry`, v1) and produces a set of tidy
pandas DataFrames keyed by (participant, condition).

Folder-driven and append-only: the analysis discovers everything under
``Experiments/data/<condition>/`` automatically, so dropping in more participants
(or more conditions, same format) and re-running ``load_all`` extends every table.

    data/
      with-context-preservation/
        <Participant>-with.json            # full export
        telemetry/<Participant>.json        # telemetry export
      without-context-preservation/
        <Participant>-without.json
        telemetry/<Participant>.json

Condition is taken from the folder name, participant from the file stem.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, fields
from pathlib import Path

import pandas as pd

FULL_SCHEMA = "rtr.experiment-export"
TELEMETRY_SCHEMA = "rtr.experiment-telemetry"

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
OUTPUTS_DIR = Path(__file__).resolve().parent / "outputs"
CACHE_DIR = OUTPUTS_DIR / "cache"
FIGURES_DIR = OUTPUTS_DIR / "figures"
TABLES_DIR = OUTPUTS_DIR / "tables"

# Stable order/labels/colours for plotting.
CONDITION_LABELS = {"with": "With preservation", "without": "Without preservation"}
CONDITION_ORDER = ["with", "without"]
CONDITION_COLORS = {"with": "#1f3b73", "without": "#b03a2e"}  # navy / dtu-red-ish
LATENCY_BUDGET_MS = 100.0


def apply_style() -> None:
    """Thesis-friendly matplotlib defaults (vector-safe, restrained)."""
    import matplotlib.pyplot as plt

    plt.rcParams.update({
        "figure.dpi": 110,
        "savefig.bbox": "tight",
        "font.size": 10,
        "axes.titlesize": 11,
        "axes.spines.top": False,
        "axes.spines.right": False,
        "axes.grid": True,
        "grid.alpha": 0.25,
        "pdf.fonttype": 42,  # embed TrueType so text stays selectable/vector
    })


def save_fig(fig, name: str) -> Path:
    """Save a figure as vector PDF under outputs/figures/ (thesis rule)."""
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    path = FIGURES_DIR / f"{name}.pdf"
    fig.savefig(path)
    return path


def save_table(df: pd.DataFrame, name: str) -> Path:
    """Save a tidy table as CSV under outputs/tables/."""
    TABLES_DIR.mkdir(parents=True, exist_ok=True)
    path = TABLES_DIR / f"{name}.csv"
    df.to_csv(path, index=False)
    return path


@dataclass(frozen=True)
class LoadedData:
    sessions: pd.DataFrame
    gaze: pd.DataFrame
    fixations: pd.DataFrame
    saccades: pd.DataFrame
    interventions: pd.DataFrame
    context_preservation: pd.DataFrame
    lifecycle: pd.DataFrame
    telemetry: pd.DataFrame


# --------------------------------------------------------------------------- #
# Discovery
# --------------------------------------------------------------------------- #
def _condition_from_folder(folder_name: str) -> str:
    return "without" if "without" in folder_name.lower() else "with"


@dataclass(frozen=True)
class _Discovered:
    full_path: Path
    telemetry_path: Path | None
    participant: str
    condition: str


def discover(data_dir: Path = DATA_DIR) -> list[_Discovered]:
    data_dir = Path(data_dir)
    found: list[_Discovered] = []
    for path in sorted(data_dir.rglob("*.json")):
        if "telemetry" in path.parts:
            continue
        condition = _condition_from_folder(path.parent.name)
        participant = path.stem
        for suffix in ("-with", "-without", f"-{condition}"):
            if participant.lower().endswith(suffix):
                participant = participant[: -len(suffix)]
                break
        telemetry_path = path.parent / "telemetry" / f"{participant}.json"
        found.append(_Discovered(
            full_path=path,
            telemetry_path=telemetry_path if telemetry_path.exists() else None,
            participant=participant,
            condition=condition,
        ))
    return found


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _g(d, *path, default=None):
    cur = d
    for key in path:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(key)
    return default if cur is None else cur


def _eye(side: dict | None) -> dict:
    side = side or {}
    point = side.get("gazePoint2D") or {}
    pupil = side.get("pupil") or {}
    return {
        "x": point.get("x"),
        "y": point.get("y"),
        "validity": point.get("validity"),
        "pupilMm": pupil.get("diameterMm"),
    }


def _achieved_hz(gaze_samples: list[dict]) -> float | None:
    ts = [s.get("deviceTimeStampUs") for s in gaze_samples if s.get("deviceTimeStampUs")]
    if len(ts) < 3:
        return None
    span_s = (ts[-1] - ts[0]) / 1e6
    return round((len(ts) - 1) / span_s, 2) if span_s > 0 else None


# --------------------------------------------------------------------------- #
# Per-session parsing
# --------------------------------------------------------------------------- #
def load_file(item: _Discovered) -> dict[str, pd.DataFrame]:
    doc = json.loads(item.full_path.read_bytes())
    schema = _g(doc, "manifest", "schema")
    if schema != FULL_SCHEMA:
        raise ValueError(f"{item.full_path.name}: unexpected schema {schema!r}")

    key = f"{item.participant}/{item.condition}"
    base = {"sessionKey": key, "participant": item.participant, "condition": item.condition}

    exp = doc.get("experiment", {}) or {}
    sensing = doc.get("sensing", {}) or {}
    derived = doc.get("derived", {}) or {}
    interventions = doc.get("interventions", {}) or {}
    content = doc.get("content", {}) or {}
    gaze_samples = sensing.get("gazeSamples", []) or []
    cpe = derived.get("contextPreservationEvents", []) or []
    fix = derived.get("fixationEvents", []) or []
    sac = derived.get("saccadeEvents", []) or []
    iev = interventions.get("interventionEvents", []) or []
    life = exp.get("lifecycleEvents", []) or []

    # ---- sessions (one row) ----
    session_row = {
        **base,
        "sourceFile": str(item.full_path.relative_to(DATA_DIR)),
        "schemaVersion": _g(doc, "manifest", "version"),
        "providerId": _g(exp, "condition", "providerId"),
        "executionMode": _g(exp, "condition", "executionMode"),
        "conditionLabel": _g(exp, "condition", "conditionLabel"),
        "gazeSource": _g(sensing, "signalSources", "gazeSource"),
        "faceSource": _g(sensing, "signalSources", "faceSource"),
        "startedAtUnixMs": exp.get("startedAtUnixMs"),
        "endedAtUnixMs": exp.get("endedAtUnixMs"),
        "durationMs": exp.get("durationMs"),
        "durationSec": (exp.get("durationMs") or 0) / 1000.0 or None,
        "screenWidthPx": _g(exp, "screen", "screenWidthPx"),
        "screenHeightPx": _g(exp, "screen", "screenHeightPx"),
        "devicePixelRatio": _g(exp, "screen", "devicePixelRatio"),
        "calibrationApplied": _g(exp, "calibration", "applied"),
        "calibrationValidationPassed": _g(exp, "calibration", "validationPassed"),
        "calibrationQuality": _g(exp, "calibration", "quality"),
        "calibrationAccuracyDeg": _g(exp, "calibration", "averageAccuracyDegrees"),
        "calibrationPrecisionDeg": _g(exp, "calibration", "averagePrecisionDegrees"),
        "participantName": _g(exp, "participant", "name"),
        "participantAge": _g(exp, "participant", "age"),
        "participantSex": _g(exp, "participant", "sex"),
        "documentTitle": content.get("title"),
        "documentId": content.get("documentId"),
        "contentHash": content.get("contentHash"),
        "achievedHz": _achieved_hz(gaze_samples),
        "nGazeSamples": len(gaze_samples),
        "nFixations": len(fix),
        "nSaccades": len(sac),
        "nInterventions": len(iev),
        "nContextPreservationEvents": len(cpe),
        "nLifecycleEvents": len(life),
    }

    # ---- gaze ----
    gaze_rows = []
    for s in gaze_samples:
        left = _eye(s.get("left"))
        right = _eye(s.get("right"))
        gaze_rows.append({
            **base,
            "sequenceNumber": s.get("sequenceNumber"),
            "capturedAtUnixMs": s.get("capturedAtUnixMs"),
            "deviceTimeStampUs": s.get("deviceTimeStampUs"),
            "systemTimeStampUs": s.get("systemTimeStampUs"),
            "leftX": left["x"], "leftY": left["y"], "leftValidity": left["validity"], "leftPupilMm": left["pupilMm"],
            "rightX": right["x"], "rightY": right["y"], "rightValidity": right["validity"], "rightPupilMm": right["pupilMm"],
        })

    # ---- fixations ----
    fix_rows = [{
        **base,
        "occurredAtUnixMs": e.get("occurredAtUnixMs"),
        **{k: _g(e, "fixation", k) for k in
           ("tokenId", "tokenText", "tokenIndex", "lineIndex", "blockIndex",
            "startedAtUnixMs", "endedAtUnixMs", "durationMs")},
    } for e in fix]

    # ---- saccades ----
    sac_rows = [{
        **base,
        "occurredAtUnixMs": e.get("occurredAtUnixMs"),
        **{k: _g(e, "saccade", k) for k in
           ("fromTokenIndex", "toTokenIndex", "lineDelta", "blockDelta",
            "startedAtUnixMs", "endedAtUnixMs", "durationMs", "direction", "isRegression")},
    } for e in sac]

    # ---- interventions ----
    iv_rows = []
    for e in iev:
        iv = e.get("intervention", {}) or {}
        affected = iv.get("affectedPresentationProperties") or []
        params = iv.get("parameters") or {}
        iv_rows.append({
            **base,
            "occurredAtUnixMs": e.get("occurredAtUnixMs"),
            "interventionId": iv.get("id"),
            "appliedAtUnixMs": iv.get("appliedAtUnixMs"),
            "source": iv.get("source"),
            "moduleId": iv.get("moduleId"),
            "reason": iv.get("reason"),
            "appliedBoundary": iv.get("appliedBoundary"),
            "waitDurationMs": iv.get("waitDurationMs"),
            "affectedProperties": ",".join(affected),
            "isLayoutChanging": len(affected) > 0,
            "restoreMode": "semantic-restart" if affected else "offset-preserve",
            "fontSizePx": _g(iv, "appliedPresentation", "fontSizePx") or params.get("fontSizePx"),
        })

    # ---- context preservation ----
    cp_rows = []
    for e in cpe:
        cp = e.get("contextPreservation", {}) or {}
        cp_rows.append({
            **base,
            "occurredAtUnixMs": e.get("occurredAtUnixMs"),
            **{k: cp.get(k) for k in
               ("status", "anchorSource", "anchorErrorPx", "viewportDeltaPx",
                "commitBoundary", "waitDurationMs",
                "interventionAppliedAtUnixMs", "measuredAtUnixMs", "reason")},
        })

    # ---- lifecycle ----
    life_rows = [{
        **base,
        "sequenceNumber": e.get("sequenceNumber"),
        "eventType": e.get("eventType"),
        "source": e.get("source"),
        "occurredAtUnixMs": e.get("occurredAtUnixMs"),
    } for e in life]

    # ---- telemetry ----
    tel_rows = []
    if item.telemetry_path is not None:
        tdoc = json.loads(item.telemetry_path.read_bytes())
        if _g(tdoc, "manifest", "schema") == TELEMETRY_SCHEMA:
            for s in tdoc.get("samples", []) or []:
                tel_rows.append({
                    **base,
                    "sequenceNumber": s.get("sequenceNumber"),
                    "occurredAtUnixMs": s.get("occurredAtUnixMs"),
                    "role": s.get("role"),
                    "rttMs": s.get("rttMs"),
                    "sampleRateHz": s.get("sampleRateHz"),
                    "validityRate": s.get("validityRate"),
                })

    return {
        "sessions": pd.DataFrame([session_row]),
        "gaze": pd.DataFrame(gaze_rows),
        "fixations": pd.DataFrame(fix_rows),
        "saccades": pd.DataFrame(sac_rows),
        "interventions": pd.DataFrame(iv_rows),
        "context_preservation": pd.DataFrame(cp_rows),
        "lifecycle": pd.DataFrame(life_rows),
        "telemetry": pd.DataFrame(tel_rows),
    }


def load_all(data_dir: Path = DATA_DIR) -> LoadedData:
    items = discover(data_dir)
    if not items:
        raise FileNotFoundError(f"No experiment exports found under {data_dir}")

    parts: dict[str, list[pd.DataFrame]] = {f.name: [] for f in fields(LoadedData)}
    for item in items:
        tables = load_file(item)
        for name in parts:
            parts[name].append(tables[name])

    def concat(name: str) -> pd.DataFrame:
        frames = [f for f in parts[name] if not f.empty]
        return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()

    return LoadedData(**{name: concat(name) for name in parts})


# --------------------------------------------------------------------------- #
# Cache
# --------------------------------------------------------------------------- #
def write_cache(data: LoadedData, cache_dir: Path = CACHE_DIR) -> None:
    cache_dir = Path(cache_dir)
    cache_dir.mkdir(parents=True, exist_ok=True)
    for f in fields(LoadedData):
        getattr(data, f.name).to_pickle(cache_dir / f"{f.name}.pkl")


def read_cache(cache_dir: Path = CACHE_DIR) -> LoadedData:
    cache_dir = Path(cache_dir)
    return LoadedData(**{
        f.name: pd.read_pickle(cache_dir / f"{f.name}.pkl") for f in fields(LoadedData)
    })


# --------------------------------------------------------------------------- #
# Post-intervention windowed measures (RQ3 behaviour, aligned to interventions)
# --------------------------------------------------------------------------- #
FORWARD_SACCADE_DIRECTIONS = {"forward", "line-change-forward"}


def compute_post_intervention(
    data: LoadedData,
    window_s: float = 5.0,
    rrt_max_s: float = 30.0,
) -> pd.DataFrame:
    """One row per applied intervention, with measures taken *after* it.

    Aligns the gaze stream to each intervention's ``appliedAtUnixMs`` rather than
    averaging over the whole session, so the measures isolate the post-intervention
    recovery that context preservation is meant to affect:

    - ``rrtMs``: reading-resume time, the elapsed time to the first forward saccade
      after the intervention (the reader's next forward reading movement).
    - ``postRegressionRate``: regressions per saccade in the ``window_s`` after it.
    - ``preRegressionRate``: the same in the matched window *before* it (a baseline),
      and ``regressionRateDelta`` = post minus pre.

    Windows are capped at the neighbouring interventions so they never bleed across
    interventions. Saccade times use the saccade's own start (falling back to the
    recorded event time).
    """
    iv = data.interventions
    sac = data.saccades
    if iv is None or sac is None or iv.empty or sac.empty:
        return pd.DataFrame()

    sac = sac.copy()
    sac["t"] = sac["startedAtUnixMs"].fillna(sac["occurredAtUnixMs"])
    sac = sac.dropna(subset=["t"])

    win_ms = window_s * 1000.0
    rrt_max_ms = rrt_max_s * 1000.0
    rows = []
    for _, r in iv.sort_values(["sessionKey", "appliedAtUnixMs"]).iterrows():
        key, t = r["sessionKey"], r["appliedAtUnixMs"]
        if pd.isna(t):
            continue
        applied = iv.loc[iv["sessionKey"] == key, "appliedAtUnixMs"]
        nxt = applied[applied > t].min()
        prv = applied[applied < t].max()
        nxt = nxt if pd.notna(nxt) else float("inf")
        prv = prv if pd.notna(prv) else float("-inf")
        s = sac[sac["sessionKey"] == key]

        post = s[(s["t"] > t) & (s["t"] <= min(t + win_ms, nxt))]
        pre = s[(s["t"] > max(t - win_ms, prv)) & (s["t"] <= t)]
        fwd = s[(s["t"] > t) & (s["t"] <= min(t + rrt_max_ms, nxt))
                & s["direction"].isin(FORWARD_SACCADE_DIRECTIONS)]

        rows.append({
            "sessionKey": key, "participant": r["participant"], "condition": r["condition"],
            "appliedAtUnixMs": t, "moduleId": r.get("moduleId"),
            "rrtMs": (fwd["t"].min() - t) if not fwd.empty else None,
            "postSaccades": len(post),
            "postRegressions": int(post["isRegression"].sum()) if not post.empty else 0,
            "postRegressionRate": post["isRegression"].mean() if not post.empty else None,
            "preRegressionRate": pre["isRegression"].mean() if not pre.empty else None,
        })

    df = pd.DataFrame(rows)
    if not df.empty:
        df["regressionRateDelta"] = df["postRegressionRate"] - df["preRegressionRate"]
    return df
