# daggerfall-unity (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Formulas/FormulaHelper.cs` | Licence: MIT License, Copyright (c) 2009-2023 Daggerfall Workshop (`LICENSE` lines 1 and 3; adaptation allowed) | C# (Unity) | symbol `FormulaHelper.CalculateAttackDamage` (with `CalculateSuccessfulHit`, 796)

Checked: Read in full: `CalculateAttackDamage` (538-722), `CalculateWeaponAttackDamage` (730-768), `CalculateHandToHandAttackDamage` (771-790), `CalculateSuccessfulHit` (796-827), the to-hit terms `CalculateWeaponToHit` (1140-1146), `CalculateArmorToHit` (1149-1161), `CalculateAdrenalineRushToHit` (1163-1182), `CalculateStatsToHit` (1185-1199), `CalculateSkillsToHit` (1202-1221), `CalculateAdjustmentsToHit` (1224-1250), `DamageModifier` (66-73), `CalculateStruckBodyPart` (863-871), `CalculateBackstabChance` and `CalculateBackstabDamage` (964-990), `GetEnemyEntityWeightInClassicUnits` (2881-2898). Knockback read in full: `WeaponManager.cs` 547-630 (the player's hit path), `EnemyAttack.cs` 303-392 (`ApplyDamageToNonPlayer`), `EnemyMotor.cs` 155-170 and 265-320, `GameManager.cs` 42 and 490-507, `Dice100.cs` 15-18. Callers of `CalculateAttackDamage`: `WeaponManager.cs` 547 and `EnemyAttack.cs` 314 were read; `EnemyAttack.cs` 253 (enemy hitting the player) is a grep line only, not read. Not read: `GetBonusOrPenaltyByEnemyType`, `DamageEquipment`, `OnMonsterHit`, poison, the Namira ring, the Strikes enchantment hook that can change damage after the roll (`WeaponManager.cs` 618-624 and `EnemyAttack.cs` 378-383; `DoItemEnchantmentPayloads` not read), the Skeletal Warrior branch in full, the mod override hooks (`TryGetOverride`) when a replacement is installed, `PlayerHealth.cs` 42, `DaggerfallEntityBehaviour.cs` 165. Numerical check: I ran the donor's two-step knockback expression and the closed form on the VPS (node, 28,600 pairs, damage 1-200, weight 1-1000): maximum difference 7e-11 (float noise). The sketch compiles with `tsc --strict --target es2020`. camera_scope: not applicable (combat topic). Confidence: high on the hit and damage chain and on the knockback chain; medium on the monster branch, where the callers are read only for one function.

Best transferable idea: a hit roll built as one named sum of terms, clamped to 3..97 and rolled once on the server, plus a weight-scaled knockback (40 x d^2 / (W + 10 d), floored at 15 classic units) that decays per tick as a client-only push.
Decision (proposed): adapt - take the hit-roll shape and the knockback formula, but run the roll on the server (kills are server-verified) and keep the push as a client view; drop the donor's crit-to-hit and the per-monster reflex gate.
Acceptance: a server test with a fixed seed asserts that a 10-damage hit on a 100-weight target gives a push of 20 classic units that ends after 4 classic updates, and that a chance of 60 hits on roll 59 and misses on roll 60.

## 1. Mechanism

- One function, `CalculateAttackDamage` (538-722), returns the damage for one attack. It does not change health. The caller does (`WeaponManager.cs` 627 for the player's hit, `EnemyAttack.cs` 385 for an enemy's hit on a non-player). Hit and damage are rolled locally by whichever client makes the swing. Nothing in this function is server-side.
- Order of steps, as the code runs:
  (a) Monster weapon choice: if the AI attacker holds a weapon whose average damage is below its no-weapon average, it fights hand-to-hand (566-569).
  (b) Material gate: if the target's `MinMetalToHit` is above the weapon's material value, return 0 (576-578).
  (c) To-hit base: the attacker's live skill for the weapon, or HandToHand (592). For the player only, swing, proficiency and racial mods add to both damage and to-hit (594-609). Backstab chance is the Backstabbing skill when the enemy faces away (611-612, 970-973); it is added to the to-hit and is also the level of the triple-damage roll later.
  (d) Struck body part: rolled once from a 20-entry weighted table (616, 869).
  (e) Branch. Weaponless and attacker is the player or an EnemyClass (621): one `CalculateSuccessfulHit`, then hand-to-hand damage, then backstab. Weaponless monster (630): up to three attack slots (636). Each slot passes a reflexes gate, `50 - 10 x (Reflexes - 2)` percent, rolled with `DFRandom` (654, 657); then `CalculateSuccessfulHit`; then a uniform roll from min to max (659). A slot that does damage also adds the enemy-type bonus (669). The reflexes stat read is `player.Reflexes` (`player` is `GameManager.Instance.PlayerEntity`, 654), whatever the target is.
  (f) Weapon: to-hit += material x 10 (679); `CalculateSuccessfulHit` (684); on a hit, `CalculateWeaponAttackDamage` (686) and then backstab (688). Poison is applied when damage > 0 (not read in detail).
  (g) Damage floored at 0 (699), `DamageEquipment` (701, not read), Namira ring (not read), return (722).
- The hit roll, `CalculateSuccessfulHit` (796-827): chance = chanceToHitMod (from the caller) + armour on the struck part (808) + adrenaline rush (811) + enchantment modifier (814) + stat differences (817: luck and agility differences, each divided by 10) + skill terms (820: minus the target's dodging / 4, plus attacker crit / 10 if the crit roll succeeds) + adjustments (823: minus the biography modifier when the target is the player, plus 40 when the target is a monster, minus 50 always). Clamp to 3..97 (825). Roll (827): hit when a random integer 0-99 is below the chance (`Dice100.SuccessRoll`, `Dice100.cs` 17).
- Crit is only a to-hit bonus. The crit roll (1216) on `CriticalStrike` adds skill / 10 to the to-hit (1218). A case-insensitive grep of `Assets/Scripts` for crit terms found no crit damage multiplier. `WeaponManager.cs` 435 tallies the skill (not read).
- Armour only changes whether the hit lands (`CalculateArmorToHit` adds the value to the chance, 808 and 1158). There is no armour damage reduction in this path.
- Damage (`CalculateWeaponAttackDamage`, 730-768): uniform roll from min to max (736), plus the swing/proficiency/racial modifiers passed in; for a non-player target the Skeletal Warrior rule halves non-edged damage and doubles silver (738 onwards, not read in full); plus `DamageModifier(strength) = floor((Str - 50) / 5)` (755, 72); plus the weapon's material modifier (759); floored at 0 if below 1 (760); plus the enemy-type bonus (763); then an `Adjust` hook that is a no-op in this version (per its comment).
- Backstab (`CalculateBackstabDamage`, 978-990): if the level is above 1 and `Dice100.SuccessRoll(level)` succeeds, damage is multiplied by 3 (984-986).
- Knockback. It runs only when damage > 0 and the target has a motor. Player hit: `WeaponManager.cs` 562-593. Enemy hit on a non-player: `EnemyAttack.cs` 321-350. Order in both paths: the push is computed from the damage before the weapon Strikes enchantment hook (`WeaponManager.cs` 618-624; `EnemyAttack.cs` 378-383), which can change the damage before `DecreaseHealth` (627; 385). So an enchantment that changes damage does not change the push. With damage d and classic-unit weight W, the donor computes `knockBackAmount = ((10d - W) x 256) / (W + 10d) x 2d` and `speed = (10d / W) x (2d - knockBackAmount / 256)` (`WeaponManager.cs` 586-587), divides by 3.95 to get Unity units (588), and sets a floor of 15 classic units (590). Algebra gives the closed form `speed_classic = 40 d^2 / (W + 10 d)`, floored at 15; the node check above confirms it. Examples: d = 10, W = 100 gives 20; d = 20, W = 50 gives 64; d = 1, W = 350 gives the floor of 15.
- Knockback gate. The player path (`WeaponManager.cs` 578-580) reads `(A && B) || C`: A is current speed <= 5 and B is an EnemyClass, and C is weight > 0, so a weighted target is pushed even when it is already moving. The enemy path (`EnemyAttack.cs` 337) reads `A && (B || C)`, so it needs A. The sketch uses the enemy path's grouping.
- Weight (`GetEnemyEntityWeightInClassicUnits`, 2881-2898): item weight x 4 plus a base. Monsters use their own `Weight` field; other enemies get 240 (female) or 350 (male).
- Motion (`EnemyMotor.cs` 155-170 and 265-320): `FixedUpdate` calls `KnockbackMovement` every fixed step (166). If speed > 0: the stored speed is capped at 40 classic units (277); if speed > 5 and the state is not PrimaryAttack, the state becomes Hurt (282); motion = direction x min(speed, 25 / 3.95) in Unity units (290), passed to `controller.SimpleMove` (not read beyond that call); on a classic update, speed -= 5 (303); if speed <= 5 and not PrimaryAttack, the state becomes Move (307); if speed > 10, `EvaluateMoveInForAttack` runs (312-314); `CanAct` is set false (317).
- Classic tick, the loop that drives this: `GameManager.FixedUpdate` (490-507) adds `Time.deltaTime` to `classicUpdateTimer` (499). When the timer reaches `classicUpdateInterval` = 0.0625 s (42, 500), it resets to 0 (502, no remainder carried) and `classicUpdate` is true for that step (503); otherwise false (506). The project's fixed step is 0.02 s (`ProjectSettings/TimeManager.asset` line 6). Unity documents that `Time.deltaTime` inside `FixedUpdate` equals the fixed step (Unity behaviour, not read in the donor). Under that reading the timer fires on every 4th fixed step, which is 0.08 s, not 0.0625 s. Derived from the code: at 0.08 s per update a 20-unit push ends after 4 updates (about 0.32 s) and a push at the 40 cap ends after 8 (about 0.64 s).

## 2. Key functions

- `CalculateAttackDamage`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Formulas/FormulaHelper.cs` 538-722. The whole pipeline in section 1 (a) to (g).
- `CalculateSuccessfulHit`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Formulas/FormulaHelper.cs` 796-827. The hit roll: named sum, clamp 3..97, one roll.
- `CalculateWeaponAttackDamage`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Formulas/FormulaHelper.cs` 730-768. Base roll, strength, material, floor at 0.
- Knockback on the player hit: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/WeaponManager.cs` 562-593 (closed form and gate). Enemy-on-enemy path: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/EnemyAttack.cs` 303-392, knockback 336-350.
- Knockback motion and decay: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/EnemyMotor.cs` 265-320 (called from 166).
- Classic tick: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/GameManager.cs` 490-507 (interval at 42).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hit roll is one named sum of terms, clamped, then a single roll below the clamped chance | Clamp 3 and 97 (`FormulaHelper.cs` 825); final offset -50 (1248); monster-target bonus +40 (1244); biography modifier for the player (1238) |
| Stat differences divided by 10 (integer division) | Luck (1194) and agility (1197), each / 10 |
| Dodging soaks the to-hit | Target dodging / 4 (1213). The donor comment says the classic formula is /10 but the code is /4 |
| Crit is a second roll that adds to the chance | CriticalStrike roll (1216), bonus skill / 10 (1218). No damage multiplier exists |
| Armour adds to the chance to be hit, not to the damage | Armour value on the struck part (1158) |
| Material adds to hit and to damage | x10 to hit (1146); added to damage (759) |
| Damage = roll in min..max + strength term + material term, floored at 0 | Strength term floor((Str - 50) / 5) (72) |
| Backstab multiplies a roll by a skill level | x3 when level > 1 and `Dice100(level)` succeeds (984-986) |
| Knockback = 40 d^2 / (W + 10 d), floor 15 | Floor 15 classic (WeaponManager 590); stored cap 40 (EnemyMotor 277); motion cap 25 (290); decay 5 per classic update (303); Hurt above 5 (282); re-plan above 10 (312) |
| Weight = 4 x item weight + base | Female base 240 (2893); male base 350 (2895) |
| Classic tick interval 0.0625 s on a fixed-step accumulator that resets to 0 | 0.0625 (42, 500); fixed step 0.02 (`TimeManager.asset` line 6) |
| Monster attacks in up to three slots, each with a reflex gate of 50 - 10 x (Reflexes - 2) percent | Three slots (636); base 50 and 10 per point (654); reflex stat read from the player (654) |
| Classic-to-Unity speed ratio | 39.5 / 10 = 3.95 (`PlayerSpeedChanger.cs` 30 and the /10 in the knockback code) |

## 4. TypeScript sketch

simplified: keeps the hit chance (named sum, clamp, one roll), the damage roll with strength and material and the floor at 0, the backstab roll, the knockback closed form with its gate, the stored cap, the motion cap, the decay and the count of classic updates to rest. It omits the player-only swing, proficiency and racial to-hit and damage terms (a caller can add them into `weaponSkill` and `damage`), the monster three-slot loop and reflex gate, the Skeletal Warrior and silver rules, poison, the Namira ring, the enemy-type bonus, `DamageEquipment`, the mod override hooks, the Hurt, Move and re-plan state changes, and the division by 3.95 (classic units throughout). It does not reorder anything that changes a result: the to-hit terms are integer sums and the donor clamps once at the end, as the sketch does. It uses the enemy path's gate (`EnemyAttack.cs` 337), not the player path's, and it applies the 40 cap in `knockbackStep`, where the donor applies it on the first motion step, not at hit time. The donor's per-term truncations (`/ 10`, `/ 4`) are kept by `Math.trunc`.

```ts
// Licence: MIT (donor). Shape taken from the donor's hit roll, damage roll and knockback steps; written fresh, not a line-by-line translation.
export const HIT_MIN = 3;                 // donor clamp, FormulaHelper.cs 825
export const HIT_MAX = 97;
export const MONSTER_TARGET_BONUS = 40;   // donor 1244, monster targets only
export const FINAL_OFFSET = -50;          // donor 1248
export const KNOCK_MIN = 15;              // classic units, WeaponManager.cs 590 / EnemyAttack.cs 348
export const KNOCK_CAP = 40;              // classic units, EnemyMotor.cs 277
export const KNOCK_MOTION_CAP = 25;       // classic units, EnemyMotor.cs 290
export const KNOCK_DECAY = 5;             // classic units per classic update, EnemyMotor.cs 303
export const KNOCK_HURT = 5;              // EnemyMotor.cs 272-282

export interface HitInput {
  weaponSkill: number;        // attacker's live skill for the weapon
  weaponMaterialMod: number;  // weapon material modifier, counts x10 to the to-hit
  armourOnPart: number;       // armour value on the struck body part
  luckDiff: number;           // attacker luck minus target luck
  agilityDiff: number;        // attacker agility minus target agility
  targetDodging: number;      // target's dodging skill (divided by 4)
  critSkill: number;          // attacker's CriticalStrike skill
  critRolled: boolean;        // result of the crit roll against critSkill
  targetIsPlayer: boolean;
  targetIsMonster: boolean;
  biographyAvoid: number;     // subtracted when the target is the player
}

// Sum the named terms, clamp to 3..97, then the caller rolls once against the result.
// C# integer division truncates toward zero; Math.trunc matches it for integers.
export function hitChance(h: HitInput): number {
  let c = h.weaponSkill + h.weaponMaterialMod * 10 + h.armourOnPart;
  c += Math.trunc(h.luckDiff / 10) + Math.trunc(h.agilityDiff / 10);
  c -= Math.trunc(h.targetDodging / 4);
  if (h.critRolled) c += Math.trunc(h.critSkill / 10);
  if (h.targetIsPlayer) c -= h.biographyAvoid;
  if (!h.targetIsPlayer && h.targetIsMonster) c += MONSTER_TARGET_BONUS;
  c += FINAL_OFFSET;
  return Math.min(HIT_MAX, Math.max(HIT_MIN, c));
}

// Dice100.SuccessRoll: roll is an integer 0..99; the hit lands when roll < chance.
export function hits(chance: number, roll: number): boolean {
  return roll < chance;
}

// Base damage is a uniform integer in [min, max]; then strength and material are added; a result below 1 becomes 0.
export function damageRoll(min: number, max: number, unit01: number, strength: number, materialMod: number): number {
  let d = min + Math.floor(unit01 * (max - min + 1));
  d += Math.floor((strength - 50) / 5);
  d += materialMod;
  return d < 1 ? 0 : d;
}

// Backstab: only when the backstab level is above 1 and its roll succeeds, damage is tripled.
export function backstab(damage: number, level: number, roll: number): number {
  return level > 1 && roll < level ? damage * 3 : damage;
}

// Knockback speed in classic units. Closed form of the donor's two-step expression (see note section 1).
// Caller passes damage > 0 and weight > 0, which the donor's gates ensure.
export function knockbackSpeedClassic(damage: number, weight: number): number {
  const speed = (40 * damage * damage) / (weight + 10 * damage);
  return Math.max(KNOCK_MIN, speed);
}

// Applied on a hit. The gate is the EnemyAttack.cs grouping: a push only replaces a near-stopped one, and only for EnemyClass or weighted targets.
export function applyKnockback(current: number, damage: number, weight: number, isEnemyClass: boolean): number {
  if (damage <= 0) return current;
  if (!(current <= KNOCK_HURT && (isEnemyClass || weight > 0))) return current;
  return knockbackSpeedClassic(damage, weight);
}

// Each fixed step: the stored speed is capped, then the motion is capped separately.
export function knockbackStep(speed: number): { speed: number; motion: number } {
  const s = Math.min(speed, KNOCK_CAP);
  return { speed: s, motion: Math.min(s, KNOCK_MOTION_CAP) };
}

// Each classic update: the speed falls by KNOCK_DECAY.
export function knockbackClassicUpdate(speed: number): number {
  return speed - KNOCK_DECAY;
}

// Number of classic updates until the push ends (speed no longer above 0).
export function classicUpdatesToRest(speed: number): number {
  let s = Math.min(speed, KNOCK_CAP);
  let n = 0;
  while (s > 0) {
    s = knockbackClassicUpdate(s);
    n++;
  }
  return n;
}
export {};
```

Checks run on the VPS (node, compiled from the sketch): `knockbackSpeedClassic(10,100)` = 20; `(20,50)` = 64; `(1,350)` = 15 (floor); `(30,240)` = 66.67, the same as the donor expression; `classicUpdatesToRest(20)` = 4; `classicUpdatesToRest(64)` = 8 (capped at 40); `hitChance` for a player vs monster with skill 40, material 1, armour 20 = 60; a clamp-low case = 3. Maximum difference between the donor expression and the closed form over 28,600 pairs: 7e-11.

## 5. Lands in

- TARGET `src/fight/hit.ts` (new module: the hit roll and damage roll run on the server, so kills are server-verified; the knockback push is a client view of the same hit). Parity-checklist row 1 (duel step / sim). Frankendom's current hit code was not read for this note. The donor's three attack slots per monster are a per-monster rule and are not the MAX_ATTACKERS = 3 ruling; do not merge them.
- Reuse tag: adapt-from-idea (MIT; adaptation allowed; keep the MIT notice if any code is copied)
- Brief rule served: 1 (one engine, two clients: the roll is in the engine, the push is client view); rule 7 (MIT, adaptation allowed).

## 6. Gaps and risks

- Server-verified kills: in the donor the attacker's client calls `CalculateAttackDamage` and then `DecreaseHealth` locally (`WeaponManager.cs` 547 and 627). The donor is client-authoritative. For Frankendom the roll must run on the server, and the client sends only the swing. The sketch is a server function only if the server calls it.
- One ledger: the donor changes health from several places (`WeaponManager.cs` 627, `EnemyAttack.cs` 385, `PlayerHealth.cs` 42, `DaggerfallEntityBehaviour.cs` 165, plus effects; the last three were grep lines, not read). Frankendom must route every hit through the one ledger.
- Zones as data: the monster bonus (+40), the base weights (240, 350), the monster's own Weight, the three attack slots and the reflex base (50, 10 per point) are donor constants. Per-encounter values should be zone data fields, not constants in `hit.ts`.
- MAX_ATTACKERS = 3 is a separate ruling. The donor's three attack slots per monster are a different count and must not be read as the attacker cap.
- Armour does not reduce damage in this donor. If Frankendom's guard (row 3) wants armour to reduce damage, this donor does not supply it.
- Crit is a to-hit bonus only. If Frankendom wants crit damage, it needs its own rule; this donor has none.
- Reflexes: the donor reads the player's Reflexes for monster attack slots (654), whatever the target. Do not copy that. Use the attacker's or the target's stat, as data.
- Knockback gate: `WeaponManager.cs` 578-580 and `EnemyAttack.cs` 337 group the same test differently. The player path lets a weighted target be re-pushed while it is still moving. The sketch uses the enemy path. Do not reproduce the player path's grouping.
- Tick: the knockback decay runs on a client timer (`GameManager.cs` 499-503) that drops the remainder (502). Frankendom's server tick is a fixed step (parity row 18 / post-K item 3, sub-line "server tick: fixed step, input intake, per-tick NPC budget"). The decay belongs to the server's fixed step; the client only plays it.
- Units: the donor divides classic units by 3.95. Frankendom should pick one unit and keep the conversion in one place.
- Not read: `GetBonusOrPenaltyByEnemyType` (669, 763), `DamageEquipment` (701), `OnMonsterHit` (called from the monster slot), poison (weapon branch, after 686), the Namira ring (after 701), the Strikes enchantment hook that can change damage after the roll (`WeaponManager.cs` 618-624 and `EnemyAttack.cs` 378-383), the Skeletal Warrior branch in full (from 738), the enemy-to-player caller at `EnemyAttack.cs` 253, the death path (`Killed`), and the behaviour of the mod override hooks.
