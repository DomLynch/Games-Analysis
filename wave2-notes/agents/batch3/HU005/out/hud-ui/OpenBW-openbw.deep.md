# OpenBW-openbw (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/OpenBW-openbw/ui/ui.h` (draw_health_bars 1029-1202, draw_sprite 1203-1217) with `bwgame.h` (unit_hp_percent 1203-1207, max_visible_hp 821-826, default_remove_timer 3728-3731) | Licence: unclear (no LICENSE file in the OpenBW tree at its root, ui/ or deps/; no licence header found by grep in the files read; clean-room only) | C++ | symbol `draw_health_bars`

Checked: `draw_health_bars` read in full (ui.h 1029-1202); `draw_sprite` read in full (1203-1217); the only caller of `draw_health_bars` in ui/ and bwgame.h is `draw_sprite` (grep, line 1215); `draw_sprite` is called from the sprite loop in `draw_sprites` (line 1252). Read: unit_hp_percent, max_visible_hp, default_remove_timer, the remove-timer decrement (bwgame.h 1240, inside update_unit_values which starts at 1209; read 1234-1244 only, not the whole function), the data loaders for health_bar_size and has_shield/shield_points (data_loading.h 1463-1464, 1676). Confidence: high on the arithmetic and gating (read line by line). Medium on the visual result: nothing was run, so the 1-px end-of-bar behaviour in section 6 is from reading the code, not from a screenshot. Not read: the palette loader details beyond the assignment at ui.h 179, the selection-circle drawing, and the body of update_unit_values beyond line 1244. camera_scope: not a camera cell (n/a).

## 1. Mechanism

- Trigger: a health bar is drawn only for a unit that is in the local selection. `draw_sprite` looks up the selected unit for each sprite (1204), keeps it as the bar unit (1205), draws the unit's images, then draws the bar only if the unit is not invincible (1214-1215). Every other sprite gets no bar.
- Order of steps inside `draw_health_bars` (as the code runs): (a) width = the sprite type's `health_bar_size` (1041), snapped down to the form 3k+1 (1042), then raised to at least 19 (1043); (b) height = 5 rows, +2 with a shield, +6 with energy (1045-1047); (c) the bar is placed above the selection circle (1036, 1049-1052), and returns at once if it is fully off screen (1057-1058); (d) hp percent = ceil(hp) x 100 / max visible hp (bwgame.h 1204-1206), then fill width = `filled_width(hp percent)` (1070-1071); (e) shield fill from shield points over max shield (1075-1076); energy fill (1080-1084); (f) the rows are painted: hp rows in a colour band chosen from the hp percent (1130: 66 and up, 33 and up, below 33), then the shield rows above the hp rows, then the energy row below, then a separator every 3 px across the width (separator loop 1182-1199, read, not quoted).
- filled_width (1060-1068): `r = percent x width / 100`; minimum 3 px; then r is moved to the nearest multiple of 3 (a remainder of 2 rounds up, a remainder of 1 rounds down).
- Energy row has two meanings. Units with energy (casters) show current energy over max energy (1082). Timed units (hallucination, broodling) show their remaining life, but see the defect in section 6 (1083).
- Off-screen: the bar is clipped by the offset_x and offset_y block (starts at 1102, read) so a bar half off the screen is still drawn in the visible part.
- Tick: this is a per-frame draw, not a simulation step. The only simulation effect it reads is the hp, shield and energy values, and the remove timer counts down inside the per-unit update (bwgame.h 1240). The draw happens after `draw_tiles` and `draw_sprites` (ui.h 1947-1950).

## 2. Key functions

- `draw_health_bars`: `/mnt/frankendom-donors/OpenBW-openbw/ui/ui.h` 1029-1202. Sizes the bar from sprite data, computes three fills (hp, shield, energy), paints rows and separators.
- `draw_sprite`: `/mnt/frankendom-donors/OpenBW-openbw/ui/ui.h` 1203-1217. The selected-only gate and the invincible gate.
- `unit_hp_percent`: `/mnt/frankendom-donors/OpenBW-openbw/bwgame.h` 1203-1207. ceil(hp) over max visible hp, times 100, integer division.
- `max_visible_hp`: `/mnt/frankendom-donors/OpenBW-openbw/bwgame.h` 821-826. Type hitpoints; if that is 0, falls back to current hp; if still 0, 1.
- `default_remove_timer`: `/mnt/frankendom-donors/OpenBW-openbw/bwgame.h` 3728-3731. 1350 for hallucination, 1800 for broodling, else 0.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Bar width snapped to a fixed notch grid, with a floor | Notch 3 px (ui.h 1042, 1064-1065); floor 19 px (ui.h 1043) |
| Fill is percent x width, floored at a minimum so 1% is still visible | Minimum fill 3 px (ui.h 1062) |
| Colour band chosen by percent | Bands at 66 and 33 (ui.h 1130) |
| Rows stacked: shield on top, hp middle, energy below | Row heights 5, +2 shield, +6 energy (ui.h 1045-1047) |
| Remaining-life strip for timed units | Hallucination 1350 ticks (bwgame.h 3729); broodling 1800 ticks (bwgame.h 3730) |
| Hit points shown as ceil so a living unit never reads empty | ceil on hp (bwgame.h 1205) |
| Bar size from data, not code | `health_bar_size` per sprite type (data_loading.h 1676) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (size, notch snap, hp percent, shield and energy fills, band, selected and invincible gates) but returns numbers, not pixels. It omits the palette indices, the separator loop, off-screen clipping, the selection circle offset and the shield and energy row palettes. It applies one fix: the energy percent for timed units is computed as remaining x 100 / total (the donor divides first, see section 6).

```ts
// Licence: unclear (OpenBW tree has no licence file; no licence header read). Clean-room sketch from the described mechanism.
// clean-room
type Energy =
  | { kind: "mana"; cur: number; max: number }            // energy the unit spends; donor divides cur*100/max
  | { kind: "timed"; left: number; total: number };       // remaining life (hallucination, broodling)

interface BarInput {
  healthBarSizePx: number;   // sprite data: health_bar_size (sprites.dat)
  hp: number;                // current hp (donor rounds up before the percent)
  maxHp: number;             // max visible hp (donor: unit type hitpoints, minimum 1)
  shield?: { cur: number; max: number };
  energy?: Energy;
  invincible: boolean;
  selected: boolean;
}

type Band = "high" | "mid" | "low";

interface BarModel {
  widthPx: number;
  height: number;            // rows: 5, +2 with shield, +6 with energy
  hpPx: number;
  band: Band;
  shieldPx: number;
  energyPx: number;
}

const MIN_WIDTH = 19;
const SNAP = 3;
const MIN_FILL = 3;

// Largest 3k+1 not above the sprite size, at least 19 px.
function barWidth(sizePx: number): number {
  const w = sizePx - ((sizePx - 1) % 3);
  return Math.max(w, MIN_WIDTH);
}

// Fill in px: proportional, at least 3, snapped to the 3-px notch grid (remainder 2 rounds up, 1 rounds down).
function fillPx(percent: number, width: number): number {
  const r = Math.floor((percent * width) / 100);
  if (r < MIN_FILL) return MIN_FILL;
  const m = r % SNAP;
  if (m === 0) return r;
  return m > 1 ? r + (SNAP - m) : r - m;
}

function hpBand(hpPct: number): Band {
  return hpPct >= 66 ? "high" : hpPct >= 33 ? "mid" : "low";
}

function energyPercent(e: Energy): number {
  if (e.kind === "mana") return Math.floor((e.cur * 100) / Math.max(e.max, 1));
  // Fix: the donor (ui.h:1083) divides remove_timer by the default before multiplying by 100, so it is 0 except at full.
  return Math.floor((e.left * 100) / Math.max(e.total, 1));
}

// Returns null when no bar is drawn: unit not selected, or invincible.
function barModel(i: BarInput): BarModel | null {
  if (i.invincible || !i.selected) return null;
  const widthPx = barWidth(i.healthBarSizePx);
  const hpPct = Math.floor((Math.ceil(i.hp) * 100) / Math.max(i.maxHp, 1));
  const shieldPx = i.shield ? fillPx(Math.floor((i.shield.cur * 100) / Math.max(i.shield.max, 1)), widthPx) : 0;
  const energyPx = i.energy ? fillPx(energyPercent(i.energy), widthPx) : 0;
  const height = 5 + (i.shield ? 2 : 0) + (i.energy ? 6 : 0);
  return {
    widthPx,
    height,
    hpPx: fillPx(hpPct, widthPx),
    band: hpBand(hpPct),
    shieldPx,
    energyPx,
  };
}

export {};
```

## 5. Lands in

- TARGET `src/fight/targetFrame.ts` (new pure model, no DOM, no drawing): the bar numbers for the locked target. The drawing stays in the client HUD, since the HUD is client-only. Parity-checklist row 14 (HUD).
- Reuse tag: rewrite-from-idea (licence unclear, so clean-room only; no code is copied)
- Brief rule served: 1 (one engine: the model is pure and fed by engine state; the bar is client drawing only); rules 7-9 n/a

## 6. Gaps and risks

- DEFECT, timed-unit strip (ui.h 1083): `energy_percent = (int)u->remove_timer / std::max(...)` divides before the x100, and both sides are ints, so the result is 0 for every timer below its default and 1 at the default. The strip therefore sits at the 3-px minimum (1062) for the whole life of a hallucination or broodling. Idea kept: a remaining-life strip. Fix: `remaining x 100 / default`, as in the sketch.
- DEFECT, full bar (ui.h 1042, 1064-1065): a sprite of size 3k+1 is snapped to width 3k+1. At 100% the fill is width 3k+1 rounded down by 1 to 3k, so the last pixel is not filled and shows the separator or background colour (read, not seen on screen). Fix: map 100% to the full width before snapping.
- DEFECT, max hp fallback (bwgame.h 822-825): when the unit type has 0 hitpoints, max visible hp falls back to the unit's current hp, so the bar reads 100% for that unit. Fix: use the catalogue max hp and reject a 0 max at load time (catalogue field, Frankendom rule 21).
- Selected-only gate: the donor shows bars only for selected units. In Frankendom the equivalent set is the locked target plus the attackers on the hero (MAX_ATTACKERS = 3, so at most 4 bars per frame). This is a proposal, not something the donor does.
- Invincible gate: the donor hides bars for invincible units (1214). Frankendom's equivalent is a guard or stagger state that must not show a fake "full" bar; the model returns null for it.
- Readability: the donor bar is about 19 px at its base size (1043). At 375 px wide that is about 5% of the screen width, so Frankendom needs its own minimum in CSS px and must test it at 375 wide (visual-pr-stills rule). The donor size is in screen pixels; the scale is not read.
- The 3-px notch grid is a retro pixel-art ruler. Frankendom can keep it as a fixed segment count, but the segment size is a design choice, not something to copy.
- Not transferred: the palette-index colour system and the shield and energy row palettes; they belong to the donor's art.

Best transferable idea: Show a hit-point bar only on the unit the player has selected or locked, snap its fill to a fixed 3-px notch grid so it reads as segments, and reuse the same strip for a remaining-life bar on timed summons (after fixing the divide-before-multiply defect).

Decision (proposed): adapt — the target-frame rules (bar only on the locked target, none when invincible, bands at 66 and 33, shield row above hp, remaining-life strip for timed units) are useful, but Frankendom needs one frame for lock-on and for the hate target in many-on-one fights, and the donor's per-selection rule does not give that. The numbers come from a pure model in `src/fight/targetFrame.ts`, and the defects above are fixed in it.

Acceptance: On a 375 px phone in a three-on-one fight the locked enemy shows one bar above its head; its fill steps in 3-px notches, turns to the mid band under 66% and the low band under 33%; a summoned timed unit shows a bottom strip that reaches zero at expiry; an invincible target shows no bar. Server test: `energyPercent({kind:"timed", left:675, total:1350})` returns 50, and `barModel` returns null for an invincible unit.

Reuse tag: rewrite-from-idea (licence unclear; clean-room only)
Brief rule served: 1 (one engine: the model is pure; the drawing is client-only)

Also seen, not the note's subject (receipts in receipts.tsv): the minimap (ui.h 1314-1393) draws one screen pixel per map tile and returns without drawing when the area is not that size (1344); player units are hidden unless their sprite has visibility flags (1315), and turrets, traps and two spells are excluded; each dot is sized from the unit footprint with a floor of 2 px and a building cap of 4 px (per the draw loop, read), and draws the viewport rectangle; a click on the minimap centres the view (1717) and the view is clamped to the map at the end of the update (1941-1944). Selection (ui.h 1757): a double-click or Ctrl-click selects every unit of the same type and owner inside the screen rectangle (the find_units call, read).
