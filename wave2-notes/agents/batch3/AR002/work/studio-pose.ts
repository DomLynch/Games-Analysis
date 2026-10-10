// clean-room sketch of client-side studio pose evaluation (donor licence GPL-3.0-or-later: shape only, not a translation)
export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number]; // x, y, z, w
export interface Pose { pos: Vec3; q: Quat; }

// Frame clock: stored frame is 0..255 across the clip; rate is the entity's playback multiplier; fps is the clip's.
export function clipFrame(stored: number, numFrames: number, looping: boolean,
  secSinceStart: number, fps: number, rate: number): number {
  if (numFrames <= 1) return 0;
  const span = numFrames - 1;
  let f = (stored * span) / 256 + secSinceStart * rate * fps;
  if (looping) {
    f = f % span;
    if (f < 0) f += span;
  } else {
    f = Math.min(Math.max(f, 0), span - 0.001); // stop just short of the last frame
  }
  return f;
}

export function lerpVec(a: Vec3, b: Vec3, s: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s];
}

function normQuat(q: Quat): Quat {
  const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
}

export function slerp(a: Quat, b: Quat, s: number): Quat {
  let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const bb: Quat = dot < 0 ? [-b[0], -b[1], -b[2], -b[3]] : b;
  dot = Math.abs(dot);
  if (dot > 0.9995) {
    return normQuat([a[0] + (bb[0] - a[0]) * s, a[1] + (bb[1] - a[1]) * s,
      a[2] + (bb[2] - a[2]) * s, a[3] + (bb[3] - a[3]) * s]);
  }
  const theta = Math.acos(dot);
  const sinT = Math.sin(theta);
  const wa = Math.sin((1 - s) * theta) / sinT;
  const wb = Math.sin(s * theta) / sinT;
  return [wa * a[0] + wb * bb[0], wa * a[1] + wb * bb[1], wa * a[2] + wb * bb[2], wa * a[3] + wb * bb[3]];
}

// Controller value (raw 0..255) mapped into [start, end]; the donor applies the same rule to bend and twist controls.
export function controllerValue(raw: number, start: number, end: number): number {
  const v = Math.min(1, Math.max(0, raw / 255));
  return (1 - v) * start + v * end;
}

// Transition: for the first 0.2 s after a latch reset, slerp from the live pose toward the frozen previous-clip pose.
export function transitionPose(live: Pose, frozenPrev: Pose, sinceResetSec: number, windowSec = 0.2): Pose {
  const s = 1 - sinceResetSec / windowSec;
  if (!(s > 0)) return live;
  const t = Math.min(1, s);
  return { pos: lerpVec(live.pos, frozenPrev.pos, t), q: slerp(live.q, frozenPrev.q, t) };
}

// Root motion: the motion bone's translation is zeroed on the axes the clip marks, so game code moves the character.
export function stripRootMotion(pos: Vec3, axes: { x: boolean; y: boolean; z: boolean }): Vec3 {
  return [axes.x ? 0 : pos[0], axes.y ? 0 : pos[1], axes.z ? 0 : pos[2]];
}

// Attachment point: rotate the local offset by the bone's rotation and add the bone position.
export function attachmentPosition(bone: Pose, local: Vec3): Vec3 {
  const [x, y, z] = local;
  const [qx, qy, qz, qw] = bone.q;
  // v' = v + 2w(q x v) + 2 q x (q x v), with q = (qx,qy,qz)
  const cx = qy * z - qz * y, cy = qz * x - qx * z, cz = qx * y - qy * x;
  const ccx = qy * cz - qz * cy, ccy = qz * cx - qx * cz, ccz = qx * cy - qy * cx;
  return [
    bone.pos[0] + x + 2 * (qw * cx + ccx),
    bone.pos[1] + y + 2 * (qw * cy + ccy),
    bone.pos[2] + z + 2 * (qw * cz + ccz),
  ];
}

// Weapon or gear model: a child bone copies the host pose of a same-named bone (case-insensitive).
// Simplified: a bone with no host match keeps its own pose and the child's parent chain is not composed.
export function mergeByName(childBones: string[], host: Map<string, Pose>, own: Pose[]): Pose[] {
  return childBones.map((name, i) => host.get(name.toLowerCase()) ?? own[i]);
}
export {};
