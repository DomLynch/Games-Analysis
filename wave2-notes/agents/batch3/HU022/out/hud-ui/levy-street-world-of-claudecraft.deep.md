# levy-street-world-of-claudecraft (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/ui/absorb_bar.ts` (with `unit_frame.ts`, `unit_frame_painter.ts`, `target_frame_descriptor.ts`, `low_health.ts`, `hud.ts` 8548-8580) | Licence: MIT (LICENSE line 1: "MIT License", Copyright (c) 2026 Levy Street; code may be adapted) | TypeScript (DOM HUD over a pure sim) | symbol `absorbBarView` / `absorbSegmentTransform` (shield segment), `lowHealthVignette` (low-health edge)

Checked: `absorb_bar.ts` read in full (105 lines); `unit_frame.ts` read in full (374 lines); `target_frame_descriptor.ts` read in full (109 lines); `low_health.ts` read in full (36 lines); `unit_frame_painter.ts` only `paintAbsorb` (225-262) and its import (line 30); `hud.ts` 8548-8580 (the vignette write; the HUD's repaint cadence gate was not read); `i18n.ts` 458-500 and `i18n_interpolation.ts` read in full (string-table fold-in). Callers: `absorbSegmentTransform` (absorb_bar) is called from `unit_frame_painter.ts` 243 only (grep over src/ui); `lowHealthVignette` is called from `hud.ts` 8557 only (grep over src); `absorbBarView` callers were not grepped beyond `unit_frame.ts` 246 and 343. Input-queue fold-in: `sim/types.ts` 168-174 and `sim/combat/casting_lifecycle.ts` 808-830 and 1128-1172 read; the body of `fireQueuedCast` from 830 on was not read. Not read: `minimap_painter.ts` (1,878 lines), `minimap_zoom.ts`, `touch_tap.ts`, `touch_peek.ts`, `touch_frame_drag.ts`, `tab_target.ts` (lock-on; names only from grep), the tests folder. The list's hint file, `absorb_bar.ts`, is the real implementation of the shield segment. Confidence: high on the shield segment and the vignette curve (numbers and order read); medium on whether the painter clamps hp over max anywhere (not read). camera_scope: not applicable (HUD cell).

## 1. Mechanism

- The shield is a SEGMENT laid over the health bar, not a second bar. Its inputs are the current hp, the max hp, and the list of absorb auras. Each absorb aura's `value` is the damage it will still soak (absorb_bar.ts 1-9 header; the sim decrements it in `dealDamage`, per the header comment).
- Order of steps in `absorbBarViewInto` (absorb_bar.ts 55-70): (a) `max = max(1, maxHp)` so a zero max cannot divide by zero (56); (b) `hp = max(0, hp)` (57); (c) `hpFrac = clamp01(hp / max)` (58); (d) `total = max(0, input.total ?? absorbTotal(auras))` (59): a pre-summed total is used when present (party snapshots carry only the total); `absorbTotal` adds `max(0, a.value)` for each aura of kind 'absorb' (34); (e) `fillFrac = clamp01((hp + total) / max)` (60); (f) `sizeFrac = total > 0 ? clamp01(total / max) : 0` (61); (g) `overshield = total > 0 && hp + total >= max` (62); (h) `startFrac = overshield ? clamp01(1 - sizeFrac) : hpFrac` (63).
- So: with no shield, the segment has size 0 and nothing is drawn. With a shield below the rest of the bar, the segment runs from the hp edge to hp + shield. With a shield that covers the rest of the bar (hp + shield >= max), the segment is right-aligned to the bar's end and the `overshield` class is set, so it overlaps the last part of the health fill.
- The CSS transform (`absorbSegmentTransform`, absorb_bar.ts 82-92): the translate is `startFrac * 100`, rounded to 3 decimals (98), so the same frame always gives the same string and the painter's write-elision cache stays stable. The scale is `sizeFrac`, or 0 with no shield. The transform always has two functions, even when empty (87-89), so the CSS transition never flips shape.
- The painter (unit_frame_painter.ts 238-246) writes that transform only when the frame has a shield element, and toggles `OVERSHIELD_CLASS` each paint.
- Low-health vignette (low_health.ts 25-36): below 35% hp (`LOW_HEALTH_THRESHOLD` 0.35, line 9), `t` rises from 0 at the threshold to 1 at zero hp (32). Opacity is `t ** 0.8 * 0.92` (33). Pulse rate is `0.6 + (2.0 - 0.6) * t` Hz (34, with 13-14). The HUD writes opacity and the pulse period as CSS variables each frame (hud.ts 8557-8565), and toggles the `active` class.
- Target frame descriptor (target_frame_descriptor.ts 64-109): fills the unit descriptor for a target, `hpFrac = hp / max(1, maxHp)` (71, not clamped), and gives a dead target no shield (`d.absorb = target.dead ? null : target`, 104). The unit frame core then calls `absorbBarView` (unit_frame.ts 246) and appends the shield total to the hp text only for player and target frames (`showAbsorbText`).

## 2. Key functions

- `absorbBarViewInto`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/ui/absorb_bar.ts` 55-70 (the full derivation, allocation-free).
- `absorbTotal`: the same file, 32-36.
- `absorbSegmentTransform` (the one the painter uses): the same file, 82-92.
- `lowHealthVignette`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/ui/low_health.ts` 25-36.
- The vignette write: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/ui/hud.ts` 8554-8565 (`updateLowHealthVignette`).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Shield size as a fraction of max | `total / max` (absorb_bar.ts 61) |
| Segment starts at the hp edge; right-aligned when it covers the rest | `overshield ? 1 - sizeFrac : hpFrac` (63) |
| Zero max cannot divide | `Math.max(1, maxHp)` (56) |
| Translate rounding for the write-elision key | 3 decimals (98) |
| Vignette threshold | 0.35 of max hp (low_health.ts 9) |
| Vignette peak opacity | 0.92 (low_health.ts 11) |
| Vignette opacity easing | power 0.8 on the depth t (33) |
| Pulse rate | 0.6 Hz at the threshold, 2.0 Hz at zero hp (13-14, 34) |

## 4. TypeScript sketch

simplified: the sketch takes a plain array of absorb values instead of aura objects, and returns geometry and a transform string, not DOM writes. It omits the title, Cheater tag, border, raid-marker and portrait fields of the unit descriptor, the shield text suffix, the per-frame buffer that avoids allocation, and the write-elision cache itself. It keeps the donor's order (clamp, total, size, overshield, start) and the 3-decimal translate. It removes the duplicate `absorbSegmentTransform` in unit_frame.ts 235-238 (the unrounded copy, Section 6), leaving one function. The vignette keeps the donor's curve and branch order.

```ts
// Licence: MIT (donor LICENSE: "MIT License", Copyright (c) 2026 Levy Street). Shape adapted; written clean here.
// clean-room
export interface ShieldInput { hp: number; maxHp: number; absorbs: number[]; }

export interface ShieldSegment {
  startFrac: number;   // 0..1 left edge of the shield segment
  sizeFrac: number;    // 0..1 width of the shield segment (0 = no shield)
  overshield: boolean; // hp + shield reaches max: segment is right-aligned
}

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

// One pure function: the frame paints a segment, never a second copy of the shield.
export function shieldSegment(input: ShieldInput): ShieldSegment {
  const max = Math.max(1, input.maxHp);
  const hp = Math.max(0, input.hp);
  let total = 0;
  for (const a of input.absorbs) total += Math.max(0, a);
  const hpFrac = clamp01(hp / max);
  const sizeFrac = total > 0 ? clamp01(total / max) : 0;
  const overshield = total > 0 && hp + total >= max;
  const startFrac = overshield ? clamp01(1 - sizeFrac) : hpFrac;
  return { startFrac, sizeFrac, overshield };
}

// CSS transform: the translate is rounded to 3 decimals so the same frame gives the
// same string (write-elision key). Two-function shape even when empty, so no transform flip.
export function shieldTransform(seg: ShieldSegment, scaleX: (f: number) => string = (f) => `scaleX(${f})`): string {
  const size = seg.sizeFrac > 0 ? seg.sizeFrac : 0;
  const pct = Number((seg.startFrac * 100).toFixed(3));
  return `translateX(${pct}%) ${scaleX(size)}`;
}

// Low-health edge vignette: active below 35% hp; opacity eases up as hp falls; pulse speeds up.
export const LOW_HEALTH_THRESHOLD = 0.35;
const MAX_OPACITY = 0.92;
const PULSE_HZ_MIN = 0.6;
const PULSE_HZ_MAX = 2.0;

export interface Vignette { active: boolean; opacity: number; pulseSeconds: number; }

export function lowHealthVignette(hp: number, maxHp: number): Vignette {
  const off: Vignette = { active: false, opacity: 0, pulseSeconds: 0 };
  if (maxHp <= 0 || hp <= 0) return off;
  const frac = hp / maxHp;
  if (frac >= LOW_HEALTH_THRESHOLD) return off;
  const t = clamp01((LOW_HEALTH_THRESHOLD - frac) / LOW_HEALTH_THRESHOLD); // 0 at threshold, 1 at 0 hp
  const pulseHz = PULSE_HZ_MIN + (PULSE_HZ_MAX - PULSE_HZ_MIN) * t;
  return { active: true, opacity: t ** 0.8 * MAX_OPACITY, pulseSeconds: 1 / pulseHz };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file /tmp/HU022-levy-healthframe.ts): passed, no output.

## 5. Lands in

- TARGET `src/fight/health-frame.ts` (the same client view module as the pokemon and l1j cells; the frame reads the engine's hp and shield, never writes them). Parity-checklist row 14 (HUD).
- today: not checked in this pass (Frankendom's current frame code was not read; the target is taken from the rulings and the parity row).
- Reuse tag: adapt-shape (MIT; code may be adapted, and this sketch is written clean)
- Brief rule served: 1 (client view of engine values); rule 8 (named target file and parity row 14)

## 6. Gaps and risks

- Ledger: the donor sums the shield auras in the view code (absorb_bar.ts 32-36, 59). For Frankendom the sum must come from the engine, and the frame must only read it. A second shield counter in the UI would break the one-ledger ruling.
- MAX_ATTACKERS = 3: three attackers can each add a shield. The donor shows the sum as one segment, which is the right shape for a small frame. Do not draw one segment per source on a 375 px frame.
- Defect 1 (duplicate, not used by the painter): `unit_frame.ts` 235-238 exports a second `absorbSegmentTransform` with no 3-decimal rounding (237 writes `startFrac * 100` raw). The painter imports the absorb_bar version (unit_frame_painter.ts 30). Fix: delete the duplicate, or re-export one function. The sketch has one.
- Defect 2 (possible): `target_frame_descriptor.ts` 71 passes `hp / max(1, maxHp)` unclamped to the frame. `absorb_bar` clamps its own fractions only. If the painter does not clamp the health fill (not read), an hp above max would push the bar past its frame. Fix: clamp at the descriptor, once.
- Defect 3 (history, already fixed): the old left-anchored overlay hatched the whole health fill even with no shield (unit_frame_painter.ts 237, comment). The segment shape is the fix. Keep a unit test for "no shield, no hatch" (the sketch's `sizeFrac` 0 case).
- Accessibility: the vignette is a DOM overlay that pulses from 0.6 to 2.0 Hz (1.67 s to 0.5 s period). No reduced-motion check appears in the lines read (hud.ts 8554-8565). Fix: a reduced-motion path that holds the opacity and drops the pulse; not read in the repo.
- Pit as client: the vignette and the hatch are DOM only and have no engine effect. This matches the rulings.
- Fold-in (input buffer, not this cell's topic; read in part): `CAST_QUEUE_WINDOW_SEC = 0.4` (sim/types.ts 173). A press in the last 0.4 s of a cast queues one ability (single slot, last press wins) and fires on completion (casting_lifecycle.ts 1139 and 1160). Non-spell casts are exempt (1139 and its comment). The body of `fireQueuedCast` was not read beyond line 830. This is a candidate for the combat/input topic.
- Fold-in (lock-on): `sim/tab_target.ts` exists (name only; not read). Not described here.
- Fold-in (minimap and world map, touch): `minimap_painter.ts` (1,878 lines), `minimap_zoom.ts` (53), `touch_tap.ts` (194), `touch_peek.ts` (118) exist; none was read. Not described here.
- String table (read in part): `src/ui/i18n.resolved.generated/en.ts` is generated ("Generated by scripts/i18n_build.mjs. Do not edit by hand.", line 1). It has 24,471 lines; a grep on quoted keys finds 15,919 string leaves and 4,269 nested object openers (counted with grep, not a parser). There are 21 locale TS files in `i18n.locales/` (cs, da, de, en_CA, es_ES, es, fr_CA, fr_FR, id, it, ja, ko, nl, pl, pt_BR, ru, sv, tr, vi, zh_CN, zh_TW; each a separate file, the largest about 2.5 MB), plus `en_XA` in the resolved set (pseudo-locale; `i18n_pseudo_port.ts` not read). Grammar: `{name}` slots only, letters, digits and underscore (`SLOT_RE` in i18n_interpolation.ts 47); an unset slot keeps its literal token and values are never re-scanned (header comment 14-16). Plurals use CLDR keys `.one`, `.few`, `.many`, `.other`, chosen with Intl.PluralRules, falling back to `.other` (i18n.ts 458-481). Quoted nothing.

Best transferable idea: a health frame draws any shield as a segment from the hp edge (right-aligned when it covers the rest of the bar), and a low-health edge pulse eases in below 35% hp and speeds up as hp falls, both as pure functions of the engine's hp and shield.
Decision (proposed): adapt — take the segment shape and the pure function for any engine-owned shield, and the vignette curve as a low-health warning; fix the duplicate helper and clamp the hp fraction once at the descriptor; reject a per-source shield display, since one segment is enough for three attackers.
Acceptance: at 375 px a hero at 60/100 with a 10 shield shows a hatch from 60% to 70% of the bar; the same hero with a 40 shield shows a hatch from 60% to 100% with the overshield class; with no shield there is no hatch; at 20/100 a red screen edge shows at about 0.47 opacity and pulses about once every 0.83 s.

Reuse tag: adapt-shape (MIT; code may be adapted, and this sketch is written clean)
Brief rule served: 1 (client view of engine values); rule 8 (named target file and parity row 14)
