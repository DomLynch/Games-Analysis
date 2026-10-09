# FWGS-xash3d-fwgs (rendering-performance, cell 17)

Donor: /mnt/frankendom-donors/FWGS-xash3d-fwgs/public/atlas.c | Licence: GPL-3 or later per the file header (no licence file at the repo root on disk; id Software heritage noted in the header) | C | symbol Atlas_AllocBlock

## 1. Mechanism

- Packs many small rectangles into one square atlas. The file header calls it a strip-based packer; behaviourally it is a skyline packer: the atlas keeps one height per column (`allocated[x]`), the height of the top of the packed area in that column.
- Inputs: the atlas (`atlas_t` in atlas.h lines 25-30: a fixed array of `ATLAS_MAX_SIZE` = 1024 column heights, the size, and `max_height`; `Atlas_Init` in atlas.h 32-37 clears it and sets the size), and the block width and height to place.
- Search: for each start column, it checks the next `w` columns. If none of them is at or above the best height found so far, it records the start column and the height of its tallest column as the candidate (`best`), and keeps the lowest candidate. It stops early when a candidate sits on the floor (height 0).
- Place: if the chosen height plus the block height exceeds the atlas size, the block does not fit and the call returns false. Otherwise the block's columns are raised to the new top (`best + h`), and the atlas's max used height is updated.
- Output: the block's x and y in the atlas, or failure. Nothing is freed individually: the packer only grows, and space is reclaimed by resetting the whole atlas (`Atlas_Init`).
- The only caller read is the GL lightmap allocator (`LM_AllocBlock`, ref/gl/gl_rsurf.c 677-680, over `LM_InitBlock` at 672-675). It is used at map load (`GL_CreateSurfaceLightmap`, 3824-3854: when a block is full, it uploads the page, resets the atlas and retries once, else raises an error) and every frame for dynamic lightmaps (`R_BlendLightmaps`, 1147 onward: `LM_InitBlock` at 1202, then the fill, upload, draw, reset loop at 1204-1263; a similar variant over the VBO dlight arrays is in `R_DrawVBODlights`, 2912 onward, with `LM_InitBlock` at 2926 and its own full-block retry at 3004-3014). So the packer runs in that dynamic path with the atlas rebuilt from empty each time it is entered (the per-frame call site of `R_BlendLightmaps` was not read).

## 2. Key functions

- `Atlas_AllocBlock`, `/mnt/frankendom-donors/FWGS-xash3d-fwgs/public/atlas.c`, lines 18-60. The whole packer: lowest-skyline search, fit test, column raise, max height.
- `LM_AllocBlock` / `LM_InitBlock`, `/mnt/frankendom-donors/FWGS-xash3d-fwgs/ref/gl/gl_rsurf.c`, lines 672-680. Thin wrappers over the atlas, sized by `BLOCK_SIZE` (`tr.block_size`, default 128, max 1024; gl_local.h 58-60).
- `GL_CreateSurfaceLightmap`, same file, lines 3824-3854 (load-time use), and `R_BlendLightmaps`, lines 1147 onward (dynamic, per-frame use).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Skyline packing: keep one height per column, place each block at the lowest run that fits its width | Atlas square size (`atlas->size`, theirs; at most `ATLAS_MAX_SIZE` = 1024, atlas.h; lightmap default 128, gl_local.h 59) |
| Fit test: top plus block height must not exceed atlas size | `ATLAS_MAX_SIZE` = 1024 columns (atlas.h, theirs) |
| Track the max used height for the final texture size | `max_height` field (theirs) |

## 4. TypeScript sketch

simplified: no `max_height`-driven partial upload or page reset; the atlas size is a constructor argument with no 1024 cap, and failure is a null return (the donor returns false and writes x and y through pointers).

```ts
// Licence: GPL-3+ per file header (no licence file on disk) - clean-room sketch, no lines translated
// Clean-room: a skyline packer that keeps one height per column and places each block on the lowest run that fits.
class Skyline {
  private cols: number[];
  maxHeight = 0;
  constructor(private size: number) { this.cols = new Array(size).fill(0); }

  // Place a w by h block; returns its position, or null when it does not fit.
  alloc(w: number, h: number): { x: number; y: number } | null {
    let best = this.size;
    let bestX = 0;
    for (let i = 0; i <= this.size - w; ) {
      let bestHere = 0;
      let j = 0;
      for (; j < w; j++) {
        if (this.cols[i + j] >= best) break;          // this run is no better than the best so far
        if (this.cols[i + j] > bestHere) bestHere = this.cols[i + j];
      }
      if (j === w) {
        bestX = i;
        best = bestHere;
        if (best === 0) break;                        // cannot do better than the floor
        i++;
      } else {
        i += j + 1;
      }
    }
    if (best + h > this.size) return null;
    for (let i = 0; i < w; i++) this.cols[bestX + i] = best + h;
    this.maxHeight = Math.max(this.maxHeight, best + h);
    return { x: bestX, y: best };
  }
}
```

## 5. Lands in

- Frankendom target: new `src/fight/atlas.ts` (icon and damage-number glyph atlas for the HUD). Parity row 14 (HUD: bars, damage numbers, stance panel; today `src/hud.ts`, K10 Web). Row 8 decals could share it later.
- Today: no Frankendom module yet (later phase); the Frankendom side was not searched in this pass.
- Feature-map section: rendering performance (texture atlas for sprites and HUD icons).
- Reuse tag: rewrite-from-idea (GPL-3+ per header: mechanism only, no lines lifted; clean-room).
- Brief rule served: (category default, not per-cell) 3 (warm up at zone entry); rules 7-9 n/a

## 6. Gaps and risks

- The packer never frees individual blocks. The donor copes by rebuilding the atlas from empty (on each dynamic-lightmap pass, per page at load). A Frankendom atlas that loads and unloads zone content (zones are data, one engine) needs the same rebuild-on-zone-entry (brief rule 3) or a free list.
- Placement is lowest-skyline first-fit with no sorting; packing quality depends on the order of adds. Sort by height descending before adding if the atlas is built once.
- The file header states GPL v3 or later, with no licence file at the repo root on disk. Do not lift code; the sketch is from the mechanism alone.
- Atlas size is a fixed square; Frankendom must decide the maximum size for the target platform.
- Nothing here touches fight state, kill authority or the ledger; atlas contents are presentation only.
