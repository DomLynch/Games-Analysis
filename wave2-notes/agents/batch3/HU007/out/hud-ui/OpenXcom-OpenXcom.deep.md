# OpenXcom-OpenXcom (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/MiniMapView.cpp` | Licence: GPL-3.0-or-later (`MiniMapView.h` header: "the Free Software Foundation, either version 3 of the License, or" / "(at your option) any later version."; `LICENSE.txt` is GNU GPL Version 3, 29 June 2007) | C++ | symbol `MiniMapView::mouseClick` with `MiniMapView::mouseOver` (drag-scroll), `MiniMapView::draw`

Checked: The list hint `src/Battlescape/MiniMapView.h` is the class declaration only (72 lines); the mechanism is in `MiniMapView.cpp` (418 lines). Read in full: `MiniMapView.h` 20-72; `MiniMapView.cpp` 40 (MAX_FRAME), 52 (constructor), 60-155 (draw), 184-274 (press and click), 282-378 (drag motion), 386-405 (mouse-in, animate), 407-416 (stop). Option defaults read: `src/Engine/Options.cpp` 104-106 and 188; option declarations `src/Engine/Options.inc.h` lines 7, 35, 37 (grep). Candidates opened: `MiniMapView.h`, `MiniMapView.cpp`, `Options.cpp`, `Options.inc.h`. Not read: `MiniMapView::up` and `down` (161-183), `MiniMapState` (`btnOkClick`, the right-click close), the camera's own `centerOnPosition` (its clamp, if any), and the caller that runs `draw` and `animate` (rate not read). Confidence: high on the drag and click order; high on the draw loop; the camera's internal clamp is unknown, so the limit in the drag code is the minimap's own check. Camera scope: not a camera cell (HUD); no `camera_scope` tag. Frame-rate of the animation: not read.

## 1. Mechanism

- Draw (`draw`, 60-155). The minimap is redrawn in full on each call, with no cache. It first fills the background (70), then loops over every level from 0 up to the camera's view level (72), and for each cell in the minimap rectangle (75-78): (a) floor and object tiles get their minimap sprite (87-105), shaded: undiscovered tiles use shade 16 (96), discovered tiles use the tile's shade capped at 7 (97-100); (b) a visible unit draws its minimap sprite, the frame offset by its direction relative to the tile and by an animation term `_frame * size * size` (107-123); a neutral unit larger than one cell is tinted red (115-118); (c) a discovered tile with items shows an item marker, frame `9 + _frame` (125-130). Last, four diagonal lines at the centre mark the view, coloured `1 + _frame * 3` (138-154), so the bracket colour cycles with the frame.
- Animation. `animate` adds one to `_frame` and wraps to 0 after `MAX_FRAME` = 2 (397-405; 40). The frame is a three-step cycle shared by units, item markers and the bracket.
- Drag, press (`mousePress`, 184-206). Only the configured drag button starts a drag (188; default middle button, `Options.cpp` 104). The press records the pointer position (192), the camera centre (193), and resets the accumulated motion and threshold flag (201-203). It records the start time (204).
- Drag, motion (`mouseOver`, 286-377). Each motion event adds to the total motion (315-316). Once the total moves more than the pixel tolerance on either axis, the press becomes a drag and the flag stays set (317-318; default 10 px, `Options.cpp` 106). The camera offset is the accumulated motion, negated by default so the map moves with the pointer (331-332; invert option `Options.cpp` 188, default false), divided by the axis scale and by four (336-337), and added to the press-time centre.
- Drag, limits. If the new centre would be below -1 or above the map size on an axis (340, 345), the last step is undone in the accumulator for that axis (342, 347) and the centre is recomputed from the accumulator (343, 348). This is a rollback of the step, not a clamp of the centre.
- Drag, cursor. Unless touch is enabled (306), the OS cursor is warped back to the press point after each motion event (310), while a virtual cursor is kept, moved by the same delta and clamped to the minimap rectangle (366-373), and passed to the cursor handler (376). Release warps the OS cursor to the virtual position (411) and clears the stored flag (415).
- Release (`mouseClick`, 213-254). If the press never crossed the threshold and lasted no more than the time tolerance (default 300 ms, `Options.cpp` 105), it is a click: the camera goes back to the press centre (226 or 250) and the drag is cancelled. Otherwise the drag stays. After that, a left click centres the camera on the clicked cell, offset from the minimap centre in cells (261-272; the offset is 266-267, the camera move 269-271). A middle-button click after a short press does nothing more (the right-button branch is 256; the left-button branch is 261).
- Mouse-in (`mouseIn`, 386-392). Entering the minimap from elsewhere ends drag mode (390-391).
- Order of one drag: press (records) → motion (threshold, camera move, cursor warp) → release (click test, restore, cursor warp back).

## 2. Key functions

- `MiniMapView::mousePress`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/MiniMapView.cpp` 184-206. Press records and resets.
- `MiniMapView::mouseClick`: same file, 213-274. Release: click test, restore, left-click centring.
- `MiniMapView::mouseOver`: same file, 282-378. Motion: threshold, offset, rollback at the limits, cursor lock.
- `MiniMapView::draw`: same file, 60-155. Layered redraw, fog shade, animation colours, view bracket.
- `MiniMapView::animate` and `stopScrolling`: same file, 397-416.
- Defaults: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Engine/Options.cpp` 104-106 and 188.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Click vs drag: a dead zone on total motion, sticky once crossed | Pixel tolerance 10 (Options.cpp 106); the test is at 318 |
| Click vs drag: a short press counts as a click | Time tolerance 300 ms (Options.cpp 105); the test is at 225 and 246 |
| Restore the camera on a click, so a tiny drag is undone | Restore to the press-time centre (226, 250) |
| Grab-style offset: accumulated motion divided by a constant | Divisor 4 (336-337, 343, 348) |
| Rollback of the step at a limit, per axis | Limits -1 and map size (340, 345) |
| Fog: undiscovered tiles use a fixed dark shade, discovered tiles use the tile shade capped | Shade 16 (96); cap 7 (100) |
| Shared three-step animation counter | MAX_FRAME 2 (40); colour 1 + 3 x frame (140); marker 9 + frame (127) |
| Drag button | Middle button default (Options.cpp 104) |

## 4. TypeScript sketch

simplified: the sketch uses plain pixel motion and drops the per-axis window scale (`getXScale`, `getYScale`), the OS cursor warp and virtual cursor clamp, the touch switch, the release-missed workaround, the mouse-in stop, and the left-click centring. It keeps the donor's order: press records the start, motion accumulates and sets the sticky flag, the camera offset comes from the accumulator with per-axis rollback at the limits, and release decides click or drag and restores on a click. The rollback uses the same mapping as the normal path (the donor's rollback branches at 343 and 348 do not apply the scale that the normal path applies at 336-337; see section 6). `Math.trunc` stands in for C integer division.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

const DRAG_TIME_TOLERANCE_MS = 300; // data: donor default for a short press that counts as a click
const DRAG_PIXEL_TOLERANCE = 10;    // data: donor default; total motion that turns a press into a drag
const DRAG_DIVISOR = 4;             // data: pixels of pointer motion per cell of camera motion

interface Cam { x: number; y: number; }
interface Limits { minX: number; maxX: number; minY: number; maxY: number; }

class DragScroll {
  private anchor: Cam = { x: 0, y: 0 };
  private accX = 0;
  private accY = 0;
  private totalX = 0;
  private totalY = 0;
  private overThreshold = false;
  private startMs = 0;
  active = false;

  press(cam: Cam, nowMs: number): void {
    this.active = true;
    this.anchor = { x: cam.x, y: cam.y };
    this.accX = 0;
    this.accY = 0;
    this.totalX = 0;
    this.totalY = 0;
    this.overThreshold = false;
    this.startMs = nowMs;
  }

  // dx, dy: pointer motion since the last event (grab style: the map moves with the pointer).
  // A step that would leave the limits is rolled back in the accumulator, per axis, not clamped.
  move(dx: number, dy: number, lim: Limits): Cam {
    this.totalX += dx;
    this.totalY += dy;
    if (!this.overThreshold) {
      this.overThreshold = Math.abs(this.totalX) > DRAG_PIXEL_TOLERANCE || Math.abs(this.totalY) > DRAG_PIXEL_TOLERANCE;
    }
    this.accX -= dx;
    this.accY -= dy;
    let x = this.anchor.x + Math.trunc(this.accX / DRAG_DIVISOR);
    let y = this.anchor.y + Math.trunc(this.accY / DRAG_DIVISOR);
    if (x < lim.minX || x > lim.maxX) {
      this.accX += dx;
      x = this.anchor.x + Math.trunc(this.accX / DRAG_DIVISOR);
    }
    if (y < lim.minY || y > lim.maxY) {
      this.accY += dy;
      y = this.anchor.y + Math.trunc(this.accY / DRAG_DIVISOR);
    }
    return { x, y };
  }

  // Release: a press that never crossed the threshold and was short is a click, so the camera goes back
  // to where the press started. The caller then runs its own click action.
  release(nowMs: number): { wasClick: boolean; restore: Cam | null } {
    const wasClick = !this.overThreshold && nowMs - this.startMs <= DRAG_TIME_TOLERANCE_MS;
    this.active = false;
    return { wasClick, restore: wasClick ? { x: this.anchor.x, y: this.anchor.y } : null };
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (copy of `work/OpenXcom-OpenXcom-hud-ui.ts`), exit 0.

## 5. Lands in

- TARGET `origins/client/hud/minimap.ts` (proposed path; not checked against the Frankendom repo). Client-only HUD widget. Parity-checklist row 14 (HUD). The drag input also sits near row 5 (controls and input); row 14 is the cited row.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: Frankendom ruling "the camera/HUD/sound are client-only" (the drag moves only the client's view); rules 7-9 n/a

Best transferable idea: a map drag that is a click unless the pointer moves past a pixel tolerance or holds past a time window, that moves the view by accumulated motion, and that undoes the step (not clamps the view) at the map edge.
Decision (proposed): adapt - keep the click-vs-drag test (sticky pixel dead zone plus a short-press window with restore on click), the accumulated grab-style offset, and the rollback at the limits; reject the OS cursor warp and virtual cursor, which a browser cannot do without pointer lock and which touch does not need. Defect found and fixed in the sketch: the rollback branches (343, 348) divide by four without the window scale that the normal path applies (336-337). At a scale other than 1 the view jumps at the edge. Fix: one mapping for both paths (the sketch has one expression).
Acceptance: A quick tap (under 300 ms and under 10 px of motion) does not pan the map and runs the tap action (centre on the tapped point); a press that moves past 10 px pans the map with the pointer; at the zone edge the pan stops with no jump on the next move.

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism; no donor line is translated.
- The scale defect (lines 336-337 against 343 and 348) only shows when the window scale is not 1. The donor's default scale is not read. Frankendom must make the rollback and the normal path share one function (the sketch does).
- The 300 ms window and the 10 px tolerance are desktop values (mouse). For touch, the tolerance needs to be larger (in CSS pixels, scaled by device pixel ratio) and the time window is a design call. These are data fields, not fixed rules. The donor does not show a touch-tuned value (its touch path only turns off the cursor warp, 306).
- Frankendom's map is a browser surface, so no cursor warp: the pointer position comes from events. The virtual cursor (366-373) is therefore not needed; the drag works on deltas alone.
- The donor's left-click centring (261-272) is a separate path from the drag. In Frankendom one tap must do one thing: centre on the tapped point. The sketch keeps only the click-vs-drag decision and leaves the centring to the caller.
- The camera's own clamp (if any) is not read. The minimap's -1 and map-size limit is its own check. Frankendom's zone bounds are data, so the limits come from zone data, not a constant.
- Fog shading (96-100) is a fixed dark shade for undiscovered tiles with a cap of 7 for discovered ones; the palette meaning of shade 16 is not read. It transfers as the idea "undiscovered tiles are drawn with a fixed dark value, discovered tiles with the tile value".
- Animation: a three-step frame counter shared by units, markers and the view bracket (40, 127, 140). Frame rate is not read. Transfers as a shared counter, not a per-object timer.
- Accessibility and touch UX beyond the touch switch (306): not searched.
- String table (`bin/common/Language/en-GB.yml`, counted, no quotes here): 428 lines in total. One header line for the language code, then 427 entries, each a two-space indented key of the form `STR_` plus upper-case name, a colon, and a double-quoted value. There are no comments, blank lines or list items. Inline codes in braces: positional placeholders (`{0}`, `{1}`, `{2}`), font switch `{ALT}` (11 uses), line breaks `{NEWLINE}` (7) and `{SMALLLINE}` (1); one stray percent sign. No plural variant syntax appears in this file (plural handling in code not searched). The campaign file `bin/standard/xcom1/Language/en-GB.yml` (1090 lines) is a separate per-game file not counted.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: Frankendom ruling "the camera/HUD/sound are client-only"; rules 7-9 n/a
