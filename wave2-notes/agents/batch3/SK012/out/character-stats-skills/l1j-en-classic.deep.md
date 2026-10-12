# l1j-en-classic (character-stats-skills, cell 1)

Donor: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/` (Java; main files `utils/CalcStat.java`, `model/HpRegeneration.java`, `model/MpRegeneration.java`, `model/Instance/L1PcInstance.java`, `model/L1PcInventory.java`, `model/L1Character.java`, `model/L1Magic.java`, `model/L1WeaponSkill.java`, `model/L1Attack.java`, `clientpackets/C_SkillBuyOK.java`) | Licence: GPL-2.0-or-later (COPYING is GPL v2; the `CalcStat.java` header says "either version 2, or (at your option) any later version") | Java | symbols `CalcStat.calcStatHp`, `HpRegeneration.regenHp`, `L1PcInstance.levelUp`/`levelDown`

Checked: Read in full: `CalcStat.java` (252 lines), `HpRegeneration.java` (235), `MpRegeneration.java` (158), `L1PcInventory.calcWeight240`, `L1PcInstance.getMaxWeight`, the level-up/level-down code (3504-3570), the regen start/stop/state code (3081-3086, 3235-3270), `C_Attack`/`C_MoveChar` regen-state calls, `L1Character` stat getters and magic bonus table, `L1Magic` dice, coefficient and MR functions (lines 389-420, 659-760), `L1WeaponSkill` proc gate and damage (236-275, 400-410), `C_SkillBuyOK` tier costs and class gates (lines 40-236). Confidence: high for regen, per-level growth, weight and AC/MR; medium-high for the magic and proc formulas (read, but `calcMagicDiceDamage` tail after line 690 not read). Not read: the death/`Killed` path, `ExpTable` values, class feature files beyond the magic-level line, the armour set and item stat effects, any stamina or block/parry/crowd-control system (this donor has none that I found; not searched beyond the stat files). Camera: not applicable. camera_scope: not applicable.

Best transferable idea: a per-entity regen accumulator on a fixed 1 s tick where each action lowers only the next tick's points, with per-level pool gains that come from stat bonuses plus a class roll and are capped per class.
Decision (proposed): adapt - take the accumulator-with-action-penalty and the per-class capped level gain shape, with every number moved to catalogue data and the defects below fixed; the donor's exact curves are not copied. Why: Frankendom has stamina and HP pools with no per-level growth yet, and this is a small, testable engine step that fits the server tick.
Acceptance: a server test asserts that a player who attacks in a tick recovers exactly a quarter of an idle tick's regen points on the next tick, that a moving player recovers half, and that a level-up adds at most the class cap minus current max HP.

## 1. Mechanism

- Stats are stored per character. `setStr` keeps the uncapped value in `_trueStr` and stores the usable value clamped to 1..127 (`L1Character.java` 675-676). The same pattern is used for the other stats.
- Derived pools change only at level change, not every tick. On each level gained, `levelUp` runs a loop that adds `CalcStat.calcStatHp` and `calcStatMp` to the base max (`L1PcInstance.java` 3547 and its MP twin). HP gain per level = `max(CON-15, 0)` + a class base roll (Prince 11-12, Knight 17-18, Elf 10-11, Wizard 7-8, DarkElf 10-11, DragonKnight 13-14, Illusionist 9-10) + `originalHpup`, floored at 0 (`CalcStat.java` 105-106, 109, 115, 121, 127, 133, 139, 145, 151-155). The gain is cut so the base max never passes the class cap (`CalcStat.java` 117; caps in `config/charsettings.properties` 6-19). Then HP is set to max (`L1PcInstance.java` 3566) and MP to max on the next line.
- MP gain per level uses a WIS band for the roll size (`seedY` 2..5, `seedZ` 0..6, `CalcStat.java` 173-200) and a class multiplier: Prince x1, Knight x2/3, Elf x1.5, Wizard x2, DarkElf x1.5, DragonKnight x2/3, Illusionist x5/3 (lines 202-238), capped by the class MP max (Prince 800, Knight 600, Elf 900, Wizard 1200, DarkElf 900, DragonKnight 600, Illusionist 1100).
- Level-down (`levelDown`, 3504-3510) calls `calcStatHp(getType(), 0, ...)`: the base is passed as 0, so the cap is checked against the config max alone, and the amount removed is a fresh roll. It does not reverse the rolls made at level-up.
- Regen is a fixed-step accumulator. `HP_REGEN_INTERVAL` = 1000 ms, scheduled with `scheduleAtFixedRate` (`L1PcInstance.java` 143, 3236-3237). Each run: `_regenPoint += _curPoint; _curPoint = 4;` (`HpRegeneration.java` 68-69). A heal fires when `_regenMax <= _regenPoint * Config.RATE_HP_REGEN` (71), where `_regenMax = lvlTable[min(10, level) - 1] * 4` (85-90; table 82-83 = 30, 25, 20, 16, 14, 12, 11, 10, 9, 3; a Knight at level 30+ uses 2). `RateHpRegen = 2` in `config/rates.properties` line 7. Worked examples at the shipped rate: level 1 heals every 15 ticks (threshold 120, needs points >= 60); level 9 every 5 ticks; level 10 every 2 ticks.
- Heal amount on a fire (`regenHp`, 99-164): `bonus = rand(maxBonus) + 1`, where `maxBonus = 1` unless level > 11 and CON >= 14, then `CON - 12`, capped at 14 for CON > 25 (99-106, 110). Equipment HPR is added (108). `conHp = CON - 10`, min 1 (158-161). Total = bonus + equipment HPR + conHp (164). Location rates add more (126-138, house, inn, castle, elf tree, illusionist and dragonknight towns; `RATE_HP_*` values from `rates.properties`).
- Suppression gate (149-155): if food < 3, or `isOverWeight` (weight240 >= 120, line 218), or Berserkers, then `bonus` is set to 0 and positive equipment HPR is set to 0. The CON floor (`conHp`) is still added on that tick.
- Action-driven one-tick penalty: an attack calls `setRegenState(REGENSTATE_ATTACK)` (`C_Attack.java` 111; ATTACK = 1, `L1PcInstance.java` 137) and a move calls `setRegenState(REGENSTATE_MOVE)` (`C_MoveChar.java` 90; MOVE = 2, line 138). `setRegenState` forwards to `HpRegeneration.setState` (3085), which only lowers `_curPoint` (56-59): the NEXT tick adds 1 (attack) or 2 (move) instead of 4, then `_curPoint` resets to 4. A character that moves every second regens at half speed; an attack tick gives a quarter.
- MP regen: same pattern, threshold `64 <= _regenPoint * RATE_MP_REGEN` (135; `RateMpRegen = 1`, rates.properties 28), so 16 idle ticks = 16 s per regen. Gain = `baseMpr` (1; 2 at WIS 15-16; 3 at WIS >= 17, lines 53-59) + item MPR + `mpPluss`, plus buff/cooking/location adds (`MpRegeneration.java` 113-117). Food < 3 or overweight zeroes `baseMpr` (107-112).
- Weight: `getMaxWeight` = `150 * floor(0.6*STR + 0.4*CON + 1)` (`L1PcInstance.java` 1670-1673), times `1 + armour% + doll% + 0.04*(original STR and CON weight reduction)`, plus 180 if the DECREASE_WEIGHT skill is on, times `RATE_WEIGHT_LIMIT` (1.0 in `rates.properties` 92). `calcWeight240` (`L1PcInventory.java` 70-86) returns 240 when weight > max, else `round(weight*100/max * 2.4)`. Pickup is refused at 240 (115). Regen stops at weight240 >= 120, about half of max (HP line 218, MP 156).
- Level-up stat points: from level 51, one bonus point per level above 50 when `getLevel() - 50 > getBonusStats()`, and only while the six base stats sum to less than 210 (`L1PcInstance.java` 3560-3561). The cap is on the total of the six, not per stat.
- Derived combat values read from stats: AC = `10 - level/k`, where k = 8 (DEX <= 9), 7 (10-12), 6 (13-15), 5 (16-17), 4 (>= 18) (`CalcStat.java` 39-52), fed by BASE DEX (`L1PcInstance.java` 2506). MR = class base MR + `calcStatMr(total WIS)` (table 61-86, capped at 50 from WIS 24) + level/2 (2547). Hit = level + `strHit[STR-1]` + `dexHit[DEX-1]` + weapon/armour terms (`L1Attack.java` 376-390, tables 173, 178). Damage from STR is `strDmg[STR]` for melee and DEX is `dexDmg[DEX]` for bows (`L1Attack.java` 183, 220, 323).
- Magic: magic level is class-based for players (`L1PcInstance.java` 1666-1667): Wizard = `min(10, level/4)` (`classes/L1WizardClassFeature.java` 39), Elf = `min(6, level/8)` (`classes/L1ElfClassFeature.java` 39). Spell power = magic level + INT bonus (`L1Character.java` 968; INT table 1074-1078 for INT <= 50, `INT - 25` above, line 1082).
- Magic damage (`L1Magic.java`): dice sum (`calcMagicDiceDamage` 659-668, + `value`), + weapon magic-damage modifier for players (673-678), times the INT coefficient `max(1 - attrResist + max(INT + spByItem - 12, 1) * 3/32, 0)` (681-688; `INT_ADJUSTMENT = 12`, line 117), then times leverage/10 (`calcPcMagicDamage` 418; leverage default 10, line 110), then MR defence (396).
- MR defence for a player target (`calcMrDefense`, 738-760): MR <= 100: coefficient `1 - 0.01 * floor((MR - attacker magic hit)/2)` (743-750). MR > 100: `0.6 - 0.01 * floor((MR - hit)/10)` (746-752). NPC attacker: half damage when `MR >= rand(100)+1` (756-758).
- Weapon procs (`L1WeaponSkill.java`): proc gate `probability < rand(100)+1` returns 0 (242), so a proc fires when a roll of 1..100 is at or below the table probability. Damage (table mode): only set when `random_damage > 0`, `fix + rand(random) + 1` (271-274). INT mode (`getWeaponDamage` 402-410): `(INT + SP) * (mult*boost + berserk) + rand(INT + SP) * mult*boost`.
- Skill learning is purchase, not use. `C_SkillBuyOK`: each skill is a bit in a tier mask (1..128 per tier, 61-155). Tier price 100 / 400 / 900 Adena per skill (61, 94, 127). Class and level gates (164-224): for switch case 0 (inferred to be Prince from the CalcStat type order; not confirmed) tier 1 needs level 10, tier 2 needs level 20, and tier 3 is never sold; the other cases use level gates 8/16/24, 4/8/12 and 12/24 (tier 3 never in the last one), read from lines 187-224 without naming each class. GMs skip the gates (`!pc.isGm()`). Price = sum of unlocked tiers (234), paid from Adena (235-236). No use counter was found (not searched beyond this path).

## 2. Key functions

- `CalcStat.calcStatHp` `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/utils/CalcStat.java` 102-157: per-level HP gain with CON bonus, class base, class cap, floor at 0.
- `CalcStat.calcStatMp` same file 168-251: per-level MP gain with WIS bands and class multipliers.
- `CalcStat.calcAc` 39-53 and `calcStatMr` 61-87: DEX-to-AC and WIS-to-MR tables.
- `HpRegeneration.run` 63-79 and `regenHp` 94-190: accumulator tick and heal formula; `setState` 55-60; `isOverWeight` 210-219.
- `MpRegeneration.run` 125-142 and `regenMp` 52-123: MP accumulator tick and gain.
- `L1PcInventory.calcWeight240` 70-86 and `getMaxWeight` `L1PcInstance.java` 1670-1699.
- `L1PcInstance.levelUp` 3540-3580 and `levelDown` 3504-3514: per-level stat growth and bonus points.
- `L1Magic.calcMagicDamage` 389-402, `calcMagicDiceDamage` 659-690, `calcMrDefense` 738-760.
- `L1WeaponSkill` proc gate 236-275 and `getWeaponDamage` 402-410.
- `C_SkillBuyOK` 40-236.

## 3. Numbers vs mechanism

Stat table (name | what it does | formula | number ranges | caps | file:line)

| name | what it does | formula | number ranges | caps | file:line |
|---|---|---|---|---|---|
| STR | melee damage, hit, carry weight | damage via `strDmg[STR]` table; hit via `strHit[STR-1]`; max weight `150*floor(0.6*STR+0.4*CON+1)` | STR 1..127 (usable), `_trueStr` keeps the raw value | clamp 1..127 | L1Character.java 675-676; L1Attack.java 183, 382; L1PcInstance.java 1673 |
| DEX | AC, bow damage, hit | AC `10 - level/k`, k = 8/7/6/5/4 by DEX band (base DEX); bow dmg `dexDmg[DEX]`; hit `dexHit[DEX-1]` | DEX band table 39-52; dexHit table 178 | DEX > 60 uses dexHit[59] | CalcStat.java 39-52; L1PcInstance.java 2506; L1Attack.java 220, 323, 384 |
| CON | HP per level, regen floor, regen bonus, weight | HP/level `max(CON-15,0)`+class base; regen floor `CON-10` (min 1); regen bonus `rand(CON-12)+1` | HP/level CON bonus 0 at CON <= 15, e.g. +3 at CON 18; regen floor 1 at CON <= 9 (CON 10 gives 0), 15 at CON 25; regen bonus die 1 at CON <= 13, up to 14 | bonus die capped at 14 for CON > 25 | CalcStat.java 105-106; HpRegeneration.java 99-106, 158-164 |
| INT | spell power, magic coefficient, weapon-proc damage | SP = magic level + INT bonus; coefficient `max(1 - res + max(INT+sp-12,1)*3/32, 0)` | INT bonus table -2..13 (INT 0..50), INT-25 above | none found | L1Character.java 968, 1074-1082; L1Magic.java 117, 681-688 |
| WIS | MP per level, MP regen, MR | MP/level roll by WIS band x class; MP regen base 1/2/3 by WIS; MR table | MR table 0 (WIS <=14) to 50 (WIS >= 24); `mpPluss` = WIS-12 floored at 12 | MR 50 cap; mpPluss floor 12 (see defect D1) | CalcStat.java 61-87, 173-238; MpRegeneration.java 53-59, 113-117 |
| CHA | pet/summon budget (only use found) | `getCha()` + class add (Crown +6, Elf +12, Wizard +6) minus pet cost | (not read: numeric pet cost table) | (not read) | L1PcInstance.java 3429-3445 |
| LUCK | no luck stat in the server Java (one commented-out reference, `L1ItemInstance.java` 850) | - | - | - | - |
| HP regen (idle) | heal per fire | rate threshold `lvlTable*4 <= points*RATE`; points +4/tick (2 after move, 1 after attack) | 1 s tick; level 1 = 15 s, level 9 = 5 s, level 10 = 2 s at RateHpRegen 2 | food<3 / overweight / Berserk zero the bonus; CON floor still added | HpRegeneration.java 68-71, 82-90, 149-164; rates.properties 7 |
| MP regen | MP per fire | threshold 64 x RateMpRegen; gain = baseMpr + item + mpPluss | 1 s tick; 16 idle ticks per fire; gain ~13-15 at WIS <= 24 | food<3 / overweight zero baseMpr | MpRegeneration.java 107-135; rates.properties 28 |
| Carry weight | max weight, pickup block, regen block | max = 150*floor(...)*(1+bonuses)*RateWeightLimit | pickup refused at weight240 240 (over max); regen blocked at 120 (about half) | none beyond the 240 limit | L1PcInstance.java 1670-1699; L1PcInventory.java 70-86, 115; HpRegeneration.java 218 |
| Level | per-level HP/MP gain, level cap | ExpTable MAX_LEVEL 99 | 1..99 | MAX_LEVEL 99 | ExpTable.java (values not read) |
| Bonus stats | extra stat points | 1 per level above 50 while stat sum < 210 | levels 51..99 | total six-stat sum 210 | L1PcInstance.java 3560-3561 |
| Magic level | spell tier scale | Wizard min(10, lvl/4); Elf min(6, lvl/8) | 0..10 / 0..6 | 10 / 6 | classes/L1WizardClassFeature.java 39; classes/L1ElfClassFeature.java 39; L1PcInstance.java 1666-1667 |
| MR | magic resistance | class base + calcStatMr(WIS) + level/2; damage x (1 - 0.01 floor((MR-hit)/2)) up to MR 100, then x (0.6 - 0.01 floor((MR-hit)/10)) | MR 0..50+ (WIS) + level/2 | none; coefficient falls with MR | L1PcInstance.java 2547; L1Magic.java 738-752 |
| Skill tiers | skill purchase cost and gate | 100/400/900 Adena per skill per tier; class gate by level | levels 4..24 gates | tier 3 never for case 0 | C_SkillBuyOK.java 61-234 |
| Weapon procs | proc chance and damage | proc if probability >= rand(100)+1; dmg = fix + rand(random)+1 (table) or INT/SP formula | probability 0..100 (table) | none | L1WeaponSkill.java 242, 271-274, 402-410 |

Reusable algorithm | game constants (summary)
- A per-tick accumulator with a threshold and a one-tick action penalty (regen).
- A per-level pool gain = stat bonus + class roll, clamped to a class cap (HP, MP).
- Weight-to-stat limit as a ratio gate (weight240) that blocks regen and pickup.

## 4. TypeScript sketch

simplified: keeps the donor order for regen (add points, threshold check, heal = bonus (zero when blocked) + CON floor, then reset) and the per-level HP gain with the class cap. It omits: MP, weight, AC/MR, the `originalHpup`/`originalHpr` terms, the location and cooking rates, underwater and quest drains, the lifestream bonus, the Berserk and food gates as separate inputs (the sketch uses one `blocked` flag), level-down, and the knight level-30 table entry. Points per action are the donor values (4, 2, 1); the threshold table is the donor's first ten levels.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface RegenData {
  thresholdByLevel: number[]; // per level 1..10, before x4 (donor lvlTable)
  rate: number;               // global regen rate (donor RateHpRegen = 2)
  conFloor: number;           // flat heal added on every fire
  idlePoints: number;         // points per 1 s tick when idle (donor 4)
}

interface RegenState { points: number; nextPoints: number; }

// Donor setState: a mid-tick action lowers the points for the NEXT tick only (minimum wins).
function onAction(s: RegenState, actionPoints: number): void {
  if (s.nextPoints < actionPoints) return;
  s.nextPoints = actionPoints;
}

// One 1 s tick. Returns the heal when the accumulator crosses the threshold, else 0.
function regenTick(s: RegenState, d: RegenData, level: number, bonusRoll: number, blocked: boolean): number {
  s.points += s.nextPoints;
  s.nextPoints = d.idlePoints;
  const band = Math.min(level, 10) - 1;
  const need = d.thresholdByLevel[band] * 4;
  if (need > s.points * d.rate) return 0;
  s.points = 0;
  return (blocked ? 0 : bonusRoll) + d.conFloor;
}

interface LevelGrowth { classBase: number; conFrom: number; classCap: number; }

// HP gained on one level-up: CON bonus + class roll (roll is 0 or 1), clamped to the class cap.
function hpGainOnLevelUp(curMaxHp: number, con: number, g: LevelGrowth, roll: number): number {
  const conBonus = con > g.conFrom ? con - g.conFrom : 0;
  let gain = conBonus + g.classBase + roll;
  if (curMaxHp + gain > g.classCap) gain = g.classCap - curMaxHp;
  return gain < 0 ? 0 : gain;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/stats.ts` (new derived-stat module: per-level pools, regen accumulator, class caps as data). Parity-checklist row 21 (catalogue fields): the per-class and per-level numbers become catalogue fields, not code constants. The regen tick and action penalty would feed the stamina recovery rule under row 3 (guard/parry/stamina) if Strategy takes it; the row cited for this note is 21.
- Server tick sub-line (post-K item 3 / row 18): regen is a fixed 1 s step with a per-entity accumulator; the sketch matches that shape.
- Fast mobile fight fit: the 1 s regen tick is slow for a duel (a fire every 2-15 s at the shipped rate). The part that fits a fast fight is the one-tick penalty: an attack or a move changes only the next second's regen. The per-level HP and MP growth suits progression, not a duel.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine computes derived stats from data); licence rule 7 (copyleft, shape only)

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism. Numbers are facts about the donor and are cited.
- Zones as data: the regen location rates (house, inn, castle, tower towns) are zone-like multipliers. Frankendom should store them on the zone record, not in the engine.
- Frankendom has no level-down: the donor's level-down defect (D2) matters only if we add it. If we add it, keep a per-level gain ledger so up and down reverse exactly.
- The donor has no stamina. The one-tick action penalty is the only transferable action-to-regen rule here. It is a candidate for Frankendom stamina recovery (row 3), not a copy of anything in the donor.
- Defects found (keep the idea, fix the defect):
  - D1 `MpRegeneration.java` 113-115: `mpPluss = WIS - 12`, then `if (mpPluss <= 12) mpPluss = 12`. So every WIS from 12 to 24 gives the same +12. Fix: floor at 0 (`max(WIS - 12, 0)`) and make the curve data, so the WIS term has an effect below 25.
  - D2 `L1PcInstance.java` 3508-3510: level-down passes base max 0 and removes a fresh roll. Fix: pass the current base max, and remove the gains recorded for that level (a per-level ledger).
  - D3 `L1PcInventory.java` 77-79: `df.format(wpTemp)` discards its result (dead code; `Math.round` on line 80 does the work). Fix: delete the dead lines.
  - D4 `L1WeaponSkill.java` 271-274: fixed damage is dropped when `random_damage` is 0 (damage stays 0). Fix: `damage = fix + (random > 0 ? rand(random) + 1 : 0)`.
  - D5 `L1PcInstance.java` 3085: `setRegenState` calls `_hpRegen.setState` with no null check (the MP call above it has one). Whether `_hpRegen` can be null here was not checked. Fix: add the same guard.
  - D6 `MpRegeneration.java` 177-182: the WIS bands for MP roll size are not monotone (WIS 24 gives 5, 25-26 give 4, 27-28 give 5). Intent not checked. Fix: make the band a data table with a stated curve.
- Design choice to keep, not a defect: the CON floor (`conHp`, 158-164) still heals while overweight or hungry, so CON never reads as zero regen.
- Not read: `Killed`/death path, the `ExpTable` values, class feature files beyond the magic level, the armour and item stat effects beyond HPR/MPR, the `calcMagicDiceDamage` tail after line 690. Not searched: stamina, block, parry, crowd control. Luck: the only match in the server Java is a commented-out line (`L1ItemInstance.java` 850), so luck is not a stat in this donor.
- Frankendom rulings: the engine computes all pools (one engine); server verifies every heal and kill (server-verified); MAX_ATTACKERS = 3 is not in this donor. The per-tick accumulator must run on the server and the client must only display it.
