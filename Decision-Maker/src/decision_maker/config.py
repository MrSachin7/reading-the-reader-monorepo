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
class DecisionMakerConfig:
    ws_url: str
    provider_id: str
    display_name: str
    shared_secret: str
    heartbeat_interval_seconds: int
    reconnect_delay_seconds: int
    fixation_threshold_ms: int
    min_proposal_interval_ms: int
    font_size_step_px: int
    max_font_size_px: int

    @classmethod
    def from_env(cls) -> "DecisionMakerConfig":
        return cls(
            ws_url=os.getenv("DECISION_MAKER_WS_URL", "ws://localhost:5190/ws/provider"),
            provider_id=os.getenv("DECISION_MAKER_PROVIDER_ID", "mock-python"),
            display_name=os.getenv("DECISION_MAKER_DISPLAY_NAME", "Mock Python Decision Maker"),
            shared_secret=os.getenv("DECISION_MAKER_SHARED_SECRET", "change-me-local-provider-secret"),
            heartbeat_interval_seconds=max(1, _read_int("DECISION_MAKER_HEARTBEAT_INTERVAL_SECONDS", 5)),
            reconnect_delay_seconds=max(1, _read_int("DECISION_MAKER_RECONNECT_DELAY_SECONDS", 3)),
            fixation_threshold_ms=max(1, _read_int("DECISION_MAKER_FIXATION_THRESHOLD_MS", 1200)),
            min_proposal_interval_ms=max(1, _read_int("DECISION_MAKER_MIN_PROPOSAL_INTERVAL_MS", 45_000)),
            font_size_step_px=max(1, _read_int("DECISION_MAKER_FONT_SIZE_STEP_PX", 2)),
            max_font_size_px=max(1, _read_int("DECISION_MAKER_MAX_FONT_SIZE_PX", 24)),
        )
