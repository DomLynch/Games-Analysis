# 0ad-0ad (hud-ui, cell 16)

Donor: /mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/gui/session/selection_details.js | Licence: GPL-2.0-or-later (LICENSE.txt: binaries/data is GPL v2 or later; no per-file header in selection_details.js) | JavaScript | symbol displaySingle / updateGarrisonHealthBar

## 1. Mechanism

- Runs in the GUI layer, not the simulation. `updateSelectionDetails()` (`selection_details.js` 499-542) gathers the entity states of the current selection, then calls `displaySingle` for one entity or `displayMultiple` for several. It returns early with all panels hidden when no selected entity has a state. After the single/multiple call it also fills the commands panel (`updateUnitCommands`, not read). Its callers are not read.
- Input: the entity state record (`hitpoints`, `maxHitpoints`, and optional garrison and capture fields) for each selected entity, read through `GetEntityState`.
- Single unit: the health bar width is `100 * clamp(hitpoints / maxHitpoints, 0, 1)` written to the bar's right edge (`rright`). The text reads `ceil(hitpoints) / ceil(maxHitpoints)`.
- Multiple units: hitpoints and max hitpoints are summed over the selected entities that have hitpoints, then the bar is `100 - 100 * clamp(sum / max, 0, 1)` written to the top edge (`rtop`), so the bar fills from the bottom.
- Garrison bar: when the garrison panel is open, `updateGarrisonHealthBar` sums hitpoints across the garrison of each selected holder, with the same clamp and top-edge fill.
- Output: GUI object sizes, captions and tooltips. The single-unit health section is hidden when `hitpoints` is falsy (so 0 hp hides it); the group and garrison bars are hidden when the summed hitpoints are zero or less. No state is written back to the simulation.

## 2. Key functions

- `displaySingle`, `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/gui/session/selection_details.js`, lines 52-368 (health block at 133-149). One entity's panel, including the health bar.
- `displayMultiple`, same file, lines 371-496 (summed health at 373-430). Several entities: sum, then one bar.
- `updateSelectionDetails`, same file, lines 499-542. Entry point: collect states, pick single or multiple, show garrison bar.
- `updateGarrisonHealthBar`, same file, lines 14-49. Sum over the garrison of each selected holder.
- `getCurrentHealthTooltip`, called at lines 44 and 426; its definition is not read.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Health fraction = current / max, clamped to 0..1, drawn as a bar width | 0 to 1 clamp (generic); bar drawn as 100 percent units (theirs, as the GUI size units) |
| Group bar = sum of current over sum of max | Only entities with hitpoints count (theirs) |
| Bar fills from the bottom for a summed group, from the left for one unit | Anchor edge choice `rtop` vs `rright` (theirs) |
| Hide the bar when there is nothing to show | Hide when sum is 0 (theirs) |

## 4. TypeScript sketch

simplified: the donor hides the group bar only when summed hitpoints are zero or less, and a zero or missing summed max is not guarded (zero max draws a full bar, missing max gives NaN); the sketch also hides on max <= 0, in both the group and the single-unit function (the donor's single bar shows full when hitpoints is positive and max is 0). The single-unit text caption (ceil of both values) and section layout are omitted. The garrison variant (sums over holders, `|| 0` on both fields) and the tooltip call are omitted.

```ts
// Licence: GPL-2.0-or-later (donor) - clean-room sketch, no lines translated
// Clean-room: a health bar fraction for one unit and for a selected group, clamped and hidden when empty.
type Hp = { hitpoints?: number; maxHitpoints?: number };

// Fraction of health for one unit, 0..1. Returns null when there is no health to show.
function singleFraction(e: Hp): number | null {
  if (!e.hitpoints) return null;
  const max = e.maxHitpoints ?? 0;
  if (max <= 0) return null; // donor does not guard this case; see gaps
  return Math.max(0, Math.min(1, e.hitpoints / max));
}

// Group fraction: sum current and max over members that have hitpoints.
function groupFraction(members: Hp[]): number | null {
  let sum = 0;
  let max = 0;
  for (const m of members) {
    if (!m.hitpoints) continue;
    sum += m.hitpoints;
    max += m.maxHitpoints ?? 0;
  }
  if (sum <= 0 || max <= 0) return null;
  return Math.max(0, Math.min(1, sum / max));
}

// Bar geometry: a fill from the left for one unit, from the bottom for a group.
function barPercent(fraction: number | null, fromBottom: boolean): { hidden: boolean; fill: number } {
  if (fraction === null) return { hidden: true, fill: 0 };
  return fromBottom ? { hidden: false, fill: 100 - 100 * fraction } : { hidden: false, fill: 100 * fraction };
}
```

## 5. Lands in

- Frankendom target: `src/fight/hud.ts` (health bar fraction and numbers), parity checklist row 14 (HUD). The fight state it reads belongs in `src/fight/`; the HUD only reads it.
- Today: `src/hud.ts` (moving). Not re-checked on disk.
- Reuse tag: rewrite-from-idea (GPL-2, clean-room sketch only).
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- The bar reads the entity state the GUI gets from the simulation. Frankendom's HUD must read `src/fight` state, not compute health itself.
- No guard for `maxHitpoints` of zero in `displaySingle` (`hitpoints / 0` is Infinity, which the clamp turns into a full bar) or of a missing max (NaN passes through the clamp). Frankendom needs the zero case.
- `displayMultiple` skips entities with falsy hitpoints from both sums, so a dead unit does not lower the group ratio; a living unit with no `maxHitpoints` makes the max NaN. Frankendom's group bar (if any) must decide whether the dead count.
- The group bar is 100 minus fill, so the fill direction is the reverse of the single bar. Both must be checked in one place for Frankendom's parity.
- Garrison bar is only drawn when the garrison panel is open. A zone-level HUD would need its own gate.
- Entirely client-side display. Frankendom: kills stay server-verified, so the HUD bar must never be the source of a kill or hp value.
