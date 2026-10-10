# azerothcore-azerothcore-wotlk (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Entities/Unit/Unit.cpp` | Licence: GPL-2.0-or-later (per the Unit.cpp header: "the Free Software Foundation; either version 2 of the License, or (at your option) any later version"; the repo LICENSE file is GPL v2 text) | C++ | symbols `Unit::RollMeleeOutcomeAgainst`, `Unit::CalculateMeleeDamage`, `Unit::CalcArmorReducedDamage`

Checked: Read in full `Unit::RollMeleeOutcomeAgainst`, both overloads (Unit.cpp 2973-3172), and `Unit::CalculateMeleeDamage` through its outcome switch (1678-1946). Read `Unit::CalcArmorReducedDamage` (2229-2300). Read the call site in `Unit::AttackerStateUpdate` (2827-2843, partly). Read `urand` (common/Utilities/Random.cpp 44-49). Candidate files opened: Unit.cpp (main), Random.cpp, and the list hint `e2e/suites/spells/effects/effects_e2e_test.go` (its header only: an e2e test file, not the implementation; it does not contain the mechanism). Grep hits used for callers: `RollMeleeOutcomeAgainst` is called only from Unit.cpp 1793 (melee) and the wrapper at 2993; `CalcArmorReducedDamage` also from 1529 and 2402 (spell and absorb paths, not read). camera_scope: not applicable (combat cell). Confidence: high for the outcome roll and the armour formula; medium-high for the melee pipeline. Not read: `Unit::DealDamage` body (990-; only its signature and the call at 2084); `CalculateDamage` (weapon base damage); `MeleeDamageBonusDone` and `MeleeDamageBonusTaken`; `DealDamageMods` body (called at 2832); `GetUnitCriticalChance`, `GetUnitDodgeChance`, `GetUnitParryChance`, `GetUnitBlockChance`, `MeleeSpellMissChance` (the wrapper passes their results in); `GetShieldBlockValue` and `isBlockCritical`; the aura functions behind the crit-damage and crit-percent mods (1835-1856 read, the aura lookups not); the melee-spell replacement branch of `AttackerStateUpdate` (2770-2825, partly).

## 1. Mechanism

- Entry: `AttackerStateUpdate` (2760) checks pacified and casting state, may replace the main-hand swing with a melee spell (not read in full), redirects the target, then calls `CalculateMeleeDamage` (2827). Its result goes through `DealDamageMods` (2832), then `DealMeleeDamage` (2843), which calls `DealDamage` once per damage component (2084).
- Step A, damage before the roll (1678-1791). Each damage component is reset (1683-1689). Immune targets return early with no damage (1723-1747). For each component (1749-1791): base damage from `CalculateDamage` (not read), melee bonus done and taken (1768-1771), a script hook (1774), the victim AI hook (1776-1779), then armour reduction (1782-1786) for components whose school armour reduces. So armour is applied before the outcome is known.
- Step B, the roll (1793). `RollMeleeOutcomeAgainst` (2973) turns the attacker's and victim's skill, aura and flag inputs into chance widths in hundredths of a percent (2979-2993), then calls the 7-argument overload (2996), which rolls once.
- The roll (2996-3172), in this order. Each band is tested as `roll < (running sum + width)`. A band with width 0 or less is skipped (`tmp > 0` or `(tmp -= skillBonus) > 0`).
  1. Creature that is evading attacks: EVADE, no roll (2998-3000).
  2. `skillBonus = 4 x (attacker weapon skill - victim max skill for the attacker's level)` (3012; the donor comment says 0.04% per point, 3011).
  3. `roll = urand(0, 10000)` (3014). `urand` is uniform over the inclusive range (Random.cpp 47), so 10001 values.
  4. Miss band, with no skill bonus (3020-3025).
  5. Dodge band (3031-3059). A player victim attacked from behind gets no dodge band (3031-3034). Creatures with the NO_DODGE flag get none (3036). Expertise and aura modifiers lower the chance (3039-3046). A casting or controlled victim has width 0 (3051-3052). Then the band is reduced by `skillBonus` (3055).
  6. Parry band (3066-3092). Nobody parries or blocks an attack from behind (3066-3069). Expertise lowers parry (3073-3076). Casting or controlled gives width 0 (3083-3084). Reduced by `skillBonus` (3087).
  7. Block band (3095-3109). Casting or controlled gives width 0 (3100-3101). Reduced by `skillBonus` (3104).
  8. Glancing band (3113-3131). Only when the attacker is a player or pet, the victim is neither, the attack is not ranged, and the attacker's level is below the victim's (3114-3117). Width = `(10 + (victim defence - min(attacker skill, attacker max))) x 100`, capped at 4000 (3124-3125). No skill bonus.
  9. Crushing band (3134-3156). Only when the attacker's level is at least the victim's + 4, the attacker is not player-controlled, and the creature does not have the NO_CRUSHING flag (3134-3137). The gap = attacker max skill - min(victim defence, victim max). If the gap is 15 or more, width = `gap x 200 - 1500` (3149), that is 2% per point with a 15% base.
  10. Crit band (3158-3168). Width = crit chance. If the attacker is a creature with the NO_CRIT flag, the roll is consumed and the outcome falls through to NORMAL (3164-3171). There is no re-roll.
  11. Otherwise NORMAL (3171).
- Step C, the outcome changes the damage (1800-1946). A sitting victim turns any non-miss into a crit (1795-1799). Evade and miss zero all components (1802-1822). Crit doubles each component (1833), then applies crit-damage aura and crit-percent-vs-creature-type mods through `AddPct` (1835-1856). Parry and dodge move the damage into `cleanDamage` and zero it (1860-1879). Block sets `blocked_amount` to the shield block value, doubled if block is critical (1884-1887), and takes it off each component in turn (1889-1907). Glancing multiplies by `1 - 0.1 x min(levelGap, 3)` (1921-1931). Crushing adds half the damage (1938-1941).
- Armour (2229-2299). `a = 0.1 x armour / (8.5 x L + 40)`, where L is the attacker's level, raised by 4.5 per level above 59 (2288-2291). `f = a / (1 + a)` (2292), clamped to [0, 0.75] (2296). The result is `ceil(damage x (1 - f))` (2299). For a player attacker, armour penetration is subtracted first, capped against the victim's level (2229-2284; read, not summarised line by line).

## 2. Key functions

- `RollMeleeOutcomeAgainst` (7-argument): `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/server/game/Entities/Unit/Unit.cpp` 2996-3172. The single roll and the ordered bands in section 1.
- `RollMeleeOutcomeAgainst` (wrapper): Unit.cpp 2973-2994. Builds the widths from the skill, aura and flag inputs (miss, crit, dodge, parry, block).
- `CalculateMeleeDamage`: Unit.cpp 1678-1946. Armour before the roll (1784), the roll (1793), outcome application (1800-1946).
- `CalcArmorReducedDamage`: Unit.cpp 2229-2300.
- `AttackerStateUpdate`: Unit.cpp 2760-2843 (call sites at 2827 and 2843).
- `urand`: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk/src/common/Utilities/Random.cpp` 44-49.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One roll, sorted into ordered bands by running sum; first band that catches the roll wins | Roll range 0..10000 inclusive (theirs, Unit.cpp 3014; urand at Random.cpp 47); chances in hundredths of a percent (theirs, 2993) |
| A skill gap shifts only the defence bands (dodge, parry, block) | 4 per skill point (theirs, 3012); the donor comment says 0.04% (3011) |
| Defence bands are removed for a victim that is casting or controlled | Width set to 0 (theirs, 3051-3052, 3083-3084, 3100-3101) |
| Glancing: a lower-level attacker hits for less, by a level-gap factor | Width `(10 + defence gap) x 100`, cap 4000 (theirs, 3124-3125); damage x (1 - 0.1 x gap), gap capped at 3 (theirs, 1921-1924) |
| Crushing: a much stronger attacker gets a bonus band, 2% per skill point over 15 | Gap threshold 15 (theirs, 3146-3148); width `gap x 200 - 1500` (theirs, 3149); +50% damage (theirs, 1941) |
| Crit: a band at the end of the table, damage doubled | Width = crit chance (theirs, 3159); x2 (theirs, 1833) |
| Armour: damage reduced by a fraction that rises with armour and falls with level, capped | `a = 0.1 x armour / (8.5 x L + 40)`, `f = a/(1+a)`, cap 0.75 (theirs, 2291-2296); level scaling 4.5 above 59 (theirs, 2288-2289) |
| Block: a fixed amount taken off the hit, doubled when critical | Shield block value (not read); doubled if critical (theirs, 1886-1887) |
| Miss band uses the attacker-victim skill difference | `MeleeSpellMissChance` (not read) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the bands (miss, dodge, parry, block, glancing, crushing, crit, normal), the skill bonus that only lowers dodge, parry and block, the armour formula with its cap, and the per-outcome damage. It omits: the NO_* creature flags, the behind-the-back rules, the casting and control rules (these would set the width to 0 before the call), the expertise and aura modifiers, the crit-damage aura, the block-critical doubling, the sitting-victim crit, the per-component loop and cleanDamage bookkeeping, armour penetration, and the evade and immune returns. It also differs from the donor in one place: the sketch skips a band whose width is 0 or less (donor: the glancing band has no such guard, see section 6). Glancing and crushing widths are inputs here (the donor computes them from the skill gap).

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Outcome = "miss" | "dodge" | "parry" | "block" | "glancing" | "crushing" | "crit" | "normal";

// All widths are in hundredths of a percent (10000 = 100%). roll is drawn from 0..10000 inclusive.
export interface Bands {
  miss: number;
  dodge: number;      // defence band, reduced by the skill bonus
  parry: number;      // defence band, reduced by the skill bonus
  block: number;      // defence band, reduced by the skill bonus
  glancing: number;   // precomputed from the skill gap (donor caps it at 4000)
  crushing: number;   // precomputed from the skill gap (donor: gap >= 15 points, 2% per point over a 15% base)
  crit: number;
}

// One roll sorted into ordered bands: a band is tested only while the running sum is still above the roll.
// The skill bonus (4 per attacker skill point over the victim's skill) lowers dodge, parry and block only.
export function rollOutcome(b: Bands, skillBonus: number, roll: number): Outcome {
  let sum = 0;
  const inBand = (width: number): boolean => {
    if (width <= 0) return false;
    sum += width;
    return roll < sum;
  };
  if (inBand(b.miss)) return "miss";
  if (inBand(b.dodge - skillBonus)) return "dodge";
  if (inBand(b.parry - skillBonus)) return "parry";
  if (inBand(b.block - skillBonus)) return "block";
  if (inBand(b.glancing)) return "glancing";
  if (inBand(b.crushing)) return "crushing";
  if (inBand(b.crit)) return "crit";
  return "normal";
}

// Armour: a fraction f = a / (1 + a), a = 0.1 x armour / (8.5 x L + 40), capped at 0.75. Result is rounded up.
export function armourReduced(damage: number, armour: number, attackerLevel: number): number {
  const armourClamped = Math.max(armour, 0);
  const L = attackerLevel > 59 ? attackerLevel + 4.5 * (attackerLevel - 59) : attackerLevel;
  let f = 0.1 * armourClamped / (8.5 * L + 40);
  f = f / (1 + f);
  f = Math.min(Math.max(f, 0), 0.75);
  return Math.ceil(Math.max(damage * (1 - f), 0));
}

// Damage that an outcome leaves, applied to the already armour-reduced damage.
export function outcomeDamage(o: Outcome, afterArmour: number, blockValue: number, glanceFactor: number): number {
  switch (o) {
    case "miss":
    case "dodge":
    case "parry":
      return 0;
    case "block":
      return Math.max(afterArmour - blockValue, 0);
    case "glancing":
      return Math.trunc(afterArmour * glanceFactor); // glanceFactor = 1 - 0.1 x min(levelGap, 3)
    case "crushing":
      return afterArmour + Math.trunc(afterArmour / 2);
    case "crit":
      return afterArmour * 2;
    default:
      return afterArmour;
  }
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file /tmp/q073/ac-outcome.ts (with `export {}` appended), exit 0.

## 5. Lands in

- TARGET `src/fight/outcome.ts` (new module: one roll per swing, banded outcome, outcome multiplier after armour). Called from the engine duel step, server side. Parity-checklist row 1 (duel step / sim). The guard inputs for parry and block come from row 3 (guard, parry, stamina); the roll itself does not depend on the client.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one combat core: one roll and one outcome for every swing); rules 7-9 n/a

Best transferable idea: Resolve each swing with one server roll sorted into ordered outcome bands (miss, defence, glance, crush, crit, normal), let a skill gap shift only the defence bands, and apply each outcome's multiplier after armour.

Decision (proposed): adapt. Taking one server roll sorted into ordered outcome bands, with skill differences moving only the defence bands and the outcome multiplier applied after armour, is a fast-duel hit resolution the server can own and the client can only display. We drop the WoW-specific parts (behind-the-back rules, sitting victims, NO_* creature flags, aura modifiers, the cleanDamage and absorb bookkeeping), and parry and block take the guard state as input.
Acceptance: a server test sets miss 500, dodge 1000, crit 800, other widths 0, skill bonus 0, and asserts that rolls 0-499 are a miss, 500-1499 a dodge, 1500-2299 a crit, and 2300-9999 normal, and that the armour function returns one fixed value for one fixed (damage, armour, level) input taken from the donor formula, pinned by one test.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not translated. The donor is a WoW server emulator; its numbers are its own rule set and should not be copied as values.
- Band order decides the odds. Each wider band moves every band after it. The donor order (miss, dodge, parry, block, glance, crush, crit) must be written down as data and pinned by a test, or a later edit to one width silently changes all the others.
- Possible negative width in the glancing band: the width `(10 + (victim defence - skill)) x 100` (3124) is added to the running sum (3126) with no `> 0` guard, unlike the other bands. A negative width would move the sum down and shift the crushing and crit bands. Whether this is reachable was not checked; the attacker-level guard (3117) makes it unlikely but this was not proven. The sketch guards it.
- Off-by-one: `urand(0, 10000)` is inclusive, so there are 10001 roll values and the bands are out of 10001, not 10000 (Random.cpp 47). A small bias; Frankendom should use one range and say so.
- NO_CRIT consumes the crit band and returns NORMAL with no re-roll (3164-3171). A "no crit" target therefore gives a normal hit for the crit share, which is a choice Frankendom must make on purpose.
- Script hook: `OnBeforeRollMeleeOutcomeAgainst` (3009) lets scripts change every width per attack. In Frankendom the widths must come from one server-side place (catalogue or zone data) and never from a client.
- Behind-the-back rules (no parry or block from behind, 3066-3069; players cannot dodge from behind, 3031-3034) need a facing concept. Frankendom has no facing in the duel yet; reject until it does.
- Sitting victim forces a crit (1795-1799). No analogue in Frankendom; reject.
- Block amount is the shield's block value (1884), not a function of the roll. Map it to shield data in the catalogue.
- The donor splits damage per component (weapon school, and a second weapon for players). Frankendom has one damage per swing, so only the single-component path transfers.
- Not read: `DealDamage` (the next stage), the base `CalculateDamage`, the aura lookups for crit, and the `MeleeSpellMissChance` miss width. The miss width is therefore not described beyond its inputs.
