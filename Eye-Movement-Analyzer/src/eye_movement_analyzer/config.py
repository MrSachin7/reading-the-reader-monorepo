from __future__ import annotations

from dataclasses import dataclass
import os


def _read_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default

    try:
        return int(value)
    except ValueError as exc:
        raise ValueError(f"Environment variable {name} must be an integer.") from exc


@dataclass(frozen=True)
class EyeMovementAnalyzerConfig:
    ws_url: str
    provider_id: str
    display_name: str
    shared_secret: str
    heartbeat_interval_seconds: int
    reconnect_delay_seconds: int
    initial_fixation_threshold_ms: int
    same_line_fixation_threshold_ms: int
    new_line_fixation_threshold_ms: int
    skim_threshold_ms: int
    fixation_threshold_ms: int
    point_stale_after_ms: int
    clear_fixation_after_ms: int

    @classmethod
    def from_env(cls) -> "EyeMovementAnalyzerConfig":
        return cls(
            ws_url=os.getenv("EYE_MOVEMENT_ANALYZER_WS_URL", "ws://localhost:5190/ws/analysis-provider"),
            provider_id=os.getenv("EYE_MOVEMENT_ANALYZER_PROVIDER_ID", "mock-python-analysis"),
            display_name=os.getenv("EYE_MOVEMENT_ANALYZER_DISPLAY_NAME", "Mock Python Eye Movement Analyzer"),
            shared_secret=os.getenv(
                "EYE_MOVEMENT_ANALYZER_SHARED_SECRET",
                "change-me-local-analysis-provider-secret",
            ),
            heartbeat_interval_seconds=max(1, _read_int("EYE_MOVEMENT_ANALYZER_HEARTBEAT_INTERVAL_SECONDS", 5)),
            reconnect_delay_seconds=max(1, _read_int("EYE_MOVEMENT_ANALYZER_RECONNECT_DELAY_SECONDS", 3)),
            initial_fixation_threshold_ms=max(1, _read_int("EYE_MOVEMENT_ANALYZER_INITIAL_FIXATION_THRESHOLD_MS", 90)),
            same_line_fixation_threshold_ms=max(1, _read_int("EYE_MOVEMENT_ANALYZER_SAME_LINE_FIXATION_THRESHOLD_MS", 70)),
            new_line_fixation_threshold_ms=max(1, _read_int("EYE_MOVEMENT_ANALYZER_NEW_LINE_FIXATION_THRESHOLD_MS", 135)),
            skim_threshold_ms=max(1, _read_int("EYE_MOVEMENT_ANALYZER_SKIM_THRESHOLD_MS", 45)),
            fixation_threshold_ms=max(1, _read_int("EYE_MOVEMENT_ANALYZER_FIXATION_THRESHOLD_MS", 130)),
            point_stale_after_ms=max(1, _read_int("EYE_MOVEMENT_ANALYZER_POINT_STALE_AFTER_MS", 650)),
            clear_fixation_after_ms=max(1, _read_int("EYE_MOVEMENT_ANALYZER_CLEAR_FIXATION_AFTER_MS", 1500)),
        )
