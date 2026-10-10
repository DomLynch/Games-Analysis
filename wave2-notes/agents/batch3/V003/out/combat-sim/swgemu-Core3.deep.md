# swgemu-Core3 (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/combat/CombatManager.cpp` (symbols `creoTargetCombatAction` 423, `calculateDamage` 1109, `applyDamage` 1417, `getHitChance` 2072, `hitChanceEquation` 2238, `getArmorReduction` 2442, `getArmorPiercing` 2647), with `CombatManager.h` 73-78 (tuning constants) and 282-288 (`getWeaponDefendResult`) | Licence: AGPL-3.0 (`/mnt/frankendom-donors/swgemu-Core3/COPYING` lines 1-2: "GNU AFFERO GENERAL PUBLIC LICENSE" / "Version 3, 19 November 2007") | C++ | symbol `hitChanceEquation`

Checked: Read end to end the creature-vs-creature pipeline: `creoTargetCombatAction` (423-520), `getHitChance` (2072-2237, all of it), `hitChanceEquation` (2238-2259), `getWeaponRangeModifier` (1844-1883), `calculatePostureModifier` and `calculateTargetPostureModifier` (1884-1948), `getAttackerAccuracyModifier` and `getAttackerAccuracyBonus` (1949-2010), `getDefenderDefenseModifier` and `getDefenderSecondaryDefenseModifier` (2011-2071), `calculateDamage` (1109-1185), `calculateDamageRange` (1261-1307), `applyDamageModifiers` (1308-1369), `calculatePoolsToDamage` (1401-1416), `applyDamage` (1417-1622), `getDefenderToughnessModifier` (2288-2305), `getArmorReduction` (2442-2598), `getArmorObjectReduction` (2332-2366), `getArmorPiercing` (2647-2675), `CombatManager.h` 73-78 and 282-288. Callers checked by grep: `getHitChance` from `creoTargetCombatAction` (447) and `tanoTargetCombatAction` (613); `calculateDamage` from both (440, 609); `hitChanceEquation` also from `PetThrowCommand.h` 163 and `ThrowTrapTask.h` 170 (trap throws use the same ladder with trapping skill and defend roll). `creoTargetCombatAction` is called from `doTargetCombatAction` (371). Not read: `doCombatAction` orchestration (211-340), `doTargetCombatAction` body (341-422), tano variants (521-690), `getSpeedModifier` (2262-2287), NPC and vehicle armour (2368-2441, 2404-2441), force-attack branch (`getFrsModifiedForceAttackDamage` 1370-1400), DoT and weapon DoT (1702-1808), `applyStates` (2975+), attack speed (2829-2845), `CreatureAttackData` fields (other file). Confidence: high on the creature hit and damage order and numbers; medium on the spill-over block (read, but not traced with the donor's inflict calls). `camera_scope`: not applicable.

## 1. Mechanism

- One attack against one creature target runs in `creoTargetCombatAction` (423-520). Order of operations as the code runs:
  1. Damage first: `damage = calculateDamage(...) * damageMultiplier`, where `damageMultiplier` is the attack data's multiplier (440-443). The damage is computed before the hit roll, so a miss still has a damage number (it is passed to `doMiss`).
  2. Hit roll: `hitVal = getHitChance(attacker, defender, weapon, data, damage, accuracyBonus + skill mod)` (447). `getHitChance` (2072-2237) builds accuracy and defense totals, then:
     - Accuracy total = skill accuracy + weapon range accuracy + posture + bonus (2135). Defense total = defense skill + defender posture (2136). For force attacks only the command's accuracy skill mod and the defender's `force_defense` are set; range and posture stay 0.
     - Chance = `hitChanceEquation(accuracy, defense)` (2138). Then `System::random(100) <= toHitChance` means HIT (2140). Otherwise MISS.
     - On a HIT (not force, not state-only): the defender's weapon sets a defend result through `getWeaponDefendResult` (2153, header 282-288): one-hand melee DODGE, two-hand melee COUNTER, polearm BLOCK, pistol DODGE, carbine COUNTER, rifle BLOCK, jedi weapons RICOCHET, anything else a random pick of BLOCK, DODGE or COUNTER.
     - RICOCHET (2155-2165): possible only if the attack is ranged or heavy weapon, and not a turret or grenade. It needs `saber_block` skill > 0 and `random(100) <= saber_block`; if the roll fails the hit stays HIT.
     - BLOCK, COUNTER or DODGE: a second contest, run only if the secondary defense is not 0 (2167-2169; it is 0 while intimidated or berserked, or for a vehicle, 2047-2061). Evade = secondary defense (level, plus defender skill mods, cap 125) + `private_center_of_being` + defender posture. Roll attack 1..500 and defend 1..200 (2170-2171). If `accuracyTotal + attackRoll <= evadeTotal + defendRoll`, the defend result stands; otherwise the hit stays a plain HIT (2176).
  3. Result multiplier: BLOCK halves the damage multiplier to 0.5 (457). COUNTER, DODGE, RICOCHET and MISS set it to 0 (the switch at 450-470; COUNTER also fires an attack back). HIT keeps 1.0.
  4. If the multiplier and the damage are non-zero and the attack is not state-only: pick pools (484), then `applyDamage` (488). Then DoTs, unless the defender died or is incapacitated.
- `hitChanceEquation` (2238-2259), the ladder. With `roll = (accuracy - defense) / 50` and `sign` = sign of roll, the chance starts at 75. For `i = 1..3`: if `roll x sign > i`, add `sign x 25` and subtract `sign x i` from the roll; otherwise add `(roll / i) x 25` and stop. Clamp to 0..100. Hand-checked results: diff 0 gives 75; +50 gives 100; -50 gives 50; -100 gives 37.5.
- `calculateDamage` (1109-1185), creature attacker to creature defender, order:
  1. Base range: for normal weapon attacks, `calculateDamageRange` (1261-1307) gives `max - min` after a mitigation rule (the defender's `melee_damage_mitigation_N` or `ranged_damage_mitigation_N` ability, highest N first, shrinks max to `min + (max - min) x (1 - 0.2 N)`, 1298). A player with an uncertified weapon uses 5..10 (1268-1269). Damage = weapon min + `System::random(diff)` if diff > 0 (1124, 1133-1134).
  2. `applyDamageModifiers` (1308-1369): adds the weapon's damage-mod skills and the melee or ranged bonus, then `private_damage_bonus`; then optional multiplier and divisor skills; then intimidate and stun reductions, each subtracting `preDamage x pct/100`.
  3. Add defender `private_damage_susceptibility` (flat).
  4. Player attacker, non-force: x1.5 (1140-1144). Melee attack: x1.25 (1147-1148). Defender knocked down: x1.5 (1150-1151). Force choke vs prone or kneeling: x1.5 or x1.25 (1152-1156, not in sketch).
  5. Toughness: `getDefenderToughnessModifier` (2288-2305): each defender weapon toughness mod (only if the attack type matches the defender's weapon attack type) takes `pct/100` off; `jedi_toughness` does the same unless the damage type is lightsaber.
  6. Force defense (force attacks only).
  7. PvP (both players, non-force): x0.25 (1174-1175).
  8. Floor of 1 (1177).
- `applyDamage` (1417-1622), per pool, in order: invulnerable defender returns 0 (1425). Health pool: `damage x health multiplier` (attack data), then `getArmorReduction` (per hit location), then food mitigation (`mitigate_damage` skill, capped at 100, 1462-1463), then spill-over out of this pool (`0.0834 x spill pools / damaged pools` fraction, 1452). Then `inflictDamage` for the pool. Action and mind pools repeat with leg and head locations. The spill total is split across the untouched pools; the last one takes the remainder (1577-1579).
- Pool choice (`calculatePoolsToDamage` 1401-1416): if the attack's pool flag is RANDOM, a roll `<= 60` picks HEALTH, `<= 95` ACTION, otherwise MIND.
- `getArmorReduction` (2442-2598), creature defender, in order: armour piercing is applied to the damage before the armour percentage (2578 for the standard armour piece, the PSG piece before it). Then the armour object's percentage: `damage x (1 - pct/100)` (2581), and the absorbed part goes to the armour mitigation tally. The armour piece loses condition `damage x 0.2` (2593). Force armour and force shield (force attacks and feedback) are read but out of scope.
- Armour piercing (`getArmorPiercing` 2647-2675): if piercing > armour rating, multiply by `1.25^(piercing - rating)` (2669-2670). Otherwise multiply by `0.5^(rating - piercing)` (2672). A broken armour piece has rating 0 (2656, `!armorDefender->isBroken()`).
- Timing: all of this runs synchronously when an attack resolves (one call per attack), not per frame. The donor does not show a per-frame tick here; the attack cadence is in the command queue (not read).

## 2. Key functions

- `creoTargetCombatAction`: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/combat/CombatManager.cpp` 423-520. Damage, hit roll, result multiplier, pool choice, apply, DoT.
- `getHitChance`: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/combat/CombatManager.cpp` 2072-2237. Accuracy and defense totals, chance, hit roll, defend result, evade contest.
- `hitChanceEquation`: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/combat/CombatManager.cpp` 2238-2259. The ladder.
- `calculateDamage`: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/combat/CombatManager.cpp` 1109-1185. Base roll, modifiers, multipliers, toughness, floor.
- `applyDamage`: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/combat/CombatManager.cpp` 1417-1622. Per-pool armour, food, spill, inflict.
- `getArmorPiercing`: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/combat/CombatManager.cpp` 2647-2675. Piercing exponent.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Hit chance is a piecewise curve of (accuracy - defense) with a parity base and a clamp | Scale 50 points per roll unit, base 75%, step 25% per ladder step, 3 ladder steps, clamp 0..100 (CombatManager.h 73-78; ladder 2238-2259) |
| Defense is capped before it counts | Cap 125 for primary (2026) and secondary (2062) defense |
| Unskilled attacker accuracy | -15 (1980), with a TODO that says the real value may be -50 or -125 |
| Range band accuracy | Point-blank, ideal and max-range accuracies come from the weapon (1844-1881); beyond max uses max-range accuracy (1859-1860) |
| Second evade contest, two dice | Attack roll 1..500, defend roll 1..200 (2170-2171), compare accuracy + attack vs evade + defend (2176) |
| Block halves, dodge and counter zero | 0.5 (457) for BLOCK; 0 for DODGE, COUNTER, RICOCHET, MISS (switch at 450-470) |
| Damage roll | Weapon min + random(max - min) (1124-1134) |
| Damage multipliers | Player attacker 1.5 (1144), melee 1.25 (1148), knocked down 1.5 (1151), PvP 0.25 (1175), floor 1 (1177) |
| Mitigation by rank | max shrinks by 20% per rank, highest rank wins (1298) |
| Pool choice | 60 / 35 / 5 for health / action / mind (1405-1407) |
| Spill-over fraction | 0.0834 per untouched pool over damaged pools (1452) |
| Armour piercing | Above the rating: 1.25 per point up. Below it: 0.5 per point down (2670, 2672) |
| Armour condition wear | 0.2 of the damage (2593) |
| Food mitigation cap | 100 (1463) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for the parts it covers: hit chance from the ladder, the evade contest after a hit, the damage roll and multiplier chain (player, melee, knocked down, toughness, PvP, floor), and armour piercing before the armour percentage. It omits: the donor's damage-before-hit ordering (the sketch takes the damage as a separate call, so the caller decides the order); the defend-result table and RICOCHET branch; the force-attack branches and force armour or shield; the intimidate and stun reductions and the `private_damage_bonus` skill terms; the pool choice, spill-over and food mitigation (the sketch treats one pool); the DoT, condition wear and the PSG armour piece; the uncertified-player 5..10 range and the mitigation rank; the RNG range (the donor's `System::random` range is not read, so the sketch takes rolls from the caller and assumes `rand(n)` gives 0..n-1). The sketch is clean-room (AGPL-3.0 donor).

```ts
// Licence: AGPL-3.0 (donor). Clean-room sketch of the described mechanism (hit ladder, evade contest, damage multipliers, armour piercing), not a translation.
// clean-room
const TO_HIT_SCALE = 50;     // accuracy-minus-defense points per roll unit (engine constant)
const TO_HIT_BASE = 75;      // % to hit at parity
const TO_HIT_STEP = 25;      // % per ladder step
const TO_HIT_STEP_MAX = TO_HIT_BASE / TO_HIT_STEP; // 3 ladder steps
const TO_HIT_MIN = 0;
const TO_HIT_MAX = 100;
const DEFENSE_CAP = 125;     // defense hard cap (read at the defense modifier)

// Piecewise ladder from the donor: near parity the chance moves 25 per roll unit;
// each further unit (up to 3) costs less, and the result is clamped to 0..100.
export function hitChancePct(accuracy: number, defense: number): number {
  let roll = (accuracy - Math.min(defense, DEFENSE_CAP)) / TO_HIT_SCALE;
  const sign = Math.sign(roll);
  let toHit = TO_HIT_BASE;
  for (let i = 1; i <= TO_HIT_STEP_MAX; i++) {
    if (roll * sign > i) {
      toHit += sign * TO_HIT_STEP;
      roll -= sign * i;
    } else {
      toHit += (roll / i) * TO_HIT_STEP;
      break;
    }
  }
  return Math.min(TO_HIT_MAX, Math.max(TO_HIT_MIN, toHit));
}

// Hit if the roll (0..100 from the caller's RNG) is at or below the chance.
export function isHit(accuracy: number, defense: number, roll0to100: number): boolean {
  return roll0to100 <= hitChancePct(accuracy, defense);
}

// Second contest, only after a hit: the defender's evade total against the attacker's accuracy
// plus a 1..500 attack roll, versus the evade total plus a 1..200 defend roll.
export function evadeWins(accuracy: number, evadeTotal: number, attackRoll1to500: number, defendRoll1to200: number): boolean {
  return accuracy + attackRoll1to500 <= evadeTotal + defendRoll1to200;
}

// Damage: base roll, then the donor's multiplier chain, then the 1-point floor.
export function damageRoll(min: number, max: number, rand: (n: number) => number): number {
  const range = Math.max(0, Math.floor(max - min));   // assumption: rand(n) returns 0..n-1
  return min + (range > 0 ? rand(range) : 0);
}

export function damageAfterMultipliers(
  base: number,
  attackerIsPlayer: boolean,
  isMelee: boolean,
  targetKnockedDown: boolean,
  bothPlayers: boolean,
  toughnessPct: number,
): number {
  let d = base;
  if (attackerIsPlayer) d *= 1.5;
  if (isMelee) d *= 1.25;
  if (targetKnockedDown) d *= 1.5;
  d *= 1 - toughnessPct / 100;
  if (bothPlayers) d *= 0.25;
  return Math.max(1, d);
}

// Armour piercing against a rating: above the rating, x1.25 per point; below it, x0.5 per point.
export function armourPierce(ap: number, rating: number): number {
  return ap > rating ? Math.pow(1.25, ap - rating) : Math.pow(0.5, rating - ap);
}

export function armourReduce(dmg: number, ap: number, rating: number, reductionPct: number): number {
  let d = dmg * armourPierce(ap, rating);
  if (reductionPct > 0) d *= 1 - reductionPct / 100;
  return d;
}

// Pool choice when the attack says RANDOM: 60 health, 35 action, 5 mind.
export function pickPool(roll0to100: number): "health" | "action" | "mind" {
  if (roll0to100 <= 60) return "health";
  if (roll0to100 <= 95) return "action";
  return "mind";
}

// Worked values (hand-checked against the donor's ladder): 75, 100, 50, 37.5.
const a = hitChancePct(0, 0);
const b = hitChancePct(50, 0);
const c = hitChancePct(0, 50);
const d = hitChancePct(0, 100);
const pierceOver = armourPierce(3, 1);   // 1.5625
const pierceUnder = armourPierce(1, 3);  // 0.25
void a; void b; void c; void d; void pierceOver; void pierceUnder; void evadeWins; void pickPool;
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/V003_combat_hit_damage.ts`), exit 0.

## 5. Lands in

Target: `src/fight/hit-resolve.ts` (proposed; the hit roll, evade contest and damage chain belong inside the one engine in `src/fight`, not the Pit client). Parity row: 1 (duel step/sim): one attack resolves as one duel step on the server, with the hit roll before any damage.

## 6. Gaps and risks

- Order: the donor computes damage before the hit roll, so misses still compute damage (440, 447). Frankendom should roll the hit first and compute damage only on a hit (cheaper, and it keeps the duel log clean).
- One ledger: the donor splits damage over three pools (health, action, mind) with spill-over and food mitigation. Frankendom has one HP ledger, so the pool split and spill-over should not be ported; keep one damage number per hit.
- Server-verified kills: the donor's `System::random` is server-side, which fits. The donor's TOHIT_DEBUG block sends the whole breakdown (accuracy, defense, evade, chance) to player clients in a compile-time debug build (2183-2233). Frankendom must keep these numbers on the server and send only the result, unless a debug flag is set.
- Unskilled accuracy -15 is a TODO in the donor (1980). Frankendom must pick a value and test it, not inherit the open question.
- Floor of 1 damage on every hit (1177) and PvP x0.25 (1175): both are rules Frankendom must decide explicitly as data, not as constants in the function. PvP scaling is a per-matchup rule, not a zone one.
- Armour piercing is steep: each point of rating below piercing halves the damage (2672). Frankendom needs a tested maximum swing; the 1.25 and 0.5 bases are data fields.
- MAX_ATTACKERS = 3: the donor's area-target code (`getAreaTargets` 930) is not read, so nothing here says how many targets one attack can hit. Do not infer the cap from this note.
- Pit as client: the ladder and evade contest are engine logic; the Pit only shows the result. Do not run the ladder in the Pit.
- The two-dice evade contest (1..500 vs 1..200) uses a wide attack roll. If adopted, expose both dice sizes as data, do not hard-code them.
- Not read: the attack cadence and the command queue (attack speed 2829), force attacks and DoTs. If Frankendom takes any of these, read them first.

Reuse tag: reuse-first (AGPL donor; shape only, no port)

Brief rule served: rule 5 (callers of getHitChance, calculateDamage, hitChanceEquation checked by grep); rule 2 (candidate files opened: CombatManager.cpp, CombatManager.h, COPYING); rule 4 (Best transferable idea below); rule 10 (receipts verified).

Best transferable idea: A fight's hit chance is a clamped piecewise curve of accuracy minus defense, with a roll after it, so a duel's odds can be read off one table and tuned as data.

Decision (proposed): adapt - take the hit ladder (scale, base, step, clamp as engine constants, with the defense cap) and the order hit-then-damage; drop the three-pool split, spill-over and food mitigation (one ledger), the TOHIT debug output to clients, and the uncapped armour piercing exponent unless it is bounded.
Acceptance: A server test: accuracy 0 vs defense 0 gives 75% hit; accuracy 50 above defense gives 100%; 50 below gives 50%; 100 below gives 37.5%; a MISS deals no damage and a BLOCK halves the damage; the duel log records the roll and the chance but the client receives only the result.



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code.

**Errors / corrections:** (1) Sketch hitChancePct caps the whole defense at 125 (Math.min(defense, DEFENSE_CAP)); donor caps only defenseSkill inside getDefenderDefenseModifier (CombatManager.cpp ~2026) and secondary defense (~2062); defensePosture is added AFTER the cap (2135-2136), so the sketch changes the math for postured defenders. (2) Note states evade attack roll '1..500' and defend '1..200' and also 'assumes rand(n) gives 0..n-1'; code is System::random(499)+1 / random(199)+1 (2170-2171), which is 1..500 only if random(n) is inclusive of n - the note is internally inconsistent about this unread RNG range. (3) Damage is only computed when data.getDamageMultiplier() != 0 (440); note step 1 says it is computed unconditionally before the roll. (4) Damage mitigation rank (1290-1298) is read from defenderGhost (players only), note describes it as a defender ability generally. Verified OK: hitChanceEquation 2238-2259 and header constants 73-78, getWeaponDefendResult table, RICOCHET block 2155-2165, evade contest 2166-2179, calculateDamage chain 1109-1182 (1.5, 1.25, 1.5, 0.25, floor 1), pool 60/95 (1405-1407), spill 0.0834 (1452), food cap 100, getArmorPiercing 1.25/0.5 (2669-2672), wear 0.2 (2593), unskilled -15 (1980), AGPL v3.

**Missed:** creoTargetCombatAction (478) skips all post-hit handling when hitVal==MISS and the state-only branch; applyDamage armour-hit-location selection not covered (acknowledged).
