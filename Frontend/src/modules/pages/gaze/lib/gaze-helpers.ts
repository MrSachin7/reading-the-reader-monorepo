import type { GazeData } from "@/lib/gaze-socket";

export interface GazePoint {
  x: number;
  y: number;
}

const GAZE_POINT_DEADZONE = 0.005;

function isValidEye(value: string) {
  return value.toLowerCase() === "valid";
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function calculateGazePoint(sample: GazeData): GazePoint | null {
  const leftValid = isValidEye(sample.leftEyeValidity);
  const rightValid = isValidEye(sample.rightEyeValidity);

  if (leftValid && rightValid) {
    return {
      x: clamp01((sample.leftEyeX + sample.rightEyeX) / 2),
      y: clamp01((sample.leftEyeY + sample.rightEyeY) / 2),
    };
  }

  if (leftValid) {
    return {
      x: clamp01(sample.leftEyeX),
      y: clamp01(sample.leftEyeY),
    };
  }

  if (rightValid) {
    return {
      x: clamp01(sample.rightEyeX),
      y: clamp01(sample.rightEyeY),
    };
  }

  return null;
}

export function normalizeGazePoint(previousPoint: GazePoint | null, nextPoint: GazePoint) {
  if (!previousPoint) {
    return nextPoint;
  }

  const dx = nextPoint.x - previousPoint.x;
  const dy = nextPoint.y - previousPoint.y;
  const distance = Math.hypot(dx, dy);

  if (distance <= GAZE_POINT_DEADZONE) {
    return previousPoint;
  }

  const smoothingAlpha =
    distance >= 0.08 ? 0.55 : distance >= 0.03 ? 0.32 : 0.18;

  return {
    x: clamp01(previousPoint.x + dx * smoothingAlpha),
    y: clamp01(previousPoint.y + dy * smoothingAlpha),
  };
}

export function formatGazeTime(unixMs: number | null) {
  if (!unixMs) {
    return "-";
  }

  return new Date(unixMs).toLocaleTimeString();
}
