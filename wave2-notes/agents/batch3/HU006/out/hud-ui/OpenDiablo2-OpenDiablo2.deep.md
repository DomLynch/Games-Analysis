# OpenDiablo2-OpenDiablo2 (hud-ui, cell 1)

Donor: /mnt/frankendom-donors/OpenDiablo2-OpenDiablo2/d2game/d2player/globeWidget.go | Licence: GPL-3.0 (LICENSE read: GNU GPL v3; copyleft, clean-room, shape only) | Go | symbol globeWidget.Render

Checked: cell 1 = row 1 of cells-HU006.tsv. Hint file hud.go read in full (684 lines); globeWidget.go read in full (241 lines); asset_manager.go 265-312 (TranslateString, LoadStringTable); d2tbl/text_dictionary.go lines 1-200 (whole TBL reader); hud.go hover-label scan (585-621). Camera_scope: not a camera note. Confidence high on the orb fill, pin tooltip and hover scan (read end to end). Not read: the widget group render loop, RenderSection internals, and any automap draw path (grep for AutoMaps and automap consumers finds only the loader and key bindings, so the minimap/world map is not implemented in this donor). Touch input and lock-on: grep finds none (the only "lock" hits are the tooltip pin; "tap" hits are inside "Catapult"). String table: the .tbl binary is not in the donor (none within three levels), so the entry count is not available; the only table data is a three-entry test fixture (text_dictionary_test.go:7-12).

## 1. Mechanism

The health orb is an 80 px tall widget. Each frame it reads the hero's live health and max through pointers (value and valueMax are *int, so nothing is copied). The fill is a mask: barHeight = int(value / max * 80), and the mask rectangle starts at y = 80 - barHeight, so the fill grows up from the bottom. The glass overlay is drawn after the fill.

Order of operations in Render: ratio, barHeight, maskRect, position fill, RenderSection(fill), position overlay, Render(overlay).

Tooltip: hover start shows the tooltip unless it is pinned; hover end hides it unless pinned; a click (Activate) flips the pin and sets visibility to the pin state. Advance runs every frame (called from HUD.Advance) and rebuilds the text from the string table template "panelhealth" with value and max.

Companion mechanism (not written up as its own note): HUD.renderForSelectableEntitiesHovered scans selectable entities, takes each sprite box padded by 5 px, and shows the entity name over the first box the cursor is inside (loop breaks on the first hit, so list order decides, not distance).

## 2. Key functions

- globeWidget.Render (globeWidget.go:183-194): fill then overlay.
- globeWidget.Advance and updateTooltip (globeWidget.go:205-216): text refresh every frame.
- newGlobeWidget hover handlers (globeWidget.go:123-133) and Activate (globeWidget.go:218-221): hover plus click-to-pin.
- globeWidget.Contains (globeWidget.go:198-203): hit test with bottom-left origin.
- HUD.Advance (hud.go:661-672) drives the orb; hud.go:180 registers it in the panel group.
- HUD.renderForSelectableEntitiesHovered (hud.go:585-621) for the companion scan.

## 3. Numbers vs mechanism

- Height and width 80 px (globeWidget.go:22-23). Each pixel of fill is max/80 of health. At max 100, hp 1 gives 0.8 px, which int() floors to 0: the orb looks empty while the hero is alive. Defect; fix: ceil for hp above zero (sketch does this).
- No clamp: value above max gives a bar taller than 80 px; a negative value gives a negative bar. Defect; fix: clamp ratio to [0, 1] (sketch does this).
- valueMax of 0 divides by zero in float64 (NaN); what int() of NaN gives is implementation-defined in Go. Defect; fix: guard max > 0 (sketch does this). Not run.
- Hover pad 5 px (hud.go:34). Pin has no timer; it stays until the next click.
- Stamina bar turns red below 0.25 of max (hud.go:35, 518): a second low-state cue (not in the sketch).

## 4. TypeScript sketch

simplified: keeps the donor's bottom-up fill and hover/pin rules; omits sprites, the widget group, the string table (the label function is passed in) and the hover scan. Fixes are noted in the comment: clamp, zero-max guard, ceil instead of floor. Typechecked on the VPS with tsc --strict --target es2020 (exit 0).

```ts
// Health orb fill and tap-to-pin tooltip (client HUD only).
// The server never reads any of this; hp comes from the snapshot.
export const ORB_HEIGHT_PX = 80; // donor globeHeight = 80
export const ORB_WIDTH_PX = 80;  // donor globeWidth = 80

export interface OrbState {
  value: number; // live hp (read every frame)
  max: number;   // live max hp
  pinned: boolean;
}

export interface FillRect { x: number; y: number; w: number; h: number; }

// Fill is anchored to the bottom: the visible band is the last h rows.
// Fixes vs donor: ratio is clamped to [0, 1]; max <= 0 gives an empty orb;
// a positive hp always shows at least one row (donor uses int() = floor).
export function orbFillRect(value: number, max: number): FillRect {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const h = ratio > 0 ? Math.ceil(ratio * ORB_HEIGHT_PX) : 0;
  return { x: 0, y: ORB_HEIGHT_PX - h, w: ORB_WIDTH_PX, h };
}

// Hover shows the tooltip unless it is pinned.
export function onHoverStart(s: OrbState, show: (v: boolean) => void): void {
  if (!s.pinned) show(true);
}

// Hover end hides the tooltip unless it is pinned.
export function onHoverEnd(s: OrbState, show: (v: boolean) => void): void {
  if (!s.pinned) show(false);
}

// Tap or click toggles the pin. Touch has no hover, so the tap is the only way to read the number.
export function onActivate(s: OrbState, show: (v: boolean) => void): void {
  s.pinned = !s.pinned;
  show(s.pinned);
}

// Text is re-built every frame from the live values, as the donor does in Advance.
export function advance(s: OrbState, label: (value: number, max: number) => string, setText: (t: string) => void): void {
  setText(label(s.value, s.max));
}

export {};
```

## 5. Lands in

Target: src/fight/hud.ts (proposed new client module; the HUD is client-only). Parity row 14 (HUD). The orb reads hp from the snapshot and never decides a death; the server stays the only owner of hp.

## 6. Gaps and risks

- Client-only: the fill is the client's view; hp changes and kills stay server-verified, one ledger.
- The Pit is a client too: the orb and the pin must behave the same in the Pit view (same module).
- MAX_ATTACKERS = 3: the donor's name scan takes the first list entry under the cursor, not the nearest or the current target. With three enemies overlapping, Frankendom must pick the target from the engine's hate list, not from hover order.
- No touch input, no lock-on, no automap draw in this donor. The tap-to-pin rule is designed here, not taken from the donor. The minimap and world map are absent, so there is no donor shape to copy for them.
- Donor warning (hud.go:379): panel positions depend on draw order. Frankendom layout must not depend on call order.
- Licence GPL-3.0: shape only; do not translate line by line.

Reuse tag: reuse-candidate (HUD orb fill, pin tooltip). Donor licence copyleft; shape only.

Brief rule served: "keep the idea, fix the defect". Floor is fixed to ceil, clamp and zero-max guard added in the sketch. Judged on the mechanism, not the genre.

Best transferable idea: A health orb that fills from the bottom off a clamped hp/max ratio, with a tap-to-pin tooltip for touch screens where there is no hover.
Decision (proposed): adapt - keep the tap-to-pin tooltip and the bottom-up fill rule, with the clamp, ceil and zero-max fixes; the orb art stays ours.
Acceptance: On a 375 px phone, tapping the orb pins "hp / max" until a second tap; a unit test asserts orbFillRect(1, 100).h === 1, orbFillRect(150, 100).h === 80 and orbFillRect(5, 0).h === 0.
