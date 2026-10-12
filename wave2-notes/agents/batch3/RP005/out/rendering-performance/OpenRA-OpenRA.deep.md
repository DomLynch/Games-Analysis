# OpenRA-OpenRA (rendering-performance, cell 17)

Donor: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Graphics/SpriteRenderer.cs` | Licence: GPL-3.0-or-later (file header: "version 3 of the License, or ... any later version"; COPYING is GPL v3) | C# | symbol `SpriteRenderer`

Checked: `SpriteRenderer.Flush` (62-95), `TrackQuad` (97-109) and `SetRenderStateForSprite` (111-162) read in full. Also read: `Renderer` constructor (88-106), `Renderer.Flush` (382-385), the `CurrentBatchRenderer` setter (396-406), `Manifest.cs` 45-47, `SheetBuilder.cs` (read, not part of this mechanism), `WorldRenderer.Draw` (276-300), `TerrainSpriteLayer.Draw` (210-235), `SpriteRenderable.Render` (100-113), `UISpriteRenderable` (61), `Sdl2GraphicsContext.DrawElements` (166-170). Grep only: `ThreadedGraphicsContext.DrawElements` (482-485), `RgbaSpriteRenderer` and `SpriteFont` callers. Confidence: high on the order of steps for a plain sprite. Medium on the secondary-sheet path (125-159), which I read but did not trace with a real sprite that has secondary data. Not read: `Util.FastCreateQuad`, the `OpenGL.cs` binding, and which context (direct or threaded) the game uses at runtime. Camera: not a camera cell (camera_scope not applicable).

Best transferable idea: Batch every sprite into one fixed vertex buffer and flush on four events (buffer full, too many textures, a blend-mode change does not flush but starts a new draw run, and a switch between two batch owners), so the draw-call count per frame is bounded and visible.

Decision (proposed): adapt - keep the budget, the texture-slot cap and the blend-run split; Frankendom reads the texture-unit cap at start-up instead of fixing it at 8, and counts draws per frame in a test.
Acceptance: A unit test on the batch object (no GPU) asserts that a 375-wide fight frame with 60 sprites submits no batch over the quad budget or texture-slot cap, and that one blend-mode change adds exactly one draw run; a still at 375 wide shows no missing or flickering sprites across a budget flush.

## 1. Mechanism

- One `SpriteRenderer` owns a fixed vertex array sized `TempVertexBufferSize` and a shared quad index buffer. Each sprite writes one quad (four vertices) at the next free slot and records which blend mode it uses. Nothing is drawn until a flush.
- Order of steps for one sprite (`DrawSprite` calls `SetRenderStateForSprite`, then `TrackQuad`):
  (a) Claim the live batch: `renderer.CurrentBatchRenderer = this` (113). If another batch was live, the setter flushes that batch first (404-405).
  (b) Budget: if `vertexCount + 4 > TempVertexBufferSize`, flush (115-116).
  (c) Texture slot: look for the sprite's sheet among the sheets already bound this batch (119-123). A sprite with secondary data also looks for its second sheet (125-140).
  (d) Slot cap: if the needed index is `>= sheets.Length` (eight), flush, reset to slot 0 and map again (142-147). Otherwise register new sheets (149-159) and return the sampler indices (161).
  (e) Blend run: `TrackQuad` starts a new span if the list is empty or the blend mode changed (99-100); otherwise it grows the last span by four vertices in place. Then `vertexCount += 4` (108).
- Flush (62-95): return if nothing is queued (64). Set each mapped sheet's texture unit (67-68). Upload only the queued vertices (71). Bind the index buffer and shader (72-74). Then one draw per blend span (78-85), with blend state set per span. Reset blend to None if the last span was not None (87-88). Count one batch (90). Clear the sheet slots and counters (92-94).
- Tick: no loop of its own. A flush happens when a sprite forces it, when the live batch changes, or when `WorldRenderer.Draw` calls `Game.Renderer.Flush()` (291), which sets the live batch to null (382-385) and so flushes it.
- Numbers: 8192 vertices per batch by default (Manifest 47), so 2048 quads per flush (Renderer 93 keeps the size a multiple of four). At most 8 texture units (37). Draws per flush = number of blend runs in that batch (84), so alternating blend modes cost one draw per run. Offsets go to GL as byte pointers (Sdl2GraphicsContext 169); `span.Start * 6` is 24 bytes per quad (6 indices x 4-byte uint), which is correct.

## 2. Key functions

- `SpriteRenderer.Flush`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Graphics/SpriteRenderer.cs` 62-95. Upload, one draw per blend run, reset.
- `SpriteRenderer.TrackQuad`: same file, 97-109. Span start and length per blend mode.
- `SpriteRenderer.SetRenderStateForSprite`: same file, 111-162. Live-batch claim, budget flush, texture-slot mapping, slot-cap flush, sampler indices.
- `Renderer.CurrentBatchRenderer` setter: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Renderer.cs` 396-406. Switching the live batch flushes the old one.
- `Renderer.Flush`: same file, 382-385. Sets the live batch to null, which flushes it.
- Callers: `SpriteRenderable.Render` (`OpenRA.Game/Graphics/SpriteRenderable.cs` 100-113) draws world sprites through `WorldSpriteRenderer`; `UISpriteRenderable` (61) draws UI through the separate `SpriteRenderer`. The `RgbaSpriteRenderer` wrappers and `SpriteFont` reach the same batch (grep only). `TerrainSpriteLayer.Draw` (210-235) bypasses the sprite path with `DrawVertexBuffer`.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed vertex budget, flush when the next quad would not fit | 8192 vertices (theirs, Manifest 47), so 2048 quads per flush |
| Texture-slot cap, flush and remap when a new sheet has no slot | 8 texture units (theirs, SpriteRenderer 37) |
| New draw run when blend mode changes, growing run in place | Blend modes are the engine's (alpha, additive, none) |
| One upload of the used vertices, one draw per run | `SetData` count = vertices queued (71); draw count = runs (84) |
| Batch-owner switch flushes the old owner first | Two batch owners: world and UI (Renderer 28, 106, 109) |
| Atlas sheet size for sequence sprites | 2048 px (theirs, Manifest 45) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (claim, budget flush, slot check, blend run, count) and the owner switch. It omits the secondary-sheet case, the sampler indices, the `PerfHistory` counter, the blend reset to None, the vertex upload and the shader and index binding. It records submissions in an array instead of issuing GL draws. Budget and slot numbers are the donor's defaults.

```ts
// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Blend = "none" | "alpha" | "additive";

interface Span { start: number; count: number; blend: Blend; }

interface Submission { slots: number[]; spans: Span[]; quads: number; }

// One batch = one vertex buffer of quads. maxQuads is the vertex budget / 4; maxSlots is the texture-unit cap.
class SpriteBatch {
  readonly submitted: Submission[] = [];
  private quads = 0;
  private slots: number[] = [];
  private spans: Span[] = [];

  constructor(private readonly maxQuads: number, private readonly maxSlots: number) {}

  draw(atlas: number, blend: Blend): void {
    // 1. Budget: a full vertex buffer flushes before the new quad is written.
    if (this.quads + 1 > this.maxQuads) this.flush();

    // 2. Texture slot: a new atlas needs a free slot; if none is free, flush and start again.
    if (this.slots.indexOf(atlas) < 0) {
      if (this.slots.length >= this.maxSlots) this.flush();
      this.slots.push(atlas);
    }

    // 3. Blend run: a new span starts only when the blend mode changes; otherwise the span grows.
    const last = this.spans[this.spans.length - 1];
    if (last === undefined || last.blend !== blend) this.spans.push({ start: this.quads, count: 1, blend });
    else last.count++;
    this.quads++;
  }

  flush(): void {
    if (this.quads === 0) return;
    this.submitted.push({ slots: [...this.slots], spans: this.spans.map((s) => ({ ...s })), quads: this.quads });
    this.quads = 0;
    this.slots = [];
    this.spans = [];
  }
}

// Renderer owns which batch is live. Switching batches flushes the old one first, so the
// world batch and the UI batch never interleave inside one GPU buffer.
class Renderer {
  private current: SpriteBatch | null = null;

  drawSprite(batch: SpriteBatch, atlas: number, blend: Blend): void {
    if (this.current !== batch) {
      this.current?.flush();
      this.current = batch;
    }
    batch.draw(atlas, blend);
  }
}

// Donor values: 8192 vertices -> 2048 quads; 8 texture units.
const world = new SpriteBatch(8192 / 4, 8);
const ui = new SpriteBatch(8192 / 4, 8);
const r = new Renderer();
r.drawSprite(world, 0, "alpha");
r.drawSprite(world, 1, "alpha");
r.drawSprite(ui, 2, "alpha");
r.drawSprite(world, 0, "additive");
world.flush();
ui.flush();
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/render-batch.ts` (new, client-only draw layer for the fight view; the engine in `src/fight` never imports it). The engine stays headless, so this module only reads engine state and draws.
- Parity-checklist row 16 (colour grade/quality): the batch is the render budget that a quality tier sets. Note: the brief's hint said row 12, but row 12 in the addendum is combat sound cues, so the row was chosen here from the addendum list.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only, shape not code)
- Brief rule served: 7 (licence: GPL clean-room, shape only); addendum rule: camera, HUD and sound are client-only.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch was written from the mechanism, not from the donor lines.
- The donor splits one draw per blend run. Alternating additive and alpha sprites give one draw per sprite in the worst case. The donor's comment (76-77) says the buffer can hold interleaved blend modes, but it does not reduce the draw count. Frankendom fix: group additive effects per layer where order allows, and count draws in the test.
- The eight-unit cap is fixed here. On phones the WebGL unit count differs, so Frankendom must read it at start-up. Not read in the donor.
- Frame pacing (`OpenRA.Game/Game.cs` Loop, 770-895: separate logic and render timestamps, a 250 ms catch-up cap, and a forced render once the replay minimum of 10 fps (100 ms) has passed) is a second mechanism in the same donor. It is not written up here and would need its own cell.
- Culling is also in the same path: `ScreenMap.RenderableActorsInBox` (`OpenRA.Game/Traits/World/ScreenMap.cs` 193-196) queries `SpatiallyPartitioned` bins of 250 px (`ScreenMapInfo.BinSize`, ScreenMap 32-37). Read, not written up here.
- Each flush is synchronous within the game thread, and the threaded context posts the draw call to a render thread (`ThreadedGraphicsContext.cs` 482-484). Which context is live was not traced, so the cost of a cross-thread flush on a phone is unknown.
- The vertex budget is an engine constant here. A Frankendom quality tier might make it data (per device tier), but that is a design call, not in the donor.
