# STJr-SRB2 (rendering-performance, cell 1)

Donor: `/mnt/frankendom-donors/STJr-SRB2/src/hardware/hw_batching.c` | Licence: GPL version 2 (LICENSE file is the GNU GPL v2 text; file header line 6: "terms of the GNU General Public License, version 2.") | copyleft, clean-room, shape only | C | symbol `HWR_RenderBatches`

Checked: Read `hw_batching.c` lines 1-420 in full. Callers read: `hw_main.c` 5385-5435 (`HWR_RenderSkyboxView`, batch around the BSP walk, sprites after the flush), 5477-5555 (`HWR_RenderPlayerView`, same shape), cvar 5721; translucent polyobject floor branch 2294-2305 (read); `HWR_AddTransparentWall` definition 5895 (read the first line only). Grep-located, not read: the other `HWR_ProcessPolygon` callers (hw_main.c 526, 611, 719, 2266, 2800, 2942, 3273, 3302, 3353, 3669, 3774, 5955), `HWR_CreateDrawNodes`, `PreparePolygon` in `r_opengl.c` (blend and depth state for the batch draw), the shader internals. Other candidates opened: `hw_batching.h`, `m_perfstats.c` 143, `r_opengl/r_opengl.c` 2078-2098. camera_scope: n/a (rendering, not a camera topic). Confidence: high on the order of operations and on the numbers (whole file read); medium on the defect claims in section 6 (reasoned from the code, not run). Nothing was executed on a GPU.

Best transferable idea: Collect a frame's opaque draws, sort them by a state key (texture, flags, colour, shader), issue one draw per run of equal state, and count the draw calls so the budget is a number a test can check.
Decision (proposed): adapt. Keep the collect, sort by state, flush-on-change shape and the per-frame draw-call counter. Do not port the hand-rolled vertex copy, because the browser renderer already owns materials and instances. Fix the defects in section 6 in the design, not in the port.
Acceptance: A dev overlay prints draw calls per frame for the Pit and for a zone, and a test asserts that N enemies sharing one material produce one draw call and that changing one enemy's material adds exactly one.

## 1. Mechanism

- Where it sits. For the sky view (`hw_main.c` 5429-5435) and the player view (5547-5555) the code calls `HWR_StartBatching()`, walks the BSP with `HWR_RenderBSPNode`, then calls `HWR_RenderBatches()`. Only then are sprites sorted and drawn (5569-5572), and translucent draw nodes are created after that. So the batch covers opaque BSP geometry (walls and planes) and sprites are outside it.
- Collect (`HWR_ProcessPolygon`, 79 to just before 159). With batching on, each polygon is stored with its surface info, flags, shader, the texture set by the last `HWR_SetCurrentTexture`, and a `horizonSpecial` flag. Its vertices are copied into one per-frame array (149). A hash is computed only for textured, non-horizon polygons: a 31-bit FNV-1a over the texture id, the polygon flags and the colour, plus (with shaders on) the shader, tint, fade colour, light level and fade start and end (124-146). Every other polygon keeps `hash = -index` (121), with a comment saying the negative value keeps the order on horizon lines (119).
- Sort (`RenderBatches`, 170-216). The index array is set to 0..n-1 (211) and sorted ascending with `qsort` by `comparePolygons` (216, comparator 159-165: `poly1->hash - poly2->hash`). Negative keys (untextured and horizon) therefore come first, then textured polygons in hash order.
- Walk and flush (217 to the end). For each polygon in sorted order: its vertices are copied into a flat output array (291), and a fan is written as triangles from its first vertex (294-302). The next polygon's state is compared only when the two hashes differ (312). If shader, texture, flags or colour differ (320-353), a state change is flagged. The flush happens when a change is flagged or at the last polygon (359): one `pfnDrawIndexedTriangles` call (362), then the draw counter goes up (364), then the write positions reset. The change block after the flush sets the shader (380) and the texture (389) and copies flags and colour.
- End. `polygonArraySize = 0` (413); the vertex count is reset with it.
- Order of operations in one frame: start, collect all opaque BSP polygons, sort, flush per state run, then sprites and translucent lists.

## 2. Key functions

- `HWR_StartBatching`: `/mnt/frankendom-donors/STJr-SRB2/src/hardware/hw_batching.c` 43-58. Allocates the arrays once (initial capacity 65536 entries, line 26 and 39) and sets `currently_batching`.
- `HWR_ProcessPolygon`: `/mnt/frankendom-donors/STJr-SRB2/src/hardware/hw_batching.c` 79-158. Batching branch stores and hashes; the non-batching branch draws immediately through the backend.
- `comparePolygons`: `/mnt/frankendom-donors/STJr-SRB2/src/hardware/hw_batching.c` 159-165. Subtraction comparator (see section 6).
- `HWR_RenderBatches`: `/mnt/frankendom-donors/STJr-SRB2/src/hardware/hw_batching.c` 170 to the end of the function. Sort, walk, flush, state change.
- Batch window at the call sites: `/mnt/frankendom-donors/STJr-SRB2/src/hardware/hw_main.c` 5429-5435 and 5547-5555.
- Backend draw: `/mnt/frankendom-donors/STJr-SRB2/src/hardware/r_opengl/r_opengl.c` 2092-2098 (`DrawIndexedTriangles`): sets the vertex and texcoord pointers into the CPU array, then `glDrawElements` on the index array.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Collect opaque draws, sort by state key, one draw per state run | Initial capacity 65536 entries for polygons and vertices (theirs: hw_batching.c 26, 39); the index array is 3x the vertex count (fan to triangles, 294-302) |
| Hash the state fields and compare the real fields only on a hash change | FNV-1a offset 0x811c9dc5 (theirs: 127), prime 0x01000193 (theirs: 128), result masked to 31 bits (theirs: 146) |
| Untextured and horizon polygons keep order | `-index` as the key (theirs: 121); the comment says order is meant to be kept (theirs: 119) |
| Draw-call budget as a counter | Counter `ps_hw_numcalls` incremented per flush (theirs: 364), shown as "Draw calls" in the perf stats (theirs: `m_perfstats.c` 143) |
| Batching toggle | `gr_batching`, default On (theirs: `hw_main.c` 5721) |
| Growth on overflow | Capacity doubles and the arrays are copied (theirs: the `*= 2` growth in ProcessPolygon and RenderBatches, not receipted) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (collect, sort by band and state, one draw per state run, fan to triangles, counter). It fixes the defects in section 6: explicit comparisons instead of subtraction; horizon polygons keep submission order in their own band, drawn first; untextured polygons group by state, not by insertion index; state changes are detected on the real key, not on hash equality. It omits the buffer doubling and per-frame reset, the shader, tint, fade and light fields of the donor key (the sketch key has four fields), the `horizonSpecial` `if` in the donor (replaced by a `horizon` argument), the stats counters except the draw count, and the GL backend. Typechecked on the VPS with `tsc --strict --target es2020`, exit 0.

```ts
// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Frame-local opaque batcher: collect polygons, sort by band and state, one draw per state run.

export interface Vertex { x: number; y: number; z: number; s: number; t: number; }

export interface StateKey {
  texture: number;   // texture id; -1 for untextured
  flags: number;     // polygon flags
  colour: number;    // packed RGBA
  shader: number;    // shader id; 0 when shaders are off
}

// Ordered: horizon-type polygons, drawn first in submission order.
// Untextured: grouped by state, no texture.
// Textured: grouped by state hash.
export const enum Band { Ordered = 0, Untextured = 1, Textured = 2 }

export interface Poly {
  band: Band;
  key: StateKey;
  verts: Vertex[];   // convex fan, verts[0] is the fan centre
  order: number;     // submission index
  hash: number;      // Ordered: the submission index. Others: 31-bit FNV-1a over the key.
}

const FNV_OFFSET = 0x811c9dc5 | 0;
const FNV_PRIME = 0x01000193;

// Word-wise FNV-1a over the key fields, masked to a non-negative 31-bit value.
export function stateHash(k: StateKey): number {
  let h = FNV_OFFSET;
  for (const w of [k.texture, k.flags, k.colour, k.shader]) {
    h = Math.imul(h ^ w, FNV_PRIME);
  }
  return h & 0x7fffffff;
}

export function sameKey(a: StateKey, b: StateKey): boolean {
  return a.texture === b.texture && a.flags === b.flags && a.colour === b.colour && a.shader === b.shader;
}

export function makePoly(key: StateKey, verts: Vertex[], order: number, horizon: boolean): Poly {
  const band = horizon ? Band.Ordered : key.texture < 0 ? Band.Untextured : Band.Textured;
  const hash = band === Band.Ordered ? order : stateHash(key);
  return { band, key, verts, order, hash };
}

// Explicit comparisons: no subtraction, so no int overflow between a negative key and a large one.
export function comparePolys(a: Poly, b: Poly): number {
  if (a.band !== b.band) return a.band < b.band ? -1 : 1;
  if (a.hash !== b.hash) return a.hash < b.hash ? -1 : 1;
  return a.order < b.order ? -1 : a.order > b.order ? 1 : 0;
}

export interface BatchStats { polys: number; draws: number; verts: number; }
export type DrawFn = (key: StateKey, verts: Vertex[], indices: number[]) => void;

export function renderBatches(input: Poly[], draw: DrawFn): BatchStats {
  const stats: BatchStats = { polys: input.length, draws: 0, verts: 0 };
  if (input.length === 0) return stats;
  const sorted = input.slice().sort(comparePolys);

  let key = sorted[0].key;
  let verts: Vertex[] = [];
  let indices: number[] = [];

  for (const p of sorted) {
    // Flush on the real key, not on hash equality, so a hash collision cannot hide a state change.
    if (!sameKey(key, p.key)) {
      draw(key, verts, indices);
      stats.draws++;
      stats.verts += verts.length;
      verts = [];
      indices = [];
      key = p.key;
    }
    const base = verts.length;
    for (const v of p.verts) verts.push(v);
    // Fan to triangles: (0, k, k+1) for k = 1 .. n-2.
    for (let k = 1; k + 1 < p.verts.length; k++) {
      indices.push(base, base + k, base + k + 1);
    }
  }
  draw(key, verts, indices);
  stats.draws++;
  stats.verts += verts.length;
  return stats;
}

export {};
```

## 5. Lands in

- TARGET (proposed, client only): `src/render/batch.ts`. The brief allows only `src/fight/<module>.ts` or `origins/<path>`, and no such module fits rendering, so Strategy needs to rule on the path. The renderer is client-only; the server never reads it.
- Parity row: 16 (colour grade and quality), the nearest row. No row covers draw batching; the closest fold-in is the addendum's "readability at 375 wide (max enemies per frame)". Not a server tick or ledger item.
- today: none in Frankendom (not read; no render batch found in this pass).
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: readability at 375 wide, the addendum's draw and enemy budget per frame; no server rule applies (client-only).

## 6. Gaps and risks

- Licence: GPL-2.0 copyleft. Clean-room only; the sketch was written from the mechanism.
- Defect 1 (comparator, line 165): `poly1->hash - poly2->hash` can overflow. A textured key is up to 2^31-1 and an ordered key is negative, so the difference can exceed the int range near the top of the range. Rare, but undefined behaviour. Fix: explicit `<` and `>` comparisons (sketch `comparePolys`).
- Defect 2 (keys for untextured and horizon polygons, lines 119-121): the sort is ascending, so a larger index gets a more negative key and is drawn first. The horizon order therefore comes out reversed, although the comment says order is meant to be kept. Untextured polygons also each get a unique key, so they are never grouped by colour or flags, and alternating colours cost one draw call per change. Not tested whether the reversed horizon order is visible. Fix: a separate Ordered band keyed by submission index (drawn first, ascending), and untextured polygons keyed by state (sketch `makePoly`).
- Defect 3 (hash equality short-circuit, line 312): a 31-bit hash collision between two different states skips the state comparison, so the wrong texture or colour is used for that run. Probability is low. Fix: compare the real key at every boundary (sketch `sameKey` on each step).
- Defect 4 (buffer growth inside the frame): capacity doubles with copies (growth code in ProcessPolygon and RenderBatches, not receipted), and the arrays never shrink. On a phone a frame that overflows gets a copy spike. Not measured. Fix: size from the previous frame's high-water mark and reuse the buffers.
- Defect 5 (double copy): each vertex is copied into `unsortedVertexArray` (149) and again into `finalVertexArray` (291). On a phone CPU that is wasted work per vertex. Fix: write directly into the output buffer, or keep a shared vertex pool and index into it.
- Opaque reordering: textured polygons are reordered by hash, so the draw order changes. That is safe only if the depth test is on for these polygons. I did not read `PreparePolygon` (not read), so the depth state is unverified.
- Translucency: translucent walls are queued to `HWR_AddTransparentWall` (5895) and translucent floors to `HWR_AddTransparentFloor` (3907, a separate list). For polyobject floors, the translucent branch queues (2299) and the opaque branch draws with `PF_Occlude` (2305). I did not trace every `HWR_ProcessPolygon` caller (section Checked), so I cannot say that no translucent polygon reaches the batch pass.
- Frankendom scope: the batch helps when many draws share one material, such as zone NPCs, foliage and terrain tiles. In the Pit, MAX_ATTACKERS = 3 means only a few actors draw at once, so the saving there is small. Sprites are not in this batch in the donor (drawn after the flush at 5569-5572), so the donor gives no sprite batching.
- Donor backend: `r_opengl.c` 2096 passes a pointer into the CPU vertex array every draw (client-side arrays, no VBO for this path). The batch saves calls, not the vertex upload. Frankendom's renderer should be checked against this (not measured here).
- Frankendom rulings: the batch is client-only and does not touch kills, the ledger or the server tick. The donor has no ownership or authority logic, so nothing transfers there.

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
Brief rule served: readability at 375 wide (draw and enemy budget per frame); client-only, no server rule applies.
