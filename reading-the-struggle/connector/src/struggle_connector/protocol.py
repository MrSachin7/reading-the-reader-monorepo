"""Module-provider wire protocol constants and envelope builders.

Mirrors Backend ModuleProviderProtocol.cs and FixationAnalysisModuleProtocol.cs.
"""

from __future__ import annotations

import time
from typing import Any

PROTOCOL_VERSION = "module-provider.v1"

MODULE_ID = "fixation-analysis"
MODULE_PROTOCOL_VERSION = "fixation-analysis.v1"

TYPE_HELLO = "moduleProviderHello"
TYPE_WELCOME = "moduleProviderWelcome"
TYPE_HEARTBEAT = "moduleProviderHeartbeat"
TYPE_ERROR = "moduleProviderError"
TYPE_INBOUND = "moduleProviderInbound"
TYPE_OUTBOUND = "moduleProviderOutbound"

OUTBOUND_SESSION_SNAPSHOT = "sessionSnapshot"
OUTBOUND_GAZE_SAMPLE = "gazeSample"
OUTBOUND_READING_OBSERVATION = "readingObservation"
OUTBOUND_VIEWPORT_CHANGED = "viewportChanged"
OUTBOUND_STATE_CHANGED = "stateChanged"
OUTBOUND_ERROR = "error"

INBOUND_SUBMIT_ANALYSIS = "submitAnalysis"
INBOUND_PROVIDER_ERROR = "providerError"


def now_unix_ms() -> int:
    return int(time.time() * 1000)


def build_envelope(
    message_type: str,
    payload: Any,
    provider_id: str | None = None,
    session_id: str | None = None,
    correlation_id: str | None = None,
) -> dict[str, Any]:
    return {
        "type": message_type,
        "protocolVersion": PROTOCOL_VERSION,
        "providerId": provider_id,
        "sessionId": session_id,
        "correlationId": correlation_id,
        "sentAtUnixMs": now_unix_ms(),
        "payload": payload,
    }


def build_hello_envelope(provider_id: str, display_name: str, shared_secret: str) -> dict[str, Any]:
    return build_envelope(
        TYPE_HELLO,
        {
            "providerId": provider_id,
            "displayName": display_name,
            "protocolVersion": PROTOCOL_VERSION,
            "authToken": shared_secret,
            "modules": [
                {
                    "moduleId": MODULE_ID,
                    "protocolVersion": MODULE_PROTOCOL_VERSION,
                    "capabilities": None,
                }
            ],
        },
        provider_id=provider_id,
    )


def build_heartbeat_envelope(provider_id: str) -> dict[str, Any]:
    return build_envelope(
        TYPE_HEARTBEAT,
        {
            "providerId": provider_id,
            "protocolVersion": PROTOCOL_VERSION,
            "sentAtUnixMs": now_unix_ms(),
        },
        provider_id=provider_id,
    )


def build_inbound_envelope(
    provider_id: str,
    message_type: str,
    payload: Any,
    session_id: str | None = None,
    correlation_id: str | None = None,
) -> dict[str, Any]:
    # Inbound wire format nests the module payload as a JSON object under
    # "payload" (the backend extracts its raw text); only the backend's
    # OUTBOUND messages use the "payloadJson" string field.
    return build_envelope(
        TYPE_INBOUND,
        {
            "moduleId": MODULE_ID,
            "messageType": message_type,
            "payload": payload,
        },
        provider_id=provider_id,
        session_id=session_id,
        correlation_id=correlation_id,
    )
