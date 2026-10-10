# alexbatalov-fallout1-ce (camera, cell 14)

Donor: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/tile.cc` (camera centre and scroll: `tile_set_center`, `tile_scroll_to`), with `map_scroll` in `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/map.cc` and the screen-edge pointer in `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/gmouse.cc` | Licence: Sustainable Use License 1.0 (donor `LICENSE.md`; use limited to internal business or non-commercial or personal use) | C++ | symbol `tile_set_center`

Checked: camera_scope = world camera (open isometric map; the donor's camera is a 2D tile-grid centre, see section 6 for what transfers). Read in full: `tile_set_center` (tile.cc 496-570), `tile_scroll_to` (1943-1978), `tile_make_line` (1831-1940), `gmouse_check_scrolling` (gmouse.cc 2299-2380). Read in part: `map_scroll` (map.cc 713-753; the redraw after 753 was not read). Also opened: game.cc 440-458, 679-690, 866-886; intextra.cc 540-570 and 2644-2656; gdialog.cc (callers only); object.cc 1466-1476, 3038-3046, 3440-3457; map.cc 1282-1298; plib/gnw/input.cc 632-635 (`get_time` is `SDL_GetTicks`). Every caller of `tile_set_center`, `tile_scroll_to` and `map_scroll` in the donor was listed with grep (all .cc). Confidence: high on the gating order and on the event list. NOT read: the body of `obj_scroll_blocking_at`, `tile_set_border` and `tile_update_bounds_*`, the body of `elapsed_time`, the redraw part of `map_scroll`.

Best transferable idea: a camera can move toward a wanted point by sampling the line to it, stopping before the first sample that a leash or a blocker refuses, and never moving farther from the hero once it is beyond a leash box, while still allowing moves back toward the hero.
Decision (proposed): adapt - take the leash rule (free to return, refused outward past a box around the hero) and the sample-and-stop walk (optional all-or-nothing) as the shape of the world camera's wall pull-in and hero-leash; do not take the 2D tile grid, the screen-pixel numbers, or the object-flag blocker, and do not copy the donor's event-only recentring (the donor camera does not follow the hero per step).
Acceptance: in a world zone with a wall between the wanted camera spot and the hero, a unit test on a fixture wall asserts the camera stops at the last clear sample on the line, and a second test asserts that a step beyond the leash box never moves the camera farther from the hero, while a step back toward the hero is accepted.

## 1. Mechanism

- The camera is the centre tile (`tile_center_tile`, tile.cc 559). Every change of the centre goes through `tile_set_center` (496). It accepts the new centre or refuses it (returns -1), and the caller keeps the old centre.
- Gates in `tile_set_center`, in order (the first two are skipped when the caller passes `TILE_SET_CENTER_FLAG_IGNORE_SCROLL_RESTRICTIONS`, line 502):
  (a) Leash, only when `scroll_limiting_on` (503). Take dx and dy, the hero's screen distance to the new centre (506-513). If the new centre is farther from the hero than the current view on either axis (515-516), and dx is at least 480 or dy is at least 400 (517), refuse. So the camera may always move back toward the hero, and may move outward only up to a box of 480 by 400 around the hero.
  (b) Scroll blocking, only when `scroll_blocking_on` (523). Refuse a centre tile where `obj_scroll_blocking_at` returns 0 (524-526; body not read).
  (c) Border, only when `borderInitialized` (533-537). Refuse a centre outside the border rectangle.
  (d) Accept: store the centre and the offsets (539-559), update bounds (562), and refresh the window if the flag is set (564-567).
- Single pan steps: `map_scroll(dx, dy)` (map.cc 713). First a throttle: if `elapsed_time(map_last_scroll_time)` is under 33, return -2 (715-717). `get_time` is SDL ticks in milliseconds (plib/gnw/input.cc 632-635). Then the new centre is the tile at the current centre plus `dx * 32` and `dy * 24` screen pixels, plus (16, 8) (721-736), and `tile_set_center(new, 0)` is called (741). A refusal returns -1 (742).
- Callers of the pan step: arrow keys (game.cc 873-884), mouse wheel (game.cc 440-455), and the screen-edge pointer (`gmouse_check_scrolling`, gmouse.cc 2299-2369). For the edge pointer, the pointer's position sets direction flags (2307-2321) and a direction (2326-2363). A refused step (-1) changes the cursor to its blocked variant (2369-2377, `cursor += 8`).
- Jumps: `tile_scroll_to(tile, flags)` (tile.cc 1943-1978). It builds the tile line from the current centre to the target (`tile_make_line`, 1831-1940; Bresenham-style over tile-centre screen coordinates, with repeated tiles dropped at 1888). It calls `tile_set_center(step, 0)` on each step in order and stops at the first refusal (1958-1962). Flag 0x01, all or nothing: if the walk did not reach the end of the path, the old centre is restored (1965-1969). Flag 0x02 refreshes the display (1972-1975). The path holds at most 200 tiles (1952).
- When the camera goes to the hero. Not on each hero step: no call was found on a plain move (grep of the three functions across all .cc). The recentring events are: map load (map.cc 1293), the HOME key (game.cc 685 in the mapper, 687 in the game, which uses `tile_scroll_to`), a warning floating message (intextra.cc 2654), a change of elevation in the hero's own move path (object.cc 1400 is the `obj == obj_dude` branch; the centre changes at 1471-1473 only when the elevation differs), loading the hero (object.cc 3454), and dialogue targets (gdialog.cc 704-855, 813). So this camera follows by events and pans otherwise; it does not follow the hero continuously.
- Scripts can switch the leash and the blocking off, centre on an object, then switch them back on (intextra.cc 546-568: disable at 550 and 554, centre at 560, enable at 564 and 568).

## 2. Key functions

- `tile_set_center`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/tile.cc` 496-570. The gate order: leash, blocking, border, accept.
- `tile_scroll_to`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/tile.cc` 1943-1978. Walk the line, stop at the first refusal, optional revert.
- `tile_make_line`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/tile.cc` 1831-1940. The line generator used by the walk.
- `map_scroll`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/map.cc` 713-753. Throttle, one-tile pan step, then `tile_set_center(new, 0)`.
- `gmouse_check_scrolling`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/gmouse.cc` 2299-2380. Edge pointer to direction, then `map_scroll`, then cursor feedback.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Leash box around the hero: refuse an outward move at or beyond the box, always allow a move back | 480 horizontal, 400 vertical (tile.cc 517); screen px in the donor |
| Pan step size | 32 by 24 screen px, plus (16, 8) to the tile centre (map.cc 721-722, 734) |
| Pan throttle, wall clock | 33 ms (map.cc 715) |
| Path length for a jump | 200 tiles (tile.cc 1952), silently cut at the cap (1890-1892) |
| Blocked cursor | `cursor += 8` (gmouse.cc 2374) |
| Revert on incomplete walk | flag 0x01 (tile.cc 1965) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (leash check, then blocker check, per sample; stop at the first refusal; optional revert). It replaces the donor's Bresenham tile-centre line with a straight linear sampler, and it compares the leash against the current focus, not the donor's view offset (tile.cc 515-516 compares the hero's screen X with `tile_offx`; I did not confirm those are the same space). It omits the border check, the elevation, the scroll-blocking object lookup (a callback here), the window refresh, and the bounds update. It also adds a check the donor does not make: that the walk reached the target.

```ts
// Licence: Sustainable Use License 1.0 (donor; restricted). Clean-room sketch of the shape only, not a translation of the donor lines.
// clean-room
interface Pt { x: number; y: number; }

const LEASH_X = 480;   // donor leash box, horizontal (donor units: screen px)
const LEASH_Y = 400;   // donor leash box, vertical
const MAX_PATH = 200;  // donor path capacity
const PAN_GAP_MS = 33; // donor pan throttle

// Leash rule: a focus that moves farther from the hero on either axis is refused once it is
// at or beyond the box. Moving back toward the hero is always allowed.
function leashAllows(hero: Pt, cur: Pt, next: Pt): boolean {
  const dxNext = Math.abs(hero.x - next.x);
  const dyNext = Math.abs(hero.y - next.y);
  const dxCur = Math.abs(hero.x - cur.x);
  const dyCur = Math.abs(hero.y - cur.y);
  const farther = dxNext > dxCur || dyNext > dyCur;
  if (!farther) return true;
  return !(dxNext >= LEASH_X || dyNext >= LEASH_Y);
}

// Sample points along the straight line from `from` (exclusive) to `to` (inclusive), capped.
function lineSamples(from: Pt, to: Pt, cap: number): Pt[] {
  const steps = Math.min(cap, Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y)));
  const out: Pt[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    out.push({ x: Math.round(from.x + (to.x - from.x) * t), y: Math.round(from.y + (to.y - from.y) * t) });
  }
  return out;
}

// Donor tile_scroll_to shape: step from the current focus toward the target one sample at a time,
// stop before the first sample that is blocked or leashed. If allOrNothing and the target was not
// reached, return the start (donor flag 0x01 revert).
export function sweepFocus(start: Pt, target: Pt, hero: Pt, blocked: (p: Pt) => boolean, allOrNothing: boolean): Pt {
  let cur = start;
  const samples = lineSamples(start, target, MAX_PATH);
  for (const p of samples) {
    if (blocked(p) || !leashAllows(hero, cur, p)) break;
    cur = p;
  }
  const reached = cur.x === target.x && cur.y === target.y;
  return allOrNothing && !reached ? start : cur;
}

// Donor pan throttle: a pan step is allowed only when at least PAN_GAP_MS have passed.
export function panAllowed(nowMs: number, lastMs: number): boolean {
  return nowMs - lastMs >= PAN_GAP_MS;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/QC013-fallout-sweep.ts) exits 0 with no output.

## 5. Lands in

- TARGET `src/fight/camera.ts` (client-only world camera; the leash and the sample-and-stop walk are the wall and hero-leash rule). Parity-checklist row 11 (fight camera).
- Reuse tag: rewrite-from-idea (Sustainable Use License 1.0, restricted; clean-room, shape only)
- Brief rule served: 11 (fight camera is client-only; the camera never affects a server verdict); ruling "camera/HUD/sound are client-only".

## 6. Gaps and risks

- Not a follow camera. The donor recentres on the hero only on events (section 1), so it cannot show how to keep the hero in frame during movement. The owner's over-the-shoulder follow has to come from another donor (see the dkfans-keeperfx note, cell 14).
- The blocker is an object flag on a tile (`obj_scroll_blocking_at`, body not read), not wall geometry. The donor gives the stepping shape (sample toward the wanted point, stop at the first blocked sample). A 3D world needs a real wall test (ray or sphere), which this donor does not have.
- The leash box is in screen pixels of a 2D isometric view. 480 and 400 must become world-unit data for each zone, not be copied.
- The leash comparison in the donor uses the hero's screen X against `tile_offx` (tile.cc 515-516), not the current centre's coordinates. The sketch uses the current focus. Unverified that the two are the same space.
- The donor does not check that a walk reached its target. Under flag 0x01 a path cut at the 200-tile cap (1890-1892) counts as success. Frankendom should check arrival explicitly.
- The pan throttle uses wall-clock SDL ticks (map.cc 715, gnw/input.cc 632-635). That makes camera speed depend on the render loop. A world camera should step per fixed turn or use a dt, not a wall-clock gate.
- Scripts can disable the leash and the blocking around an object centre (intextra.cc 546-568), so the camera is not purely client-side state in the donor. In Frankendom the camera stays client-only; the ruling holds.
- Blocked-cursor feedback (gmouse.cc 2374-2377) is a UI detail with no engine effect; it can be adopted as is for the client.
- Licence: Sustainable Use License 1.0 (LICENSE.md line 3, "Version 1.0"; line 15 limits use to "internal business purposes" and non-commercial use). Restricted: clean-room and shape only, no code copied.
- Not read: `obj_scroll_blocking_at`; `tile_set_border` and `tile_update_bounds_*` (the border rule); `elapsed_time`; the redraw part of `map_scroll` after map.cc 753.
