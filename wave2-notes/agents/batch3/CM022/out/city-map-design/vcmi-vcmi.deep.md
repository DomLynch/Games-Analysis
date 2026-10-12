# vcmi-vcmi (city-map-design, cell 1)

Donor: `/mnt/frankendom-donors/vcmi-vcmi/client/adventureMap/CMinimap.cpp` (with `CMinimap.h`, `AdventureMapInterface.cpp`, `CPlayerInterface.cpp`, `config/terrains.json`) | Licence: GPL-2.0-or-later (CMinimap.cpp header: "License: GNU General Public License v2.0 or later"; `license.txt` is GPL version 2, June 1991) | C++ | symbols `CMinimap`, `CMinimapInstance`

Checked: opened CMinimap.cpp 1-306 and CMinimap.h 1-78 in full. Callers read: AdventureMapInterface.cpp 424-428, 436, 447, 501; CPlayerInterface.cpp 1213-1223 and 1428-1430; terrain colour data config/terrains.json 6-7 and config/schemas/terrain.json (descriptions at 97 and 108). Not read: the `Point` type, TerrainHandler loading, the `minimapShowHeroes` change path beyond AdventureOptionsTab.cpp 155-157, the `cb->getHeroes` and fog callback implementations, and the `MapViewController` caller in full. camera_scope: n/a (a minimap, not a camera). Confidence: high on the minimap's own order of operations and numbers; medium on the producers of changed tiles (read as call sites only). This is a whole-map adventure minimap, not a city-layout minimap; the mechanism is the transferable part.

## 1. Mechanism

- The minimap is a cached raster with one pixel per map tile on the current level (`CMinimapInstance`, CMinimap.cpp 36-95). `showAll` scales that raster into the widget (97-100).
- Colour of one tile, in this order (`getTileColor`, 36-67):
  - (a) not visible to the player: black (38-42).
  - (b) an object on the tile has an owner: neutral colour for neutral objects (52-53), otherwise the owner's colour (58-59). When hero icons are on, a hero does not colour its tile (55-56); the icon is drawn on top later in `showAll`.
  - (c) otherwise the terrain colour: the blocked colour if the tile is blocked and not visitable (63-64), else the open colour (66).
- Two write paths into the cache:
  - Patch: `updateTiles` (295-306) loops over the changed tile set and calls `refreshTile` (69-73), which redraws one pixel and only when the tile's level matches the minimap's level (71-72). Then it redraws the widget.
  - Rebuild: `redrawMinimap` (75-83) loops over every tile of the map. It runs when the minimap is created (`CMinimapInstance` constructor, 92) and in `update()` (238-246).
- Who sends changed sets: fog reveal (`tileRevealed`, CPlayerInterface.cpp 1217) and fog hide (1223) pass their tile set. Owner change (1428-1430) repaints the object's blocked tiles, so a captured object changes colour without a full rebuild. A `nullopt` set means a full `update()` (AdventureMapInterface.cpp 424-428; the nullopt callers are at CPlayerInterface.cpp:1565, Client.cpp:488 and GameplayReplayer.cpp:170, listed as call sites, not read).
- Level change: `onMapViewMoved` (248-262) returns early if the view and level are unchanged. If the level changed it stores the level and calls `update()` (255-258), a full rebuild. Otherwise it only redraws.
- AI turn: `setAIRadar(true)` shows an AI shield and drops the cache (`minimap.reset()`, 264-270). While the shield is up, `update()` returns early (240). `updateTiles` only patches when the cache exists (297 guard, read, no receipt). `setAIRadar(false)` disables the shield and then calls `update()` (271-276), so one full rebuild happens at the end of the other side's turn (AdventureMapInterface.cpp 436 and 447 for the start, 501 for the end).
- Input: `gesturePanning` (162-166), `clickPressed` (168-171) and `mouseDragged` (186-189) all call `moveAdvMapSelection` (151-160). That converts the widget pixel to a tile (`pixelToTile`, 124-136) and calls `adventureInt->centerOnTile` (154). Hover shows a status-bar help line (178-184).
- Viewport rectangle and icons: `showAll` (191-236) draws visible heroes at tile centres (210-223), then a dashed purple rectangle for the visible screen area, scaled from map units to widget pixels (227-234).
- Fit: the constructor (102-122) takes the longer map side over the longer widget side as `resize` (111), sizes the minimap from that, and centres the shorter side by an offset (113-118).

## 2. Key functions

- `getTileColor`: `/mnt/frankendom-donors/vcmi-vcmi/client/adventureMap/CMinimap.cpp` 36-67. Per-tile colour, fog, owner, terrain, in that order.
- `redrawMinimap` and `refreshTile`: CMinimap.cpp 69-83. Full pass and single-tile patch.
- `CMinimap` constructor: CMinimap.cpp 102-122. Letterbox fit.
- `pixelToTile` and `tileToPixels`: CMinimap.cpp 124-149. Widget pixel to tile (round), tile centre to pixel (+0.5).
- `moveAdvMapSelection`, `clickPressed`, `mouseDragged`: CMinimap.cpp 151-189. Click and drag recentre the main view.
- `showAll`: CMinimap.cpp 191-236. Hero icons and the viewport rectangle.
- `update`, `onMapViewMoved`, `setAIRadar`: CMinimap.cpp 238-277. Rebuild on level change, drop and rebuild around the AI turn.
- `getVisibleHeroes`: CMinimap.cpp 279-293. Lists heroes for in-game players (fog not checked here, see gaps).
- `updateTiles`: CMinimap.cpp 295-306. Batch patch of changed tiles.
- Tile data: `/mnt/frankendom-donors/vcmi-vcmi/config/terrains.json` 6-7 (dirt open and blocked colours). Schema: `/mnt/frankendom-donors/vcmi-vcmi/config/schemas/terrain.json` 97 and 108 (RGB triplet, 0-255).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One colour per tile: fog, then owner, then terrain | Fog colour `Colors::BLACK` (theirs, CMinimap.cpp 42; value not read). Terrain colours are data per terrain: dirt open 82,56,8 and blocked 57,40,8 (theirs, terrains.json 6-7). Neutral and player colours come from `graphics` (not read). |
| Patch only changed tiles, rebuild on level change or after the other side's turn | None (the rule). |
| Fit the longer side, centre the shorter | `resize` = longer map side / longer widget side (theirs, CMinimap.cpp 111). |
| Click maps widget pixel to tile | `std::round(mapSizes.x * dx)` (theirs, CMinimap.cpp 132). |
| Tile centre back to pixel | `stepX * (tile.x + 0.5)` (theirs, CMinimap.cpp 145). |
| Viewport rectangle scaled to the widget | Integer scale `screenArea.x * pos.w / mapSizes.x`, and width minus 1 px (theirs, CMinimap.cpp 229-233). |
| Hero icon centred on its tile | Icon centred by half its size (theirs, CMinimap.cpp 222). |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (fog, owner, terrain), the changed-tile patch, the full rebuild on level change, the drop and rebuild around the other side's turn, and the fit and viewport maths. It omits: the loop over several blocking objects per tile (one owner per tile here), the hero-skip flag, the visitable test (passed in as `blocked`), the settings lookup, all drawing, the hover text, the click handler and the hero icons. It changes one thing on purpose: `pixelToTile` uses `Math.floor`, not the donor's `std::round` (see gaps). The donor passes doubles to `Point` (the `Point` type was not read); the sketch truncates explicitly.

```ts
// Licence: GPL-2.0-or-later (donor; CMinimap.cpp header and license.txt). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Rgb = readonly [number, number, number];
const BLACK: Rgb = [0, 0, 0];

interface TileFacts {
  visible: boolean;                 // false = under fog of war
  owner: number | 'neutral' | null; // owner of an owned blocking object on the tile
  blocked: boolean;                 // blocked and not visitable
  openRgb: Rgb;                     // terrain colour, open
  blockedRgb: Rgb;                  // terrain colour, blocked
}

// One colour per tile, in donor order: fog, then owned object, then terrain.
function tileColour(t: TileFacts, ownerRgb: (player: number) => Rgb, neutralRgb: Rgb): Rgb {
  if (!t.visible) return BLACK;
  if (t.owner === 'neutral') return neutralRgb;
  if (typeof t.owner === 'number') return ownerRgb(t.owner);
  return t.blocked ? t.blockedRgb : t.openRgb;
}

// Tile centre on the widget (the donor's tileToPixels form).
function tileToPixel(tile: number, widgetPx: number, mapTiles: number): number {
  return Math.floor((widgetPx / mapTiles) * (tile + 0.5));
}

// Click or drag back to a tile. Fix: floor, not round (see gaps).
function pixelToTile(px: number, widgetPx: number, mapTiles: number): number {
  return Math.floor((px * mapTiles) / widgetPx);
}

// Letterbox: fit the longer side, centre the shorter one.
function fitSize(mapW: number, mapH: number, boxW: number, boxH: number) {
  const resize = Math.max(mapW, mapH) / Math.max(boxW, boxH);
  const w = Math.trunc(mapW / resize);
  const h = Math.trunc(mapH / resize);
  const side = Math.max(w, h);
  return { w, h, offX: Math.trunc((side - w) / 2), offY: Math.trunc((side - h) / 2) };
}

// Viewport rectangle on the minimap (integer maths, one pixel smaller on the far edges).
function viewportRect(view: { x: number; y: number; w: number; h: number }, box: { w: number; h: number }, mapW: number, mapH: number) {
  return {
    x: Math.trunc((view.x * box.w) / mapW),
    y: Math.trunc((view.y * box.h) / mapH),
    w: Math.trunc((view.w * box.w) / mapW) - 1,
    h: Math.trunc((view.h * box.h) / mapH) - 1,
  };
}

// Cache of one colour per tile on the current level.
class MinimapCache {
  private cells: Rgb[] | null = null;
  private level = 0;
  constructor(
    private readonly mapW: number,
    private readonly mapH: number,
    private readonly colourAt: (x: number, y: number, level: number) => Rgb,
  ) {}

  rebuild(): void {                       // full pass: level change, or after the other side's turn
    const cells: Rgb[] = [];
    for (let y = 0; y < this.mapH; y++)
      for (let x = 0; x < this.mapW; x++) cells.push(this.colourAt(x, y, this.level));
    this.cells = cells;
  }

  setLevel(level: number): void {
    if (level === this.level && this.cells) return;
    this.level = level;
    this.rebuild();
  }

  patch(changed: Array<{ x: number; y: number; level: number }>): void {
    if (!this.cells) return;              // dropped during the other side's turn; rebuilt when it ends
    for (const t of changed) {
      if (t.level !== this.level) continue;
      this.cells[t.y * this.mapW + t.x] = this.colourAt(t.x, t.y, this.level);
    }
  }

  dropForOtherTurn(): void { this.cells = null; }
  endOtherTurn(): void { this.rebuild(); }

  pixel(x: number, y: number): Rgb | null { return this.cells ? this.cells[y * this.mapW + x] : null; }
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/cm022-vcmi-minimap.ts`, exit 0.

## 5. Lands in

- TARGET `origins/client/minimap.ts` (new, client only, HUD). The cache and the pixel maths are pure functions; the tile colours come from zone data and the engine's ownership, never computed by the client. Parity-checklist row 14 (HUD). The batch hint said row 23; I used row 14 because a minimap is HUD and row 23 is spawn logic. Lead to confirm.
- Today: the Frankendom minimap state was not read (outside the donor and this folder).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: zone data and ownership come from the engine, the client only draws them); 7 (client-only HUD)

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not translated from the donor.
- Defect 1, click mapping. `pixelToTile` uses `std::round` (CMinimap.cpp 132) but `tileToPixels` draws at the tile centre (145). By the arithmetic of the two formulas, at 2 px per tile the centre pixel of tile t (2t+1) maps to round((2t+1)/2) = t+1, one tile off. This was derived, not run. Keep the idea (click or drag to recentre). Fix: use floor, then test the round trip at 1, 2 and 3 px per tile before shipping.
- Defect 2, naming. `getVisibleHeroes` (279-293) says "visible" but the loop adds every hero of every in-game player (285-289). Whether `cb->getHeroes` hides enemy heroes under fog was not read. Fix: apply the fog rule in the engine before the list is built, and make the name match the check.
- Risk 3, stale cache on a setting change. Hero colouring depends on `minimapShowHeroes` (line 55), but the cache is only rebuilt on the next patch or rebuild. The settings handler (AdventureOptionsTab.cpp 155-157) only stores the value as far as read. Fix: rebuild on that setting change.
- Risk 4, leaking hidden tiles to the client. Fog is black here because the client gets the fog state through its callbacks. Frankendom must not send hidden zone tile data to the client just to colour the minimap; send only the visible set, and let the server decide what is visible.
- Risk 5, stale owner colour. Owner changes repaint only the object's blocked tiles (CPlayerInterface.cpp 1428-1430). A new object kind that changes owner without that call stays the old colour until a full rebuild.
- Risk 6, full rebuild cost. `nullopt` triggers a full `update()` over every tile (AdventureMapInterface.cpp 424-428). Fine for a zone-sized map; not read for larger ones.
- Not applicable to the Pit. The Pit is a fixed arena and has no map to minimap. Minimap is world-zone only.
- The hero-icon, viewport and hover parts are plain drawing and do not need the donor's code. Only the cache, the patch and the pixel maths transfer.

Best transferable idea: keep one cached colour per tile, patch only the tiles a fog or ownership event changed, and rebuild in full only on a level change or after the other side's turn.
Decision (proposed): adapt - the cache, the changed-tile patch and click-to-recentre fit a zone minimap, but the colours must come from zone data and engine ownership, the fog set must be the server's visible set, and the donor's round() click mapping must be fixed.
Acceptance: in a world zone the minimap shows unexplored tiles black and owned camps in their owner colour, and tapping a point on it moves the world camera to that tile; a client test that patches N changed tiles changes exactly those N cached cells.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 1 (one engine, zone data, ownership from the engine); 7 (client-only HUD)
