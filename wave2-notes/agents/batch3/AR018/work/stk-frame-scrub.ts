// Licence: MIT (lib/graphics_engine/include/ge_animation.hpp), GPL-3.0-or-later (src/karts/kart_model.cpp). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Key { frame: number; value: number; }   // one scalar channel of one joint (donor: loc, rot, scale)

// Linear sample between the two keys around `frame`. Before the first key or at/after the last key, return the boundary key (no wrap).
function sample(keys: Key[], frame: number): number {
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (frame < first.frame) return first.value;
  if (frame >= last.frame) return last.value;
  for (let i = 0; i + 1 < keys.length; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (frame >= a.frame && frame < b.frame) {
      const t = (frame - a.frame) / (b.frame - a.frame);
      return a.value * (1 - t) + b.value * t;
    }
  }
  return last.value;   // unreachable with sorted keys
}

// A transition freezes the frame the outgoing pose is on and blends from it to the live pose.
interface Transition { frozenFrame: number; durationMs: number; blend: number; }   // blend 0 = frozen pose, 1 = live pose

function startTransition(currentFrame: number, durationMs: number): Transition {
  return { frozenFrame: currentFrame, durationMs, blend: 0 };
}

// Advance the blend clock by dtMs. Once the blend passes 1 the transition ends and the live pose is used.
function stepTransition(t: Transition | null, dtMs: number): Transition | null {
  if (!t) return null;
  t.blend += dtMs / t.durationMs;
  return t.blend > 1 ? null : t;
}

// Pose value for one channel: live sample, or the frozen sample mixed in while a transition runs.
// Scalar lerp here; the donor lerps location and scale and slerps rotation.
function poseValue(keys: Key[], liveFrame: number, tr: Transition | null): number {
  const live = sample(keys, liveFrame);
  if (!tr) return live;
  const frozen = sample(keys, tr.frozenFrame);
  return frozen * (1 - tr.blend) + live * tr.blend;
}

interface SteerFrames { straight: number; left: number; right: number; }

// Steer in [-1, 1] scrubs the frame between STRAIGHT and RIGHT (positive) or LEFT (negative). Range is not checked here.
function steerFrame(steer: number, f: SteerFrames): number {
  if (steer > 0) return f.straight - (f.straight - f.right) * steer;
  if (steer < 0) return f.straight + (f.straight - f.left) * steer;
  return f.straight;
}

// One frame: the transition clock advances first, then the pose is sampled (donor: buildFrameNr, then getSkinningMatrices).
function frameStep(keys: Key[], liveFrame: number, tr: Transition | null, dtMs: number): { value: number; transition: Transition | null } {
  const next = stepTransition(tr, dtMs);
  return { value: poseValue(keys, liveFrame, next), transition: next };
}

export {};
