# ihhub-fheroes2 (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/battle/battle_troop.cpp` (CalculateDamageUnit 517-588, GetDamage 590-612, HowManyWillBeKilled 614-621, _applyDamage 623-675, ApplyDamage 762-790), `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/battle/battle_action.cpp` (attack path 196-206, TargetsApplyDamage 856-866, GetTargetsForDamage 869-951), `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/monster/monster.cpp` (GetCountFromHitPoints 840-851), `/mnt/frankendom-donors/ihhub-fheroes2/src/engine/rand.cpp` (GetWithGen 112-119) | Licence: GPL-2.0-or-later (per the header of battle_troop.cpp, lines 10-11: "either version 2 of the License, or" and "any later version"; the LICENSE file is the GPL v2 text) | C++ | symbol `Battle::Unit::GetDamage`

Checked: Read `CalculateDamageUnit` 517-588 and `GetDamage` 590-612 in full; `HowManyWillBeKilled` and `_applyDamage` 614-675 read to the hit-point update (the mirror-image branch after 667 not read); `ApplyDamage` 762-790 read (the resurrect side effects, SOUL_EATER and HP_DRAIN, read but not described); `SetRandomLuck` 316-328 read; `GetTargetsForDamage` 869-951 read in full; `TargetsApplyDamage` 856-866 read; attack path 196-206 read as far as the damage call; `GetCountFromHitPoints` 840-851 read; `Rand::GetWithGen` 112-119 read (it calls uniformIntDistribution, which was not read, so inclusivity is taken from the name). Callers of `GetDamage`: read 881, 916, 930, 945 (battle_action.cpp); the tower call at 1215 was grep only. Callers of `ApplyDamage`: read 864; the tower call at 1221 was grep only. `_applyDamage`: read caller 764; the spell caller at 1277 was grep only. `GetAttack` (958) and `GetDefense` (969) were not read, so any modifiers inside them are unknown. The archery skill value, the shield spell value, the blind spell value, `IsShootingPenalty` and `GetLuck` were not read. Confidence: high on the damage pipeline and the kill count; medium on the attack-to-defence inputs. The donor is GPL-2.0-or-later: clean-room, shape only.

## 1. Mechanism

- Order of one attack (battle_action.cpp 196-206): the attacker rolls its luck first (`attacker.SetRandomLuck`, line 196). Then the targets are gathered and each target's damage is rolled (GetTargetsForDamage, 869-951). Then the damage is applied to each target (TargetsApplyDamage, 856-866).
- Luck: one roll from 1 to 24 (`Rand::GetWithGen( 1, 24, randomGenerator )`, battle_troop.cpp 319). If luck is positive and the roll is at or below it, the unit gets LUCK_GOOD; if luck is negative and the roll is at or below its absolute value, it gets LUCK_BAD (321-326). The luck value comes from `GetLuck()` (not read).
- Per-target damage (GetTargetsForDamage): the first target takes `attacker.GetDamage( defender )` (881). A genie-style halving ability (ENEMY_HALVING, 889-893) can replace the damage with `ceil(count/2) x unit hit points` when that is larger than the roll and a 1-100 roll is at or below the ability percentage; it replaces the damage, it does not add to it, and it is capped at the defender's total hit points. Extra targets each get their own `GetDamage` roll: a double-cell attack takes the cell in the attack direction (910-919); an all-adjacent attack takes every enemy of another colour in the neighbouring cells (922-934); an area shot (the lich cloud) takes enemies around the target cell when the attacker is not hand-fighting (937-950).
- GetDamage (590-612): BLESS uses the maximum; CURSE uses the minimum; otherwise a uniform integer roll between `CalculateMinDamage` and `CalculateMaxDamage` (601). Then LUCK_GOOD doubles the result and LUCK_BAD halves it (604-609). The result is never below 1 (611).
- CalculateDamageUnit (517-588) builds each end of the roll (the minimum with the troop's minimum damage, the maximum with its maximum; battle_troop.cpp 494-502). Steps in the order the code runs: (a) if the attacker is an archer and is not hand-fighting: the commander's archery skill adds a percentage (read in the body), and a target behind castle walls takes `dmg *= 1 - 50/100` (534); the shield spell divides by its extra value (read in the body). If the archer is hand-fighting and lacks NO_MELEE_PENALTY, damage is halved (542-543). (b) A blinded attacker's retaliation is reduced by the blind percentage (555). (c) A petrified target takes half (563). (d) Doubling applies once if any undead or elemental weakness matches (566-577). (e) Attack factor (579-585): `r = GetAttack() - enemy.GetDefense()`; the factor is `1 + 0.1 x min(r, 20)` for positive r and `1 + 0.05 x max(r, -16)` otherwise. (f) Truncate and floor at 1 (end of the function).
- Application (ApplyDamage 762 calls _applyDamage 764): `HowManyWillBeKilled` (614-621) is computed from the hit points before they change. If `dmg >= _hitPoints`, every unit in the stack dies; otherwise the killed count is `count - GetCountFromHitPoints( hp - dmg )` (620). GetCountFromHitPoints rounds up: `quotient + 1` when there is a remainder (monster.cpp 847-850). Then, if all units die, `_deadCount` takes the count and the count goes to 0 (652-655); otherwise `_deadCount` takes the killed count and the count drops by it (658-660). Finally the stack's total hit points drop by `min(hp, dmg)` (667). A killed count of 0 returns early (ApplyDamage 765-768).
- Worked example (derived from the code, not in the donor): count 10, 20 hit points per unit, stack total 200, damage 45. Remaining 155; survivors `ceil(155/20) = 8`; killed 2; the stack keeps 155 hit points, so the top unit stays wounded.

## 2. Key functions

- `Battle::Unit::GetDamage`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/battle/battle_troop.cpp` 590-612. Roll between min and max, bless/curse, luck, floor 1.
- `Battle::Unit::CalculateDamageUnit`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/battle/battle_troop.cpp` 517-588. Ranged/melee penalty, blind, petrified, doubling, attack factor.
- `Battle::Unit::HowManyWillBeKilled` and `_applyDamage`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/battle/battle_troop.cpp` 614-675. Kill count from remaining hit points, then count and hit point update.
- `Battle::Unit::ApplyDamage`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/battle/battle_troop.cpp` 762-790. Calls `_applyDamage`; resurrect side effects after it.
- `Battle::Unit::SetRandomLuck`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/battle/battle_troop.cpp` 316-328. The d24 luck roll.
- `Battle::Arena::GetTargetsForDamage`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/battle/battle_action.cpp` 869-951. First target, ENEMY_HALVING, extra targets.
- `Monster::GetCountFromHitPoints`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/monster/monster.cpp` 840-851. Rounds survivors up.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Attack-to-defence ratio, clamped at both ends | +10% per point, capped at 20 points (max x3.0); -5% per point, floored at -16 points (min x0.2) (battle_troop.cpp 585) |
| Roll uniformly between a min and a max, with bless and curse picking an end | Min and max come from the troop table (battle_troop.cpp 494-502). Inclusive by name (rand.cpp 118, not read further) |
| Luck as a d24 roll: at or below the luck value sets the mode | d24 (battle_troop.cpp 319); good luck x2 and bad luck /2 (604-609) |
| Units killed = count minus ceil(remaining hit points / hit points per unit) | Hit points per unit from the monster table (not read) (monster.cpp 847-850) |
| Hit points are a stack pool, not per unit | Stack hit points subtract `min(hp, dmg)` (battle_troop.cpp 667) |
| Ranged penalty at castle walls | 50 percent (game_static.cpp 278-280; the value line `return 50;` is 10 characters, so the receipt is the signature line 278; the value is read at 280) |
| Melee penalty for archers | Half (battle_troop.cpp 543) |
| Petrified target takes half | Half (563) |
| Floor of 1 damage | 1 (611, and the end of CalculateDamageUnit) |

## 4. TypeScript sketch

simplified: keeps the donor order for the damage roll (both ends doubled and multiplied by the attack factor, then the roll or the bless and curse pick, then luck, then floor 1) and the stack kill count with its hit-point update. It omits: the ranged, archery, wall, shield and melee-penalty branch; the blind reduction; the petrified halving; the spell and retaliation paths; ENEMY_HALVING; the double-cell, all-adjacent and area-shot extra targets; the resurrect side effects (SOUL_EATER, HP_DRAIN); mirror image; paralysis and blind removal; the dead-stack early return; and the donor's checkedCast rounding (the sketch uses Math.trunc). The donor applies the doubling after the melee penalty and before the attack factor, which the sketch keeps; the omitted steps come before doubling in the donor.

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Stack { count: number; hp: number; perUnitHp: number; attack: number; defense: number; }
interface Attack { baseMin: number; baseMax: number; doubled: boolean; bless: boolean; curse: boolean; luck: number; }

// Attack bonus: +10% per point of (attack - defense), capped at 20 points; -5% per point, floored at -16 points.
function attackFactor(attack: number, defense: number): number {
  const r = attack - defense;
  return 1 + (r > 0 ? 0.1 * Math.min(r, 20) : 0.05 * Math.max(r, -16));
}

// One end of the roll: doubling first, then the attack factor, truncated, never below 1.
function damageEnd(base: number, a: Stack, d: Stack, doubled: boolean): number {
  let dmg = doubled ? base * 2 : base;
  dmg *= attackFactor(a.attack, d.defense);
  return Math.max(Math.trunc(dmg), 1);
}

// Uniform integer roll between the two ends (inclusive), then luck: good doubles, bad halves; never below 1.
function rollDamage(a: Stack, d: Stack, atk: Attack, rng: () => number): number {
  const min = damageEnd(atk.baseMin, a, d, atk.doubled);
  const max = damageEnd(atk.baseMax, a, d, atk.doubled);
  let res = atk.bless ? max : atk.curse ? min : min + Math.floor(rng() * (max - min + 1));
  if (atk.luck > 0) res *= 2;
  else if (atk.luck < 0) res = Math.floor(res / 2);
  return Math.max(res, 1);
}

// Stack damage: units killed = count minus the survivors that the remaining hit points can still cover (rounded up).
function applyStackDamage(s: Stack, dmg: number): number {
  const killed = dmg >= s.hp ? s.count : s.count - Math.ceil((s.hp - dmg) / s.perUnitHp);
  s.count -= killed;
  s.hp -= Math.min(s.hp, dmg);
  return killed;
}
```

## 5. Lands in

- TARGET `src/fight/damage.ts` (the one place health changes): the attack-to-defence roll and the stack kill count, if a zone uses stacks. Parity-checklist row 1 (duel step / sim).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room, shape only)
- Brief rule served: 1 (one combat core, two clients); licence: clean-room, shape only

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- Frankendom duels are one character against one character. The stack model (a hit-point pool split into a count of units, with survivors rounded up) only transfers to a zone where one pool drives several bodies. Do not port it to duels.
- The donor's luck roll is a per-attack d24 read inside the attack. In Frankendom every roll must come from a server-held seed, so both clients see the same result. The donor's client RNG is not acceptable for us.
- The attack-to-defence factor can reach 3.0x: one hit can end a duel. Frankendom must keep the caps as data (zone or catalogue) and test the worst case.
- ENEMY_HALVING replaces the damage with a count-based number. It is a spell-like effect and fits row 13 (specials), not the duel step. Do not adopt it in duels.
- The multi-target branches (double-cell, all-adjacent, area) map to many-on-one. The donor has no cap; Frankendom's MAX_ATTACKERS = 3 must be written in and tested, and the cap has no counterpart in this donor.
- The donor's step order (doubling before the factor, luck after the roll) changes the result, so the one engine must pin the order with a test.
- The rounding-up survivor rule leaves a wounded top unit alive; it is a visual rule for a unit count, not a health bar.

Best transferable idea: a single attack-to-defence ratio, clamped at both ends (0.2x to 3.0x in this donor), applied to a per-weapon min-max roll, gives a readable hit formula with a few numeric knobs per weapon.
Decision (proposed): adapt - take the clamped ratio and the min-max roll for duel hits, with the luck d24 replaced by a server-seeded roll and the caps as catalogue data; skip the stack kill model unless Frankendom adds unit groups in a zone.
Acceptance: A server test with attack 15 against defence 10 gives factor 1.5 and a hit inside [min x 1.5, max x 1.5]; attack 40 against defence 0 gives factor 3.0; attack 0 against defence 40 gives factor 0.2 and never less than 1 damage; the test reads the same seed on both clients.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room, shape only)
Brief rule served: 1 (one combat core, two clients)
