# afritz1-OpenTESArena (combat-sim, cell 2)

Donor: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Combat/ArenaCombatUtils.cpp` | Licence: MIT (`/mnt/frankendom-donors/afritz1-OpenTESArena/LICENSE.txt`: "The MIT License (MIT)", Copyright (c) 2016-2026 The OpenTESArena Developers; code may be adapted) | C++ | symbol `ArenaCombatUtils::isMeleeHitSuccessful`, with `CombatLogic::onEntityHitByPlayer` and `CombatLogic::onPlayerHitByEntity`

Checked: The hint was `INFERRED`, so I searched for the topic words (damage, hit, combat). The real implementation is `src/Combat/ArenaCombatUtils.cpp` (the hit roll) and `src/Combat/CombatLogic.cpp` (the damage and health step, both directions). Read in full: `ArenaCombatUtils.cpp` (1-31), `CombatLogic.cpp` 305-505 (player on enemy) and 507-614 (enemy on player), the header `CombatLogic.h`, the scale helper `ArenaStatUtils.cpp` 11-14, `ArenaRandom` in `Math/Random.cpp` 66-75, the derived bonuses for strength and agility in `Player/ArenaPlayerUtils.cpp` 68-75, 101-113, 127-148, and the monster swing timer in `Entities/EntityChunkManager.cpp` 1560-1700 (the timer and attack gate). Not read: the hit search body (`CombatLogic.cpp` 41-120), the code that queues entity results during physics contact, `ArenaEntityUtils::paralysisOrDiseaseOnHit`, `getHumanEnemyExperience`, the race and class ID names (race IDs 1, 3, 5; class IDs 9, 12), and the item weapon data. Confidence: high for the hit roll, the damage terms and the order of operations of both hit paths; medium for the swing timing (read as far as the attack gate and the timer, not the animation files). Callers of the hit roll: `CombatLogic.cpp` 412 (player) and 537 (monster). Callers of the apply step: `GameState.cpp` 1837 (player hits, from `tickCombatResults`) and `EntityChunkManager.cpp` 1675 (monster hits).

Best transferable idea: Make a melee hit one roll against a 0-255 chance: a 50 percent base, plus about 12.8 points per level the attacker is above the defender, plus the to-hit minus defence bonus, never below a floor that grows with the attacker's level.

Decision (proposed): adapt - take the shape (one roll on a fixed scale, level gap term, a level-based floor, the same roll for both directions) into `src/fight/hit.ts`, with Frankendom's own base, floor and bonus values as engine data; reject the racial bonus and the defender class 9 or 12 rule (no race or class model in the duel) and do not copy the variable-step swing timer.

Acceptance: A server test runs 10,000 seeded swings per pair: an attacker 5 levels above the defender hits 192 of 256 (75 percent) within 2 percent, equal levels hit about 50 percent, and a level-1 attacker against a large defence bonus still hits at the floor of 53 of 256.

## 1. Mechanism

- Hit roll, melee (`ArenaCombatUtils.cpp` 8-30): `chance1 = 128 + scale(5 x (attackerLevel - defenderLevel)) + (luckAtk - luckDef) + racialBonus + (hitAtk - defenceDef) - armourValue` (21). `scale(v)` is `(v x 256) / 100` in integer arithmetic (13). The racial bonus adds `scale(attackerLevel)` when the attacker race ID is 1, 3 or 5 (13-17). The armour term is `0` with a todo (19-20). Luck is passed as zero by both callers (todos at `CombatLogic.cpp` 397, 527, 535).
- Class bonus (23-27): if the defender's class ID is 9 or 12, `chance1` is replaced by `(chance1 x 8 / 256) x (defenderLevel + 1)`. Class names for those IDs were not read.
- Floor (29): `chance2 = scale(attackerLevel) + 51`.
- Outcome (30): hit when `random.next(256) < max(chance1, chance2)`. So the chance is out of 256; a value of 256 or more always hits, and the floor means a hit is never less likely than the level floor.
- Player on enemy (`CombatLogic.cpp` 305-505): the damage is set first. Melee with a weapon: `damageMin + next(damageMax - damageMin + 1)` (332). Melee without a weapon: `(1 + next(2)) + gauntlet armour class` (356). Bow: `3 + next(8)` (363). Spell: `10 + next(40)` (367). The strength bonus is added to melee damage only (359). Then, for an enemy target and a physical impact (bow or melee), the hit roll runs with the player's level, race, to-hit bonus, and the target's combat level, class ID (human enemies only; `-1` otherwise) and defence bonus (zero, todo) (410-413). A spell impact always lands (414-417). If the hit lands: `health = max(health - damage, 0.0)` (422), a hit effect is queued (424-450), and at exactly `0.0` the target is marked dying (453-455). Kill rewards: citizens trigger a guard encounter (458-462); creatures add `baseExp + maxHP x expMultiplier` XP (463-469); human enemies add an XP amount from a function not read (471-479). If the target is still alive after the swing (a miss, or a hit that does not kill), a physical impact plays a clank sound (482-488).
- Lock: a locked target gets a random-boolean bash that may unlock it (490-504). Not a damage path.
- Enemy on player (`CombatLogic.cpp` 507-614): the roll uses the monster's combat level as attacker level, race 0, hit 0, luck 0 (todos at 525-527), the player's level and original class index as defender, the player's `bonusToDefend` as defence (534), and luck 0 (535) (537). A miss returns after a sound (538-541). Damage: a human enemy's weapon `damageMin + next(...)` (565), or fists `1 + next(5)` (569, todo); a creature's `minDamage + next(maxDamage - minDamage + 1)` (577). Creatures can also apply disease or paralysis on hit, with a fixed saving throw of 90 (582-599; the effect function was not read). The immune option zeroes damage (602-605). Player health is `max(health - damage, 0.0)` (609). There is no armour term in the damage.
- Agility feeds both sides: to-hit is `-1` at 45 or lower, `0` at 46, otherwise `(agility - 50) / 5` (103-112); defence is the same value (146). Strength feeds damage: `0` at 43 or lower, otherwise `(strength - 48) / 5` (70-75, added at 130 and 359).
- Two random sources. The hit roll uses `ArenaRandom` (`game.arenaRandom`, 412, 537): state multiplied by 7143469 each draw, output is bits 16-31 (Random.cpp 68-69), `next(n)` is draw mod n (74). Damage uses `game.random` (332, 356, 565, 577), a `std::default_random_engine` seeded from the clock when no seed is given (Random.cpp 23-28).
- Timing and order (player): hits are queued while physics runs and applied after the physics step (`GameState.cpp` 1827-1838; the comment at 1829 says so). The player hit then runs the hit roll, the damage, and the death rules above.
- Timing and order (monster, `EntityChunkManager.cpp`): detection starts within 4.0 units and stops beyond 6.0 (42-45). Melee starts within 1.0 units and stops beyond 1.15 (46-49). When the monster is in melee range and not already swinging, it sets a countdown to a random value of `nextReal() x 0.75` seconds (193-196; the donor comment reads "Arbitrary timing, tbd difficulty settings", 195). The countdown is reduced by `dt` (1656), which is a variable step. When it reaches zero the attack animation starts and `hasAttemptedHit` is cleared (1657-1664). The hit is allowed once per swing, when the animation has progressed to 0.50 or more (1668-1671), and only if the monster is still in range (1673-1675), where it calls `onPlayerHitByEntity`. When the animation finishes it draws a new countdown and returns to waiting (1693-1695), or goes back to moving if the player has left range (1685-1690).

## 2. Key functions

- `ArenaCombatUtils::isMeleeHitSuccessful`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Combat/ArenaCombatUtils.cpp` 8-30. The whole hit roll.
- `CombatLogic::onEntityHitByPlayer`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Combat/CombatLogic.cpp` 305-505. Damage choice, hit roll, health, death and rewards.
- `CombatLogic::onPlayerHitByEntity`: same file 507-614. Hit roll on the player, damage choice, disease and paralysis, health.
- `ArenaStatUtils::scale100To256`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Stats/ArenaStatUtils.cpp` 11-14.
- `ArenaRandom::next`: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Math/Random.cpp` 66-75.
- Monster swing gate: `/mnt/frankendom-donors/afritz1-OpenTESArena/OpenTESArena/src/Entities/EntityChunkManager.cpp` 1642-1696, with the swing gap at 193-196.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One roll against a fixed scale (256), hit if the roll is below the chance | Scale 256 (8 bits); base 128 (`ArenaCombatUtils.cpp` 21) |
| Level gap term: 5 points per level before scaling | `scale(5 x gap)`, i.e. 12.8 per level gap before truncation (12 for gap 1, 25 for gap 2) (21, 13) |
| Floor that grows with the attacker's level | `scale(attackerLevel) + 51` (29) |
| Bonus difference (to-hit minus defence) | Agility-derived values (`ArenaPlayerUtils.cpp` 101-113, 146) |
| Racial bonus (level scaled) | Race IDs 1, 3, 5 (`ArenaCombatUtils.cpp` 13-16) |
| Class bonus that replaces the chance | Class IDs 9 and 12, factor `8/256` and `level + 1` (23-26) |
| Damage = weapon range plus stat bonus | Weapon range from item data; strength bonus `(strength - 48)/5` above 43 (`ArenaPlayerUtils.cpp` 70-75; `CombatLogic.cpp` 359) |
| Death on health reaching exactly zero | Floor at 0.0 (`CombatLogic.cpp` 422, 453) |
| Monster swing gap: random between 0 and 0.75 s | Donor comment: arbitrary, difficulty tbd (`EntityChunkManager.cpp` 195-196) |
| Hit allowed once, at half the swing | `progressPercent >= 0.50` (1668) |
| Detection and melee ranges | 4.0 / 6.0 detection, 1.0 / 1.15 melee (42-49) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for melee: the level-gap chance from a base of 128, the to-hit minus defence term, then the larger of that and the level floor, with the same scale helper and truncation. It omits the luck terms (zero in the donor), the racial bonus, the class 9 or 12 rule, the armour term (zero in the donor), the bow, spell and gauntlet damage, the lock bash, disease and paralysis, the XP and guard rules, the monster swing timer and the animation gate. It keeps the strength bonus on melee damage only, as the donor does. Nothing is reordered.

```ts
// Licence: MIT (donor, adaptable). Adapted shape of the donor's melee hit roll and damage terms; constants are placeholders, not copied values.
export interface Rng {
  // uniform integer in [0, exclusiveMax)
  next(exclusiveMax: number): number;
}

export interface Fighter {
  level: number;
  hitBonus: number;       // from agility, to-hit side
  defenceBonus: number;   // from agility, defence side
}

// Donor scale: value * 256 / 100, truncated toward zero.
const toScale256 = (v: number): number => Math.trunc((v * 256) / 100);

// Chance on a 0..256 scale. Base 128 (50 percent), level gap term, bonus difference,
// then the larger of that and a floor that grows with the attacker's level.
export function meleeHitChance(attacker: Fighter, defender: Fighter): number {
  const gap = attacker.level - defender.level;
  const chance = 128 + toScale256(gap * 5) + (attacker.hitBonus - defender.defenceBonus);
  const floor = toScale256(attacker.level) + 51;
  return Math.max(chance, floor); // 256 or more always hits
}

export function meleeHit(attacker: Fighter, defender: Fighter, rng: Rng): boolean {
  return rng.next(256) < meleeHitChance(attacker, defender);
}

// Agility bonus: -1 at 45 or lower, 0 at 46, otherwise (agility - 50) / 5 truncated.
export function agilityBonus(agility: number): number {
  if (agility <= 45) return -1;
  if (agility <= 46) return 0;
  return Math.trunc((agility - 50) / 5);
}

// Strength damage bonus: 0 at 43 or lower, otherwise (strength - 48) / 5 truncated.
export function strengthDamageBonus(strength: number): number {
  return strength <= 43 ? 0 : Math.trunc((strength - 48) / 5);
}

export function meleeDamage(weaponMin: number, weaponMax: number, strength: number, rng: Rng): number {
  return weaponMin + rng.next(weaponMax - weaponMin + 1) + strengthDamageBonus(strength);
}

export {};
```

## 5. Lands in

- TARGET `src/fight/hit.ts` (new module, engine duel step): `meleeHitChance` and `meleeHit` take the place of a fixed or ad hoc hit rule; the damage term joins the same step. Parity-checklist row 1 (duel step / sim).
- today: not checked. This reader did not open the Frankendom repo.
- Reuse tag: adapt (MIT: code may be adapted; the sketch is an adapted shape, constants are placeholders)
- Brief rule served: 1 (one engine: the swing is one roll, resolved once on the server); rules 7-9 n/a

## 6. Gaps and risks

- Two RNG streams: the hit roll uses `ArenaRandom` and damage uses the clock-seeded `Random` (`CombatLogic.cpp` 412 vs 332; `Random.cpp` 23-28). Frankendom needs one seeded stream per fight for replay (row 19). Do not copy the split.
- The donor's time-based swing gap and animation gate run on variable `dt` (`EntityChunkManager.cpp` 1656). Frankendom's server tick is fixed step (row 18 / post-K item 3 sub-line "server tick: fixed step, input intake, per-tick NPC budget"). The gap must become ticks, not seconds.
- The armour term, luck, and defender defence are todos (zero). The donor's defence is agility only. A Frankendom gear model must add its own term explicitly, not inherit zeros.
- Critical strike: a class has a `criticalHit` flag (`CharacterClassDefinition.h` 29), but no combat code reads it; `CombatLogic.cpp` 572 is a todo. Do not present crit as implemented.
- Spell impacts always land (`CombatLogic.cpp` 414-417). A Frankendom spell rule would need its own roll.
- Hits are queued during physics and applied after the step (`GameState.cpp` 1829). The donor is single-player and has no server verification; Frankendom's kills must be verified on the server, which this donor does not model.
- Donor has no cap on attackers per target in these functions (MAX_ATTACKERS = 3 is not enforced here). Target choice and hate are not in these files, so many-on-one is not covered.
- MIT licence: adapting the code is allowed, but this note keeps to the shape and states its own constants.
- Not read: the hit search body, the code that queues contacts, the disease and paralysis function, the XP function for human enemies, and the class and race ID names.
