from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

import websockets

from .config import EyeMovementAnalyzerConfig
from .mock_analyzer import MockEyeMovementAnalyzer

LOGGER = logging.getLogger(__name__)


class EyeMovementAnalyzerClient:
    def __init__(self, config: EyeMovementAnalyzerConfig) -> None:
        self._config = config
        self._analyzer = MockEyeMovementAnalyzer(config)
        self._registered = False

    async def run_forever(self) -> None:
        while True:
            try:
                await self._run_single_connection()
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                LOGGER.exception("Eye movement analyzer connection loop failed: %s", exc)

            self._registered = False
            LOGGER.info(
                "Reconnecting to %s in %s seconds.",
                self._config.ws_url,
                self._config.reconnect_delay_seconds,
            )
            await asyncio.sleep(self._config.reconnect_delay_seconds)

    async def _run_single_connection(self) -> None:
        LOGGER.info("Connecting to analysis-provider websocket at %s", self._config.ws_url)
        async with websockets.connect(self._config.ws_url) as websocket:
            await self._send_json(websocket, self._analyzer.build_hello_envelope())
            heartbeat_task = asyncio.create_task(self._heartbeat_loop(websocket))
            try:
                async for raw_message in websocket:
                    envelope = json.loads(raw_message)
                    await self._handle_inbound_message(websocket, envelope)
            finally:
                heartbeat_task.cancel()
                await asyncio.gather(heartbeat_task, return_exceptions=True)

    async def _heartbeat_loop(self, websocket: Any) -> None:
        while True:
            await asyncio.sleep(self._config.heartbeat_interval_seconds)
            if not self._registered:
                continue
            await self._send_json(websocket, self._analyzer.build_heartbeat_envelope())

    async def _handle_inbound_message(self, websocket: Any, envelope: dict[str, Any]) -> None:
        message_type = envelope.get("type")
        if message_type == "analysisProviderWelcome":
            self._registered = True
            LOGGER.info("Analysis provider registration accepted by backend.")
            return

        if message_type == "analysisProviderError":
            LOGGER.warning("Backend analysis provider error: %s", envelope.get("payload"))
            return

        try:
            outbound_envelopes = self._analyzer.handle_inbound_envelope(envelope)
        except Exception as exc:
            LOGGER.exception("Failed to handle analysis provider message '%s': %s", message_type, exc)
            await self._send_json(
                websocket,
                self._analyzer.build_error_envelope(
                    "mock-analyzer-failure",
                    "Mock eye movement analyzer failed to process an inbound provider message.",
                    str(exc),
                ),
            )
            return

        for outbound in outbound_envelopes:
            LOGGER.info("Sending analysis provider message '%s'.", outbound.get("type"))
            await self._send_json(websocket, outbound)

    @staticmethod
    async def _send_json(websocket: Any, message: dict[str, Any]) -> None:
        await websocket.send(json.dumps(message))
