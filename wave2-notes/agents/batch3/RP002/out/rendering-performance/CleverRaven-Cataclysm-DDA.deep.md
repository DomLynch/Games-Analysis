# CleverRaven-Cataclysm-DDA (rendering-performance, cell 1)

Donor: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/cata_tiles.cpp` (symbol `cata_tiles::draw`, 591; batch code 1256-1451) | Licence: CC BY-SA 3.0 (`LICENSE.txt` line 1, the game code licence per that file; copyleft) | C++ | symbol `cata_tiles::draw`

Checked: list hint `src/cata_tiles.h` is the header only; the mechanism is in `src/cata_tiles.cpp`. Read: `src/cata_tiles.h` 1135-1190 and grep hits 1148-1150; `src/cata_tiles.cpp` 591 header, 640-680, 750-752, 1060-1240 (row loop, prepass, layer loop, shader-path check), 1240-1460 (ortho tint overlay, batch, flush), 1500-1515 (sweep gate); `src/sdl_quad_batch.h` and `src/sdl_quad_batch.cpp` in full; `LICENSE.txt` line 1. Candidate files opened: 4 (plus the header). Confidence: high on the order of the ortho tint batch (read end to end); medium on the wider draw loop (read in parts). Not read: `ensure_tint_mask_texture`, `scoped_render_target`, `draw_sprite_at` recording of `tint_sprites`, the shader tint path (`cata_shader`), `renderer_should_abort_frame`, `sdltiles.cpp` frame pacing, `atlas_bake_plan.*`. The cell's frame-pacing and phone-budget topics were not found in these files. Camera scope: not a camera cell.

Best transferable idea: Batch same-colour tinted sprites into one pass, close the batch when its union box grows past twice its members' summed area, and close it before any flat tile so draw order is kept.
Decision (proposed): adapt - the grouping rule (same colour, bounded union, flush on order break) fits client-side hit flash and status tint on up to three attackers, but the silhouette render-target path is SDL-specific and needs a measured win before we copy it.
Acceptance: At 375 wide in a three-attacker fight, a hit flash on same-colour sprites draws in one pass with no rectangular seam, and a client test asserts that a flat tile between two complex tiles splits the batch.

## 1. Mechanism

- Scope first: this is the coloured-light tint overlay in `cata_tiles::draw`, not general sprite batching. It runs only when the shader tint path is not available. The per-row prepass sets `row_tinted` only when `shader_tint` is false (1139-1142). On the shader path `row_tinted` stays empty and nothing below runs. So on a GPU-shader build this batching is inactive.
- Per row (the row loop starts at 1100): the prepass (1113-1142) computes a tint for each tile that has coloured light (1132), skips DARK, BLANK and MEMORIZED tiles, and collects eligible tiles into `row_tinted`. Then the layer loop draws the row's sprites. Then the ortho overlay (from 1364) walks `row_tinted` in order.
- Per tinted tile, in this order:
  (a) Simple test (1372-1376): if the tile has no valid bounds or no recorded sprites, or all recorded sprite bounds sit inside the tile rect, the tile is "simple". A simple tile first flushes any open batch (1379-1380), then fills its tile rect with the tint, pre-multiplied by alpha (1389-1395), and `continue`s.
  (b) Complex tile (sprites spill past the tile): if the batch is empty or the tint colour differs from the batch colour, flush and start a batch with this colour (1402-1408). If the batch is not empty, compute the union box of the batch and this tile. If `union_area > sum_area * 2`, where `sum_area` is the batch's summed member area plus this tile's area, flush and restart with this colour (1411-1431). Then grow the union box and the summed area and append the tile (1433-1449).
  (c) Flush of a batch (1270 onward): (phase 1) bind a scratch target sized to the union box, clear it, and draw each member's silhouette sprites at offsets relative to the union origin (member loop at 1311); (phase 2) restore the display target, reset the clip, and copy the scratch mask once to the union box with the batch colour as colour mod and alpha mod (1352-1356).
- After the loop the open batch is flushed. Nothing is timed; the work is per row, synchronous, one composite per batch.

## 2. Key functions

- `cata_tiles::draw`, `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/cata_tiles.cpp` 591 (header; whole draw path). Row loop 1100, prepass 1114-1142; ortho overlay 1228-1451.
- Ortho complex-tile batch, `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/cata_tiles.cpp` 1256-1451 (comment block 1256-1258, `flush_tint_batch` lambda 1270, loop 1364-1449).
- `sdl_quad_batch.cpp` (`/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/sdl_quad_batch.cpp`, 1-147): a second, simpler batching device used for UI rects and glyphs. `quad_batch::append` packs four vertices and six indices per quad (24); `text_batch::flush` draws rects first and then one draw per glyph texture (133). It is cited here only as a neighbour idea; it is not the tint path.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Batch closes when union box area exceeds 2x the summed member area | Factor 2 (theirs, cata_tiles.cpp 1427; comment at 1258 says the same) |
| Same-colour rule: colour change closes the batch | None (equality on the tint colour) |
| Flat tile fits its own footprint: draw as one rect, flush the batch first | Footprint = the tile rect (theirs, 1372-1376) |
| One composite per batch with colour mod and alpha mod | None |
| Scratch target reused, sized to the largest batch union | Sized by union, not a fixed size (theirs, cata_tiles.h 1150) |

Order of operations for a complex tile with a colour change, as the code runs it: flush (colour), then the 2x cap test (only if the new batch has members), then grow and append. Flat tiles always flush first, so a complex batch never draws across a flat tile.

## 4. TypeScript sketch

simplified: keeps the donor order (flat tile flushes the open batch; colour change flushes; the 2x union cap flushes; then the tile joins) and the same union and sum arithmetic. It omits the silhouette render-target mask and its composite with colour and alpha mod, the premultiplied flat-rect blend, the saved and restored clip rect, the variant-pass flush, the shader-tint branch that disables this path, the per-row and z-level loops, the recording of sprite bounds, and the donor's "no valid bounds or no recorded sprites" test; the sketch takes a precomputed `fitsTile` flag instead.

```ts
// Licence: CC-BY-SA 3.0 (donor, copyleft). Clean-room sketch of the batching rule only, written from the described order of steps.
// clean-room
interface Rect { x: number; y: number; w: number; h: number }
interface TintTile { id: number; bounds: Rect; color: string; fitsTile: boolean }
type Op =
  | { kind: "flat"; id: number }
  | { kind: "batch"; color: string; ids: number[]; union: Rect };
interface Open { color: string; ids: number[]; union: Rect; sumArea: number }

const UNION_CAP = 2; // a batch's union box may grow to at most 2x the summed area of its members

function unionOf(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const right = Math.max(a.x + a.w, b.x + b.w);
  const bottom = Math.max(a.y + a.h, b.y + b.h);
  return { x, y, w: right - x, h: bottom - y };
}

function toOp(o: Open): Op {
  return { kind: "batch", color: o.color, ids: o.ids, union: o.union };
}

// One row's tinted tiles, in draw order, become draw ops.
// A tile that fits its own footprint is a flat fill: it closes the open batch first, then is drawn alone.
// A colour change, or a union box past the cap, also closes the open batch.
function planTintOps(tiles: TintTile[]): Op[] {
  const ops: Op[] = [];
  let open: Open | null = null;
  for (const t of tiles) {
    if (t.fitsTile) {
      if (open !== null) { ops.push(toOp(open)); open = null; }
      ops.push({ kind: "flat", id: t.id });
      continue;
    }
    const area = t.bounds.w * t.bounds.h;
    if (open !== null && open.color !== t.color) { ops.push(toOp(open)); open = null; }
    if (open !== null && open.ids.length > 0) {
      const u = unionOf(open.union, t.bounds);
      if (u.w * u.h > (open.sumArea + area) * UNION_CAP) { ops.push(toOp(open)); open = null; }
    }
    if (open === null) open = { color: t.color, ids: [], union: t.bounds, sumArea: 0 };
    open.union = open.ids.length > 0 ? unionOf(open.union, t.bounds) : t.bounds;
    open.sumArea += area;
    open.ids.push(t.id);
  }
  if (open !== null) ops.push(toOp(open));
  return ops;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 rp002-cata-tint-batch.ts` on the VPS (with `export {};` appended), exit 0.

## 5. Lands in

- TARGET `origins/client/render/tint-batch.ts` (proposed path; not checked against the repo; the tint is client presentation, so it is not `src/fight`). The engine never reads the tint.
- Parity-checklist row 16 (colour grade/quality). The list hint said row 12, but row 12 in the addendum is combat sound cues, so I used 16 for rendering and flag the mismatch for Strategy.
- Reuse tag: rewrite-from-idea (CC BY-SA 3.0 game code; clean-room, shape only)
- Brief rule served: licence rule (copyleft: clean-room, shape only). The one-engine rule does not bind a client render path.

## 6. Gaps and risks

- Copyleft (CC BY-SA 3.0): clean-room only. The sketch is written from the described mechanism; no donor line is translated.
- The batch runs only on the non-shader fallback path (1139-1142). A GPU build with a tint shader never uses it, so the mechanism is not a general draw-call budget. Do not cite it as one.
- Frankendom's rulings: the tint and batching are client-only. The engine must not read a flash or tint to decide a hit, a kill or a death (server-verified kills). Keep hit state in the engine and the flash in the client.
- MAX_ATTACKERS = 3 means at most three creatures can be batched in a fight, so the batching gain is small. A plain "group same colour, flush on order break" rule may be enough; measure before adding the union cap.
- The 2x cap is a screen-space fill-rate guard. It matters more on phones (fill rate) than on desktop. Frankendom would set it as an engine constant, not zone data.
- SDL render targets have no direct browser equivalent here; an offscreen canvas per batch costs memory and a copy. The silhouette path should be dropped unless the client already renders to targets.
- Not read: the shader tint path that replaces this, and the sweep and abort gates (1102, 1510), which are cache gating rather than tint batching. Those are noted as neighbour ideas only.
- No defect found in the read code (modern source, no delta-time or overflow issues seen in the read range).

Reuse tag: rewrite-from-idea (CC BY-SA 3.0 game code; clean-room, shape only)
Brief rule served: licence rule (copyleft: clean-room, shape only); one-engine rule not applicable to client render.
