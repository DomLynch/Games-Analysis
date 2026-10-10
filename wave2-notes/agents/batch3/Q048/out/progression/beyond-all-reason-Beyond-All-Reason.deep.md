# beyond-all-reason-Beyond-All-Reason (progression, cell 10)

Donor: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luarules/gadgets/unit_xp_range_bonus.lua` | Licence: WTFPL for this file (its GetInfo); the repo LICENSE.md says BAR game code is GPL v2 and individual files may differ | Lua | symbol `gadget:UnitExperience`

Checked: Read in full: `unit_xp_range_bonus.lua` (38 lines) and `include/unit_attributes.lua` (81 lines, attribute definitions only). Read in part: `include/unit_attributes_control.lua` (1653 lines): header 1-17, experience setter 675-692, `record`/`resolveSet`/`applyMult` 806-866, `composeValue` 867-890, modifier setters 1339-1369, `applyOnExperience` 1458-1475, `updateAll` start 1496-1530. Read in part: `api_unit_attributes.lua` 47-49 and 60-81; `unit_juno_damage.lua` 100-128. Candidates opened (more than three): the files above, `unit_inherit_creation_xp.lua` (name only; not read), `game_zombies.lua` (grep only). Not read: the rest of `unit_attributes_control.lua` (weapon vectors, moveType writes, pool and compaction, pruning, the end of `updateAll`) and the engine's experience formula. Confidence: high on the XP-to-range curve and the replace-by-source rule; medium on the full stack edge cases. camera_scope: n/a.

Best transferable idea: a veterancy bonus that follows 3x / (1 + 3x) toward a per-unit cap, written under one named source so a repeat replaces the bonus instead of stacking it.
Decision (proposed): adapt - take the saturating curve and the replace-by-source rule for hero mastery, with the cap and the curve constant as catalogue data and XP written only from the server ledger; reject the engine XP callin and the juno kill-XP grant (XP only from server-verified kills).
Acceptance: a server test asserts a hero at the XP where the curve reads one half gets exactly half the catalogue cap as reach bonus, and a second grant from the same source name replaces the first rather than stacking.

## 1. Mechanism

- Trigger: the engine calls `gadget:UnitExperience` when a unit's experience moves by a step. The step is set by `Spring.SetExperienceGrade(0.01)` (xp_range_bonus.lua 28), and the donor's comment says this is the step size for that callin. The file has no loop of its own; the cadence is the engine's (not read).
- Order of steps in `gadget:UnitExperience` (32-37):
  (a) look up the unit def's `rangexpscale` (read once at load, 23-25); if there is none, return (only units with that customParam are affected; the donor has one such def, armmav, 0.6, `units/ArmBots/T2/armmav.lua` 37);
  (b) `limitXP = (3x / (1 + 3x)) x scale`, where x is the unit's experience (35);
  (c) `setUnitWeaponModifier(unitID, 1, "maxWeaponRange", 1 + limitXP, "xp_range_bonus")` (36): a multiply factor on weapon 1's range, under this source name.
- Curve shape (arithmetic on the donor formula): at x = 0 the bonus is 0; at x = 1/3 it is half the scale; as x grows it approaches the scale and never reaches it. With the donor's 0.6, the multiplier is 1.3 at x = 1/3 and tends to 1.6.
- Replace rule: the same source writes again on the next step. `record` overwrites that source's factor (unit_attributes_control.lua 812-841; a repeated identical multiply reports unchanged, 835). A source clears its factor by passing nil.
- Apply: the write marks the attribute dirty. It is applied in `updateAll`, which `gadget:GameFrame` calls once per game frame (api_unit_attributes.lua 48-49; header 15-17 says a write lands on the following GameFrame). Composition (`composeValue` 867-890): a set from the narrowest scope wins (unit, then team, then unitdef), else the baseline; then every multiply factor from unitdef, team and unit is multiplied in (886-890).
- XP side effect: `gadget:UnitExperience` in api_unit_attributes.lua (69) also calls `applyOnExperience`, which clears the applied `maxHealth` so it is re-derived (1467-1471). The comment at 1470 says the engine's `CUnit::AddExperience` recomputes `maxHealth`.
- XP source read (one of several): when a unit with a juno weapon kills a unit, the attacker gains `0.1 x 0.3 x (victim power / attacker power) x victim health fraction` (unit_juno_damage.lua 108, 121-123). The health fraction is the victim's remaining health (122), not damage dealt, despite the variable name `scaledDamage`. The other XP sources (engine damage, creation inheritance, zombies) were not read.

## 2. Key functions

- `gadget:UnitExperience` (range curve): `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luarules/gadgets/unit_xp_range_bonus.lua` 32-37.
- Curve line: same file, 35. Load-time cap: 21-25.
- `recordUnitWeaponAttribute` and `setUnitWeaponModifier`: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luarules/gadgets/include/unit_attributes_control.lua` 1153-1181 (read in part), 1359-1360.
- `record`, `resolveSet`, `applyMult`: same file 812-866 (read in full for these three).
- `composeValue`: same file 867-890.
- `applyOnExperience`: same file 1467-1471.
- `updateAll`: same file 1496 (start only); driven from `api_unit_attributes.lua` 47-49.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Saturating bonus `cap x kx / (1 + kx)`: fast early gain, bounded late gain | k = 3 (theirs, xp_range_bonus.lua 35); cap per unit from `rangexpscale` (theirs, 24; armmav 0.6 in armmav.lua 37) |
| Same-source write replaces, never stacks | None (record, unit_attributes_control.lua 835) |
| Multiply factors from several sources multiply together; set picks one by scope | Multiply only for range here; set precedence by scope (composeValue 879-886) |
| Experience written in grade steps of 0.01 | Step 0.01 (theirs, xp_range_bonus.lua 28) |
| XP from a kill scales with the power ratio of the two units and the victim's remaining health | Base 0.1 and mod 0.3 (theirs, unit_juno_damage.lua 108, 121) |

## 4. TypeScript sketch

simplified: keeps the donor's curve, the grade step, the one-source replace rule and the multiply stack. It omits the set-with-scope precedence and sequence tiebreak, the dirty flag and the next-GameFrame flush (the sketch applies at once), per-weapon vectors, the `maxHealth` refresh after XP, the juno kill-XP grant, and the engine experience formula (the sketch takes XP as an input). `composeMultiplier` is defined but not called in `onExperience`, to show the stack shape. The typecheck passed on the VPS (`tsc --strict`, es2020); the file was removed from the VPS /tmp afterwards.

```ts
// clean-room: shape of the rule only, written from the described mechanism, not a translation.
// Saturating experience bonus: rises quickly at first, approaches a per-unit cap, never reaches it.
const CURVE_K = 3;      // donor constant in 3x / (1 + 3x)
const XP_GRADE = 0.01;  // donor sets the engine experience step to 0.01

function xpBonus(xp: number, cap: number): number {
  const k = CURVE_K * xp;
  return cap * (k / (1 + k));
}

// Named-source multiply stack: each source owns one factor; passing null clears that source only.
type Factors = Map<string, number>;

function setSourceMultiplier(factors: Factors, source: string, mult: number | null): void {
  if (mult === null) factors.delete(source);
  else factors.set(source, mult);
}

function composeMultiplier(factors: Factors): number {
  let m = 1;
  for (const v of factors.values()) m *= v;
  return m;
}

interface Hero {
  xp: number;
  cap: number;           // per-unit cap (donor: customParams.rangexpscale)
  rangeFactors: Factors; // range multipliers, keyed by source name
}

// Each experience step re-derives the bonus from the total, under one source name.
// Repeat calls replace the source's factor rather than stacking another one.
function onExperience(hero: Hero, newXp: number): void {
  hero.xp = Math.floor(newXp / XP_GRADE) * XP_GRADE;
  setSourceMultiplier(hero.rangeFactors, "xp_range_bonus", 1 + xpBonus(hero.xp, hero.cap));
}

export {};
```

## 5. Lands in

- TARGET `src/fight/mastery-curve.ts` (new): the catalogue cap and the curve constant feed one function that the duel step reads for reach. The XP itself is written by the server ledger after a verified kill.
- Parity-checklist row 18 (loot roll and XP award); the curve is what the award feeds, so the duel step (row 1) only reads the result.
- Reuse tag: rewrite-from-idea (licence mixed, see Donor line; treated as copyleft: clean-room only)
- Brief rule served: 1 (one engine; the bonus is computed on the server, not the client); rules 7-9 n/a

## 6. Gaps and risks

- Licence: the curve file is WTFPL, the stack file has no licence line and falls under the repo's GPL v2, and the juno file is GPL v2 or later. The sketch is clean-room in any case.
- Only one unit def in this donor sets `rangexpscale` (armmav, 0.6). The curve is real and per-unit, but this donor does not show a tuned set of values.
- The sidecar's `where` field has only "zone data" or "engine constant". The cap is per catalogue unit, so it is closest to zone data; the designer should treat it as catalogue data.
- Frankendom must define its own experience. The donor's curve reads the engine's experience number, and the step (0.01) is an engine cadence, so neither can be ported as is.
- Server-verified kills: the juno XP grant fires from a damage callin on the kill, with no check beyond the gadget. Frankendom must grant XP only from a verified kill (row 18).
- Timing: a bonus written this frame is applied on the next GameFrame (header 15-17, api_unit_attributes.lua 48-49). A duel step that reads reach in the same frame sees the old value. Frankendom's duel step should compute the bonus inline or read after the flush.
- Not read: the rest of `unit_attributes_control.lua` (1653 lines), the engine's experience formula, and the other XP sources. `UnitDefs[...].power` (used by juno) is not read.

Reuse tag: rewrite-from-idea (licence mixed; clean-room only)
Brief rule served: 1 (one engine; server-computed bonus); rules 7-9 n/a
