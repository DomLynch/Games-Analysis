// Licence: MIT (donor LICENSE). Clean-room sketch of the described mechanism, not a line translation.
type Angle = number; // donor units: 2048 per full turn

const ANGLE_FULL = 2048;
const toRad = (a: number): number => (a * 2 * Math.PI) / ANGLE_FULL;
const wrap = (a: number): number => ((a % ANGLE_FULL) + ANGLE_FULL) % ANGLE_FULL;
const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

// Tunables. Donor values unless marked ADDED.
const TUNE = {
  followDivisor: 16,   // donor: focus closes 1/16 of the gap per tick
  snapGap: 500,        // donor: focus jumps when the gap exceeds 500 units
  yawTarget: 24,       // donor: yaw velocity eases toward 24 units per tick
  pitchTarget: 12,     // donor: pitch velocity eases toward 12 units per tick
  pitchMin: 128,       // donor
  pitchMax: 383,       // donor
  distBase: 600,       // donor: distance = 600 + 3 * pitch
  distPerPitch: 3,     // donor
  floorRise: 1 / 24,   // donor: terrain pitch floor rises 1/24 of the gap per tick
  floorFall: 1 / 80,   // donor: and falls 1/80 per tick (slow relax)
  shoulder: 0,         // ADDED (not in donor): lateral offset in units, + = camera to the right
};

interface OrbitCam {
  focusX: number; focusZ: number;   // smoothed focus on the ground plane (tick state)
  yaw: Angle; pitch: Angle;         // angle units; pitch 128..383 (donor)
  yawVel: number; pitchVel: number; // units per tick, eased toward the key targets
  terrainPitch: number;             // smoothed pitch floor from terrain (pitch units)
}

// yaw -1 = left key, +1 = right key; pitch +1 = up key (donor keyHeld[3]), -1 = down key.
interface Input { yaw: -1 | 0 | 1; pitch: -1 | 0 | 1; }

// One fixed tick. maxRise = how far the ground in a 9x9 tile window rises above the focus (units, >= 0), sampled by the caller.
function tick(c: OrbitCam, player: { x: number; z: number }, input: Input, maxRise: number): void {
  const gx = player.x - c.focusX;
  const gz = player.z - c.focusZ;
  if (Math.abs(gx) > TUNE.snapGap || Math.abs(gz) > TUNE.snapGap) {
    c.focusX = player.x;
    c.focusZ = player.z;
  } else {
    c.focusX += gx / TUNE.followDivisor;
    c.focusZ += gz / TUNE.followDivisor;
  }

  if (input.yaw < 0) c.yawVel += (-TUNE.yawTarget - c.yawVel) / 2;
  else if (input.yaw > 0) c.yawVel += (TUNE.yawTarget - c.yawVel) / 2;
  else c.yawVel /= 2;

  if (input.pitch > 0) c.pitchVel += (TUNE.pitchTarget - c.pitchVel) / 2;
  else if (input.pitch < 0) c.pitchVel += (-TUNE.pitchTarget - c.pitchVel) / 2;
  else c.pitchVel /= 2;

  c.yaw = wrap(c.yaw + c.yawVel / 2);
  c.pitch = clamp(c.pitch + c.pitchVel / 2, TUNE.pitchMin, TUNE.pitchMax);

  const want = clamp((maxRise * 192) / 256, TUNE.pitchMin, TUNE.pitchMax);
  c.terrainPitch += (want - c.terrainPitch) * (want > c.terrainPitch ? TUNE.floorRise : TUNE.floorFall);
}

// Per draw frame: place the camera from the tick state. y-up world units.
function place(c: OrbitCam, groundY: number): { pos: [number, number, number]; aim: [number, number, number] } {
  const pitch = Math.max(c.pitch, c.terrainPitch);
  const dist = TUNE.distBase + TUNE.distPerPitch * pitch;
  const p = toRad(pitch);
  const y = toRad(c.yaw);
  const back = dist * Math.cos(p);   // horizontal distance behind the focus
  const up = dist * Math.sin(p);     // height above the aim point
  const rx = -Math.cos(y);           // screen-right vector (ADDED shoulder uses it)
  const rz = -Math.sin(y);
  const s = TUNE.shoulder;
  const aimY = groundY + 50;         // donor aims 50 units above the ground under the player
  const aim: [number, number, number] = [c.focusX + s * rx, aimY, c.focusZ + s * rz];
  const pos: [number, number, number] = [
    c.focusX + back * Math.sin(y) + s * rx,
    aimY + up,
    c.focusZ - back * Math.cos(y) + s * rz,
  ];
  return { pos, aim };
}

// Driver: 20 ms ticks with an accumulator, one tick per 20 ms of frame time.
const TICK_MS = 20;
let accMs = 0;
function advance(dtMs: number, runTick: () => void): void {
  accMs += dtMs;
  while (accMs >= TICK_MS) {
    runTick();
    accMs -= TICK_MS;
  }
}

export {};
