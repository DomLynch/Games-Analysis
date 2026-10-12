# gawric-Unity-Client-for-L2J (rendering-performance, cell 17)

Donor: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/UI/Game/Nameplate/` (`NameplatesManager.cs`, `Rendering/L2NameplateScreenBatch.cs`, `Rendering/NameplateTextDrawer.cs`, `Rendering/NameplateBubbleDrawer.cs`, `Logic/NameplateEntryStore.cs`, `Logic/NameplatePixelSnap.cs`) | Licence: Apache License 2.0 (`/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/LICENSE`, line 2 "Version 2.0, January 2004"; permissive, code may be adapted) | C# (Unity) | symbol `L2NameplateScreenBatch.UploadAndDraw`

Checked: Read in full: L2NameplateScreenBatch.cs (1-342), NameplatesManager.cs (1-60, 137-192), NameplateTextDrawer.cs (1-116), NameplateBubbleDrawer.cs (63-164), NameplatePixelSnap.cs (1-59), NameplateEntryStore.cs (40-75, 155-250, 263-293). Other rendering candidates opened: `Rendering/FpsLimiter.cs` (29 lines: focused 60, unfocused 5, vSync off; thin, a fragment, not used as the verdict). Seen by grep only, not read: `ParticleGroupGpuDrawer.cs`, `ParticleDrawBatch.cs`, `L2InstancedPropRenderer.cs`, `LightLOD.cs`, `LayerCullDistance.cs`, `CameraController.IsObjectVisible` (called at NameplateEntryStore.cs 290, body not read). The list hint (`Editor/L2FxSpriteAtlasHoleLogger.cs`) was not opened; by its name it is an editor logger, not the nameplate implementation. Nothing here is terrain, foliage, water or weather. Unity's FixedUpdate rate (project settings) was not read. The README claim "all nicks in one draw call" (README.md 19) is true for the names only: bubbles add up to three more draws (see 3). Confidence: high on the label batch, the draw count and the snap; medium on the visibility camera check (not read). camera_scope: not a camera cell.

Best transferable idea: Build every label on the frame into one shared glyph list, upload it once and draw it once per group (text, then at most three bubble types), and hold each label's pixel position inside a hysteresis band so text does not shimmer.
Decision (proposed): adapt - keep the one-batch-per-group shape and the hysteresis pixel lock; drop the Unity StructuredBuffer and RenderPrimitivesIndexed calls, which are Unity API. Frankendom's labels are only for the local player, the target, hover and the three attackers (MAX_ATTACKERS = 3), so the draw count stays bounded by design; the donor's view-distance discovery is a physics query and should become a client read of engine state.
Acceptance: On a 375 px phone with the local player, one target and three attackers on screen, the label layer submits at most four draw calls (one per non-empty group), and a label standing still does not move by more than 1 px between frames (the snap holds the pixel).

## 1. Mechanism

- Discovery runs on the physics tick. `NameplatesManager.FixedUpdate` (137) sphere-casts from the player with radius `_nameplateViewDistance` (default 50, line 12; the cast's radius is on line 153) and stores the hits (151-156). `NameplateEntryStore.Discover` (40) turns each hit with an identity into an entry. Then `EnsureHoverAndTarget` (72), an upsert of the local player (161-164), and `RefreshVisibility` (162) run in that order.
- Visibility is decided per entry in `RefreshVisibility` (162-205) through `IsNameplateVisible` (263). Order of checks: the local player is always visible (273-276); hover or target is always visible (278-281); beyond the view distance is not visible (283-286); otherwise the camera check `CameraController.Instance.IsObjectVisible(target)` (288-291, body not read). Then, if an entry is not visible, not local, and not hover or target, it is removed from the entry store and its snap state is cleared (193-203).
- Paint list. `BuildPaintList` (207) runs at render time, not on the physics tick. It skips entries that are not visible, have no target, or have an empty name (217), reads the name and title from the entity identity (222-231), resolves a bubble type per entry (234), and adds a paint item with the head world position (239).
- Per camera, once. `OnBeginCameraRendering` (169) only runs for the camera it resolves to (171-175). It builds the paint list (183), then calls the text drawer (189) and the bubble drawer (190).
- Text draw (`NameplateTextDrawer.Draw`, 41-110). The batch is cleared once (48). For each item: project with `WorldToScreenPoint` (67); skip if `screen.z <= 0` (68-72); snap x and y through `NameplatePixelSnap` (77-82), where the snap distance is the orbit distance for the local player and the depth otherwise (79); place the title above the name (85-93) and the name centred on its measured width (95-99), appending glyphs with `AppendLine`; record the placement for the bubble pass (101-105). Then one `UploadAndDraw` (109).
- Bubble draw (`NameplateBubbleDrawer.Draw`, 63-118). Counts the paint items per bubble type (80-100); for each type with at least one item, it runs `DrawForType` (104-117), which appends one bubble pair per item of that type (141-160) and calls `UploadAndDraw` (162). So one draw per present type: normal, target, attack.
- Glyph batch (`L2NameplateScreenBatch`). `BeginFrame` (85) clears the lists. `AppendLine` (98) and `AppendQuad` (150) write `GlyphVertex` records (32 bytes, line 15) into one list. `UploadAndDraw` (218) returns false when disposed, without material, or without geometry (220). Otherwise it grows the GPU buffers to a power of two, minimum 256 glyphs and 384 indices (298, 309), copies the list into a scratch array (227-230), uploads it (237-238), sets the buffer on the material (241), and either queues it on the GPU overlay queue (242) or issues one `Graphics.RenderPrimitivesIndexed` (261).
- Pixel snap (`NameplatePixelSnap.Snap`, 18-48). `hold` starts at max(0.51, 0.75) (11, 20). If the depth is between 0.01 and 2.5, `hold` becomes max(hold, 1.4 / max(0.45, depth)) (21-24): at depth 0.5 that is 2.8 px; at depth 1.87 and beyond it is back to 0.75 px. The candidate is the rounded raw position (26). On first sight the candidate is stored and returned (28-33). Otherwise the stored value is kept while |raw - prev| is below `hold`, else the candidate is used (35-47).

## 2. Key functions

- `L2NameplateScreenBatch.UploadAndDraw`: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/UI/Game/Nameplate/Rendering/L2NameplateScreenBatch.cs` 218-269. One upload, one indexed draw per batch.
- `NameplateTextDrawer.Draw`: same folder, `Rendering/NameplateTextDrawer.cs` 41-110. Projection, snap, layout, one batch.
- `NameplateBubbleDrawer.Draw` and `DrawForType`: `Rendering/NameplateBubbleDrawer.cs` 63-163. Up to three batches, one per bubble type, drawn only if present.
- `NameplatesManager.FixedUpdate` and `OnBeginCameraRendering`: `NameplatesManager.cs` 137-167 and 169-191. Physics-tick discovery; per-camera paint.
- `NameplateEntryStore.RefreshVisibility` and `IsNameplateVisible`: `Logic/NameplateEntryStore.cs` 162-205 and 263-295. Visibility and removal rules.
- `NameplatePixelSnap.Snap`: `Logic/NameplatePixelSnap.cs` 18-48. Hysteresis lock.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| One list per frame, one upload, one draw per group | Text: 1 draw. Bubbles: one draw each for normal, target and attack, only if present, so 1 to 4 draws per camera per frame (NameplateBubbleDrawer.cs 104-117, NameplateTextDrawer.cs 109) |
| Power-of-two buffer growth | Minimum 256 glyphs (L2NameplateScreenBatch.cs 298), 384 indices (309) |
| Vertex record size | 32 bytes per glyph (`GlyphStride`, line 15) |
| View distance for labels | 50 units default (NameplatesManager.cs 12), tested by distance (NameplateEntryStore.cs 283) |
| Pixel hysteresis | Default 0.75 px (NameplatePixelSnap.cs 11); floor 0.51 px (20); near band depth 0.01 to 2.5 (21); near hold 1.4 / max(0.45, depth) (23) |
| Snap rounding | Candidate is `Mathf.Round` of the raw pixel (26) |
| Local player and hover or target are always labelled | Lines 273-281 of NameplateEntryStore.cs |

Defects found, with fixes (the idea is kept):
- First-sight seeding of the Y axis. On first sight the donor stores `new Vector2(candidate, candidate)` (NameplatePixelSnap.cs 30). The first call is for X, so the Y value is seeded with the X pixel. Y then compares against the wrong value for that frame; the error is bounded by `hold` (0.75 px or more for near labels) and only occurs when the Y raw position is within `hold` of the X pixel. Fix: seed each axis separately, `NaN` until first seen (sketch, `PixelSnap.snap`).
- Per-tick allocation. `Physics.SphereCastAll` (NameplatesManager.cs 151-156) returns a new array every FixedUpdate. Fix: reuse one list and fill it (sketch, `DiscoverBuffer.collect`). A physics overlap with a reusable buffer would be the Unity version of the same fix; not verified against the Unity API here.
- Double copy per frame. `UploadAndDraw` copies the glyph list into `_glyphScratch` (227-230) before `SetData` (237). Fix: write quads straight into the upload array (sketch, `GlyphBatch.addQuad`). Whether the Unity `SetData` overload accepts the list directly was not checked.
- Off-screen labels are not culled. `NameplateTextDrawer.Draw` skips only `screen.z <= 0` (68-72). An anchor outside the screen rectangle is still laid out and appended. Fix (not in the sketch, to add): skip anchors outside the viewport plus a margin of about one label height, before the glyphs are appended.

## 4. TypeScript sketch

simplified: keeps the donor order: visibility rules first (local and hover or target always, then distance, then a camera check), a pixel lock with the donor's hold rule, one shared batch per group that is drawn once, and a draw-call count per group. It omits: the glyph-level layout (one quad per label here, not one quad per glyph), the title and name measurement, the bubble art and its UV rectangles, the GPU overlay queue, the depth-sorting of labels, the camera check body (`inView` is a parameter; the donor's body was not read), the spatial index (a linear scan here), and the Unity draw calls themselves. Fixes in the sketch: each axis of the pixel lock is seeded on its own; the discover list is reused; quads are written straight into the upload array. The batch doubles its capacity from 256 vertices, as the donor does for glyphs; the donor's minimum for indices (384) has no counterpart here.

```ts
// Donor licence: Apache-2.0 (permissive; code may be adapted). This sketch is written from the described shape, not translated.
export interface Vec3 { x: number; y: number; z: number }

export interface Plate {
  id: number;
  pos: Vec3;          // entity position, used for the view-distance test
  head: Vec3;         // point above the head that the label is drawn at
  isLocal: boolean;
  hoverOrTarget: boolean;
}

// Local player and hover/target are always shown; others need distance and a camera check.
export function plateVisible(p: Plate, self: Vec3, viewDist: number, inView: (v: Vec3) => boolean): boolean {
  if (p.isLocal || p.hoverOrTarget) return true;
  const dx = p.pos.x - self.x, dy = p.pos.y - self.y, dz = p.pos.z - self.z;
  if (Math.sqrt(dx * dx + dy * dy + dz * dz) > viewDist) return false;
  return inView(p.head);
}

// Fix: reuse one hit list per tick instead of allocating a new array (donor allocates via SphereCastAll).
// Linear scan here; a spatial hash would replace it.
export class DiscoverBuffer {
  private hits: number[] = [];
  collect(entities: { id: number; pos: Vec3 }[], self: Vec3, radius: number): number[] {
    this.hits.length = 0;
    const r2 = radius * radius;
    for (const e of entities) {
      const dx = e.pos.x - self.x, dy = e.pos.y - self.y, dz = e.pos.z - self.z;
      if (dx * dx + dy * dy + dz * dz <= r2) this.hits.push(e.id);
    }
    return this.hits;
  }
}

// Pixel lock with hysteresis: keep the last pixel while the raw position stays inside the hold band.
export class PixelSnap {
  private last = new Map<number, { x: number; y: number }>();
  constructor(public hysteresisPx = 0.75) {}

  // depth: distance used for the near-target band (metres). Returns the pixel to draw at.
  snap(id: number, raw: number, axis: "x" | "y", depth: number): number {
    let hold = Math.max(0.51, this.hysteresisPx);
    if (depth > 0.01 && depth < 2.5) hold = Math.max(hold, 1.4 / Math.max(0.45, depth));
    const candidate = Math.round(raw);
    let s = this.last.get(id);
    // Fix: each axis is seeded on its own; the donor seeds both axes with the x value on first sight.
    if (s === undefined) { s = { x: NaN, y: NaN }; this.last.set(id, s); }
    const prev = axis === "x" ? s.x : s.y;
    const out = Number.isNaN(prev) || Math.abs(raw - prev) >= hold ? candidate : prev;
    if (axis === "x") s.x = out; else s.y = out;
    return out;
  }
  clear(id: number): void { this.last.delete(id); }
}

// One shared glyph batch per draw group: quads are written straight into a growing Float32Array
// (4 floats per vertex: x, y, depth, palette index), so there is no second scratch copy per frame.
export class GlyphBatch {
  private data = new Float32Array(0);
  private floats = 0;
  quadCount = 0;

  beginFrame(): void { this.floats = 0; this.quadCount = 0; }

  addQuad(x1: number, y1: number, x2: number, y2: number, depth: number, colour: number): void {
    x1 = Math.floor(x1); y1 = Math.floor(y1); x2 = Math.floor(x2); y2 = Math.floor(y2);
    if (x2 <= x1 || y2 <= y1) return;
    const need = this.floats + 16;
    if (need > this.data.length) this.grow(need);
    const corners = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
    for (const [x, y] of corners) {
      this.data[this.floats++] = x;
      this.data[this.floats++] = y;
      this.data[this.floats++] = depth;
      this.data[this.floats++] = colour;
    }
    this.quadCount++;
  }

  // Capacity doubles from 1024 floats (256 vertices), so it is always a power of two.
  private grow(need: number): void {
    let cap = Math.max(1024, this.data.length);
    while (cap < need) cap *= 2;
    const next = new Float32Array(cap);
    next.set(this.data.subarray(0, this.floats));
    this.data = next;
  }

  // The GPU upload would take data.subarray(0, floats); the batch is empty if quadCount is 0.
  view(): Float32Array { return this.data.subarray(0, this.floats); }
}

// Draw-call budget: one call per non-empty batch. Text is one batch; bubbles are up to three.
export function drawCallCount(batches: GlyphBatch[]): number {
  return batches.filter((b) => b.quadCount > 0).length;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, with `export {};` appended: exit 0.

## 5. Lands in

- TARGET `origins/client/nameplates.ts` (new, client-only). Not `src/fight/`: the rulings keep `src/fight` to the engine, and labels are a presentation of engine state.
- Parity row 14 (HUD). Labels are HUD in Frankendom's checklist. The list hint said row 12, but row 12 is combat sound cues and does not fit a label batch, so this note uses row 14 and says so.
- today: not checked in this pass (no Frankendom label code was read).
- Reuse tag: adapt from idea (Apache-2.0; code may be adapted, but this sketch is clean-room from the shape).
- Brief rule served: client-only presentation of engine state; draw budget per frame; labels only for the local player, the target, hover and the attackers (MAX_ATTACKERS = 3).

## 6. Gaps and risks

- The donor creates an entry for every entity in range (50 units) that has an identity, and paints only the visible ones. Frankendom labels only the four roles above (local player, target, hover, attackers). The donor's distance rule is still useful for a crowd, but it should be an engine-side set of ids (one ledger), read by the client, not a physics query on the client.
- The donor's visibility camera check (`CameraController.IsObjectVisible`) was not read. Off-screen labels are not culled (defect 4 above); fix before using the donor's shape at 375 px.
- Bubbles are the threat colour code (normal, target, attack). A per-type draw count of up to three is fine at MAX_ATTACKERS = 3, but the donor has no cap on how many labels are drawn in one frame; Frankendom's cap must come from the attacker limit, not from distance alone.
- The snap hold grows for labels closer than about 1.87 m (1.4 / depth). Near labels will look steadier and lag more. Check at the fight camera distance before adopting the near band.
- Unity API details (StructuredBuffer, `RenderPrimitivesIndexed`, `RenderParams`, the GPU overlay queue) do not transfer. Frankendom's equivalent is an instanced quad or a 2D overlay; the batch shape is what carries over.
- Not read: `CameraController.IsObjectVisible`, `EntityIdentity` loading, `NameplateBubbleResolver` rules (only its call sites), the GPU overlay queue, the font measurement code beyond calls.

Reuse tag: adapt from idea (Apache-2.0; clean-room sketch)
Brief rule served: client-only presentation of engine state; per-frame draw budget; labels bounded by the attacker limit
