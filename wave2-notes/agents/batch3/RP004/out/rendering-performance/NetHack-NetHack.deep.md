# NetHack-NetHack (rendering-performance, cell 2)

Donor: `/mnt/frankendom-donors/NetHack-NetHack/src/vision.c` (vision_recalc 512-857; view_from 2001-2091; right_side 1665-1851) with the redraw path in `/mnt/frankendom-donors/NetHack-NetHack/src/display.c` (show_glyph 1918-2098; flush_screen 2249-2308) | Licence: NetHack General Public License (`dat/license`, 1989; paragraph 2b requires derivative works to be licensed at no charge on the same terms, so copyleft class; clean-room, shape only) | C | symbol `vision_recalc`

Checked: The list hint (`include/display.h`) is the wrong file: it holds declarations and enum values (e.g. docrtRefresh at 1018), not the algorithm. Found the real code with grep for viz_rmin, vision_recalc, flush_screen and gbuf. Read: vision.c 20-40 and 60-70 (circle table rows, not every row), 118-152 (vision_init), 208-265 (vision_reset), 505-510 (trigger comment), 512-857 (vision_recalc, complete), 1162-1200 (macros), 1410-1455 (q1 function variant, first part), 1640-1858 (right_side, complete), 1853-1872 (left_side header, mirror comment), 1990-2110 (view_from, complete); display.c 917-1000 (newsym, the in-sight branch), 1900-1930 and 2040-2100 (show_glyph, complete for the changed-cell path), 2117-2127 (reset macro), 2241-2308 (flush_screen, complete). Not read: left_side body (documented as a mirror of right_side; the q2/q3/q4 quadrant bodies are the same shape), the out-of-sight branch of newsym (after line 1000), the seen-angle function new_angle (414), night-vision level values, COLNO and ROWNO values. Licence read in full (dat/license, 95 lines). Confidence: high on the vision update and the redraw path. The donor's order of operations is clear from reading end to end. Depth: full. Not a camera cell (camera_scope not applicable).

## 1. Mechanism

- What it does: works out which map cells the hero can see this turn, updates the remembered picture only where something changed, and draws only the changed cells, row by row.
- When it runs: vision is recalculated on events, not every frame. The donor's comment lists the triggers: arriving on a level, a light scroll, an option change, being swallowed, bubbles moving (vision.c 505-509). Drawing is flushed by the game loop (not read); the flush itself has a deferral bracket (see step 9).
- Step 1, precomputed clear runs. `vision_reset` digs, row by row, the left and right ends of each run of clear cells, once per level (vision.c 224-261; the pointer writes are at 236-237). Each cell then knows its run without walking it.
- Step 2, the sweep (`view_from`, 2001-2091). The hero's own row extent is read from the run table (2029-2031). It then sweeps the rows below (2076-2081) and above (2084-2089) with `right_side` and `left_side`, one row per call in the step direction (`nrow = row + step`, right_side 1683).
- Step 3, inside one row (`right_side`, 1706-1848): walk the spans of the previous row. A blocked cell is a wall: it is marked and the walk jumps to its far edge (1711-1740). For an opening, it tests whether the far wall is visible with a Bresenham-style line check (the q path helpers, 1410-1466 for the function variant; 1212-1400 for the macro variant), so the far limit is set by a real line of sight (1802-1815). It marks the visible run (1821-1843), then recurses into the next row for that finger of light only if the recursion is still inside the circle limit (1846-1847, the test at 1690).
- Step 4, special sights. Underwater, the hero sees only adjacent water (vision.c 589-606). In a pit, only the 3x3 around the hero (609-622). Otherwise the sweep at 624. X-ray and night vision add cells inside a circle, using the limit table (631-699).
- Step 5, lights. Light sources are applied to the new set (703).
- Step 6, swap. The new set becomes the current one (708-709, so `cansee` works during the update).
- Step 7, the update loop. For each row, walk the union of the old and new row bounds (735-736). Per cell: if it is in sight by night or x-ray vision, update the seen-angle bits and redraw if the bit changed (743-753). If it could be seen and is lit, it is in sight; walls and doors also need an adjacent lit cell, so a dark corridor does not show a door at its end (760-773, 782). If it could be seen but is not lit and was lit when last seen, clear the remembered-lit bit and redraw (796-805). Otherwise redraw only if it was in sight, or its could-see state changed (820-836).
- Step 8, the bounds hand-over. The hero cell is always redrawn (850). The new row bounds become the old ones for the next call (853-854).
- Step 9, redraw path. `newsym` (display.c 917) shows the live glyph if the cell is in sight (953); records the lit state (967); the out-of-sight branch is not read. `show_glyph` (1918-2098) writes into a glyph buffer `gbuf`. If the glyph, its colour, flags or tile differ from the buffered one (2072-2085), it stores the new glyph, sets `gnew` (2087-2088), and widens the row's dirty span `[gbuf_start, gbuf_stop]` to include x (2094-2097). `flush_screen` (2249) first handles a deferral bracket: a call with -1 toggles `delay_flushing` and returns while it is set (2264-2267). Then, per row, it walks only the dirty span (2283-2285), prints only cells with `gnew` set (2288-2293), clears `gnew` (2296), resets every row's span to empty (2300; macro 2119-2127), and refreshes the window once (2306).

## 2. Key functions

- `vision_recalc`: `/mnt/frankendom-donors/NetHack-NetHack/src/vision.c` 512-857. Builds the new could-see set, applies night, x-ray and light, then the diff-only update loop.
- `view_from`: `/mnt/frankendom-donors/NetHack-NetHack/src/vision.c` 2001-2091. Seeds the hero's row from the run table and launches the row sweeps.
- `right_side`: `/mnt/frankendom-donors/NetHack-NetHack/src/vision.c` 1665-1851. One row's span walk and recursion. `left_side` (1857 on) is documented as its mirror (1854).
- `vision_reset`: `/mnt/frankendom-donors/NetHack-NetHack/src/vision.c` 211-265. Builds the per-level run table.
- `show_glyph`: `/mnt/frankendom-donors/NetHack-NetHack/src/display.c` 1918-2098. Buffers glyphs and marks dirty cells and spans.
- `flush_screen`: `/mnt/frankendom-donors/NetHack-NetHack/src/display.c` 2249-2308. Draws only changed cells inside the dirty spans.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Clear-run extents, precomputed per level, one pair per cell | `left_ptrs` / `right_ptrs` (vision.c 236-237, 244-245, 257-258); computed once in `vision_reset` (211-265) |
| Limit offsets for a circle of radius r | Table `circle_data`, rows labelled 0 to 15 (vision.c 27-70; only some rows were read) |
| Visible row span is a union of old and new bounds | The update loop reads `min` of old and new starts and `max` of old and new stops (vision.c 735-736) |
| Empty dirty span | Start set to `COLNO - 1`, stop to 0 (display.c 2124-2125). COLNO value not read. |
| Flush batching window | Toggle on a call with -1 (display.c 2264-2266); no numeric budget |
| Night-vision and x-ray radius | Player fields `nv_range` and `xray_range` (not read: values and defaults) |
| Map size | COLNO and ROWNO (not read) |

The reusable algorithm is the row-span sweep with precomputed runs, and the bounds-then-flag redraw. The table values are map-specific.

## 4. TypeScript sketch

simplified: the sketch keeps the sweep outward from the hero's row, one span per row, the precomputed clear-run extents, the per-row span union for the update, and the changed-cell flush with per-row dirty bounds. It omits the Bresenham corner test (the q path helpers) and the rule that a wall next to a visible opening is seen only if the cell beyond is visible, so it over-reveals around corners; it omits the left_side mirror (the same loop run the other way), the night-vision and x-ray radii, the seen-angle memory, the lit and remembered-lit logic, the door rule, and the out-of-sight remembered glyph. The `draw` callback replaces the tty write.

```ts
// Licence: NetHack General Public License (donor, copyleft). Clean-room shape written from the described mechanism; not a translation.
// clean-room
export interface Grid {
  cols: number;
  rows: number;
  blocks(x: number, y: number): boolean;
}

// Per-cell clear-run extents on the same row, precomputed once per level.
export interface RunTable {
  cols: number;
  left: Int32Array;   // first column of the clear run containing (x, y)
  right: Int32Array;  // last column of that run
}

export function buildRunTable(g: Grid): RunTable {
  const left = new Int32Array(g.cols * g.rows);
  const right = new Int32Array(g.cols * g.rows);
  for (let y = 0; y < g.rows; y++) {
    for (let x = 0; x < g.cols; x++) {
      let l = x;
      while (l > 0 && !g.blocks(l - 1, y)) l--;
      let r = x;
      while (r < g.cols - 1 && !g.blocks(r + 1, y)) r++;
      left[y * g.cols + x] = l;
      right[y * g.cols + x] = r;
    }
  }
  return { cols: g.cols, left, right };
}

export interface Span { lo: number; hi: number; }   // visible columns on one row, inclusive

// Sweep outward from the hero's row, one row at a time, keeping one span per row.
// Simplified: no slope or corner test, so it over-reveals around corners.
export function sweepSpans(g: Grid, t: RunTable, hx: number, hy: number, range: number): (Span | null)[] {
  const spans: (Span | null)[] = Array.from({ length: g.rows }, () => null);
  const here = hy * g.cols + hx;
  spans[hy] = { lo: t.left[here], hi: t.right[here] };
  for (const step of [1, -1]) {
    let prev = spans[hy] as Span;
    for (let y = hy + step; y >= 0 && y < g.rows && Math.abs(y - hy) <= range; y += step) {
      let lo = Infinity;
      let hi = -Infinity;
      for (let x = prev.lo; x <= prev.hi; x++) {
        if (g.blocks(x, y)) {            // a wall next to a visible span is itself seen
          lo = Math.min(lo, x);
          hi = Math.max(hi, x);
          continue;
        }
        const i = y * g.cols + x;
        lo = Math.min(lo, t.left[i]);
        hi = Math.max(hi, t.right[i]);
      }
      if (lo > hi) break;                // nothing new on this row: stop outward
      spans[y] = { lo, hi };
      prev = spans[y] as Span;
    }
  }
  return spans;
}

// Glyph buffer with per-row dirty bounds; only changed cells inside the bounds are drawn.
export interface Screen {
  cols: number;
  rows: number;
  glyph: Int32Array;
  changed: Uint8Array;
  dirtyLo: Int32Array;   // per row; lo > hi means clean
  dirtyHi: Int32Array;
}

export function createScreen(cols: number, rows: number): Screen {
  return {
    cols,
    rows,
    glyph: new Int32Array(cols * rows),
    changed: new Uint8Array(cols * rows),
    dirtyLo: new Int32Array(rows).fill(cols),
    dirtyHi: new Int32Array(rows).fill(-1),
  };
}

export function setGlyph(s: Screen, x: number, y: number, g: number): void {
  const i = y * s.cols + x;
  if (s.glyph[i] === g) return;
  s.glyph[i] = g;
  s.changed[i] = 1;
  if (s.dirtyLo[y] > x) s.dirtyLo[y] = x;
  if (s.dirtyHi[y] < x) s.dirtyHi[y] = x;
}

// Draw the changed cells, then clean the bounds. Returns the number of draw calls.
export function flush(s: Screen, draw: (x: number, y: number, glyph: number) => void): number {
  let drawn = 0;
  for (let y = 0; y < s.rows; y++) {
    for (let x = s.dirtyLo[y]; x <= s.dirtyHi[y]; x++) {
      const i = y * s.cols + x;
      if (s.changed[i] === 1) {
        draw(x, y, s.glyph[i]);
        s.changed[i] = 0;
        drawn += 1;
      }
    }
    s.dirtyLo[y] = s.cols;
    s.dirtyHi[y] = -1;
  }
  return drawn;
}

export {};
```

Sketch check: typechecked on the VPS with `npx -p typescript tsc --noEmit --strict --target es2020` (exit 0).

## 5. Lands in

- TARGET `origins/client/hud/map-flush.ts` (proposed path; not checked against the Frankendom repo). Client-only: the minimap and world map are HUD.
- Parity-checklist row: 14 (HUD). The list hint said row 12, which is combat sound cues in the addendum; row 14 fits a map redraw better, so the hint looks wrong. Flagged for Strategy.
- Reuse tag: rewrite-from-idea (NGPL copyleft: clean-room shape only; the sketch is written from the mechanism)
- Brief rule served: rules 6 and 7 (licence stated; the sweep and flush are read end to end on the donor side), rule 8 (target and row named)
Best transferable idea: keep a per-row dirty span and a changed flag per cell, so a frame draws only what changed and clears the bounds it used.
Decision (proposed): adapt — the bounds-then-flag redraw is a small, proven way to keep a minimap or HUD cheap on a phone; the row-span visibility sweep is useful for minimap fog of war but needs the corner test added before use, and the tty-specific parts are rejected.
Acceptance: with the hero still for 60 frames, the minimap issues zero draw calls per frame; when one tile changes, exactly one draw call is issued in that frame; a test checks that the dirty bounds are empty after each flush.

## 6. Gaps and risks

- Client-only. Visibility here decides what is drawn. It must not decide kills or aggro on the server; if the server needs line of sight, it needs its own copy of the check (checklist row 2 for the AI brain, not row 14).
- Zones as data: the blocking map comes from the level. Frankendom zones should supply the blocked cells as zone data, and the run table should be built per zone load, as `vision_reset` does per level (vision.c 224-261).
- D1 (defect in the function variant, read, not run): with `NO_MACRO_CPATH` defined (config.h 532-533), `_q1_path(int scol, int srow, int y2, int x2)` (vision.c 1419) names its first pair column then row, but the call through `q1_path(sy, sx, y, x)` (1410) passes the row first. The default build uses the macro variant (config.h 533 defines `MACRO_CPATH` unless `NO_MACRO_CPATH` is set; the macro's own names at 1212 match the call order), so the default is not affected. Fix: rename the function's parameters to match the call order, or swap the call. Do not copy the function variant's argument order.
- Over-reveal: the sketch drops the corner test, so it reveals a whole clear run that a corner would hide. Fix: add a line-of-sight check per opening (the donor's rule at 1802-1815 is the reference shape; it is copyleft, so write your own).
- The out-of-sight branch of `newsym` (display.c after 1000) was not read. The remembered-glyph behaviour (what a player sees of a remembered tile) is therefore not verified.
- The trigger model is event-based (vision.c 505-509). A zone with moving blockers (doors that open, gates) must call the recalc on each change, or the visible set goes stale. This was not checked against Frankendom's zone events.
- The donor's `TEMPORARY?` guard for column 0 (vision.c 827-835) is a workaround for a crash path; do not copy it.

Reuse tag: rewrite-from-idea (NGPL copyleft; clean-room shape only)
Brief rule served: rule 1 (real implementation found, read end to end on the redraw path and the vision update), rule 3 (confidence stated), rule 4 (best idea line), rule 6 (licence read in full), rule 8 (target and parity row named), rule 10 (receipts verified: 131 ok, 0 failed)
