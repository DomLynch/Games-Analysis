// Licence: Apache-2.0 (donor repo LICENSE; CameraController.cs has no per-file header). Permissive: adaptable with the licence notice kept.
// Clean-room sketch written from the described mechanism; Unity types replaced by plain objects.
type V3 = { x: number; y: number; z: number };
interface OrbitState {
  headingDeg: number;          // unbounded, as in the donor
  pitchDeg: number;            // clamped to +/- 80
  camDist: number;             // zoom distance (before collision)
  lerpLookAt: V3 | null;       // smoothed look-at point
}

const WORLD_SCALE = 0.85 / 1.6;          // Unity player height / L2 reference height
const PITCH_LIMIT = 80;
const MOUSE_GAIN = 3;                    // degrees per unit of mouse axis, per frame
const ZOOM_PER_SCROLL = 5 * 0.1;         // zoomSpeed * 0.1 per unit of scroll, per frame (metres)
const MIN_DIST = 1 * WORLD_SCALE;        // L2 minimum distance, scaled
const MAX_DIST = 8;                      // serialized default; the L2 constant of 6 is unused
const SMOOTH_RATE = 8;                   // look-at lerp rate per second
const COLLIDE_RADIUS = 0.1 * WORLD_SCALE;
const COLLIDE_EXTRA = 0.3 * WORLD_SCALE; // extra cast length beyond the desired distance
const MIN_COLLIDE_DIST = 0.05;
const ABOVE_HEAD = 0.2 * WORLD_SCALE;
const LOOK_ADJUST = -0.3;                // not scaled in the donor
const DEFAULT_DIST = 2.3 * WORLD_SCALE + 0.5;

// Unity Euler(pitch, yaw, 0) forward, with pitch positive looking down (donor comment). Derived, not run in Unity.
function forwardFromEuler(pitchDeg: number, yawDeg: number): V3 {
  const p = (pitchDeg * Math.PI) / 180;
  const y = (yawDeg * Math.PI) / 180;
  return { x: Math.cos(p) * Math.sin(y), y: -Math.sin(p), z: Math.cos(p) * Math.cos(y) };
}

function orbitFromMouse(s: OrbitState, mouseX: number, mouseY: number, rightHeld: boolean): void {
  if (!rightHeld) return;                // donor: only while right button held (and CameraMoving, not read)
  s.headingDeg += mouseX * MOUSE_GAIN;
  s.pitchDeg = Math.min(Math.max(s.pitchDeg - mouseY * MOUSE_GAIN, -PITCH_LIMIT), PITCH_LIMIT);
}

function zoomFromScroll(s: OrbitState, scroll: number): void {
  s.camDist = Math.min(Math.max(s.camDist - scroll * ZOOM_PER_SCROLL, MIN_DIST), MAX_DIST);
}

// Look-at point: character top plus a fixed world-space offset (not rotated by the camera, as in the donor).
function lookAtPoint(charTop: V3, camOffset: V3): V3 {
  return {
    x: charTop.x + camOffset.x,
    y: charTop.y + camOffset.y + (ABOVE_HEAD + LOOK_ADJUST),
    z: charTop.z + camOffset.z,
  };
}

// Donor: Vector3.Lerp(prev, target, 8 * dt). Here t is clamped explicitly.
function smoothLookAt(prev: V3 | null, target: V3, dtSec: number): V3 {
  if (prev === null) return target;
  const t = Math.min(Math.max(SMOOTH_RATE * dtSec, 0), 1);
  return {
    x: prev.x + (target.x - prev.x) * t,
    y: prev.y + (target.y - prev.y) * t,
    z: prev.z + (target.z - prev.z) * t,
  };
}

// Sphere cast from the look-at point toward the camera. Returns the distance of the sphere centre at first contact, or null.
type SphereCast = (origin: V3, dir: V3, maxDist: number, radius: number) => number | null;

function pullIn(lookAt: V3, dirToCamera: V3, desired: number, cast: SphereCast): number {
  if (desired <= 0.001) return desired;
  const hit = cast(lookAt, dirToCamera, desired + COLLIDE_EXTRA, Math.max(0.01, COLLIDE_RADIUS));
  if (hit === null) return desired;
  return Math.min(Math.max(hit, MIN_COLLIDE_DIST), desired);   // snaps: the donor does not smooth the distance
}

// One frame in donor order (donor: zoom in Update, orbit and placement in LateUpdate).
function tickOrbitCamera(
  s: OrbitState,
  charTop: V3,
  camOffset: V3,
  inp: { mouseX: number; mouseY: number; rightHeld: boolean; scroll: number },
  dtSec: number,
  cast: SphereCast,
): { position: V3; forward: V3 } {
  orbitFromMouse(s, inp.mouseX, inp.mouseY, inp.rightHeld);
  zoomFromScroll(s, inp.scroll);
  const look = smoothLookAt(s.lerpLookAt, lookAtPoint(charTop, camOffset), dtSec);
  s.lerpLookAt = look;
  const f = forwardFromEuler(s.pitchDeg, s.headingDeg);
  const dirToCam: V3 = { x: -f.x, y: -f.y, z: -f.z };
  const dist = pullIn(look, dirToCam, s.camDist, cast);
  return {
    position: { x: look.x + dirToCam.x * dist, y: look.y + dirToCam.y * dist, z: look.z + dirToCam.z * dist },
    forward: f,
  };
}

// Horizontal FOV held at 90 degrees; vertical derived from aspect (width / height).
function verticalFovFromHorizontal(hDeg: number, aspect: number): number {
  const h = (hDeg * Math.PI) / 180;
  const v = 2 * Math.atan(Math.tan(h * 0.5) / Math.max(0.01, aspect));
  return (v * 180) / Math.PI;
}

export const L2_DEFAULTS = { DEFAULT_DIST, MIN_DIST, MAX_DIST, COLLIDE_RADIUS, COLLIDE_EXTRA };

export {}
