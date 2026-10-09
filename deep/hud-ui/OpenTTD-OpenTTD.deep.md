# OpenTTD-OpenTTD (hud-ui, cell 16)

Donor: /mnt/frankendom-donors/OpenTTD-OpenTTD/src/smallmap_gui.cpp | Licence: GPL-2.0 | C++ | symbol SmallMapWindow::DrawSmallMapColumn / DrawVehicles

## 1. Mechanism

- Runs as the small-map window's paint pass (`SmallMapWindow::DrawSmallMapColumn` and `DrawVehicles`), called from `DrawSmallMap` (lines 1066-1126) when the window redraws, not on a game tick (the caller of `DrawSmallMap` is not read).
- Input: the map tile grid, the window's scroll position and zoom, the current map type (contour, vehicles, link stats, and others), and the list of vehicles and towns.
- Terrain: the map is drawn in diagonal columns. Each screen pixel maps back to a tile; each tile block (zoom by zoom tiles) is coloured by `GetTileColours`, which picks the most important tile in the block (by tile type: for example a tunnel or bridge beats plain land) and returns its colour for the given map type. `GetTileColours` (1330-1404) remaps a tunnel or bridge to rail, road or water by transport type before the pick, and in the Industries view an industry that is shown returns its own colour at once, beating the importance table.
- Vehicles: every vehicle is visited once. Effects and hidden or unclickable vehicles are skipped. Its tile position is remapped to flat coordinates, clipped to the window, and drawn as one or two pixels, coloured by vehicle type in the vehicles view and white otherwise.
- After the terrain pass `DrawSmallMap` (1110-1125) also draws vehicles for the contour and vehicles views, the link-stat overlay, town names, industry names and map indicators (those helpers other than vehicles are not read). Output: pixels into the window buffer only. No state change.

## 2. Key functions

- `SmallMapWindow::DrawSmallMapColumn`, `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/smallmap_gui.cpp`, lines 917-950. One column of tile colours into the buffer.
- `SmallMapWindow::DrawVehicles`, same file, lines 957-989. Walks all vehicles, remaps, clips, and draws 1-2 pixels.
- `SmallMapWindow::DrawSmallMap`, same file, lines 1066-1126. Fills the background, walks the diagonal columns from the top-left tile and calls the column draw; then vehicles (contour and vehicle views), link stats, towns, industry names, indicators.
- `SmallMapWindow::RemapTile`, same file, lines 1134-1146, with `SmallmapRemapCoords` at lines 667-673. Tile to flat window coordinates: x is twice (y minus x), y is their sum; negative offsets round towards minus infinity when zoomed.
- `SmallMapWindow::GetTileColours`, same file, lines 1330-1404. Picks the most important tile in a zoom block (importance table at 399-411) and returns its colour for the map type.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Map a world cell into a diagonal screen grid, colour it by its most important occupant | Diagonal remap via `SmallmapRemapCoords` (theirs) |
| Zoom: one screen cell covers `zoom` by `zoom` world cells, rounded towards minus infinity | Importance table values 1-9 (lines 399-411) (theirs); zoom levels not read |
| Clip a dot to the window, drawing one pixel at the edge | Two-pixel dot, x offset `- 3` plus the sub-scroll (line 970) (theirs) |
| Colour by entity type from a fixed table | `_vehicle_type_colours` table (theirs) |

## 4. TypeScript sketch

simplified: `cellColour` returns the winning tile's own colour; the donor passes the winner and its type to a per-map-type colour function and special-cases industries; the tunnel/bridge remap, freeform-edge handling, the blitter and the scroll/clip offsets are omitted.

```ts
// Licence: GPL-2.0 - clean-room sketch, no lines translated
// Clean-room: a minimap cell coloured by its most important occupant, and a remap from world cell to flat screen point.
// Kinds follow the donor's tile types. A tunnel or bridge is not its own kind: the caller counts it as rail,
// road or water by its transport type before the pick (as the donor does in its colour pick).
type Tile = { kind: 'clear' | 'rail' | 'road' | 'house' | 'trees' | 'station' | 'water' | 'void' | 'industry' | 'object'; colour: number };
// Importance table (higher shows on top), the donor's `_tiletype_importance` (`smallmap_gui.cpp` 399-411):
// station 9, rail 8, road 7, industry 6, house 5, clear/trees/water/object 2, void 1.
const IMPORTANCE: Record<Tile['kind'], number> = { station: 9, rail: 8, road: 7, industry: 6, house: 5, clear: 2, trees: 2, water: 2, object: 2, void: 1 };

// One minimap cell covers zoom by zoom world cells; the most important tile decides its colour.
function cellColour(tiles: Tile[]): number {
  let best = tiles[0];
  for (const t of tiles) if (IMPORTANCE[t.kind] > IMPORTANCE[best.kind]) best = t;
  return best.colour;
}

// World cell to flat screen point; negative offsets round towards minus infinity when zoomed.
function remap(tileX: number, tileY: number, scrollX: number, scrollY: number, zoom: number) {
  let ox = tileX - scrollX;
  let oy = tileY - scrollY;
  if (zoom > 1) {
    if (ox < 0) ox -= zoom - 1;
    if (oy < 0) oy -= zoom - 1;
    ox = Math.trunc(ox / zoom);
    oy = Math.trunc(oy / zoom);
  }
  return { x: (oy - ox) * 2, y: oy + ox }; // SmallmapRemapCoords, lines 667-672
}

// Dot for a moving entity: skipped when outside the panel; one pixel at the edge, two inside.
function dotFor(x: number, y: number, panelWidth: number, panelHeight: number): { x: number; y: number; pixels: number } | null {
  const px = x - 3; // the donor also subtracts the sub-scroll and the clip origin
  if (y < 0 || y >= panelHeight || px < -1 || px >= panelWidth) return null;
  // donor: x == -1 steps to 0 and draws one pixel there; x == width-1 draws one pixel
  if (px === -1) return { x: 0, y, pixels: 1 };
  return { x: px, y, pixels: px === panelWidth - 1 ? 1 : 2 };
}
```

## 5. Lands in

- Frankendom target: `src/fight/hud.ts` (minimap panel and dots), parity checklist row 14 (HUD); today: `src/hud.ts` (moving). The cell source (tile kinds and their order) comes from zone data (zones as data), not from the HUD.
- Reuse tag: rewrite-from-idea (GPL-2.0, clean-room sketch only).
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- The minimap reads the world grid directly; Frankendom zones are data, so the cell source must come from zone data with defaults for every tile kind.
- Entities are read from the live game state each paint. In Frankendom, the minimap may show only what the server has verified (no hidden or unclickable ghosts unless the zone says so).
- The importance table is a donor rule for which tile shows on top. Frankendom would need its own order, set by zone data.
- No cache: each paint walks all vehicles and every visible cell. Fine for one map; a large zone may need a cached cell layer.
- Entirely client-side; no effect on fight or kill authority.
