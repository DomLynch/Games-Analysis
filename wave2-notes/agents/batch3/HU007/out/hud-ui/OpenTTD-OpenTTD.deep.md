# OpenTTD-OpenTTD (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/smallmap_gui.cpp` | Licence: GPL-2.0 (the file header says "free software; ... under the terms of the GNU General Public License ... version 2"; `COPYING.md` is GPL Version 2, June 1991, and says it applies "with the exception of some 3rd party modules"; no "or later" clause seen) | C++ | symbol `SmallMapWindow` (`SetZoomLevel`, `SetNewScroll`, `OnClick`, `OnMouseWheel`, `OnScroll`)

Checked: The list hint `smallmap_gui.cpp` is the right file (2192 lines). Read: 681-702 (indicator arms), 739-748 (timers), 850-882 (clamp), 883-902 (viewport box), 1134-1217 (remap, pixel to tile, compute scroll), 1218-1260 (zoom), 1441-1460 (blink, refresh), 1476-1499 (open-time and centre), 1705-1746 (click, zoom buttons, centre button), 1828-1856 (invalidate), 1865-1900 (wheel, pan, hover), 2167-2181 (`ScrollMainWindowTo`). Candidates opened: `viewport.cpp` 2549-2575 (`ScrollWindowTo`), `viewport_func.h` 75 (default argument), `timer/timer_window.h` 36 (blink interval), `main_gui.cpp` 325 (grep only, a caller of `ScrollMainWindowTo`). Not read: `DrawSmallMap` body (1080-1133), `DrawVehicles` (957-995), `RebuildColourIndexIfNecessary` (752-781), `UpdateLinks` (1428-1440), the legend and widget setup (1277-1410), and the glide that moves the main view toward its destination (in `viewport.cpp`, not read). Confidence: high on zoom, clamp and click; medium on what the main view does after the click (destination set, glide not read). Camera scope: this is a HUD map, not a camera note (no `camera_scope` tag). Data tables: the legends are arrays in code (66-141), not a data file; the map uses no data file for its numbers (zoom steps and timers are code constants).

## 1. Mechanism

- The world map shows the map at one of five zoom steps, a fixed table `{1, 2, 4, 6, 8}` where a bigger number is further out (1220). `PixelToTile` multiplies the pixel step by the zoom value (1164), so the step is in tiles per map pixel.
- Zoom about a point (`SetZoomLevel`, 1218-1260). Order of steps: (a) read the tile under the zoom point at the old step (1240); (b) move the index one step, clamped to the table, zoom-in moving to the smaller step (1241); (c) set the new step (1248); (d) read the tile under the same pixel at the new step (1250); (e) shift the scroll by the tile difference times the tile size and call `SetNewScroll` (1251-1252); (f) disable the zoom-in button at the smallest step and the zoom-out button at the largest (1256-1257); (g) mark the window dirty (1258). The point under the pointer stays fixed through the change.
- Inputs that zoom: the mouse wheel, about the cursor position (`OnMouseWheel`, 1865-1875). It only runs when the scroll-wheel setting is not Off (1868); a negative wheel value zooms in (1873). The zoom buttons zoom about the widget centre (1723-1725).
- Clamp (`SetNewScroll`, 850-878; the docstring says the clamp keeps "the centre of the smallmap always contains a part of the map", 843-845). The margin is half the widget, converted with the iso remap and multiplied by the zoom (853-856). Scroll x is limited to [minus margin, map size minus margin] (857-864), and y likewise (865-872). When an axis is clamped, the sub-pixel remainder is set to zero (859, 863, 867, 871). The result is stored (874-876).
- Pan (`OnScroll`, 1877-1887). The window manager gives a pixel delta. It becomes a tile offset plus a sub-pixel (1883), is added to the scroll (1884), and goes through the same clamp. Only the minimap's own view moves; the main view is not touched on this path (per the code read).
- Click (`OnClick`, 1708-1718). The pixel becomes a tile offset (1714). `ScrollWindowTo` moves the main view to the tile at that point, with z = -1 so the ground height is looked up (1715; `viewport.cpp` 2552-2559). The default `instant` is false (`viewport_func.h` 75), so the call sets a destination and does not jump (`viewport.cpp` 2572-2573). Instant mode also sets the current position (2566-2570), which the click does not use. `ScrollWindowTo` first cancels any follow target (2562). If the destination is unchanged it returns false (2564-2565). The glide that carries the main view there is not read.
- Recentre (`SmallMapCenterOnCurrentPos`, 1488-1499). It centres the minimap on the main viewport centre. It runs on open (1480-1481), on the centre button (1741-1742), and from `ScrollMainWindowTo` when a scroll is a no-op (2175-2178). The minimap's own click does not take that route: it calls `ScrollWindowTo` directly (1715).
- Viewport box (`DrawMapIndicators`, 883-902). The main viewport's virtual rectangle is mapped to minimap pixels through the inverse iso remap (888-895), then drawn as four edges, each with two 3-pixel arms (`DrawVertMapIndicator` and `DrawHorizMapIndicator`, 681-697).
- Timers (window interval timers, 739-747). Blink every 450 ms (`TIMER_BLINK_INTERVAL`, timer_window.h 36); `Blink` flips the industry highlight state only when an industry is highlighted (1441-1449). Refresh every 930 ms calls `ForceRefresh` (1452-1458), which updates link data and marks the window dirty, and skips when an industry is highlighted (1454). The time base of the interval timers is not read.

## 2. Key functions

- `SmallMapWindow::SetZoomLevel`: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/smallmap_gui.cpp` 1218-1260. Zoom about a fixed pixel.
- `SmallMapWindow::SetNewScroll`: same file, 850-878. Clamp of scroll and sub-pixel.
- `SmallMapWindow::PixelToTile`: same file, 1158-1179. Pixel to tile with the 2:1 step and the sub-pixel remainder (not transferable as is; see section 6).
- `SmallMapWindow::OnClick`: same file, 1705-1730 (map branch 1708-1718). Click to scroll the main view.
- `SmallMapWindow::OnMouseWheel` and `OnScroll`: same file, 1865-1887. Wheel zoom and drag pan.
- `SmallMapWindow::SmallMapCenterOnCurrentPos` and `ScrollMainWindowTo`: same file, 1488-1499 and 2167-2181. Recentre rules.
- `ScrollWindowTo`: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/viewport.cpp` 2549-2575. Cancel follow, destination, instant option.
- `DrawMapIndicators` and the arm helpers: `smallmap_gui.cpp` 681-702 and 883-902. Viewport box.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Discrete zoom table, index clamped at both ends, buttons disabled at the ends | Steps `{1, 2, 4, 6, 8}` (smallmap_gui.cpp 1220); clamp to table (1241); buttons (1256-1257) |
| Zoom about a pointer: fix the point, change step, shift scroll by the difference | Shift in tile-size units (1251-1252) |
| Clamp so the centre of the widget always shows part of the map | Margin = half widget x zoom (853-856); no fixed margin constant |
| Wheel zoom behind a setting; wheel sign picks the direction | Setting gate (1868); negative wheel = zoom in (1873) |
| Non-instant scroll to a tile | `instant` defaults to false (viewport_func.h 75) |
| Cancel follow before a manual scroll | `CancelFollow` at the top of `ScrollWindowTo` (viewport.cpp 2562) |
| Viewport box as corner arms | 3 px arms (smallmap_gui.cpp 683-696) |
| Highlight blink | 450 ms (timer_window.h 36) |
| Periodic refresh | 930 ms (smallmap_gui.cpp 745) |

## 4. TypeScript sketch

simplified: the sketch uses a top-down world (one map pixel is `zoom` world units) and drops the donor's 2:1 iso pixel grid and its sub-pixel remainder. The clamp uses half the widget times the zoom in world units; the donor uses the iso remap for the same margin. The main view's glide is not modelled (destination only). The drag sign follows the donor's `OnScroll` call and is not checked against the window manager. It omits the industry highlight, the link overlay, the legend, and the donor's zero-remainder rule on a clamped axis. It keeps the donor's order: zoom (point before, step, point after, shift, clamp), click (cancel follow, compare destination, set destination), then recentre when asked.

```ts
// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

const ZOOM_STEPS = [1, 2, 4, 6, 8]; // data: world units per map pixel; bigger number = further out
const BLINK_MS = 450;               // data: highlight blink interval
const REFRESH_MS = 930;             // data: periodic full refresh of the map

interface MapView {
  zoomIndex: number;
  scrollX: number; // world units, top-left of the map widget
  scrollY: number;
}

interface MainView {
  followTarget: string | null;
  destX: number;
  destY: number;
}

// Pixel -> world point under it, for the view's current zoom step.
function pixelToWorld(v: MapView, px: number, py: number): { x: number; y: number } {
  const z = ZOOM_STEPS[v.zoomIndex];
  return { x: v.scrollX + px * z, y: v.scrollY + py * z };
}

// Keep the centre of the widget on part of the world: scroll limited to [-half, worldSize - half].
function clampScroll(v: MapView, widgetW: number, widgetH: number, worldW: number, worldH: number): MapView {
  const z = ZOOM_STEPS[v.zoomIndex];
  const hx = (widgetW / 2) * z;
  const hy = (widgetH / 2) * z;
  return {
    zoomIndex: v.zoomIndex,
    scrollX: Math.min(Math.max(v.scrollX, -hx), worldW - hx),
    scrollY: Math.min(Math.max(v.scrollY, -hy), worldH - hy),
  };
}

// One zoom step, keeping the world point under the pointer fixed.
function zoomAt(v: MapView, zoomIn: boolean, px: number, py: number, widgetW: number, widgetH: number, worldW: number, worldH: number): MapView {
  const next = Math.min(Math.max(v.zoomIndex + (zoomIn ? -1 : 1), 0), ZOOM_STEPS.length - 1);
  if (next === v.zoomIndex) return v;
  const before = pixelToWorld(v, px, py);
  const after = pixelToWorld({ zoomIndex: next, scrollX: v.scrollX, scrollY: v.scrollY }, px, py);
  const moved: MapView = {
    zoomIndex: next,
    scrollX: v.scrollX + (before.x - after.x),
    scrollY: v.scrollY + (before.y - after.y),
  };
  return clampScroll(moved, widgetW, widgetH, worldW, worldH);
}

// Drag pans the map by a pixel delta, through the same clamp.
function panBy(v: MapView, dx: number, dy: number, widgetW: number, widgetH: number, worldW: number, worldH: number): MapView {
  const z = ZOOM_STEPS[v.zoomIndex];
  return clampScroll({ zoomIndex: v.zoomIndex, scrollX: v.scrollX + dx * z, scrollY: v.scrollY + dy * z }, widgetW, widgetH, worldW, worldH);
}

// Click on the map: any click cancels follow; returns false if the main view is already there.
// (Donor: ScrollMainWindowTo recentres the map on a no-op; the map's own click path does not.)
function clickMap(v: MapView, px: number, py: number, main: MainView): boolean {
  const p = pixelToWorld(v, px, py);
  main.followTarget = null;
  if (main.destX === p.x && main.destY === p.y) return false;
  main.destX = p.x;
  main.destY = p.y;
  return true;
}

// Recentre the map so the main view's centre sits in the middle of the widget.
function recentre(v: MapView, mainX: number, mainY: number, widgetW: number, widgetH: number, worldW: number, worldH: number): MapView {
  const z = ZOOM_STEPS[v.zoomIndex];
  return clampScroll({ zoomIndex: v.zoomIndex, scrollX: mainX - (widgetW / 2) * z, scrollY: mainY - (widgetH / 2) * z }, widgetW, widgetH, worldW, worldH);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (copy of `work/OpenTTD-OpenTTD-hud-ui.ts`), exit 0.

## 5. Lands in

- TARGET `origins/client/hud/worldmap.ts` (proposed path; not checked against the Frankendom repo). Client-only; it reads zone state and requests a view move, and the server is not involved. Parity-checklist row 14 (HUD).
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: Frankendom ruling "the camera/HUD/sound are client-only"; rules 7-9 n/a

Best transferable idea: a world map whose zoom keeps the point under the cursor fixed (discrete zoom steps as data), whose pan is clamped so part of the zone always stays in the middle of the widget, and whose click cancels the player's follow target before moving the view.
Decision (proposed): adapt - keep zoom about the cursor on a discrete step table, the centre-keeping clamp, and the cancel-follow on a manual move; reject the 2:1 iso pixel and sub-pixel arithmetic, which exists only for the donor's iso pixel grid. Defect check: none found in the lines read. The clamp zeroes the sub-pixel on a clamped axis (859-871); that is consistent, not a defect.
Acceptance: a player scrolls the wheel over a spot on the zone map and that spot stays under the cursor through the zoom; panning stops with the zone edge at the middle of the widget; a click on the map ends any follow and the view moves to the clicked point.

## 6. Gaps and risks

- GPL-2.0 with no "or later" clause: clean-room only. The sketch is written from the mechanism; no donor line is translated.
- Iso: `PixelToTile` (1158-1179) moves by a tile for each two rows down and each four pixels right (its comment, 1162-1163), with a remainder of 0 to 3 (1153). That is specific to the donor's pixel grid. Frankendom's maps are top-down or 3D, so the zoom and clamp must be in world units (the sketch does this), not ported.
- Cancel-follow is a camera-relevant rule. An explicit player move ends the auto-follow (viewport.cpp 2562) before the destination is compared. For the world camera this is one data point: input cancels auto-follow. The blend itself (how input and follow mix over time) is not read, so no value is claimed for it.
- The map click does not recentre on a no-op (the minimap's own click calls `ScrollWindowTo` directly, 1715). Only other callers of `ScrollMainWindowTo` get the recentre (2175-2178). The sketch's `recentre` is the centre-button behaviour (1741-1742), kept as its own button.
- The 930 ms refresh redraws link data, not map pixels. In Frankendom a minimap is cheap enough to redraw each frame, so the timer is a fallback only. Tag: stale-state.
- The 450 ms blink is a highlight of one selected item, the same idea as OpenRCT2's list-linked flash (see that note). Two donors agree on a short periodic highlight rather than a constant one.
- Not read: the main-view glide (in `viewport.cpp`), `DrawSmallMap`, `DrawVehicles`, `RebuildColourIndexIfNecessary`, `UpdateLinks`, the legend setup (1277-1410). Confidence on the glide is therefore none.
- Touch and accessibility: not searched in this file (no grep for touch in `smallmap_gui.cpp`).
- String table (`src/lang/english.txt`, counted, no quotes here): 6,073 lines in total: 4,801 `STR_` entries, 435 comment-style lines of which 217 are `##` metadata (name, own name, ISO code, plural form count, text direction, digit separators, Windows and GRF language ids, `##id`, `###length` blocks), 837 blank lines, and no other lines. Each entry is one line: `STR_` name padded to a column, a colon, then text with inline codes in braces (about 84 distinct code kinds, the most common being colour codes, string references, counts and currency). Plural selection uses a `{P ...}` form in 71 lines; the `##plural` header is 0 in this file and its meaning and the selection code are not read. The minimap labels are `STR_SMALLMAP_*` entries.

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
Brief rule served: Frankendom ruling "the camera/HUD/sound are client-only"; rules 7-9 n/a
