// Licence: MIT (donor LICENSE). Clean-room sketch of the mechanism described in the note, not a line-by-line translation.
// clean-room
export const CAM = {
  followLerpPerMs: 0.006,
  zoomLerpRatio: 2,
  minZoom: 65,
  maxZoom: 165,
  defaultZoom: 125,
  wheelZoomStep: 15,
  pinchScale: 240,
  minPitch: 205,
  maxPitch: 245,
  defaultPitch: 230,
  pitchDragPerPx: 0.3,
  yawDragPerFullWidth: 720,
} as const;

export interface Rig {
  x: number; // follow point, first horizontal axis
  y: number; // follow point, second horizontal axis (depth)
  z: number; // follow point, height
  zoom: number; // current zoom (eye distance is zoom * 0.5)
  zoomTarget: number; // 0 = unset
  yaw: number; // degrees, user offset
  pitch: number; // degrees, 0 = unset
  initialised: boolean;
  lastMs: number;
}

export interface Point3 { x: number; y: number; z: number; }

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

function targetZoom(r: Rig): number {
  if (!(r.zoomTarget > 0) || !Number.isFinite(r.zoomTarget)) {
    return r.zoom > 0 && Number.isFinite(r.zoom) ? clamp(r.zoom, CAM.minZoom, CAM.maxZoom) : CAM.defaultZoom;
  }
  return clamp(r.zoomTarget, CAM.minZoom, CAM.maxZoom);
}

function currentZoom(r: Rig): number {
  return r.zoom > 0 && Number.isFinite(r.zoom) ? clamp(r.zoom, CAM.minZoom, CAM.maxZoom) : targetZoom(r);
}

function currentPitch(r: Rig): number {
  return r.pitch === 0 || !Number.isFinite(r.pitch) ? CAM.defaultPitch : clamp(r.pitch, CAM.minPitch, CAM.maxPitch);
}

function normaliseYaw(y: number): number {
  let v = y % 360;
  if (v <= -180) v += 360;
  if (v > 180) v -= 360;
  return v;
}

// Frame-rate-dependent by design in the donor: lerp = elapsed ms x rate, capped at 1.
export function followLerp(deltaMs: number): number {
  if (deltaMs <= 0) return 0;
  return Math.min(deltaMs * CAM.followLerpPerMs, 1);
}

// One follow step per frame. Position eases toward the target; zoom eases at twice the rate.
export function step(r: Rig, t: Point3, nowMs: number): void {
  if (!r.initialised) {
    r.x = t.x;
    r.y = t.y;
    r.z = t.z;
    r.zoom = targetZoom(r);
    r.lastMs = nowMs;
    r.initialised = true;
    return;
  }
  const lerp = followLerp(nowMs - r.lastMs);
  r.lastMs = nowMs;
  r.x += (t.x - r.x) * lerp;
  r.y += (t.y - r.y) * lerp;
  r.z += (t.z - r.z) * lerp;
  const zoomLerp = lerp <= 0 ? 0 : Math.min(lerp * CAM.zoomLerpRatio, 1);
  r.zoom += (targetZoom(r) - currentZoom(r)) * zoomLerp;
}

// Wheel: a frame with any nonzero WheelY moves the zoom target by 15 units; only the sign matters.
export function wheelZoom(r: Rig, wheelY: number): void {
  if (wheelY === 0 || !Number.isFinite(wheelY)) return;
  r.zoomTarget = clamp(targetZoom(r) - Math.sign(wheelY) * CAM.wheelZoomStep, CAM.minZoom, CAM.maxZoom);
}

// Pinch: exponential factor on the zoom target.
export function pinchZoom(r: Rig, pinchDelta: number): void {
  if (pinchDelta === 0 || !Number.isFinite(pinchDelta)) return;
  const factor = Math.exp(-pinchDelta / CAM.pinchScale);
  r.zoomTarget = clamp(targetZoom(r) * factor, CAM.minZoom, CAM.maxZoom);
}

// Right-drag: yaw, no smoothing. A full-width drag is 720 degrees.
export function yawDrag(r: Rig, dxPx: number, screenWidthPx: number): void {
  if (dxPx === 0 || screenWidthPx <= 0) return;
  r.yaw = normaliseYaw(r.yaw - (dxPx / screenWidthPx) * CAM.yawDragPerFullWidth);
}

// Shift + right-drag: pitch, clamped.
export function pitchDrag(r: Rig, dyPx: number): void {
  if (dyPx === 0) return;
  r.pitch = clamp(currentPitch(r) + dyPx * CAM.pitchDragPerPx, CAM.minPitch, CAM.maxPitch);
}

// Eye and look target. Pitch above 180 is folded down, so 230 means 50 degrees of elevation.
// The shake offset moves the follow point, so eye and target shift together.
export function eyeAndTarget(r: Rig, shakeX = 0, shakeY = 0): { eye: Point3; target: Point3 } {
  const distance = currentZoom(r) * 0.5;
  let pitch = currentPitch(r);
  if (pitch > 180) pitch -= 180;
  const p = (pitch * Math.PI) / 180;
  const yaw = (r.yaw * Math.PI) / 180;
  const horizontal = Math.cos(p) * distance;
  const target: Point3 = { x: r.x + shakeX, y: r.z, z: r.y + shakeY };
  const eye: Point3 = {
    x: target.x + Math.sin(yaw) * horizontal,
    y: target.y + Math.sin(p) * distance,
    z: target.z - Math.cos(yaw) * horizontal,
  };
  return { eye, target };
}

// Shake: sine on two axes, linear decay over the duration, starting at startMs.
export function shakeOffset(startMs: number, durationMs: number, nowMs: number): [number, number] {
  if (durationMs <= 0 || nowMs < startMs || nowMs >= startMs + durationMs) return [0, 0];
  const progress = clamp((nowMs - startMs) / durationMs, 0, 1);
  const amplitude = 0.18 * (1 - progress);
  const s = (nowMs - startMs) / 1000;
  return [Math.sin(s * 120 * 2 * Math.PI) * amplitude, Math.cos(s * 150 * 2 * Math.PI) * amplitude];
}

export {};
