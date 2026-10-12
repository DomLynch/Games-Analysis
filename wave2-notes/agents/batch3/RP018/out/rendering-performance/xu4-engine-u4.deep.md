# xu4-engine-u4 (rendering-performance, cell 2)

Donor: `/mnt/frankendom-donors/xu4-engine-u4/src/gpu_opengl.cpp` (with `gpu.h`, `imagemgr.cpp`, `event.cpp`, `screen.cpp`) | Licence: GPL-2.0-or-later (file header of `gpu_opengl.cpp`: "either version 2 of the License, or (at your option) any later version"; repo COPYING is GPL v3) | C | symbol `gpu_drawMap` (hint file `src/imagemgr.cpp` is the wrong file for the main mechanism: it builds the sprite atlas, which is one part of the chain)

Checked: confidence high on the chunk cache (`_obtainChunkGeo`, `_buildChunkGeo`, `gpu_drawMap` read end to end: gpu_opengl.cpp 1133-1687 region, sampled), on the dirty-region upload (gpu.h 28-39; gpu_opengl.cpp 116-163, 905-951) and on the frame pacer (event.cpp 26-50, 230-322, 348-357; event.h 108-122). Medium on the atlas (imagemgr.cpp 364-480 read in full; the caller that passes `tileTexCoord` is `screen.cpp` 888). Not read: the callers of `gpu_updateWorkBuffer` (which lists use a WorkBuffer), `gpu_emitQuad` and its scroll and fire variants, `_initFxInvert` details beyond the lines shown, `anim_advance` and the animator internals, the WRAP macro body, `tileanim.cpp`, the `EMULATE_U4` and `MAP_ANIMATOR` branches (build flags not checked), and whether `GPU_RENDER` is defined in a build file (not found in Makefile, configure or module). Camera scope: not a camera cell; the map view here is a fixed 2D tile view.

Best transferable idea: cache one pre-built geometry buffer per map chunk (a block of static tiles) in a few reusable slots, pick the slots from the view's corners each frame, and draw each chunk in one call, so a whole screen of static tiles costs a handful of draws.
Decision (proposed): adapt — the slot-cache shape (static chunks, reuse on hit, build on miss, draw a chunk in one call) fits zones of static props, but the donor's grid is 2D tile corners and our world is 3D with a third-person camera, so the chunk must be an XZ cell chosen by a view radius, and each miss must build over several frames, not inside one draw; the donor's defects are listed below and fixed in the sketch.
Acceptance: a client test on the chunk module shows that a view crossing a chunk border builds exactly one new chunk, that a view wider than the cache throws, and that a zone walk never rebuilds more than one chunk per frame; on a phone at 375 wide the frame log shows at most four chunk draws for the static ground and props per frame.

## 1. Mechanism

- Map layout: the map is split into square chunks of `chunk_width` by `chunk_height` tiles, which must be equal (`maploader.cpp` 95, the `gpu_drawMap` comment). The GPU side has four vertex buffers, one per cache slot (`CHUNK_CACHE_SIZE` 4, `gpu_opengl.cpp` 1250). `gpu_resetMap` (1265-1295) sizes each slot as `cdim * cdim * 6` vertices, dynamic draw, and clears the slot id table to 0xffff (empty).
- Per frame (`gpu_drawMap`, 1520-1640): the view's four corner tiles are `cx -/+ columns/2` and `cy -/+ rows/2` (`halfW = view->columns / 2`, 1564). Each corner maps to a chunk id `CHUNK_ID(col, row) = col<<8 | row` (1443-1444), with map wrap (the WRAP macro, applied to the corner tile before the chunk id is taken).
- Two-pass slot assignment (`_obtainChunkGeo`, 1454-1508). Pass 1, for each corner: if a slot already holds that id, use it (1486); otherwise take the first empty slot (1492) and build into it. Pass 2, for each corner still unplaced: take the first slot that no corner of this view used this frame (1474), overwrite it, and build. The `assert(0 && "bumpPass failed")` (1479) says four slots always suffice for four corners. Every placed slot sets its bit in `geoUsedMask` (1507).
- Build (`_buildChunkGeo`, 1357-1430): maps the slot's vertex buffer write-only (1387-1388), walks the cdim x cdim tiles, takes each tile's UV rectangle from the table indexed by visual id (`uvTable + tr->vid*4`, 1406), and emits one quad per tile with `gpu_emitQuad` (1421). Scrolling, pixel-colour and inverted tiles are handled per tile (scroll and fire quads use the animation data; inverted tiles also emit a separate effect record, `_initFxInvert`). The slot records its count of effects (1430).
- Draw (1520-1640): for each used slot, set a uniform offset from the chunk origin (`cloc`, relative to the view centre) and call `glDrawArrays` once for the whole chunk (`glDrawArrays(GL_TRIANGLES, 0, gr->mapChunkVertCount)`, 1631). Effects are drawn last from a per-frame triangle list (`gpu_beginTris` / `gpu_endTris` / `gpu_drawTris`, 1645-1683), only for chunks that have effects (1647).
- The UV table comes from the atlas (`imagemgr.cpp`, `buildAtlas` 365-480): child images (at most 16, `maxChild` 366) are blitted into one image at their offsets (395); sub-image rectangles are merged with the child offsets; the UV table is computed once (466-476: `u0 = x / width`, `v0 = y / height`, and so on); the atlas becomes one texture (477). The map draw receives that table (`screen.cpp` 888).
- Second mechanism, dirty-region upload (`gpu.h` 28-39; `gpu_opengl.cpp` 116-163, 905-951): a work buffer is split into up to 32 regions. `gpu_beginRegion` resets a region's used count (151-156). `gpu_endRegion` sets the region's dirty bit only if it wrote something (158-164). `gpu_updateWorkBuffer` (910-951) finds the first and last dirty regions, maps one span from the first dirty region's start to the last dirty region's end (918-938), copies only the dirty regions into it, and clears the mask (950). Drawing a region uses its start and used count (`gpu_drawTrisRegion`, 1018-1024).
- Third mechanism, frame pacer (`event.cpp`, `event.h`): `EventHandler` is built with a game-cycle interval and a frame interval (`xu4.cpp` 268-269 and 339-341), from settings (`settings.h` 45-46: 4 game cycles per second, 24 animation frames per second). Each frame (the loop in `EventHandler::wait_msecs`, 304-322, and the main loop in `EventHandler::run`, 348-357): fire timed events when `runTime` reaches the cycle interval (309-312), add the nominal frame interval to `runTime` (313), swap buffers, then `frameSleep`. `frameSleep` (230-270) takes the real elapsed time, clamps it to eight frame intervals (239), keeps an 8-sample ring (`FS_SAMPLES` 8, `event.h` 112), and moves the sleep time toward the target by at most 2 ms per frame (261, 267), capped at one interval less 1 ms. Its start value is the interval less 6 ms (35).
- Effect animation: `screen.cpp` 894 advances the effects animator by 1/24 s on every drawn frame, not by measured time. Shader scroll time is different: `gr->time` is wall clock from `getTicks()` (1601).

## 2. Key functions

- `gpu_drawMap`: `gpu_opengl.cpp` 1520-1640 (corner lookup 1564-1588; draw 1624-1640; effects 1645-1683).
- `_obtainChunkGeo`: `gpu_opengl.cpp` 1454-1508. `_buildChunkGeo`: 1357-1430. `gpu_resetMap`: 1265-1295.
- `gpu_updateWorkBuffer`: `gpu_opengl.cpp` 910-951; `gpu_beginRegion` and `gpu_endRegion`: 151-164; `gpu_drawTrisRegion`: 1018-1024.
- `buildAtlas`: `imagemgr.cpp` 365-480 (with `#ifdef CONF_MODULE`, 364).
- Frame loops: `EventHandler::wait_msecs` loop `event.cpp` 304-322; `EventHandler::run` loop 348-357; `frameSleep` 230-270.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Cache of pre-built chunk geometry, reused on hit | 4 slots (`gpu_opengl.cpp` 1250) |
| Chunk = square block of tiles, one draw call | cdim = `chunk_width`; vertices = cdim^2 x 6 (`gpu_resetMap`) |
| Chunk id packing | col << 8 \| row, 256 x 256 chunk limit (1443-1444) |
| Atlas: children per sheet | At most 16 (`imagemgr.cpp` 366); one texture (477) |
| Dirty regions per work buffer | 32 (`gpu.h` 36) |
| Frame interval | 1000 / 24 = 41 ms by integer division (`xu4.cpp` 268; `settings.h` 46) |
| Game-cycle interval | 1000 / 4 = 250 ms (`settings.h` 45) |
| Pacer sample ring | 8 (`event.h` 112) |
| Pacer step limit | 2 ms per frame (`event.cpp` 261, 267) |
| Pacer hitch clamp | 8 frame intervals (239) |
| Pacer start point | interval - 6 ms (35) |
| Effect step | 1/24 s per drawn frame (`screen.cpp` 894) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's three pieces: the four-slot chunk cache with the hit, free-slot and bump passes, the dirty-span calculation over regions, and the frame pacer with its clamp and 2 ms step. It changes three things on purpose: the chunk id has no sentinel collision (the donor's 0xffff is also chunk 255,255), the pacer averages in floating point (the donor divides the sum as an integer), and the cache throws if a view needs more slots than it has (the donor asserts only in the bump pass). It omits the WebGL or GL calls, the per-tile geometry emission and its scroll, fire and invert variants, the effect records and their draw list, the atlas blit and UV table, the wrap macro (chunk ids are assumed already wrapped), the `geoUsedMask` bit field (a per-slot flag stands in for it), and the effect animator. The sketch does not build more than one chunk per call, so the per-frame build budget of the fix is the caller's job.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.

// 1. Chunk cache: a few slots, one per chunk the view can touch. A corner that hits reuses its slot;
//    a miss takes a free slot, else the first slot this view does not use (the "bump" pass).
interface Slot { chunkId: number; usedThisFrame: boolean; }   // chunkId -1 = empty

export function chunkIdOf(col: number, row: number): number {
  return col * 256 + row;   // donor packs (c << 8 | r); fix: a wider id so 255,255 is not a sentinel
}

export function obtainChunks(slots: Slot[], corners: number[]): { slot: number; build: boolean }[] {
  for (const s of slots) s.usedThisFrame = false;
  const out: { slot: number; build: boolean }[] = corners.map(() => ({ slot: -1, build: false }));

  // Pass 1: hits, then free slots. No eviction yet.
  corners.forEach((id, k) => {
    let i = slots.findIndex((s) => s.chunkId === id);
    if (i >= 0) { slots[i].usedThisFrame = true; out[k] = { slot: i, build: false }; return; }
    i = slots.findIndex((s) => s.chunkId === -1);
    if (i >= 0) { slots[i].chunkId = id; slots[i].usedThisFrame = true; out[k] = { slot: i, build: true }; }
  });

  // Pass 2: misses that found no free slot take the first slot no corner of this view uses.
  corners.forEach((id, k) => {
    if (out[k].slot >= 0) return;
    const i = slots.findIndex((s) => !s.usedThisFrame);
    if (i < 0) throw new Error("no slot for chunk; view wider than the cache");
    slots[i].chunkId = id;
    slots[i].usedThisFrame = true;
    out[k] = { slot: i, build: true };
  });
  return out;
}

// 2. Dirty regions: one upload covering first dirty region to end of last; clean regions are skipped by copy.
export function dirtySpan(regions: { start: number; used: number }[], dirtyMask: number): { offset: number; end: number } | null {
  let offset = -1;
  let end = 0;
  for (let r = 0; r < regions.length; r++) {
    if (dirtyMask & (1 << r)) {
      if (offset < 0) offset = regions[r].start;
      end = regions[r].start + regions[r].used;
    }
  }
  return offset < 0 ? null : { offset, end };
}

// 3. Frame pacer: measured frame time over the last N frames; the sleep moves at most 2 ms per frame toward the target.
export class Pacer {
  private samples: number[];
  private idx = 0;
  private sum: number;
  private sleepMs: number;
  private last: number | null = null;

  constructor(private interval: number, private n = 8) {
    this.samples = new Array<number>(n).fill(interval);
    this.sum = interval * n;
    this.sleepMs = interval - 6;   // donor starts 6 ms short of the interval
  }

  // now in ms; returns the ms to sleep before the next frame.
  tick(now: number): number {
    const raw = this.last === null ? this.interval : now - this.last;
    this.last = now;
    const elapsed = Math.min(raw, this.interval * 8);   // hitch clamp, as in the donor
    this.sum += elapsed - this.samples[this.idx];
    this.samples[this.idx] = elapsed;
    this.idx = (this.idx + 1) % this.n;
    const adjust = Math.max(-2, Math.min(2, this.interval - this.sum / this.n));   // float average (fix)
    this.sleepMs = Math.max(0, Math.min(this.interval - 1, this.sleepMs + adjust));
    return this.sleepMs;
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/client/zone-chunks.ts` (proposed path, not checked against the repo): a client-only static-geometry cache for zones (chunk slots, one draw per chunk, dirty-span upload for the HUD and per-frame lists). The engine does not read it.
- Frame pacer proposed as `origins/client/frame-pacer.ts` (same client scope).
- Parity-checklist row 16 (colour grade and quality). The hint said row 12, which is combat sound cues; no row in the addendum covers renderer cost. Lead to confirm the row.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: Frankendom one-engine rule (client rendering only, no engine state touched); rule 2 of the addendum (judge the idea, not the genre)

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- The donor's grid is 2D tiles with four view corners. Our zones are 3D, so the chunk must be an XZ cell chosen by a view radius, with cell size as zone data (chunk size and radius per zone, engine constant for the slot count).
- Donor defect, view wider than one chunk: the four corners span three chunk columns when the view is wider than a chunk, and only two columns are cached, so the middle column is not drawn. The donor enforces no check (grep of `chunk_width` and `chunk_height` shows only config, map and loader uses; not read in full). Fix: refuse or grow the cache when the radius exceeds one cell.
- Donor defect, id sentinel: `CHUNK_ID(255,255)` is 0xffff, the same value as the empty-slot marker (1443-1444, 1492). Fix: separate sentinel.
- Donor defect, rebuild spike: a miss builds a whole chunk inside the draw call (`_obtainChunkGeo` 1501-1502 inside `gpu_drawMap`). For a 16-tile chunk that is 256 quads on the render thread in one frame. Fix: build at most one chunk per frame and prefetch the next ring cell.
- Donor defect, frame interval: `1000/24` is integer division, so the target is 41 ms (about 24.4 fps), not 41.67 ms (`xu4.cpp` 268; `settings.h` 46). The animator steps 1/24 s (`screen.cpp` 894). Fix: float interval and one shared value for pacer and animator.
- Donor defect, effects follow frame count: the animator steps a fixed 1/24 s per drawn frame (`screen.cpp` 894) and the game clock adds the nominal interval per frame (`event.cpp` 313), so a slow phone frame slows effects and timers with no catch-up. The pacer's own hitch clamp (239) is measured time, so the two clocks disagree. Fix: step effects by measured time clamped to a few frames.
- Donor defect, buffer mapping: the work buffer maps its span write-only without an invalidate flag (938), and each triangle list maps its whole buffer every frame (971). The dual flag (497-518, 969) double-buffers some lists, but the work-buffer path uses one buffer (`gpu_updateWorkBuffer` writes `vbo[dl->bufI]` with no flip; the caller was not read). Fix: invalidate-range or orphaned buffers; double-buffer the work buffer. Not measured on a phone.
- Donor defect, atlas bleed and unnamed tiles: UVs are exact pixel edges with no half-texel inset (`imagemgr.cpp` 469-476), so linear sampling can bleed neighbours (whether the texture filter is linear was not read). Unnamed tile sub-images assume each tile is one tile wide (437-438). Fix: inset UVs by half a texel and use each sub-image's own width.
- Donor defect, pacer average: `ftimeSum / FS_SAMPLES` is integer division (`event.cpp` 248). Small error, fix: float average.
- Idea not in the donor: the chunk cache cuts draw calls to one per chunk. It does not batch dynamic objects (the donor's per-frame lists handle those separately), so monsters and the player still need the state-sorted queue idea from the other notes.
- Phone numbers: none in the donor (no timings in the code). Every number here is a default, not a measurement.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: Frankendom one-engine rule (client rendering only); rule 2 of the addendum (judge the idea)
