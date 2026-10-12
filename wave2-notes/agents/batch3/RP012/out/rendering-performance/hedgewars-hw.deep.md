# hedgewars-hw (rendering-performance, cell 17)

Donor: `/mnt/frankendom-donors/hedgewars-hw/rust/lib-hedgewars-engine/src/render/atlas.rs` (packer) and `/mnt/frankendom-donors/hedgewars-hw/rust/lib-hedgewars-engine/src/render/gear.rs` (per-frame batch) | Licence: GPL-2.0 (the repo `COPYING` is the GNU GPL version 2 text; `atlas.rs`, `gear.rs` and the crate `Cargo.toml` carry no licence line, and no "or later" wording was seen) | Rust | symbol `AtlasCollection::insert_sprite`, `GearRenderer::render`

Checked: Read `atlas.rs` in full (465 lines; packer and split code before the `#[cfg(test)]` block at 361; prop tests 432-463). Read `gear.rs` 95-175 and 196-275 (`GearRenderer::new` 115-196, load loop 126-158, `render` 198-256, load helpers 259-275). Not read: `gear.rs` 1-72 and 176-195 (vertex layout setup; only grep hits seen for 1-72) and 276-end; the `integral-geometry` crate (Rect and Size conventions; the donor's `trim` arithmetic uses `+ 1` at 318, 327, 336, 345, which suggests inclusive edges, not confirmed); `Texture2D::update`; `camera.rs`; the main loop that calls `GearRenderer::render`. Candidates opened: `atlas.rs`, `gear.rs`, `render.rs` (module list), `Cargo.toml`, `COPYING`. Confidence: high on the packer order and on the one-draw-call batch; medium on whether defect D1 below can happen for the shipped sprites (their PNG sizes were not read). camera_scope: n/a (not a camera cell).

## 1. Mechanism

Two parts, one in the packer and one in the draw.

Packing (`atlas.rs`):
1. `AtlasCollection::insert_sprite` (235-255) first rejects a sprite larger than the 2048 texture (236-237).
2. It tries each existing atlas in order with `Atlas::insert` (243-248).
3. If none fits, it calls `repack` (205-226). `repack` tries each atlas with enough free area (207) in turn, re-inserts that atlas's rectangles plus the new sprite into a fresh atlas with `insert_set` (214), and keeps the result only if the new sprite was placed (215). Accepted repacks rewrite the stored position of every rectangle in that atlas (216-220).
4. If `repack` also fails, a new atlas of the full texture size is created and the sprite is placed in it (249-251).
5. Placement inside one atlas, `Atlas::insert` then `find_position` (104-129): for every free rectangle it tries the sprite size and then the transposed size (116-120), keeps a candidate only if the container contains it (`Fit::measure`, 22-33), and keeps the one with the smallest `Fit`. `Fit` derives `Ord` with `short_side` declared first (8-11), so the smallest short leftover side wins, then the smallest long leftover side. This is best-short-side-fit.
6. `split_insert` (131-149) then cuts every free rectangle that the placed rectangle touches. `split_rect` (308-358) returns up to four remainders (left, right, top, bottom). `prune_push` (295-306) drops a remainder already inside a stored split and removes stored splits that the remainder covers. The remainders are added to the free list (145), and the placed rectangle is recorded.
7. `insert_set` (157-176) is the batch form: each round it scores every size still waiting against the current free list and places the one with the smallest `Fit` (168), repeating until none fits. Used only inside `repack`.

Drawing (`gear.rs`):
1. `GearRenderer::render` (198-256) builds one `Vec` for the frame, sized `entries.len() * 6` (199).
2. For each entry (loop 200-242) it writes six vertices (two triangles) using the sprite's texture coordinates (the push is at 241). The sprite is picked from the entry's position in the list, `index & 0b11` (202-207), not from a kind stored on the entry.
3. The whole array is uploaded once (249), one texture is bound (247), blend is set (252), and one `gl::DrawArrays(TRIANGLES)` covers `entries.len() * 6` vertices (254).

Result: N gear sprites cost one upload, one texture bind and one draw call per frame, regardless of N. Nothing caps N and nothing culls off-screen entries: `render` takes the whole slice (198).

## 2. Key functions

- `Atlas::find_position`: `/mnt/frankendom-donors/hedgewars-hw/rust/lib-hedgewars-engine/src/render/atlas.rs` 104-129 (best short-side fit, transposed trial at 116-120).
- `Atlas::split_insert` and `split_rect`: `atlas.rs` 131-149 and 308-358 (free-rect split into up to four remainders; `prune_push` at 295-306).
- `Atlas::insert_set`: `atlas.rs` 157-176 (greedy smallest-fit batch, used by repack only).
- `AtlasCollection::repack`: `atlas.rs` 205-226 (load-time full re-pack of one atlas; keeps the result only if the new sprite fits).
- `AtlasCollection::insert_sprite`: `atlas.rs` 235-255 (existing atlases, then repack, then a new atlas).
- `GearRenderer::new`: `gear.rs` 115-196 (load loop 126-158; one 2048 texture; each sprite is packed, uploaded at its packed rect, and its coordinates copied into `allocation`).
- `GearRenderer::render`: `gear.rs` 198-256 (one vertex array, one texture bind, one `DrawArrays`).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Best short-side fit, ties on long side | `Fit` field order: short side first (`atlas.rs` 8-9) |
| Transposed trial, returns transposed rect | Always on (`atlas.rs` 116-119); no flag |
| Atlas size | `Size::square(2048)` (`gear.rs` 112) |
| Sprite kinds in the load list | Four: Mine, Grenade, Cheese, Cleaver (`gear.rs` 74-77) |
| Sprite slots | `MAX_SPRITES = SpriteId::MaxSprite as usize + 1` (`gear.rs` 80) |
| Vertices per quad | 6, two triangles (`gear.rs` 199, 241, 254) |
| Draw calls per frame | 1 (`gear.rs` 254) |
| Texture binds per frame | 1 (`gear.rs` 247) |
| Entry cap | None in `render` (`gear.rs` 198) |
| Load-time pixel fill | 255 per byte, sized from the original sprite (`gear.rs` 134) |

## 4. TypeScript sketch

simplified: this is a clean-room re-expression. It keeps best-short-side-fit packing and the one-array, one-draw frame. It reorders and changes four things. (1) Rotation is off by default and, when on, the placement says `rotated` so the caller must turn the texels; the donor always tries the transposed size and never turns the pixels (defect D1). (2) Each entry carries its own sprite index; the donor picks by list position (D2). (3) The batch has a per-frame quad cap and reuses one buffer; the donor has no cap and allocates per frame (D5, D6). (4) The repack path and multi-atlas texture selection are left out (D3, D4: the sketch packs one atlas; a second atlas would need its own texture). Culling is not in the sketch because the donor has none. Coordinates are half-open; the donor's Rect convention was not read.

```ts
// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism (best-short-side-fit rectangle packing, one vertex array, one draw call per frame), not a translation of the donor lines.
// clean-room

export interface Rect { x: number; y: number; w: number; h: number; } // half-open: covers [x, x+w) and [y, y+h)

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function inside(outer: Rect, inner: Rect): boolean {
  return inner.x >= outer.x && inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;
}

export interface Placement { rect: Rect; rotated: boolean; }

export class RectAtlas<T> {
  private free: Rect[];
  readonly placed: Array<{ rect: Rect; value: T }> = [];

  // allowRotate defaults to false. When it is true, the caller must rotate the pixels too (Placement.rotated).
  constructor(readonly width: number, readonly height: number, private readonly allowRotate = false) {
    this.free = [{ x: 0, y: 0, w: width, h: height }];
  }

  // Best short-side fit: the free slot whose leftover short side is smallest wins; ties go to the smaller long side.
  private findPosition(w: number, h: number): Placement | undefined {
    const candidates: Array<[number, number, boolean]> = [[w, h, false]];
    if (this.allowRotate && w !== h) candidates.push([h, w, true]);
    let best: Placement | undefined;
    let bestShort = Infinity;
    let bestLong = Infinity;
    for (const f of this.free) {
      for (const [cw, ch, rotated] of candidates) {
        if (cw > f.w || ch > f.h) continue;
        const dx = f.w - cw;
        const dy = f.h - ch;
        const shortSide = Math.min(dx, dy);
        const longSide = Math.max(dx, dy);
        if (shortSide < bestShort || (shortSide === bestShort && longSide < bestLong)) {
          bestShort = shortSide;
          bestLong = longSide;
          best = { rect: { x: f.x, y: f.y, w: cw, h: ch }, rotated };
        }
      }
    }
    return best;
  }

  // Cut every free slot that the new piece touches into up to four leftovers, then drop slots that sit inside another slot.
  private split(p: Rect): void {
    const next: Rect[] = [];
    for (const f of this.free) {
      if (!overlaps(f, p)) { next.push(f); continue; }
      if (p.x > f.x) next.push({ x: f.x, y: f.y, w: p.x - f.x, h: f.h });
      if (p.x + p.w < f.x + f.w) next.push({ x: p.x + p.w, y: f.y, w: f.x + f.w - (p.x + p.w), h: f.h });
      if (p.y > f.y) next.push({ x: f.x, y: f.y, w: f.w, h: p.y - f.y });
      if (p.y + p.h < f.y + f.h) next.push({ x: f.x, y: p.y + p.h, w: f.w, h: f.y + f.h - (p.y + p.h) });
    }
    this.free = next.filter((a, i) =>
      !next.some((b, j) => i !== j && inside(b, a) && (!inside(a, b) || j < i)));
  }

  insert(w: number, h: number, value: T): Placement | undefined {
    const pos = this.findPosition(w, h);
    if (!pos) return undefined;
    this.split(pos.rect);
    this.placed.push({ rect: pos.rect, value });
    return pos;
  }
}

// One frame of gear-like sprites: one vertex array, one draw call, one texture bound.
export interface SpriteEntry { x: number; y: number; w: number; h: number; sprite: number; }
export type UvRect = readonly [number, number, number, number]; // u0, v0, u1, v1 in [0, 1]

export class QuadBatch {
  private readonly verts: Float32Array; // 6 vertices x 4 floats (x, y, u, v) per quad
  constructor(readonly maxQuads: number) {
    this.verts = new Float32Array(maxQuads * 6 * 4);
  }

  get vertices(): Float32Array { return this.verts; }

  // Writes up to maxQuads entries and returns the vertex count to draw. Entries beyond the cap are dropped.
  build(entries: readonly SpriteEntry[], uvs: readonly UvRect[]): number {
    const n = Math.min(entries.length, this.maxQuads);
    let o = 0;
    for (let i = 0; i < n; i++) {
      const e = entries[i];
      const [u0, v0, u1, v1] = uvs[e.sprite];
      const x0 = e.x - e.w / 2, x1 = e.x + e.w / 2;
      const y0 = e.y - e.h / 2, y1 = e.y + e.h / 2;
      o = this.put(o, x0, y0, u0, v0);
      o = this.put(o, x1, y0, u1, v0);
      o = this.put(o, x0, y1, u0, v1);
      o = this.put(o, x1, y0, u1, v0);
      o = this.put(o, x1, y1, u1, v1);
      o = this.put(o, x0, y1, u0, v1);
    }
    return n * 6;
  }

  private put(o: number, x: number, y: number, u: number, v: number): number {
    this.verts[o] = x;
    this.verts[o + 1] = y;
    this.verts[o + 2] = u;
    this.verts[o + 3] = v;
    return o + 4;
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (copy at /tmp/rp012-hedgewars-atlas.ts) exits 0.

## 5. Lands in

- TARGET `origins/client/render/sprite-batch.ts` (new; proposed path, `origins/client/` not verified against the Frankendom tree). Client-only: the packer and the quad builder never touch fight state, so server-verified kills and the one ledger are untouched. For effect layers such as blood decals, hit sparks and HUD icons.
- Parity-checklist row 16 (colour grade/quality): this is the frame and quality budget (cap per frame, one draw per atlas).
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: client-only render path (camera, HUD and sound are client-only); rules 7-9 n/a
- Best transferable idea: pack a frame's sprite quads into one vertex array per atlas and draw them in one call with a per-frame quad cap, and keep best-short-side-fit packing as a load-time tool.
Decision (proposed): adapt — keep the packer and the one-draw batch; drop repack-on-full from the runtime path (load time only) and make rotation off by default, because the donor's rotated fit can store a sprite in a rect whose texels were never turned (D1).
Acceptance: a client unit test packs 500 random sprite sizes into a 2048 atlas and asserts no overlap, every rect inside the atlas, and placed area equal to input area; in a fight with three attackers bleeding, the decal layer shows in one draw call with no sprite stretched or rotated, and the quad cap drops only at the set limit.

## 6. Gaps and risks

- GPL-2.0: clean-room only. The sketch is written from the mechanism, and the donor's prop tests (`atlas.rs` 439, 443, 460) are a checklist to re-write, not code to copy.
- D1, rotated fit without rotated texels: `atlas.rs` 116-119 can return a transposed rect; `gear.rs` 134 sizes the pixel buffer from the original sprite, and `gear.rs` 137 uploads it into `rect`. If the transposed rect is ever chosen, the upload does not match the rect. Whether that happens for the shipped sprites was not checked (PNG sizes not read). Fix: no rotation by default (sketch `allowRotate = false`); if rotation is wanted, return `rotated` and turn the texels.
- D2, sprite kind by list position: `gear.rs` 202 uses `index & 0b11`, so an entry's sprite changes when the list order changes. Fix: store the sprite on the entry (sketch `SpriteEntry.sprite`).
- D3, texture index ignored: `gear.rs` 157 stores `texture_index`, `gear.rs` 208 reads only the coords, and `gear.rs` 247 always binds one texture. A second atlas would sample the wrong texture. Fix: one GPU texture per atlas index, or assert a single atlas at load.
- D4, repack moves earlier rects without moving texels: `atlas.rs` 218 rewrites stored positions; the texels stay where they were uploaded. The shipped `GearRenderer` copies coordinates at insert time (`gear.rs` 157), so it is not hit. `get_rect` (`atlas.rs` 257) would return the new position for an old sprite. Fix: treat repack as load-time only and re-upload, or never call `get_rect` after load.
- D5, no cap and no culling: `render` (`gear.rs` 198) draws every entry and no culling was found in the engine crate (a grep for cull, batch and atlas in `lib-hedgewars-engine` hit only `gear.rs`, `atlas.rs` and `render.rs`; the wider `rust/` tree was grepped for atlas only). Fix: a per-frame quad cap as a quality setting (sketch `maxQuads`) and an off-screen test before the build (not in the donor).
- D6, per-frame allocation: `gear.rs` 199 allocates a new `Vec` every frame. Fix: reuse one buffer (the sketch does).
- Frankendom gap: no sprite batching exists in the fight client. The mechanism only pays off once effect layers are many-per-frame (three attackers bleeding, sparks, dust), so the first acceptance check is the draw-call count in a three-attacker fight on a 375-wide phone frame, not the packer alone.
- Not read: `integral-geometry` Rect and Size conventions; `Texture2D::update`; the caller of `GearRenderer::render`; `gear.rs` 176-195.
