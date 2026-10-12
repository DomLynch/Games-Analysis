# dkfans-keeperfx (rendering-performance, cell 2)

Donor: `/mnt/frankendom-donors/dkfans-keeperfx/src/engine_textures.c` (symbol `update_animating_texture_maps`), with `src/kfx/renderer/TileAtlasPacker.h` and `.cpp`, `src/kfx/renderer/opengl/GLTileAtlas.cpp`, `config/fxdata/textureanim.toml` | Licence: GNU GPL version 2 (`LICENSE` read lines 1-12; `engine_textures.c` header names "version 2 of the License") | C and C++ | symbol `update_animating_texture_maps`

Checked: Read in full: `TileAtlasPacker.h` (96 lines; the hint file), `GLTileAtlas.cpp` (1-200 of 203), `engine_textures.c` 60-118, `config_textures.c` 40-80. Read in part: `TileAtlasPacker.cpp` 1-150 of 153, `engine_redraw.c` 1160-1185, `GLWorldViewRenderer.cpp` 1541-1546 and 2480-2510 (the queued command only). Data: `config/fxdata/textureanim.toml` header (lines 1-14) read; the 61 sections and their 488 frame entries were counted and classified with an awk pass on the VPS (no file written). Not read: the shader that applies the palette, the per-tile draw loop, `VitaTileAtlas` (named in the header, not in this box), and the game-turn rate. Confidence: high on the atlas layout and the frame gate; medium on the upload-cost estimate (arithmetic from the constants, not measured). Camera: not a camera cell. Typecheck of the sketch: passed on the VPS.

## 1. Mechanism

A fixed texture grid holds every dungeon tile, and animated tiles cost no pixel copies per frame. Three parts:

- Layout. The atlas is 2048 by 1024 pixels of 32 by 32 tiles, so 64 tile columns (`TileAtlasPacker.h` 35-38). Tile id `t` sits at column `t % 64`, row `t / 64` (`TileAtlasPacker.cpp` 59-66 via `GetTileUV`). Tile ids run from 0 to 1543: 544 static A (0-543), 456 animated slots (544-999), 544 static B (1000-1543) (`engine_textures.h` 34-44, `TileAtlasPacker.cpp` 23). Texture arrays hold 32 variations (`engine_textures.h` 31; `GLTileAtlas.cpp` 51).
- UV inset. `u0 = (col*32 + 0.5) / 2048`, `u1 = ((col+1)*32 - 0.5) / 2048`, and the same for v (`TileAtlasPacker.cpp` 67-70). Each rectangle is inset half a texel, so nearest or linear filtering cannot sample the neighbouring tile.
- Animated slots as pointers. `block_ptrs` holds one pointer per variation and tile id. On a frame change, `update_animating_texture_maps` sets each animated slot `dst[544 + i]` to `dst[j]`, where `j` is that slot's source for the current frame (`engine_textures.c` 103-113). No pixels move; only pointers change. The frame is `(gameturn/2 + 8 - start) % 8` (97), so one animation step every two game turns, eight frames per cycle. The gate at 98-100 returns at once when the frame has not changed. The renderer calls the update only when it returns true (`engine_redraw.c` 1177-1178).
- GPU upload on change. `UpdateAnimatedTiles` runs `BuildAnimatedStrip` for all 32 variations (`GLTileAtlas.cpp` 97-98). Each strip covers whole atlas rows 8 to 15 (ids 512-1023, so 256 pixel rows; 135-155), copies the tile bytes from the pointer table, and uploads that band with one `glTexSubImage3D` per variation (171, 198-199). The band also re-fills the static tiles in those rows, so the memset does not blank them (148-155).
- Data. `config/fxdata/textureanim.toml` gives one section per animated tile (`[texture544]` onward), each with a `frames` list of 8 source ids. The loader (`config_textures.c` 54-71) reads them into a flat array. Counted on the VPS: 61 sections, 488 frame entries; 336 point to static A (below 544), 152 point to static B (1000 and up), and none point into the animated range.
- Rendering path: the update is queued as a draw command (`GLWorldViewRenderer.cpp` 1541-1546) and run inside the draw-command loop (GLWorldViewRenderer.cpp 2495-2498), ahead of the creature shadow pass (2504).

## 2. Key functions

- `update_animating_texture_maps`: `/mnt/frankendom-donors/dkfans-keeperfx/src/engine_textures.c` 95-118. Frame index, change gate, pointer swap, record of applied frame.
- `init_animating_texture_maps`: `/mnt/frankendom-donors/dkfans-keeperfx/src/engine_textures.c` 87-93. Sets the start frame from the turn and applies once.
- `GLTileAtlas::UpdateAnimatedTiles` and `BuildAnimatedStrip`: `/mnt/frankendom-donors/dkfans-keeperfx/src/kfx/renderer/opengl/GLTileAtlas.cpp` 94-172. Band upload per variation.
- `TileAtlasPacker::GetTileUV`: `/mnt/frankendom-donors/dkfans-keeperfx/src/kfx/renderer/TileAtlasPacker.cpp` 59-71. The half-texel inset.
- `load_textureanim_config_file`: `/mnt/frankendom-donors/dkfans-keeperfx/src/config_textures.c` 46-77. Data loader for the animation table.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Grid atlas: tile id to col and row | 32 px tiles, 2048 by 1024 px atlas, 64 columns (TileAtlasPacker.h 35-38) |
| Half-texel UV inset | 0.5 px (TileAtlasPacker.cpp 67-70) |
| Animated slots as pointers, frame gate | 8 frames (engine_textures.h 41); one step per 2 game turns (engine_textures.c 97) |
| Animated range | 456 slots, ids 544-999 (engine_textures.h 34, 37; TileAtlasPacker.cpp 21-22) |
| Band upload | 8 atlas rows, 256 px tall, 2048 wide, R8: 512 KiB per variation (GLTileAtlas.cpp 142) |
| Variations | 32 layers (engine_textures.h 31; GLTileAtlas.cpp 51) |
| Data for the animation table | 61 sections, 8 frames each, 488 entries (config/fxdata/textureanim.toml) |

Upload cost, from the constants (not measured): 32 variations times 512 KiB is 16 MiB of texture upload per animation step, with one step every two game turns (game-turn rate not read).

Defects. Keep the idea; each fix is listed.

1. Upload cost. `UpdateAnimatedTiles` re-uploads a band for every one of the 32 variations on every step (GLTileAtlas.cpp 97-98, 171), not only the variations in use. Fix: upload only the variations the current level uses, or keep the animated tiles in a small separate layer array that is re-uploaded alone. Measure on a phone before choosing.
2. Stale comment on the range end. The comment says `999 (exclusive end)` (TileAtlasPacker.cpp 22), but the value is `TEX_B_START_POINT`, which is 1000 (engine_textures.h 37). The code uses 1000 as the exclusive end. Fix: correct the comment.
3. Stale data comment. `textureanim.toml` line 4 says the frames reference static textures 0-543, but 152 of the 488 frame entries point at 1000 and up (static B). Fix: correct the comment, or confirm the static B references are intended.
4. Unconfigured animated slots. The loader fills 61 of the 456 slots (config_textures.c 54-71). The table is a field of the global `struct Game game` (game_legacy.c 31), so the other 395 slots stay 0 and read source 0 on every frame (the zero-initialised global is not otherwise checked). Not checked whether any map cell uses those slots; if one does, it shows tile 0. Fix: at load, point each unconfigured slot at its own static id, and report the count.
5. Silent skip. An animated or unset (-1) source is ignored (engine_textures.c 108-112), so the slot keeps its previous frame with no warning. The shipped data has none of these (counted), but nothing checks it. Fix: validate at load and log each bad entry.
6. Palette shift in the base class. `pal[idx*3] << 2` maps a 6-bit value 63 to 252, not 255 (TileAtlasPacker.cpp 92-94). This is only the base-class RGBA path, which `GLTileAtlas` overrides on desktop GL, so it matters only for another subclass (VitaTileAtlas, not read). Fix: scale by 255/63.

## 4. TypeScript sketch

simplified: the sketch keeps the grid, the half-texel UV inset, the pointer-style slot table, the frame gate that returns false when nothing changed, the frame index formula, and the band rows. It omits the GL upload and the 32-variation loop, the palette decode and shader, the load-time validation, and the static-B upper bound (1544), so any id at or above 1000 counts as static here. It keeps the donor's rule that an animated or unset source leaves the slot unchanged.

```ts
// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export const TILE_DIM = 32;
export const ATLAS_W = 2048;
export const ATLAS_H = 1024;
export const COLS = ATLAS_W / TILE_DIM; // 64 tiles per row

// Tile id -> UV rectangle, inset half a texel so filtering never samples the neighbour tile.
export function tileUV(id: number): [number, number, number, number] {
  const col = id % COLS;
  const row = Math.floor(id / COLS);
  return [
    (col * TILE_DIM + 0.5) / ATLAS_W,
    (row * TILE_DIM + 0.5) / ATLAS_H,
    ((col + 1) * TILE_DIM - 0.5) / ATLAS_W,
    ((row + 1) * TILE_DIM - 0.5) / ATLAS_H,
  ];
}

// Animated tiles are slots. Each slot points at a static source tile id; a frame change re-points slots, it copies no pixels.
export interface AnimTiles {
  readonly animStart: number;  // first animated id (544)
  readonly animEnd: number;    // first id after the animated range (1000)
  readonly frames: number;     // 8 frames per cycle
  readonly table: Int32Array;  // [slot * frames + frame] -> source id; -1 = unset
  readonly source: Int32Array; // current source id per animated slot
  appliedFrame: number;        // -1 before the first apply
}

// Returns true only when the frame changed, so the caller uploads the changed band once.
export function applyAnimFrame(a: AnimTiles, frame: number): boolean {
  if (frame === a.appliedFrame) return false;
  const slots = a.source.length;
  for (let s = 0; s < slots; s++) {
    const j = a.table[s * a.frames + frame];
    const isStatic = (j >= 0 && j < a.animStart) || j >= a.animEnd;
    if (isStatic) a.source[s] = j; // an animated or unset source leaves the slot on its last frame
  }
  a.appliedFrame = frame;
  return true;
}

// Frame index from the game turn: one step every 2 turns, cycling through `frames`.
export function animFrame(gameTurn: number, frames: number, startFrame: number): number {
  return (Math.floor(gameTurn / 2) + frames - startFrame) % frames;
}

// Rows of the atlas that hold the animated range, as whole rows (the band uploaded per change).
export function animBand(animStart: number, animEnd: number): { yOffset: number; heightPx: number } {
  const firstRow = Math.floor(animStart / COLS);
  const lastRow = Math.floor((animEnd - 1) / COLS);
  return { yOffset: firstRow * TILE_DIM, heightPx: (lastRow - firstRow + 1) * TILE_DIM };
}

export {};
```

Sketch file: `/private/tmp/p2/wave2-haiku/batch3/RP010/work/dk-tile-atlas.ts` (typecheck on the VPS: passed).

## 5. Lands in

- TARGET `origins/terrain/animated-tiles.ts` (new module). The animated-slot table, frame gate and band rule for the world tileset, with the table as zone or tileset data. The atlas upload itself is client-only. Parity-checklist row 16 (colour grade/quality: render cost on phones). The lead hint said row 12, but row 12 in the addendum is combat sound cues, so row 16 is the closest fit. Lead to confirm.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room, shape only)
- Brief rule served: addendum rule 4 (best idea line), keep the idea and fix the defect, rule 6 (the frame loop found and described), data-tables-first rule (the animation table read and counted), section 6 rulings check

## 6. Gaps and risks

- GPL-2.0 copyleft: clean-room, shape only. No line-by-line translation.
- One engine and zones as data: the animation table is tileset data. It belongs in zone or tileset data, with unset slots filled at load (defect 4), not as code constants.
- Client-only: the animated tiles are visual only, so they must not affect server state, hit timing or kills.
- The frame gate runs on the game turn (every two turns), not on the display frame. In Frankendom the equivalent should be keyed to the shared tick, so a skipped client draw never changes what a player's server state shows.
- Phone budget: the 16 MiB figure is from constants, not measured. The donor keeps 32 variations; how many variations Frankendom would need is not known here, so the saving is unknown.
- The donor's draw batching (command list in GLWorldViewRenderer) and the shader palette lookup were not read. This note does not claim the draw-call budget is solved.

Best transferable idea: Store animated tiles as slots that point at static tile sources, swap the pointer on a frame change behind an equality gate, and upload only the changed atlas band, so an animated water or lava tile costs no per-frame pixel work.

Decision (proposed): adapt — keep the grid atlas with half-texel UV inset, the pointer-swap slots, the equality gate and the band rule; drop the 32-variation upload and the R8 layer per variation until a phone measurement says it is needed.
Acceptance: Client test: applyAnimFrame returns false when the frame is repeated, and the number of re-pointed slots and uploaded rows per change stays at 8 atlas rows; on a 375-wide phone the water tiles change every two game turns with no hitch.
