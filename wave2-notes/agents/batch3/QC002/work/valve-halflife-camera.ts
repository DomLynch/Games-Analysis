// Licence: Half Life 1 SDK LICENSE (Valve). Restricted: clean-room, shape only. Written from the described mechanism, not a translation.
// Client-only camera. Nothing here touches health, hits, spawns or server state.
// Donor runs its eases once per client tick; this sketch converts them to dt, assuming 60 ticks per second.
type Angles = { yaw: number; pitch: number };
type Vec3 = { x: number; y: number; z: number };

const TICKS_PER_SEC = 60;
const EASE_PER_TICK = 0.25;      // donor divides the gap by 4 each tick
const ANGLE_SNAP_DEG = 1.0;      // donor snaps when within one degree
const DIST_SNAP = 2.0;           // donor snaps the distance when within 2 units
const MIN_DIST = 30;             // CAM_MIN_DIST
const YAW_LIMIT_MOUSE = 135;     // clamp for mouse orbit only (keys are not clamped in the donor)
const PITCH_MIN = 0;
const PITCH_MAX = 90;
const KEY_YAW_PER_TICK = 2.5;    // degrees per tick while held
const KEY_DIST_PER_TICK = 1.0;   // units per tick while held
const MOUSE_YAW_PER_PX_TICK = 0.25; // donor: 0.5 * (offset / 2) per tick

interface Preset {
  idealYaw: number;      // offset from the player's view yaw; default 90 (zone data)
  idealPitch: number;    // offset from the view pitch; default 0 (zone data)
  idealDist: number;     // default 64 (zone data)
}

interface CamState {
  ofsYaw: number;        // eased yaw offset, absolute (ideal + view), wrapped to [0, 360)
  ofsPitch: number;
  ofsDist: number;
}

const wrap360 = (a: number): number => ((a % 360) + 360) % 360;

// Shortest signed difference between two angles, in (-180, 180].
function angleGap(cur: number, goal: number): number {
  let d = wrap360(goal - cur);
  if (d > 180) d -= 360;
  return d;
}

// Frame-rate aware ease: the donor's per-tick quarter step becomes 1 - 0.75^(ticks elapsed).
function easeAngle(cur: number, goal: number, dtSec: number): number {
  const gap = angleGap(cur, goal);
  if (Math.abs(gap) <= ANGLE_SNAP_DEG) return wrap360(goal);
  const k = 1 - Math.pow(1 - EASE_PER_TICK, dtSec * TICKS_PER_SEC);
  return wrap360(cur + gap * k);
}

function easeDist(cur: number, goal: number, dtSec: number): number {
  const gap = goal - cur;
  if (Math.abs(gap) < DIST_SNAP) return goal;
  const k = 1 - Math.pow(1 - EASE_PER_TICK, dtSec * TICKS_PER_SEC);
  return cur + gap * k;
}

// Player input writes the ideal (it persists after release). Keys and mouse are one path.
function applyManualInput(
  p: Preset,
  keys: { yawLeft: boolean; yawRight: boolean; pitchUp: boolean; pitchDown: boolean; zoomIn: boolean; zoomOut: boolean },
  mouse: { held: boolean; dxFromCentre: number; dyFromCentre: number },
  dtSec: number,
): void {
  const ticks = dtSec * TICKS_PER_SEC;
  if (keys.pitchUp) p.idealPitch += KEY_YAW_PER_TICK * ticks;        // donor: no pitch clamp on keys
  else if (keys.pitchDown) p.idealPitch -= KEY_YAW_PER_TICK * ticks;
  if (keys.yawLeft) p.idealYaw -= KEY_YAW_PER_TICK * ticks;          // donor: no yaw clamp on keys
  else if (keys.yawRight) p.idealYaw += KEY_YAW_PER_TICK * ticks;

  if (mouse.held) {
    p.idealYaw = Math.min(Math.max(p.idealYaw + MOUSE_YAW_PER_PX_TICK * mouse.dxFromCentre * ticks, -YAW_LIMIT_MOUSE), YAW_LIMIT_MOUSE);
    p.idealPitch = Math.min(Math.max(p.idealPitch + MOUSE_YAW_PER_PX_TICK * mouse.dyFromCentre * ticks, PITCH_MIN), PITCH_MAX);
  }
}

// Zoom keys move the ideal distance. Zooming in past the minimum resets the offset to directly behind.
function applyZoom(p: Preset, keys: { zoomIn: boolean; zoomOut: boolean }, dtSec: number): void {
  const ticks = dtSec * TICKS_PER_SEC;
  if (keys.zoomIn) {
    p.idealDist -= KEY_DIST_PER_TICK * ticks;
    if (p.idealDist < MIN_DIST) {
      p.idealPitch = 0;
      p.idealYaw = 0;
      p.idealDist = MIN_DIST;
    }
  } else if (keys.zoomOut) {
    p.idealDist += KEY_DIST_PER_TICK * ticks;
  }
}

// One frame: ease the eased offset toward ideal + view, then place the camera behind the eye point.
function tickThirdPerson(
  p: Preset,
  st: CamState,
  view: Angles,              // player's aim angles (not changed by the camera)
  eye: Vec3,                 // eye point, after this frame's physics and any shake
  dtSec: number,
): { camPos: Vec3; look: Angles } {
  st.ofsYaw = easeAngle(st.ofsYaw, p.idealYaw + view.yaw, dtSec);
  st.ofsPitch = easeAngle(st.ofsPitch, p.idealPitch + view.pitch, dtSec);   // no clamp here, as in the donor
  st.ofsDist = easeDist(st.ofsDist, p.idealDist, dtSec);

  // Quake-style forward for the offset angles (pitch positive looks down); AngleVectors not read in the donor.
  const yr = (st.ofsYaw * Math.PI) / 180;
  const pr = (st.ofsPitch * Math.PI) / 180;
  const fwd: Vec3 = { x: Math.cos(yr) * Math.cos(pr), y: Math.sin(yr) * Math.cos(pr), z: -Math.sin(pr) };
  const camPos: Vec3 = { x: eye.x - st.ofsDist * fwd.x, y: eye.y - st.ofsDist * fwd.y, z: eye.z - st.ofsDist * fwd.z };
  return { camPos, look: { yaw: st.ofsYaw, pitch: st.ofsPitch } }; // camera looks back along the offset, at the eye point
}

export {}
