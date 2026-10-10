# PixelGuys-Cubyz (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/gui/GuiWindow.zig` (with `src/gui/gui.zig`, `src/gui/windows/healthbar.zig`, `src/gui/windows/energybar.zig`) | Licence: GPL-3.0 (LICENSE line 2 reads "Version 3, 29 June 2007", GNU General Public License) | Zig | symbol `updateWindowPositions` (gui.zig 562) and `updateWindowPosition` (GuiWindow.zig 426)

Checked: read in full: `updateWindowPositions` (gui.zig 562-574), `updateWindowPosition` (GuiWindow.zig 426-478), `positionRelativeToFrame` (304-334), `positionRelativeToConnectedWindow` (335-377), `snapToOtherWindow` (270-302), `detectCycles` (246-269), `healthbar.zig` (81 lines), `energybar.zig` (73 lines), `hotbar.zig` (64 lines), `crosshair.zig` (86 lines). Partly read: `GuiWindow.updateSelected` (382-400; 401-422 not read). Callers: checked by grep for `updateWindowPositions()` across `src/` (about 30 call sites); read 4 of them in context (gui.zig 86, healthbar.zig 79, GuiWindow.zig 400, Window.zig 541-549), so the claim "re-solved on open, close, resize, drag and content-height change" is confirmed for those and by grep for the rest, not read one by one. Not read: the draw calls inside `Texture`/`draw.image`, the `GuiComponent` internals, the `Player.super.health` update path (only the default at Entity.zig 15). Confidence: high on the anchor and fixpoint math, high on the heart mapping, medium on the drag snapping (read, not run). No camera in this cell, so no `camera_scope`.

## 1. Mechanism

- A HUD window does not store a pixel position. Each window stores, per axis (x and y), one of four relations: a ratio of the frame (`ratio`), an attachment to a frame edge (`attachedToFrame`), an attachment to another window's edge (`attachedToWindow`), or a ratio across another window (`relativeToWindow`) (`GuiWindow.zig` 18-44 for the enum and union). Position is derived from the relation every time the solver runs.
- Attachment points are three: `lower`, `middle`, `upper` (GuiWindow.zig 18-22). For a self edge `upper` means "my far edge sits on the other point" and `lower` means "my near edge sits on it" (GuiWindow.zig 446-449 for the frame case). The enum names are coordinate-relative, not screen-relative, so read them as "low coordinate" and "high coordinate".
- Order of steps in one solve of one window (`updateWindowPosition`, 426-478): (a) min width guard (427-431); (b) `size = contentSize * scale` (433); (c) for each axis, switch on the relation and write `pos` (435-471); (d) `pos = floor(pos)` (473); (e) clamp x to `[0, frame - size]` (474-475) and y to `[0, frame - size]` (476-477), so windows never leave the frame.
- Whole-layout solve (`updateWindowPositions`, gui.zig 562-574): run the per-window solve over every window in `windowList`, measure the squared move of each window (`lengthSquare(oldPos - newPos) >= 1e-3`, line 570), and repeat while any window moved. This is a fixpoint: a window attached to another window is only correct after the other window has moved, so the loop runs until nothing moves.
- When it runs: on open and close (gui.zig 86, 108, 329, 360 defer calls), on framebuffer resize (graphics/Window.zig 546-549), on drag (GuiWindow.zig 400), on zoom button clicks (GuiWindow.zig 216, 227), and when a HUD window changes its own content height (healthbar.zig 77-79). It is not called from `updateAndRenderGui` (gui.zig 577 onward; the grep found no call there). The health bar calls it from its per-frame `render`, but only when its height changes.
- Dragging a window snaps it (`snapToOtherWindow`, 270-302): for each axis, the candidate attachments are the other windows whose extents overlap on the other axis and that are within `snapDistance` = 3 units (GuiWindow.zig 41, 272, 284-297). Candidates that would close a loop are skipped by `detectCycles` (281; 246-269 walks the attachments and returns true if it reaches `self`). If nothing is near, the relation is written as `ratio` from the frame or as `relativeToWindow` from the other window (307-334, 338-377).
- Health frames (healthbar.zig, 45-80): the bar reads `Player.super.health`, clamps at 0 (48), converts to half-heart units by `ceil(health*2)` (49), takes whole hearts as `units/2` (50) and a half flag as `units%2` (51), and draws `ceil(maxHealth)` cells (52). A row holds 160 units of width (`contentSize` 160 x 20, line 21), so a new row starts after 8 cells (57-59). Cells are drawn from the window's bottom edge upward (72). After the loop the window height is set to 20 units per row, where rows = ceil(cells / 8) (76-79: `y` ends at 20 x rows); when that differs from the stored height the window updates it and re-solves all windows (77-79).
- Energy frames (energybar.zig, 45-72): the same layout, but the icon rule is threshold-based: full when `energy + 1 <= value` (57), half when `energy + 0.5 <= value` (59), otherwise empty. A value of 0.1 shows no energy icon; the same 0.1 of health shows a half heart.
- Hotbar and crosshair (not the core of the mechanism; short): the hotbar is 12 item slots in a horizontal list at scale 0.75 (hotbar.zig 21, 27), and its selected slot is highlighted by setting `hovered = true` on it each update (63). The crosshair is a 64 x 64 sprite drawn with a subtractive blend (crosshair.zig 55-60: `colorBlendOp = .subtract` with one/one factors).

## 2. Key functions

- `updateWindowPositions`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/gui/gui.zig` 562-574. Fixpoint loop over all windows, squared-move threshold 1e-3, no iteration cap.
- `updateWindowPosition`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/gui/GuiWindow.zig` 426-478. One window, one pass: size, per-axis relation switch, floor, clamp.
- `snapToOtherWindow`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/gui/GuiWindow.zig` 270-302. Drag snapping, 3-unit tolerance, cycle guard.
- `detectCycles`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/gui/GuiWindow.zig` 246-269. Walks the attachment chain and returns true when it reaches `self`.
- `positionRelativeToFrame` and `positionRelativeToConnectedWindow`: GuiWindow.zig 304-334 and 335-377. Turn a dragged position back into a relation.
- Health frames `render`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/gui/windows/healthbar.zig` 45-80.
- Energy frames `render`: `/mnt/frankendom-donors/PixelGuys-Cubyz/src/gui/windows/energybar.zig` 45-72.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Anchor a panel to a frame edge or a sibling edge, with three points | Attachment set lower/middle/upper (GuiWindow.zig 18-22) |
| Re-solve all panels until none moves | Move threshold 1e-3 on squared distance (gui.zig 570); no pass cap (theirs, gui.zig 564) |
| Snap during drag | 3 units (theirs, GuiWindow.zig 41) |
| Half-unit health frames, whole first, then half, then empty | Half-units = ceil(health x 2) (theirs, healthbar.zig 49); whole = units/2 (50) |
| Wrap cells into rows at a fixed width | Row width 160 units, cell 20 units, so 8 cells per row (theirs, healthbar.zig 21, 57) |
| Layout scale per panel | Health and energy scale 0.5 (healthbar.zig 16, energybar.zig 16); hotbar 0.75 (hotbar.zig 27) |
| Default stats that size the frames | maxHealth 8 (Entity.zig 15); energy 8 (Entity.zig 16-17) |
| Energy icon thresholds | Full at value >= n+1, half at value >= n+0.5 (energybar.zig 57, 59): a different rounding rule from health |

## 4. TypeScript sketch

simplified: the sketch keeps the anchor relations (frame ratio, frame attach, window attach), the per-pass order (size, relation, floor, clamp), the fixpoint loop, and the heart-cell mapping. It omits drag and snapping (`snapToOtherWindow`, `positionRelativeToFrame`, `positionRelativeToConnectedWindow`), the cycle guard, the `relativeToWindow` ratio relation, the title bar and minimum width rule, and all rendering. It adds a pass cap of 8, which the donor does not have. It clamps each axis max-then-min, where the donor clamps y min-then-max; the two orders differ only when a window is larger than the frame. The heart mapping uses the donor's `ceil(2h)` rule for both halves and wrap width, and does not reproduce the energy thresholds.

```ts
// clean-room sketch of an anchored-HUD solver and a heart-row mapper (shape only, GPL-3.0 donor)
type Attach = "lower" | "middle" | "upper";

type Rel =
  | { kind: "ratio"; ratio: number }
  | { kind: "frame"; self: Attach; other: Attach }
  | { kind: "window"; ref: Panel; self: Attach; other: Attach };

interface Panel {
  id: string;
  contentW: number;
  contentH: number;
  scale: number;
  size: [number, number];
  pos: [number, number];
  rel: [Rel, Rel];
}

const SNAP_PX = 3;
const MAX_PASSES = 8; // fix: the donor loops with no cap

function anchorPoint(a: Attach, start: number, length: number): number {
  return a === "lower" ? start : a === "middle" ? start + 0.5 * length : start + length;
}

function selfStart(a: Attach, point: number, size: number): number {
  return a === "lower" ? point : a === "middle" ? point - 0.5 * size : point - size;
}

function solveAxis(p: Panel, axis: 0 | 1, frame: [number, number]): number {
  const r = p.rel[axis];
  const size = p.size[axis];
  if (r.kind === "ratio") return frame[axis] * r.ratio - size / 2;
  if (r.kind === "frame") return selfStart(r.self, anchorPoint(r.other, 0, frame[axis]), size);
  return selfStart(r.self, anchorPoint(r.other, r.ref.pos[axis], r.ref.size[axis]), size);
}

// Re-solve every panel until no panel moves (squared move under 1e-3), with a pass cap.
function solveAll(panels: Panel[], frame: [number, number]): { passes: number; converged: boolean } {
  for (const p of panels) p.size = [p.contentW * p.scale, p.contentH * p.scale];
  for (let pass = 1; pass <= MAX_PASSES; pass++) {
    let changed = false;
    for (const p of panels) {
      const old: [number, number] = [p.pos[0], p.pos[1]];
      for (const axis of [0, 1] as const) {
        const raw = Math.floor(solveAxis(p, axis, frame));
        const lo = Math.max(raw, 0);
        p.pos[axis] = Math.min(lo, frame[axis] - p.size[axis]);
      }
      const dsq = (p.pos[0] - old[0]) ** 2 + (p.pos[1] - old[1]) ** 2;
      if (dsq >= 1e-3) changed = true;
    }
    if (!changed) return { passes: pass, converged: true };
  }
  return { passes: MAX_PASSES, converged: false };
}

// Health frames: half-heart units rounded up, whole hearts, empty frames to the max, row wrap.
type Frame = "full" | "half" | "empty";
function heartFrames(health: number, maxHealth: number, rowWidthPx = 160, cellPx = 20): { frames: Frame[]; perRow: number } {
  const units = Math.ceil(Math.max(0, health) * 2);
  const whole = Math.floor(units / 2);
  const half = units % 2;
  const total = Math.ceil(maxHealth);
  const frames: Frame[] = [];
  for (let i = 0; i < total; i++) {
    frames.push(i < whole ? "full" : i < whole + half ? "half" : "empty");
  }
  return { frames, perRow: Math.floor(rowWidthPx / cellPx) };
}

export { solveAll, heartFrames };
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/cubyz-anchor-hud.ts`).

## 5. Lands in

- TARGET `src/fight/hud.ts` (proposed new client module; the HUD is client-only, so it must not be read by the engine. The brief's `src/fight/` path is used because the template requires it; whether that file already exists was not checked). Parity-checklist row 14 (HUD).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only, no code carried over)
- Brief rule served: 14 (HUD: panels and health frames readable at phone width); rule 8 (client-only camera/HUD/sound) for the engine boundary.

Best transferable idea: Anchor every HUD panel to the frame edge or to a sibling panel's edge with three attach points, re-solve all panels until none moves (with a pass cap), and show health as whole and half cells that wrap at a fixed row width.
Decision (proposed): adapt — the anchor solver fits a 375-px phone HUD where the health frames hang off the hotbar, but the donor's uncapped loop and its two different rounding rules (health ceil versus energy thresholds) are fixed in the sketch: one rule, one cap.
Acceptance: at 375 px wide the health frames sit right-aligned above the hotbar and wrap to a second row after 8 cells; a client test asserts the layout converges within 8 passes and that no panel moves after the last pass.

## 6. Gaps and risks

- GPL-3.0: clean-room, shape only. The sketch is written from the mechanism; no line is translated.
- Not present in this donor (checked by listing `src/gui/windows` and grepping the source for these words): a minimap, a world map, touch controls, an input buffer, lock-on, and any localisation. The only "touch" string is the menu label "Touch Grass" (`main.zig` 64). The only accessibility-like setting found is a user GUI scale override (`settings.zig` 52, applied at `gui.zig` 303). So this cell is a layout and health-frame cell, not a broader HUD cell.
- String table: none. There is no lang or locale directory under `assets/cubyz` (checked to depth 3). UI labels are English literals in code, for example `if (editingKeyboard) "Gamepad" else "Keyboard"` (`controls.zig` 113). Entries counted: 0 tables, 0 locale files. Grammar: not applicable.
- Defect 1, no pass cap: the fixpoint loop (gui.zig 564) has no iteration limit. The cycle guard runs only during drag snapping (GuiWindow.zig 281), not when an attachment is written from code. A loop built through code would never end. fix: cap the passes and check cycles at attach time (the sketch caps at 8).
- Defect 2, two rounding rules: health shows a half heart for any positive fraction (`ceil(health*2)`, healthbar.zig 49), while energy shows a half icon only from 0.5 (energybar.zig 59). fix: choose one rule for every stat bar; for Frankendom, show a partial stat only at a visible threshold.
- Defect 3, naming: the first branch of `positionRelativeToFrame` is commented "Snap to the center" (GuiWindow.zig 307) but compares the window's far edge to the centre. Only a comment mismatch; do not copy the comment.
- Defect 4, clamp order: y is clamped min-then-max, x max-then-min (GuiWindow.zig 474-477). Only matters if a window is larger than the frame. fix: one clamp helper for both axes.
- Frankendom ruling (HUD is client-only, kills are server-verified): the donor reads health straight from the player object (healthbar.zig 48) with no server check. Frankendom must draw only the server-sent health and must not let the layout solver write game state.
- Subtractive crosshair (crosshair.zig 55-60): the blend is subtractive, so it may read as a contrast reticle over bright and dark scenes. Not seen on screen (not run). Worth a look for the target reticle, but it is a client shader detail with no mechanism beyond the blend mode.
- Phone width: at 20 units per cell and 160 units per row, 8 hearts fill a row. Frankendom's row width must be set from the 375 px frame and the chosen scale, not copied from the donor's 160.
