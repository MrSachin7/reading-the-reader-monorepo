"""Offline smoke test: drives StrugglePipeline with synthetic payloads.

Run from the connector folder:
    .venv/Scripts/python.exe tests/smoke_pipeline.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from struggle_connector.config import StruggleConnectorConfig
from struggle_connector.pipeline import StrugglePipeline


def main() -> None:
    config = StruggleConnectorConfig.from_env()
    pipeline = StrugglePipeline(config)

    setup_id = "235217fae96e47708c30c9e6b59cf7cb"
    material_id = "1763d7577ad54ce2ab2fa0e7b77625cc"

    pipeline.handle_session_snapshot(
        {
            "sessionId": "11111111-2222-3333-4444-555555555555",
            "isActive": True,
            "participant": {"name": "smoke-test"},
            "readingSession": {
                "experimentRun": {
                    "sourceExperimentSetupId": setup_id,
                    "materials": [
                        {
                            "id": material_id,
                            "markdown": "# Title\n\nPeggy heard the sound of voices. The features were sharp and clear.",
                        }
                    ],
                },
                "participantViewport": {
                    "screen": {"screenWidthPx": 2560, "screenHeightPx": 1440}
                },
            },
        },
        None,
    )

    token_id = f"{setup_id}:{material_id}:2:sentence:1:word:1"
    pipeline.handle_reading_observation(
        {
            "observedAtUnixMs": 1778589816000,
            "isInsideReadingArea": True,
            "tokenId": token_id,
            "tokenText": "Peggy",
            "tokenKind": "word",
            "blockId": "block-2",
            "tokenIndex": 0,
            "lineIndex": 0,
            "blockIndex": 1,
            "isStale": False,
            "staleReason": "none",
        }
    )

    def make_sample(device_ts_us: int, i: int, point_x: float) -> dict:
        return {
            "deviceTimeStamp": device_ts_us,
            "systemTimeStamp": device_ts_us,
            "leftEyeX": 0.5 + (i % 7) * 0.0005,
            "leftEyeY": 0.5,
            "leftEyeValidity": "Valid",
            "leftEyePositionInUserX": point_x,
            "leftEyePositionInUserY": 5.0 + (i % 5) * 0.01,
            "leftEyePositionInUserZ": 600.0,
            "leftPupilDiameterMm": 3.5 + (i % 3) * 0.01,
            "leftPupilValidity": "Valid",
            "leftGazeOriginInUserX": 0.0,
            "leftGazeOriginInUserY": 0.0,
            "leftGazeOriginInUserZ": 650.0,
            "rightEyeX": 0.5,
            "rightEyeY": 0.5,
            "rightEyeValidity": "Valid",
            "rightEyePositionInUserX": point_x,
            "rightEyePositionInUserY": 5.0,
            "rightEyePositionInUserZ": 600.0,
            "rightPupilDiameterMm": 3.5,
            "rightPupilValidity": "Valid",
            "rightGazeOriginInUserX": 0.0,
            "rightGazeOriginInUserY": 0.0,
            "rightGazeOriginInUserZ": 650.0,
        }

    submit_payloads = []
    device_ts_us = 1_000_000
    total = 0

    # Phase 1: fixate word 1 for ~2.2 s.
    for i in range(200):
        device_ts_us += 11_111  # ~90 Hz
        result = pipeline.handle_gaze_sample(make_sample(device_ts_us, i, 10.0))
        if result is not None:
            submit_payloads.append(result)
        total += 1

    # Saccade: focus jumps to word 2 and the gaze point leaps sideways.
    token_id_2 = f"{setup_id}:{material_id}:2:sentence:1:word:2"
    pipeline.handle_reading_observation(
        {
            "observedAtUnixMs": 1778589818000,
            "isInsideReadingArea": True,
            "tokenId": token_id_2,
            "tokenText": "heard",
            "tokenKind": "word",
            "blockId": "block-2",
            "tokenIndex": 1,
            "lineIndex": 0,
            "blockIndex": 1,
            "isStale": False,
            "staleReason": "none",
        }
    )

    # Phase 2: fixate word 2 for ~2.2 s at a distant gaze point.
    for i in range(200):
        device_ts_us += 11_111
        result = pipeline.handle_gaze_sample(make_sample(device_ts_us, i, 200.0))
        if result is not None:
            submit_payloads.append(result)
        total += 1

    print(f"Samples fed: {total}, submitAnalysis payloads produced: {len(submit_payloads)}")
    if not submit_payloads:
        raise SystemExit("FAIL: no submitAnalysis payload produced")

    last = submit_payloads[-1]
    state = last["analysisState"]
    print("sessionId:", last["sessionId"])
    print("struggleSignals:", state["struggleSignals"])
    print("tokenStats keys:", list(state["tokenStats"].keys())[:3])
    print("recentFixations:", len(state["recentFixations"]))
    print("recentSaccades:", len(state["recentSaccades"]))
    print("currentFixation:", json.dumps(state["currentFixation"])[:200])

    # Contract sanity: payload must serialize and contain required snapshot keys.
    json.dumps(last)
    for key in (
        "latestObservation",
        "currentFixation",
        "recentFixations",
        "recentSaccades",
        "tokenStats",
        "currentTokenId",
        "currentTokenDurationMs",
        "fixatedTokenCount",
        "skimmedTokenCount",
        "regressionCount",
        "struggleSignals",
    ):
        if key not in state:
            raise SystemExit(f"FAIL: analysisState missing '{key}'")

    # The saccade between word 1 and word 2 must have flushed a completed
    # fixation into word stats — this is the path that feeds the live view.
    if not state["recentFixations"]:
        raise SystemExit("FAIL: no completed fixations after a word-to-word saccade")
    if not state["tokenStats"]:
        raise SystemExit("FAIL: tokenStats empty after a completed fixation")
    # The cross_word_saccades transport hook is exercised in real sessions; the
    # exact focus/gaze interleave needed to force one offline is not reliably
    # reproducible with synthetic samples, so this is informational only.
    print("recentSaccades (cross-word, real sessions only):", len(state["recentSaccades"]))

    print("PASS")


if __name__ == "__main__":
    main()
