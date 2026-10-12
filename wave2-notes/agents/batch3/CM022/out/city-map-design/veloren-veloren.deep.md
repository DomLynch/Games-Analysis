# veloren-veloren (city-map-design, cell 2)

Donor: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/hud/minimap.rs` (with `common/src/terrain/mod.rs`, `voxygen/src/hud/map.rs`, `Cargo.toml`, `LICENSE`) | Licence: GPL-3.0-or-later (workspace `Cargo.toml` line 34: `license = "GPL-3.0-or-later"`; `LICENSE` is GPL version 3, 29 June 2007; minimap.rs has no per-file header) | Rust | symbols `VoxelMinimap`, `composite_layer_overhead`, `maintain`, `MiniMap`

Checked: opened all of minimap.rs (1-1129) in full; `common/src/terrain/mod.rs` 45-56 (chunk size); `voxygen/src/hud/map.rs` 1738-1748 (quest marker colour); `Cargo.toml` 34; `LICENSE` 1-2. Not read: `KeyedJobs` and `SlowJobPool` internals, `TerrainChunk`/`Block` methods (`is_terrain`, `is_filled`, `get_color`), the marker source (`client.markers()`), and the zoom hotkey handler that the donor's own comment names (line 552). camera_scope: n/a (a minimap). Confidence: high for the ceiling rule and the per-pixel order of operations; medium for the marker and zoom maths (read, but I did not run it); low for the voxel-layer source rectangle at low zoom (see gaps).

## 1. Mechanism

- A voxel minimap: a 256 by 256 texture, one pixel per block around the player (`VOXEL_MINIMAP_SIDELENGTH = 256`, line 59). Chunks are 32 blocks a side (`1 << 5`, common/src/terrain/mod.rs 46 and 50).
- Chunk streaming, once per frame in `maintain` (241-380): a chunk is queued for compositing when it is within 8 chunks of the player's chunk (`256 / 32`, lines 168-169) and is not yet composited or is marked for replacement (170-171). Compositing runs as a keyed job on the slow-job pool (172-205). A chunk is dropped only when it is 9 or more chunks away (`1 + 256 / 32`, line 233; removal at 238). The load radius is one chunk smaller than the keep radius, so a chunk on the boundary does not flicker in and out. This is hysteresis.
- Chunk composite (`composite_layer_overhead`, 113-156): for each z-level of the chunk, every block column is scanned from that z downwards. Solid blocks are counted until an air gap is seen; the first solid below an air gap gives the cell colour (126-129). A solid run deeper than 12 blocks stops the scan with no colour (136-138), which renders black (151). Leaves, wood and tree leaves do not count as "filled" for the ceiling test (144-150), so a branch does not put a roof over the player.
- Block colour (82-89): the block's own colour, or water blue `Rgba::new(119, 149, 197, 255)` (87) for water with no colour. Per-z layers are stored as 32 by 32 grids (94, 115).
- Ceiling offset (265-308), once per frame: look up the chunk column under the player. Starting at the player's z, find the first layer where the player's in-chunk cell is filled (284-289). That gives the ceiling offset dz. If no layer in the chunk is filled, a filled block above the chunk gives 1 (roof continues past the top), and open sky gives `i32::MAX` (293-302). If the column is not loaded, the offset is 0 (307).
- Recomposite trigger (309-313): the 256 by 256 texture is rebuilt only when the player's chunk, the player's z, or the ceiling offset changed, or when new chunks finished compositing.
- Pixel rule (316-369), for every texture pixel: take the column under that pixel. If `player z + ceiling < chunk zlo` the pixel is black (334-338): a cave or dungeon ceiling below this chunk does not show the forest above. Otherwise take layer index `player z - zlo + ceiling`, clamped to the top layer (348-350), and that cell's colour (352). If the cell is missing, use the chunk's `above` colour when the player is above the chunk bottom, else `below` (354-358). The y axis is flipped when written (363-365).
- Intended result, by reading the rule (not run): outside a building the top layer shows the roof; inside, the ceiling test picks the layer at the roof height, which shows the floor under it. Caves follow the same rule.
- Changed blocks (215-228): a chunk is marked for replacement only when a block's `is_terrain()` status flips. Other changes do not mark it (222; `is_terrain` not read).
- Slice mode (92-110, weights `[1, 2, 4, 1, 1, 1]` at 96) is dead code: `MODE_OVERHEAD` is a constant `true` (176), so the slice branch (179-181) never runs.
- World layer (646-679): the Veloren world map image is centred on the player's chunk, with the y axis flipped (646-653), and the view width is `max_zoom / zoom` (642). Topographic layers draw only when the topo option is on (670).
- Site and quest markers (708-841, 732-757): `wpos_to_rpos` takes the point relative to the player, converts to chunk units, divides by `max_zoom` (the largest world dimension, line 738, so non-square worlds use the longer side), multiplies by map size and zoom, and rotates by the north or camera angle. A point outside the square frame is pinned to the edge along its dominant axis if the marker is a quest marker (`limit = IS_QUEST`, line 761; clamp at 750-753), and skipped otherwise (763). Each site kind has a difficulty ring colour (765-813).
- Group members (843-893): the arrow is "up" at a height difference of 10 or more blocks and "down" at minus 10 or less (878-883). A member off the frame is skipped (872-875).
- Location markers (895-943): group and owned location markers are pinned to the edge (906, 930). Quest marker colour pulses: alpha `0.75 + sin(pulse * 4) * 0.25` (map.rs 1744).
- Compass (976-1003): N, E, S and W are placed on a square ring at half the map size minus 10 (986-987).
- Zoom (550-605): zoom out divides by 2 and zoom in multiplies by 2, both clamped to `[1, world size]` (586, 602). The buttons are disabled at the limits (571-572, 580, 597). The default scale is 1.5 when the setting is 0 or less (491-493).
- Position (1065-1125): drag moves the minimap, clamped inside the window (1106-1110); right click resets to the default position (1116-1123). The title font steps down as the name gets longer (1044-1051).

## 2. Key functions

- `composite_layer_overhead`: `/mnt/frankendom-donors/veloren-veloren/voxygen/src/hud/minimap.rs` 113-156. The per-column roof rule.
- `add_chunks_near`, `add_chunks_to_replace`, `remove_chunks_far`: minimap.rs 158-239. Load, mark, and drop with hysteresis.
- `maintain`: minimap.rs 241-380. Per-frame ceiling offset (265-308), recomposite trigger (309-313), pixel rule (316-369).
- `MiniMap::update`: minimap.rs 479-1128. Zoom (550-605), world layer (646-679), markers (708-841), group members (843-893), compass (976-1003), drag (1065-1125).
- `wpos_to_rpos` closure: minimap.rs 732-757. Off-frame policy.
- Chunk and quest colour data: `common/src/terrain/mod.rs` 46-50; `voxygen/src/hud/map.rs` 1738-1748.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Ceiling offset: first solid at or above the player, else roof-continues or open sky | Solid roof offset 1 (theirs, minimap.rs 298); open sky `i32::MAX` (302) |
| Pixel from the layer at the ceiling height; black if the ceiling is below the chunk | Black `Rgba::new(0, 0, 0, 255)` (338) |
| Overhead scan: first solid below an air gap; give up after a deep solid run | Penetration limit 12 solids (theirs, 136); leaves and wood not filled (148) |
| Load and keep radius, one chunk apart (hysteresis) | Load 256 / 32 = 8 chunks (168-169); keep 1 + 8 = 9 (233) |
| Recomposite only when chunk, z, ceiling or new chunks change | None (rule) |
| Off-frame: pin quest markers to the edge, hide the rest | None (rule) |
| Group member arrow by height difference | +10 and -10 blocks (theirs, 880-881) |
| Zoom by factor, clamped to [min, world size] | Factor 2.0 (theirs, 557); min 1.0 (561); max = world size (562) |
| Default scale when unset | 1.5 (theirs, 492) |
| Frame and map size | Window 174 by 190 and map 170, times scale (theirs, 504-505) |
| Compass ring inset | 10 px inside the half-map (theirs, 987) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the ceiling rule (first solid at or above the player, else roof-or-sky; black when the ceiling is below the chunk; layer index clamped to the top; above or below fallback), the chunk load and keep radii, the recomposite trigger, the edge pin for off-frame quest markers, the zoom clamp and the group arrow thresholds. It omits: the per-column overhead scan (the 12-solid limit and the leaves and wood rule), block colours and the water fallback, the keyed slow job, the 256 by 256 texture write and clone, the world-layer source rectangle, the compass, the title sizes and the drag clamp. It does not include the chunk-key computation at all; the `as u32` defect is described in gaps and is not fixed here.

```ts
// Licence: GPL-3.0-or-later (donor; Cargo.toml line 34 and LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const CHUNK = 32;                 // blocks per chunk side (donor RECT_SIZE, 1 << 5)
const SKY: [number, number, number, number] = [0, 0, 0, 255];

type Rgba = [number, number, number, number];
interface Cell { colour: Rgba; solid: boolean }

// One chunk column: an overhead cell per z-slice (index 0 = zlo), plus the blocks just above and below the chunk.
interface Column {
  zlo: number;
  layers: Cell[][];               // layers[z - zlo][y * CHUNK + x]
  above: { colour: Rgba; solid: boolean };
  below: { colour: Rgba; solid: boolean };
}

// Ceiling above the player in one column: first solid cell at or above the player's z.
// Returns the dz offset; 1 if the top of the chunk is solid (roof goes on); Infinity for open sky.
function ceilingOffset(col: Column, x: number, y: number, playerZ: number): number {
  for (let dz = 0; dz < col.layers.length; dz++) {
    const cell = col.layers[playerZ - col.zlo + dz]?.[y * CHUNK + x];
    if (!cell || cell.solid) return dz;   // donor (minimap.rs 144): a missing block counts as filled
  }
  return col.above.solid ? 1 : Infinity;
}

// Colour of one minimap pixel: the overhead slice at the ceiling height, black when the ceiling is below this chunk.
function pixelFor(col: Column, x: number, y: number, playerZ: number, ceiling: number): Rgba {
  if (playerZ + ceiling < col.zlo) return SKY;   // keeps cave and dungeon interiors from showing the forest above
  const idx = Math.min(playerZ - col.zlo + ceiling, col.layers.length - 1);
  const cell = col.layers[idx]?.[y * CHUNK + x];
  if (cell) return cell.colour;
  return playerZ > col.zlo ? col.above.colour : col.below.colour;
}

// Place a world point on the square frame. Quest markers pin to the edge; others hide when off-frame.
function placeMarker(rel: { x: number; y: number }, frame: number, pinToEdge: boolean): { x: number; y: number } | null {
  const half = frame / 2;
  if (Math.abs(rel.x) <= half && Math.abs(rel.y) <= half) return rel;
  if (!pinToEdge) return null;
  const m = Math.max(Math.abs(rel.x), Math.abs(rel.y));
  return { x: (rel.x / m) * half, y: (rel.y / m) * half };
}

// Chunk streaming with hysteresis: load inside R chunks, keep until R + 1.
function shouldLoad(delta: number, R: number): boolean { return delta < R; }
function shouldKeep(delta: number, R: number): boolean { return delta < R + 1; }

// Recomposite only when the player's chunk, z or ceiling changed, or when new chunks arrived.
function shouldRecomposite(
  last: { cx: number; cy: number; z: number; ceil: number },
  now: { cx: number; cy: number; z: number; ceil: number },
  newChunks: boolean,
): boolean {
  return last.cx !== now.cx || last.cy !== now.cy || last.z !== now.z || last.ceil !== now.ceil || newChunks;
}

// Zoom in or out by a factor of 2, clamped to [1, maxZoom].
function zoomStep(zoom: number, direction: 'in' | 'out', maxZoom: number, factor = 2): number {
  return direction === 'in' ? Math.min(zoom * factor, maxZoom) : Math.max(zoom / factor, 1);
}

// Group member arrow by height difference, in blocks.
function memberArrow(dz: number): 'up' | 'down' | 'level' {
  if (dz >= 10) return 'up';
  if (dz <= -10) return 'down';
  return 'level';
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/cm022-veloren-minimap.ts`, exit 0.

## 5. Lands in

- TARGET `origins/client/minimap-overhead.ts` (new, client only, HUD). The roof rule reads a height or ceiling value per cell from zone data; the client never invents heights. Parity-checklist row 14 (HUD). The batch hint said row 23; I used row 14 because a minimap is HUD and row 23 is spawn logic. Lead to confirm.
- Today: the Frankendom minimap state was not read (outside the donor and this folder).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: ceilings and markers come from zone data and the server); 7 (client-only HUD)

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism, not translated.
- Defect 1, signed chunk key (minimap.rs 250 and 274). `(i as u32).div_euclid(j)` and `(i as u32).rem_euclid(j)` are applied to `vpos`, which can be negative. Rust float-to-unsigned casts saturate at 0, so a negative offset becomes 0 and the chunk key is wrong for positions near the origin. Whether world positions can be that small was not read. Fix: compute the chunk key with signed floor division before any cast. Keep the idea (the player's chunk centred in a fixed window).
- Defect 2, stale colour (minimap.rs 215-228). A chunk is marked for replacement only when `is_terrain()` flips. A block that changes colour without that flip stays stale until the chunk reloads. `is_terrain` was not read. Fix: mark the chunk dirty on any change to a minimap-visible field (colour or filled flag). This is a cheap change.
- Risk 3, full-texture rebuild (316-377). Every recomposite writes 65,536 pixels and clones the whole image on the main thread. Fix: patch only the pixels whose column or ceiling changed, or cap rebuilds per frame. Not measured.
- Risk 4, voxel-layer source rectangle (689-698). The source size is `RECT_SIZE * max_zoom / zoom` in units of a 256 px texture. How the UI library handles a source rectangle larger than the texture at low zoom was not read. Not verified.
- Risk 5, duplicated zoom handler. The donor's own TODO (551-553) says the buttons and the hotkey are separate code. Fix: one `zoomStep` used by both.
- Dead code. Slice mode (92-110) never runs (176-181). Do not port it.
- Frankendom: roofs and cave ceilings must be data (a ceiling or height per zone cell), not inferred from what the client can see. The server must not send hidden cave layers to the client just to draw a minimap.
- Frankendom: markers come from the server. The client only pins or hides them. The server decides which markers the player may see.
- Not applicable to the Pit (a fixed arena has no minimap). World zones only.

Best transferable idea: pick the overhead layer at the player's ceiling height, so roofs and cave ceilings are handled by one rule instead of special cases.
Decision (proposed): adapt - the ceiling-height layer rule and the hysteresis chunk window fit zone maps with roofs and caves, but ceilings must come from zone data, the chunk-key cast and the stale-colour trigger must be fixed, and the minimap stays client-only.
Acceptance: standing outside a building the minimap shows its roof; standing inside it shows the floor; standing in a cave the minimap is black above the cave ceiling rather than showing the forest; a client test that moves the player across a chunk edge loads each chunk once and does not unload it until one more chunk away.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: 1 (one engine: ceilings and markers come from zone data and the server); 7 (client-only HUD)

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- wpos_to_rpos divides by max_zoom (largest world dimension, minimap.rs 738), not the world size; non-square worlds differ.
- Sketch ceilingOffset ignored that a missing block counts as filled (is_none_or, minimap.rs 144).
Fixed 2026-10-12: corrected the wpos_to_rpos divisor wording; ceilingOffset now treats a missing cell as solid (typechecked below).
