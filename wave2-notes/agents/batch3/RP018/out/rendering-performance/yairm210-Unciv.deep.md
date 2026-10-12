# yairm210-Unciv (rendering-performance, cell 3)

Donor: `/mnt/frankendom-donors/yairm210-Unciv/core/src/com/unciv/ui/screens/basescreen/TextureArraySpriteBatch.java` (with `FontLodBiasBatch.kt`, `UncivStage.kt`, `components/fonts/MipmappedFontTexture.kt`) | Licence: CC0-1.0 for this file (its header says "Forked from carlislefox/libgdx-texture-array-batch ... License: CC0-1.0, see LICENSE-TextureArraySpriteBatch"; that file is the CC0 1.0 Universal text). The repo root LICENSE is MPL-2.0; the file header governs this file. | Java (libGDX) | symbol `TextureArraySpriteBatch` (hint file is right)

Checked: confidence high on the batch mechanism (read in full: constructor 194-254, begin/end 331-378, the draw overload at 656-700, the raw-vertex overload at 753-780, flushIfFull, flush, activateTextureCached and activateTexture at 1146-1271, bindTexture and restoreTextureBindings 67-80, getMaxTextureUnits 1406-1431; FontLodBiasBatch.kt in full, 33 lines; UncivStage.kt getBatch; callers of invalidateTextureBindings). Spot-read: the other draw overloads (only their flushIfFull and activate lines). Not read: `createDefaultShader` and the shader source (255-330), `setupMatrices`, `applyBlendState`, `Texture.bind` in libGDX, `MipmappedFontTexture.prepareForDraw`. Callers checked by grep under `core/src`. Camera scope: not a camera cell. Confidence in the licence reading: high for the file header; CC0 is not one of the three classes in the brief, so I recorded it as permissive and Lead should confirm.

Best transferable idea: keep a small table of texture slots and write each sprite's slot index into its vertices, so one draw call can cover sprites from several textures, and flush only when the vertex buffer is full or a new texture needs a slot that is still in use.
Decision (proposed): adapt — the slot table is the right shape for a HUD that draws icons, bars, numbers and a font in one frame; the donor's counting by runs, its doc mismatch and its lack of aging are fixed in the sketch, and the HUD should also use one atlas so eviction flushes rarely happen.
Acceptance: a unit test on the HUD batch draws a 40-sprite HUD frame that uses six textures with at least eight slots and asserts at most two draw calls; a test with more textures than slots asserts that an evicted texture is bound again at its next draw. On a phone at 375 wide the frame log shows the HUD draw count per frame.

## 1. Mechanism

- Buffers: one mesh sized for `size` sprites (four vertices and six indices per sprite, `TextureArraySpriteBatch.java` 224, 243). Each vertex has x, y, packed colour, u, v and one extra float, the texture slot index (`vertices` is allocated as `size * (SPRITE_FLOAT_SIZE + 4)` floats in the constructor, line 232; the constant `SPRITE_ATTRIBUTE_LENGTH` is 24, line 93). Maximum 8191 sprites per batch (196): 32767 indices / 4 vertices.
- Texture slots: the unit count is the driver value `GL_MAX_TEXTURE_IMAGE_UNITS` (1410). `getMaxTextureUnits` (1406-1431) probes it by compiling the shader with that many samplers and halves the count when compilation fails (1422).
- Every draw call (example overload at 656-700): first `flushIfFull()` (a flush if fewer than 24 float slots remain, 1148-1150), then `activateTextureCached(texture)` gives a slot index `ti`, then the four vertices are written with `ti` in each (663 onward).
- Slot choice (`activateTexture`, 1203): if the texture is already in a slot, use it (1210-1211). If the table has room, bind the texture to the next free unit at once (1222-1225). Otherwise, if sprites are pending, flush them first (1230), choose the least-counted slot (the last one on ties, 1234-1245), normalise every count to 0..100 by the maximum (1252-1255), and give the new texture the average count (1258-1261) as a fair chance. A swap is counted (1266).
- Counting: `activateTextureCached` increments a slot's count only when the texture differs from the previous draw (1189-1196). So the count measures runs of one texture, not sprites.
- Flush (1154): `restoreTextureBindings` (74-80) rebinds the cached slots only if some bind or external upload has happened since the batch last checked; then the optional `prepareFlush` hook runs (empty in the base class, 64-65); then one `mesh.render` call with `sprites * 6` indices (1178) draws the batch. Counters record renders and sprites per batch (1162-1166).
- Binding version: a static counter (`textureBindingVersion`, 55) bumped by every bind (`bindTexture` 67-72) and by every external call to `invalidateTextureBindings` (font textures, `MipmappedFontTexture.kt` 23, 31, 37; `FontRulesetIcons.kt` 136). A batch rebinds its slots at the next flush only if the version changed since its last check (75-79). `begin` clears the table and invalidates (340-344), so the first use of each texture in every begin is a bind.
- Font hook: `FontLodBiasBatch` (33 lines) overrides `prepareFlush`: at each flush it sets a per-slot LOD bias uniform, -0.5 for `MipmappedFontTexture` slots and 0 otherwise (`FontLodBiasBatch.kt` 22-32, bias set at 25), and it lets font pages refresh their glyphs in their slot (27). Images and text can therefore share a draw call.
- Stage choice: `UncivStage.getBatch(size = 1000)` (`UncivStage.kt` 26) returns `FontLodBiasBatch` unless the user disabled the newer rendering or construction throws, then a plain `SpriteBatch`.

## 2. Key functions

- Batch construction: `TextureArraySpriteBatch.java` 194-254 (texture units, mesh, index pattern).
- `begin` (331) and `end` (362): `end` flushes once and restores the depth mask and blend.
- Draw overloads: 656-700 (one sprite, from a texture and UV); 753-780 (raw vertex data; the texture is activated once, then the loop checks capacity per sprite, 762-767); flush-check and activate lines in the other overloads at 421-423, 553-555, 613-615, 710-712, 791, 839, 959, 1095 (spot-read).
- `flushIfFull` 1146-1150; `flush` 1154; `activateTextureCached` 1189; `activateTexture` 1203-1266; `bindTexture` 67-72; `restoreTextureBindings` 74-80.
- `getMaxTextureUnits` 1406-1431. Class javadoc 27-46 (the batch is for many textures between begin and end; call begin and end once per frame).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Slot table size = driver texture units | Probed value, halved on compile failure (1410-1422) |
| Sprites per batch | Code default 3000 (172); javadoc says 1000 (169); `UncivStage.getBatch` default 1000 (26); hard cap 8191 (196) |
| Vertex data per sprite | 4 vertices x (5 floats + 1 slot float) = 24 floats (93, 224) |
| Flush when free space is below one sprite | 24 floats (1148) |
| Count scale after eviction | 0..100 (`normalizeRange` in `activateTexture`, 1255) |
| Font LOD bias for font pages | -0.5 (`FontLodBiasBatch.kt` 25); 0 for images |
| Frame use | begin and end once per frame (javadoc 35) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's slot table, the rule that a new texture triggers a flush before its slot is reused (the pending sprites still point at it), the per-sprite capacity flush, the average-count "fair chance", and the least-count eviction with the last index winning ties. It changes three things on purpose: the count is per sprite, not per run (the donor counts only when the texture changes); every count is halved at each eviction, so an early burst ages out (the donor only rescales); the sprite cap is checked in the constructor against 8191. It omits the GL calls, the binding version and the rebinding on flush, the float vertex layout and mesh, the blend and shader state, the `prepareFlush` font hook, and the counters.

```ts
// Licence: CC0-1.0 (donor file header and LICENSE-TextureArraySpriteBatch). clean-room sketch written from the described mechanism, not a translation of the donor lines.

export interface Tex { id: number; }

// Sprite batch with a small table of texture slots (one per texture unit). Each sprite carries its slot index.
// The batch is drawn when it is full, or when a new texture needs a slot and the table is full.
export class SlotBatch {
  private slots: (Tex | null)[];
  private hits: number[];          // per slot, counted per sprite (fix: the donor counts runs of one texture)
  private used = 0;
  private pending = 0;
  flushes = 0;

  constructor(
    private units: number,
    private maxSprites: number,
    private draw: (count: number, bound: (Tex | null)[]) => void,
  ) {
    if (maxSprites > 8191) throw new Error("max 8191 sprites per batch (32767 indices / 4)");
    this.slots = new Array<Tex | null>(units).fill(null);
    this.hits = new Array<number>(units).fill(0);
  }

  begin(): void {
    this.slots.fill(null);
    this.hits.fill(0);
    this.used = 0;
    this.pending = 0;
    this.flushes = 0;
  }

  flush(): void {
    if (this.pending === 0) return;
    this.draw(this.pending, this.slots);
    this.pending = 0;
    this.flushes++;
  }

  // Adds one sprite and returns the texture slot to write into its vertices.
  addSprite(tex: Tex): number {
    if (this.pending >= this.maxSprites) this.flush();   // capacity flush, checked per sprite
    let slot = this.slots.indexOf(tex);
    if (slot < 0) {
      if (this.used < this.units) {
        slot = this.used++;
        this.slots[slot] = tex;
        this.hits[slot] = 0;
      } else {
        this.flush();                        // pending sprites still point at the slot being reused
        slot = this.evict();
        this.slots[slot] = tex;
        this.hits[slot] = this.average();    // a fair (average) chance, as in the donor
      }
    }
    this.hits[slot]++;
    this.pending++;
    return slot;
  }

  // Least used slot (the last one on ties, as the donor), then every count is halved (fix: old bursts age out).
  private evict(): number {
    let slot = 0;
    for (let i = 1; i < this.units; i++) if (this.hits[i] <= this.hits[slot]) slot = i;
    for (let i = 0; i < this.units; i++) this.hits[i] >>= 1;
    return slot;
  }

  private average(): number {
    return Math.floor(this.hits.reduce((a, b) => a + b, 0) / this.units);
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/client/hud-slot-batch.ts` (proposed path, not checked against the repo): a client-only HUD sprite batch for icons, bars, numbers and the font in one frame. The engine does not read it.
- Parity-checklist row 14 (HUD). The hint said row 12, which is combat sound cues; this donor is a HUD batch, so row 14 is the fit. Lead to confirm.
- Reuse tag: rewrite-from-idea (CC0-1.0 file; adaptation is permitted, clean-room sketch used)
- Brief rule served: Frankendom one-engine rule (client HUD only, no engine state touched); rule 2 of the addendum (judge the idea, not the genre)

## 6. Gaps and risks

- Licence class: CC0-1.0 is not in the brief's three classes; recorded as permissive (public-domain dedication, no attribution duty). Lead to confirm the class. The repo LICENSE is MPL-2.0; the file header keeps CC0 for this file, as read.
- Donor defect, doc and code disagree on the default size: the javadoc says 1000 (169), the no-argument constructor passes 3000 (172). Fix: one number, with a test.
- Donor defect, counts measure runs, not sprites: `activateTextureCached` counts only on a texture change (1189-1196). A texture drawn in one long run scores once, and one that alternates often scores many times. Fix: count per sprite (sketch).
- Donor defect, no aging: eviction only rescales counts (1255), so a texture heavy early in a batch keeps its rank for the whole begin/end. Fix: halve counts at each eviction (sketch).
- Donor cost, global binding version: every bind by any batch bumps the shared counter (55, 71), so every other live batch rebinds all its slots at its next flush (75-79). Nested offscreen batches make this a per-flush cost. Not measured. Fix: track binds per batch, and bump the shared counter only for external uploads.
- Donor cost, eviction flushes: when the HUD uses more distinct textures than there are slots, every eviction with pending sprites draws (1230-1232). Fix in our HUD: put the HUD in one atlas, so the table never fills in a normal frame.
- Phone unit count: the donor probes the driver value and halves it on compile failure (1410-1422). A phone may expose fewer units; the count and the draw calls per frame were not measured here.
- The donor has no timings or per-frame numbers; every number in this note is a default or a code constant.
- Idea not in the donor: the batch does not sort sprites by texture before drawing, so the caller's order decides how many evictions happen. A stable sort by atlas before the HUD draws would cut flushes.

Reuse tag: rewrite-from-idea (CC0-1.0 file; adaptation permitted; clean-room sketch used)
Brief rule served: Frankendom one-engine rule (client HUD only); rule 2 of the addendum (judge the idea)
