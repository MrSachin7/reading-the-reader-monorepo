from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

import websockets

from . import protocol
from .config import StruggleConnectorConfig
from .pipeline import StrugglePipeline

LOGGER = logging.getLogger(__name__)


class StruggleConnectorClient:
    def __init__(self, config: StruggleConnectorConfig) -> None:
        self._config = config
        self._pipeline = StrugglePipeline(config)
        self._registered = False

    async def run_forever(self) -> None:
        while True:
            try:
                await self._run_single_connection()
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                LOGGER.exception("Struggle connector connection loop failed: %s", exc)

            self._registered = False
            LOGGER.info(
                "Reconnecting to %s in %s seconds.",
                self._config.ws_url,
                self._config.reconnect_delay_seconds,
            )
            await asyncio.sleep(self._config.reconnect_delay_seconds)

    async def _run_single_connection(self) -> None:
        LOGGER.info("Connecting to module-provider websocket at %s", self._config.ws_url)
        async with websockets.connect(self._config.ws_url, max_size=16 * 1024 * 1024) as websocket:
            await self._send_json(
                websocket,
                protocol.build_hello_envelope(
                    self._config.provider_id,
                    self._config.display_name,
                    self._config.shared_secret,
                ),
            )

            heartbeat_task = asyncio.create_task(self._heartbeat_loop(websocket))
            try:
                async for raw_message in websocket:
                    envelope = json.loads(raw_message)
                    await self._handle_envelope(websocket, envelope)
            finally:
                heartbeat_task.cancel()
                await asyncio.gather(heartbeat_task, return_exceptions=True)

    async def _heartbeat_loop(self, websocket: Any) -> None:
        while True:
            await asyncio.sleep(self._config.heartbeat_interval_seconds)
            if not self._registered:
                continue
            await self._send_json(websocket, protocol.build_heartbeat_envelope(self._config.provider_id))

    async def _handle_envelope(self, websocket: Any, envelope: dict[str, Any]) -> None:
        message_type = envelope.get("type")

        if message_type == protocol.TYPE_WELCOME:
            self._registered = True
            payload = envelope.get("payload") or {}
            LOGGER.info(
                "Registered as provider '%s' for modules %s.",
                payload.get("providerId"),
                payload.get("acceptedModules"),
            )
            return

        if message_type == protocol.TYPE_ERROR:
            LOGGER.warning("Backend module-provider error: %s", envelope.get("payload"))
            return

        if message_type != protocol.TYPE_OUTBOUND:
            LOGGER.debug("Ignoring envelope type '%s'.", message_type)
            return

        outbound = envelope.get("payload") or {}
        if outbound.get("moduleId") != protocol.MODULE_ID:
            return

        inner_type = outbound.get("messageType")
        payload_json = outbound.get("payloadJson")
        try:
            payload = json.loads(payload_json) if payload_json else None
        except json.JSONDecodeError as exc:
            LOGGER.warning("Could not parse outbound payloadJson for '%s': %s", inner_type, exc)
            return

        if payload is None:
            return

        await self._dispatch(websocket, inner_type, payload, envelope.get("sessionId"))

    async def _dispatch(
        self,
        websocket: Any,
        message_type: str | None,
        payload: dict[str, Any],
        session_id: str | None,
    ) -> None:
        try:
            if message_type == protocol.OUTBOUND_SESSION_SNAPSHOT:
                self._pipeline.handle_session_snapshot(payload, session_id)
                return

            if message_type == protocol.OUTBOUND_READING_OBSERVATION:
                self._pipeline.handle_reading_observation(payload)
                return

            if message_type == protocol.OUTBOUND_VIEWPORT_CHANGED:
                self._pipeline.handle_viewport_changed(payload)
                return

            if message_type == protocol.OUTBOUND_GAZE_SAMPLE:
                submit = self._pipeline.handle_gaze_sample(payload)
                if submit is not None:
                    await self._send_json(
                        websocket,
                        protocol.build_inbound_envelope(
                            self._config.provider_id,
                            protocol.INBOUND_SUBMIT_ANALYSIS,
                            submit,
                            session_id=submit.get("sessionId"),
                            correlation_id=submit.get("correlationId"),
                        ),
                    )
                return

            if message_type == protocol.OUTBOUND_STATE_CHANGED:
                # Authoritative state echo; nothing to do — this provider owns the state.
                return

            if message_type == protocol.OUTBOUND_ERROR:
                LOGGER.warning("Backend fixation-analysis error: %s", payload)
                return

            LOGGER.debug("Ignoring fixation-analysis message '%s'.", message_type)
        except Exception as exc:
            LOGGER.exception("Failed handling '%s': %s", message_type, exc)
            await self._send_json(
                websocket,
                protocol.build_inbound_envelope(
                    self._config.provider_id,
                    protocol.INBOUND_PROVIDER_ERROR,
                    {
                        "code": "struggle-pipeline-failure",
                        "message": f"Struggle connector failed to process '{message_type}'.",
                        "detail": str(exc),
                    },
                    session_id=session_id,
                ),
            )

    @staticmethod
    async def _send_json(websocket: Any, message: dict[str, Any]) -> None:
        await websocket.send(json.dumps(message))
