# OpenTTD-OpenTTD (rendering-performance, cell 17)

Donor: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/viewport.cpp` (with `src/gfx.cpp`, `src/blitter/32bpp_base.cpp`) | Licence: GPL-2.0-only (`viewport.cpp` line 3: "Free Software Foundation, version 2."; `COPYING.md` line 7 "_Version 2, June 1991_"; no "or later" in the header) | C++ | symbol `SetViewportPosition` (with `DoSetViewportPosition`)

Checked: The hint file `src/gfx.cpp` holds the blit primitive (`GfxScroll`, 85-98) and the dirty-block code; the mechanism that decides what to blit and what to redraw is in `viewport.cpp` 270-398. Read in full: `viewport.cpp` 270-398, `gfx.cpp` 85-114 and 1429-1470 and 1519-1560, `blitter/32bpp_base.cpp` 84-130, `window_gui.h` 916. Callers: `GfxScroll` has one caller (`viewport.cpp` 325, grep). I did not count the callers of `SetViewportPosition`. Not read: the 8bpp and 40bpp `ScrollBuffer` (grep only), `Blitter::MovePixels` itself, `ViewportDoDraw` (1814-), `ViewportAddLandscape` (1210-). Read but not written up: `ViewportSortParentSprites` (1599-1720), a painter's-order sort for sprite boxes. Confidence: high on the piece carving, the offset sign and the exposed-strip order (checked against the blitter's own row direction, 84-130). Camera: not a camera cell (camera_scope not applicable); the viewport follow code `UpdateViewportPosition` (1991) was not read.

Best transferable idea: When a 2D map view pans by a few pixels, move the pixels that are still on screen with one blit and redraw only the exposed strips, and never copy or redraw a part that a window in front covers.

Decision (proposed): adapt - apply to 2D map views only (the minimap and the world map pan); the 3D fight view moves every frame and has nothing to keep, so it does not use this.
Acceptance: A unit test on the planner (no GPU) asserts that a 40 px pan with one overlay window in front blits only the uncovered pieces and that the redrawn strips cover exactly the newly exposed area, with no strip under the overlay; in play, a minimap pan on a phone redraws only a strip the width of the pan.

## 1. Mechanism

- Trigger: when a map view's virtual position changes, `SetViewportPosition` (`viewport.cpp` 344-400) converts the old and new positions to screen pixels with the zoom rounding (358-363), takes the difference as the offset (`old - new`), returns if it is zero (366), and stores the offset in `_vp_move_offs` (368-369).
- Clip: the view rectangle is clipped to the screen (376-392) and then handed to `DoSetViewportPosition` with an iterator to the windows in front of the view's own window (394-396; `IteratorToFront` runs back to front, `window_gui.h` 916).
- Carve: `DoSetViewportPosition` (278-) finds the first window in front that overlaps the rectangle (282-285). It splits the rectangle around that window: a left part (287-), a right part (293-), a part above (299-) and a part below (305-), each handled by a recursive call (the middle is covered by the window and is dropped). When no window in front overlaps, the piece is the kept part.
- Per kept piece (319-340): if `|xo| >= width` or `|yo| >= height`, the piece is redrawn whole (319-322). Otherwise `GfxScroll` blits the piece by (xo, yo) (325). Then the exposed strips are redrawn: for xo > 0 the left strip of width xo, full height (328), and the piece shrinks to start at left+xo (329-330); for xo < 0 the right strip of width -xo (332-333). Then for yo > 0 the top strip of height yo across the new width (337); for yo < 0 the bottom strip of height -yo (339).
- Blit (`GfxScroll`, `gfx.cpp` 85-98): returns on no move (89); calls the blitter's `ScrollBuffer` (95); the blitter takes the rectangle by reference and shrinks it to the part that received pixels (95-96, 116; the copy direction is set per scroll direction, 109 and 129). `GfxScroll` marks only that moved part dirty (97). The exposed strips are dirtied by `RedrawScreenRect`, which redraws every window over the rectangle (1443).
- Tick: none. The work is done once per position change, not per frame; the cost is proportional to the kept area plus the strips.
- Numbers: the offset is in screen pixels after zoom rounding (358-363). The only threshold is the full-redraw rule (319). The dirty block size is 64 x 8 px for the separate dirty-block grid (`gfx.cpp` 77-78), not used by this mechanism.

## 2. Key functions

- `SetViewportPosition`: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/viewport.cpp` 344-400. Offset, clip, call the carve.
- `DoSetViewportPosition`: same file, 278-341. Carve around windows in front; per piece, full redraw, blit, exposed strips.
- `GfxScroll`: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/gfx.cpp` 85-98. No-op for zero offset; blitter scroll; dirty the moved part.
- `Blitter_32bppBase::ScrollBuffer`: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/blitter/32bpp_base.cpp` 84-130. Shifts the copy by the offset, shrinks the rectangle to the moved part, handles the four sign cases.
- `RedrawScreenRect`: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/gfx.cpp` 1429-1445. Redraws the overlapped windows over the strip.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Keep the pixels still on screen: blit by the offset | None (mechanism) |
| Redraw only the exposed strips: side strip full height first, then top or bottom strip across the new width | None (mechanism) |
| Carve the kept area around windows in front, not behind | Window z-order (theirs, `window_gui.h` 916) |
| Redraw whole when the move is at least the piece size | Threshold: the piece's own width or height (theirs, `viewport.cpp` 319) |
| Round the view position before taking the difference | Zoom rounding `UnScaleByZoomLower` (theirs, 358-363) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's piece carving (windows in front only, in z order), the full-redraw threshold, the blit of the kept piece, and the exposed-strip order (side strip first, then top or bottom). It omits the screen clipping of the view (376-392), the zoom rounding (358-363), the cursor undraw in `GfxScroll`, the blitter's by-reference shrink (the sketch only logs the blit) and the pixel copy itself. The carve recurses in a different order from the donor but makes the same set of pieces.

```ts
// Licence: GPL-2.0-only (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Rect { left: number; top: number; width: number; height: number; }

const log: string[] = [];
const redraw = (r: Rect): void => { log.push(`redraw ${r.left},${r.top} ${r.width}x${r.height}`); };

const overlaps = (a: Rect, b: Rect): boolean =>
  a.left + a.width > b.left && b.left + b.width > a.left &&
  a.top + a.height > b.top && b.top + b.height > a.top;

// Splits r into the pieces it keeps (r minus window i). Only windows after i can still cover a piece,
// because the earlier windows did not overlap r at all.
function carve(r: Rect, fronts: Rect[], start: number, out: Rect[]): void {
  for (let i = start; i < fronts.length; i++) {
    const w = fronts[i];
    if (!overlaps(r, w)) continue;
    const right = r.left + r.width;
    const bottom = r.top + r.height;
    const wRight = w.left + w.width;
    const wBottom = w.top + w.height;
    const l = Math.max(r.left, w.left);
    const rr = Math.min(right, wRight);
    if (r.left < w.left) carve({ left: r.left, top: r.top, width: w.left - r.left, height: r.height }, fronts, i + 1, out);
    if (wRight < right) carve({ left: wRight, top: r.top, width: right - wRight, height: r.height }, fronts, i + 1, out);
    if (r.top < w.top) carve({ left: l, top: r.top, width: rr - l, height: w.top - r.top }, fronts, i + 1, out);
    if (wBottom < bottom) carve({ left: l, top: wBottom, width: rr - l, height: bottom - wBottom }, fronts, i + 1, out);
    return;
  }
  out.push(r);
}

// view: the map view rectangle. fronts: windows in front of it, back to front.
// xo, yo: how far the content moves on screen (positive = right / down).
function scrollView(view: Rect, fronts: Rect[], xo: number, yo: number): void {
  if (xo === 0 && yo === 0) return;
  const pieces: Rect[] = [];
  carve(view, fronts, 0, pieces);
  for (const p of pieces) {
    // A piece that moves by at least its own size keeps nothing: redraw it whole.
    if (Math.abs(xo) >= p.width || Math.abs(yo) >= p.height) { redraw(p); continue; }

    // Blit the kept part; the moved part is valid, the exposed strips are not.
    let { left, top, width, height } = p;
    log.push(`blit ${left},${top} ${width}x${height} by ${xo},${yo}`);

    // Exposed strips: the side strip first, full height; then the top or bottom strip across the new width.
    if (xo > 0) { redraw({ left, top, width: xo, height }); left += xo; width -= xo; }
    else if (xo < 0) { redraw({ left: left + width + xo, top, width: -xo, height }); width += xo; }

    if (yo > 0) redraw({ left, top, width, height: yo });
    else if (yo < 0) redraw({ left, top: top + height + yo, width, height: -yo });
  }
}

// Demo: a 640 x 480 map view, one window in front, pan 40 px right then 30 px up.
const view: Rect = { left: 0, top: 0, width: 640, height: 480 };
const fronts: Rect[] = [{ left: 500, top: 100, width: 120, height: 80 }];
scrollView(view, fronts, 40, 0);
scrollView(view, fronts, 0, -30);
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/openttd-scroll-blit.ts`).

## 5. Lands in

- TARGET `src/fight/hud-map-pan.ts` (new, client-only: pan for the minimap and the 2D world map; the engine never imports it). Parity-checklist row 14 (HUD: minimap and world map).
- Reuse tag: rewrite-from-idea (GPL-2.0-only; clean-room only, shape not code)
- Brief rule served: 7 (licence: GPL clean-room, shape only); addendum rule: HUD is client-only.

## 6. Gaps and risks

- GPL-2.0-only: clean-room only. The sketch was written from the mechanism, not from the donor lines.
- Not for the 3D fight view or the third-person camera: the whole view changes every frame, so nothing is kept. Its use is limited to the 2D map views.
- The blitter shrinks the rectangle it was given, so the dirty mark covers only the moved part. The exposed strips are dirtied by `RedrawScreenRect`, so the dirty marks stay correct. Frankendom must keep both halves: copy the kept pixels and mark the strips, never the whole map.
- The zoom rounding (358-363) exists because a half-pixel offset shows a one-pixel glitch (comment at `viewport.cpp` 355-357, FS#1412). Frankendom's map scale must round the offset the same way, or the map will shimmer at fractional zoom. Donor comment read; the glitch is not reproduced.
- Overlay windows are found by walking the window stack every pan. Frankendom has few overlays, so the cost is small; a pan with many overlays was not measured in the donor.
- A related dirty-block grid (64 x 8 px, `gfx.cpp` 77-82 and 1455-1520) is also in this donor. It is the same family as the OpenRCT2 grid (cell 17 of OpenRCT2-OpenRCT2) and is not written up again here.
- Defects: none found in the carve, the offset sign or the exposed-strip order. Checked against the blitter's row direction (84-130) and the donor's own four-case sign handling.
