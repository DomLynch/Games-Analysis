# ax-grymyr-l2dn-server (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Scripts/Handlers/EffectHandlers/PhysicalAttack.cs` | Licence: MIT (`/mnt/frankendom-donors/ax-grymyr-l2dn-server/LICENSE.txt`: "MIT License", Copyright (c) 2024-2025 Grymyr, L2Dn Server Project) | C# | symbols `PhysicalAttack.instant`, `Formulas.calcCrit`, `Formulas.calcShldUse`, `Formulas.calcCritDamage`, `Creature.doAttack`

Checked: `PhysicalAttack.cs` read in full (1-213). `Formulas.cs` read at 204-396 (calcCrit both branches, position and height bonus, crit damage), 600-666 (calcShldUse), 920-945 (calcSkillEvasion). `Creature.cs` read at 4590-4700 (doAttack entry, multipliers, counterattack, call to reduceCurrentHp) and 4719-4800 (reduceCurrentHp, up to the champion block). Confidence: high on the order of steps and the constants for the skill hit, the shield and the crit formulas; the height-bonus finding is by reading the C# arithmetic, not by running it. Not read: the auto-attack damage formula (Formulas.cs around 70-140, not read), `calcBlowDamage`, trait, weakness, attribute, PvP/PvE and random damage multipliers, `BaseStat.calcBonus` (the CON and STR bonus), position-type stat getters, the HP write and death in reduceCurrentHp, `calcCounterAttack`, `calcSpiritElementalDamage`, the defence-ignore stats in PhysicalAttack. Callers: only the calls made inside `PhysicalAttack.instant`, `calcShldUse` and `doAttack`; other callers not read. camera_scope: not applicable.

Best transferable idea: A shield blocks only inside a 120-degree frontal arc around the defender's facing, and a block adds the shield's defence to the defender's defence before the hit is divided, which maps onto a guard that only works when the fighter faces the attacker.
Decision (proposed): adapt — take the facing-arc gate and the shield-adds-to-defence model into the guard step (checklist row 3 idea, filed under row 1 here); reject the donor's perfect block as a 1-point hit, since a block should not deal damage, and reject the height crit bonus as written because it always evaluates to 1.
Acceptance: A duel test asserts, with the angle difference wrapped to 0..180 (the donor does not wrap), that a strike from outside the 120-degree frontal arc is never blocked by the shield, and a strike from inside that passes the block roll is reduced with the shield's defence added to the defender's pDef, with no 1-point perfect block.

## 1. Mechanism

- One physical skill hit runs in `PhysicalAttack.instant` (PhysicalAttack.cs). Order of steps:
  1. Gate: an attacker that is dead returns (line 73). Fake-death and overhit handling (read, not sketched).
  2. `attack = pAtk * pAtkMod` (line 84). Defence starts from the target's pDef, with defence-ignore stats applied (read, not receipted).
  3. For each repeat (the repeat count and repeat chance are per skill; the repeat roll is read, not receipted): a shield roll if the skill does not ignore shields (line 103 gate, then `Formulas.calcShldUse` at line 105). Shield success adds the target's shield defence to `defence` (line 124). Perfect block sets `defence = -1` (line 131).
  4. `damage = 1` (line 137), then the crit roll `Formulas.calcCrit(_criticalChance, ...)` (line 138).
  5. If `defence != -1` (line 140): weapon constant 70 for ranged and 77 for melee (line 167); `rangedBonus = attack + power` for ranged only (line 168); `critMod = calcCritDamage` when crit (line 169); `baseMod = weaponMod * (attack * levelMod + power + rangedBonus) / defence` (line 188); `damage = baseMod * abnormal damage mod * soulshot mod * critMod * trait, weakness, attribute, PvP/PvE, random mods` (line 190); times the attacker's physical skill power stat (line 193); times a race modifier when the target's race is listed (lines 196-197). The trait, weakness, attribute, PvP/PvE, random and soulshot terms are read as calls only.
  6. `effector.doAttack(damage, effected, skill, false, false, critical, false)` (line 200). A perfect block still reaches this line, with `damage = 1`.
- Critical roll, `Formulas.calcCrit` (Formulas.cs 204-301). Skill path (when a skill is passed): stat bonus from the attacker's chosen base stat, default STR (line 250); rate bonus from the CRITICAL_RATE_SKILL multiplier (line 258); defence factor from the target's physical skill crit-rate stats; chance = `Math.Clamp(rate * statBonus * rateBonus * defence * balance, 5, 90)` percent (line 272). Auto-attack path (no skill): `rate = positional * (defence crit rate + add) / 10 * height` (lines 278-281); level term `Math.Sqrt(attackerLevel) * levelDiff * 0.125` at level 78 and up (line 286); clamp to 3..97 (line 290); roll (line 301).
  - Positional value: side 1.1 (line 317), back 1.3 (line 321), front 1, each times a position-type stat (read, not receipted).
  - Height value: `(int.Clamp(fromZ - targetZ, -25, 25) * 4 / 5 + 10) / 100 + 1` (line 332). Every operand is an int in C#, so `/ 100` is integer division. The bracket runs from -10 to 30, so it truncates to 0 and the function returns 1 for every height difference. If the division were floating point, the same expression would give 1.10 at equal height (arithmetic only, not run).
- Crit damage, `Formulas.calcCritDamage` (Formulas.cs 341-389): skill path multiplies the attacker's physical skill crit-damage stat by the target's matching defence stat and a balance factor; auto-attack multiplies the crit-damage stat by a position-type value. Returns `2 * criticalDamage * defenceCriticalDamage * balanceMod` (line 389).
- Shield, `Formulas.calcShldUse` (Formulas.cs 608-664). Rate = SHIELD_DEFENCE_RATE times the target's CON bonus (line 616). A ranged attacker multiplies it by 1.3 (line 621). Facing gate: the arc is 120 degrees (line 624), or 360 if the target has the all-direction flag. The block is void when `Math.Abs(AngleDegreesTo(attacker) - ConvertHeadingToDegrees(heading))` is more than half the arc, 60 degrees (line 625); this is a raw difference with no wrap at 360, so a defender facing 350 degrees with the attacker at 10 degrees reads as 340 off and never blocks (a donor bug; our port wraps the difference to 0..180). `defence` is declared outside the repeat loop (line 94) and is not reset, so a perfect block (`-1`) carries into later repeats. Success if `shldRate > Rnd.get(100)` (line 633). Perfect block if `100 - 2 * CON bonus < Rnd.get(100)` (line 636). Non-armour secondary items and sigils return no block (line 611, read, not receipted).
- Damage entry, `Creature.doAttack` (Creature.cs 4590): an immobile target applies IMMOBILE_DAMAGE_BONUS times `max(0.22, IMMOBILE_DAMAGE_RESIST)` (line 4611); an attacker behind the target applies REAR_DAMAGE_RATE (line 4619); counterattacks run before damage (line 4625); then `target.reduceCurrentHp(...)` (line 4675). Reflect and absorb run after (read, not sketched).
- HP entry, `Creature.reduceCurrentHp` (Creature.cs 4719): damage-dealt and damage-received events; PvP or PvE damage-taken multiplier with a floor of -80 percent (read, not receipted); elemental spirit damage added (line 4787); DAMAGE_LIMIT caps the amount (lines 4792-4795). The HP write and death are (not read).

## 2. Key functions

- `PhysicalAttack.instant`: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Scripts/Handlers/EffectHandlers/PhysicalAttack.cs` 73-200. Gate, shield, crit, damage formula, doAttack.
- `Formulas.calcCrit`: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/Model/Stats/Formulas.cs` 204-301. Skill and auto-attack branches.
- `Formulas.calcCritDamage`: same file, 341-389.
- `Formulas.calcShldUse` (three-argument form): same file, 608-664. Facing arc, shield roll, perfect block.
- `Creature.doAttack`: `/mnt/frankendom-donors/ax-grymyr-l2dn-server/L2Dn/L2Dn.GameServer.Model/Model/Actor/Creature.cs` 4590-4690.
- `Creature.reduceCurrentHp`: same file, 4719-4800 (partial).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hit = weapon constant times (attack times level factor + power) over defence | 77 melee, 70 ranged (theirs, PhysicalAttack.cs 167); ranged adds attack + power again (168) |
| Shield adds its defence to pDef before the division | Added to pDef (theirs, PhysicalAttack.cs 124) |
| Perfect block leaves the hit at its initial value | Initial damage 1 (theirs, PhysicalAttack.cs 137); perfect block path (131). Rejected for us |
| Shield works only in a facing arc | 120 degrees, half-width 60 (theirs, Formulas.cs 624-625) |
| Ranged attacker reduces shield efficiency | Shield rate times 1.3 (theirs, Formulas.cs 621) |
| Perfect block chance rises with the defender's CON | Perfect when 100 minus 2 times CON bonus is below the roll (theirs, Formulas.cs 636) |
| Crit = 2 times attacker crit damage times defender crit-damage stat | Factor 2 (theirs, Formulas.cs 389) |
| Clamp of crit chance | Skill 5 to 90 percent (theirs, Formulas.cs 272); auto-attack 3 to 97 (theirs, Formulas.cs 290) |
| Position bonus on auto-attack crit | Side 1.1 (Formulas.cs 317), back 1.3 (321) |
| Height bonus on auto-attack crit | Intended 0.8 per unit, clamp plus or minus 25 (theirs, Formulas.cs 332); as written, always 1 |
| Level term on crit | Starts at level 78 (theirs, Formulas.cs 286) |
| Floor on immobile resist | 0.22 (theirs, Creature.cs 4611) |
| Damage cap | DAMAGE_LIMIT (theirs, Creature.cs 4795) |

## 4. TypeScript sketch

simplified: keeps the donor order for one physical skill hit (shield facing gate and roll, then the defence add or the perfect block, then the crit roll, then the weapon-constant formula with the crit multiplier) and the two crit chances. It omits the repeat rolls, defence-ignore stats, soulshot, abnormal, trait, weakness, attribute, PvP/PvE and random multipliers, race modifier, the immobile and rear multipliers, counterattack, reflect, absorb, the damage-taken multipliers and the DAMAGE_LIMIT cap, and the auto-attack damage formula (not read). Position stats, the CON bonus, the STR bonus and the height multiplier are passed in as numbers; the sketch wraps the facing angle (the donor does not), does not model `defence` carrying over between repeats, does not copy the integer-division bug, so the caller sets `heightMul` to 1 to match what the donor computes.

```ts
// Licence: MIT (donor, LICENSE.txt at the donor root). Written as our own sketch from the described formulas; not a line-by-line translation.
type Block = "none" | "shield" | "perfect";

interface Actor {
  level: number;
  pAtk: number;        // attacker physical attack
  levelMod: number;    // donor getLevelMod(), not read: passed in
  critDamage: number;  // crit damage stat (skill or auto-attack path)
  ranged: boolean;
}

interface Defender {
  level: number;
  pDef: number;
  defCritRate: number;     // defence crit-rate stat, already including the add term
  defCritDamage: number;
  shieldDef: number;
  shieldRate: number;
  conMul: number;          // donor BaseStat.CON.calcBonus(target), not read: passed in
  shieldArcAll: boolean;   // true when the shield covers all directions
}

const FRONT_ARC_DEG = 120;       // shield blocks only inside this arc, centred on the defender's facing
const RANGED_SHIELD_MUL = 1.3;   // ranged attacks face a higher shield block rate
const PERFECT_BLOCK_DAMAGE = 1;  // donor: a perfect block leaves the initial damage at 1

function rnd100(rand: () => number): number {
  return Math.floor(rand() * 100);
}

// angleOffDeg = absolute difference between the defender's facing and the bearing to the attacker, wrapped to 0..180
// (the donor takes a raw difference with no wrap, so it mis-blocks across 0/360).
function rollShield(d: Defender, attackerRanged: boolean, angleOffDeg: number, rand: () => number): Block {
  if (!d.shieldArcAll && angleOffDeg > FRONT_ARC_DEG / 2) return "none";
  let rate = d.shieldRate * d.conMul;
  if (attackerRanged) rate *= RANGED_SHIELD_MUL;
  if (!(rate > rnd100(rand))) return "none";
  return 100 - 2 * d.conMul < rnd100(rand) ? "perfect" : "shield";
}

// Auto-attack crit: positional multiplier times defence crit-rate (divided by 10) times height,
// plus a level term at level 78 and up, clamped to 3..97 percent.
function autoCritChance(a: Actor, d: Defender, posMul: number, heightMul: number): number {
  let rate = posMul * (d.defCritRate / 10) * heightMul;
  if (a.level >= 78 || d.level >= 78) rate += Math.sqrt(a.level) * (a.level - d.level) * 0.125;
  return Math.min(97, Math.max(3, rate)) / 100;
}

// Physical skill crit: skill crit value times stat bonus times rate bonus times defence factor, clamped to 5..90 percent.
function skillCritChance(skillCrit: number, statBonus: number, rateBonus: number, defenceMul: number): number {
  return Math.min(90, Math.max(5, skillCrit * statBonus * rateBonus * defenceMul)) / 100;
}

// Physical skill hit. Melee uses 77, ranged 70 and adds attack + power again for ranged.
function physicalDamage(
  a: Actor,
  d: Defender,
  block: Block,
  crit: boolean,
  power: number,
  pAtkMod: number
): number {
  if (block === "perfect") return PERFECT_BLOCK_DAMAGE;
  const defence = Math.max(1, d.pDef + (block === "shield" ? d.shieldDef : 0));
  const attack = a.pAtk * pAtkMod;
  const weaponMod = a.ranged ? 70 : 77;
  const rangedBonus = a.ranged ? attack + power : 0;
  const baseMod = (weaponMod * (attack * a.levelMod + power + rangedBonus)) / defence;
  const critMod = crit ? 2 * a.critDamage * d.defCritDamage : 1;
  return baseMod * critMod;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp copy) exited 0.

## 5. Lands in

- TARGET `src/fight/damage.ts` (the duel hit step: skill hit formula, crit, and the shield step). Parity-checklist row 1 (duel step / sim). The guard facing gate belongs to row 3 in the checklist; it is noted here, not listed as a second row.
- Frankendom's current file for this logic: (not read).
- Reuse tag: rewrite-from-idea (MIT; formula shape and constants, no code copied)
- Brief rule served: 1 (one combat core, two clients)

## 6. Gaps and risks

- The arc gate needs the defender's facing and the attacker's bearing in the same frame. Frankendom's server must compute both from its own state, not from the client camera, or the same strike can block on one screen and not on another.
- The donor's scale is Lineage 2's: attack and defence in the thousands, constants 77 and 70, crit as a percent chance. Frankendom needs its own scale; the constants and clamps are data fields, not copied values.
- The perfect block deals 1 damage in the donor (lines 131 and 137). Do not port: a block should not be a hit. If Frankendom wants a perfect block, it is a parry event (row 3) that ends the strike.
- The height crit bonus is always 1 as written (integer division, Formulas.cs 332). Do not port the expression. If height matters in 3D duels, write it with float arithmetic and a test that fails on the current form.
- The donor's own comment (PhysicalAttack.cs line 20) says 70 for melee; the code uses 77 (line 167). This note follows the code. Frankendom should take its constants from one data table, not from either comment.
- The damage formula multiplies many stats that are not read here (trait, weakness, attribute, PvP/PvE, random). Any port that copies only the formula will not match the donor's numbers; that is expected, but it must be stated in the test.
- Counterattacks run before damage in `doAttack` (line 4625). Frankendom must decide the order of counter and hit in the one ledger; the donor order is one option, not a rule.
- Not read: the auto-attack damage formula, the HP write and death in reduceCurrentHp, the defence-ignore and repeat logic, and the CON and STR bonus functions.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** Shield arc gate described as 'angle between heading and bearing > 60' but code is a raw absolute difference with no 360 wrap: Math.Abs(AngleDegreesTo(attacker) - ConvertHeadingToDegrees(heading)) > degreeside/2 (Formulas.cs:625). A defender facing 350 deg with attacker at 10 deg is treated as 340 off and never blocks. Sketch takes angleOffDeg as a ready, wrapped input so it silently fixes this while the Acceptance test (120 deg arc) is written as if the donor does it. All other lines/constants (77/70, 1.3, 120, perfect-block rule, 5-90/3-97 clamps, 1.1/1.3 position, height-bonus integer-division always 1, 0.22, DAMAGE_LIMIT) verified.

**Missed:** (a) `defence` is declared outside the repeat loop and never reset (PhysicalAttack.cs:94 vs 98-201): a perfect block sets defence=-1 and stays -1 for later repeats, and a later shield success then adds shieldDef to -1. (b) No wrap in the facing arc test (above). (c) A magic-skill branch of calcCrit (Formulas.cs:212-239) runs before the physical skill branch; note's 'skill path' covers only physical.
