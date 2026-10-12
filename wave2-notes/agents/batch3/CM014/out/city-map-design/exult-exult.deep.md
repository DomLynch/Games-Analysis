# exult-exult (city-map-design, cell 1)

Donor: `/mnt/frankendom-donors/exult-exult/gamemap.cc` (bake: `Game_map::create_minimap` 1668-1681, `Game_map::write_minimap` 1690-1745), consumer `/mnt/frankendom-donors/exult-exult/cheat.cc` (1205-1340) | Licence: GPL-2.0-or-later (as read: gamemap.cc header lines 12-13, "either version 2 of the License, or (at your option) any later version"; COPYING is GPL version 2, June 1991) | C++ | symbol `Game_map::write_minimap`

Checked: Read in full: gamemap.cc 1664-1745 (the bake) and palette.cc 486-503 (nearest colour). Read for the consumer: cheat.cc 302-306 (cheat flag), 1205-1340 (map frame, paint, marker, teleport inverse). Not read: how `get_rendered_flats` builds its pixels (only the accessors at objs/chunks.h:228 and objs/chunkter.h:95), `Write1` (pointer advance assumed from its use, not read), the `Shape_frame` constructor, the `sprites/cheatmap` fallback art, the `Cheat_map` class lines outside the paths cited. Confidence high on the bake and the marker/teleport arithmetic; medium on what the averaged pixels contain. The topic's road, building, hub, landmark and signage grammar is not in this donor: a grep for landmark, procedural, city, road and signpost in the .cc/.h tree found no city code; the hits were GUI option files and words that contain those strings (for example "opacity" contains "city"). Camera scope: n/a.

## 1. Mechanism

The donor has two halves: an offline bake that turns every terrain block into one palette colour, and an in-game cheat map that draws the player on that picture and maps clicks back to tiles.

Bake (`write_minimap`, run from the map-editor key `WRITE_MINIMAP`, keys.cc:187, action keyactions.cc:817-819):
1. Each terrain block type (a 16 x 16 tile block, shared by all maps) gets one palette index. For each type the code sums R, G and B over every pixel of its rendered flats and divides by the pixel count (gamemap.cc 1705-1722). The mean is then snapped to the nearest palette entry (1723; palette.cc 490-497), searching only indices below 224 (0xe0, palette.h:111), so the top palette range is never picked.
2. For each loaded map, a 192 x 192 byte grid is filled: each block cell reads its terrain type from `terrain_map[cx][cy]` and copies that type's index (gamemap.cc 1670-1676). One byte per block; 192 blocks per side is 12 x 16 (exult_constants.h:31-34).
3. Each map's grid becomes one shape frame (1677-1680), and all frames are written to `patch/minimaps.vga` (1726-1742; path fnames.h:157).

Consumer (`Cheat_map`, cheat.cc 1221-1232, paint 1275-1288):
4. The frame for the current map is loaded from the patch file (1222-1225). If the file is missing, the code uses `sprites/cheatmap` (1227-1229). `Cheat_map` is built in one place only, inside `map_teleport` (1311).
5. The frame is painted at its own origin (1275). The player's tile is projected with `xx = ((tx * (w - 4)) / 3072) + 2` (1282-1286; 3072 = 16 x 192 tiles, 1206). A plus-shaped marker in palette colour 50 is drawn at that pixel: a 1 x 5 bar and a 5 x 1 bar (1287-1288).
6. Click-to-teleport (`Cheat::map_teleport`, 1303) returns at once when the cheat flag is off (1304-1305; the flag comes from config/gameplay/cheat, 304-305). Otherwise it inverts the same scale: `tx = ((px - 2 + 0.5) * 3072) / (w - 4)` (1332-1336), then wraps modulo the world size (1338-1339).

## 2. Key functions

- `Game_map::create_minimap`: `/mnt/frankendom-donors/exult-exult/gamemap.cc` 1668-1681. Fills one 192 x 192 grid for one map from the shared per-type colour table.
- `Game_map::write_minimap`: `/mnt/frankendom-donors/exult-exult/gamemap.cc` 1690-1745. Computes one colour index per block type (1704-1724), calls `create_minimap` for each map (1729-1738), writes the file (1740-1742).
- `Palette::find_color`: `/mnt/frankendom-donors/exult-exult/palette.cc` 486-503. Nearest palette entry by squared RGB distance, searching indices below `last` (default 0xe0, palette.h:111).
- `Cheat_map` projection and marker: `/mnt/frankendom-donors/exult-exult/cheat.cc` 1275-1288.
- `Cheat::map_teleport` inverse: `/mnt/frankendom-donors/exult-exult/cheat.cc` 1303-1340 (the inverse at 1332-1339).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| One colour per block type = mean of its pixels, snapped to the nearest palette entry | Search limit 224 (0xe0, palette.h:111) keeps the rotating palette colours out of the search (palette.cc 489 comment) |
| Grid of one byte per block, indexed by the block's terrain type | 192 blocks per side (12 x 16, exult_constants.h:34); 16 tiles per block (exult_constants.h:31) |
| Tile to pixel scale over the whole world | World span 3072 tiles = 16 x 192 (cheat.cc:1206) |
| Marker border | 2 px (cheat.cc:1205) |
| Marker shape | Plus of two bars, 5 px long each way from the centre, colour 50 (cheat.cc:1287-1288) |
| Pixel to tile (inverse) | Centre of the pixel, wrapped to the world (cheat.cc:1335, 1339) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (per-type mean, snap below the reserved palette range, one byte per block, then tile-to-pixel and back). It fixes one donor defect: the marker is scaled by (w - 4) and offset by 2 px, but the grid is painted at its own origin (cheat.cc:1275, 1282-1286), so the sketch uses one scale and no border. It omits the rendered-flats input (it takes pixel arrays), the palette file and brightness setting, the Flex file writer, the per-map loop, the `sprites/cheatmap` fallback, the cheat gate and the marker drawing. The palette snap is kept only because the donor stores palette indices; a Frankendom build would store RGB and skip it.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const TILES_PER_BLOCK = 16;      // donor: c_tiles_per_chunk (exult_constants.h:31)
const BLOCKS_PER_SIDE = 192;     // donor: c_num_chunks = 12 * 16 (exult_constants.h:34); zone data in Frankendom
const PALETTE_SEARCH_END = 224;  // donor: find_color default last = 0xe0 (palette.h:111)
export const WORLD_TILES = TILES_PER_BLOCK * BLOCKS_PER_SIDE;

type Rgb = [number, number, number];

// Step 1: one palette index per block type = nearest palette entry to the mean colour of its pixels.
export function bakeTypeIndex(pixels: Rgb[], palette: Rgb[]): number {
  if (pixels.length === 0) throw new Error("block type has no pixels");
  let r = 0;
  let g = 0;
  let b = 0;
  for (const [pr, pg, pb] of pixels) { r += pr; g += pg; b += pb; }
  const n = pixels.length;
  const mr = Math.floor(r / n);
  const mg = Math.floor(g / n);
  const mb = Math.floor(b / n);
  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < PALETTE_SEARCH_END && i < palette.length; i++) {
    const [pr, pg, pb] = palette[i];
    const d = (mr - pr) ** 2 + (mg - pg) ** 2 + (mb - pb) ** 2;
    if (d < bestDist) { best = i; bestDist = d; }
  }
  return best;
}

// Step 2: one byte per block of one zone, from the block-type grid (flat, row-major, BLOCKS_PER_SIDE squared).
export function bakeZoneGrid(typeGrid: number[], typeIndex: number[]): Uint8Array {
  const out = new Uint8Array(BLOCKS_PER_SIDE * BLOCKS_PER_SIDE);
  for (let i = 0; i < out.length; i++) out[i] = typeIndex[typeGrid[i]];
  return out;
}

// Step 3 (fixed): one scale for paint and marker, no border offset.
// Donor: marker scaled by (w - 4) and offset by 2 px while the grid is painted at its own origin (cheat.cc:1275, 1282-1286).
export function tileToPixel(tile: number, mapPx: number): number {
  const t = ((tile % WORLD_TILES) + WORLD_TILES) % WORLD_TILES;
  return Math.floor((t * mapPx) / WORLD_TILES);
}

// Inverse for click-to-travel: pixel centre back to a wrapped tile. The server must still verify the destination.
export function pixelToTile(px: number, mapPx: number): number {
  const t = Math.floor(((px + 0.5) * WORLD_TILES) / mapPx);
  return ((t % WORLD_TILES) + WORLD_TILES) % WORLD_TILES;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (run on this file).

## 5. Lands in

- TARGET `origins/client/hud/minimap.ts` (proposed path; not verified against the Frankendom repo): a client-only minimap. The bake runs at content-build time from zone data; the marker is client-only and the position it shows comes from server state.
- Parity-checklist row 14 (HUD). The cell hint said row 23, but row 23 covers spawn caps, respawn and despawn, which this donor's minimap does not touch, so row 14 is cited.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: zones as data (the bake reads one block grid per map); client-only HUD; no state change from the map

## 6. Gaps and risks

- The donor's pixel is the mean of a block's ground (rendered flats) only, so roads, buildings, walls and water edges blur into one tint per block type. A city map needs its own marks (road, building, landmark, service) drawn over the block colours. The donor has none (see Checked).
- Two block types with near-equal means snap to the same palette index and become indistinguishable on the map. The sketch keeps this limit; a Frankendom bake should store RGB per type or a type id.
- Defect (scale mismatch): the marker is placed with (w - 4) scale and a 2 px border (cheat.cc 1282-1286), but the map is painted at its own origin with no border (1275). By the arithmetic, the marker sits about 2 px right of the content at the left edge (tile 0 gives x = 2 while block 0 starts at 0) and about 2 px left of it at the right edge. Not checked on screen. fix: paint the grid and place the marker with one scale and no border (the sketch does this). The idea is kept.
- Teleport is cheat-only in the donor (cheat.cc 304-305, 1304). Frankendom must not let the map move the player without a server-accepted destination (server-verified positions ruling).
- Not read: whether transparent pixels are excluded from the mean in `get_rendered_flats`. If they are not, the block colour is biased by the transparent index. Check before porting.
- `Write1` is assumed to advance the pointer (gamemap.cc 1723 uses it as a cursor); not read.
- The donor is a 1990s palette-indexed format (Flex/VGA shapes, 256 colours). Frankendom should keep the idea (bake from data, one scale) and drop the palette and file format.

Best transferable idea: Bake each zone's minimap once from zone data by reducing each block type to one colour, then project the player's tile with a single scale and invert the same scale for click-to-travel.

Decision (proposed): adapt - zones are data, so a bake from block types keeps the minimap in step with them; the averaged ground tint is too coarse to show roads or buildings, so that layer is ours to add; the palette snap and the cheat-gated teleport are donor-era and not kept.
Acceptance: a player opens the map and sees each zone block in its type colour with a plus on their own block; a server test asserts that tileToPixel then pixelToTile lands within one block (16 tiles) of the start for every tile of a zone, and that a map teleport is refused unless the server accepts the destination.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: zones as data (one block grid per map from zone data); client-only HUD; server-verified positions for any teleport
