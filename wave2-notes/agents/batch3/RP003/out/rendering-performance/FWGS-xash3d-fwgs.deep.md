# FWGS-xash3d-fwgs (rendering-performance, cell 1)

Donor: `/mnt/frankendom-donors/FWGS-xash3d-fwgs/public/atlas.c` (with `public/atlas.h`) | Licence: GPL-3.0-or-later (per atlas.c header lines 6-9: "version 3 of the License, or (at your option) any later version") | C | symbol `Atlas_AllocBlock`

Checked: `Atlas_AllocBlock` defined at atlas.c 18 and closes at 60 (read in full, 60 lines). `atlas.h` read in full (41 lines). Test file `public/tests/test_atlas.c` read in full (131 lines); I ran my sketch against its four allocation cases on the VPS and all match. The donor C was not compiled. Callers: `ref/gl/gl_rsurf.c` 672-685 and 3820-3850 read (the static-lightmap path); the dynamic-light callers at 1202-1247 and 2926-3008 were found by grep only (not read). The `sys_psvita.c` export at line 80 was seen by grep only (not read). Confidence high on the packer (whole mechanism read, tests agree); medium on the caller flow (one path read end to end). Short source lines (for example atlas.c 46, `i += j + 1;`) cannot carry a 15-character receipt; they were read by eye.

Best transferable idea: Pack a fixed set of decal and icon sprites offline into 1024 px pages with a lowest-then-leftmost skyline, so a whole fight's decal pass binds one texture per page instead of one per decal.
Decision (proposed): adapt - the skyline shape is worth taking for offline sheets, but blood decals expire, and this allocator cannot free one rectangle; expiring decals need a fixed slot pool at runtime, and the packer stays build-time only. GPL-3.0-or-later, so rewrite from the idea only.
Acceptance: In a world fight and a Pit fight with 40 live blood decals, the decal pass issues at most 2 texture binds (one per 1024 px page); a unit test packs 64 sprites of 16-64 px into one page with no overlap and passes the four donor test cases against the sketch.

## 1. Mechanism

- A skyline packer. `atlas->allocated[]` holds one value per column: the lowest free row in that column (a height profile). `Atlas_Init` zeroes it and sets the page size (atlas.h 32-37).
- Order of steps in `Atlas_AllocBlock(w, h)`: (a) set `best = size` (atlas.c 21). (b) Scan window start `i` from 0 while `i <= size - w` (24). (c) For each window, walk its `w` columns; if a column's height is `>= best`, this window cannot beat the best position so far, so the scan jumps past that column (`i += j + 1`, 30-31 and 46). (d) If every column is below `best`, the window sits at the highest of its columns: `*x = i`, `*y = best = best2` (38-39). If that y is 0, stop (the floor, 40-41). Otherwise move one column right (42). (e) After the scan, if `best + h > size` return false (50-51). (f) Otherwise raise the `w` columns to `best + h` (53-54) and update `max_height` (56-57).
- Net rule: the block goes to the lowest row that fits, and among equal rows the leftmost. Each accepted candidate is strictly lower than the one before, so the last accepted one wins.
- Tick: none. This is a one-shot allocator, called once per surface or per dynamic light. It is not per frame.
- The caller (static lightmaps, gl_rsurf.c 3838-3845) does a page-flip: if a block does not fit, it uploads the current page, resets the atlas with `LM_InitBlock()`, and tries again. If it still does not fit, it calls `Host_Error`. Dynamic-light uploads send only the used rows, `BLOCK_SIZE x atlas.max_height` (gl_rsurf.c 682-685).

## 2. Key functions

- `Atlas_AllocBlock`: `/mnt/frankendom-donors/FWGS-xash3d-fwgs/public/atlas.c` 18-60. The whole packer.
- Window scan and blocker skip (inside it): atlas.c 24-47.
- Placement and height tracking (inside it): atlas.c 50-57.
- `Atlas_Init`: `/mnt/frankendom-donors/FWGS-xash3d-fwgs/public/atlas.h` 32-37.
- Lightmap caller, block flush and retry: `/mnt/frankendom-donors/FWGS-xash3d-fwgs/ref/gl/gl_rsurf.c` 3838-3845 (`GL_CreateSurfaceLightmap`, read). Block size from extents: gl_rsurf.c 3834-3836 (read; not receipted).
- Dynamic upload of used rows: `/mnt/frankendom-donors/FWGS-xash3d-fwgs/ref/gl/gl_rsurf.c` 682-685 (`LM_UploadDynamicBlock`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Lowest-then-leftmost skyline placement; blocks that do not fit are skipped past their blocker | None (the scan) |
| Page size cap | 1024 px (theirs, atlas.h 23, `ATLAS_MAX_SIZE`) |
| Lightmap block size, default | 128 px (theirs, gl_local.h 59, `BLOCK_SIZE_DEFAULT`); max 1024 (gl_local.h 60, `BLOCK_SIZE_MAX`) |
| Pages per engine run | 256 (theirs, gl_local.h 64, `MAX_LIGHTMAPS`); reaching it is a host error (gl_rsurf.c 712-713) |
| Floor test: stop when a block sits at row 0 | Threshold 0 (mechanism, atlas.c 40) |
| Fit test: `best + h > size` | None (the page edge) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's scan order and tie rule: left to right, skip past a blocking column, accept only strictly lower windows, stop at the floor, then check the fit. It omits the page-flip caller and the multi-page list (the sketch packs one page), the `max_height` upload path, and the donor's typed out-parameters (it returns `null` instead). It adds three things the donor lacks: a guard that rejects `h <= 0` or `w > size` (the donor can return success with uninitialised `x` and `y` when `h = 0` and nothing fits), a range check on the page size (`PAGE_MAX` 1024), and an explicit `maxUsed`.

```ts
// Licence: GPL-3.0-or-later (donor atlas.c). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface SkylinePage {
  readonly size: number;     // page side in pixels (donor caps this at ATLAS_MAX_SIZE 1024)
  readonly top: number[];    // per column: the lowest free row in that column
  maxUsed: number;           // highest row used so far (upload only this many rows)
}

export const PAGE_MAX = 1024;

export function newPage(size: number): SkylinePage {
  // fix: donor Atlas_Init never checks size against its 1024 cap; a larger size indexes past its fixed array
  if (!Number.isInteger(size) || size <= 0 || size > PAGE_MAX) throw new RangeError("page size out of range");
  return { size, top: new Array<number>(size).fill(0), maxUsed: 0 };
}

// Place a w x h block at the lowest possible row; ties go to the leftmost x.
export function place(page: SkylinePage, w: number, h: number): { x: number; y: number } | null {
  if (w <= 0 || h <= 0 || w > page.size) return null; // fix: donor can return success with uninitialised x, y when h = 0 and nothing fits
  let bestY = Infinity;
  let bestX = -1;
  let x = 0;
  while (x + w <= page.size) {
    let windowTop = 0;
    let blocker = -1;
    for (let j = 0; j < w; j++) {
      const t = page.top[x + j];
      if (t >= bestY) { blocker = j; break; }   // this column is no better than the best so far
      if (t > windowTop) windowTop = t;
    }
    if (blocker < 0) {
      bestX = x;
      bestY = windowTop;
      if (bestY === 0) break;                   // cannot sit lower than the floor
      x += 1;
    } else {
      x += blocker + 1;                         // every start up to the blocker also contains it
    }
  }
  if (bestX < 0 || bestY + h > page.size) return null;
  for (let j = 0; j < w; j++) page.top[bestX + j] = bestY + h;
  if (bestY + h > page.maxUsed) page.maxUsed = bestY + h;
  return { x: bestX, y: bestY };
}

export {};
```

## 5. Lands in

- TARGET `src/fight/decal-atlas.ts` (new, client only): build-time packer for the fixed sheets (hit-splash, wound and icon sprites) plus a fixed slot pool for expiring blood decals. The server never reads it. Parity-checklist row 8 (blood, wounds, decals). The row hint in the brief was 12, which is combat sound cues and does not cover decal rendering; row 8 is the one that matches.
- today: no atlas packer in `src/` (not checked against the repo).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one engine; the packer is client build tooling); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism; nothing is copied from the donor lines.
- Decals expire and the skyline cannot free one rectangle (there is no free function). The donor's answer is a page flip: upload the full page as a texture and start an empty one (gl_rsurf.c 3840-3841). Nothing is freed; the old page stays in use, so pages only grow. Frankendom needs a slot pool that reuses space for expiring decals, with the oldest decal evicted first. The packer is for fixed sheets only.
- Skyline waste: a block sits at the highest of its columns, so the shorter columns under it are raised and the gap is never reused (atlas.c 53-54). This is a known trait of skyline packers, not a bug. Measure fill ratio in the build test before relying on it.
- The donor's caller treats a second failed fit as a host error (gl_rsurf.c 3844). Frankendom must not fail a fight over a full decal page; it should evict or fall back to a second page.
- Atlas_Init does not check size against the cap (atlas.h 32-35); the sketch adds that check. A bad size in the C port is a memory write past the fixed array.
- Draw-call effect is not measured here: this is the layout only. The per-frame bind and draw count is the claim to test on a phone, not something this code proves.
- Not read: the rest of the lightmap pipeline (dynamic light build, `R_BuildLightMap`), the psvita export. Only the packer, one static caller, and the dynamic upload were read.
