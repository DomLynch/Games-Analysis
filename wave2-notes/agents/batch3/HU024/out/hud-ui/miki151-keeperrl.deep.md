# miki151-keeperrl (hud-ui, cell 2)

Donor: `/mnt/frankendom-donors/miki151-keeperrl/map_gui.cpp` | Licence: GPL-2.0-or-later (`window_view.cpp` header: "version 2 of the License, or (at your option) any later version"; `LICENSE` is the GPL v2 text) | C++ | symbol `MapGui::drawHealthBar`

Checked: the hint file `window_view.cpp` is the window host, not the bar. Its licence header (lines 1-7) and function list were read; its bodies were not. The bar is in `map_gui.cpp`: lines 509-563 read in full, the call site at 677 inside `drawObjectAbs` (header 579; the function has no other `MapGui::` definition between 579 and 677, and the body was read at 655-690). Other files read: `body.cpp` 843-861 (health source and HEALTH_BAR flag), `creature.cpp` 1862-1872 (capture flag, line 1869), `gui_builder.cpp` 3461-3463 and 3518-3545 (inspect panel bar), `translations.cpp` 14-57 and 87-135 (grammar; 136 onward not read). Callers: `drawHealthBar` is called only from 677 (repo grep); `getHealthBarColor` from 554 and `gui_builder.cpp` 3536 (repo grep). Confidence high on the bar arithmetic. Medium on how the renderer draws a rectangle whose right edge lies left of its left edge (`drawFilledRectangle` and `Color::transparency` not read). Camera scope: not a camera cell.

## 1. Mechanism

- Source of the value: `Body::updateViewObject` (`body.cpp` 853-861) writes the HEALTH attribute from the health pool when the body has one (854-855); otherwise from the body-part fraction (`getBodyPartHealth`, 843-850, 857). It sets HEALTH_BAR on every body (858). It sets SPIRIT_DAMAGE when the body has a spirit health type (859-860).
- Body-part fraction (843-850): `gone` sums injured plus lost parts over all body parts (847); `total` sums present parts plus lost parts (848). Result: `1 - min(20, gone) / min(20, total)` (850). Both sides are capped at 20.
- Draw order inside `drawObjectAbs`: tile sprite, parts, corners, aura, shadow (about 655-675), then the health bar (677), then the power-off icon (678), the lock key icon (682), and effects (684).
- `drawHealthBar` (533-563), in order:
  1. No HEALTH attribute: return (536-537).
  2. Furniture with FURNITURE_CRACKS: draw a crack sprite instead of a bar and return (538-541). Below 0.4 one crack tile, below 0.8 the other, otherwise nothing (518-531).
  3. Capture bar (CAPTURE_BAR, set from creature state at `creature.cpp` 1869) is drawn whether or not HEALTH_BAR is set, in white (542-544, 554).
  4. Otherwise return unless HEALTH_BAR is set (543-544), and return when health is exactly 1 (545-546). So the bar is shown only while the body is damaged.
  5. Geometry (547-552): raise the bar 20% of tile height (547), thickness 12% of tile height (548), track length 80% of tile width (549), track starts at 10% of tile width (551). The fill's right edge is `pos.x + size.x * state * 0.9` (552). See section 6, defect 1.
  6. Colour (554, 509-516): two linear clamps on the red and green channels. Red is `min(1, 2 - 2h)` (1 up to half health, 0 at full). Green is `min(1, 2h)` (0 at zero, 1 from half health up). Blue is 0. So the colour runs red at zero, yellow at half, green at full. Spirit damage (512-513) swaps green and blue and lifts green by 100 (capped at 255).
  7. Draw: a 1-px dark outline around the track (557), the full track at transparency 100 (558), the fill at transparency 200 only when health is above zero (559-560), and a 1-px black shadow under the track at transparency 100 (561-562).
- Inspect panel (`gui_builder.cpp` 3534-3539): the same colour ramp at transparency 70 as a progress bar, a label that is MATERIALIZATION for spirit damage and HEALTH otherwise (3461-3463), and the value as a percentage.

## 2. Key functions

- `MapGui::getHealthBarColor`: `/mnt/frankendom-donors/miki151-keeperrl/map_gui.cpp` 509-516 (colour ramp and spirit swap).
- `MapGui::drawHealthBar`: same file, 533-563 (visibility, geometry, fill, track).
- `MapGui::drawObjectAbs`: same file, header 579; bar call at 677.
- `Body::getBodyPartHealth`: `/mnt/frankendom-donors/miki151-keeperrl/body.cpp` 843-851.
- `Body::updateViewObject`: same file, 853-861 (what the view receives).
- Panel: `/mnt/frankendom-donors/miki151-keeperrl/gui_builder.cpp` 3534-3539.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Two linear clamps make a red-yellow-green ramp from one value | Slope 2 on both channels, so the yellow point sits at 0.5 (510) |
| Show only while damaged: hide at exactly full | Full = 1 (545) |
| Track geometry as ratios of the tile | Length 0.8 (549), left 0.1 (551), thickness 0.12 (548), raise 0.2 (547) |
| Track and fill as two alpha levels | Track 100 (558), fill 200 (560), panel 70 (gui_builder 3537) |
| Damage stages for a sprite overlay | Thresholds 0.4 (520) and 0.8 (522) |
| Health from body parts, capped | Cap 20 on both sides (850) |
| Capture meter reuses the bar in a neutral colour | White (554) |

String table fold-in (`data_free/game_config/translations/`): two language files, `english.txt` (4,224 lines) and `polish.txt` (10,282 lines). In `english.txt`: 4,098 entries of the form ID then quoted text, 14 entries with an inline tag word between the ID and the text, and 63 indented alternate forms. Counting lines that end in a tag word gives 66 plural, 3 feminine and 1 neuter (the two counts overlap in a way not resolved here). About 825 lines contain a `{n}` placeholder. Total 4,112 IDs. In `polish.txt`: 3,407 plain entries, 738 with an inline tag, and 5,386 indented alternates carrying case tags (genitive, instrumental, accusative, plural, dative, feminine and others). Total about 4,145 IDs.
Grammar (from `translations.cpp`): a sentence ID maps to a primary text plus alternates, each with tags. `getBestForm` takes the alternate with the most matching tags (first one wins ties) and falls back to the primary text (39-57). Placeholders: `{n}` is parameter n; `{NAME}` is a nested sentence ID; a `:` after a placeholder selects a tag-based form (108-135). English-only fallbacks, used only when no alternate matched: a plural rule (`makePlural`, 14-28) and an article rule that uses a vowel list (`addAParticle`, 30-37). Known weaknesses in those fallbacks are in section 6.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (visibility, geometry, fill, colour) and the body-part fraction. It drops the furniture crack sprites, the capture bar's use of the same track (it is a flag in the sketch's `barVisible` only), the outline and shadow pixels, the transparency levels (the renderer's meaning is not read), and the panel. It fixes two donor defects: the fill's right edge is now `left + length x health` (the donor uses 0.9 x health), and the body-part fraction returns healthy when there are no parts instead of 0 / 0.

```ts
// clean-room: written from the described mechanism (hide-at-full overhead bar, two-clamp
// colour ramp, proportional fill, capture bar reusing the same bar, body-part health fallback).
// Donor licence GPL-2.0-or-later; no line is translated.

interface Rgb { r: number; g: number; b: number; }
interface Rect { x0: number; y0: number; x1: number; y1: number; }
interface Tile { x: number; y: number; w: number; h: number; }

// Layout as ratios of the tile (donor values, kept as data).
const LAYOUT = {
  left: 0.1,       // track starts at 10% of tile width (donor: (1 - barLength) / 2)
  length: 0.8,     // track width as a share of tile width (donor: barLength)
  raise: 0.2,      // bar sits 20% of tile height above the tile (donor: size.y * 0.2)
  thickness: 0.12, // bar thickness as a share of tile height (donor: barWidth)
};

// Two linear clamps: red at 0, yellow at 0.5, green at 1. Spirit damage swaps green and blue.
export function healthColour(health: number, spirit: boolean): Rgb {
  const h = Math.min(1, Math.max(0, health));
  const red = Math.min(1, 2 - h * 2);
  const green = Math.min(1, h * 2);
  let rgb: Rgb = { r: Math.round(255 * red), g: Math.round(255 * green), b: 0 };
  if (spirit) rgb = { r: rgb.r, g: Math.min(255, rgb.b + 100), b: rgb.g };
  return rgb;
}

// Hide-at-full: the bar is drawn when it carries damage; a capture bar is always drawn.
export function barVisible(health: number, hasBarFlag: boolean, capture: boolean): boolean {
  if (capture) return true;
  if (!hasBarFlag) return false;
  return health !== 1;
}

// Track and fill. fix: the fill ends at left + length x health. The donor ends it at
// 0.9 x health from the tile edge, which is short below full and inverted below about 0.11.
export function barRects(tile: Tile, health: number): { track: Rect; fill: Rect | null } {
  const left = tile.x + tile.w * LAYOUT.left;
  const right = left + tile.w * LAYOUT.length;
  const top = tile.y - tile.h * LAYOUT.raise;
  const bottom = top + tile.h * LAYOUT.thickness;
  const track: Rect = { x0: left, y0: top, x1: right, y1: bottom };
  const h = Math.min(1, Math.max(0, health));
  const fill: Rect | null = h > 0
    ? { x0: left, y0: top, x1: left + tile.w * LAYOUT.length * h, y1: bottom }
    : null;
  return { track, fill };
}

interface PartState { injured: number; lost: number; present: number; }

// Health from body parts when the body has no health pool. Both sides are capped at 20 (donor).
export function bodyPartHealth(parts: PartState[], cap: number = 20): number {
  let gone = 0;
  let total = 0;
  for (const p of parts) {
    gone += p.injured + p.lost;
    total += p.present + p.lost;
  }
  const denom = Math.min(cap, total);
  if (denom === 0) return 1;                // fix: donor divides 0 / 0 when there are no parts (policy: healthy)
  return 1 - Math.min(cap, gone) / denom;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 keeperrl-health-bar.ts` on the VPS (/tmp), exit 0.

## 5. Lands in

- TARGET `src/fight/hud.ts` (health frame: visibility, colour ramp, fill geometry, body-part health reading). Client-only view code consumes it; the value comes from the engine state.
- Parity-checklist row 14 (HUD).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room, shape only).

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism and is not a translation.
- Defect 1, fixed in the sketch: the fill's right edge is `pos.x + size.x * state * 0.9` (552), with the left edge at 0.1 (551). The correct edge is left + 0.8 x state. Effect: at half health the fill covers 0.35 of the tile where it should cover 0.40 (43.75% of the track instead of 50%); at a quarter it covers 0.125 instead of 0.20; below about 0.111 health the right edge is left of the left edge, so the fill is drawn inverted or not at all (renderer not read). fix: right = left + length x health.
- Defect 2, fixed in the sketch: `getBodyPartHealth` divides by `min(20, total)`, which is 0 when a body has no parts (850). Not checked whether such bodies exist in the content. fix: return healthy when the denominator is 0. This is a policy choice; confirm it.
- Ambiguity, kept as donor behaviour: the cap is applied to both `gone` and `total`. For a body with more than 20 parts, health reads as 1 - min(20, gone) / 20, not 1 - gone / total. That may be the intended "20 parts is the full scale" rule, or a flaw. Confirm intent before porting; the sketch exposes the cap as a parameter.
- Frankendom ruling "one ledger": the donor's view object holds a copy of the engine value. Our bar must be drawn from the server-verified HP and never written back; the client must not own the number.
- Frankendom ruling "MAX_ATTACKERS = 3": the donor draws a bar on every damaged body in view, with no cap or priority (drawn per object in `drawObjectAbs`). For a many-on-one fight we should draw bars only for the target and the up-to-three attackers, and check that the screen stays readable at 375 wide.
- The donor is a 2D tile game: the bar is placed in tile units. A third-person 3D version needs a screen-space projection of the enemy's head point (not in this donor).
- The crack sprite stages (518-541) are a 2D sprite effect; this note rejects them for the 3D world (a damage decal would be a separate note).
- String table fold-in, weaknesses as read (not run, not in the sketch): the English plural fallback `makePlural` maps any word ending in y to "ies", including vowel-y words (17-18: a word like "key" would become "kies"), and returns s-ending words unchanged (23-24). `addAParticle` picks "an" for any word starting with a, e, u, i or o (33-34), so "unicorn" would get "an". The plural fallback runs only when no tagged form matched (54-55). The article helper runs only for the A_ARTICLE sentence in English (100-102).
- Not read: `window_view.cpp` bodies (the window host), `minimap_gui.cpp` (listed as a minimap file, not read), `chooseTarget` in `window_view.cpp` (listed at 704, not read; it is a tile-targeting dialogue, possibly relevant to lock-on later), and the rest of `translations.cpp` (136 onward).

Best transferable idea: draw an overhead health bar only while the value is below full, colour it by two linear clamps (red to yellow to green), and reuse the same bar as the neutral capture meter.

Decision (proposed): adapt — keep the hide-at-full rule, the two-clamp colour ramp and the capture-meter reuse with the fill fix; reject the 2D tile offsets and crack sprite stages, since a third-person 3D world needs a screen-space bar.
Acceptance: On a 375-wide phone, an engaged enemy shows no bar at full health; at half health the fill is half the track (a test asserts the width ratio 0.5 within 1 px); the colour is red at 0, yellow at half and green at full; and at most three enemy bars are drawn at once.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room, shape only)

Brief rule served: parity row 14 (HUD, client-only); section 6 rulings (one ledger, MAX_ATTACKERS = 3).
