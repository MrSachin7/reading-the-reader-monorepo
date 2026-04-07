from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
import json
import logging
import time
import uuid
from typing import Any

from .config import DecisionMakerConfig

PROTOCOL_VERSION = "provider.v1"
MODULE_ID_FONT_SIZE = "font-size"
TRIGGER_ATTENTION_SUMMARY = "attention-summary"
ADVISORY_MODE = "advisory"
AUTONOMOUS_MODE = "autonomous"

LOGGER = logging.getLogger(__name__)


def now_unix_ms() -> int:
    return int(time.time() * 1000)


@dataclass
class SessionMemory:
    session_id: str | None = None
    latest_session_snapshot: dict[str, Any] | None = None
    latest_focus: dict[str, Any] | None = None
    latest_viewport: dict[str, Any] | None = None
    latest_attention_summary: dict[str, Any] | None = None
    latest_decision_context: dict[str, Any] | None = None
    latest_decision_update: dict[str, Any] | None = None
    recent_gaze_samples: deque[dict[str, Any]] = field(default_factory=lambda: deque(maxlen=256))
    last_proposal_key: str | None = None
    last_proposal_sent_at_unix_ms: int = 0


class MockDecisionEngine:
    def __init__(self, config: DecisionMakerConfig) -> None:
        self._config = config
        self._memory = SessionMemory()

    def handle_inbound_envelope(self, envelope: dict[str, Any]) -> list[dict[str, Any]]:
        message_type = self._read_text(envelope, "type")
        payload = self._read_object(envelope, "payload")
        session_id = self._read_optional_text(envelope, "sessionId")

        if session_id:
            self._memory.session_id = session_id

        if message_type == "providerSessionSnapshot":
            self._memory.latest_session_snapshot = payload
            self._memory.session_id = self._read_optional_text(payload, "sessionId") or self._memory.session_id
            return []

        if message_type == "providerReadingFocusChanged":
            self._memory.latest_focus = payload
            return []

        if message_type == "providerViewportChanged":
            self._memory.latest_viewport = payload
            return []

        if message_type == "providerAttentionSummaryChanged":
            self._memory.latest_attention_summary = payload
            return []

        if message_type == "providerDecisionModeChanged":
            self._memory.latest_decision_update = payload
            return []

        if message_type == "providerGazeSample":
            self._memory.recent_gaze_samples.append(payload)
            return []

        if message_type == "providerInterventionEvent":
            return []

        if message_type == "providerDecisionContext":
            self._memory.latest_decision_context = payload
            return self._build_decision_reply(payload)

        return []

    def _build_decision_reply(self, context: dict[str, Any]) -> list[dict[str, Any]]:
        execution_mode = self._read_text(context, "executionMode", default=ADVISORY_MODE)
        session_id = self._read_optional_text(context, "sessionId") or self._memory.session_id
        if session_id is None:
            return []

        is_session_active = bool(context.get("isSessionActive", False))
        automation_paused = bool(context.get("automationPaused", False))
        focus = self._read_object(context, "focus")
        attention_summary = self._read_object(context, "attentionSummary")
        presentation = self._read_object(context, "presentation")
        recent_interventions = context.get("recentInterventions") or []

        if not is_session_active or automation_paused:
            return []

        if not bool(focus.get("isInsideReadingArea", False)):
            return []

        current_token_duration_ms = self._read_optional_int(attention_summary, "currentTokenDurationMs")
        if current_token_duration_ms is None or current_token_duration_ms < self._config.fixation_threshold_ms:
            return []

        current_font_size = self._read_optional_int(presentation, "fontSizePx") or 18
        target_font_size = min(current_font_size + self._config.font_size_step_px, self._config.max_font_size_px)
        if target_font_size <= current_font_size:
            return []

        observed_at_unix_ms = self._read_optional_int(attention_summary, "updatedAtUnixMs") or now_unix_ms()

        latest_intervention = recent_interventions[0] if recent_interventions else None
        if isinstance(latest_intervention, dict):
            applied_at_unix_ms = self._read_optional_int(latest_intervention, "appliedAtUnixMs")
            if applied_at_unix_ms is not None:
                elapsed = max(0, observed_at_unix_ms - applied_at_unix_ms)
                if elapsed < self._config.min_proposal_interval_ms:
                    return []

        active_token_id = self._read_optional_text(attention_summary, "currentTokenId") or "unknown-token"
        proposal_key = f"{session_id}:{active_token_id}:{target_font_size}:{execution_mode}"
        if (
            proposal_key == self._memory.last_proposal_key
            and max(0, observed_at_unix_ms - self._memory.last_proposal_sent_at_unix_ms) < self._config.min_proposal_interval_ms
        ):
            return []

        gaze_sample_count = len(self._memory.recent_gaze_samples)
        signal_summary = (
            f"token dwell time reached {current_token_duration_ms} ms "
            f"while observing {gaze_sample_count} recent gaze samples"
        )
        rationale = (
            "Mock decision-maker detected sustained attention on the current token "
            "and proposes a small font-size increase."
        )
        correlation_id = str(uuid.uuid4())

        proposed_intervention = {
            "moduleId": MODULE_ID_FONT_SIZE,
            "trigger": TRIGGER_ATTENTION_SUMMARY,
            "reason": "Increase font size to reduce local reading strain.",
            "presentation": {
                "fontFamily": None,
                "fontSizePx": target_font_size,
                "lineWidthPx": None,
                "lineHeight": None,
                "letterSpacingEm": None,
                "editableByResearcher": None,
            },
            "appearance": {
                "themeMode": None,
                "palette": None,
                "appFont": None,
            },
            "parameters": {
                "fontSizePx": str(target_font_size),
            },
        }

        self._memory.last_proposal_key = proposal_key
        self._memory.last_proposal_sent_at_unix_ms = observed_at_unix_ms

        if execution_mode == AUTONOMOUS_MODE:
            envelope = self._build_envelope(
                "providerRequestAutonomousApply",
                {
                    "providerId": self._config.provider_id,
                    "sessionId": session_id,
                    "correlationId": correlation_id,
                    "executionMode": AUTONOMOUS_MODE,
                    "rationale": rationale,
                    "signalSummary": signal_summary,
                    "providerObservedAtUnixMs": observed_at_unix_ms,
                    "requestedIntervention": proposed_intervention,
                },
                session_id=session_id,
                correlation_id=correlation_id,
            )
            self._log_decision(
                decision_type="providerRequestAutonomousApply",
                session_id=session_id,
                execution_mode=execution_mode,
                active_token_id=active_token_id,
                current_token_duration_ms=current_token_duration_ms,
                current_font_size=current_font_size,
                target_font_size=target_font_size,
                observed_at_unix_ms=observed_at_unix_ms,
                gaze_sample_count=gaze_sample_count,
                rationale=rationale,
                signal_summary=signal_summary,
                envelope=envelope,
            )
            return [envelope]

        proposal_id = str(uuid.uuid4())
        envelope = self._build_envelope(
            "providerSubmitProposal",
            {
                "providerId": self._config.provider_id,
                "sessionId": session_id,
                "correlationId": correlation_id,
                "proposalId": proposal_id,
                "executionMode": ADVISORY_MODE,
                "rationale": rationale,
                "signalSummary": signal_summary,
                "providerObservedAtUnixMs": observed_at_unix_ms,
                "proposedIntervention": proposed_intervention,
            },
            session_id=session_id,
            correlation_id=correlation_id,
        )
        self._log_decision(
            decision_type="providerSubmitProposal",
            session_id=session_id,
            execution_mode=execution_mode,
            active_token_id=active_token_id,
            current_token_duration_ms=current_token_duration_ms,
            current_font_size=current_font_size,
            target_font_size=target_font_size,
            observed_at_unix_ms=observed_at_unix_ms,
            gaze_sample_count=gaze_sample_count,
            rationale=rationale,
            signal_summary=signal_summary,
            envelope=envelope,
        )
        return [envelope]

    def build_hello_envelope(self) -> dict[str, Any]:
        return self._build_envelope(
            "providerHello",
            {
                "providerId": self._config.provider_id,
                "displayName": self._config.display_name,
                "protocolVersion": PROTOCOL_VERSION,
                "authToken": self._config.shared_secret,
                "supportsAdvisoryExecution": True,
                "supportsAutonomousExecution": True,
                "supportedInterventionModuleIds": [MODULE_ID_FONT_SIZE],
            },
        )

    def build_heartbeat_envelope(self) -> dict[str, Any]:
        return self._build_envelope(
            "providerHeartbeat",
            {
                "providerId": self._config.provider_id,
                "protocolVersion": PROTOCOL_VERSION,
                "sentAtUnixMs": now_unix_ms(),
            },
            session_id=self._memory.session_id,
        )

    def build_error_envelope(self, code: str, message: str, detail: str | None = None) -> dict[str, Any]:
        return self._build_envelope(
            "providerError",
            {
                "providerId": self._config.provider_id,
                "code": code,
                "message": message,
                "detail": detail,
            },
            session_id=self._memory.session_id,
        )

    def _build_envelope(
        self,
        message_type: str,
        payload: dict[str, Any],
        *,
        session_id: str | None = None,
        correlation_id: str | None = None,
    ) -> dict[str, Any]:
        return {
            "type": message_type,
            "protocolVersion": PROTOCOL_VERSION,
            "providerId": self._config.provider_id,
            "sessionId": session_id,
            "correlationId": correlation_id,
            "sentAtUnixMs": now_unix_ms(),
            "payload": payload,
        }

    def _log_decision(
        self,
        *,
        decision_type: str,
        session_id: str,
        execution_mode: str,
        active_token_id: str,
        current_token_duration_ms: int,
        current_font_size: int,
        target_font_size: int,
        observed_at_unix_ms: int,
        gaze_sample_count: int,
        rationale: str,
        signal_summary: str,
        envelope: dict[str, Any],
    ) -> None:
        log_payload = {
            "decisionType": decision_type,
            "providerId": self._config.provider_id,
            "sessionId": session_id,
            "executionMode": execution_mode,
            "activeTokenId": active_token_id,
            "currentTokenDurationMs": current_token_duration_ms,
            "currentFontSizePx": current_font_size,
            "targetFontSizePx": target_font_size,
            "observedAtUnixMs": observed_at_unix_ms,
            "recentGazeSampleCount": gaze_sample_count,
            "rationale": rationale,
            "signalSummary": signal_summary,
            "envelope": envelope,
        }
        LOGGER.info(
            "Mock intervention decision created:\n%s",
            json.dumps(log_payload, indent=2, sort_keys=True),
        )

    @staticmethod
    def _read_object(source: dict[str, Any], key: str) -> dict[str, Any]:
        value = source.get(key)
        return value if isinstance(value, dict) else {}

    @staticmethod
    def _read_optional_text(source: dict[str, Any], key: str) -> str | None:
        value = source.get(key)
        if isinstance(value, str):
            text = value.strip()
            return text or None
        return None

    @staticmethod
    def _read_text(source: dict[str, Any], key: str, default: str | None = None) -> str:
        value = source.get(key)
        if isinstance(value, str):
            text = value.strip()
            if text:
                return text
        if default is not None:
            return default
        raise ValueError(f"Expected string field '{key}'.")

    @staticmethod
    def _read_optional_int(source: dict[str, Any], key: str) -> int | None:
        value = source.get(key)
        if isinstance(value, bool):
            return None
        if isinstance(value, int):
            return value
        if isinstance(value, float):
            return int(value)
        return None
