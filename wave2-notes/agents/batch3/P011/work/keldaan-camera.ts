// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface CamState {
  zoom: number;        // 1 = fit, MAX_ZOOM = closest
  scrollX: number;     // view top-left, world units
  scrollY: number;
  locked: boolean;     // player lock: wheel and drag are ignored
  shakeOff: boolean;   // player preference; shake is off unless the player turns it on
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;
const PAN_MS = 400;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

interface Pan { x: number; y: number; ms: number }

// One wheel event: only the sign of deltaY counts, not its size.
// Wheel up (negative) zooms in and asks for a pan to the pointer.
// A wheel-down that leaves zoom at MIN_ZOOM asks for a pan back to the origin.
function onWheel(cam: CamState, deltaY: number, pointer: { x: number; y: number }): Pan | null {
  if (cam.locked) return null;
  cam.zoom = clamp(cam.zoom - Math.sign(deltaY) * ZOOM_STEP, MIN_ZOOM, MAX_ZOOM);
  if (deltaY < 0) return { x: pointer.x, y: pointer.y, ms: PAN_MS };
  if (cam.zoom === MIN_ZOOM) return { x: 0, y: 0, ms: PAN_MS };
  return null;
}

// Drag: a held pointer moves the view by its screen delta divided by zoom.
// Ignored at MIN_ZOOM and while locked.
function onDrag(cam: CamState, dxScreen: number, dyScreen: number): void {
  if (cam.locked || cam.zoom === MIN_ZOOM) return;
  cam.scrollX -= dxScreen / cam.zoom;
  cam.scrollY -= dyScreen / cam.zoom;
}

// The lock key toggles the lock.
function toggleLock(cam: CamState): void {
  cam.locked = !cam.locked;
}

// Shake request: null when the player has shake off; otherwise the defaults are 250 ms and 0.01.
function shake(cam: CamState, opts?: { durationMs?: number; intensity?: number }): { durationMs: number; intensity: number } | null {
  if (cam.shakeOff) return null;
  return { durationMs: opts?.durationMs ?? 250, intensity: opts?.intensity ?? 0.01 };
}

export {};
