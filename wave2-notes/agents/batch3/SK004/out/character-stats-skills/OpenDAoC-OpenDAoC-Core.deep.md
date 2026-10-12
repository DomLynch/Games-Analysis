# OpenDAoC-OpenDAoC-Core (character-stats-skills, cell 2)

Donor: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/propertycalc/StatCalculator.cs` | Licence: GPL-3.0 (repo `LICENSE`, "Version 3, 29 June 2007"); source headers (`gplheader.txt` line 6) say GPL-2.0 or later, so copyleft, clean-room only | C# | symbol `CalcValueInternal` and `ApplyDebuffs`

Checked: Read in full: `StatCalculator.cs` 1-222 (`CalcValueInternal` 46-80, `CalcValueFromBuffs` 84-105, `CalcValueFromItems` (not read past its signature), `ApplyDebuffs` 196-223). Read: `GamePlayer.cs` regen intervals (2313-2337), endurance tick (2375-2420), `CalculateMaxHealth` (2452-2474), `CalculateMaxMana` (2478-2515), `GetWeaponSkill` and `GetWeaponStat` (5474-5510); `GameLiving.cs` regen defaults (2448-2460) and callbacks (2510-2527); `StyleProcessor.cs` endurance cost (464-482, 487-505); `AttackComponent.cs` defence penetration (1136-1172). Callers of `ApplyDebuffs`: `CalcValueInternal` (67) and `CalculateBuffContributionToAbsorbOrResist` (234), both read. Callers of `CalcValueInternal` were not swept. Confidence: high for the ladder and the buff caps (the test vectors below ran on the VPS and match the hand arithmetic). Medium for the HP and mana formulas (read, not run against the Live tables). Not read: `CalcValueFromItems` body, base class HP (`CharacterClass.BaseHP` values), spec-level tables, the class base weapon skill table, the XP and level tables. camera_scope: not applicable (not camera).

Best transferable idea: Resolve a stat by stacking buffs first, then spend debuffs against buffs and base stats at three different exchange rates (spec debuff vs buff 2 per point, base debuff vs buff 1, any debuff vs base or item 0.5), with buff caps that rise with level.
Decision (proposed): adapt — keep the four-step ladder and the level-based buff cap as one engine function, but name the three rates as engine constants and use Frankendom's attributes (no luck, no dexterity-split). Drop the death constitution loss until Frankendom has a rule for it (row 17).
Acceptance: A server test: level 10 player, base 100, buff +30 (capped to 12), spec debuff -20 resolves to 93; base debuff -50 with buff 12 resolves to 81; no debuff with buff 12 resolves to 112.

## 1. Mechanism

- Entry: `CalcValueInternal(living, property, ignoreBuffsAndDebuffs)` (46). Order: (a) `baseStat = GetBaseStat(property)` (56); item bonus and ability bonus collected (57-68); (b) if not ignoring buffs: `buffBonus = CalcValueFromBuffs` (capped, see below), then `baseDebuff` and `specDebuff` are read as absolute values and `ApplyDebuffs` runs once (65-67); (c) `stat = baseAndItemStat + buffBonus + abilityBonus` (70); (d) if not ignoring buffs: `stat = (int)(stat x BuffBonusMultCategory1)` (74), then the constitution-lost-at-death debuff is subtracted for CON only (75); (e) `return Math.Max(1, stat)` (78).
- Buff caps (`CalcValueFromBuffs`, 84-105): players only. Base buffs capped at `(int)(level x 1.25)` (99); spec buffs capped at `(int)(level x 1.5 x 1.25)` (100). Monsters and pets have no cap (`short.MaxValue`). The buff sum is `baseBuff + specBuff` after the caps.
- Debuff ladder (`ApplyDebuffs`, 196-209): four steps in fixed order, each only when both sides are positive: spec debuff vs buff at modifier 0.5 (198-199); spec debuff vs base-and-item at modifier 2 (201-202); base debuff vs buff at modifier 1 (204-205); base debuff vs base-and-item at modifier 2 (207-208). The modifier is "stat points destroyed per debuff point" inverted: one debuff point consumes `stat x modifier` debuff to clear the stat. Modifier 0.5 means one debuff point removes two stat points (200 percent), modifier 2 means it removes half a point (50 percent). Per step (`ApplyDebuff`, 210-223): `remaining = debuff - stat x modifier` (212). If remaining > 0, the debuff keeps `(int)remaining` and the stat goes to 0 (214-218). Otherwise the stat loses `(int)(debuff / modifier)` and the debuff goes to 0 (219-223).
- Multiplier and death: the stat is multiplied by the buff multiplier category, truncated (74), then the death-lost constitution is subtracted for CON (75). Floor 1 (78).
- Max HP (`CalculateMaxHealth`, 2452-2474): `c = con - 50`; if negative, `c` doubles (2454-2455). `hp1 = BaseHP x level` (2461). `hp2 = hp1 x c / 10000` in integer arithmetic (2462). Champion HP added (2463-2465). `hp4 = 20 + hp1 / 50 + hp2 + hp3` (2466), then ExtraHP percent (2467), then floor 1.
- Max mana (`CalculateMaxMana`, 2478-2515): `maxPower = (int)(level x (manaStat + 145) / 41.0) + 5` (2513), floor 0. The comment block (about 2480-2499) says it was checked against in-game values from level 1 to 50 with mana stat 60 to 233.
- Player regen (`GetHealthAndPowerRegenerationInterval`, 2313-2321): interval = 6 s, minus 3 when sitting, plus 8 in combat, minus 1 more when both (2320). Endurance ticks every 1000 ms for players (2334-2336). Endurance tick (2375-2420): regen amount from the EnduranceRegenerationAmount modifier (2388), with sprint and long-wind deductions and a FatigueConsumption scaling when above 1 (not all branches read); it stops at max unless sprinting.
- Base living regen (`GameLiving.cs` 2448-2460, callbacks 2510-2527): 6 s out of combat, 30 s in combat (2451), overridden for players above.
- Weapon skill (`GamePlayer.GetWeaponSkill`, 5474-5478): `WS = Level x classBaseWS x 0.005 x (1 + weaponStat x 0.005) x Effectiveness`, floor 1 after multiplying by the WeaponSkill modifier x 0.01 (5476-5477). Weapon stat (`GetWeaponStat`, 5485-5510): DEX for staff, bows, thrown and shield (5492-5500); STR plus DEX halved for thrust, piercing, spear, flexible and hand-to-hand (5503-5508); STR otherwise (5512).
- Defence penetration (`AttackComponent.cs` 1167-1170): `specModifier = 1 + (spec level - target level) x 0.01`.
- Style endurance (`StyleProcessor.cs` 464-482): `fatCost = weaponSpd x style.EnduranceCost / 40`, plus 1 if the weapon speed is below 40 (477-480); battlemaster styles use a flat cost (within 464-482); result is `max(1, ceil(fatCost x FatigueConsumption x 0.01))`. A missed style halves the cost (498-503).

## 2. Key functions

- `CalcValueInternal` in `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/propertycalc/StatCalculator.cs` 46-80. The full stat pipeline.
- `CalcValueFromBuffs` in the same file (caps at 99-100 receipted; the function header line was not separately receipted). Caps by level.
- `ApplyDebuffs` and `ApplyDebuff` in the same file, 196-223. The four-step ladder.
- `CalculateMaxHealth` in `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameobjects/GamePlayer.cs` 2452-2474. HP from level and CON.
- `CalculateMaxMana` in the same file, 2478-2515. Mana from level and the mana stat.
- `GetWeaponSkill` and `GetWeaponStat` in the same file, 5474-5511.
- `ApplyEnduranceCost` and `CalculateEnduranceCost` in `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/styles/StyleProcessor.cs` 464-505.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Buffs stack and are capped by level | Base cap level x 1.25; spec cap level x 1.5 x 1.25 (theirs, StatCalculator.cs 99-100) |
| Debuffs spend against buffs first, at a rate per debuff type | Spec vs buff 0.5 (8); base vs buff 1 (9); vs base and item 2 (10) |
| Stat floors at 1 | Floor 1 (78) |
| HP grows with level and with CON above 50, doubles the penalty below 50 | CON offset 50 and doubling (2454-2455); divisor 10000 (2462); level/50 term (2466) |
| Mana grows with level and the mana stat | 145 offset, divisor 41, plus 5 (2513) |
| Regen interval by state, in seconds | 6 base; sitting -3; combat +8; both -1 (2320); NPC base 6 or 30 in combat (2451) |
| Weapon skill grows with level, weapon stat and class base | Factor 0.005 twice; weapon stat factor 0.005 (5476) |
| Endurance cost scales with weapon speed and style cost | Divisor 40; +1 below speed 40 (477-480); missed halves (503) |

## 4. TypeScript sketch

simplified: the sketch keeps the four-step debuff ladder in the donor order, the level-based buff caps, the multiplier and floor, and the HP formula. It omits the item and ability sources (they are inputs here), the `ignoreBuffsAndDebuffs` base path, the death-lost constitution (kept as an input only), champion and ExtraHP terms, mana, regen, and the weapon and endurance formulas. Fix: the donor computes `hp1 x c / 10000` and `hp1 / 50` in integer arithmetic (2462, 2466); the sketch keeps them as floating point and truncates once at the end. The test vectors above were run on the VPS with node after `tsc --strict --target es2020` exited 0.

```ts
// Licence: GPL-3.0 repo; source headers GPL-2.0 or later (donor). clean-room sketch written from the described mechanism, not a translation.
// Fix applied: HP uses floating-point division and truncates once at the end (donor integer division at GamePlayer.cs:2462 and 2466).

interface StatInput {
  level: number;
  isPlayer: boolean;
  baseAndItem: number;      // base stat plus item bonus
  ability: number;          // ability bonus (not debuffable here)
  baseBuff: number;         // base-category buff bonus
  specBuff: number;         // spec-category buff bonus
  baseDebuff: number;       // base-category debuff, positive magnitude
  specDebuff: number;       // spec-category debuff, positive magnitude
  buffMult: number;         // multiplier applied after buffs and debuffs
  deathConDebuff: number;   // constitution lost at death (CON only)
  isConstitution: boolean;
}

// Engine constants (donor StatCalculator.cs lines 8-10). A debuff point spent on a stat point
// is worth 1 / modifier of that stat: modifier 0.5 means 2 stat points per debuff point.
const SPEC_VS_BUFF = 0.5;   // spec debuff vs buff: 200 percent effective
const BASE_VS_BUFF = 1;     // base debuff vs buff: 100 percent effective
const VS_BASE_AND_ITEM = 2; // any debuff vs base or item stat: 50 percent effective

// One debuff against one stat. Returns the new debuff and stat values.
function applyDebuff(debuff: number, stat: number, modifier: number): { debuff: number; stat: number } {
  const remaining = debuff - stat * modifier;
  if (remaining > 0) return { debuff: Math.trunc(remaining), stat: 0 };
  return { debuff: 0, stat: stat - Math.trunc(debuff / modifier) };
}

// Four-step ladder in the donor's order: spec vs buff, spec vs base, base vs buff, base vs base.
function applyLadder(d: { base: number; spec: number; buff: number; stat: number }) {
  let { spec, buff, stat } = d;
  let base = d.base;
  if (spec > 0 && buff > 0) ({ debuff: spec, stat: buff } = applyDebuff(spec, buff, SPEC_VS_BUFF));
  if (spec > 0 && stat > 0) ({ debuff: spec, stat } = applyDebuff(spec, stat, VS_BASE_AND_ITEM));
  if (base > 0 && buff > 0) ({ debuff: base, stat: buff } = applyDebuff(base, buff, BASE_VS_BUFF));
  if (base > 0 && stat > 0) ({ debuff: base, stat } = applyDebuff(base, stat, VS_BASE_AND_ITEM));
  return { buff, stat };
}

// Buff caps only apply to players: base buffs up to level x 1.25, spec buffs up to level x 1.5 x 1.25.
function cappedBuffs(i: StatInput): number {
  if (!i.isPlayer) return i.baseBuff + i.specBuff;
  const baseCap = Math.trunc(i.level * 1.25);
  const specCap = Math.trunc(i.level * 1.5 * 1.25);
  return Math.min(i.baseBuff, baseCap) + Math.min(i.specBuff, specCap);
}

// Resolved stat for one character. Order: buffs (capped), debuffs (ladder), multiplier, death debuff, floor 1.
function resolveStat(i: StatInput): number {
  const buffs = cappedBuffs(i);
  const r = applyLadder({ base: i.baseDebuff, spec: i.specDebuff, buff: buffs, stat: i.baseAndItem });
  let stat = r.stat + r.buff + i.ability;
  stat = Math.trunc(stat * i.buffMult);
  if (i.isConstitution) stat -= i.deathConDebuff;
  return Math.max(1, stat);
}

// Max HP from level and constitution. Constitution below 50 counts double. Keeps the division as a float.
function maxHealth(baseHp: number, level: number, con: number): number {
  let c = con - 50;
  if (c < 0) c *= 2;
  const hp1 = baseHp * level;
  const hp2 = (hp1 * c) / 10000;
  const hp4 = 20 + hp1 / 50 + hp2;
  return Math.max(1, Math.trunc(hp4));
}

export {};
```

## 5. Lands in

- TARGET `src/fight/stats.ts` (new module): one resolver that every fight reads for attributes, buffs and debuffs, so the engine owns the stacking and the caps. Parity-checklist row 21 (catalogue fields): the attribute and buff fields with their caps are catalogue data; the three exchange rates are engine constants.
- Data fields (zone data vs engine constant) are listed in the JSON sidecar. Caps per level and the HP base per class are data; the rates and the floor are engine constants.
- Reuse tag: rewrite-from-idea (GPL-3.0 / GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine, server-verified stats); row 21

## 6. Gaps and risks

- Copyleft: clean-room only. The sketch is written from the mechanism, not translated.
- Donor has eight stats plus Acuity (`Enums/eProperty.cs` 13-22, 185). There is no luck stat, and none of the donor's stats is split into secondary pools. Frankendom's luck and stamina pools are not covered here.
- Defect 1: HP uses integer division (2462) and `hp1 / 50` (2466). Fix: floating point, truncate once (the sketch does this).
- Defect 2: the multiplier step truncates to int before the CON death debuff (74-75). Fix: apply the death debuff in the same rounding step, or keep the stat as float until the end.
- Risk: the death constitution loss (`TotalConstitutionLostAtDeath`, GamePlayer.cs 1662, 2131) is a permanent stat debuff. Frankendom's death and respawn ruling (row 17) decides whether this exists at all; do not port it without that ruling.
- Risk: buff caps depend on level, so an under-levelled character cannot stack buffs above level x 1.25 at all. This is the intended rule in the donor; Frankendom must decide whether the cap is a zone or encounter field.
- Gap: `CalcValueFromItems` body and the class base HP table were not read, so the item stacking and class HP values are not documented here.

Reuse tag: rewrite-from-idea (GPL-3.0 / GPL-2.0-or-later; clean-room only)
Brief rule served: 1 (one engine, server-verified stats); row 21

## SK table (stat and skill rows, donor numbers)

Donor has eight stats (STR, DEX, CON, QUI, INT, PIE, EMP, CHR) plus Acuity (`Enums/eProperty.cs` 13-22, 185). No luck stat (grep of Enums returned none). Magic: casting stat per class (`CharacterClass.ManaStat`), mana from `CalculateMaxMana`. Social skills and luck: not read.

| name | what it does | formula | number ranges | caps | file:line |
|---|---|---|---|---|---|
| Stat (eight, base plus items plus abilities) | base value of a stat | base + item + ability, then ladder, then multiplier | not read (per-class and per-race bases not read) | floor 1 | StatCalculator.cs:56-78 |
| Base and spec buffs | add to a stat | min(base buff, level x 1.25) + min(spec buff, level x 1.5 x 1.25) | level 1 to 50 | cap by level, players only | StatCalculator.cs:99-100 |
| Debuff ladder | removes stat points | four steps, rates 0.5, 1, 2 | rate per debuff point 2, 1, 0.5 stat points | none beyond the step rules | StatCalculator.cs:196-223 |
| Constitution lost at death | permanent CON debuff | subtracted from CON after the multiplier | value from GamePlayer.cs 1662 (not read in detail) | none read | StatCalculator.cs:75; GamePlayer.cs:1662 |
| Max HP | max health | 20 + hp1/50 + hp1 x c/10000, c = CON - 50 (double if negative) | CON 50 gives no CON term | floor 1 | GamePlayer.cs:2452-2474 |
| Max mana | max power | level x (stat + 145)/41 + 5 | level 1 to 50; stat 60 to 233 checked in comment | floor 0 | GamePlayer.cs:2478-2515 |
| Health regen (player) | HP per tick | interval 6 s; sit -3; combat +8; sit and combat -1 | 3 s to 14 s interval | stops at max | GamePlayer.cs:2313-2321 |
| Endurance regen (player) | endurance per second | tick 1000 ms; amount from modifier; sprint and long-wind deductions | per modifier (not read) | stops at max | GamePlayer.cs:2334-2420 |
| Weapon skill | attack skill | Level x classBaseWS x 0.005 x (1 + weaponStat x 0.005) x Effectiveness; floor 1 | level 1 to 50 | floor 1 | GamePlayer.cs:5474-5477 |
| Weapon stat | which stat drives skill | DEX (ranged, shield, staff); STR+DEX halved (thrust, spear); STR (others) | per weapon type | none | GamePlayer.cs:5485-5511 |
| Defence penetration | spec advantage | 1 + (spec level - target level) x 0.01 | per level gap | none read | AttackComponent.cs:1167-1170 |
| Style endurance cost | endurance per style use | fatCost = speed x cost/40, +1 if speed < 40; x FatigueConsumption | battlemaster flat cost | min 1; missed halves | StyleProcessor.cs:464-505 |
