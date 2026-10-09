# endless-sky-endless-sky (rendering-performance, cell 17)

Donor: /mnt/frankendom-donors/endless-sky-endless-sky/source/shader/BatchDrawList.cpp | Licence: GPL-3 | C++ | symbol BatchDrawList::Add / Cull

## 1. Mechanism

- Batch of sprite quads for one frame. Each object (ship, projectile, effect, planet) is added with its position, facing unit vector, size, animation frame and alpha. Objects are grouped by sprite in a `std::map` keyed by the sprite pointer (BatchDrawList.h line 64), so one shader draw covers all objects that share a sprite. The map is ordered by pointer address, so the draw order between sprites is arbitrary; layering is the caller's job (separate lists).
- Cull first (`Cull`, lines 107-125): a drawable with no sprite or zero zoom is dropped. Otherwise the box half-size is `|unit.x * height| + |unit.y * width|` by `|unit.x * width| + |unit.y * height|`, scaled by zoom, around the already-zoomed, centre-relative position; if it lies completely outside the screen rectangle (strict comparisons), the object is dropped before any vertices are written. Clip is not considered in the cull.
- Build: each object writes six vertices (two copies of the top-left corner, then top-right, bottom-left, bottom-right, and a final copy of bottom-right) into its sprite's list. The repeated corners are degenerate triangles that break the strip between sprites. Each vertex carries position, the texture coordinate pair, the frame, and the alpha.
- Clipping: a `clip` value (default 1) shortens the sprite's height (lines 146-148) and moves the bottom texture coordinate to `1 - clip` (lines 160-162), so a partially hidden object is drawn cut off. The use case (for example a ship in hyperspace) is a caller detail not read in this pass.
- The frame is `drawable.GetFrame(step)`, one value for all six vertices (line 137). Two `Add` overloads feed the private one: the `Body` form (lines 61-74) uses `Body::Unit()` and `Body::Alpha(center)`, the `Drawable` form (78-82) uses `facing.Unit() * 0.5 * Zoom()`. `AddVisual` (87-90) is the Body form without the half-velocity lead. `Body` methods themselves were not read.
- Per frame: `Clear` (lines 44-49) sets the time step and zoom and calls `data.clear()`, which drops the map and every vector (no capacity is kept). `SetCenter` (53-56) sets the view centre. `Add` runs once per object. `Draw` (95-103) binds `BatchShader`, calls `BatchShader::Add(sprite, vertices)` once per sprite, then unbinds; what `BatchShader` does inside (one draw per call is assumed) was not read.
- Output: GPU draws, one per sprite. No simulation state changes.

## 2. Key functions

- `BatchDrawList::Add` (private drawable form), `/mnt/frankendom-donors/endless-sky-endless-sky/source/shader/BatchDrawList.cpp`, lines 129-165. Cull, build the six vertices, clip the height.
- `BatchDrawList::Add` (Drawable form), same file, lines 78-82, and `AddVisual`, lines 87-90. Public entry points that build `unit` and alpha.
- `BatchDrawList::Clear` and `SetCenter`, same file, lines 44-56.
- `BatchDrawList::Cull`, same file, lines 107-125. Bounding box from facing and size against the screen rectangle.
- `BatchDrawList::Add` (Body form), same file, lines 61-74. Lead position with half the velocity, subtract the view centre, scale by zoom (line 72).
- `BatchDrawList::Draw`, same file, lines 95-103. One shader draw per sprite list.
- `Push`, same file, lines 30-38. One vertex record.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Group sprites by texture and draw each group once | Sprite key from the engine's sprite object (theirs) |
| Cull with a rotated bounding box against the screen rectangle before writing vertices | Bounding box from facing and size (generic; lines 114-118) |
| Degenerate repeated vertices to break a strip between quads | Six vertices per quad (theirs) |
| Clip height with a factor and shift the bottom texture coordinate | Clip factor passed in by the caller (theirs) |
| Lead the drawn position by half the velocity to show projectiles mid-flight | Half-velocity lead 0.5 (theirs; line 72; the source TODO at lines 63-71 says it is a stand-in for per-sprite reference points) |

## 4. TypeScript sketch

simplified: omits the view-centre subtraction and zoom of the position (the sketch takes screen-space-scaled coordinates from `o.x * zoom`), the no-sprite and zero-zoom early outs, the animation frame lookup (`GetFrame(step)`, the sketch takes the frame as given), the half-velocity lead, and the pointer-keyed ordering (the sketch keys buckets by texture name in insertion order). The cull and the six-vertex order follow the donor.

```ts
// Licence: GPL-3 donor - CLEAN-ROOM sketch written from the section 1 description (cull, six-vertex strip quad, clip), with its own structure.
// Convention here: o.w and o.h are half-extents, (ux, uy) is the facing unit vector.
type Obj = { x: number; y: number; ux: number; uy: number; w: number; h: number; frame: number; alpha: number; texture: string };
type Screen = { left: number; top: number; right: number; bottom: number };
type P = { x: number; y: number };
type Vert = { p: P; s: number; t: number; frame: number; alpha: number };

// Two axes of the quad in screen units: across the width and along the facing (height).
function axes(o: Obj, zoom: number): { across: P; along: P } {
  return { across: { x: -o.uy * o.w * zoom, y: o.ux * o.w * zoom }, along: { x: o.ux * o.h * zoom, y: o.uy * o.h * zoom } };
}

// Cull: the screen-aligned box around the four unclipped corners; skip the object when that box misses the screen.
function offScreen(o: Obj, zoom: number, scr: Screen): boolean {
  const { across, along } = axes(o, zoom);
  const cx = o.x * zoom, cy = o.y * zoom;
  const xs: number[] = [], ys: number[] = [];
  for (const a of [-1, 1]) for (const b of [-1, 1]) {
    xs.push(cx + a * across.x + b * along.x);
    ys.push(cy + a * across.y + b * along.y);
  }
  return Math.max(...xs) < scr.left || Math.max(...ys) < scr.top || Math.min(...xs) > scr.right || Math.min(...ys) > scr.bottom;
}

// One quad as a triangle strip. The clip factor (0..1) shortens the far side and moves its texture row to match.
// The strip's first and last vertices are repeated so neighbouring quads in the same buffer join with empty triangles.
function stripFor(o: Obj, zoom: number, clip: number): Vert[] {
  const { across, along } = axes(o, zoom);
  const origin = { x: o.x * zoom - across.x - along.x, y: o.y * zoom - across.y - along.y };
  const corner = (side: 0 | 1, far: 0 | 1): Vert => ({
    p: {
      x: origin.x + side * 2 * across.x + far * 2 * clip * along.x,
      y: origin.y + side * 2 * across.y + far * 2 * clip * along.y,
    },
    s: side,
    t: far ? 1 - clip : 1,
    frame: o.frame,
    alpha: o.alpha,
  });
  const strip = [corner(0, 0), corner(1, 0), corner(0, 1), corner(1, 1)];
  return [strip[0], ...strip, strip[strip.length - 1]];
}

// Frame: bucket surviving objects by texture; the caller issues one draw per bucket.
function batch(objs: Obj[], zoom: number, scr: Screen, clip = 1): Map<string, number[]> {
  const buckets = new Map<string, number[]>();
  for (const o of objs) {
    if (offScreen(o, zoom, scr)) continue;
    const flat = stripFor(o, zoom, clip).flatMap((v) => [v.p.x, v.p.y, v.s, v.t, v.frame, v.alpha]);
    buckets.set(o.texture, [...(buckets.get(o.texture) ?? []), ...flat]);
  }
  return buckets;
}
```

## 5. Lands in

- Frankendom target: new `src/fight/impact-batch.ts` (one-draw-per-sprite batch with a screen cull, for sparks, dust, blood spray and similar effect quads). Parity row 10 (hit impact / hitstop, sparks, dust; today `src/`, K4); row 8 for decals and blood sprites (K5).
- Today: no Frankendom module yet (later phase); the Frankendom side was not searched in this pass.
- Feature-map section: rendering performance, the sprite batch for effects and projectiles.
- Reuse tag: rewrite-from-idea (GPL-3, clean-room sketch only).
- Brief rule served: (category default, not per-cell) 3 (warm up at zone entry); rules 7-9 n/a

## 6. Gaps and risks

- The half-velocity lead is a donor fudge for projectile position. Frankendom should store the projectile's drawn position in the fight state (the one engine owns it), not compute it in the renderer, so the record/replay row 19 and the client draw agree.
- Culling is per object on the CPU; with thousands of objects this is the cost, and the donor does not spatially index.
- The clip factor is set by the caller; no zone data is involved here.
- The batch is rebuilt every frame, and `Clear` frees the vectors each time (`data.clear()`), unlike a capacity-keeping batch; no caching of static sprites.
- Draw order between sprites follows pointer order of the map, so any layering rule (blood under bodies, sparks over) must be separate batches in a fixed order.
- Nothing here affects fight or kill authority.
