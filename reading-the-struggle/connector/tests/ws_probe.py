"""Diagnostic probe: connects to the backend /ws endpoint like a frontend
client and reports whether external analysis results actually reach clients.

Run it (from the connector folder) while a session is running:
    .venv/Scripts/python.exe tests/ws_probe.py

It listens for ~40 seconds and then prints a verdict for the
backend -> frontend hop of the fixation-analysis chain.
"""

from __future__ import annotations

import asyncio
import json
import os
from collections import Counter

import websockets

WS_URL = os.getenv("PROBE_WS_URL", "ws://localhost:5190/ws")
DURATION_SECONDS = int(os.getenv("PROBE_DURATION_SECONDS", "40"))


async def main() -> None:
    counts: Counter[str] = Counter()
    last_analysis: dict | None = None
    last_summary: dict | None = None

    print(f"Connecting to {WS_URL} for {DURATION_SECONDS}s ... start/continue the reading session now.")
    async with websockets.connect(WS_URL, max_size=32 * 1024 * 1024) as ws:
        await ws.send(json.dumps({"type": "getExperimentState"}))

        async def listen() -> None:
            nonlocal last_analysis, last_summary
            async for raw in ws:
                try:
                    message = json.loads(raw)
                except json.JSONDecodeError:
                    counts["<unparseable>"] += 1
                    continue

                message_type = message.get("type", "<untyped>")
                counts[message_type] += 1
                payload = message.get("payload") or {}

                if message_type == "eyeMovementAnalysisChanged":
                    last_analysis = payload
                    print(
                        f"  eyeMovementAnalysisChanged: tokenStats={len(payload.get('tokenStats') or {})}, "
                        f"recentFixations={len(payload.get('recentFixations') or [])}, "
                        f"recentSaccades={len(payload.get('recentSaccades') or [])}, "
                        f"struggleSignals={payload.get('struggleSignals')}"
                    )
                elif message_type == "readingAttentionSummaryChanged":
                    last_summary = payload
                    print(
                        f"  readingAttentionSummaryChanged: tokenStats={len(payload.get('tokenStats') or {})}, "
                        f"currentTokenId={'yes' if payload.get('currentTokenId') else 'no'}"
                    )
                elif message_type == "experimentState":
                    config = payload.get("eyeMovementAnalysisConfiguration") or {}
                    status = payload.get("eyeMovementAnalysisProviderStatus") or {}
                    print(
                        f"  experimentState: isActive={payload.get('isActive')}, "
                        f"analysisProvider={config.get('providerId')}, "
                        f"externalConnected={status.get('isConnected')}"
                    )

        try:
            await asyncio.wait_for(listen(), timeout=DURATION_SECONDS)
        except asyncio.TimeoutError:
            pass

    print("\n--- message counts ---")
    for message_type, count in counts.most_common():
        print(f"  {message_type}: {count}")

    print("\n--- verdict (backend -> frontend hop) ---")
    if counts.get("eyeMovementAnalysisChanged", 0) == 0:
        print(
            "NO eyeMovementAnalysisChanged broadcasts arrived.\n"
            "=> The backend never APPLIED an external submitAnalysis during the probe.\n"
            "   Look one hop earlier: connector console ('Window @...' lines and\n"
            "   'Backend fixation-analysis error' lines) and backend console\n"
            "   ('FixationAnalysisInboundHandler ...' lines)."
        )
    elif last_analysis is not None and len(last_analysis.get("tokenStats") or {}) == 0:
        print(
            "Broadcasts arrive but tokenStats is EMPTY.\n"
            "=> The connector is submitting, the backend is applying, but the\n"
            "   struggle pipeline has not completed any fixation. Check the\n"
            "   connector console 'Window @...' lines: focus=none means no\n"
            "   readingObservation reaches the connector (is the participant\n"
            "   reading view open and gazing at text?)."
        )
    else:
        print(
            "Analysis broadcasts WITH token stats are reaching clients.\n"
            "=> Backend and connector are fine; if the heatmap is still blank,\n"
            "   the issue is in the live-view rendering (token id mismatch\n"
            "   between attentionSummary keys and the tokenized document)."
        )
    if counts.get("readingAttentionSummaryChanged", 0) == 0:
        print(
            "Also: no readingAttentionSummaryChanged broadcasts — the heatmap\n"
            "specifically renders from these."
        )


if __name__ == "__main__":
    asyncio.run(main())
