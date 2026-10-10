// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Vec3 = [number, number, number];

export interface CamTuning {
  rangeUnits: number;        // back-off distance behind the eye (donor cvar default 40)
  sideAngleDeg: number;      // 0 = straight behind; non-zero swings the camera to one side (donor default 0)
  focusUnits: number;        // how far ahead of the eye the aim point sits (donor 512)
  focusPitchMaxDeg: number;  // clamp on look pitch when choosing the aim point (donor 45)
  hullHalf: number;          // half-width of the collision box (donor 4)
  liftMaxUnits: number;      // extra height added when pulled in close to a wall (donor 32)
}

export interface Pose { eye: Vec3; yawDeg: number; pitchDeg: number; }
export interface Camera { pos: Vec3; yawDeg: number; pitchDeg: number; }
export type Sweep = (from: Vec3, to: Vec3, half: number) => { end: Vec3; fraction: number };

const D2R = Math.PI / 180;

function forward(yawDeg: number, pitchDeg: number): Vec3 {
  const y = yawDeg * D2R;
  const p = pitchDeg * D2R;
  return [Math.cos(p) * Math.cos(y), Math.cos(p) * Math.sin(y), -Math.sin(p)];
}

function right(yawDeg: number): Vec3 {
  const y = yawDeg * D2R;
  return [Math.sin(y), -Math.cos(y), 0];
}

function add(a: Vec3, b: Vec3, s = 1): Vec3 {
  return [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

// Third-person pose, recomputed on every rendered frame from the predicted eye.
// No smoothing or lag of its own: the camera follows the eye exactly, apart from the wall pull-in.
export function thirdPersonCamera(p: Pose, t: CamTuning, sweep: Sweep): Camera {
  // 1. Aim point: ahead of the eye along the look direction, with the pitch clamped.
  const focusPitch = Math.min(p.pitchDeg, t.focusPitchMaxDeg);
  const focusPoint = add(p.eye, forward(p.yawDeg, focusPitch), t.focusUnits);

  // 2. Start 8 units above the eye and back away along the yaw, using half the look pitch.
  const orbit = t.sideAngleDeg * D2R;
  const f = forward(p.yawDeg, p.pitchDeg * 0.5);
  const r = right(p.yawDeg);
  let view = add(p.eye, [0, 0, 8]);
  view = add(view, f, -t.rangeUnits * Math.cos(orbit));
  view = add(view, r, -t.rangeUnits * Math.sin(orbit));

  // 3. Collision: sweep from the eye. On a hit, stop at the wall, lift by up to liftMax
  //    scaled by how close the wall is, and sweep once more (one retry only).
  const first = sweep(p.eye, view, t.hullHalf);
  if (first.fraction !== 1) {
    view = add(first.end, [0, 0, (1 - first.fraction) * t.liftMaxUnits]);
    view = sweep(p.eye, view, t.hullHalf).end;
  }

  // 4. Aim the camera pitch at the focus point; the yaw is turned back by the side angle.
  const d = sub(focusPoint, view);
  const focusDist = Math.max(Math.hypot(d[0], d[1]), 1);
  const pitchDeg = -Math.atan2(d[2], focusDist) / D2R;
  return { pos: view, yawDeg: p.yawDeg - t.sideAngleDeg, pitchDeg };
}

// FOV for zoom: a linear lerp between base and zoom FOV over zoomMs, from the moment the zoom key changed.
export interface Zoom { zoomed: boolean; zoomStartMs: number; }

export function zoomFovDeg(nowMs: number, z: Zoom, baseFov: number, zoomFov: number, zoomMs = 150): number {
  const f = (nowMs - z.zoomStartMs) / zoomMs;
  if (z.zoomed) return f > 1 ? zoomFov : baseFov + f * (zoomFov - baseFov);
  return f <= 1 ? zoomFov + f * (baseFov - zoomFov) : baseFov;
}

export {};
