// Licence: restricted (WoWee source is "MIT with Additional Restriction": no commercial game use). Clean-room sketch of the mechanism; not a translation.
// clean-room
export {};

type Vec3 = { x: number; y: number; z: number };

export interface OrbitState {
  dist: number;          // eased distance actually in use
  want: number;          // the player's chosen distance (wheel), reduced by collision
  debt: number;          // zoom taken by collision, given back later
  clearSec: number;      // seconds with nothing in the way
  limit: number;         // collision limit, smoothed asymmetrically
  deflectDeg: number;    // current step-around angle
  cam: Vec3;             // smoothed camera position
  initialised: boolean;  // limit seeded
  camInit: boolean;      // camera seeded
}

export interface OrbitIn {
  dt: number;                                  // raw frame seconds
  pivot: Vec3;                                 // point on the character
  dir: Vec3;                                   // unit vector pivot -> camera
  rotating: boolean;                           // drag or turn key held
  wallLimit(dir: Vec3, maxDist: number): number; // static walls; maxDist when clear
  floorAt(x: number, y: number): number | null;  // ground under the camera
}

const ZOOM_TAU = 15;      // 1/s, zoom eases toward the wanted distance
const CAM_FOLLOW = 30;    // 1/s, camera position follows the pivot
const MIN_DIST = 0.5;
const FLOOR_CLEAR = 0.35;
const DEFLECT_MAX = 14 * Math.PI / 180;
const DEFLECT_GAIN = 1.0;

const rotZ = (d: Vec3, a: number): Vec3 => ({
  x: d.x * Math.cos(a) - d.y * Math.sin(a),
  y: d.x * Math.sin(a) + d.y * Math.cos(a),
  z: d.z,
});
const norm = (d: Vec3): Vec3 => {
  const l = Math.hypot(d.x, d.y, d.z);
  return { x: d.x / l, y: d.y / l, z: d.z / l };
};
const ease = (dt: number, tau: number) => 1 - Math.exp(-dt / tau);

export function stepOrbit(s: OrbitState, i: OrbitIn): Vec3 {
  // 1. zoom eases toward what the player wants
  s.dist += (s.want - s.dist) * ease(i.dt, 1 / ZOOM_TAU);

  // 2. collision: raw wall limit, then a yaw step-around when blocked
  let dir = i.dir;
  let raw = i.wallLimit(dir, s.dist);
  let deflectTarget = 0;
  if (raw < s.dist - 0.5 && raw < s.want) {
    let best = raw;
    for (const a of [DEFLECT_MAX, -DEFLECT_MAX]) {
      const t = i.wallLimit(norm(rotZ(i.dir, a)), s.dist);
      if (t > best + DEFLECT_GAIN) { best = t; deflectTarget = a; }
    }
    raw = best;
  }
  // ease into and out of the step-around
  s.deflectDeg += (deflectTarget - s.deflectDeg) * ease(i.dt, deflectTarget !== 0 ? 0.12 : 0.30);
  if (Math.abs(s.deflectDeg) > 0.0009) dir = norm(rotZ(i.dir, s.deflectDeg));

  // 3. asymmetric smoothing of the limit: snap in while rotating, fast in, slow out
  if (!s.initialised) { s.limit = raw; s.initialised = true; }
  if (raw < s.limit && i.rotating) {
    s.limit = raw;
  } else {
    s.limit += (raw - s.limit) * ease(i.dt, raw < s.limit ? 0.06 : 0.40);
  }

  // 4. collision takes the zoom in with it, and gives it back after a clear spell
  const bite = s.want - s.limit;
  if (bite > 0.1) {
    s.clearSec = 0;
    const pulled = Math.max(s.want - bite * ease(i.dt, 1.0), MIN_DIST);
    s.debt += s.want - pulled;
    s.want = pulled;
  } else {
    s.clearSec += i.dt;
    if (s.clearSec > 1.0 && s.debt > 0.001) {
      const give = s.debt * ease(i.dt, 2.5);
      s.want += give;
      s.debt -= give;
    }
  }

  // 5. place the camera at the nearer of distance and limit
  const actual = Math.min(s.dist, s.limit);
  const target: Vec3 = {
    x: i.pivot.x + dir.x * actual,
    y: i.pivot.y + dir.y * actual,
    z: i.pivot.z + dir.z * actual,
  };

  // 6. position follows: 1:1 while rotating, otherwise exponential at 30/s
  if (!s.camInit) { s.cam = target; s.camInit = true; }
  const k = i.rotating ? 1 : ease(i.dt, 1 / CAM_FOLLOW);
  s.cam = {
    x: s.cam.x + (target.x - s.cam.x) * k,
    y: s.cam.y + (target.y - s.cam.y) * k,
    z: s.cam.z + (target.z - s.cam.z) * k,
  };

  // 7. never under the ground, never below the feet plane
  const g = i.floorAt(s.cam.x, s.cam.y);
  if (g !== null && s.cam.z < g + FLOOR_CLEAR) s.cam.z = g + FLOOR_CLEAR;
  s.cam.z = Math.max(s.cam.z, i.pivot.z + 0.15);
  return s.cam;
}
