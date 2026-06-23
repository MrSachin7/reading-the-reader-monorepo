from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import os


def _read_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default

    try:
        return int(value)
    except ValueError as exc:
        raise ValueError(f"Environment variable {name} must be an integer.") from exc


def _default_struggle_root() -> str:
    # connector/src/struggle_connector/config.py -> reading-the-struggle/
    return str(Path(__file__).resolve().parents[3])


@dataclass(frozen=True)
class StruggleConnectorConfig:
    ws_url: str
    provider_id: str
    display_name: str
    shared_secret: str
    heartbeat_interval_seconds: int
    reconnect_delay_seconds: int
    prediction_interval_samples: int
    struggle_root: str

    @classmethod
    def from_env(cls) -> "StruggleConnectorConfig":
        return cls(
            ws_url=os.getenv("STRUGGLE_CONNECTOR_WS_URL", "ws://localhost:5190/ws/module-provider"),
            provider_id=os.getenv("STRUGGLE_CONNECTOR_PROVIDER_ID", "reading-the-struggle"),
            display_name=os.getenv("STRUGGLE_CONNECTOR_DISPLAY_NAME", "Reading the Struggle Analyzer"),
            shared_secret=os.getenv(
                "STRUGGLE_CONNECTOR_SHARED_SECRET",
                "change-me-local-module-provider-secret",
            ),
            heartbeat_interval_seconds=max(1, _read_int("STRUGGLE_CONNECTOR_HEARTBEAT_INTERVAL_SECONDS", 5)),
            reconnect_delay_seconds=max(1, _read_int("STRUGGLE_CONNECTOR_RECONNECT_DELAY_SECONDS", 3)),
            prediction_interval_samples=max(1, _read_int("STRUGGLE_CONNECTOR_PREDICTION_INTERVAL_SAMPLES", 180)),
            struggle_root=os.getenv("STRUGGLE_CONNECTOR_STRUGGLE_ROOT", _default_struggle_root()),
        )
