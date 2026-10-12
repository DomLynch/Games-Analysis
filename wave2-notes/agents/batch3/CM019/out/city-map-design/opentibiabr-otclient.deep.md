# opentibiabr-otclient (city-map-design, cell 2)

Donor: `/mnt/frankendom-donors/opentibiabr-otclient/src/client/minimap.cpp` | Licence: MIT (LICENSE line 1: "OTClient is made available under the MIT License") | C++ | symbols `Minimap::updateTile`, `MinimapBlock::update`, `Map::findPath`

Checked: Read in full: `minimap.h` (flags, record, block class, store), `minimap.cpp` 20-240 (block update, draw, coordinate maps, `Minimap::updateTile`), `uiminimap.cpp` 36-72 (draw choice and zoom), `map.cpp` 118-132 (tile feed), 450-462 (tile removal feed), 895-1012 (`Map::findPath` goal check, neighbour loop, cost), 1206-1217 (`getMinimapColor`), `const.h` 150-161 (Direction enum), `towns.h` (whole file). `mapio.cpp`: guard and town/waypoint loader read only through grep hits (23, 193-224). Callers of `Minimap::updateTile`: `map.cpp` 129 and 458 (grep). Callers of `Minimap::getTile`: `map.cpp` 915, 964, 1073, 1213, 1454 (grep). Not read: `Map::newFindPath` (1050, async variant), `findEveryPath` (1354), `Tile::getMinimapColorByte` (`tile.cpp`), `Map::isAwareOfPosition`, the satellite map (`satellitemap.cpp`), and the spin-lock threading. Confidence: high on the record, block and cost mechanics; medium on the zoom and draw path (draw read in full, texture upload not read). Camera scope: not applicable.

City-map topics: this donor's client runtime has no town layout, road or building grammar, hub or service placement, or landmark signage. Town (temple position) and waypoint records are read only by the editor build (`mapio.cpp` 23 guard; `towns.h` 25 guard, temple at 47). So the only transferable city-map part here is the minimap and its memory.

## 1. Mechanism

- Store: one remembered record per tile, kept in 64 x 64 blocks, one block map per floor (`minimap.h` 29, 130). A record has a flags byte (seen 1, not pathable 2, not walkable 4; flag 8 is defined but not set in the code read), a colour byte (default 255, meaning no colour), and a speed byte (default 10, read back as speed x 10 at `minimap.h` 46-48).
- Feed: a live item change on a tile calls `Minimap::updateTile(pos, getTile(pos))` (`map.cpp` 128-129). A removed tile with no object left calls `updateTile(pos, nullptr)` (458).
- Record build (`minimap.cpp` 185-202): with a live tile, colour comes from the tile (187), the seen flag is set (188), not-walkable and not-pathable are set from the tile (189-192), and speed is `ceil(ground speed / 10)` capped at 255 (193). With no tile, the record is "not walkable and not pathable" with no colour (195). A record equal to the default is not stored (198). Otherwise it goes into its block (201), and the block is marked as seen (202).
- Block write (`MinimapBlock::updateTile`, `minimap.cpp` 73-79): the block's picture is marked for rebuild only when the colour changes (75-76). Flag or speed changes do not rebuild the picture.
- Draw (`minimap.cpp` 94-137): the view is a rectangle around the camera position, scaled. Blocks are drawn only if one block is at least one pixel wide (105). For each visible block, `block.update()` rebuilds its 64 x 64 image only when it is marked (124). Uncoloured tiles are black (56). The texture is built only if at least one tile is coloured (65). Each block is drawn as a textured rectangle of 64 x scale.
- Zoom (`uiminimap.cpp` 49-70): scale starts at 1. For zoom below zero it divides by 2 to the power of |zoom| (63). For zoom above zero it multiplies by 2 to the power of |zoom| (65). Zoom is clamped between the widget's min and max.
- Draw choice (`uiminimap.cpp` 41-46): the satellite map is used if satellite mode is on and chunks exist for the floor (41). Otherwise the static minimap from the satellite map (43-44), otherwise this minimap (46).
- Path search reads the same records (`Map::findPath`, header 869, body 895-1012). The goal test uses the live tile when the map is aware of it (909-913), else the record (915). For each neighbour: the live tile when aware (955), else the record: seen flag (965), walkable and pathable flags (966-967), and if either blocking flag is set, seen is forced true (968-969). Speed is the record's speed x 10 (970). Unseen tiles are skipped unless the flag allows them (975 and 986). Blocked tiles that count as seen are skipped by the walk filters.
- Step cost (994-1000): `cost = parent cost + speed x weight / 100`. Weight is 3 for a diagonal step and 1 for a straight one (996, 998). A diagonal is any direction from `NorthEast` on (the enum is at `const.h` 150-161).
- Colour fallback (`map.cpp` 1206-1217): `getMinimapColor` takes the live tile's colour byte first, and uses the record's colour only if that is 0.

## 2. Key functions

- `Minimap::updateTile`: `/mnt/frankendom-donors/opentibiabr-otclient/src/client/minimap.cpp` 183-203. Record build and store.
- `MinimapBlock::updateTile`: `/mnt/frankendom-donors/opentibiabr-otclient/src/client/minimap.cpp` 73-79. Colour-only rebuild flag (75-76).
- `MinimapBlock::update`: `/mnt/frankendom-donors/opentibiabr-otclient/src/client/minimap.cpp` 43-70. Image build, black for uncoloured, texture only if coloured (56, 65).
- `Minimap::draw`: `/mnt/frankendom-donors/opentibiabr-otclient/src/client/minimap.cpp` 94-137. Sub-pixel guard (105) and lazy rebuild (124).
- `UIMinimap` zoom: `/mnt/frankendom-donors/opentibiabr-otclient/src/client/uiminimap.cpp` 49-70 (scale at 63 and 65).
- `Map::findPath`: `/mnt/frankendom-donors/opentibiabr-otclient/src/client/map.cpp` 869 (header); memory fallback 915, 955-986; cost 994-1000.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Remember a tile's last seen state as a small record | Flags 1 / 2 / 4 (theirs, minimap.h 35-37) |
| Blocks of tiles, rebuilt only when the picture changes | 64 tiles per side (theirs, minimap.h 29); rebuild on colour change (minimap.cpp 75) |
| Missing tile is remembered as blocked, not as an empty tile | Blocked-no-colour record (theirs, minimap.cpp 195) |
| Path cost = speed x direction weight / 100 | Diagonal weight 3, straight 1, divisor 100 (theirs, map.cpp 996-1000) |
| Speed stored in a byte in units of 10 | Default 10 (theirs, minimap.h 46); x10 read-back (minimap.h 48); ceil(ground / 10) (minimap.cpp 193) |
| Zoom in powers of two | Base 2 (theirs, uiminimap.cpp 63-65) |
| Draw skipped below one pixel per block | 1 px threshold (theirs, minimap.cpp 105) |

## 4. TypeScript sketch

simplified: keeps the record shape (seen, not-walkable and not-pathable flags, colour, speed in units of 10), the block store with the colour-only rebuild flag, the step cost with diagonal weight 3, the power-of-two zoom and the sub-pixel block test. It omits: the per-floor store and the 65536 block indexing (the sketch uses 64-tile blocks and local offsets only), the spin-lock and threaded reads, the image and texture build, the screen coordinate maps, the satellite and static minimap paths, the `.otmm` save and load, the creature and non-pathable neighbour rules of the path search, and the goal-tile test. It reorders nothing: the rebuild flag is set before the record is stored, as the donor does. It takes the live tile as an input rather than reading the map.

```ts
// Licence: MIT (donor). Adaptable; this sketch is written fresh from the described mechanism.
const BLOCK = 64;                        // tiles per side of one memory block
const FLAG_SEEN = 1;
const FLAG_NOT_PATHABLE = 2;
const FLAG_NOT_WALKABLE = 4;

// One remembered record per tile. speed is stored in units of 10 (ceil of ground speed / 10).
interface TileRecord { flags: number; color: number; speed: number; }
const EMPTY: TileRecord = { flags: 0, color: 255, speed: 10 };

interface LiveTile { colour: number; walkable: boolean; pathable: boolean; groundSpeed: number; }

export function recordFromLive(t: LiveTile | null): TileRecord {
  if (t === null) {
    // a tile that is not there is remembered as blocked, with no colour and not seen
    return { flags: FLAG_NOT_WALKABLE | FLAG_NOT_PATHABLE, color: 255, speed: 10 };
  }
  let flags = FLAG_SEEN;
  if (!t.walkable) flags |= FLAG_NOT_WALKABLE;
  if (!t.pathable) flags |= FLAG_NOT_PATHABLE;
  const speed = Math.min(255, Math.ceil(t.groundSpeed / 10));
  return { flags, color: t.colour, speed };
}

export class MemoryBlock {
  private tiles: TileRecord[] = Array.from({ length: BLOCK * BLOCK }, () => ({ ...EMPTY }));
  dirty = true; // the picture needs a rebuild only when a colour changed

  set(x: number, y: number, r: TileRecord): void {
    const i = (y % BLOCK) * BLOCK + (x % BLOCK);
    if (this.tiles[i].color !== r.color) this.dirty = true; // flags and speed do not change the picture
    this.tiles[i] = r;
  }

  get(x: number, y: number): TileRecord {
    return this.tiles[(y % BLOCK) * BLOCK + (x % BLOCK)];
  }
}

// Path step cost from a remembered record. Ground speed (x10) times a direction weight, over 100.
export function stepCost(parentCost: number, rec: TileRecord, diagonal: boolean): number {
  const speed = rec.speed * 10;          // donor getSpeed()
  const walkFactor = diagonal ? 3 : 1;
  return parentCost + (speed * walkFactor) / 100;
}

// Zoom in or out by powers of two. zoom 0 is scale 1.
export function zoomScale(zoom: number): number {
  return zoom < 0 ? 1 / (1 << Math.abs(zoom)) : (1 << Math.abs(zoom));
}

// Blocks are drawn only when one block is at least a pixel wide.
export function blockDrawable(scale: number): boolean {
  return BLOCK * scale > 1;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/CM019-otclient-minimap-memory.ts` (with `export {}`): exit 0.

Best transferable idea: Keep a small per-tile memory record (seen, blocked, colour, speed) that the minimap draws and the path search reads when the live tile is not known, so one record serves both the map and the route cost.

Decision (proposed): adapt - take the one-record, two-readers shape and the colour-only rebuild flag for the zone minimap and for route cost on the client; store the exact ground speed instead of the ceil-to-10 byte (fix below); keep it client-side because the HUD is client-only, and do not copy the 65536 per-floor indexing, since zones are smaller than that.
Acceptance: The zone minimap shows only tiles the player has seen, and a headless test asserts that a route query over never-seen tiles returns no path unless the allow-unseen flag is set, and that a diagonal step costs three times a straight step at the same ground speed.

## 5. Lands in

- TARGET `origins/client/minimap-memory.ts` (new, proposed path; the Frankendom repo layout was not read). Client HUD only. Not in `src/fight/`.
- Parity-checklist row 14 (HUD), the minimap. The route-cost reuse is an AI concern (row 2); it is not cited here because the note needs one row.
- Reuse tag: rewrite-from-idea (MIT; code may be adapted, the sketch is written fresh)
- Brief rule served: camera/HUD/sound are client-only (ruling); one engine (the route cost reads the same records the map uses, not a second grid).

## 6. Gaps and risks

- Defect (fix): speed is stored as `ceil(ground speed / 10)` in a byte (minimap.cpp 193) and read back as x 10 (minimap.h 48, map.cpp 970). A remembered tile can cost up to 9 units more than the same live tile, which uses the exact ground speed (map.cpp 961). Fix: store the raw speed in a 16-bit field, or round the live tile the same way so both branches agree. The sketch stores the quantised value to match the donor; change it before use.
- Efficiency (not a defect): `MinimapBlock::update` allocates a new image on every rebuild (minimap.cpp 48). Fix: reuse one image per block.
- Defect risk, not confirmed: a remembered blocked tile is marked seen (map.cpp 968-969), so a blocked tile is treated as known for the goal and neighbour filters. Fine for routing; check it against a Frankendom rule that treats an unknown tile as blocked by default.
- Per-floor store and 65536 indexing are donor-specific. Frankendom zones are data; use zone bounds instead.
- The route cost is not a combat mechanism. It is a shape to reuse for the client only if a fight or travel feature needs client-side route previews. Server routes are not in this donor.
- Not in this donor: town layout, road or building grammar, hub or service placement, landmark signage (all editor-only or absent). Those topics are NONE for this donor's client runtime.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
CLEAN
- MinimapTileEmpty (flag 8) is consumed at map.cpp:1124 (hasFlag), so it is not dead; the note's 'not set in code read' is honest, the reader is in unread findEveryPath.
