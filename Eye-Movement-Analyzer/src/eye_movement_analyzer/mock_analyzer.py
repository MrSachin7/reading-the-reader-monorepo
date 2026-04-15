from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
import json
import logging
import time
import uuid
from typing import Any

from .config import EyeMovementAnalyzerConfig

PROTOCOL_VERSION = "analysis-provider.v1"
STALE_NONE = "none"
STALE_NO_POINT = "no-point"
STALE_POINT_STALE = "point-stale"
STALE_OUTSIDE_READING_AREA = "outside-reading-area"
STALE_NO_TOKEN_HIT = "no-token-hit"

DIRECTION_FORWARD = "forward"
DIRECTION_BACKWARD = "backward"
DIRECTION_LINE_CHANGE_FORWARD = "line-change-forward"
DIRECTION_LINE_CHANGE_BACKWARD = "line-change-backward"
DIRECTION_UNKNOWN = "unknown"

LOGGER = logging.getLogger(__name__)


def now_unix_ms() -> int:
    return int(time.time() * 1000)


@dataclass
class FixationCandidate:
    token_id: str
    block_id: str | None
    token_index: int
    line_index: int
    block_index: int
    started_at_unix_ms: int


@dataclass
class FixationState:
    token_id: str
    block_id: str | None
    token_index: int
    line_index: int
    block_index: int
    started_at_unix_ms: int
    last_observed_at_unix_ms: int
    duration_ms: int
    ended_at_unix_ms: int | None = None


@dataclass
class SaccadeState:
    from_token_id: str | None
    to_token_id: str | None
    from_block_id: str | None
    to_block_id: str | None
    from_token_index: int | None
    to_token_index: int | None
    line_delta: int
    block_delta: int
    started_at_unix_ms: int
    ended_at_unix_ms: int
    duration_ms: int
    direction: str


@dataclass
class TokenStats:
    fixation_ms: int = 0
    fixation_count: int = 0
    skim_count: int = 0
    max_fixation_ms: int = 0
    last_fixation_ms: int = 0


@dataclass
class SessionMemory:
    session_id: str | None = None
    latest_session_snapshot: dict[str, Any] | None = None
    latest_observation: dict[str, Any] | None = None
    latest_viewport: dict[str, Any] | None = None
    latest_analysis_state: dict[str, Any] | None = None
    current_fixation: FixationState | None = None
    candidate_fixation: FixationCandidate | None = None
    recent_fixations: deque[FixationState] = field(default_factory=lambda: deque(maxlen=50))
    recent_saccades: deque[SaccadeState] = field(default_factory=lambda: deque(maxlen=50))
    token_stats: dict[str, TokenStats] = field(default_factory=dict)
    recent_gaze_samples: deque[dict[str, Any]] = field(default_factory=lambda: deque(maxlen=256))


class MockEyeMovementAnalyzer:
    def __init__(self, config: EyeMovementAnalyzerConfig) -> None:
        self._config = config
        self._memory = SessionMemory()

    def handle_inbound_envelope(self, envelope: dict[str, Any]) -> list[dict[str, Any]]:
        message_type = self._read_text(envelope, "type")
        payload = self._read_object(envelope, "payload")
        session_id = self._read_optional_text(envelope, "sessionId")

        if session_id:
            self._memory.session_id = session_id

        if message_type == "analysisProviderSessionSnapshot":
            self._handle_session_snapshot(payload)
            return []

        if message_type == "analysisProviderGazeSample":
            self._memory.recent_gaze_samples.append(payload)
            return []

        if message_type == "analysisProviderViewportChanged":
            self._memory.latest_viewport = payload
            return []

        if message_type == "analysisProviderStateChanged":
            self._memory.latest_analysis_state = payload
            return []

        if message_type == "analysisProviderReadingObservation":
            return self._handle_reading_observation(payload, session_id)

        return []

    def _handle_session_snapshot(self, payload: dict[str, Any]) -> None:
        previous_session_id = self._memory.session_id
        self._memory.latest_session_snapshot = payload
        self._memory.session_id = self._read_optional_text(payload, "sessionId") or self._memory.session_id
        is_active = bool(payload.get("isActive", False))

        if self._memory.session_id != previous_session_id or not is_active:
            self._reset_analysis_state()

    def _handle_reading_observation(
        self,
        observation: dict[str, Any],
        envelope_session_id: str | None,
    ) -> list[dict[str, Any]]:
        session_id = envelope_session_id or self._memory.session_id
        if session_id is None:
            return []

        observed_at_unix_ms = self._read_optional_int(observation, "observedAtUnixMs") or now_unix_ms()
        observation = {
            "observedAtUnixMs": max(0, observed_at_unix_ms),
            "isInsideReadingArea": bool(observation.get("isInsideReadingArea", False)),
            "normalizedContentX": self._read_optional_float(observation, "normalizedContentX"),
            "normalizedContentY": self._read_optional_float(observation, "normalizedContentY"),
            "tokenId": self._read_optional_text(observation, "tokenId"),
            "tokenText": self._read_optional_text(observation, "tokenText"),
            "tokenKind": self._read_optional_text(observation, "tokenKind"),
            "blockId": self._read_optional_text(observation, "blockId"),
            "tokenIndex": self._read_optional_int(observation, "tokenIndex"),
            "lineIndex": self._read_optional_int(observation, "lineIndex"),
            "blockIndex": self._read_optional_int(observation, "blockIndex"),
            "isStale": bool(observation.get("isStale", False)),
            "staleReason": self._read_text(observation, "staleReason", default=STALE_NONE),
        }
        self._memory.latest_observation = observation

        completed_fixation, completed_saccade = self._process_observation(observation)
        analysis_state = self._build_analysis_state(observation["observedAtUnixMs"])
        correlation_id = str(uuid.uuid4())
        envelope = self._build_envelope(
            "analysisProviderSubmitAnalysis",
            {
                "providerId": self._config.provider_id,
                "sessionId": session_id,
                "correlationId": correlation_id,
                "observedAtUnixMs": observation["observedAtUnixMs"],
                "currentFixation": self._fixation_to_payload(self._memory.current_fixation),
                "completedFixation": self._fixation_to_payload(completed_fixation),
                "completedSaccade": self._saccade_to_payload(completed_saccade),
                "analysisState": analysis_state,
            },
            session_id=session_id,
            correlation_id=correlation_id,
        )
        self._log_analysis(envelope, completed_fixation, completed_saccade)
        return [envelope]

    def _process_observation(self, observation: dict[str, Any]) -> tuple[FixationState | None, SaccadeState | None]:
        if not self._is_token_observation(observation):
            return self._handle_non_token_observation(observation), None

        observed_at_unix_ms = self._read_optional_int(observation, "observedAtUnixMs") or now_unix_ms()
        token_id = self._read_text(observation, "tokenId")
        token_index = self._read_optional_int(observation, "tokenIndex")
        line_index = self._read_optional_int(observation, "lineIndex")
        block_index = self._read_optional_int(observation, "blockIndex")
        if token_index is None or line_index is None or block_index is None:
            return self._handle_non_token_observation(observation), None

        if self._memory.current_fixation and self._memory.current_fixation.token_id == token_id:
            fixation = self._memory.current_fixation
            fixation.last_observed_at_unix_ms = observed_at_unix_ms
            fixation.duration_ms = max(0, observed_at_unix_ms - fixation.started_at_unix_ms)
            self._memory.candidate_fixation = None
            return None, None

        candidate = self._memory.candidate_fixation
        if candidate and candidate.token_id == token_id:
            duration_ms = max(0, observed_at_unix_ms - candidate.started_at_unix_ms)
            if duration_ms < self._fixation_threshold_for(candidate):
                return None, None

            completed_fixation = self._finalize_current_fixation(candidate.started_at_unix_ms)
            next_fixation = FixationState(
                token_id=candidate.token_id,
                block_id=candidate.block_id,
                token_index=candidate.token_index,
                line_index=candidate.line_index,
                block_index=candidate.block_index,
                started_at_unix_ms=candidate.started_at_unix_ms,
                last_observed_at_unix_ms=observed_at_unix_ms,
                duration_ms=duration_ms,
            )
            completed_saccade = self._build_saccade(self._memory.current_fixation, next_fixation)
            if completed_saccade:
                self._memory.recent_saccades.appendleft(completed_saccade)
            self._memory.current_fixation = next_fixation
            self._memory.candidate_fixation = None
            return completed_fixation, completed_saccade

        if self._memory.current_fixation is None:
            completed_fixation = self._finalize_current_fixation(observed_at_unix_ms)
        else:
            completed_fixation = None

        self._memory.candidate_fixation = FixationCandidate(
            token_id=token_id,
            block_id=self._read_optional_text(observation, "blockId"),
            token_index=token_index,
            line_index=line_index,
            block_index=block_index,
            started_at_unix_ms=observed_at_unix_ms,
        )
        return completed_fixation, None

    def _handle_non_token_observation(self, observation: dict[str, Any]) -> FixationState | None:
        self._memory.candidate_fixation = None
        fixation = self._memory.current_fixation
        if fixation is None:
            return None

        observed_at_unix_ms = self._read_optional_int(observation, "observedAtUnixMs") or now_unix_ms()
        stale_reason = self._read_text(observation, "staleReason", default=STALE_NONE)
        if stale_reason in {STALE_NO_POINT, STALE_POINT_STALE}:
            elapsed_since_last_observed = max(0, observed_at_unix_ms - fixation.last_observed_at_unix_ms)
            if elapsed_since_last_observed < self._config.clear_fixation_after_ms:
                fixation.duration_ms = max(0, observed_at_unix_ms - fixation.started_at_unix_ms)
                return None

        completed_fixation = self._finalize_current_fixation(observed_at_unix_ms)
        self._memory.current_fixation = None
        return completed_fixation

    def _finalize_current_fixation(self, ended_at_unix_ms: int) -> FixationState | None:
        fixation = self._memory.current_fixation
        if fixation is None:
            return None

        duration_ms = max(0, ended_at_unix_ms - fixation.started_at_unix_ms)
        if duration_ms < self._config.skim_threshold_ms:
            return None

        stats = self._memory.token_stats.setdefault(fixation.token_id, TokenStats())
        if duration_ms >= self._config.fixation_threshold_ms:
            stats.fixation_ms += duration_ms
            stats.fixation_count += 1
            stats.max_fixation_ms = max(stats.max_fixation_ms, duration_ms)
            stats.last_fixation_ms = duration_ms
            completed = FixationState(
                token_id=fixation.token_id,
                block_id=fixation.block_id,
                token_index=fixation.token_index,
                line_index=fixation.line_index,
                block_index=fixation.block_index,
                started_at_unix_ms=fixation.started_at_unix_ms,
                last_observed_at_unix_ms=max(fixation.last_observed_at_unix_ms, ended_at_unix_ms),
                duration_ms=duration_ms,
                ended_at_unix_ms=ended_at_unix_ms,
            )
            self._memory.recent_fixations.appendleft(completed)
            return completed

        stats.skim_count += 1
        return None

    def _fixation_threshold_for(self, candidate: FixationCandidate) -> int:
        current = self._memory.current_fixation
        if current is None:
            return self._config.initial_fixation_threshold_ms

        return (
            self._config.same_line_fixation_threshold_ms
            if current.line_index == candidate.line_index
            else self._config.new_line_fixation_threshold_ms
        )

    def _build_saccade(self, previous: FixationState | None, next_fixation: FixationState) -> SaccadeState | None:
        if previous is None:
            return None

        line_delta = next_fixation.line_index - previous.line_index
        block_delta = next_fixation.block_index - previous.block_index
        if line_delta == 0:
            if next_fixation.token_index > previous.token_index:
                direction = DIRECTION_FORWARD
            elif next_fixation.token_index < previous.token_index:
                direction = DIRECTION_BACKWARD
            else:
                direction = DIRECTION_UNKNOWN
        elif line_delta > 0:
            direction = DIRECTION_LINE_CHANGE_FORWARD
        else:
            direction = DIRECTION_LINE_CHANGE_BACKWARD

        started_at_unix_ms = max(previous.last_observed_at_unix_ms, previous.started_at_unix_ms)
        ended_at_unix_ms = next_fixation.started_at_unix_ms
        return SaccadeState(
            from_token_id=previous.token_id,
            to_token_id=next_fixation.token_id,
            from_block_id=previous.block_id,
            to_block_id=next_fixation.block_id,
            from_token_index=previous.token_index,
            to_token_index=next_fixation.token_index,
            line_delta=line_delta,
            block_delta=block_delta,
            started_at_unix_ms=started_at_unix_ms,
            ended_at_unix_ms=ended_at_unix_ms,
            duration_ms=max(0, ended_at_unix_ms - previous.last_observed_at_unix_ms),
            direction=direction,
        )

    def _build_analysis_state(self, observed_at_unix_ms: int) -> dict[str, Any]:
        token_stats = {token_id: self._token_stats_to_payload(stats) for token_id, stats in self._memory.token_stats.items()}
        current_token_id: str | None = None
        current_token_duration_ms: int | None = None

        if self._memory.current_fixation:
            fixation = self._memory.current_fixation
            current_token_id = fixation.token_id
            current_token_duration_ms = max(0, fixation.duration_ms)
            stats = token_stats.setdefault(current_token_id, self._token_stats_to_payload(TokenStats()))
            stats["fixationMs"] += current_token_duration_ms
            stats["maxFixationMs"] = max(stats["maxFixationMs"], current_token_duration_ms)
            stats["lastFixationMs"] = max(stats["lastFixationMs"], current_token_duration_ms)
        elif self._memory.candidate_fixation:
            candidate = self._memory.candidate_fixation
            current_token_id = candidate.token_id
            current_token_duration_ms = max(0, observed_at_unix_ms - candidate.started_at_unix_ms)
            if current_token_duration_ms >= self._config.skim_threshold_ms:
                stats = token_stats.setdefault(current_token_id, self._token_stats_to_payload(TokenStats()))
                if current_token_duration_ms >= self._config.fixation_threshold_ms:
                    stats["fixationMs"] += current_token_duration_ms
                    stats["maxFixationMs"] = max(stats["maxFixationMs"], current_token_duration_ms)
                    stats["lastFixationMs"] = max(stats["lastFixationMs"], current_token_duration_ms)
                else:
                    stats["skimCount"] += 1

        token_stat_values = list(token_stats.values())
        return {
            "latestObservation": dict(self._memory.latest_observation) if self._memory.latest_observation else None,
            "currentFixation": self._fixation_to_payload(self._memory.current_fixation),
            "recentFixations": [self._fixation_to_payload(item) for item in self._memory.recent_fixations],
            "recentSaccades": [self._saccade_to_payload(item) for item in self._memory.recent_saccades],
            "tokenStats": token_stats,
            "currentTokenId": current_token_id,
            "currentTokenDurationMs": current_token_duration_ms,
            "fixatedTokenCount": sum(1 for item in token_stat_values if item["fixationMs"] >= self._config.fixation_threshold_ms),
            "skimmedTokenCount": sum(
                1
                for item in token_stat_values
                if item["skimCount"] > 0 and item["fixationMs"] < self._config.fixation_threshold_ms
            ),
        }

    def build_hello_envelope(self) -> dict[str, Any]:
        return self._build_envelope(
            "analysisProviderHello",
            {
                "providerId": self._config.provider_id,
                "displayName": self._config.display_name,
                "protocolVersion": PROTOCOL_VERSION,
                "authToken": self._config.shared_secret,
            },
        )

    def build_heartbeat_envelope(self) -> dict[str, Any]:
        return self._build_envelope(
            "analysisProviderHeartbeat",
            {
                "providerId": self._config.provider_id,
                "protocolVersion": PROTOCOL_VERSION,
                "sentAtUnixMs": now_unix_ms(),
            },
            session_id=self._memory.session_id,
        )

    def build_error_envelope(self, code: str, message: str, detail: str | None = None) -> dict[str, Any]:
        return self._build_envelope(
            "analysisProviderError",
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

    def _reset_analysis_state(self) -> None:
        self._memory.latest_observation = None
        self._memory.current_fixation = None
        self._memory.candidate_fixation = None
        self._memory.recent_fixations.clear()
        self._memory.recent_saccades.clear()
        self._memory.token_stats.clear()

    def _is_token_observation(self, observation: dict[str, Any]) -> bool:
        return (
            not bool(observation.get("isStale", False))
            and bool(observation.get("isInsideReadingArea", False))
            and self._read_optional_text(observation, "tokenId") is not None
            and self._read_optional_int(observation, "tokenIndex") is not None
            and self._read_optional_int(observation, "lineIndex") is not None
            and self._read_optional_int(observation, "blockIndex") is not None
        )

    @staticmethod
    def _fixation_to_payload(fixation: FixationState | None) -> dict[str, Any] | None:
        if fixation is None:
            return None

        return {
            "tokenId": fixation.token_id,
            "blockId": fixation.block_id,
            "tokenIndex": fixation.token_index,
            "lineIndex": fixation.line_index,
            "blockIndex": fixation.block_index,
            "startedAtUnixMs": fixation.started_at_unix_ms,
            "lastObservedAtUnixMs": fixation.last_observed_at_unix_ms,
            "durationMs": fixation.duration_ms,
            "endedAtUnixMs": fixation.ended_at_unix_ms,
        }

    @staticmethod
    def _saccade_to_payload(saccade: SaccadeState | None) -> dict[str, Any] | None:
        if saccade is None:
            return None

        return {
            "fromTokenId": saccade.from_token_id,
            "toTokenId": saccade.to_token_id,
            "fromBlockId": saccade.from_block_id,
            "toBlockId": saccade.to_block_id,
            "fromTokenIndex": saccade.from_token_index,
            "toTokenIndex": saccade.to_token_index,
            "lineDelta": saccade.line_delta,
            "blockDelta": saccade.block_delta,
            "startedAtUnixMs": saccade.started_at_unix_ms,
            "endedAtUnixMs": saccade.ended_at_unix_ms,
            "durationMs": saccade.duration_ms,
            "direction": saccade.direction,
        }

    @staticmethod
    def _token_stats_to_payload(stats: TokenStats) -> dict[str, int]:
        return {
            "fixationMs": stats.fixation_ms,
            "fixationCount": stats.fixation_count,
            "skimCount": stats.skim_count,
            "maxFixationMs": stats.max_fixation_ms,
            "lastFixationMs": stats.last_fixation_ms,
        }

    def _log_analysis(
        self,
        envelope: dict[str, Any],
        completed_fixation: FixationState | None,
        completed_saccade: SaccadeState | None,
    ) -> None:
        payload = envelope["payload"]
        log_payload = {
            "providerId": self._config.provider_id,
            "sessionId": payload["sessionId"],
            "observedAtUnixMs": payload["observedAtUnixMs"],
            "currentTokenId": payload["analysisState"].get("currentTokenId"),
            "currentTokenDurationMs": payload["analysisState"].get("currentTokenDurationMs"),
            "completedFixation": self._fixation_to_payload(completed_fixation),
            "completedSaccade": self._saccade_to_payload(completed_saccade),
        }
        LOGGER.info("Mock eye movement analysis submitted:\n%s", json.dumps(log_payload, indent=2, sort_keys=True))

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

    @staticmethod
    def _read_optional_float(source: dict[str, Any], key: str) -> float | None:
        value = source.get(key)
        if isinstance(value, bool):
            return None
        if isinstance(value, int | float):
            return float(value)
        return None
