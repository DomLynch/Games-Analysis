# OpenRCT2-OpenRCT2 (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2-ui/windows/Map.cpp` | Licence: GPL-3.0 (`licence.txt` on the box is the GNU GPL Version 3, 29 June 2007; `Map.cpp` header: "OpenRCT2 is licensed under the GNU General Public License version 3.") | C++ | symbol `MapWindow::SetMapPixels` (called from `MapWindow::onUpdate`)

Checked: The list hint `src/openrct2-ui/windows/Finances.cpp` is the wrong file (it is the finance summary, marketing and graph window; I read its function list only, 215-660 not read). The minimap is `Map.cpp` (1289 lines). Read in full: onUpdate 365-395, onScrollMouseDown/Drag 549-574, onScrollDraw 576-604, CentreMapOnViewPoint 719-757, SetMapPixels 783-845, GetPixelColourPeep 846-894, DrawMapPeepPixel and flash colours 960-1019 (train overlay 1020-1040), PaintHudRectangle 1042-1078, ScreenToMap and TransformToMapCoords 1141-1186, sizing helpers 80-96, ResizeMiniMap and WindowMapReset 1232-1289. Read the dispatch chain: `Context.cpp` 1324-1334 and 1389-1424, `UiContext.cpp` 144-151, `Window.cpp` 104-112, `Game.h` 21, `MapLimits.h` 14-15. Not read: `GetPixelColourRide` (896-), the tab and editor button code (1080-1126), the open-time sizing (1198-1231), `WindowScrollToLocation` (so I do not know whether the camera jump is instant or eased), and where `gCurrentRealTimeTicks` is incremented. Confidence: high on the raster slice, click and frame code; medium on the exact order of the draw passes (onScrollDraw read, onDraw and onPrepareDraw not read). Camera scope: not a camera note (the minimap is a HUD widget); no `camera_scope` tag. Sub-topics in the fold-in list: touch UX and accessibility are read as a short note in section 6; no lock-on or input buffer in this donor (not found, grep of `lock.on` gave nothing in `src`).

## 1. Mechanism

- The minimap is a raster (a byte array of palette indices) of the whole park. It is not redrawn from scratch: each window update call rebuilds a fixed slice. Each call to `SetMapPixels` fills one line of tiles across the map (818-841), and the line pointer advances and wraps at the practical map size (842-844).
- Order of steps in one window update (`onUpdate`, 365-395): (a) toggle the flash bit when the real-time tick count is a multiple of 4 (372-373); (b) set the guest and staff flash flags only while the guest or staff list window is open (376-381 for guests; staff is the same pattern); (c) if the view rotation changed, clear the raster and re-centre (385-390); (d) run 16 line slices (392-393); (e) invalidate the window (395).
- Colour of one raster tile (`GetPixelColourPeep`, 846-894): surface colour from the surface object's map colours (855-858); water overrides the colour when water height is above zero (861-862); unowned land is dimmed by swapping the second palette index to the unowned colour (864-865); a ghost element paints a fixed colour and stops the scan (871-875); each element on the tile overwrites the colour through a per-type table (877-890). Edge tiles are skipped and keep their old pixel (820).
- Overlays are drawn over the raster on every draw, not in the slice: guest and staff dots (`DrawMapPeepPixel`, 974-993) at the transformed world position (979); a dot is in its default colour unless the entity is flashing (983-985), and a flashing dot in a list-linked colour grows by one pixel to the left (987-990). Train vehicles are single pixels (1020-1040). The viewport frame is drawn last (`PaintHudRectangle`, 1042-1078): eight 3-pixel corner arms, drawn from the main view's position and size divided by the step (1057-1059).
- Click and drag (549-574): the pointer is converted to a map point by `ScreenToMap` (559), clamped to the map (560-561), given the height at that point (562), and passed to `WindowScrollToLocation` on the main window (567). Dragging calls the same handler (573), so a drag scrubs the main view.
- Tick: `onUpdate` is not per frame. The fixed-step loop runs `Tick()` while the accumulated time is at least `kGameUpdateTimeMS` (Context.cpp 1324-1329). `Tick()` ends with `_uiContext->Tick()` (1423), which runs `WindowDispatchUpdateAll()` (UiContext.cpp 150), which calls `onUpdate` on every open window (Window.cpp 111). The constant is 40 per second (`kGameUpdateFPS`, Game.h 21). So the minimap advances 16 rows per 1/40 s.
- Derived, from the read code only: a map whose practical size is N needs ceil(N / 16) updates for a full refresh. For a 128-tile map (N = 126 by line 83) that is 8 updates, or 0.2 s at 40 per second. The minimap can therefore lag the true park by up to that long. I did not measure it.

## 2. Key functions

- `MapWindow::onUpdate`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2-ui/windows/Map.cpp` 365-395. Flash flags, rotation rebuild, 16 slices, invalidate.
- `MapWindow::SetMapPixels`: same file, 783-845. One line of tiles per call; line pointer wraps.
- `MapWindow::GetPixelColourPeep`: same file, 846-894. Colour rules for one tile (water, unowned, ghost, per-type overwrite).
- `MapWindow::onScrollMouseDown` and `onScrollMouseDrag`: same file, 549-574. Click and drag to jump the main view.
- `MapWindow::PaintHudRectangle`: same file, 1042-1078. Corner-arm viewport frame.
- `MapWindow::ScreenToMap` and `TransformToMapCoords`: same file, 1141-1186. Inverse and forward isometric transforms with rotation.
- Dispatch: `Context.cpp` 1324-1329 (fixed-step loop), 1389-1424 (`Tick`), `UiContext.cpp` 144-151, `Window.cpp` 108-112 (`WindowDispatchUpdateAll`), 111 (`onUpdate` call).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Raster refreshed in a fixed slice per update, with a wrapping line pointer | 16 rows per update (Map.cpp 392); the pointer wraps at the practical size (843-844) |
| Practical size = larger side minus 2 (a border reserve) | minus 2 (Map.cpp 83); raster width = 2 x practical size (Map.cpp 95) |
| Flash phase toggled on a tick count | modulo 4 on the real-time tick (Map.cpp 372), XOR flip (373); the tick rate is not read |
| Flashing marker grows one pixel in the highlight case | 1 px to the left (Map.cpp 989) |
| Viewport frame as corner arms | 3-pixel arms (Map.cpp 1064 and the other seven fills); frame size = view size / step, y uses half-step (Map.cpp 1057-1059) |
| Half-step for the iso y-axis | half the world step (MapLimits.h 15); world step 32 (MapLimits.h 14) |
| Click clamp to map bounds | clamp to [0, practical size x 32 - 1] (Map.cpp 560-561) |
| Update rate | 40 per second (Game.h 21) |
| Touch-size close button | 21 px wide vs 11 px normal (Widget.h 218 vs 217); chosen by the enlarged-UI option (WindowBase.cpp 53) |

## 4. TypeScript sketch

simplified: the sketch uses a plain row-by-row raster, a top-down mapping for the click (no isometric inverse, no rotation) and a single colour per tile. It omits the surface and water colour rules, the ghost and element-overwrite colours, the unowned dimming, the rotation rebuild, the ride tab, the train overlay, the window scroll call, and the one-line-per-call diagonal order of the donor. It keeps the donor's order: slice first, then the frame and dots are drawn over it, and the flash bit is derived from the tick.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

// Minimap raster rebuilt in slices: each update refreshes `rowsPerUpdate` rows, then wraps.
// colourAt returns a palette index for a tile, or null for an edge tile (left untouched, as in the donor).
class MinimapRaster {
  readonly size: number;
  readonly pixels: Uint8Array;
  private row = 0;

  constructor(size: number, private readonly rowsPerUpdate = 16) {
    this.size = size;
    this.pixels = new Uint8Array(size * size);
  }

  update(colourAt: (x: number, y: number) => number | null): void {
    for (let k = 0; k < this.rowsPerUpdate; k++) {
      for (let x = 0; x < this.size; x++) {
        const c = colourAt(x, this.row);
        if (c !== null) this.pixels[this.row * this.size + x] = c;
      }
      this.row = (this.row + 1) % this.size;
    }
  }
}

// Viewport frame drawn as eight short corner arms (3 px each), the same shape as the donor's brackets.
type Seg = [number, number, number, number];
function viewportBrackets(l: number, t: number, r: number, b: number, arm = 3): Seg[] {
  return [
    [l, t, l + arm, t], [r - arm, t, r, t],
    [l, t, l, t + arm], [l, b - arm, l, b],
    [l, b, l + arm, b], [r - arm, b, r, b],
    [r, t, r, t + arm], [r, b - arm, r, b],
  ];
}

// Click on the minimap -> world position, clamped to the map (no rotation, no isometric inverse here).
function minimapClickToWorld(px: number, py: number, mapTiles: number, unit: number): { x: number; y: number } {
  const max = mapTiles * unit - 1;
  return {
    x: Math.min(Math.max(px * unit, 0), max),
    y: Math.min(Math.max(py * unit, 0), max),
  };
}

// Entity dot: flash phase flips every 4 ticks; a highlighted dot in its flash phase grows one pixel to the left.
function dotRect(px: number, py: number, tick: number, highlighted: boolean): { x: number; y: number; w: number; h: number } {
  const flashOn = Math.floor(tick / 4) % 2 === 0;
  const grow = highlighted && flashOn ? 1 : 0;
  return { x: px - grow, y: py, w: 1 + grow, h: 1 };
}

export {};
```

Typecheck: run on the VPS, `npx -p typescript tsc --noEmit --strict --target es2020 sketch.ts` (copy of `work/OpenRCT2-OpenRCT2-hud-ui.ts`), exit 0.

## 5. Lands in

- TARGET `origins/client/hud/minimap.ts` (proposed path; not checked against the Frankendom repo). Client-only HUD: it reads engine state and writes nothing. Parity-checklist row 14 (HUD).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: Frankendom ruling "the camera/HUD/sound are client-only" (the minimap reads state only); rules 7-9 n/a

Best transferable idea: a zone minimap rebuilt in a fixed slice of rows per update, with the viewport frame as corner brackets and a click that jumps the view, and entity dots that flash only while the matching list panel is open.
Decision (proposed): adapt - keep the slice budget, the corner-bracket frame, the click-to-jump and the list-linked highlight; drop the isometric transform, which does not fit Frankendom's 3D zones, and use a top-down projection of the zone's ground plane instead. Fix carried into the sketch: the donor's fixed 16-row budget is not tied to map size, so the sketch takes `rowsPerUpdate` as a parameter (to be set from zone size as data).
Acceptance: a player clicks the minimap and the camera focus moves to that point on the next frame; a 128-tile zone's raster is fully refreshed within 8 updates; the guest-equivalent dots flash only while the matching list panel is open.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the described mechanism; no donor line is translated.
- Isometric transform: `ScreenToMap` and `TransformToMapCoords` use half-step terms and a +8 offset (1142-1143) that exist for the iso grid. Frankendom's zones are 3D; drop these terms, not port them. Not verified against any Frankendom zone shape.
- The slice means the minimap can be stale by up to one full cycle (8 updates for a 128-tile zone, about 0.2 s at 40 per second, derived). Acceptable for a minimap; the minimap must never be read by the server (client-only, one ledger).
- The fixed 16-row budget does not scale with map size (donor constant at 392). Fix: derive rows per update from zone size as zone data, so large zones refresh within a set number of frames.
- The flash only runs while a list window is open (377-381). That ties the map to the player's current panel, which is a good idea, but there is no donor evidence it reads well at 375 wide with many dots. Not checked in a browser.
- Touch: the enlarged-UI option makes the close button 21 px instead of 11 px (Widget.h 217-218, WindowBase.cpp 53). The transferable rule is a touch-target floor set as a UI option; the donor does not show a measured minimum. On touch input the drag keeps the new drag point; otherwise the cursor is put back at the drag origin (MouseInput.cpp 620 onward). Whether that rule fits Frankendom's touch input is not checked.
- Not read: the click jump's easing (`WindowScrollToLocation`, not read), the ride-tab colours (896-), and the frame rate of `gCurrentRealTimeTicks`, so the 4-tick flash period has an unknown wall-clock length.
- Accessibility: no screen-reader or colour-blind alternative was found in the minimap code (not searched beyond the map file). Fold-in note only.
- String table (`data/language/en-GB.txt`, read by line count, no quotes here): 3,860 string entries, 11 comment lines, 3 blank lines (3,874 total). Each entry is one line: `STR_` plus a four-digit id, a colon, then the text on that line, with inline codes in braces (about 40 distinct codes, for example a string-id reference, a comma-formatted number, currency with two decimals, colour codes, newlines, inline sprites, date and month forms). Plural forms are separate ids (for example a singular and a plural "per train" entry). Which one the code picks is not read. Window labels are looked up by numeric id in `src/openrct2-ui/UiStringIds.h`. The first three lines of the file state the id rule.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: Frankendom ruling "the camera/HUD/sound are client-only"; rules 7-9 n/a
