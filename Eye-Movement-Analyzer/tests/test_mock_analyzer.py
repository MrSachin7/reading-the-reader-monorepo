from __future__ import annotations

from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from eye_movement_analyzer.config import EyeMovementAnalyzerConfig
from eye_movement_analyzer.mock_analyzer import MockEyeMovementAnalyzer


SESSION_ID = "session-1"


def make_config() -> EyeMovementAnalyzerConfig:
    return EyeMovementAnalyzerConfig(
        ws_url="ws://localhost:5190/ws/analysis-provider",
        provider_id="mock-python-analysis",
        display_name="Mock Python Eye Movement Analyzer",
        shared_secret="change-me-local-analysis-provider-secret",
        heartbeat_interval_seconds=5,
        reconnect_delay_seconds=3,
        initial_fixation_threshold_ms=90,
        same_line_fixation_threshold_ms=70,
        new_line_fixation_threshold_ms=135,
        skim_threshold_ms=45,
        fixation_threshold_ms=130,
        point_stale_after_ms=650,
        clear_fixation_after_ms=1500,
    )


def observation(
    observed_at_unix_ms: int,
    token_id: str | None = "token-1",
    *,
    token_index: int = 0,
    line_index: int = 0,
    block_index: int = 0,
    is_stale: bool = False,
    stale_reason: str = "none",
    is_inside_reading_area: bool = True,
) -> dict:
    return {
        "observedAtUnixMs": observed_at_unix_ms,
        "isInsideReadingArea": is_inside_reading_area,
        "normalizedContentX": 0.5,
        "normalizedContentY": 0.5,
        "tokenId": token_id,
        "blockId": "block-1",
        "tokenIndex": token_index if token_id is not None else None,
        "lineIndex": line_index if token_id is not None else None,
        "blockIndex": block_index if token_id is not None else None,
        "isStale": is_stale,
        "staleReason": stale_reason,
    }


class MockAnalyzerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.analyzer = MockEyeMovementAnalyzer(make_config())
        self.analyzer.handle_inbound_envelope(
            {
                "type": "analysisProviderSessionSnapshot",
                "payload": {"sessionId": SESSION_ID, "isActive": True},
            }
        )

    def send_observation(self, payload: dict) -> dict:
        outbound = self.analyzer.handle_inbound_envelope(
            {
                "type": "analysisProviderReadingObservation",
                "sessionId": SESSION_ID,
                "payload": payload,
            }
        )
        self.assertEqual(1, len(outbound))
        return outbound[0]

    def start_fixation(self, token_id: str = "token-1", *, token_index: int = 0, line_index: int = 0) -> dict:
        self.send_observation(observation(1000, token_id, token_index=token_index, line_index=line_index))
        return self.send_observation(observation(1090, token_id, token_index=token_index, line_index=line_index))

    def test_hello_and_heartbeat_envelopes_are_backend_compatible(self) -> None:
        hello = self.analyzer.build_hello_envelope()
        self.assertEqual("analysisProviderHello", hello["type"])
        self.assertEqual("analysis-provider.v1", hello["protocolVersion"])
        self.assertEqual("mock-python-analysis", hello["payload"]["providerId"])
        self.assertEqual("Mock Python Eye Movement Analyzer", hello["payload"]["displayName"])
        self.assertEqual("change-me-local-analysis-provider-secret", hello["payload"]["authToken"])

        heartbeat = self.analyzer.build_heartbeat_envelope()
        self.assertEqual("analysisProviderHeartbeat", heartbeat["type"])
        self.assertEqual("analysis-provider.v1", heartbeat["protocolVersion"])
        self.assertEqual("mock-python-analysis", heartbeat["payload"]["providerId"])
        self.assertEqual(SESSION_ID, heartbeat["sessionId"])

    def test_initial_fixation_starts_at_90ms(self) -> None:
        first = self.send_observation(observation(1000))
        self.assertIsNone(first["payload"]["currentFixation"])

        before_threshold = self.send_observation(observation(1089))
        self.assertIsNone(before_threshold["payload"]["currentFixation"])

        at_threshold = self.send_observation(observation(1090))
        self.assertEqual("analysisProviderSubmitAnalysis", at_threshold["type"])
        self.assertEqual("analysis-provider.v1", at_threshold["protocolVersion"])
        self.assertEqual(SESSION_ID, at_threshold["payload"]["sessionId"])
        self.assertIn("analysisState", at_threshold["payload"])
        current = at_threshold["payload"]["currentFixation"]
        self.assertIsNotNone(current)
        self.assertEqual("token-1", current["tokenId"])
        self.assertEqual(90, current["durationMs"])

    def test_same_line_transition_uses_70ms_and_creates_forward_saccade(self) -> None:
        self.start_fixation()
        self.send_observation(observation(1200, "token-2", token_index=1, line_index=0))

        before_threshold = self.send_observation(observation(1269, "token-2", token_index=1, line_index=0))
        self.assertEqual("token-1", before_threshold["payload"]["currentFixation"]["tokenId"])

        at_threshold = self.send_observation(observation(1270, "token-2", token_index=1, line_index=0))
        self.assertEqual("token-2", at_threshold["payload"]["currentFixation"]["tokenId"])
        self.assertEqual("forward", at_threshold["payload"]["completedSaccade"]["direction"])

    def test_new_line_transition_uses_135ms_and_creates_line_change_saccade(self) -> None:
        self.start_fixation()
        self.send_observation(observation(1200, "token-2", token_index=4, line_index=1))

        before_threshold = self.send_observation(observation(1334, "token-2", token_index=4, line_index=1))
        self.assertEqual("token-1", before_threshold["payload"]["currentFixation"]["tokenId"])

        at_threshold = self.send_observation(observation(1335, "token-2", token_index=4, line_index=1))
        self.assertEqual("token-2", at_threshold["payload"]["currentFixation"]["tokenId"])
        self.assertEqual("line-change-forward", at_threshold["payload"]["completedSaccade"]["direction"])

    def test_skim_and_fixation_aggregate_split(self) -> None:
        self.start_fixation()
        self.send_observation(observation(1100, "token-2", token_index=1, line_index=0))
        skim_result = self.send_observation(observation(1170, "token-2", token_index=1, line_index=0))
        token_one_stats = skim_result["payload"]["analysisState"]["tokenStats"]["token-1"]
        self.assertEqual(1, token_one_stats["skimCount"])
        self.assertEqual(0, token_one_stats["fixationCount"])

        self.send_observation(observation(1300, "token-3", token_index=2, line_index=0))
        fixation_result = self.send_observation(observation(1370, "token-3", token_index=2, line_index=0))
        token_two_stats = fixation_result["payload"]["analysisState"]["tokenStats"]["token-2"]
        self.assertEqual(1, token_two_stats["fixationCount"])
        self.assertEqual(200, token_two_stats["fixationMs"])

    def test_stale_observation_clears_active_fixation_after_1500ms(self) -> None:
        self.start_fixation()

        still_active = self.send_observation(
            observation(2500, None, is_stale=True, stale_reason="point-stale", is_inside_reading_area=False)
        )
        self.assertIsNotNone(still_active["payload"]["currentFixation"])

        cleared = self.send_observation(
            observation(2591, None, is_stale=True, stale_reason="point-stale", is_inside_reading_area=False)
        )
        self.assertIsNone(cleared["payload"]["currentFixation"])

    def test_backward_saccade_direction(self) -> None:
        self.start_fixation("token-2", token_index=2)
        self.send_observation(observation(1200, "token-1", token_index=1, line_index=0))
        result = self.send_observation(observation(1270, "token-1", token_index=1, line_index=0))
        self.assertEqual("backward", result["payload"]["completedSaccade"]["direction"])


if __name__ == "__main__":
    unittest.main()
