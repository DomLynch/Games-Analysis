# angband-angband (camera, cell 14)

Donor: `/mnt/frankendom-donors/angband-angband/src/ui-output.c` (with `ui-display.c`, `player-calcs.c`, `player-util.c`, `mon-util.c`, `cave.c`) | Licence: dual, per the `ui-output.c` header (lines 10-16): (a) GNU GPL version 2, or (b) the "Angband licence" (copy and distribute for educational, research and not-for-profit purposes with the notice kept) | C | symbol `verify_panel_int`

Checked: No hint file (the cell says INFERRED). Found by grep for `center_player`, `verify_panel` and `modify_panel`. Read in full: `ui-output.c` 521-585 (`panel_should_modify`, `modify_panel`) and 587-699 (`verify_panel_int`, `change_panel`, `verify_panel`, `center_panel`). Read: `ui-display.c` 1404-1420 (centred redraw), 2508-2518 (new level), 2576-2579 (`check_panel`), 2748 (handler registration); `player-calcs.c` 2565-2630 (`update_stuff`, PU_PANEL flush); `player-util.c` 1645-1670 (`disturb`); `mon-util.c` 612-623 (the player branch of a swap, which sets PU_PANEL; the function name is not read); `cave.c` 49-53 (direction tables); `list-options.h` 44 (grep). Other candidates opened or grepped: `ui-target.c`, `ui-knowledge.c`, `ui-command.c`, `main-win.c`, `main-sdl2.c` (grep for `verify_panel` callers only). Not read: the `SCREEN_HGT` and `SCREEN_WID` constants; the map-drawing code that paints cells; the other callers of `verify_panel` in full. Confidence: high on the follow rule, the clamp and the half-screen shift; medium on the event timing (the move-to-flush chain is partly read).

## 1. Mechanism

- The camera is the view offset of a terminal window: `t->offset_y` and `t->offset_x` (`ui-output.c:573-574`). The main window and any overhead-map window with `PW_OVERHEAD` share one rule (`ui-output.c:600-607`).
- The camera is event-driven, not a frame loop. Moving the player sets `PU_PANEL` (`mon-util.c:621`). The update pass (`update_stuff`, `player-calcs.c:2565`) clears the flag and signals `EVENT_PLAYERMOVED` (`player-calcs.c:2626-2628`). `check_panel` is registered for that event (`ui-display.c:2748`) and calls `verify_panel` (`ui-display.c:2576-2579`). `verify_panel` calls `verify_panel_int(OPT(player, center_player))` (`ui-output.c:691-693`). `disturb()` also signals `EVENT_PLAYERMOVED` when it cancels a run (`player-util.c:1657-1666`), so the view is checked again at the end of a run.
- Order of steps, per window, inside `verify_panel_int` (`ui-output.c:600-639`), for each axis:
  (a) the half sizes: `panel_hgt = screen_hgt / 2` and `panel_wid = screen_wid / 2` (615-616);
  (b) centring: if the option is on, the player is not running, and the player is not at the panel's centre, the view moves to put the player at the centre (620-621 for rows, 629-630 for columns);
  (c) otherwise, edge recentring: if the player is less than 3 cells from the top or left edge, or within 3 cells of the bottom or right edge (`py >= wy + screen_hgt - 3`), the view moves to put the player at the centre (624-625; 633-634). The `else if` means the edge test is skipped when the centring branch ran, and both branches recentre, so the result is the same;
  (d) `modify_panel(t, wy, wx)` (638).
- `modify_panel` clamps first: the upper bound `dungeon size - screen size`, then the lower bound 0 (563-568). It stores the offsets and sets the map redraw flag only if the offsets changed (571-580). `panel_should_modify` does the same clamp and compares, without storing (521-540).
- Manual panel shift: `change_panel(dir)` moves the view by half a screen in the direction (`ddy[dir] * screen_hgt / 2`, `ddx[dir] * screen_wid / 2`, 669-670), using the `ddx` and `ddy` tables (`cave.c:49-53`), then calls `modify_panel` (673). It returns whether anything changed.
- The centred redraw does not draw a frame that is not centred yet: if the centred panel still has to move, the function returns before `Term_fresh()` (`ui-display.c:1408-1415`). This is a refresh guard, not part of the camera rule.

## 2. Key functions

- `verify_panel_int` at `/mnt/frankendom-donors/angband-angband/src/ui-output.c` 587-640: the follow rule per axis and the window loop.
- `modify_panel` at `ui-output.c` 553-585: the clamp, the store and the redraw flag.
- `panel_should_modify` at `ui-output.c` 521-540: the same clamp without a store.
- `change_panel` at `ui-output.c` 647-677: the half-screen shift.
- `verify_panel` and `center_panel` at `ui-output.c` 691-699: the option and the forced centre.
- `check_panel` at `/mnt/frankendom-donors/angband-angband/src/ui-display.c` 2576-2579, registered at 2748.
- `update_stuff` at `/mnt/frankendom-donors/angband-angband/src/player-calcs.c` 2565-2630: the PU_PANEL flush at 2626-2629.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-axis dead zone: recentre on the focus only when it comes within a margin of an edge | Margin 3 cells (`ui-output.c:624`, 633) |
| Recentre on the focus: the view offset becomes focus minus half the view | Half the view (`panel_hgt`, `panel_wid`, 615-616); view size constants not read |
| Optional continuous centring, suspended while the focus is moving | Option "Center map continuously" (`list-options.h:44`); suspended by `running` (620, 629) |
| Clamp the view to the world: upper bound world - view, lower bound 0 | World size from `cave->height` and `cave->width` (523-524) |
| Manual step by half a view in 8 directions | Half the view (669-670); direction tables `cave.c:49-53` |

The margin of 3 is in grid cells, not pixels. The camera does not use time at all: the numbers are counts of cells, and the update runs once per move event.

## 4. TypeScript sketch

simplified: the sketch keeps the follow rule per axis (recentre when centred and not moving, or when the focus is within 3 cells of an edge), the clamp in the donor's order (upper bound, then 0), and the half-view shift. It omits the window loop and the overhead flag, the change check and redraw flag (`PR_MAP`), `panel_should_modify`, the event wiring (`PU_PANEL` flush, `EVENT_PLAYERMOVED`, `disturb`), and the centred-redraw refresh guard in `ui-display.c`. It uses `Math.floor` for the half size and `Math.trunc` for the shift, which match the C integer division for the positive sizes used here.

```ts
// Licence: dual, GPL-2.0 or the "Angband licence" (donor, ui-output.c header). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Axis {
  offset: number;   // first world cell shown on this axis
  span: number;     // cells shown on this axis
  world: number;    // world size on this axis
}

export interface Cam { py: number; px: number; }

const MARGIN = 3;   // scroll when the player is this many cells from an edge

// Keep the view inside the world: min first, then max 0 (the donor's order).
function clampAxis(offset: number, world: number, span: number): number {
  return Math.max(0, Math.min(offset, world - span));
}

// One axis: recentre on the player when the player is not centred (option on, not running)
// or has come within MARGIN of an edge. Otherwise the view stays put.
function followAxis(a: Axis, p: number, centered: boolean, running: boolean): number {
  const half = Math.floor(a.span / 2);
  if (centered && !running && p !== a.offset + half) return p - half;
  if (p < a.offset + MARGIN || p >= a.offset + a.span - MARGIN) return p - half;
  return a.offset;
}

// The view that verify_panel would set: follow, then clamp both axes to the world.
export function verifyView(y: Axis, x: Axis, cam: Cam, centered: boolean, running: boolean): { y: number; x: number } {
  const wy = followAxis(y, cam.py, centered, running);
  const wx = followAxis(x, cam.px, centered, running);
  return {
    y: clampAxis(wy, y.world, y.span),
    x: clampAxis(wx, x.world, x.span),
  };
}

// Shift by half a screen in one direction (change_panel): the offset moves, then is clamped.
export function shiftView(y: Axis, x: Axis, dy: number, dx: number): { y: number; x: number } {
  const stepY = Math.trunc((dy * y.span) / 2);
  const stepX = Math.trunc((dx * x.span) / 2);
  return {
    y: clampAxis(y.offset + stepY, y.world, y.span),
    x: clampAxis(x.offset + stepX, x.world, x.span),
  };
}
```

Typecheck: `work/angband-camera.ts` (this block plus `export {};`) passed `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/camera.ts` (proposed new module; the fight camera is client-only, so it holds no game state; not checked against the repo). Parity-checklist row 11 (fight camera).
- Reuse tag: rewrite-from-idea (dual GPL-2.0 / Angband licence; clean-room only)
- Brief rule served: parity row 11 (fight camera), client-only per the ruling; rules 7-9 n/a

Best transferable idea: recentre a view on its focus only when the focus comes within a margin of an edge, and clamp the view to the world bounds.

## 6. Gaps and risks

- No smoothing. The donor moves the offset by whole cells in one step (`ui-output.c:573-574`), and no easing appears in these functions. A fast fight camera needs an easing step in the client; the donor's rule can only supply the target.
- Units are grid cells of the terminal map, not screen pixels, so the 3-cell margin does not carry over as is. Frankendom's fight camera (row 11) should measure the margin in screen space at the 375-pixel phone width.
- The centring is suspended while the player is running (`ui-output.c:620`, 629), but the edge test is not. A Frankendom dash or leap should be decided by the same rule (not decided here).
- The camera reads the player's cell and writes the view offset and a redraw flag (`ui-output.c:573-577`). In Frankendom the camera must read the server's position and keep no game state (Pit as client).
- The update is driven by move events (`mon-util.c:621`, `player-calcs.c:2626`), not by a frame. A fight camera must run once per render frame from the latest position; the render loop was not read.
- Zone bounds: the donor clamps to the world size (`cave->height`, `cave->width`, 523-524). Frankendom's zones as data should supply the bounds per zone.
- The overhead window and the town rule are not part of the fight camera. The donor's comment that the town should never scroll is in the header of `modify_panel` (`ui-output.c:546`); the code for it was not read.
