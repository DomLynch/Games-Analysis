# exult-exult (camera, cell 14)

Donor: `/mnt/frankendom-donors/exult-exult/gamewin.cc` (with `gamerend.cc`, `exult.cc`, `effects.cc`) | Licence: GPL-2.0-or-later (per `gamewin.cc` header: "either version 2 of the License, or (at your option) any later version"; `COPYING` is the GPLv2 text) | C++ | symbol `Game_window::scroll_if_needed`

Checked: Read in full: `gamewin.cc` 1085-1190 (set_scrolls, center_view, set_camera_actor, scroll_if_needed) and 1636-1668 (view_right); `gamerend.cc` 427-514 (lerp_reset, paint_lerped); `exult.cc` 1335-1520 (main loop and glide driver; the `Delay()` body is not read); `effects.cc` 1826-1870 (Earthquake) and `effects.h` 398-408. Read only the call or entry lines: `usecode/intrinsics.cc` 2072 (the intrinsic body around it is not read), `actors.cc` 4966 (its enclosing function is not read), `monsters.cc` 412 and `actors.cc` 5280 (the Monster and Npc step bodies are not read). Not read: `view_up` and `view_down` bodies, `Actor::get_frame_time`, `is_moving`. This is a 2D tile camera (isometric map, one tile per shift). Camera type: world camera (the open-zone follow camera; this donor has no pit). Confidence: high on the follow and glide order and the numbers; medium on how much of it a 3D camera can keep. Donor uses the camera as a 2D scroll, so the transfer is the rules, not the code.

## 1. Mechanism

- The camera is a tile position: the view's top-left tile (`scrolltx`, `scrollty`). Its centre is set by `set_scrolls(Tile_coord)`, which places the given tile at half the view width and height (gamewin.cc 1126-1128). Camera actor: `camera_actor` is the main actor by default (readnpcs.cc 56); the usecode `set_camera` intrinsic changes it (intrinsics.cc 3277 calls `set_camera_actor`), and `set_camera_actor` re-centres the view on the new actor (gamewin.cc 1152-1154).
- Follow rule (a dead box, checked once per actor step): the view has a 2x2-tile box at its centre (gamewin.cc 1090-1093). Before an actor moves onto tile `t`, `Main_actor::step` calls `scroll_if_needed(this, t)` (actors.cc 4729), and it does so before the "Move it" step. The overload only acts when the actor is the camera actor (gamewin.h 815). Inside `scroll_if_needed`, the tile is first corrected back by half a tile per lift unit (gamewin.cc 1172-1173). Then, on the x axis, the view shifts one tile left if the tile is before the box (1175-1176) or one tile right if it is at or past the box end (1178-1179). The y axis is tested separately with the same rule (1182-1187), so both axes can shift in one call. The view never moves while the actor stays inside the box.
- Glide (smooth scrolling, OFF by default: `smooth_scrolling` defaults to 0, gamewin.cc 387). When the scroll position changes, `lerp_reset` keeps the previous and the current scroll (gamerend.cc 427-432) and the main loop stamps `last_repaint` with the current tick (exult.cc 1457). The tick is `SDL_GetTicks()` read once per loop pass (exult.cc 1365), and the loop waits in `Delay()` (exult.cc 1352, body not read). Glide duration `mswait` = actor frame time x percent / 100 (exult.cc 1464); if that is zero, `std_delay` x percent / 100 (1472). `std_delay` = 1000 / fps, with fps defaulting to 5, so 200 ms (gamewin.cc 620-624). Each pass: factor = (ticks - last_repaint) x 0x10000 / mswait (exult.cc 1499), painted only while ticks < last_repaint + 2 x mswait (1497). `paint_lerped` clamps the factor to 0..0x10000 (gamerend.cc 434-438) and blends the drawn scroll from the old position to the new one (472-473), then returns the sub-tile pixel offset for drawing shapes (505).
- Snap rules: the glide only runs when the scroll changed by fewer than 4 tiles on each axis (gamerend.cc 466). Otherwise the pixel offset is zeroed and the view jumps (else branch, 505). Slow walk: if the camera actor's frame time x 2 >= 3 x std_delay (exult.cc 1450), the factor is forced to 0x10000, so there is no glide.
- Stop-settle: when the camera actor stops (`!is_moving()`, exult.cc 1477) and a glide is still running, it computes the shorter stop duration `stopwait` = std_delay x percent / 100 (1478). If that is shorter than the current glide, it keeps the current factor and changes the rate from here on (1480-1486), once per stop (`lerp_stop_anchored`, set at 1493, cleared when a real step happens).
- Shake (Earthquake, `effects.cc` 1829-1870): a usecode call creates it with a pass count `len` and first pass 10 ms later (intrinsics.cc 2072). Each pass draws a random offset dx, dy = rand() % 9 - 4 (so -4..+4 px per axis, effects.cc 1846-1847), copies the viewport by that offset, shows it, and copies it back (1862, 1866). It re-queues itself 100 ms later (1868) while `++i < len` (1867). A second caller uses len 2 (actors.cc 4966, context not read).

## 2. Key functions

- `Game_window::scroll_if_needed(Tile_coord)`: `/mnt/frankendom-donors/exult-exult/gamewin.cc` 1165-1190. The dead-box follow rule: one-tile shifts per axis.
- `Game_window::set_scrolls(Tile_coord)` and `center_view`: `/mnt/frankendom-donors/exult-exult/gamewin.cc` 1122-1139. Centres the view on a tile (snap, no glide).
- `Game_window::set_camera_actor`: `/mnt/frankendom-donors/exult-exult/gamewin.cc` 1145-1156. Switches the camera actor and re-centres.
- `Game_window::view_right`: `/mnt/frankendom-donors/exult-exult/gamewin.cc` 1641-1664. One-tile scroll (the body that `scroll_if_needed` calls).
- `Game_window::lerp_reset` and `paint_lerped`: `/mnt/frankendom-donors/exult-exult/gamerend.cc` 427-514. The glide: stores old and new scroll, blends by factor, snap at 4 tiles, zero offset outside.
- Main loop glide driver: `/mnt/frankendom-donors/exult-exult/exult.cc` 1443-1510. Tick, glide duration, slow-walk exemption, stop-settle, window of 2 x duration.
- `Earthquake::handle_event`: `/mnt/frankendom-donors/exult-exult/effects.cc` 1829-1870. Screen shake: random -4..4 px offset, 100 ms passes.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Dead box: camera holds still while the target is inside a centred box; it shifts one step when the target leaves | Box 2x2 tiles (theirs, gamewin.cc 1090-1093) |
| Look-ahead: the test uses the destination tile, before the move | Lift correction 1/2 tile per lift unit (theirs, gamewin.cc 1172) |
| Glide from the old view to the new one over a duration tied to the step time | Frame delay 1000 / fps ms, fps default 5 = 200 ms (theirs, gamewin.cc 620-624) |
| Glide duration = step time x a percentage; off at 0 | Percentage default 0 = off (theirs, gamewin.cc 387); window 2 x duration (exult.cc 1497) |
| Snap instead of glide when the jump is large | 4 tiles (theirs, gamerend.cc 466) |
| Slow-walk exemption: glide off when the step is slow | Frame time x 2 >= 3 x std_delay (theirs, exult.cc 1450) |
| Stop-settle: shorten a running glide once the target stops | std_delay x percent / 100 (theirs, exult.cc 1478) |
| Screen shake: random offset per pass, passes counted | Offset -4..+4 px (theirs, effects.cc 1846); pass interval 100 ms (1868); first pass 10 ms (intrinsics.cc 2072) |

## 4. TypeScript sketch

simplified: the sketch follows the donor order for one axis: the destination box test before the step, one tile shift, a glide from the old view to the new one, a snap at 4 or more tiles, a one-shot stop-settle, and a shake schedule of 100 ms passes. It omits: the second axis (both axes are independent in the donor), the lift correction, the map wrap and the tile-wrap compare, the slow-walk exemption, the anchor flag on the stop-settle (the sketch allows repeats), the pixel offset arithmetic, the barge and party-member offsets, the gump check, the dirty-rectangle blits and the sound effect. The glide length is an illustrative half step (`stepMs * 0.5`), not the donor's percentage. Values are floats here, not integer 0x10000 fractions. The shake returns offsets with no unit.

```ts
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
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (the file is `/tmp/qc011-exult-follow-camera.ts` there, with a copy at `work/exult-follow-camera.ts`).

## 5. Lands in

- TARGET `src/fight/camera.ts` (new, client only; the camera is never read by the engine). Parity-checklist row 11 (fight camera). The checklist has no world-camera row, so this lands under row 11 as a sub-line until Lead rules on a world-camera row.
- Dead box, look-ahead, glide and stop-settle go in the camera's follow step, which the client calls from its render loop, fed by the hero's position from server snapshots (not from the engine).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 11 (fight camera is client-only; the engine never reads it); camera is a client concern under rule 1 (one engine, two clients)

## 6. Gaps and risks

- This donor is a 2D tile scroll: no shoulder offset, no pitch or yaw limits, no zoom, no collision, no lock-on, no framing of several targets. Those parts of the owner's list are not in this donor and need another donor or our own design.
- What transfers to a 3D third-person follow camera: the dead box (in screen space, as a fraction of the viewport, since tile units do not exist in 3D), the look-ahead on the destination, the glide with a snap above a jump threshold, the stop-settle, and the shake as an offset on the camera transform.
- What does not transfer: tile-quantised pixel offsets, the wrap-around map math, isometric projection, and the chunk cache (`emulate_cache`, gamewin.cc 1146-1151).
- Glide clock: the glide uses the wall clock (SDL ticks) and the actor's frame time. In Frankendom the hero's step is fixed-step on the server (post-K item 3), so the client glide duration must come from the snapshot step time, not from the render clock, or it will stutter when snapshots arrive late. The donor does not face this because it is single-process.
- Smooth scrolling is off by default in the donor (gamewin.cc 387). Do not assume the glide is the default feel; the one-tile snap is the donor's default.
- Shake is a screen-space blit (effects.cc 1862-1866). A 3D shake should offset the camera transform for a few frames. It must never change hit detection, since the camera is client only and kills are server-verified.
- Values to expose as data (camera tuning, client-side): dead box size, snap distance, glide percentage, shake offset and pass count. The donor keeps them as engine constants except the shake pass count, which comes from the usecode call (zone data in our terms).
- Donor is GPL-2.0-or-later: clean-room only. The sketch was written from the described mechanism.
- Not read: `view_up` and `view_down` bodies, `Delay()`, `Actor::get_frame_time`, `is_moving`, the bodies of the Npc and Monster step functions (only their scroll call lines were read), the usecode intrinsic around `intrinsics.cc` 2072, and the enclosing function of `actors.cc` 4966.

Best transferable idea: keep the world camera still while the hero stays inside a centred dead box, move it one step only when the hero leaves that box, and glide the move without crossing a jump larger than a few tiles.

Decision (proposed): adapt - take the dead box, the look-ahead, the glide with a snap threshold and the stop-settle for the world camera; reject the tile-pixel scroll and the map wrap, which do not exist in a 3D camera.

Acceptance: the camera holds still while the hero moves inside the centre box, follows within one step time after the hero leaves it with no overshoot, and snaps (no glide) for a jump at or above the snap distance; a client test asserts the position is unchanged for moves inside the box and reaches the target within one glide length.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 11 (fight camera; client-only); the engine never reads the camera
