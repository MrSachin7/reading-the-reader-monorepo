from __future__ import annotations

from pathlib import Path
import sys
import unittest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PROJECT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from decision_maker.config import DecisionMakerConfig
from decision_maker.mock_ai import MockDecisionEngine


def build_config() -> DecisionMakerConfig:
    return DecisionMakerConfig(
        ws_url="ws://localhost:5190/ws/module-provider",
        provider_id="mock-python",
        display_name="Mock Python Decision Maker",
        shared_secret="change-me-local-module-provider-secret",
        heartbeat_interval_seconds=5,
        reconnect_delay_seconds=3,
        fixation_threshold_ms=1200,
        min_proposal_interval_ms=5_000,
        force_after_session_runtime_ms=5_000,
        font_size_step_px=4,
        max_font_size_px=24,
    )


def build_context(
    *,
    execution_mode: str = "advisory",
    is_inside_reading_area: bool = False,
    current_token_duration_ms: int = 0,
    started_at_unix_ms: int = 1_000,
    updated_at_unix_ms: int = 6_500,
    current_font_size: int = 18,
) -> dict[str, object]:
    return {
        "type": "providerDecisionContext",
        "sessionId": "session-1",
        "correlationId": "corr-1",
        "payload": {
            "sessionId": "session-1",
            "executionMode": execution_mode,
            "isSessionActive": True,
            "automationPaused": False,
            "startedAtUnixMs": started_at_unix_ms,
            "focus": {
                "isInsideReadingArea": is_inside_reading_area,
            },
            "attentionSummary": {
                "currentTokenDurationMs": current_token_duration_ms,
                "currentTokenId": "token-1",
                "updatedAtUnixMs": updated_at_unix_ms,
            },
            "presentation": {
                "fontSizePx": current_font_size,
            },
            "recentInterventions": [],
        },
    }


class MockDecisionEngineTests(unittest.TestCase):
    def test_forces_advisory_proposal_after_session_runtime_threshold(self) -> None:
        engine = MockDecisionEngine(build_config())

        replies = engine.handle_inbound_envelope(build_context())

        self.assertEqual(1, len(replies))
        reply = replies[0]
        self.assertEqual("moduleProviderInbound", reply["type"])
        self.assertEqual("submitProposal", reply["payload"]["messageType"])
        self.assertEqual("22", str(reply["payload"]["payload"]["proposedIntervention"]["parameters"]["fontSizePx"]))
        self.assertEqual(22, reply["payload"]["payload"]["proposedIntervention"]["presentation"]["fontSizePx"])

    def test_does_not_force_before_runtime_threshold_without_attention_signal(self) -> None:
        engine = MockDecisionEngine(build_config())

        replies = engine.handle_inbound_envelope(
            build_context(updated_at_unix_ms=4_000)
        )

        self.assertEqual([], replies)

    def test_builds_autonomous_request_when_execution_mode_is_autonomous(self) -> None:
        engine = MockDecisionEngine(build_config())

        replies = engine.handle_inbound_envelope(build_context(execution_mode="autonomous"))

        self.assertEqual(1, len(replies))
        self.assertEqual(
            "requestAutonomousApply",
            replies[0]["payload"]["messageType"],
        )


if __name__ == "__main__":
    unittest.main()
