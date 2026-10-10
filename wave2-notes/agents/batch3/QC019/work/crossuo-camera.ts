// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Step { fromX: number; fromY: number; fromZ: number; toX: number; toY: number; toZ: number; startMs: number; walkMs: number; }
interface Pos { x: number; y: number; z: number; }
interface Shake { untilMs: number; magnitude: number; }

const STEP_MARGIN_MS = 15;   // donor: step length = walk delay - 15 ms
const LIFT_PER_Z = 4;        // donor: camera centre moves 4 px per height unit
const SHAKE_PER_MAG = 3;     // donor: jitter span is magnitude * 3 px per axis

// Visual position of the followed character: logical tile plus the fraction of the step already walked.
function visualPos(step: Step | null, nowMs: number, rest: Pos): Pos {
  if (step === null) return rest;
  const span = Math.max(1, step.walkMs - STEP_MARGIN_MS);
  const t = Math.min(1, Math.max(0, (nowMs - step.startMs) / span));
  return {
    x: step.fromX + (step.toX - step.fromX) * t,
    y: step.fromY + (step.toY - step.fromY) * t,
    z: step.fromZ + (step.toZ - step.fromZ) * t,
  };
}

// Camera target for one frame: follow the visual position, lift with height, then add shake while it lasts.
function cameraTarget(step: Step | null, nowMs: number, rest: Pos, shake: Shake | null, rand: () => number): Pos {
  const p = visualPos(step, nowMs, rest);
  const cam: Pos = { x: p.x, y: p.y, z: p.z * LIFT_PER_Z };
  if (shake !== null && nowMs < shake.untilMs) {
    const span = shake.magnitude * SHAKE_PER_MAG;
    cam.x += (rand() * 2 - 1) * span;
    cam.y += (rand() * 2 - 1) * span;
  }
  return cam;
}

