# nkzw-tech-athena-crisis (rendering-performance, cell 17)

Donor: `/mnt/frankendom-donors/nkzw-tech-athena-crisis/hera/Tiles.tsx` (the `Tiles` memo component's layout effect; clock in `hera/lib/tick.tsx`; one-tile draw in `hera/render/renderTile.tsx`) | Licence: MIT (LICENSE.md: "The MIT License (MIT)", Copyright (c) 2024 Nakazawa Tech KK) | TypeScript / React, Canvas 2D | symbol `Tiles` (effect) and `tick` (clock)

Checked: Read in full: `hera/Tiles.tsx` (1-285), `hera/render/renderTile.tsx` (1-298), `hera/lib/tick.tsx` (1-45). Read in part: `athena/MapData.tsx` `tiles()` (401-416), `athena/info/Tile.tsx` (TileAnimation type 42-52, SeaAnimation 203-207, WaterfallModifiers/WaterfallAnimation 638-660), `athena/map/Configuration.tsx` (1-20). Hint file renderTile.tsx is the single-tile draw, not the redraw loop; the loop and the clock are in Tiles.tsx and tick.tsx. Not read: `useVisibilityState` (npm package), the sprite atlas files, whether each `Plain` sprite is opaque. Camera: not a camera cell, so no camera_scope tag. Confidence: high on the clock, the frame formula and the redraw gating (read end to end); medium on the cost of the per-tick scan (the loop bound is read, the time is not measured).

## 1. Mechanism

- One module-level clock: `setInterval` every `AnimationSpeed` = 180 ms (tick.tsx 11-18; Configuration.tsx 3). Every listener gets the same tick number, `floor(performance.now() / 180 + 1)` (tick.tsx 21). Listeners are a Set; `tick()` adds one and returns a function that deletes it (tick.tsx 41-43).
- Frame for a sprite at a tick: `(floor(tick / ticks) % frames) * offset` (tick.tsx 36). `getFrame` returns null when the sprite has no animation, or when the tile's modifier is not in the animation's modifier set (tick.tsx 31-33). Waterfall tiles use `WaterfallAnimation`, the river animation with offset 3 (Tile.tsx 642-652). Sea uses `frames: 4, ticks: 6, offset: 3` (Tile.tsx 203-207, the numbers are on lines 204-206).
- Full pass: the layout effect clears the canvas and draws every tile and both layers through `map.tiles()` (Tiles.tsx 121-137; MapData.tiles yields layer 0 and layer 1 per tile, MapData.tsx 401-416).
- Animated pass: only when `!paused && isVisible` (Tiles.tsx 170). The effect registers a tick listener and returns its unsubscribe (171). Each tick the listener loops over every tile index (172). For each tile it computes the layer-0 frame (177). Layer 0 is redrawn only if it has a frame, or if layer 1 animates and layer 0 does not (183). A layer-1 sprite is redrawn if layer 0 was redrawn or layer 1 animates (200). The canvas is not cleared in this pass, so static tiles keep their pixels.
- Base under overlays: because layer 0 is redrawn before an animated layer 1, the overlay never draws over stale pixels of its own frame. Non-plain interior layer-0 tiles also draw a plain base first (renderTile.tsx 101-109).
- Hidden tab: `useVisibilityState()` (Tiles.tsx 99). The animated pass only runs while visible; when visibility or any dependency changes, the effect re-runs, clears, and redraws everything (the dependency list, Tiles.tsx 240 onward).

## 2. Key functions

- The `Tiles` component effect: `/mnt/frankendom-donors/nkzw-tech-athena-crisis/hera/Tiles.tsx` 104-240. Full pass (121-137), tick-driven animated pass (170-237), cleanup by returned unsubscribe (171).
- `getFrame` and the clock: `/mnt/frankendom-donors/nkzw-tech-athena-crisis/hera/lib/tick.tsx` 1-45. Clock (11-18), tick number (21), frame formula (24-38), listener set (41-43).
- `renderTile`: `/mnt/frankendom-donors/nkzw-tech-athena-crisis/hera/render/renderTile.tsx` 58-298. Atlas cell from frame offset (93), alternate variant by position (96), plain base for interior layer-0 tiles (101-109), quarter/half/composite autotile sub-sprites (129-246), building shadow (261-263).
- `MapData.tiles`: `/mnt/frankendom-donors/nkzw-tech-athena-crisis/athena/MapData.tsx` 401-416. Yields layer 0 and layer 1 per tile index.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One shared low-rate clock; every animated thing reads the same tick | 180 ms per tick (theirs, Configuration.tsx 3) |
| Frame index = (tick / ticks-per-frame) mod frames, times a sprite row step | Sea: frames 4, ticks 6, offset 3 (theirs, Tile.tsx 204-206); waterfall offset 3 (Tile.tsx 648-651) |
| Redraw only what animates, leave static pixels | Redraw trigger: frame != null (Tiles.tsx 183) |
| Pause the animated pass when the tab is hidden | `useVisibilityState` (Tiles.tsx 99, 170) |
| Alternate tile variant by position | Every third cell, `(x + y) % 3 === 0`, shifts the atlas row by 4 (theirs, renderTile.tsx 96) |

## 4. TypeScript sketch

simplified: the sketch keeps the shared tick, the frame formula, the pre-selected animated list, and a redraw of only the animated cells on a retained canvas. It differs from the donor in three places: (a) it picks animated cells once instead of scanning every tile each tick (the donor scans `map.map.length` on every tick); (b) it clears each cell before redrawing, where the donor does not clear and relies on the base redraw and sprite opacity; (c) it leaves out the layer-1 overlay, the plain base, the floating edges, the storm-cloud connectors, the autotile sub-sprites, and the unsubscribe.

```ts
// Licence: MIT (donor, Nakazawa Tech KK 2024). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Anim { frames: number; ticks: number; offset: number; }
interface TileSprite { animation?: Anim | null; }
interface Ctx {
  clearRect(x: number, y: number, w: number, h: number): void;
  drawCell(cell: number, x: number, y: number): void;
}
interface Cell { sprite: TileSprite; baseCell: number; x: number; y: number; }

const ANIMATION_MS = 180;   // one shared clock for every animated tile (donor AnimationSpeed = 180)

// Tick number from wall-clock time; every listener gets the same number in the same interval.
function tickAt(nowMs: number): number {
  return Math.floor(nowMs / ANIMATION_MS + 1);
}

// Cell offset for an animation at a tick (donor getFrame formula); null when the sprite does not animate.
function frameOffset(anim: Anim | null | undefined, tick: number): number | null {
  if (!anim) return null;
  return (Math.floor(tick / anim.ticks) % anim.frames) * anim.offset;
}

// Cells that animate are picked once per map change, not re-scanned every tick.
function collectAnimated(cells: Cell[]): Cell[] {
  return cells.filter((c) => c.sprite.animation != null);
}

// Redraw only the animated cells on a retained canvas; static cells keep the pixels already drawn.
function redrawAnimated(ctx: Ctx, animated: Cell[], tick: number, tileSize: number): void {
  for (const c of animated) {
    const px = c.x * tileSize;
    const py = c.y * tileSize;
    ctx.clearRect(px, py, tileSize, tileSize); // the donor does not clear here; it relies on a base redraw and sprite opacity (not verified for every sprite)
    ctx.drawCell(c.baseCell + (frameOffset(c.sprite.animation, tick) ?? 0), px, py);
  }
}

export {};
```

## 5. Lands in

- TARGET `origins/client/zone-tile-anim.ts` (proposed new client module; the path was NOT checked against the Frankendom repo). Drives ambient animation for zone terrain and overlays (water, waterfalls, storm or weather overlays). Client-only.
- Parity-checklist row 16 (colour grade / quality). Note: the batch hint said row 12, but row 12 in the addendum is "combat sound cues", which does not fit rendering. Row 16 is the nearest fit; Lead to confirm.
- Reuse tag: rewrite-from-idea (MIT: code may be adapted; the sketch is clean-room in any case)
- Brief rule served: 1 (one engine, clients present it); rule 3 (client-only presentation).

## 6. Gaps and risks

- The donor's scan is per tick, not per animated tile: `for (let i = 0; i < map.map.length; i++)` (Tiles.tsx 172) walks every tile index every 180 ms, even if the map has no animation. Fix: build the animated list once per map change (as the sketch does).
- Redraw over old pixels: the donor does not clear animated cells (Tiles.tsx 183-207) and relies on the base redraw and sprite opacity. The plain base is drawn only for layer-0 interior tiles that are not plain (renderTile.tsx 101). Border tiles and plain animated tiles depend on sprite opacity, which was not checked. Fix: clear the cell before redraw (the sketch does this), or verify that every animated sprite is opaque.
- Static overlays are redrawn with an animated base: when layer 0 animates, a static layer 1 on the same tile is also redrawn (Tiles.tsx 200). This is needed for correctness once the base is redrawn, so it is a cost, not a bug.
- Frankendom has no 2D canvas for zones (the world is a client renderer with a third-person camera). The partial-redraw trick is canvas-specific. In a 3D renderer, the equivalent is to update the animated materials' frame or UV offset from the shared clock, not to redraw tiles. Only the clock and the data shape transfer.
- Frame pacing: the animation steps at about 5.5 Hz on a fixed clock. That suits water and foliage ambience but must not be used for hit feedback or the fight camera.
- The tick is wall-clock based (`performance.now()`), so a tab that is hidden and returns jumps to the current frame. This is intended (it is the reason for the visibility gate), and the full redraw on return (dependency change) hides the jump.
- MIT: the code may be adapted. The sketch is written from the mechanism, so no lines are copied.
- Not read: the body of `useVisibilityState`; the sprite atlas layout beyond what renderTile.tsx reads; whether `Plain` is an opaque sprite.

Reuse tag: rewrite-from-idea (MIT: code may be adapted; sketch clean-room)
Brief rule served: 1 (one engine, clients present it); rule 3 (client-only presentation).

Best transferable idea: Drive all ambient animation from one shared low-rate clock with each animation described as data (frames, ticks per frame, offset), pick the animated items once per change, and pause the ambient pass when the tab is hidden.
Decision (proposed): adapt — keep the shared clock, the per-animation data (frames, ticks, offset as zone data) and the hidden-tab pause for water, waterfall and weather ambience; the canvas tile redraw does not apply to a 3D renderer, which needs the same clock applied to material frames instead.
Acceptance: A zone with water and weather shows the same ambient cycle on every client (same frame index at the same time), and a backgrounded tab does no animation work until it returns to the foreground.
