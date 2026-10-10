// Licence: BSD-2-Clause (donor: XProger-OpenLara, LICENSE). Adapted shape, hand-written in TypeScript from the read mechanism.
// BSD-2 notice: Copyright (c) 2018, Timur "XProger" Gagiev. Keep that notice in any code copied from the donor.

type V3 = { x: number; y: number; z: number };
type Stick = { pitch: number; yaw: number }; // radians, already dead-zoned by the caller
type Mode = 'follow' | 'combat' | 'look';

const DEG = Math.PI / 180;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const lerp3 = (a: V3, b: V3, k: number): V3 =>
  k >= 1 ? { x: b.x, y: b.y, z: b.z }
         : { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k };

// Donor vec3(lng, lat) constructor (utils.h:431) with lng = pitch, lat = yaw.
function dirFromAngles(pitch: number, yaw: number): V3 {
  return { x: Math.sin(yaw) * Math.cos(pitch), y: -Math.sin(pitch), z: Math.cos(yaw) * Math.cos(pitch) };
}

// Tunables. Values are the donor's; a designer would make these zone data where they differ per zone.
export interface Tune {
  offsetFollow: number;  // 1536 units (donor CAM_OFFSET_FOLLOW)
  offsetCombat: number;  // 2048 units (CAM_OFFSET_COMBAT)
  offsetLook: number;    // 512 units  (CAM_OFFSET_LOOK)
  speedFollow: number;   // 12 (CAM_SPEED_FOLLOW); eye rate = 30 / speed per second
  speedCombat: number;   // 8  (CAM_SPEED_COMBAT)
  lookRate: number;      // 20 per second in look mode
  recentreRate: number;  // 10 per second (look offset back to 0)
  targetYRate: number;   // 5 per second (look point height easing)
  pitchMax: number;      // 85 degrees in radians
}
export const DONOR_TUNE: Tune = {
  offsetFollow: 1536, offsetCombat: 2048, offsetLook: 512,
  speedFollow: 12, speedCombat: 8, lookRate: 20, recentreRate: 10, targetYRate: 5,
  pitchMax: 85 * DEG,
};

// Per-state orbit presets (donor lara.h:2949-3006, in degrees there). The donor writes them only while the camera mode is follow.
export const PRESET = {
  none:          { pitch: 0 * DEG,   yaw: 0 * DEG },
  reach:         { pitch: 0 * DEG,   yaw: 85 * DEG },
  backJump:      { pitch: 0 * DEG,   yaw: 135 * DEG },
  surfWade:      { pitch: -22 * DEG, yaw: 0 * DEG },
  slide:         { pitch: -45 * DEG, yaw: 0 * DEG },
  hang:          { pitch: -60 * DEG, yaw: 0 * DEG },
  pushPullBlock: { pitch: -25 * DEG, yaw: 35 * DEG },
  pushPullReady: { pitch: 0 * DEG,   yaw: 75 * DEG },
  pickUp:        { pitch: -15 * DEG, yaw: -130 * DEG },
  switchUse:     { pitch: -25 * DEG, yaw: 80 * DEG },
  keyPuzzle:     { pitch: -25 * DEG, yaw: -80 * DEG },
  special:       { pitch: -25 * DEG, yaw: 170 * DEG },
};

export interface Actor { x: number; z: number; yaw: number; boxMinY: number; boxMaxY: number; }

// World queries are injected. The donor uses its tile trace, clipBox and clipSlide for pullIn, and sector floor/ceiling for the others.
export interface Env {
  pullIn(from: V3, ideal: V3, offset: number): V3;
  floorAt(p: V3): number;   // y grows downward
  ceilingAt(p: V3): number;
}

export interface Cam {
  eye: V3;
  look: V3;
  lookPitch: number; // stored look offset (look mode integrates it, other modes recentre it)
  lookYaw: number;
  smooth: boolean;   // false on the first frame and after a view change: snap
  shake: number;     // seconds left
}

// One sub-step. The caller must split wall-clock time into steps of at most 1/30 s (donor game.h:321) and call this once per step.
export function camStep(c: Cam, a: Actor, mode: Mode, stick: Stick, preset: Stick,
                        t: Tune, dt: number, env: Env): V3 {
  c.shake = Math.max(0, c.shake - dt);

  if (mode !== 'look') { // donor lerps the look offset toward 0 at rate recentreRate * dt
    c.lookPitch += (0 - c.lookPitch) * (t.recentreRate * dt);
    c.lookYaw   += (0 - c.lookYaw)   * (t.recentreRate * dt);
  }

  // Orbit angles. Yaw follows the actor with no lag. The stick offset is instant and not stored. The preset is added after the clamp.
  const pitch = clamp(c.lookPitch + stick.pitch, -t.pitchMax, t.pitchMax) + preset.pitch;
  const yaw   = a.yaw + c.lookYaw + stick.yaw + preset.yaw;

  // Look point: x/z rigid on the actor. y is 3/4 of the way up the box, then 256 higher (donor camera.h:156, 161), and eased when smooth.
  const lookY = a.boxMaxY + (a.boxMinY - a.boxMaxY) * 0.75 - 256;
  c.look = {
    x: a.x,
    y: c.smooth ? c.look.y + (lookY - c.look.y) * dt * t.targetYRate : lookY,
    z: a.z,
  };

  // Ideal eye: `offset` behind the look point along the orbit direction (donor camera.h:524-525).
  const offset = mode === 'combat' ? t.offsetCombat : mode === 'look' ? t.offsetLook : t.offsetFollow;
  const d = dirFromAngles(pitch, yaw);
  const ideal: V3 = { x: c.look.x - d.x * offset, y: c.look.y - d.y * offset, z: c.look.z - d.z * offset };

  // Wall pull-in (injected, see Env). Then the eye moves toward the result at a frame-rate-independent rate.
  const free = env.pullIn(c.look, ideal, offset);
  const speed = mode === 'combat' ? t.speedCombat : t.speedFollow;
  const k = mode === 'look' ? t.lookRate * dt : c.smooth ? Math.min(1, (30 / speed) * dt) : 1;
  c.eye = lerp3(c.eye, free, k);

  // Keep the eye between ceiling + 256 and floor - 256. If the gap is closed, both collapse to the midpoint (donor camera.h:340-353).
  let floor = env.floorAt(c.eye) - 256;
  let ceil = env.ceilingAt(c.eye) + 256;
  if (floor < ceil) { floor = ceil = (floor + ceil) * 0.5; }
  if (c.eye.y > floor) c.eye.y = floor;
  if (c.eye.y < ceil) c.eye.y = ceil;

  c.smooth = true;

  // Shake is a view-only vertical offset (donor setup(), camera.h:641-642). Amplitude 48 * s, phase 7 * PI * s, s = seconds left.
  const shakeY = c.shake > 0 ? Math.sin(c.shake * Math.PI * 7) * c.shake * 48 : 0;
  return { x: c.eye.x, y: c.eye.y + shakeY, z: c.eye.z };
}

export {};
