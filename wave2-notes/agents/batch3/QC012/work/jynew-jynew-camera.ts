// Licence: unclear (donor README says MIT but the community asset licence overrides parts; the root LICENSE says no use of code or resources without authorisation). Clean-room sketch of the mechanism; not a translation.
// clean-room
const FOLLOW_SMOOTHING = 3;             // pivot follow weight per second (donor: smoothing; GameConst.CAM_SMOOTHING defaults to 3)
const ORBIT_DEG_PER_S = 120;            // orbit speed (donor: m_RrotateSpeed)
const ZOOM_SPEED = 3;                   // distance per wheel unit (donor: zoomSpeed)
const ZOOM_MIN_Y = 3, ZOOM_MAX_Y = 20;  // wheel zoom height limits (donor: zoomMin, zoomMax)
const FOV_MIN = 20, FOV_MAX = 70;       // battle FOV clamp (donor)
const PAN_SPEED = 30;                   // pivot pan units per second (donor: 30)

interface V3 { x: number; y: number; z: number; }

// Pivot follow (late step). In battle the pivot lerps toward the role with weight smoothing * dt.
// Outside battle it snaps to the role every frame. A pan takes the pivot off the role until focus is re-set.
function followPivot(pivot: V3, target: V3, dt: number, inBattle: boolean, lockRole: boolean): V3 {
  if (!lockRole) return pivot;
  if (!inBattle) return { x: target.x, y: target.y, z: target.z };
  const t = Math.min(1, FOLLOW_SMOOTHING * dt);
  return {
    x: pivot.x + (target.x - pivot.x) * t,
    y: pivot.y + (target.y - pivot.y) * t,
    z: pivot.z + (target.z - pivot.z) * t,
  };
}

// Orbit the pivot about world up by an input axis in [-1, 1]. The donor's battle orbit uses twice the speed.
function orbitYawDeg(yawDeg: number, axis: number, dt: number): number {
  return (yawDeg + ORBIT_DEG_PER_S * 2 * axis * dt) % 360;
}

// Wheel zoom along the view forward. The height is clamped; a step that would pass a limit is undone.
function zoom(pos: V3, forward: V3, wheel: number): V3 {
  const next: V3 = {
    x: pos.x + forward.x * wheel * ZOOM_SPEED,
    y: pos.y + forward.y * wheel * ZOOM_SPEED,
    z: pos.z + forward.z * wheel * ZOOM_SPEED,
  };
  const pushingPastMin = next.y <= ZOOM_MIN_Y && wheel > 0;
  const pushingPastMax = next.y >= ZOOM_MAX_Y && wheel < 0;
  if (pushingPastMin || pushingPastMax) return pos;
  return { x: next.x, y: Math.min(ZOOM_MAX_Y, Math.max(ZOOM_MIN_Y, next.y)), z: next.z };
}

// Pan the pivot on the ground plane (y unchanged).
function pan(pivot: V3, axis: { x: number; y: number }, dt: number): V3 {
  return { x: pivot.x + axis.x * PAN_SPEED * dt, y: pivot.y, z: pivot.z + axis.y * PAN_SPEED * dt };
}

// Battle field of view is clamped to [FOV_MIN, FOV_MAX] after each step.
function clampBattleFov(v: number): number {
  return Math.min(FOV_MAX, Math.max(FOV_MIN, v));
}

// Ramp a value to a target over `seconds` in fixed steps of 1/60 s. The guard decides whether a step runs.
// The donor's ChangeFOV guard only allows increases, so a ramp down never runs there (see note).
interface Ramp { value: number; step: number; }
function makeRamp(value: number, target: number, seconds: number): Ramp {
  const steps = Math.trunc(seconds * 60);
  return { value, step: steps > 0 ? (target - value) / steps : 0 };
}
function rampStep(r: Ramp, guard: (v: number) => boolean): void {
  if (guard(r.value)) r.value += r.step;
}

// Shake: a noise component runs for seconds * 60 fixed frames, then is removed.
interface Shake { amplitude: number; frequency: number; framesLeft: number; }
function startShake(seconds: number, amplitude: number, frequency: number): Shake {
  return { amplitude, frequency, framesLeft: Math.trunc(seconds * 60) };
}
function shakeTick(s: Shake): Shake | null {
  return s.framesLeft > 0 ? { ...s, framesLeft: s.framesLeft - 1 } : null;
}

export {};
