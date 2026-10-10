// Licence of donor: GPL-2.0-or-later. clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Cam1D {
  view: number;        // current view position on one axis, in whole tiles
  from: number;        // view position before the last tile change
  glideStartMs: number;
  glideMs: number;     // 0 = no glide
}

const DEAD_TILES = 2;   // width of the free box inside the view
const SNAP_TILES = 4;   // a change of this many tiles or more is not glided

// Once per actor step, BEFORE the actor moves. `inset` is where the box starts inside the view.
function followStep(cam: Cam1D, destTile: number, inset: number, nowMs: number, stepMs: number): void {
  const boxStart = cam.view + inset;
  let shift = 0;
  if (destTile < boxStart) shift = -1;                     // left of the box: one tile left
  else if (destTile >= boxStart + DEAD_TILES) shift = 1;   // right of the box: one tile right
  if (shift === 0) return;                                 // inside the box: camera does not move

  const newView = cam.view + shift;
  if (Math.abs(newView - cam.view) < SNAP_TILES) {
    cam.from = cam.view;
    cam.glideStartMs = nowMs;
    cam.glideMs = stepMs * 0.5;                            // illustrative glide length (tunable)
  } else {
    cam.from = newView;                                    // large jump: no glide
    cam.glideMs = 0;
  }
  cam.view = newView;
}

// Position used for drawing: blends from the previous view to the current one.
function displayedView(cam: Cam1D, nowMs: number): number {
  if (cam.glideMs <= 0) return cam.view;
  const f = Math.min(1, Math.max(0, (nowMs - cam.glideStartMs) / cam.glideMs));
  return cam.view + (cam.from - cam.view) * (1 - f);
}

// When the hero has stopped, keep the glide where it is but finish it in settleMs.
function settleOnStop(cam: Cam1D, nowMs: number, settleMs: number): void {
  if (cam.glideMs <= 0 || settleMs >= cam.glideMs) return;
  const f = Math.min(1, Math.max(0, (nowMs - cam.glideStartMs) / cam.glideMs));
  cam.glideMs = settleMs;
  cam.glideStartMs = nowMs - f * settleMs;                 // same factor now, faster rate from here
}

// Earthquake-style shake: `passes` offsets in -4..4 px, one every 100 ms, first after 10 ms.
function shakeSchedule(startMs: number, passes: number, rnd: () => number): { atMs: number; dx: number; dy: number }[] {
  const out: { atMs: number; dx: number; dy: number }[] = [];
  for (let i = 0; i < passes; i++) {
    out.push({
      atMs: startMs + 10 + i * 100,
      dx: Math.floor(rnd() * 9) - 4,
      dy: Math.floor(rnd() * 9) - 4,
    });
  }
  return out;
}

// Smoke test values
const c: Cam1D = { view: 10, from: 10, glideStartMs: 0, glideMs: 0 };
followStep(c, 10 + 5, 4, 1000, 200);   // dest 15, box starts at 14, box is 14..15: inside, no move
followStep(c, 10 + 6, 4, 1000, 200);   // dest 16 >= 16: right shift
const shown = displayedView(c, 1100);
settleOnStop(c, 1100, 50);
const sched = shakeSchedule(0, 2, () => 0.5);
export { shown, sched };
