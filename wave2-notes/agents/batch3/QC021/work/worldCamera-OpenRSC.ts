// Licence: AGPL-3.0 (donor LICENSE). Clean-room shape only: written from the described steps, not a translation of the donor lines.
const YAW_FULL = 256;        // donor: yaw state is 256 units per turn
const COMPASS_STEP = 32;     // donor: 8 compass indices, 32 yaw units apart
const PITCH_UNITS = 912;     // donor: third-person pitch, 1024 units per turn (about 39 degrees down)
const PITCH_FULL = 1024;
const TURN_FULL = 1024;      // donor: setCamera angles are 1024 units per turn
const SNAP_GAP = 500;        // donor: focus jumps when the gap exceeds 500 units

interface Cam {
  focusX: number; focusZ: number;  // eased follow point (tick state)
  yaw: number;                     // 0..255 yaw units
  compass: number;                 // 0..7 chosen compass index
  turnTicks: number;               // ticks spent turning
  zoom: number;                    // donor cameraZoom; distance = 2 x zoom
}

const mod = (a: number, n: number): number => ((a % n) + n) % n;

// Shortest signed turn from a to b on the 256-unit circle.
function signedDelta(a: number, b: number): number {
  const d = mod(b - a, YAW_FULL);
  return d > YAW_FULL / 2 ? d - YAW_FULL : d;
}

// One tick of turning. Step grows with ticks spent turning and never drops below 1 unit per tick.
// ADDED clamp: the step is capped at the remaining distance (the donor has no cap; no overshoot in a replay for 32-192 units).
function turnTick(c: Cam): void {
  const d = signedDelta(c.yaw, c.compass * COMPASS_STEP);
  if (d === 0) { c.turnTicks = 0; return; }
  c.turnTicks++;
  const step = Math.min(Math.max(1, Math.ceil((Math.abs(d) * c.turnTicks) / 256)), Math.abs(d));
  c.yaw = mod(c.yaw + Math.sign(d) * step, YAW_FULL);
}

// One tick of follow. The gap closes by 1/divisor, and the divisor grows with zoom, so a farther camera lags more.
// Donor divisor: (zoom - 500) / 15 + 16 with integer division; the sketch keeps floats (no dead zone).
function followTick(c: Cam, hero: { x: number; z: number }): void {
  const gx = hero.x - c.focusX;
  const gz = hero.z - c.focusZ;
  if (Math.abs(gx) > SNAP_GAP || Math.abs(gz) > SNAP_GAP) {
    c.focusX = hero.x;
    c.focusZ = hero.z;
    return;
  }
  const divisor = (c.zoom - 500) / 15 + 16;
  c.focusX += gx / divisor;
  c.focusZ += gz / divisor;
}

// Choose the compass index to face while the camera is in auto mode (shape of the donor's rule).
// Odd indices are kept while clear; a clear even index moves to an odd neighbour if one is clear;
// a blocked index searches outward by +1, -1, +2, -2, +3, -3, +4 for the nearest clear index.
function pickCompass(current: number, clear: (i: number) => boolean): number {
  const evenRule = (i: number): number => {
    if (clear(mod(i + 1, 8))) return mod(i + 1, 8);
    if (clear(mod(i - 1, 8))) return mod(i - 1, 8);
    return i;
  };
  if (current % 2 === 1 && clear(current)) return current;
  if (current % 2 === 0 && clear(current)) return evenRule(current);
  let i = current;
  for (const off of [1, -1, 2, -2, 3, -3, 4]) {
    const j = mod(current + off, 8);
    if (clear(j)) { i = j; break; }
  }
  if (i % 2 === 0 && clear(i)) i = evenRule(i);
  return i;
}

// Per draw: aim point and camera position, y-up world units. Third person: fixed pitch, distance 2 x zoom.
// The aim point is the eased follow point, so the hero stays centred (no shoulder offset in the donor).
function place(c: Cam, groundY: number, shoulder: number): { pos: [number, number, number]; aim: [number, number, number] } {
  const dist = 2 * c.zoom;
  const elev = (mod(PITCH_FULL - PITCH_UNITS, PITCH_FULL) / PITCH_FULL) * 2 * Math.PI;
  const yaw = (c.yaw * 4 / TURN_FULL) * 2 * Math.PI;   // donor: yaw is passed as yaw x 4 in 1024 units
  const back = dist * Math.cos(elev);
  const up = dist * Math.sin(elev);
  const rx = -Math.cos(yaw);   // ADDED shoulder: screen-right vector
  const rz = -Math.sin(yaw);
  const aimY = groundY + 180;  // donor aims 180 units above the ground
  const aim: [number, number, number] = [c.focusX + shoulder * rx, aimY, c.focusZ + shoulder * rz];
  const pos: [number, number, number] = [
    c.focusX + back * Math.sin(yaw) + shoulder * rx,
    aimY + up,
    c.focusZ - back * Math.cos(yaw) + shoulder * rz,
  ];
  return { pos, aim };
}

export {};
