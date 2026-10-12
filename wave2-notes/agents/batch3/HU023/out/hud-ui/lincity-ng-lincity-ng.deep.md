# lincity-ng-lincity-ng (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity-ng/MiniMap.cpp` | Licence: GPL-2.0-or-later (README.md 134-135: "either version 2 of the License, or (at your option) any later version"; COPYING.txt is the GPLv2 text) | C++ | symbols `MiniMap::refreshTexture` (657), `MiniMap::constrainPosition` (602), `MiniMap::setGameViewCorners` (631), `MiniMap::draw` (641), `MiniMap::event` (960); the hint file `EconomyGraph.cpp` is a stats panel, read only in part (secondary)

Checked: Hint file `src/lincity-ng/EconomyGraph.cpp` was opened: newFPS (140-144) and draw (367-409) read; drawHistoryLineGraph (148-246), drawSustBarGraph (247-343) and drawFPSGraph (344-366) not read. The minimap is in `MiniMap.cpp`. Read: the header, lines 195-206 (end of parse), 520-700 (zoom, scroll, constrainPosition, setGameViewCorners, draw, refreshTexture, the start of getColorNormal), 960-1012 (event). Also read: `Game.cpp` 616-652 and 684-692 (what marks the minimap dirty), `GameView.cpp` 152-160 and 788-800, `MiniMap.hpp` 77 and 115, and `README.md` 134-135 (licence lines, read by grep). Not read: MiniMap.cpp 138-388 (view switching, map modes, button wiring), 388-520 beyond the mode change call, the colour table body 698-959 (only the first bits), and 1013-1063 (status text). Map data (`World`, `MapTile`) is not in the read set. Confidence: high on the cache, dirty-flag and clamp mechanism; medium on the colour table (partly read). camera_scope: not a camera cell. Also read: `data/locale` (string table, section 6).

## 1. Mechanism

- The minimap is a cache. It keeps one render-target texture of the whole map (created at size `map.len() - 2`, nearest-neighbour scaling, MiniMap.cpp 657-665). The texture is rebuilt only when a flag is set (`mFullRefresh`, 643-645). Otherwise `draw` only paints the cached texture.
- Rebuild (refreshTexture, 657-687): clear the target to black; for every tile that is visible (671), skip the tiles that only report a construction which is not standing (673, unless in a tile mode), draw one filled rectangle for the tile with a size of the construction group footprint (676, 1 in the coal and pollution tile modes) and a colour from the tile's construction group (`getColor`; the colour packing is in `getColorNormal` 689-, bits 32 and 64 set red and green as the low five bits times 8, lines 696-700).
- What sets the flag: `setMapDirty()` sets `mFullRefresh` (MiniMap.hpp 77). It is called (a) at the GUI tick, when the world's MAP update bit is set (Game.cpp 619, 627, 631); (b) on the first parse (200); (c) when a map mode changes (MiniMap.cpp 433-434, with `setDirty` and `mapChanged`); and (d) when a new month starts (Game.cpp 643-650). The main view listens to the minimap's `mapChanged` signal (GameView.cpp 155-158) and marks only itself dirty, so that is not a minimap source. A map change costs one rebuild at the next GUI tick, not a rebuild every frame.
- Viewport and anchor: `anchor` is the top-left map tile shown. `setGameViewCorners` (631-639) sets `anchor` to the centre of the main view's visible corners, minus half the minimap size in tiles (636), then calls `constrainPosition` (637). `constrainPosition` (602-626) keeps the anchor in `[1, len - 1 - size]` on each axis; when the range is empty (min > max) it uses the middle of the range instead (607-608 for x, 617-618 for y).
- Draw (641-655): the texture is drawn in a rectangle offset by `-anchor` and scaled by `tilesize` (650-652). `tilesize` comes from the layout file (191; value not read).
- Click (960-1012): a left click at a pixel converts to a tile as `(px - border) / tilesize + anchor`, cast to int (985-987), and calls `game->getGameView().show(tile)` (990-991), which moves the main view. The wheel calls `scrollPageDown` (997-1003).

## 2. Key functions

- `MiniMap::refreshTexture`: `src/lincity-ng/MiniMap.cpp` 657-687 (the rebuild: visibility, reporting skip, footprint, one rectangle per tile).
- `MiniMap::draw`: `src/lincity-ng/MiniMap.cpp` 641-655 (flag check, then draw with the anchor offset).
- `MiniMap::constrainPosition`: `src/lincity-ng/MiniMap.cpp` 602-626 (clamp; contains the x-bound defect, section 6).
- `MiniMap::setGameViewCorners`: `src/lincity-ng/MiniMap.cpp` 631-639 (centre on the view, then clamp).
- `MiniMap::event`: `src/lincity-ng/MiniMap.cpp` 960-1012 (click and wheel).
- Dirty sources: `src/lincity-ng/Game.cpp` 619-652; `src/lincity-ng/GameView.cpp` 155-158.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Keep the window inside the map on both axes | Minimum anchor tile 1 (MiniMap.cpp 603); maximum = map length minus one minus the minimap size in tiles (604-605) |
| Centre the window on the main view, then clamp | Centre = (upper-left + lower-right - size) / 2 (636) |
| Rebuild only on change | One full rebuild per dirty mark; dirty marks at the GUI tick on the world MAP bit (Game.cpp 627-631) and at each new month (650) |
| One rectangle per building footprint | Footprint = construction group size (676); tile modes use 1 |
| Pixel scale | `tilesize` from the layout file (191; value not read) |
| Colour from a packed group value | Red = 8 x low five bits when bit 32 is set (697); green by bit 64 (699); blue by bit 128 (700, test only) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: a dirty flag, a rebuild of the cache only when dirty (visible tiles only, reporting-only tiles skipped, one rectangle per footprint), draw from the cache, centre on the view corners, then clamp. It replaces the GPU render target with a list of rectangles, and it leaves out the map modes, the view switching, the wheel, the status text and the minimap buttons. The colour is passed in as a function and is not decoded. One deliberate change: the x upper clamp compares against the x bound (the donor compares it with the y bound on line 613). Typecheck passes on the VPS.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Tile {
  x: number;
  y: number;
  visible: boolean;
  built: boolean;      // a construction stands here
  reporting: boolean;  // the tile reports a construction that is not standing
  footprint: number;   // tiles wide, from the construction group
  colour: number;      // packed colour from the construction group
}

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  colour: number;
}

export class MinimapModel {
  private dirty = true;     // donor: mFullRefresh
  private cache: Rect[] = []; // stands in for the render-target texture
  anchorX = 1;              // top-left map tile shown by the minimap
  anchorY = 1;

  constructor(
    readonly mapLen: number,   // the map is mapLen x mapLen tiles
    readonly viewW: number,    // minimap size in pixels
    readonly viewH: number,
    readonly tilePx: number,   // pixels per tile (from the layout file; value not read)
  ) {}

  // Called when the map changed (world flag at a GUI tick, or on a new month).
  markDirty(): void {
    this.dirty = true;
  }

  // Rebuild the cache only when dirty; one rectangle per visible tile.
  private refresh(tiles: Tile[]): void {
    this.cache = [];
    for (const t of tiles) {
      if (!t.visible) continue;
      if (t.reporting && !t.built) continue;
      this.cache.push({
        x0: t.x - 1,
        y0: t.y - 1,
        x1: t.x - 1 + t.footprint,
        y1: t.y - 1 + t.footprint,
        colour: t.colour,
      });
    }
    this.dirty = false;
  }

  // Draw path: rebuild if dirty, then paint the cache.
  draw(tiles: Tile[], paint: (r: Rect) => void): void {
    if (this.dirty) this.refresh(tiles);
    for (const r of this.cache) paint(r);
  }

  // Centre the minimap on the main view's visible corners, then clamp.
  centreOn(ulx: number, uly: number, lrx: number, lry: number): void {
    this.anchorX = (ulx + lrx - this.viewW / this.tilePx) / 2;
    this.anchorY = (uly + lry - this.viewH / this.tilePx) / 2;
    this.clamp();
  }

  // Keep the window inside the map. Fix: the x upper bound is compared with the x bound
  // (the donor compares anchor.x with the y bound on one line, so a non-square minimap is not clamped).
  clamp(): void {
    const minX = 1;
    const minY = 1;
    const maxX = this.mapLen - 1 - this.viewW / this.tilePx;
    const maxY = this.mapLen - 1 - this.viewH / this.tilePx;
    this.anchorX = minX > maxX ? (minX + maxX) / 2 : Math.min(Math.max(this.anchorX, minX), maxX);
    this.anchorY = minY > maxY ? (minY + maxY) / 2 : Math.min(Math.max(this.anchorY, minY), maxY);
  }

  // Left click on the minimap: the tile under the pointer becomes the main view's target.
  tileAt(px: number, py: number, border: number): { x: number; y: number } {
    return {
      x: Math.floor((px - border) / this.tilePx + this.anchorX),
      y: Math.floor((py - border) / this.tilePx + this.anchorY),
    };
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS exits 0 for this file.

## 5. Lands in

- TARGET `origins/hud/minimap.ts` (new, client only: the engine does not read it). It takes zone data and the ledger's dirty events, and it centres on the camera's ground focus clamped to the zone bounds.
- Parity-checklist row 14 (HUD). The minimap is a HUD element; its clamp and its dirty flags are the parts that transfer.
- Best transferable idea: keep a cached zone map, rebuild it only when a map-change flag is set (not every frame), then centre a small window on the player and clamp it to the zone bounds on both axes.
- Decision (proposed): adapt. Why: the shape is right for a zone minimap built from zone data, and a rebuild on a change flag is cheap. Frankendom sets the flag from server-confirmed events (one ledger), not from a GUI tick alone. The donor's x clamp bug is fixed in the sketch. The donor's pixel-to-tile cast is kept as a floor in the sketch.
- Acceptance: in an open zone at 375 px wide, the minimap shows the zone centred on the player and stops at the zone edges; a test on a non-square minimap asserts that the anchor stays within 1 and the map length minus one minus the window size on both axes; a change event (a kill or a spawn) sets the minimap dirty and the marker updates on the next GUI tick, not every frame; tapping a minimap tile moves the world view to that tile.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: the zone data and the change events come from the engine, the minimap only displays them); rules 7-9 n/a

## 6. Gaps and risks

- Defect (MiniMap.cpp 613-614): `else if(anchor.x > max.y) { anchor.x = max.x; }`. The x upper clamp compares with the y bound. For a square minimap max.x equals max.y, so it works; for a non-square minimap it does not clamp x between max.x and max.y. Fix: compare with max.x (the sketch does). Found by reading the line; the minimap size is set in the layout file, which is not read, so whether a non-square minimap ships is not verified.
- The rebuild is a full pass over every tile (657-687) on every dirty mark. A large zone rebuilds all tiles on each change. Frankendom should mark the changed tiles and draw only those, or keep a dirty region; the donor does not.
- The donor's dirty marks are coarse (the whole map at each GUI tick with a MAP bit, plus monthly). Frankendom should keep this rule for the zone map but tie the flag to ledger events.
- The minimap is a world map of tiles. In the functions listed from MiniMap.cpp there is no target frame or health frame (not searched elsewhere in the donor).
- Click moves the main view with `show(tile)` (991) and nothing else: no confirm, no cue. For a fight zone, a click on the minimap must not move the camera during a duel; the sketch leaves this out.
- Panels (secondary, from the hint file): `EconomyGraph::draw` (367-409) stacks a history graph, a sustainability strip and an FPS strip. The history graph takes the height left after the fixed strips (375-379). The FPS strip is a sliding window: a new frame is pushed to the front and the list is cut to one sample per pixel column (141-142). Useful for a fight-log or damage-per-beat panel. Not read: the three draw helpers (148-366).
- String table (`data/locale`): 18 gettext `.po` files (ca, cs, da, de, el, es, fr, gd, gl, hu, ja, nl, pl, pt_BR, ru, sv, tr, zh_CN). There is no `.pot` file in the folder. Each file has 295-468 `msgid` lines (including the header entry) and 16-101 empty `msgstr` (untranslated), plus 1-53 fuzzy entries (ru has 53). Plural forms: the header in de.po line 20 declares `nplurals=2; plural=(n != 1);`, and no file has a `msgid_plural` entry. Printf conversions: 14 of the 18 files contain live msgids with conversions such as `%s` or `%d` (for example the `Game statistics from LinCity-NG Version %s` entry in ca.po 895), and de, fr, hu and ru have none. Each file also has `#~` obsolete entries (656 lines in total). In source, 275 `N_()` and 203 `_()` gettext markers appear across `src/lincity` and `src/lincity-ng` (counted by grep). Grammar: a plain msgid-to-msgstr table with C printf conversions; no plural messages are used in these files (how the game renders counts was not read).
- Licence: GPL-2.0-or-later. Clean-room, shape only. No line-by-line translation.
