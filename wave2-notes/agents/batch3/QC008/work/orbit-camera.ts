// Licence: MIT
// Licence: MIT (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const VMAX = 2.0;                 // rad/s, look-rate cap
const AMAX = 8.0;                 // rad/s^2, look-acceleration cap
const DECEL = (2 * AMAX) / VMAX;  // 8: near a limit the rate falls to (remaining angle x DECEL)
const DRAG_T = 3.0;               // s, a drag offset eases back to zero over this time

interface OrbitCam {
  phi: number;         // yaw around the target, rad
  theta: number;       // pitch around the target, rad
  vPhi: number;        // current yaw rate, rad/s
  vTheta: number;      // current pitch rate, rad/s
  rdist: number;       // distance in target radii
  targetSize: number;  // target radius, m
}

interface Limits { phiLo: number; phiHi: number; thetaLo: number; thetaHi: number; }

// Requested rate -> applied rate: slow down as the angle nears a limit, then cap the change in rate per second.
function shapeRate(want: number, current: number, angle: number, lo: number, hi: number, dt: number): number {
  let v = want;
  if (v > 0) v = Math.min(v, (hi - angle) * DECEL);
  else if (v < 0) v = Math.max(v, (lo - angle) * DECEL);
  const maxStep = AMAX * dt;
  if (v > current + maxStep) v = current + maxStep;
  else if (v < current - maxStep) v = current - maxStep;
  return v;
}

// One frame of look input (requested rates, rad/s). dt is this frame's seconds (variable step, no fixed tick).
function stepLook(cam: OrbitCam, wantPhi: number, wantTheta: number, dt: number, lim: Limits): void {
  cam.vPhi = shapeRate(wantPhi, cam.vPhi, cam.phi, lim.phiLo, lim.phiHi, dt);
  cam.vTheta = shapeRate(wantTheta, cam.vTheta, cam.theta, lim.thetaLo, lim.thetaHi, dt);
  cam.phi += cam.vPhi * dt;
  cam.theta += cam.vTheta * dt;
}

// Wheel or key zoom. shift > 0 pulls out, shift < 0 pushes in; the step shrinks near the target surface but never below 1/targetSize.
function zoom(cam: OrbitCam, shift: number): void {
  let scale = Math.max(1e-4, (cam.rdist - 1) / cam.rdist); // slow down near 1 target radius
  scale = Math.max(scale, 1 / cam.targetSize); // floor: move at least 1 m/s (shift is already x dt), so zoom cannot stall
  const s = shift * scale;
  const fact = s > 0 ? 1 + s : Math.max(1 / cam.rdist, 1 / (1 - s));
  cam.rdist *= fact; // inward zoom stops at 1 target radius
}

// Magnitude of a drag offset that started at d0 and is t seconds old: smoothstep-shaped ease to zero over DRAG_T.
function dragMagnitude(d0: number, t: number): number {
  if (t >= DRAG_T) return 0;
  const u = t / DRAG_T;
  return d0 * (1 - u * u * (3 - 2 * u));
}

// Camera position from the orbit angles (same algebra as the donor's SetRelPos: column 3 of the rotation, length -rdist x size).
function orbitPosition(cam: OrbitCam): [number, number, number] {
  const R = cam.rdist * cam.targetSize;
  const sp = Math.sin(cam.phi), cp = Math.cos(cam.phi);
  const st = Math.sin(cam.theta), ct = Math.cos(cam.theta);
  return [R * sp * ct, -R * st, -R * cp * ct];
}

export {};
