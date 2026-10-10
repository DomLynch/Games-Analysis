// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Point { x: number; y: number; }
interface WorldCamera { x: number; y: number; zoom: number; }
interface ZoneBounds { widthPx: number; heightPx: number; }  // zone size from zone data
interface View { widthPx: number; heightPx: number; }        // intended view size in px at zoom 1

const ZOOM_MIN = 0.3;
const ZOOM_MAX = 1.5;
const ZOOM_PER_WHEEL_UNIT = 0.03;

// Pause gate first: while a scripted pause runs, the camera holds still.
// Otherwise snap the camera to the player and keep the view centre inside the zone.
function followCamera(cam: WorldCamera, player: Point, zone: ZoneBounds, view: View, paused: boolean): void {
  if (paused) return;
  const halfW = view.widthPx / 2;
  const halfH = view.heightPx / 2;
  cam.x = Math.min(Math.max(halfW, player.x), zone.widthPx - halfW);
  cam.y = Math.min(Math.max(halfH, player.y), zone.heightPx - halfH);
}

// Wheel zoom: ignored while paused, otherwise step and clamp into the range.
function wheelZoom(cam: WorldCamera, wheelY: number, paused: boolean): void {
  if (paused) return;
  cam.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, cam.zoom + wheelY * ZOOM_PER_WHEEL_UNIT));
}
export {}
