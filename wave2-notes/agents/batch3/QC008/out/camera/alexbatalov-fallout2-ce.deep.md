# alexbatalov-fallout2-ce (camera, cell 14)

Donor: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/tile.cc` | Licence: Sustainable Use License 1.0 (as read, `/mnt/frankendom-donors/alexbatalov-fallout2-ce/LICENSE.md`: non-commercial and internal use only; not MIT/Apache/BSD, so clean-room, shape only) | C++ | symbols `tileSetCenter`, `_tile_scroll_to`, `_tile_make_line`, `_obj_scroll_blocking_at`, `mapScroll`

Checked: camera_scope = world camera (the 2D isometric world view; a pure view-centre camera with no third-person follow, so the transfer is to the rule set, not the maths). Confidence: high on the code paths (all numbers receipted, 73 receipts with the verifier passing); medium on the transfer, because the donor is tile-based 2D. Read end to end: `tileSetCenter` (537-602), `_tile_scroll_to` (1947-1980), `_obj_scroll_blocking_at` (2559-2581). Read in part: the line walk `_tile_make_line` (1835-1940; its tail after the two branches not read) and `mapScroll` (603-665; the buffer-copy code not read in full). Callers opened: `game.cc` 508-520, 728-750, 925-945; `game_mouse.cc` 2380-2410; `map.cc` 1258-1280; `object.cc` 1478-1494 and 3255-3300 (the last one only in part). Callers found by grep only (not opened): `game_dialog.cc` (`_tile_scroll_to` at 794-958), `interpreter_extra.cc` (512-2046), `mapper/map_func.cc` 49, `object.cc` 3696. Not read: the window drawing that shifts the buffer in `mapScroll` after the centre change, and the `_tile_offx` setup details beyond the lines receipted.

## 1. Mechanism

- The view is a single centre tile (`gCenterTile`). Everything on screen is drawn around it. The camera moves by changing that tile. There is no follow of the player during walking: in the callers I opened, the centre moves only on player input (arrow keys 933-942, wheel 514, mouse edge scroll 2404), on the Home key (744-746), on dialogue focus (`_tile_scroll_to` at `game_dialog.cc` 794-958, found by grep), on script calls and on map load (`map.cc` 1272). I found no per-step follow of the dude during walking.
- Order of steps in `tileSetCenter(tile, flags)` (537): (a) reject an invalid tile (`tileIsValid`, return -1). (b) Unless the IGNORE flag (0x02) is set (543), run two gates. Leash (544-558): compute the screen position of the candidate tile and of the dude (`tileToScreenXY`), then `dx = |dude.x - cand.x|`, `dy = |dude.y - cand.y|`. If the candidate is farther from the dude than the current centre on an axis (`dx > abs(dudeScreenX - _tile_offx)` at 556, or the same test on y), and `dx >= 480 || dy >= 400` (558), refuse (-1). Scroll blocker (565): if `_obj_scroll_blocking_at(tile, elevation)` returns 0, refuse. (c) Map border: if the tile is outside the border box (575), refuse. (d) Commit: compute the window offsets for the centre tile (`_tile_offx`, `_tile_offy` and the square offsets) and set `gCenterTile = tile` (600). Return 0.
- Scroll blocker test (`object.cc` 2559-2581): walk the object list for the tile; it is blocked if an object at the same elevation has the scroll-blocker object id `0x500000C` (2572). That object is placed per map, so the set of blockers is map data.
- `mapScroll(dx, dy)` (603): throttle first: if less than 33 ms have passed since the last accepted call (605), return -2 and do nothing; otherwise set the timestamp (609). Step: `screenDx = dx * 32`, `screenDy = dy * 24` (611-612). New centre = the tile under (current centre screen point + step + (16, 8)) (`tileFromScreenXY`). If `tileSetCenter(newCenterTile, 0)` refuses (631), return -1. Otherwise the window buffer is shifted and only the new strip is redrawn (not read in full).
- `_tile_scroll_to(tile, flags)` (1947): if the target is the current centre, return -1. Build the path with `_tile_make_line(gCenterTile, tile, v9, 200)` (1956), a screen-space DDA from the centre to the target that yields the tiles crossed, with duplicates dropped and the target appended. Step through the path from index 1, calling `tileSetCenter(v9[index], 0)` (1963) with the checks on; stop at the first refusal (break). Flag 0x01 is all-or-nothing (1969-1971): if the walk did not reach the end, call `tileSetCenter(oldCenterTile, 0)` and return -1. Flag 0x02 refreshes the window (1976). So the camera walks the line one tile at a time, each tile checked, and stops at the last clear tile (or reverts). It does not jump, and it has no time-based easing.
- Time: `mapScroll` is wall-clock throttled (33 ms, about 30 steps per second max). `_tile_scroll_to` has no timer: it walks the whole path in one call (one frame), so the camera jumps for the Home key and dialogue focus.

## 2. Key functions

- `tileSetCenter`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/tile.cc` 537-602. Gates at 543-575; commit at 600.
- `_tile_scroll_to`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/tile.cc` 1947-1980. Path walk at 1956-1966; all-or-nothing revert at 1969-1972; refresh at 1976.
- `_tile_make_line`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/tile.cc` 1835-1935 (the start and both branches read; the tail after the branches not read).
- `_obj_scroll_blocking_at`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/object.cc` 2559-2581. Scroll-blocker id test at 2572.
- `mapScroll`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/map.cc` 603-665. Throttle 605-609; step 611-612; check 631.
- Flags: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/tile.h` 9-10.
- Defaults: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/tile.cc` 75 and 78 (both blocking and limiting are on by default).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Camera may not pan farther from the player than a box around him; panning back toward him is always allowed | Box 480 px wide, 400 px tall (theirs, `tile.cc` 558) |
| Step-walk along a line, stop at the first refused step, optionally revert all-or-nothing | Flag 0x01 (theirs, 1969); path capacity 200 tiles (1956) |
| Each step is checked against blockers (scroll blockers stop the camera) | Scroll-blocker object id 0x500000C (theirs, `object.cc` 2572); enabled by default (75) |
| Pan throttle, independent of frame rate | 33 ms minimum between pans (theirs, `map.cc` 605) |
| Pan step size | 32 px horizontal, 24 px vertical (theirs, `map.cc` 611-612) |
| Map border refusal | Border box (`tile.cc` 575); values not read |

## 4. TypeScript sketch

simplified: the donor works on hex/iso tiles with screen-space tests and a line made of tiles. The sketch works on screen points and takes the path as given (no line builder), keeps the leash test with the donor's comparison (a step is refused only when it grows the separation on an axis and reaches the box), keeps the blocker callback, keeps the throttle and the all-or-nothing revert. It omits: the isometric tile maths and window offsets, the border box, the IGNORE flag, the buffer shift in `mapScroll`, the mapper-only snap, dialogue focus, and the duplicate-tile removal in `_tile_make_line`. Blockers in the donor are objects on the map, so the sketch's callback stands for that.

```ts
// Licence: Sustainable Use License 1.0 (donor, non-commercial limits). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Pt { x: number; y: number; }            // screen px (the donor works in tiles; this uses screen px)
interface Leash { boxX: number; boxY: number; }   // 480 and 400 px in the donor

const SCROLL_MIN_MS = 33;  // one pan step at most every 33 ms (wall clock)

// Pan throttle: returns the new last-step time if a step is allowed now, otherwise null.
function panAllowed(nowMs: number, lastMs: number): number | null {
  return nowMs - lastMs < SCROLL_MIN_MS ? null : nowMs;
}

// One camera step. Refused if it pans farther from the player on an axis and reaches the leash box,
// or if the step lands on a scroll blocker.
function canStep(next: Pt, cur: Pt, dude: Pt, leash: Leash, blocked: (p: Pt) => boolean): boolean {
  const dx = Math.abs(dude.x - next.x), dy = Math.abs(dude.y - next.y);
  const curDx = Math.abs(dude.x - cur.x), curDy = Math.abs(dude.y - cur.y);
  if ((dx > curDx || dy > curDy) && (dx >= leash.boxX || dy >= leash.boxY)) return false;
  return !blocked(next);
}

// Walk the camera centre along a precomputed path, one point per step; stop at the first refused step.
// revertOnFail = the donor's all-or-nothing flag: a partial walk returns to the start.
function scrollAlong(path: Pt[], dude: Pt, leash: Leash, blocked: (p: Pt) => boolean, revertOnFail: boolean): Pt {
  const start = path[0];
  let cur = start;
  for (let i = 1; i < path.length; i++) {
    if (!canStep(path[i], cur, dude, leash, blocked)) return revertOnFail ? start : cur;
    cur = path[i];
  }
  return cur;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/qc008_f2-camera.ts` (block plus `export {}`): passed.

## 5. Lands in

- TARGET `src/fight/camera.ts` (client only; the engine never reads it). Parity-checklist row 11 (fight camera). The donor's rule is for a view centre, not a third-person follow, so this lands as the wall and blocker check that a third-person camera needs, not as the camera itself.
- Reuse tag: adapt-idea (Sustainable Use License: clean-room, shape only; no code reused)
- Brief rule served: camera is client-only (engine never reads it); blockers are map objects, so they are zone data.

Tunable values: leash box (px), pan throttle (ms), pan step (px). Zone data: scroll blockers per map.

## 6. Gaps and risks

- Licence: Sustainable Use License 1.0 is not an open-source licence and limits use to internal or non-commercial purposes. Only the shape of the rule may be used. The sketch is written from the mechanism and copies nothing.
- 2D, tile-based: the leash box is in screen pixels of an isometric view, and the blocker test is per tile. A third-person camera needs a 3D test (a ray or sphere cast from the target to the wanted camera position, stepped in fixed fractions) and a 3D box or leash around the player. Only the walk-and-stop and revert shape transfers.
- No follow: the donor camera does not track the player while he walks. Frankendom's world camera needs its own follow and lag. Do not take the donor as a follow camera.
- No smooth motion: `_tile_scroll_to` walks the whole path in one call, so the Home key and dialogue focus jump. The only time gate is the 33 ms pan throttle. Frankendom should not copy the jump for a world camera.
- The leash compares with the separation to the current centre, so a camera already outside the box can still pan back toward the dude; a script can also move the centre freely (IGNORE flag). Frankendom must decide which call paths skip the leash and test them.
- Revert is all-or-nothing and only on flag 0x01; the other path stops at the last clear tile. Pick one rule for the world camera and test it.
- Not read: the buffer shift after a pan (`map.cc` 630-665 tail), `_tile_make_line` tail, the `_tile_offx` setup details, the callers in `interpreter_extra.cc` and `game_dialog.cc` (grep only), and `object.cc` 3255-3300 in full.

Best transferable idea: Let the camera walk toward its wanted position one step at a time, refuse any step that both pans farther from the player past a leash box or lands on a blocker, and stop at the last clear step (or revert the whole move when the caller asks), so a third-person camera pulls in at walls instead of clipping.
Decision (proposed): adapt - the donor's tile maths and jumps do not fit, but the step-walk with a leash box and blocker refusal is the pull-in rule the world camera lacks; implement it in 3D with a cast per step.
Acceptance: Client test: a third-person camera moving toward a wanted position behind a wall stops at the last clear step and never ends inside geometry; it never ends farther than the leash from the player; with the revert flag set, a blocked move returns to where it started.

Reuse tag: adapt-idea (Sustainable Use License: clean-room, shape only)
Brief rule served: camera is client-only (engine never reads it); blockers are map data.
