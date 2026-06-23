"""Adapter between the platform's fixation-analysis module stream and the
collaborator's Reading-The-Struggle pipeline.

The collaborator code under <struggle_root>/code is imported as-is and never
modified. This module translates live gazeSample/readingObservation payloads
into the row shape their EyeTracker expects (the renamed-CSV columns produced
by their json_to_csv), feeds the tracker sample by sample, runs their
StrugglePredictor on a fixed window, and maps the tracker state back into the
platform's EyeMovementAnalysisSnapshot contract.
"""

from __future__ import annotations

import importlib
import logging
import math
import os
import sys
import uuid
from typing import Any

LOGGER = logging.getLogger(__name__)

NAN = float("nan")


def _nz(value: Any) -> float:
    # Their offline data carries NaN for missing floats; live payloads carry null.
    if value is None:
        return NAN
    return float(value)


def _ms(value: Any, fallback: int = 0) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return fallback


class StrugglePipeline:
    def __init__(self, config) -> None:
        self._config = config
        self._load_collaborator_modules()

        self._tracker = None
        self._predictor = None
        self._predictor_error: str | None = None

        self.session_id: str | None = None
        self._participant_name: str = "unknown"
        self._sample_counter = 0
        self._clock_offset_ms: float | None = None
        self._mapped_fixation_count = 0

        # tokenId -> dict(tokenIndex, lineIndex, blockIndex, blockId, tokenText)
        self._token_registry: dict[str, dict[str, Any]] = {}
        self._latest_observation: dict[str, Any] | None = None
        self._latest_focus_token: dict[str, Any] | None = None
        self._latest_labels: dict[str, Any] | None = None
        self._reported_window_errors: set[str] = set()

    # ------------------------------------------------------------------ setup

    def _load_collaborator_modules(self) -> None:
        code_dir = os.path.join(self._config.struggle_root, "code")
        if not os.path.isdir(code_dir):
            raise RuntimeError(f"Reading-The-Struggle code folder not found at {code_dir}.")

        if code_dir not in sys.path:
            sys.path.insert(0, code_dir)

        # Their predictor loads model artifacts via paths relative to the
        # project root ("data/models/..."), so the process must run from there.
        os.chdir(self._config.struggle_root)

        self._preprocessor = importlib.import_module("preprocessor")
        self._predictor_module = importlib.import_module("predictor")
        LOGGER.info("Loaded Reading-The-Struggle modules from %s", code_dir)

    def _apply_screen_geometry(self, screen: dict[str, Any] | None) -> None:
        if not screen:
            return

        width = screen.get("physicalScreenWidthPx") or screen.get("screenWidthPx")
        height = screen.get("physicalScreenHeightPx") or screen.get("screenHeightPx")
        if not width or not height:
            return

        pre = self._preprocessor
        if pre.SCREEN_WIDTH == width and pre.SCREEN_HEIGHT == height:
            return

        # Their screen constants are module-level (flagged TODO in their code);
        # overriding them here keeps their files untouched.
        pre.SCREEN_WIDTH = int(width)
        pre.SCREEN_HEIGHT = int(height)
        pre.SCREEN_SIZE = 27 * 25.4 / math.sqrt(width**2 + height**2) * width
        LOGGER.info("Applied screen geometry %sx%s to struggle preprocessor.", width, height)

    # -------------------------------------------------------------- lifecycle

    def handle_session_snapshot(self, payload: dict[str, Any], envelope_session_id: str | None) -> None:
        session_id = payload.get("sessionId") or envelope_session_id
        is_active = bool(payload.get("isActive", False))

        participant = payload.get("participant") or {}
        if participant.get("name"):
            self._participant_name = participant["name"]

        reading_session = payload.get("readingSession") or {}
        viewport = reading_session.get("participantViewport") or {}
        self._apply_screen_geometry(viewport.get("screen"))

        if not is_active or not session_id:
            if self.session_id is not None:
                LOGGER.info("Session %s ended; struggle pipeline idle.", self.session_id)
            self.session_id = None
            return

        if session_id == self.session_id:
            return

        self._start_session(session_id, reading_session)

    def _start_session(self, session_id: str, reading_session: dict[str, Any]) -> None:
        self.session_id = session_id
        self._sample_counter = 0
        self._clock_offset_ms = None
        self._mapped_fixation_count = 0
        self._token_registry = {}
        self._latest_observation = None
        self._latest_focus_token = None
        self._latest_labels = None
        self._reported_window_errors = set()

        self._tracker = self._preprocessor.EyeTracker(online_mode=False)
        try:
            self._predictor = self._predictor_module.StrugglePredictor()
            self._predictor_error = None
        except Exception as exc:
            # Model artifacts (data/models/*.csv, *.pkl) may not be present yet.
            self._predictor = None
            self._predictor_error = str(exc)
            LOGGER.warning(
                "StrugglePredictor unavailable (missing model files?): %s. "
                "Fixation analysis continues without struggle labels.",
                exc,
            )

        self._parse_materials(reading_session)
        LOGGER.info("Struggle pipeline started for session %s.", session_id)

    def _parse_materials(self, reading_session: dict[str, Any]) -> None:
        run = reading_session.get("experimentRun") or {}
        setup_id = run.get("sourceExperimentSetupId")
        materials = [
            {"id": material.get("id"), "markdown": material.get("markdown") or ""}
            for material in run.get("materials") or []
            if material.get("id")
        ]

        if not materials:
            content = reading_session.get("content") or {}
            setup_id = setup_id or content.get("experimentSetupId") or content.get("sourceSetupId")
            if content.get("markdown"):
                materials = [
                    {
                        "id": content.get("experimentSetupItemId") or content.get("documentId"),
                        "markdown": content["markdown"],
                    }
                ]

        if not setup_id or not materials:
            LOGGER.warning("No experiment setup id or materials in session snapshot; parse_text skipped.")
            return

        try:
            self._tracker.parse_text(setup_id, materials)
            LOGGER.info("Parsed %s material(s) for setup %s.", len(materials), setup_id)
        except Exception as exc:
            LOGGER.exception("parse_text failed: %s", exc)

        # Their fixation flush does a hard sentence_to_word_index[sentence_id]
        # lookup. Live sentence ids come from the frontend tokenizer, whose
        # sentence segmentation can drift from their parse_text segmentation
        # (e.g. semicolons, bullet lists). A missing key would otherwise abort
        # every fixation flush, so unknown sentences fall back to an empty list.
        import collections

        self._tracker.sentence_to_word_index = collections.defaultdict(
            list, self._tracker.sentence_to_word_index
        )

    # ------------------------------------------------------------- live input

    def handle_reading_observation(self, payload: dict[str, Any]) -> None:
        self._latest_observation = payload

        token_id = payload.get("tokenId")
        if token_id and not payload.get("isStale", False):
            entry = {
                "tokenId": token_id,
                "tokenText": payload.get("tokenText"),
                "blockId": payload.get("blockId"),
                "tokenIndex": payload.get("tokenIndex"),
                "lineIndex": payload.get("lineIndex"),
                "blockIndex": payload.get("blockIndex"),
            }
            self._token_registry[token_id] = entry
            self._latest_focus_token = entry
        elif payload.get("isStale", False):
            self._latest_focus_token = None

    def handle_viewport_changed(self, payload: dict[str, Any]) -> None:
        self._apply_screen_geometry(payload.get("screen"))

    def handle_gaze_sample(self, payload: dict[str, Any]) -> dict[str, Any] | None:
        """Feed one live sample; returns a submitAnalysis payload on window boundaries."""
        if self._tracker is None or self.session_id is None:
            return None

        row = self._build_row(payload)
        try:
            self._tracker.delay_event(self._sample_counter, row)
            self._reported_window_errors.discard("delay-event")
        except Exception as exc:
            if "delay-event" not in self._reported_window_errors:
                self._reported_window_errors.add("delay-event")
                LOGGER.exception(
                    "EyeTracker.delay_event failed at sample %s (repeats logged at debug): %s",
                    self._sample_counter,
                    exc,
                )
            else:
                LOGGER.debug("delay_event failed at sample %s: %s", self._sample_counter, exc)
            return None

        self._sample_counter += 1
        if self._sample_counter % self._config.prediction_interval_samples != 0:
            return None

        return self._run_prediction_window(row["time_stamps"])

    def _build_row(self, sample: dict[str, Any]) -> dict[str, Any]:
        left = sample or {}
        right = sample or {}

        device_ts_us = sample.get("deviceTimeStamp")
        now_ms = self._now_ms()
        if device_ts_us:
            # Anchor device clock to unix epoch once, then keep device-accurate spacing.
            device_ms = device_ts_us / 1000.0
            if self._clock_offset_ms is None:
                self._clock_offset_ms = now_ms - device_ms
            timestamp_ms = device_ms + self._clock_offset_ms
        else:
            timestamp_ms = now_ms

        focus = self._latest_focus_token
        token_id = focus["tokenId"] if focus else NAN
        word = focus.get("tokenText") if focus else NAN
        if word is None:
            word = NAN
        sentence_id = (
            token_id.rsplit(":word:", 1)[0]
            if isinstance(token_id, str) and ":word:" in token_id
            else NAN
        )

        return {
            "Recording": self.session_id,
            "Filename": self._participant_name,
            "row_number": self._sample_counter,
            "time_stamps": timestamp_ms,

            "left_gaze_point_on_display_area_0": _nz(left.get("leftEyeX")),
            "left_gaze_point_on_display_area_1": _nz(left.get("leftEyeY")),
            "right_gaze_point_on_display_area_0": _nz(right.get("rightEyeX")),
            "right_gaze_point_on_display_area_1": _nz(right.get("rightEyeY")),
            "left_gaze_point_validity": left.get("leftEyeValidity") or "Invalid",
            "right_gaze_point_validity": right.get("rightEyeValidity") or "Invalid",

            "left_gaze_point_in_user_coordinate_system_0": _nz(left.get("leftEyePositionInUserX")),
            "left_gaze_point_in_user_coordinate_system_1": _nz(left.get("leftEyePositionInUserY")),
            "left_gaze_point_in_user_coordinate_system_2": _nz(left.get("leftEyePositionInUserZ")),
            "right_gaze_point_in_user_coordinate_system_0": _nz(right.get("rightEyePositionInUserX")),
            "right_gaze_point_in_user_coordinate_system_1": _nz(right.get("rightEyePositionInUserY")),
            "right_gaze_point_in_user_coordinate_system_2": _nz(right.get("rightEyePositionInUserZ")),

            "left_gaze_origin_in_user_coordinate_system_0": _nz(left.get("leftGazeOriginInUserX")),
            "left_gaze_origin_in_user_coordinate_system_1": _nz(left.get("leftGazeOriginInUserY")),
            "left_gaze_origin_in_user_coordinate_system_2": _nz(left.get("leftGazeOriginInUserZ")),
            "right_gaze_origin_in_user_coordinate_system_0": _nz(right.get("rightGazeOriginInUserX")),
            "right_gaze_origin_in_user_coordinate_system_1": _nz(right.get("rightGazeOriginInUserY")),
            "right_gaze_origin_in_user_coordinate_system_2": _nz(right.get("rightGazeOriginInUserZ")),

            "left_pupil_diameter": _nz(left.get("leftPupilDiameterMm")),
            "right_pupil_diameter": _nz(right.get("rightPupilDiameterMm")),
            "left_pupil_validity": left.get("leftPupilValidity") or "Invalid",
            "right_pupil_validity": right.get("rightPupilValidity") or "Invalid",

            "token_id": token_id,
            "word": word,
            "focus_activeSentenceId": sentence_id,
        }

    @staticmethod
    def _now_ms() -> float:
        import time

        return time.time() * 1000.0

    # ------------------------------------------------------------ predictions

    def _run_prediction_window(self, time_now_ms: float) -> dict[str, Any] | None:
        window_seconds = self._config.prediction_interval_samples / 90.0

        reading_style = None
        cognitive_load = None
        ripa2_label = None
        ripa2_score = None

        if self._predictor is not None:
            # The three component models run individually (same order and
            # once-per-window state semantics as StrugglePredictor.predict) so
            # an empty window in one model cannot suppress the other labels.
            try:
                reading_style_data = self._tracker.submit_data_reading_style(time_now_ms, window_seconds=window_seconds)
                scaled = self._predictor.reading_style_model.scale_features(reading_style_data)
                reading_style = self._predictor.reading_style_model.predict(scaled)
                self._reported_window_errors.discard("reading-style")
            except Exception as exc:
                self._log_window_error("reading-style", "Reading style window failed", exc)

            try:
                cognitive_load_data = self._tracker.submit_data_cognitive_load(time_now_ms, window_seconds=window_seconds)
                features = self._predictor.cognitive_load_model.prepare_features(cognitive_load_data)
                cognitive_load = self._predictor.cognitive_load_model.predict(features)
                self._reported_window_errors.discard("cognitive-load")
            except Exception as exc:
                self._log_window_error("cognitive-load", "Cognitive load window failed (no completed fixations yet?)", exc)

            try:
                ripa_scores = self._tracker.submit_data_ripa2_score(time_now_ms, window_seconds=window_seconds)
                smoothed = self._predictor.RIPA_model._smooth_scores(ripa_scores)
                ripa2_label = self._predictor.RIPA_model.predict(smoothed)

                numeric_scores = [
                    float(score)
                    for score in ripa_scores
                    if isinstance(score, (int, float)) and math.isfinite(score)
                ]
                if numeric_scores:
                    ripa2_score = sum(numeric_scores) / len(numeric_scores)
                self._reported_window_errors.discard("ripa2")
            except Exception as exc:
                self._log_window_error("ripa2", "RIPA2 window failed", exc)

        def _label(value: Any) -> str | None:
            if value is None or value == "unknown":
                return None
            return str(value)

        self._latest_labels = {
            "readingStyle": _label(reading_style),
            "cognitiveLoad": _label(cognitive_load),
            "ripa2Load": _label(ripa2_label),
            "ripa2Score": ripa2_score,
            "observedAtUnixMs": _ms(time_now_ms),
        }

        LOGGER.info(
            "Window @%s samples: focus=%s, completedFixations=%s, words=%s, "
            "style=%s, load=%s, ripa2=%s",
            self._sample_counter,
            (self._latest_focus_token or {}).get("tokenText") or "none",
            len(getattr(self._tracker, "fixations", []) or []),
            sum(len(words) for words in (getattr(self._tracker, "term_time_collector", None) or {}).values()),
            self._latest_labels["readingStyle"],
            self._latest_labels["cognitiveLoad"],
            self._latest_labels["ripa2Load"],
        )

        return self.build_submit_analysis(_ms(time_now_ms))

    def _log_window_error(self, component: str, message: str, exc: Exception) -> None:
        # First failure per component logs a warning; repeats stay at debug
        # until the component succeeds again, so warm-up windows don't spam.
        if component in self._reported_window_errors:
            LOGGER.debug("%s: %s", message, exc)
            return

        self._reported_window_errors.add(component)
        LOGGER.warning("%s: %s (further repeats logged at debug level)", message, exc)

    # ----------------------------------------------------------- state mapping

    def build_submit_analysis(self, observed_at_unix_ms: int) -> dict[str, Any] | None:
        if self._tracker is None or self.session_id is None:
            return None

        try:
            analysis_state = self._build_analysis_state(observed_at_unix_ms)
        except Exception as exc:
            LOGGER.exception("Failed to map tracker state to analysisState: %s", exc)
            return None

        completed_fixation = None
        raw_fixations = list(getattr(self._tracker, "fixations", []) or [])
        if len(raw_fixations) > self._mapped_fixation_count:
            completed_fixation = self._map_fixation(raw_fixations[-1], ended=True)
        self._mapped_fixation_count = len(raw_fixations)

        return {
            "providerId": self._config.provider_id,
            "sessionId": self.session_id,
            "correlationId": str(uuid.uuid4()),
            "observedAtUnixMs": observed_at_unix_ms,
            "currentFixation": self._map_current_fixation(),
            "completedFixation": completed_fixation,
            "completedSaccade": None,
            "analysisState": analysis_state,
        }

    def _build_analysis_state(self, observed_at_unix_ms: int) -> dict[str, Any]:
        raw_fixations = [
            fixation
            for fixation in (getattr(self._tracker, "fixations", []) or [])
            if fixation.get("token_id")
        ]

        recent_fixations = [
            snapshot
            for snapshot in (self._map_fixation(item, ended=True) for item in raw_fixations[-50:])
            if snapshot is not None
        ]
        recent_fixations.reverse()  # backend expects newest-first

        real_saccades = getattr(self._tracker, "cross_word_saccades", None)
        if real_saccades:
            recent_saccades = self._map_cross_word_saccades(real_saccades[-50:])
        else:
            recent_saccades = self._synthesize_saccades(raw_fixations[-51:])
        recent_saccades.reverse()

        token_stats = self._build_token_stats()
        regression_count = sum(1 for item in raw_fixations if item.get("regression"))

        current_fixation = self._map_current_fixation()
        current_token_id = current_fixation["tokenId"] if current_fixation else None
        current_token_duration = current_fixation["durationMs"] if current_fixation else None

        return {
            "latestObservation": self._latest_observation,
            "currentFixation": current_fixation,
            "recentFixations": recent_fixations,
            "recentSaccades": recent_saccades,
            "tokenStats": token_stats,
            "currentTokenId": current_token_id,
            "currentTokenDurationMs": current_token_duration,
            "fixatedTokenCount": len(token_stats),
            "skimmedTokenCount": 0,
            "regressionCount": regression_count,
            "struggleSignals": self._latest_labels,
        }

    def _map_fixation(self, item: dict[str, Any], ended: bool) -> dict[str, Any] | None:
        token_id = item.get("token_id")
        if not isinstance(token_id, str):
            return None

        registry = self._token_registry.get(token_id) or {}
        started = _ms(item.get("start_time"))
        ended_at = _ms(item.get("end_time"))

        return {
            "tokenId": token_id,
            "blockId": registry.get("blockId"),
            "tokenIndex": registry.get("tokenIndex") or self._token_index_from_id(token_id),
            "lineIndex": registry.get("lineIndex") or 0,
            "blockIndex": registry.get("blockIndex") or self._block_index_from_id(token_id),
            "startedAtUnixMs": started,
            "lastObservedAtUnixMs": ended_at,
            "durationMs": _ms(item.get("duration")),
            "endedAtUnixMs": ended_at if ended else None,
            "tokenText": item.get("word") if isinstance(item.get("word"), str) else registry.get("tokenText"),
        }

    def _map_current_fixation(self) -> dict[str, Any] | None:
        ordering = getattr(self._tracker, "term_span_ordering", None) or []
        collector = getattr(self._tracker, "term_span_collector", None) or {}
        if not ordering:
            return None

        span = collector.get(ordering[-1])
        if not span:
            return None

        token_id = span.get("token_id")
        if not isinstance(token_id, str):
            return None

        registry = self._token_registry.get(token_id) or {}
        return {
            "tokenId": token_id,
            "blockId": registry.get("blockId"),
            "tokenIndex": registry.get("tokenIndex") or self._token_index_from_id(token_id),
            "lineIndex": registry.get("lineIndex") or 0,
            "blockIndex": registry.get("blockIndex") or self._block_index_from_id(token_id),
            "startedAtUnixMs": _ms(span.get("first_time")),
            "lastObservedAtUnixMs": _ms(span.get("last_time")),
            "durationMs": _ms(span.get("fixation_duration")),
            "endedAtUnixMs": None,
            "tokenText": span.get("word") if isinstance(span.get("word"), str) else registry.get("tokenText"),
        }

    def _map_cross_word_saccades(self, raw_saccades: list[dict[str, Any]]) -> list[dict[str, Any]]:
        # Real word-to-word saccades captured by the transport-only
        # cross_word_saccades hook in their _map_saccade_to_aoi.
        saccades: list[dict[str, Any]] = []

        for item in raw_saccades:
            from_token = item.get("start_word_id")
            to_token = item.get("end_word_id")
            if not isinstance(from_token, str) or not isinstance(to_token, str):
                continue

            direction_fields = self._direction_fields(from_token, to_token)
            started = _ms(item.get("start_time"))
            ended = _ms(item.get("end_time"))

            saccades.append({
                "fromTokenId": from_token,
                "toTokenId": to_token,
                "startedAtUnixMs": started,
                "endedAtUnixMs": ended,
                "durationMs": _ms(item.get("duration"), max(0, ended - started)),
                **direction_fields,
            })

        return saccades

    def _direction_fields(self, from_token: str, to_token: str) -> dict[str, Any]:
        from_registry = self._token_registry.get(from_token) or {}
        to_registry = self._token_registry.get(to_token) or {}

        from_line = from_registry.get("lineIndex") or 0
        to_line = to_registry.get("lineIndex") or 0
        from_index = from_registry.get("tokenIndex") or self._token_index_from_id(from_token)
        to_index = to_registry.get("tokenIndex") or self._token_index_from_id(to_token)

        line_delta = to_line - from_line
        if line_delta > 0:
            direction = "line-change-forward"
        elif line_delta < 0:
            direction = "line-change-backward"
        elif to_index < from_index:
            direction = "backward"
        else:
            direction = "forward"

        return {
            "fromBlockId": from_registry.get("blockId"),
            "toBlockId": to_registry.get("blockId"),
            "fromTokenIndex": from_index,
            "toTokenIndex": to_index,
            "lineDelta": line_delta,
            "blockDelta": (to_registry.get("blockIndex") or 0) - (from_registry.get("blockIndex") or 0),
            "direction": direction,
            "isRegression": direction in ("backward", "line-change-backward"),
        }

    def _synthesize_saccades(self, raw_fixations: list[dict[str, Any]]) -> list[dict[str, Any]]:
        # Their AOI collector only keeps within-word saccades, so word-to-word
        # transitions for the researcher overlay are derived from consecutive
        # completed fixations instead.
        saccades: list[dict[str, Any]] = []

        for previous, current in zip(raw_fixations, raw_fixations[1:]):
            from_token = previous.get("token_id")
            to_token = current.get("token_id")
            if not isinstance(from_token, str) or not isinstance(to_token, str) or from_token == to_token:
                continue

            from_registry = self._token_registry.get(from_token) or {}
            to_registry = self._token_registry.get(to_token) or {}

            started = _ms(previous.get("end_time"))
            ended = _ms(current.get("start_time"))

            from_line = from_registry.get("lineIndex") or 0
            to_line = to_registry.get("lineIndex") or 0
            from_index = from_registry.get("tokenIndex") or self._token_index_from_id(from_token)
            to_index = to_registry.get("tokenIndex") or self._token_index_from_id(to_token)

            line_delta = to_line - from_line
            is_regression = bool(current.get("regression"))

            if line_delta > 0:
                direction = "line-change-forward"
            elif line_delta < 0:
                direction = "line-change-backward"
            elif to_index < from_index:
                direction = "backward"
            else:
                direction = "forward"

            saccades.append({
                "fromTokenId": from_token,
                "toTokenId": to_token,
                "fromBlockId": from_registry.get("blockId"),
                "toBlockId": to_registry.get("blockId"),
                "fromTokenIndex": from_index,
                "toTokenIndex": to_index,
                "lineDelta": line_delta,
                "blockDelta": (to_registry.get("blockIndex") or 0) - (from_registry.get("blockIndex") or 0),
                "startedAtUnixMs": started,
                "endedAtUnixMs": ended,
                "durationMs": max(0, ended - started),
                "direction": direction,
                "isRegression": is_regression or direction in ("backward", "line-change-backward"),
            })

        return saccades[-50:]

    def _build_token_stats(self) -> dict[str, dict[str, Any]]:
        stats: dict[str, dict[str, Any]] = {}
        collector = getattr(self._tracker, "term_time_collector", None) or {}

        for words in collector.values():
            if not isinstance(words, dict):
                continue
            for entry in words.values():
                if not isinstance(entry, dict):
                    continue
                token_id = entry.get("token_id")
                if not isinstance(token_id, str):
                    continue

                durations = entry.get("all_fixation_durations") or []
                numeric = [_ms(value) for value in durations]
                stats[token_id] = {
                    "fixationMs": _ms(entry.get("fixation_duration")),
                    "fixationCount": int(entry.get("fixation_count") or 0),
                    "skimCount": 0,
                    "maxFixationMs": max(numeric) if numeric else 0,
                    "lastFixationMs": numeric[-1] if numeric else 0,
                    "text": entry.get("word") if isinstance(entry.get("word"), str) else None,
                }

        return stats

    @staticmethod
    def _token_index_from_id(token_id: str) -> int:
        # Token ids end with ":word:<n>" (1-based within the sentence).
        try:
            return max(0, int(token_id.rsplit(":word:", 1)[1]) - 1)
        except (IndexError, ValueError):
            return 0

    @staticmethod
    def _block_index_from_id(token_id: str) -> int:
        # Token id shape: {setupId}:{materialId}:{block}:sentence:{s}:word:{w}
        try:
            return max(0, int(token_id.split(":")[2]) - 1)
        except (IndexError, ValueError):
            return 0
