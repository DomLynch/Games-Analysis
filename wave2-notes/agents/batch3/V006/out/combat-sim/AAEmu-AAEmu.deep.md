# AAEmu-AAEmu (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Skills/Effects/DamageEffect.cs` (method `Apply`, lines 69 to the end of the method) with `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Skills/Skill.cs` (`RollCombatDice`, line 1461) | Licence: LGPL-3.0 (per `README.md` 33-46: "GNU Lesser General Public License"; the repo also carries `LICENSE.GPL` and `LICENSE.MIT` (Rain0Ash, 2019); no per-file licence header; which licence covers this file was not established) | C# | symbol `DamageEffect.Apply` with `Skill.RollCombatDice`

Checked: `DamageEffect.Apply` (69) and `Skill.RollCombatDice` (1461, to the end of its switch before `SkillMissed` at 1536) were both read in full. Callers of the dice: `PlotCondition.ConditionCombatDiceResult` (164-178, read) and the hostile-target loop in `Skill.cs` 972-973 (read). Not read: `ReduceCurrentHp`, `CanAttack`, `CheckDamageImmune`, the procs, crime, `SkillModifiersCache`, and the `Events` classes. Confidence: high on the order and numbers as written; medium on intent (the donor marks the front test as unverified at `Skill.cs` 1478, and several integer divisions below look unintended). camera_scope: not a camera topic.

Best transferable idea: Resolve one hit as an ordered cascade of named results (immune, stored miss, front-only dodge, block, parry, accuracy, then crit) and reduce damage by a single armour curve, armour / (armour + 5300), returning value and absorbed so the client can show both.
Decision (proposed): adapt - take the ordered cascade and the armour curve shape into one duel-step resolver; do not copy the stat names, the cast-time-times-dps base, or the integer divisions, and keep guard and stamina (row 3) and hit impact (row 10) out of this module.
Acceptance: a server test with a scripted random source shows: a front-facing defender that rolls dodge, block and parry returns exactly one of them in that order; accuracy 100 never misses; armour 1000 on a 100-damage hit gives value 84 and absorbed 15; a melee crit multiplies before the armour curve is applied.

## 1. Mechanism

Two parts: the dice decide whether the hit lands; `Apply` computes what it does.

**Part A, the dice (`RollCombatDice`, 1461).** Runs once per target for hostile skills.
- Front test first (1479-1480): if the target is not in front of the attacker, the code jumps to the accuracy roll. The front test is `MathUtil.IsFront`: the bearing from attacker to target, minus 90 and minus the attacker's rotation, must lie within plus or minus 90 degrees (`MathUtil.cs` 114-123). The donor comment at 1478 reads "Idk if this is right. Double check it".
- Bull's-eye (1472): `BullsEye / 1000 x 3 / 100` is subtracted from every defence rate (dodge, block, both parry rates). It does not touch accuracy.
- Order of the defence rolls (1482, 1489, 1496, 1507), each a `random in [0,100) < rate - bull` test: dodge, then block, then melee parry, then ranged parry. Each returns only for its own damage kind: dodge and block return for melee and ranged; melee parry returns for melee, and for ranged too when the target has both dual-wield buffs (1496-1505); ranged parry returns for ranged. For magic, the dodge, block and parry rolls still run (the random draw happens inside the `if`) but none of them can return.
- Accuracy (1518-1528): `random < MeleeAccuracy` (or `SpellAccuracy`, `RangedAccuracy`) gives a hit, otherwise a miss. Accuracy defaults to 100 (`Unit.cs` 134), so a stock attacker never misses on this roll.
- Dice never return Immune; immune is checked in `Apply` (97).
- Callers: a plot condition (`PlotCondition.cs` 171-173) calls the dice and stores the result in `skill.HitTypes` per target; the miss-type results make the condition true (`PlotCondition.cs` 164-178, read). The skill target loop (`Skill.cs` 972) also calls the dice; `Template.LevelRuleNoConsideration` (973) overrides the result to a hit.

**Part B, `Apply` (69), in this order.**
1. Guard (74): target must be a `Unit` with Hp above 0. Bonuses are added to the caster; buff remove-on triggers fire.
2. Immune (97): if the target has immunity to this damage type, an Immune packet is sent and the method returns.
3. Stored dice miss (110-121): if the skill's `HitTypes` has a miss-type result for this target, a miss packet goes out, combat buffs fire, and the method returns. No damage is rolled.
4. Crit chance (125-146): `flexibilityRateMod = trg.Flexibility / 1000 * 3` (125) is integer division. Melee rolls `MeleeCritical - mod` (129), magic `SpellCritical - mod` (135), ranged `RangedCritical - mod` (141). A success sets the hit type to the crit type; siege is always a plain ranged hit.
5. Base range (154-205):
   - Level part (160-167, only if `UseLevelDamage`): `lvlMd = LevelDps x LevelMd`; `levelModifier = ((Level - 1) / 49 x (VaEnd - VaStart) + VaStart) x 0.01` (164). `Skill.Level` is a `byte` (`Skill.cs` 44), so `(Level - 1) / 49` is integer division and steps in whole units. Then `levelMin = lvlMd - levelModifier x lvlMd + 0.5` (166) and `levelMax = (levelModifier + 1) x lvlMd + 0.5` (167).
   - Damage per second part (171-195): `dpsInc` is picked by damage kind; `max += dpsInc x 0.001 x DpsIncMultiplier` (185); weapon dps terms are each multiplied by 0.001 (188-193); `max = DpsMultiplier x weaponDamage + max` (195).
   - Cast factor (197-203): starts at 1000. Line 201 is `minCastBonus = min > 0 ? min : minCastBonus`, but `min` is still 0 at that point (it is first set at 209 and 217), so for casts of 1000 ms or less the factor stays 1000. Longer casts use the cast time in ms (203).
   - `variableDamage = max x minCastBonus x 0.001` (205). So the dps part is multiplied by the cast length in seconds (or by 1 second for short casts).
   - Slot split (207-219): with `WeaponSlotId < 0`, `min = variable + levelMin` (209) and `max = variable + levelMax`. Otherwise, only if a weapon is in that slot (214), `scaled = DamageScale x variable x 0.01` (216) and `min = levelMin + (variable - scaled)`, `max = levelMax + (variable + scaled)` (217). With the slot set and no weapon, the assignment is skipped (the block at 214-219 is guarded by `weapon != null`): min keeps its earlier value (0) and max keeps the raw dps part from 185-195, which was not multiplied by the cast factor, so the later roll is `Next(0, raw dps x multipliers)` (read, not tested).
6. Skill multiplier (222): `min *= Multiplier`, and max the same.
7. Damage-type multiplier (225-235): `MeleeDamageMul`, `SpellDamageMul` or `RangedDamageMul` (227 onward). Then `min = floor(min x m)` (234) and `max = ceil(max x m)` (235).
8. Skill modifier stack (237-241): `SkillModifiersCache.ApplyModifiers(skill, Damage, min)` and the same for max.
9. DOT (243-258): when the buff has tick effects, min and max are scaled by `Buff.Tick / Buff.Duration` (247-248).
10. Charged buffs (261-279): caster and target charged buffs add `charges x (ChargedMul + Level x ChargedLevelMul)` to min and max, then the charges are used up.
11. Fixed damage (281-284): if `UseFixedDamage`, min and max are replaced by `FixedMin` and `FixedMax`. This comes after steps 6-10, so fixed damage skips the multipliers.
12. Roll (287): `finalDamage = Random.Shared.Next(min, max)`, a float in [min, max) (`RandomExtensions.cs` 20).
13. Target buff tag (290-293): if the target has the tag, finalDamage is multiplied by `TargetBuffBonusMul`.
14. PvP toughness (297-298): only Character against Character: `finalDamage *= 1 - BattleResist / (8000 + BattleResist)`.
15. Crit multiplier (301-313): `1 + (CriticalBonus - Flexibility / 100) / 100`. `Flexibility / 100` is integer division (`Unit.cs` 184 is an `int`).
16. Armour (316-340), by damage kind:
   - melee: `armor = max(0, Armor - DefensePenetration)` (325); `reduction = 1 - armor / (armor + 5300)` (326); then `finalDamage *= IncomingMeleeDamageMul` (327).
   - ranged: the same shape with `Armor`, `DefensePenetration` and `IncomingRangedDamageMul` (330-332).
   - magic: `armor = max(0, MagicResistance - MagicPenetration)` (335); `reduction` the same curve (336); `IncomingSpellDamageMul` (337).
   - other kinds: no reduction (1.0), `IncomingDamageMul` (339-340).
17. Split (344-345): `value = (int)(finalDamage x reduction)`; `absorbed = (int)(finalDamage x (1 - reduction))`.
18. Life and mana steal (346-347, applied at 365-366): `value x HealthStealRatio / 100`, truncated; caster Hp is capped at MaxHp.
19. Attack check (356): `else if (!caster.CanAttack(trg)) return;`. This check comes after the damage has been computed but before any health change.
20. Damage applied (360): `trg.ReduceCurrentHp(caster, value)`, then `SummarizeDamage += value`.
21. Crime (378): a friendly-relation hit by a caster can set criminal state and generate evidence (read in part; not expanded).
22. Battle state (406-407): the target is in battle while alive; the attacker is marked in battle when the target survives.
23. Combat buffs and packet (428-440): combat buffs fire for both sides; the `SCUnitDamagedPacket` carries `value` and `absorbed` (430) and is added to the caller's packet builder or broadcast.
24. NPC target (441-444): an aggro packet goes to the target and its players, then `OnDamageReceived(caster, value)` (444).
25. Events (448-452): `OnAttack` fires even when the value is 0; `OnAttacked` fires on the target.
26. Value above zero (454-456 onward): `OnDamage` for the attacker, `OnDamaged` for the target, then the typed melee/ranged/magic/siege events.
27. Durability (503 onward): characters lose weapon durability at a configured PvP or PvE rate.

## 2. Key functions

- `DamageEffect.Apply`: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Skills/Effects/DamageEffect.cs` 69 to the end of the method. The whole damage path, steps 1-27 above.
- `Skill.RollCombatDice`: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Skills/Skill.cs` 1461 to the end of its switch before 1536. The dice cascade (step A).
- `MathUtil.IsFront`: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Utils/MathUtil.cs` 114-124 (the front test; one overload read).
- Callers: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Skills/Plots/PlotCondition.cs` 164-178 and `Skill.cs` 972-973.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Ordered dice: each defence is a percent roll, first success returns | Dodge, block, melee parry, ranged parry rates (per-unit stats, percent, `Unit.cs` 172-178) |
| Bull's-eye lowers every defence roll by the same amount | `BullsEye / 1000 x 3 / 100` (`Skill.cs` 1472) |
| Accuracy is the last roll; default 100 always hits | `MeleeAccuracy = 100f` (`Unit.cs` 134) |
| Crit chance minus a defender-side term | `trunc(Flexibility / 1000) x 3` (`DamageEffect.cs` 125); the crit rolls at 129, 135, 141 |
| Crit multiplier: 1 + (crit bonus - defence term) / 100 | `Flexibility / 100` integer term (304) |
| Armour soak as a curve that approaches 100 percent | `armor / (armor + 5300)` (326, 331, 336; the same constant three times, theirs) |
| Penetration reduces the armour before the curve | `DefensePenetration` (325, 330), `MagicPenetration` (335) |
| PvP-only toughness curve | `BattleResist / (8000 + BattleResist)` (298) |
| Time-scaled base damage | Cast factor fallback 1000 ms (197-203, theirs); casts over 1000 ms use their length in ms |
| Level-scaled base damage | `0.5` offset (166-167), level modifier from `(Level - 1) / 49` (164) |
| Steal ratio | `HealthStealRatio / 100` (346) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (dice cascade, crit roll, damage draw, crit multiplier, armour soak, value and absorbed split) and the integer truncations. It omits: the dual-wield ranged-as-melee-parry case; the level-damage part; the separate weapon min and max split (`DamageScale`) and the no-weapon slot case (max keeps the raw dps part, min stays 0), so min and max come from one dps part; the siege kind (donor treats it as a ranged hit); the skill modifier stack, the DOT scaling, the charged buffs, the target buff tag, and the fixed-damage override (kept in the signature only); the PvP toughness curve; the incoming damage multipliers; life steal; crime, aggro and event side effects; and the call to `ReduceCurrentHp`. It keeps the donor's draw order, including the defence rolls that run for magic and are then discarded.

```ts
// Licence: LGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type DamageKind = "melee" | "ranged" | "magic";
type Hit = "hit" | "crit" | "miss" | "dodge" | "block" | "parry";

interface Attacker {
  accuracy: number;        // percent, for this damage kind (default 100 in the donor)
  critical: number;        // percent
  criticalBonus: number;   // percent points added to the crit multiplier
  penetration: number;     // armour or magic resist penetration
  dps: number;             // dps part of the damage, already summed
  bullsEye: number;        // integer stat
}

interface Defender {
  dodge: number;           // percent
  block: number;           // percent
  meleeParry: number;      // percent
  rangedParry: number;     // percent
  armour: number;          // armour, or magic resist for magic
  flexibility: number;     // integer stat
}

const ARMOUR_K = 5300;

// Dice cascade, first success wins. Defence rolls only when the attacker is in front of the target.
function rollDice(kind: DamageKind, a: Attacker, d: Defender, inFront: boolean, rnd: () => number): Hit {
  const bull = (a.bullsEye / 1000) * 3 / 100;
  if (inFront) {
    if (rnd() * 100 < d.dodge - bull && kind !== "magic") return "dodge";
    if (rnd() * 100 < d.block - bull && kind !== "magic") return "block";
    if (rnd() * 100 < d.meleeParry - bull && kind === "melee") return "parry";
    if (rnd() * 100 < d.rangedParry - bull && kind === "ranged") return "parry";
  }
  return rnd() * 100 < a.accuracy ? "hit" : "miss";
}

// One hit: dice, then crit roll, then the damage draw, crit multiplier, armour soak and the value/absorbed split.
function resolveHit(kind: DamageKind, a: Attacker, d: Defender, inFront: boolean, castMs: number,
                    multiplier: number, fixed: [number, number] | null, rnd: () => number):
                    { hit: Hit; value: number; absorbed: number } {
  let hit = rollDice(kind, a, d, inFront, rnd);
  if (hit !== "hit") return { hit, value: 0, absorbed: 0 };

  const flexMod = Math.trunc(d.flexibility / 1000) * 3;   // integer division, as in the donor
  if (rnd() * 100 < a.critical - flexMod) hit = "crit";      // critical is the stat for this damage kind

  // Damage range: cast factor is 1000 for casts of 1000 ms or less, else the cast time in ms.
  const factor = castMs <= 1000 ? 1000 : castMs;
  let min = a.dps * factor * 0.001;
  let max = min;
  min = Math.floor(min * multiplier);
  max = Math.ceil(max * multiplier);
  if (fixed !== null) [min, max] = fixed;
  let dmg = min + rnd() * (max - min);                     // Next(min, max): [min, max)

  if (hit === "crit") dmg *= 1 + (a.criticalBonus - Math.trunc(d.flexibility / 100)) / 100;

  const soak = Math.max(0, d.armour - a.penetration);
  const reduction = 1 - soak / (soak + ARMOUR_K);
  return { hit, value: Math.trunc(dmg * reduction), absorbed: Math.trunc(dmg * (1 - reduction)) };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file `/tmp/hit_resolve_tc.ts`), exit 0.

## 5. Lands in

- TARGET `src/fight/hit.ts` (new): the one hit resolver the duel step calls (dice, crit, damage, armour, split). Parity-checklist row 1 (duel step / sim).
- today: (not read) the Frankendom duel step file.
- Reuse tag: rewrite-from-idea (LGPL-3.0; clean-room only)
- Brief rule served: one engine (one resolver for every fight), server-verified kills (the dice and the damage are drawn on the server and the value is what the ledger records), zones as data (the rates and the cast factors are data, not constants)

## 6. Gaps and risks

- LGPL-3.0 per README, with a GPL file and an MIT file also in the repo; this file's licence is not established. Clean-room only: the sketch is written from the mechanism.
- Integer divisions that look unintended, copy none of them: `Flexibility / 1000 * 3` (125), `Flexibility / 100` (304, 307, 310), and `(Level - 1) / 49` (164) on a byte level. The first makes crit defence zero for any target under 1000 Flexibility.
- Cast-time base: the `min > 0` branch at 201 is never taken, so short casts use a fixed 1 second. Frankendom should state the damage-per-second base as data and not reuse the cast-length product.
- The donor marks the front test as unverified (1478). Frankendom must pick its own facing rule and test it; do not inherit this one.
- Ranged attacks can be parried by the melee parry rate when the target has both dual-wield buffs (1496-1505). Not a Frankendom ruling; do not port.
- Order of checks matters for one ledger: a stored miss returns before any damage is rolled (110-121), but the attack check (356) runs after the damage is computed. Frankendom should check permission first and roll once.
- Guard, stamina and parry are not in this resolver. Neither the dice nor `Apply` has a stamina term (read); Frankendom's guard/parry/stamina rule (row 3) is a separate system and must not be replaced by this roll.
- The armour constant 5300 and the toughness constant 8000 are theirs; they should be engine constants in Frankendom, with unit rates as zone data for creatures.
- Not read: `ReduceCurrentHp` (death handling is not in `Apply`), `CanAttack`, `CheckDamageImmune`, the proc and crime code, and the `Events` classes.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** 'With the slot set and no weapon, min and max stay 0' is wrong: DamageEffect.cs 207-220 only assigns min/max inside weapon!=null; otherwise min stays 0 but max still holds the raw dps part from 185/195 (not multiplied by the cast factor), so the roll is Next(0, rawDps*multipliers). Everything else verified: dice order 1479-1511, bull's-eye 1472, accuracy default 100 (Unit.cs 134/142/150), 5300 curve 326/331/336, 8000 toughness 298, Flexibility int (Unit.cs 184) int-division at 125/304-310, crit bonuses are float, cast factor min>0 dead branch 201, steps 1-27 line refs, armour 1000 -> 84/15, README LGPL lines, LICENSE.MIT Rain0Ash 2019.

**Missed:** IsFront bearing detail OK; none major. Sketch omits Siege (RangedHit, 1530/147) as a kind.
