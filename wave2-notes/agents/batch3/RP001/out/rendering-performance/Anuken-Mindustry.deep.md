# Anuken-Mindustry (rendering-performance, cell 17)

Donor: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/graphics/BlockRenderer.java` (chunk cache, 30 tiles per side) with `core/src/mindustry/graphics/Lod.java` (zoom level of detail) and the frame call sites in `core/src/mindustry/core/Renderer.java` | Licence: GPL-3.0 (repo LICENSE: "GNU GENERAL PUBLIC LICENSE / Version 3, 29 June 2007"). Neither BlockRenderer.java nor Lod.java has a per-file licence header (BlockRenderer.java line 1 is `package mindustry.graphics;`; Lod.java line 1 is the same kind of package line) | Java | symbol `BlockRenderer.processBlocks` / `BlockRenderer.cacheChunk` / `BlockRenderer.drawBlocks`; `Lod.update`

Checked: `BlockRenderer.java` read at 30, 66-82, 152-233 (recache and cache body), 235-240 (reload, partly), 508-580 and 606-650 (view gate, chunk list, recache loop), 667-725 (cache draw loop). `Lod.java` (1-32) read in full. `Renderer.java` 195-205, 592-600, 630-637 read. Callers: `Lod.update`, `Lod.disable` and the `Lod.l1`/`Lod.l2`/`alpha` reads were found by grep over `core/src` (about 20 sites in block, bridge, drill, projector and building code; I read only the lines the grep printed, not those bodies). `recacheBuilding` callers: BlockRenderer.java 110, 131, 814 and BuildingComp.java 1291 (call lines only; the event bodies around 105-131 were not read). Not read: the uncached block path (BlockRenderer 240-500, 725-end), `FloorRenderer.java` (it has its own chunk cache, call sites 152, 233, 380), Arc's `SpriteCache`, `Mathf.clamp` and `Draw` (Arc is not in the donor), `Block.drawCached` and `drawBaseCached`, the fog update path. Confidence high on the chunk cache order and the LOD formula; medium on whether every tile change reaches `recacheBuilding` (not traced). Camera: out of scope.

## 1. Mechanism

- Static blocks are drawn from cache, not one by one. The map is split into 30 x 30 tile chunks (`chunkSize = 30`, BlockRenderer.java 30). Each chunk has one cache per building layer (`chunk.caches[layer]`, `cacheChunk` 171-232). Only blocks strictly inside the chunk are baked (205-206) and only those with `drawCached` and the matching layer (206). Drawing a chunk replays a prepared list of cache ids (`queuedCacheDraws`).
- Dirty tracking is per chunk and per layer. A tile change calls `recacheBuilding` (152-169), which sets `chunk.dirty[layer]` (163). The chunk is put on the dirty-in-view list only if it is in the visible chunk set (166-167). Chunks out of view stay dirty and are not re-baked.
- Order of steps in `processBlocks` (522-644), which runs every frame:
  (a) Compute the view centre and range from the camera (523-527).
  (b) Early return if the centre, range and player team are all unchanged since last frame (539-541). The visible chunk list, the lists of tiles and lights, and the dirty set are not rebuilt in that case.
  (c) Otherwise rebuild the list of visible chunks from the blocks in the camera bounds (543-575). A block with `drawCached` adds its chunk once (572-575).
  (d) For each visible chunk: if it is new or was baked for another team, bake all layers (616-618); else bake only the layers marked dirty (621-623).
  (e) Record the cache ids to draw per layer (630-637).
- Order of steps in `drawBlocks` (667-707): on layer 0 only, re-bake dirty in-view chunks (680-690) and set the projection matrix once (692-694). Then for each layer, for each sprite cache that has chunks queued: flush, `begin(false)`, replay the chunk cache ids, `end()` (697-704). Uncached blocks are drawn individually afterwards (715+).
- Cache slots and budget: a chunk may need `chunkSize * chunkSize * maxSpritesPerCacheTile` sprites, that is 30 x 30 x 6 = 5400 (172). A new sprite cache is created when the current one cannot fit another chunk, with capacity `16382 - (16382 % required)` (182-184), which is 16200 in this build (derived, see section 3). A chunk that already has a cache id reuses it (191-192).
- LOD (Lod.java): the on-screen scale is `graphics.getWidth() / camera.width` (25). Two detail levels fade in on a clamped linear ramp: `alpha1 = clamp((scale - 1.4) / 0.2)` and `alpha2 = clamp((scale - 0.8) / 0.2)` (27-28). A level is on while its alpha is at least 1/255 (29-30). `Lod.update()` runs once per frame (Renderer.java 201). With `Lod.disable` set, both levels are on at full alpha (20-23). The screenshot path sets `disable` for the capture and clears it in `finally` (Renderer.java 598, 635).
- Where LOD is used: the bridge arrows (`ItemBridge` 421-425, `DirectionBridge` 188-189), beam drill (`BeamDrill` 327-339), mend and overdrive projectors (`MendProjector` 149-154, `OverdriveProjector` 140-147), power node lasers (`PowerNode` 184), bubbles (`DrawBubbles` 26-29), building status colour (`BuildingComp` 1228-1230). Each one either skips the detail or multiplies its alpha.

## 2. Key functions

- `BlockRenderer.recacheBuilding`: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/graphics/BlockRenderer.java` 152-169 (dirty flag; dirty-in-view list).
- `BlockRenderer.cacheChunk`: same file, 171-233 (bakes one chunk for one layer; reserve and end).
- `BlockRenderer.processBlocks`: same file, 522-644 (view gate, visible chunk list, bake-or-skip per chunk).
- `BlockRenderer.drawBlocks`: same file, 667-707 (re-bake dirty in-view chunks, replay per sprite cache).
- `Lod.update` and the thresholds: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/graphics/Lod.java` 7-31.
- Per-frame calls: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/core/Renderer.java` 201 (`Lod.update()`), 324 (`blocks.processBlocks()`), 431 (`blocks.drawBlocks()`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Bake static tiles per chunk; re-bake only dirty chunks in view | 30 tiles per chunk side (BlockRenderer.java 30) |
| Sprite budget per chunk | 6 sprites per tile (30) gives 5400 sprites per chunk (172) |
| Sprite cache slot holds whole chunks only | Capacity 16382 minus the remainder after whole chunks (184). Derived, not run: 16200 sprites, so 3 chunks per slot at 5400 each |
| Skip all work when the view is unchanged | Compares centre, range and team (539) |
| Zoom LOD: two thresholds with a linear fade | Thresholds 1.4 and 0.8 (Lod.java 8); fade width 0.2 (9); on-threshold alpha 1/255 (29-30) |
| Zoom scale | Pixels divided by camera width (25) |
| Screen-capture override | `disable` forces both levels on (20-23) |

Sketch test (run on the VPS): 2 chunks in view on first use gave 2 bakes. A dirty tile in view gave 1 bake. A dirty tile in a chunk that was never baked gave 0. Repeating the same view gave 0 (early return). A new view with 7 chunks gave 5 new bakes and 3 sprite slots. LOD alphas at scale 1.0, 1.5, 1.6 and 2.0 were 0, 0.5, 1 and 1, and the level-2 check at scale 0.7 was off.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: dirty-only re-bake of visible chunks, the view and team early return, per-slot budget, and the clamped LOD fade. It omits the per-layer caches (one layer here), the quadtree queries that pick the blocks inside a chunk, the fog test inside the bake, the team overlay, the draw replay (the bake callback stands in for it), the uncached block path, the layer-0-only re-bake in `drawBlocks`, the `flush`/`begin`/`end` calls, and the destroyed-block drawing. It also takes the chunk key as a packed number. The clean-room note: GPL-3.0 donor; written from the described mechanism, not a translation of the Java.

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const CHUNK = 30;                 // tiles per chunk side
const SPRITES_PER_TILE = 6;
const REQUIRED = CHUNK * CHUNK * SPRITES_PER_TILE;   // sprites a chunk may need
const SLOT_SPRITES = 16382 - (16382 % REQUIRED);     // whole chunks per slot only

type Key = number;
const pack = (cx: number, cy: number): Key => cx * 65536 + cy;
const unpack = (k: Key): [number, number] => [Math.floor(k / 65536), k % 65536];

interface Chunk { dirty: boolean; team: number; slot: number; cacheId: number }

class StaticChunkCache {
  private chunks = new Map<Key, Chunk>();
  private slotsUsed: number[] = [];
  private nextCacheId = 0;
  private dirtyInView = new Set<Key>();
  private inView = new Set<Key>();
  private lastView = "";
  private lastTeam = -1;

  constructor(private readonly recache: (cacheId: number, cx: number, cy: number) => void) {}

  markTileDirty(tx: number, ty: number): void {
    const k = pack(Math.floor(tx / CHUNK), Math.floor(ty / CHUNK));
    const c = this.chunks.get(k);
    if (c === undefined) return;   // never baked: nothing to refresh
    c.dirty = true;
    if (this.inView.has(k)) this.dirtyInView.add(k);   // only in-view chunks are refreshed now
  }

  private cacheChunk(k: Key, team: number): void {
    let c = this.chunks.get(k);
    if (c === undefined) {
      let slot = this.slotsUsed.length - 1;
      if (slot < 0 || this.slotsUsed[slot] + REQUIRED > SLOT_SPRITES) {
        this.slotsUsed.push(0);
        slot = this.slotsUsed.length - 1;
      }
      this.slotsUsed[slot] += REQUIRED;
      c = { dirty: false, team, slot, cacheId: this.nextCacheId++ };
      this.chunks.set(k, c);
    }
    const [cx, cy] = unpack(k);
    this.recache(c.cacheId, cx, cy);
    c.dirty = false;
    c.team = team;
  }

  // Per frame: skip all work when the view and team are unchanged; otherwise refresh visible chunks.
  prepare(viewKey: string, team: number, visibleChunks: Key[]): void {
    if (viewKey === this.lastView && team === this.lastTeam) return;
    this.lastView = viewKey;
    this.lastTeam = team;
    this.inView = new Set(visibleChunks);
    this.dirtyInView.clear();
    for (const k of visibleChunks) {
      const c = this.chunks.get(k);
      if (c === undefined || c.team !== team || c.dirty) this.cacheChunk(k, team);
    }
  }

  // Before drawing: refresh dirty chunks that are in view.
  flushDirty(): void {
    for (const k of this.dirtyInView) {
      const c = this.chunks.get(k);
      if (c !== undefined && c.dirty) this.cacheChunk(k, this.lastTeam);
    }
    this.dirtyInView.clear();
  }

  slotCount(): number { return this.slotsUsed.length; }
}

// zoom level of detail: pixels per world unit, one threshold, linear fade over `fade`
function lodAlpha(pixelsPerUnit: number, threshold: number, fade: number): number {
  const a = (pixelsPerUnit - threshold) / fade;
  return Math.min(1, Math.max(0, a));
}
function levelOn(alpha: number): boolean { return alpha >= 1 / 255; }
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS with `export {}` at the top of the file: exit 0. The test harness ran on the VPS under `node --experimental-transform-types`; its output is in section 3.

## 5. Lands in

- TARGET `src/client/render/zone-chunks.ts` (new, client-only). Zone static geometry (floor, props that never move) is baked per chunk and re-baked only when a tile in view changes. No `src/fight` module owns rendering, so this is a named exception to the brief's path rule.
- Parity row 16 (colour grade/quality). Plainly: no row 1-23 is a render-cost row. Row 16 is the closest because it is the quality row; this mechanism is a performance fit, not a colour fit.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (client-only rendering; the engine decides state, the client only draws it); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0: clean-room only. Do not copy the Java.
- Frankendom is Three.js. The port is "merge the static meshes of one chunk into one geometry and rebuild that geometry when a tile in view changes", not a port of the Arc `SpriteCache` calls (Arc is not in the donor; its API was not read).
- Dirty marks must come from server-applied state. In this donor the dirty marks come from the game's own tile events (BlockRenderer 110, 131, 814; BuildingComp 1291). In Frankendom, zone state changes come from the engine, so the client must not mark chunks dirty from a guess. The donor is not a model for that.
- Fog is baked into the cache (BlockRenderer 211-213). If Frankendom has fog or visibility that changes without a tile change, a chunk can be stale. The donor's fog update path was not read, so I do not know whether it marks chunks dirty (not read).
- The LOD in this donor is zoom-based: scale is pixels per camera width (Lod.java 25). Frankendom's fight camera is a follow camera with distance, not a zoom, so the zoom formula does not transfer. The idea that transfers is "two detail levels, a linear fade, and skip the detail when alpha is below 1/255". Using distance-to-camera for the trigger would be a separate design (not built or measured). Decision for LOD: reject as written.
- The 16200-sprite slot is derived from the 16382 constant (BlockRenderer.java 184); the actual sprite limit depends on Arc's `SpriteCache` (not read). Do not treat 16382 as a tested limit.
- Frame time is not measured on any device.

Best transferable idea: bake static tiles in fixed-size chunks, re-bake only the chunks in view whose tiles changed, and skip the whole pass when the view and team have not changed.
Decision (proposed): adapt - take the chunk bake, dirty-in-view re-bake and view early return for zone static geometry in Three.js; reject the zoom LOD as written, since Frankendom's camera has no zoom, and keep any distance LOD as a separate design.
Acceptance: walking through a zone with no tile change keeps frame time flat; a client test asserts that a second prepare with the same view and team bakes nothing, and that one tile change in view bakes exactly one chunk (sketch test: dirty-in-view gives 1 bake, unchanged view gives 0).

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 1 (client-only rendering; the engine decides state, the client only draws it); rules 7-9 n/a
