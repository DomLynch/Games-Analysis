# veloren-veloren (city-map-design, cell 20)

Donor: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/hud/minimap.rs` | Licence: GPL-3 | Rust | symbol `VoxelMinimap` | input line 49 verified: `pub struct VoxelMinimap` at 49. The methods read: `maintain` (241-379), `composite_layer_overhead` (113-156), `composite_layer_slice` (92-111), `add_chunks_near` (158-213). The widget `MiniMap` (410) is outside this cell.

## 1. Mechanism

- A top-down minimap of the voxel world around the player, kept as a set of per-chunk "columns". Inputs: the client's terrain chunks (voxel blocks), the changed-block set, the player's position, and the slow job pool (background work). Output: a 256 x 256 picture of the area around the player, with the roof cut off at the player's height.
- Each chunk is turned once into a column (`MinimapColumn`, 38-47) of layers, one layer per vertical level, each a 32 x 32 grid of (colour, filled) cells, plus the colour and filled flag of the block just above and just below the chunk. In overhead mode (the one in use), for a cell and a level the search looks downward from that level: solid blocks met before any air are counted (at most 12 are passed; the search stops past that, "don't penetrate too far into ground"), and the colour is the first solid block met after at least one air block (121-133); if none, black. "Filled" is true if the block at that level is solid, or missing, and is not leaves or wood, so trees do not cut a roof (140-150).
- Chunks are built in a background job, keyed by chunk position, only for chunks inside the 256-unit window around the player and missing or flagged for rebuild (`add_chunks_near`, 158-213). A chunk is flagged for rebuild when a modified block changed between terrain and non-terrain (`add_chunks_to_replace`, 215-228). Chunks outside the window plus one chunk are dropped (`remove_chunks_far`, 230-239).
- `maintain` (241-379): reads the player's position, computes the window's chunk origin from the position less half the window (248-251), flags, adds and removes chunks, then finds the "ceiling offset": looking in the column at the window centre, the first level at or above the player's height that is filled at the player's cell; 1 if the chunk has a solid block above its top, the largest value if open sky, and 0 if that chunk is not loaded (260-308). The picture is recomposed only when the chunk position, the player's height, the ceiling offset or the chunk set changed (309-313). Each of the 256 x 256 pixels takes its colour from the layer at (player height + ceiling offset) in its chunk, clamped to the top layer, with black if the ceiling is below the chunk's bottom (so cave interiors do not show the forest) and the above or below colour as a fallback (316-369). The image is flipped vertically and the graphic replaced (365, 371-377). The picture is cut at the ceiling, so a roof over the player does not hide the streets.
- Tick: per client frame (`maintain`; its caller is not read). Chunk builds are queued, not synchronous. The first build draws from a half-transparent black image (alpha 64, 63-67).

## 2. Key functions

- `VoxelMinimap::maintain`: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/hud/minimap.rs` 241-379. Window origin from the player's position, chunk add and replace, far-chunk removal, ceiling offset.
- `VoxelMinimap::add_chunks_near`: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/hud/minimap.rs` 158-213. Window test per chunk; job spawn for a missing or changed chunk.
- `VoxelMinimap::composite_layer_overhead`: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/hud/minimap.rs` 113-156. Per-level grid: the colour of the first solid block met after air when looking down from the level, a cap of 12 solids passed, plus a filled flag.
- `VoxelMinimap::add_chunks_to_replace` / `remove_chunks_far`: same file, 215-228 / 230-239. Rebuild flag on terrain change; drop far chunks.
- `VoxelMinimap::composite_layer_slice`: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/hud/minimap.rs` 92-110 (the other mode; not used, `MODE_OVERHEAD` is true at 176). Weighted colour blend over six blocks.
- `VoxelMinimap::block_color`: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/hud/minimap.rs` 82-89. Block colour, water a fixed blue.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Minimap window around the viewer, in chunks, rebuilt as the viewer moves | Window 256 x 256 (theirs, `VOXEL_MINIMAP_SIDELENGTH`, line 59) |
| Precompute per chunk, per level; the viewer's level picks the layer | Chunk size 32 x 32 cells (theirs, lines 94 and 115) |
| Overhead colour: first solid seen from above, stop after a count | Solid cap 12 (theirs, line 136) |
| Leaves and wood do not cut a roof | Block kinds leaves, art leaves, wood (theirs, line 148) |
| Ceiling cut: first level at or above the viewer that is filled | Mechanism; uses the player's height |
| Background build keyed by chunk, rebuilt on change | Slow job pool (theirs) |
| Water a fixed blue | RGB 119, 149, 197 (theirs, line 87) |

## 4. TypeScript sketch

simplified: the sketch has `overheadCell` (per cell, with the donor's solid-then-air rule), `ceilingLevel` and `inWindow`. `ceilingLevel` returns the column length for no roof, where the donor returns 1 for a solid block above the chunk and the largest value for open sky, and it takes a column of cells where the donor indexes the layer at the player's height. Omitted: the build job, chunk replacement and removal, the black-below-chunk rule, the vertical flip, redraw-only-on-change, the slice mode and the above and below colours. `inWindow` follows the donor's strict less-than test but takes the half-width in chunks as a parameter.

```ts
// Licence: GPL-3 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Cell = { colour: string; filled: boolean };
type Column = Cell[][][];               // [level][x][y], built once per chunk

// Overhead colour for one cell: look down from the level; pass at most `cap` solids before the first air,
// then take the first solid met after air. Missing colour is black.
function overheadCell(blocksDownFromLevel: (string | null)[], cap: number, filledHere: boolean): Cell {
  let seenSolid = 0;
  let seenAir = 0;
  let colour: string | null = null;
  for (const b of blocksDownFromLevel) {
    if (b !== null) {
      if (seenAir > 0) { colour = b; break; }
      seenSolid++;
    } else {
      seenAir++;
    }
    if (seenSolid > cap) break;
  }
  return { colour: colour ?? '#000', filled: filledHere };
}

// Ceiling cut: the first level at or above the viewer's level that is filled above the viewer's cell.
function ceilingLevel(column: Column, viewerLevel: number, x: number, y: number): number {
  for (let lv = viewerLevel; lv < column.length; lv++) {
    if (column[lv][x][y].filled) return lv;
  }
  return column.length;                 // no roof: show everything
}

// Only chunks inside the window around the viewer are kept; the rest are dropped.
function inWindow(chunk: { cx: number; cy: number }, viewer: { cx: number; cy: number }, half: number): boolean {
  return Math.abs(chunk.cx - viewer.cx) < half && Math.abs(chunk.cy - viewer.cy) < half;
}
```

## 5. Lands in

- Frankendom target: NEW `src/zone-map.ts` (the read-only client minimap, shared with the flare-engine note; does not exist today). Frankendom's zones are open flat ground with authored landmarks (`origins/world/README.md`: landmarks at (u, v) in 0..1, passages), so only the window-around-the-viewer idea and the background-build idea carry over; the per-level ceiling cut would matter only if a zone gets interiors. Data source: the zone layout from `origins/world/derive.ts`, and the server's visible entities from `origins/presence/interest.ts` (a 40 m interest radius, nearest first). Files on the VPS snapshot /root/work-k7 (not main); headers and the README read only.
- Parity-checklist row: none of rows 1 to 22 (row 14 is the fight HUD in `src/hud.ts`, which does not cover a map). Feature-map section: zones as data (`origins/world/README.md`) and `docs/specs/origins/one-shard.md` §2 (interest radius, what syncs).
- Reuse tag: rewrite-from-idea (GPL-3: clean-room only)
- Brief rule served: (category default, not per-cell) 4 (zones are data); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3: clean-room only.
- Frankendom's zones are not voxel terrain. The per-level column and the roof cut apply only if a zone has levels; the flat zone map is the simpler case.
- Background chunk builds keyed by position are a client performance choice (a slow job pool, 172). The Frankendom perf rule and the shared-Mac rule mean any heavy build belongs off the render path; not a donor number to copy.
- The ceiling cut uses the viewer's height (`pos.z`, 243-244, the client's own position component). A Frankendom client may only cut with a height the server has sent (server-verified).
- The minimap shows terrain only (this file draws no entities in the voxel layer), so it does not reveal hidden players; the widget that draws markers (`MiniMap`, 410) was not read. Frankendom must not ship a hidden roster through this path: the presence service already filters by radius on the server.
- Rebuild is triggered by terrain-versus-non-terrain changes only (219-223); Frankendom zones are static data, so a rebuild is only on zone load.
- One engine, the one ledger, Pit as client only and MAX_ATTACKERS = 3 are unaffected: the minimap reads state, it never changes it.
- Not read: the `MiniMap` widget (410-), `TerrainChunkSize`, `KeyedJobs`, and the caller of `maintain`.
