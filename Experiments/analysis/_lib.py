"""Streaming loader for processed experiment exports.

Reads `rtr.processed-experiment-export` JSON files (v2 or v3) without loading
the entire file into memory, and produces three pandas DataFrames:

- `sessions` : one row per session (metadata, calibration, screen, condition)
- `materials`: one row per (session, material) with summary counts
- `samples`  : flat gaze stream — one row per gaze sample, focus pre-joined

Designed to scale: drop more JSONs into `Experiments/data/` and re-run
`load_all(...)`.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import ijson
import pandas as pd

SUPPORTED_SCHEMA = "rtr.processed-experiment-export"
SUPPORTED_VERSIONS = (2, 3)


@dataclass(frozen=True)
class LoadedSession:
    sessions: pd.DataFrame
    materials: pd.DataFrame
    samples: pd.DataFrame


def _to_float(value):
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _gaze_xy(sample_side):
    if not sample_side:
        return None, None, None
    point = sample_side.get("gazePoint2D") or {}
    return _to_float(point.get("x")), _to_float(point.get("y")), point.get("validity")


def _pupil(sample_side):
    if not sample_side:
        return None, None
    pupil = sample_side.get("pupil") or {}
    return _to_float(pupil.get("diameterMm")), pupil.get("validity")


def load_file(path: Path) -> LoadedSession:
    """Stream-load one processed export JSON into three DataFrames."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(path)

    # Pass 1: manifest + experiment + content + materialSummaries + run.materials
    with path.open("rb") as f:
        parser = ijson.parse(f)
        manifest: dict = {}
        experiment: dict = {}
        content: dict = {}
        material_summaries: list[dict] = []
        run_materials: list[dict] = []

        prefix_targets = {
            "manifest": manifest,
            "experiment": experiment,
            "content": content,
        }
        for prefix in prefix_targets:
            f.seek(0)
            for obj in ijson.items(f, prefix):
                prefix_targets[prefix].update(obj)
                break

        f.seek(0)
        for item in ijson.items(f, "materialSummaries.item"):
            material_summaries.append(item)

        f.seek(0)
        for item in ijson.items(f, "experiment.run.materials.item"):
            run_materials.append(item)

    schema = manifest.get("schema")
    version = manifest.get("version")
    if schema != SUPPORTED_SCHEMA:
        raise ValueError(f"{path.name}: unexpected schema {schema!r}")
    if version not in SUPPORTED_VERSIONS:
        raise ValueError(f"{path.name}: unsupported version {version!r}")

    session_id = experiment.get("sessionId")
    participant = experiment.get("participant") or {}
    screen = experiment.get("screen") or {}
    calibration = experiment.get("calibration") or {}
    condition = experiment.get("condition") or {}

    sessions_row = {
        "sessionId": session_id,
        "sourceFile": path.name,
        "schemaVersion": version,
        "participantName": participant.get("name"),
        "participantAge": participant.get("age"),
        "participantSex": participant.get("sex"),
        "existingEyeCondition": participant.get("existingEyeCondition"),
        "readingProficiency": participant.get("readingProficiency"),
        "conditionLabel": condition.get("conditionLabel"),
        "conditionProviderId": condition.get("providerId"),
        "conditionExecutionMode": condition.get("executionMode"),
        "startedAtUnixMs": experiment.get("startedAtUnixMs"),
        "endedAtUnixMs": experiment.get("endedAtUnixMs"),
        "durationMs": experiment.get("durationMs"),
        "screenWidthPx": screen.get("screenWidthPx"),
        "screenHeightPx": screen.get("screenHeightPx"),
        "physicalScreenWidthPx": screen.get("physicalScreenWidthPx"),
        "physicalScreenHeightPx": screen.get("physicalScreenHeightPx"),
        "devicePixelRatio": screen.get("devicePixelRatio"),
        "calibrationApplied": calibration.get("applied"),
        "calibrationValidationPassed": calibration.get("validationPassed"),
        "calibrationQuality": calibration.get("quality"),
        "calibrationAccuracyDegrees": _to_float(calibration.get("averageAccuracyDegrees")),
        "calibrationPrecisionDegrees": _to_float(calibration.get("averagePrecisionDegrees")),
        "calibrationSampleCount": calibration.get("sampleCount"),
        "documentTitle": content.get("title"),
        "documentId": content.get("documentId"),
        "contentHash": content.get("contentHash"),
        "exportedAtUnixMs": manifest.get("exportedAtUnixMs"),
        "completionSource": manifest.get("completionSource"),
    }
    sessions_df = pd.DataFrame([sessions_row])

    materials_index = {m["id"]: m for m in run_materials if m.get("id")}
    materials_rows = []
    for summary in material_summaries:
        material_id = summary.get("materialRunId")
        material_def = materials_index.get(material_id, {})
        markdown = material_def.get("markdown") or ""
        # Token approximation: whitespace-separated words after stripping markdown headers/punct
        word_count = len([w for w in markdown.split() if any(c.isalpha() for c in w)])
        materials_rows.append({
            "sessionId": session_id,
            "materialRunId": material_id,
            "order": summary.get("order"),
            "title": summary.get("title"),
            "wordCount": word_count,
            "gazeSampleCount": summary.get("gazeSampleCount"),
            "focusEventCount": summary.get("focusEventCount"),
            "firstObservedAtUnixMs": summary.get("firstObservedAtUnixMs"),
            "lastObservedAtUnixMs": summary.get("lastObservedAtUnixMs"),
        })
    materials_df = pd.DataFrame(materials_rows)

    # Pass 2: gazeSamples (streaming, this is the big one)
    sample_rows = []
    with path.open("rb") as f:
        for sample in ijson.items(f, "gazeSamples.item"):
            left = sample.get("left") or {}
            right = sample.get("right") or {}
            focus = sample.get("focus") or {}
            lx, ly, lv = _gaze_xy(left)
            rx, ry, rv = _gaze_xy(right)
            lp, lpv = _pupil(left)
            rp, rpv = _pupil(right)
            sample_rows.append((
                session_id,
                sample.get("sequenceNumber"),
                sample.get("capturedAtUnixMs"),
                sample.get("deviceTimeStampUs"),
                sample.get("systemTimeStampUs"),
                lx, ly, lv, lp, lpv,
                rx, ry, rv, rp, rpv,
                bool(focus.get("isInsideReadingArea")),
                _to_float(focus.get("normalizedContentX")),
                _to_float(focus.get("normalizedContentY")),
                focus.get("activeTokenId"),
                focus.get("activeBlockId"),
                focus.get("activeSentenceId"),
                focus.get("activeTokenText"),
                sample.get("materialRunId"),
                sample.get("materialIndex"),
            ))

    samples_df = pd.DataFrame(sample_rows, columns=[
        "sessionId", "sequenceNumber", "capturedAtUnixMs",
        "deviceTimeStampUs", "systemTimeStampUs",
        "leftX", "leftY", "leftValidity", "leftPupilMm", "leftPupilValidity",
        "rightX", "rightY", "rightValidity", "rightPupilMm", "rightPupilValidity",
        "isInsideReadingArea", "normalizedContentX", "normalizedContentY",
        "activeTokenId", "activeBlockId", "activeSentenceId", "activeTokenText",
        "materialRunId", "materialIndex",
    ])

    return LoadedSession(sessions=sessions_df, materials=materials_df, samples=samples_df)


def load_all(data_dir: Path, pattern: str = "*processed*v3*.json") -> LoadedSession:
    """Load every matching file in `data_dir` and concatenate.

    Defaults to v3 processed files. Pass `pattern='*processed*.json'` to also
    pick up v2 exports.
    """
    data_dir = Path(data_dir)
    files = sorted(data_dir.glob(pattern))
    if not files:
        raise FileNotFoundError(f"No files matching {pattern!r} in {data_dir}")

    sessions, materials, samples = [], [], []
    for path in files:
        loaded = load_file(path)
        sessions.append(loaded.sessions)
        materials.append(loaded.materials)
        samples.append(loaded.samples)

    return LoadedSession(
        sessions=pd.concat(sessions, ignore_index=True),
        materials=pd.concat(materials, ignore_index=True),
        samples=pd.concat(samples, ignore_index=True),
    )


def write_cache(loaded: LoadedSession, cache_dir: Path) -> dict[str, Path]:
    cache_dir = Path(cache_dir)
    cache_dir.mkdir(parents=True, exist_ok=True)
    paths = {
        "sessions": cache_dir / "sessions.parquet",
        "materials": cache_dir / "materials.parquet",
        "samples": cache_dir / "samples.parquet",
    }
    loaded.sessions.to_parquet(paths["sessions"], index=False)
    loaded.materials.to_parquet(paths["materials"], index=False)
    loaded.samples.to_parquet(paths["samples"], index=False)
    return paths


def read_cache(cache_dir: Path) -> LoadedSession:
    cache_dir = Path(cache_dir)
    return LoadedSession(
        sessions=pd.read_parquet(cache_dir / "sessions.parquet"),
        materials=pd.read_parquet(cache_dir / "materials.parquet"),
        samples=pd.read_parquet(cache_dir / "samples.parquet"),
    )


def per_sample_interval_ms(samples: pd.DataFrame) -> pd.Series:
    """Compute inter-sample interval per session (ms) using deviceTimeStampUs."""
    s = samples.sort_values(["sessionId", "sequenceNumber"]).copy()
    s["intervalMs"] = (
        s.groupby("sessionId")["deviceTimeStampUs"].diff() / 1000.0
    )
    return s["intervalMs"]
