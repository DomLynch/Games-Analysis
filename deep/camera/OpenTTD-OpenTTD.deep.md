# OpenTTD-OpenTTD (camera, cell 14)

Donor: /mnt/frankendom-donors/OpenTTD-OpenTTD/src/viewport.cpp | Licence: GPL-2.0-only (per viewport.cpp header: version 2) | C++ | symbol UpdateViewportPosition / ClampSmoothScroll

Symbol check (opened on the VPS, 2026-10-09): ClampViewportToMap 1931, ClampSmoothScroll 1963, UpdateViewportPosition 1991.

## 1. Mechanism
- UpdateViewportPosition(window, delta_ms) runs per window each frame, given the elapsed milliseconds.
- If the viewport follows a vehicle (1995-2001), it snaps to the vehicle's moving front, projected to screen coordinates by MapXYZToViewport (not read), with no smoothing and no ClampViewportToMap call. It writes scrollpos, not the destination.
- Otherwise the destination scroll position is first clamped to the map. The gap to the destination is then closed. With smooth scroll on, ClampSmoothScroll decides the step on the larger axis: a fixed fraction (0.75) of the remaining gap is kept per 30 ms, so the step is the gap minus that kept share, with the kept share raised to the elapsed time over 30 ms. The step is also capped at Map::ScaleBySize1D(16 x PIXELS_PER_TILE x delta_ms / 30), where PIXELS_PER_TILE = TILE_PIXELS (32, tile_type.h:17) x 2 x ZOOM_BASE (1 << ZoomLevel::Normal, value not read), and ScaleBySize1D (map_func.h:344) scales by map circumference relative to a 256x256 map. The major axis is x only when abs(dx) > abs(dy) (ties go to y). The smaller axis moves in the same ratio, so motion stays on the straight line to the destination. A step is never zero, so the view always moves.
- Without smooth scroll the view jumps to the destination.
- Stuck guard: if the step leaves the view where it was (the view is held against a border) while the gap is non-zero, the view is teleported to the destination.
- The position is clamped to the map again (2034, even when there was no gap) and written to the window with SetViewportPosition (not read). The overlay is rebuilt when the step landed exactly on the destination (the flag is computed at 2030, before the clamp and teleport). The destination clamp writes back into dest_scrollpos (it is an in/out clamp).
- Inputs: destination, current position, follow target, elapsed ms, smooth flag, map size. Output: scroll position. Runs per window per frame.

## 2. Key functions
- ClampSmoothScroll (OpenTTD) | /mnt/frankendom-donors/OpenTTD-OpenTTD/src/viewport.cpp | 1963-1984 | per-axis smooth step: 0.75 kept per 30 ms, 16-tile cap per 30 ms, minor axis in ratio.
- UpdateViewportPosition (OpenTTD) | /mnt/frankendom-donors/OpenTTD-OpenTTD/src/viewport.cpp | 1991-2046 | follow-vehicle snap, or destination clamp, smooth step, stuck teleport, write-back.
- ClampViewportToMap (OpenTTD) | /mnt/frankendom-donors/OpenTTD-OpenTTD/src/viewport.cpp | 1931-1949 | if the viewport centre is outside the map, moves the scroll point to the nearest in-map location (InverseRemapCoords2 with clamp flag, RemapCoords2 back; those two are not read).

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Time-based exponential approach: keep a fixed share of the gap per fixed period, scaled by elapsed time | keep share 0.75 per 30 ms (theirs) |
| Per-frame speed cap, so a far target does not snap | 16 tiles per 30 ms (theirs) |
| Minor axis follows the major axis ratio: straight-line motion | none (algorithm) |
| Never a zero step while a gap exists | none (algorithm) |
| Stuck guard: teleport when a border holds the view | none (algorithm) |
| Tile unit for the cap | TILE_PIXELS 32 (tile_type.h:17) x 2 x ZOOM_BASE (ZoomLevel::Normal value not read), then map-size scaling (theirs) |

## 4. TypeScript sketch
simplified: the sketch omits the follow-vehicle branch, the in/out write-back of the clamped destination, the clamp of the position when there is no gap, integer truncation (donor uses int64 delta_left and int math), the map-size scaling of the cap (TILE_UNITS is a placeholder), and the overlay rebuild. The stuck test compares the clamped position to the position before the step, as in the donor.
```ts
// Licence: GPL-2.0-only (OpenTTD-OpenTTD). CLEAN-ROOM: written from the mechanism, no donor lines.
type Pt = { x: number; y: number };
const PERIOD_MS = 30;          // timing period (theirs)
const KEEP = 0.75;             // share of the gap kept per period (theirs)
const MAX_TILES = 16;          // per-period cap in tiles (theirs)
const TILE_UNITS = 1;          // placeholder: donor uses 32 * 2 * ZOOM_BASE units per tile and a map-size scale

// Step the gap on the major axis, with the minor axis in the same ratio.
function smoothStep(dx: number, dy: number, dtMs: number): Pt {
  const xMajor = Math.abs(dx) > Math.abs(dy);   // donor: ties go to y
  const hi = xMajor ? dx : dy, lo = xMajor ? dy : dx;
  const cap = MAX_TILES * TILE_UNITS * (dtMs / PERIOD_MS);
  let stepHi = Math.max(-cap, Math.min(cap, hi - hi * Math.pow(KEEP, dtMs / PERIOD_MS)));
  if (stepHi === 0) stepHi = Math.sign(hi);                    // always move while a gap exists
  const stepLo = lo * (stepHi / hi);
  return xMajor ? { x: stepHi, y: stepLo } : { x: stepLo, y: stepHi };
}

function updateScroll(pos: Pt, dest: Pt, dtMs: number, clampToMap: (p: Pt) => Pt, smooth: boolean): Pt {
  const d = clampToMap(dest);
  const dx = d.x - pos.x, dy = d.y - pos.y;
  if (dx === 0 && dy === 0) return pos;
  let next: Pt = d;
  if (smooth) {
    const s = smoothStep(dx, dy, dtMs);
    next = { x: pos.x + s.x, y: pos.y + s.y };
  }
  next = clampToMap(next);
  if (next.x === pos.x && next.y === pos.y) next = d;          // stuck against a border: teleport
  return next;
}
```

## 5. Lands in
- Frankendom target: src/fight/camera.ts (new module, smooth-follow step; today: src/camera* (moving), slice K4). The vehicle-snap branch has no Frankendom equivalent.
- Parity row: 11 (fight camera, camera kick, standoff).
- Reuse tag: rewrite-from-idea (GPL-2.0-only)
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks
- Tile-based isometric map and a per-window overlay; the tile units do not transfer directly.
- Follow-vehicle mode snaps without smoothing, so do not copy that branch into a fight camera.
- The step is per axis in screen units, with a map-size scale factor. Frankendom needs its own unit and dt handling.
- The stuck-teleport rule can cut across geometry; check it against Frankendom's walls before use.
- Conflict check: none. Camera reads engine state and does not change it.
