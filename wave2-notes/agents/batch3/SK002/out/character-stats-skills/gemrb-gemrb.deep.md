# gemrb-gemrb (character-stats-skills, cell 1)

Donor: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Scriptable/Actor.cpp` (data: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/unhardcoded/`) | Licence: GPL-2.0-or-later (SPDX header of Actor.cpp; REUSE.toml annotates the unhardcoded data with the same licence) | C++ | symbols `Actor::RefreshPCStats`, `Actor::LuckyRoll`, `Actor::GetSkill`, `Actor::HandleDamageTypeMods`

Checked: Opened Actor.cpp at the RefreshPCStats block (3025-3131), UpdateFatigue (3168-3207), GetConHealAmount (3152-3166), pcf_stat and the WIS/CON/DEX hooks (1194-1260), GetStat (441-460), GetWildMod and CastingLevelBonus (5243-5278), encumbrance and speed (5307-5377), GetMaxEncumbrance and GetAbilityBonus (10356-10376), GetSkill and GetSkillBonus (10379-10405, 11308 read in part), LuckyRoll (10854-10905), proficiency and combat details (6846-7050), initiative and attack roll (7446-7530), resistances (7714-7870), damage and difficulty (4290-4360), spell learn (6420-6440). Also ie_stats.h, Interface.cpp 3998-4012, and the data tables difflvls, luck, luckbon (pst), skillsta (iwd2), dmginfo. Confidence: high for LuckyRoll, skill gate, encumbrance, fatigue, resistance and initiative (read line by line). Not read: the 2E CON/STR tables (conmod, strength bonus), fatigmod/intoxmod/intoxcon/encmod/clasthac/wspecial/dwmods values (not in the box: the search covered unhardcoded/*/ by name and found only pst/luckbon.2da), GetMaximumAbility, ResetStats, Die/Killed, the rest of the 3E threat-range code, and GetXPLevel beyond its first branch. Half read: rules and data (engine side only; no netcode or client read).

## 1. Mechanism

- Two stat layers. `BaseStats` is what training, level-up and items write; `Modified` is the derived value. `GetStat` returns `Modified` (447). `RefreshEffects` calls `ResetStats` and then re-applies effects every refresh (2884-2887; ResetStats not read).
- Changing a base ability fires a property hook (`pcf_stat*`, 1194-1260). A value of zero or less either kills the actor (if the DEATH_ON_ZERO_STAT feature is on and no MinimumBaseStats effect is active) or sets the derived stat to 1 (1196-1201). The WIS hook adds a luck delta from a table at each change (1223-1227). In 3E mode the CON, DEX and WIS hooks instead adjust saves.
- `RefreshPCStats` runs once per refresh, in this order (3025-3131, read): RefreshHP; intoxication decay, which sets luck and morale penalties (3037-3050); morale recovery; attacks per round; Lore += INT and WIS lore bonuses (3104); `UpdateFatigue` (between 3104 and 3109, read); Luck += difficulty luck + intoxication luck (3109); CON hit-point regeneration (3112); thief skill bonuses from DEX and race.
- Fatigue is a clock. Party members gain one fatigue point per 4 in-game hours since last rest (3182-3184). Each refresh, CON-table recovery is subtracted and floored at 0 (3196-3200). Fatigue does not drain stamina: it adds a luck penalty from the luck master table (`luck.2da` names `fatigmod` keyed on the FATIGUE stat; 3203-3204) and a portrait icon plus a delayed complaint when the penalty is negative (3205-3216).
- Ability modifier (the 3E rule used by the helper): `value / 2 - 5` (10373-10375). The 2E path uses a table (`Interface::GetConstitutionBonus`, Interface.cpp 3998-4012, indexes `abilityTables->conmod`; not read).
- Skill value (iwd2 table, `skillsta`): derived skill points, plus the ability modifier only when the skill is trained (base points > 0) or its UNTRAINED flag is 1. DEX is left out and added by a separate table. Otherwise 0. Floored at 0 (10392-10405). The comment above the skillsta load (about line 2167) says this table is used in iwd2.
- Luck roll (`LuckyRoll`, 10854-10905): the roller's luck minus the opponent's luck (10860-10868) shifts each die; each die is clamped to 1..size (10887-10890). A natural 1 counts as a miss and a natural maximum as a hit (10881-10883). Under the critical flag, all misses return 1, all hits return the maximum (10897-10898), and a result that luck alone pushed to the maximum is held one below it (10902-10903).
- Attack roll and critical: the d20 is a critical-flagged LuckyRoll (7524); the 2E critical roll is `roll + IE_CRITICALHITBONUS + CriticalBonus` (7525). The 3E path compares to the weapon's crit range minus the crit bonus and re-rolls (7528-7535, read in part).
- Proficiency: stars = the proficiency stat masked and capped at STYLE_STAR_MAX (6848-6849). At zero stars, a per-class non-proficiency penalty applies in 2E (6865). Style bonuses are looked up by stars in tables (`GetWeaponStyleBonus`, `GetWSpecialBonus`); class to-hit comes from `clasthac` (7032).
- Initiative: `spdfactor = weapon Speed + speed` (7453); speed = minus the physical speed stat plus a star table value (7014-7017). Then `spdfactor = Clamp(spdfactor + LuckyRoll(1, 6, -4, LR_NEGATIVE), 0, 10)` (7456). The next attack time is `attack_round_size * spdfactor / (attacks * 10) + gameTime` (7459). So a lower spdfactor acts sooner, and luck (negated for this roll) helps.
- Encumbrance: max weight comes from the STR table (STR and STREXTRA, column 3; 10358), times the kit percent from `encmod` (10363), plus half again for the StrongBack feat (10365). Factor 1 within max (5312), factor 2 within twice max (5315, half speed), and a huge divisor beyond that (5324). Speed = rate / factor (5344). Hostile-side actors (EA above EA_GOODCUTOFF) skip the weight check and the division in 2E (5312, 5341).
- Resistance: `HandleDamageTypeMods` looks up the damage type in `DamageInfoMap` (from `dmginfo.2da`), then reads the resist stat (7834). 2E percent path: `resisted = trunc(damage * r / 100)` (7856); a resistance whose magnitude exceeds the stat maximum counts as 0. 3E flat path: `resisted += resistance` (7848). Damage = damage - resisted.
- Difficulty: when the attacker is on the hostile side (EA above the cutoff) and the damage is not flagged to ignore difficulty, damage is scaled by the difficulty DMG percent (4354-4356). The table row is DEFAULT 0, EASY -50, NORMAL -25, CORE 0, HARD 50, INSANE 100 (difflvls.2da row DMG).
- Mirror images: a hit is absorbed (damage = 0, one image lost) unless `LuckyRoll(1, images + 1, 0)` returns exactly 1 (4343-4349).
- Spell learning: a d100 LuckyRoll; a specialist school adds 15, other schools subtract 15 (6421-6426); the spell is refused when the roll exceeds the INT bonus from the table (6432).
- Caster level: base level plus a class bonus. Priest: `IE_CASTINGLEVELBONUSCLERIC` (5275). Mage: wild-surge mod plus `IE_CASTINGLEVELBONUSMAGE` (5278). The wild-surge mod for wild mages is rolled once from a table indexed by a random row (5257) and cached (5251). Defect: the cached call returns 0, not the cached value (5251-5252; the TODO at 5250 notes a reroll to 0).

## 2. Key functions

- `Actor::RefreshPCStats` 3025-3131 (read): the per-refresh order above.
- `Actor::UpdateFatigue` 3168-3207 (read): fatigue clock, CON recovery, fatigmod luck penalty.
- `Actor::LuckyRoll` 10854-10905 (read): luck-vs-opponent dice with critical guard.
- `Actor::GetSkill` 10379-10405 (read) and `Actor::GetSkillBonus` 11308 (read in part; DEX and race rows).
- `Actor::GetAbilityBonus` 10370-10376 (read): value / 2 - 5.
- `Actor::GetMaxEncumbrance` 10356-10366, `GetEncumbranceFactor` 5307-5325, `CalculateSpeedFromRate` 5337-5345 (read).
- `Actor::GetCombatDetails` and `GetProficiencyBonus` 6846-7050 (read in part); attack and initiative block 7446-7530 (read).
- `Actor::HandleDamageTypeMods` 7810-7860 (read); `Actor::Damage` difficulty and mirror images 4290-4360 (read in part).
- `Actor::GetWildMod` 5243-5268 and `CastingLevelBonus` 5270-5281 (read); spell learn 6420-6440 (read in part).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Stat = base + named effects, rebuilt each refresh | Hook on base change: zero stat dies or is held at 1 (1196-1201) |
| Luck is a real stat; the defender's luck subtracts from the roller's | Luck per die clamped 1..size (10887); crit guard (10902-10903) |
| Skill counts only when trained, else 0 | skillsta UNTRAINED flag per skill (iwd2 Move_Silently DEX 1; Open_Lock DEX 0) |
| Ability modifier from a value | value / 2 - 5 (3E rule, 10375); 2E uses a table (not read) |
| Fatigue = bucket count of elapsed time, minus recovery | 4 game hours per point (3182); fatigmod luck penalty (not in box) |
| Weight tiers by ratio to a max | x1, x2 (half speed), beyond x2 cannot move (5312-5324); kit percent (encmod, not in box) |
| Percent resist, with out-of-range values ignored | Damage type table (dmginfo.2da); 3E flat path (7848) |
| Difficulty as a damage percent on enemy-side hits | DMG row: -50 / -25 / 0 / 50 / 100 (difflvls.2da) |

## 3b. Stat and skill table (SK rows)

| name | what it does | formula | number ranges | caps (soft/hard) | file:line |
|---|---|---|---|---|---|
| Ability scores STR, INT, WIS, DEX, CON, CHR | base scores; set via hooks | stored in BaseStats; derived in Modified | 0 is the zero-stat case; top value not read (GetMaximumAbility) | hard: maximum_values per stat = abilityMax (1772-1776 area, read); zero or less dies or is held at 1 | ie_stats.h:257-263; Actor.cpp:1196-1201 |
| Ability modifier (3E) | bonus from a score | value / 2 - 5 | score 3 gives -4, 18 gives +4, 25 gives +7 (computed from the formula) | none | Actor.cpp:10370-10376 |
| Luck | roll bonus; enters every LuckyRoll | Luck minus opponent Luck | difficulty luck row is 0 in every column (difflvls.2da LUCK row); WIS table: 0 below 15, +1 at 15-17, +2 at 18-24, +3 at 25 (pst/luckbon.2da) | none in code read | Actor.cpp:1223-1227, 10868; ie_stats.h:252 |
| Fatigue | tired state; luck penalty | +1 per 4 game hours since rest; recovery per CON row each refresh | fatigmod table (not in box) | floor 0 (3197-3200) | Actor.cpp:3182-3205 |
| Intoxication | drunk state | -1 per RECOVERY_RATE (CON row, capped at 100) | intoxmod and intoxcon not in box; portrait icon at 50+ | none | Actor.cpp:3037-3050 (read; exact lines of the portrait icon not receipted) |
| Morale | fear and resolve | neutral at 10; +/-1 per MORALERECOVERYTIME ticks | intox morale table (not in box) | none in code read | Actor.cpp:3050-3067 (read in part) |
| HP max | health pool | per-level roll plus CON bonus up to maxLevelForHpRoll per class (RefreshHP) | class table not read | maxLevelForHpRoll cap | Actor.cpp:2915-2960 (read in part) |
| HP regen (out of combat) | slow heal | table value times ticks per second; +1 HP each interval | CON row for STAT_CON_HP_REGEN (not in box); 0 in 3E (Interface.cpp 4001-4002) | none | Actor.cpp:3152-3162, 3112-3114 |
| Carry weight max | encumbrance | STR table (col 3, with STREXTRA), times (100 + kit %)/100, plus half for StrongBack | STR and encmod not in box | none | Actor.cpp:10356-10366 |
| Encumbrance tier | speed penalty | 1 within max; 2 within 2x max; else huge divisor | tiers only | cannot move beyond 2x | Actor.cpp:5307-5325 |
| Movement speed | walk speed | rate / encumbrance factor (hostile 2E skip) | rate from moverate table | 0 when cannot move | Actor.cpp:5337-5345 |
| Skill value (iwd2) | any skill check | stat + ability if trained or UNTRAINED=1; DEX via table; floor 0 | e.g. Move_Silently DEX, UNTRAINED 1; Open_Lock DEX, UNTRAINED 0 (iwd2/skillsta.2da line 13) | floor 0 | Actor.cpp:10392-10405 |
| Lore | knowledge bonus | GetLoreBonus(INT) + GetLoreBonus(WIS) | table not read | none | Actor.cpp:3104 |
| Proficiency stars | weapon skill tier | stat masked, capped at STYLE_STAR_MAX | star max not read | STYLE_STAR_MAX | Actor.cpp:6846-6851 |
| Non-proficiency penalty | penalty at zero stars (2E) | per-class table value | table not in box | none | Actor.cpp:6865 (read in part) |
| To-hit | attack chance | weapon THAC0 bonus + proficiency + clasthac class bonus, then d20 | clasthac, wspecial not in box | none | Actor.cpp:6980-7032, 7524 |
| Critical | crit chance | 2E: roll + IE_CRITICALHITBONUS + CriticalBonus; 3E threat range | threat range from weapon | crit-immune flag | Actor.cpp:7525 |
| Initiative | turn order | 1d6 minus 4 with negated luck, plus weapon speed and speed term; clamp 0-10 | 0 to 10 | hard clamp 0 and 10 | Actor.cpp:7453-7459 |
| Damage bonus | melee and ranged damage | item bonus + DAMAGEBONUS + dual-wield + style bonus + favored-enemy | table values not read | none | Actor.cpp:6980-7012 (read in part) |
| Difficulty damage | enemy hits scale | DMG percent when attacker is hostile-side | -50, -25, 0, 50, 100 | none | Actor.cpp:4354-4356; difflvls.2da row 4 |
| Percent resistance (2E) | damage type resist | trunc(damage * r / 100) | r out of stat max counts as 0 | |r| > stat max ignored | Actor.cpp:7834-7856 |
| Flat resistance (3E) | damage type reduction | resisted += resistance | flat values not read | none | Actor.cpp:7848 |
| Mirror images | absorb count | one hit absorbed unless LuckyRoll(1, n+1) == 1 | per n | count-limited | Actor.cpp:4343-4349 |
| Spell learn chance | learn a spell | d100 LuckyRoll; school +15 or -15; fail above INT bonus | INT table not read | none | Actor.cpp:6421-6432 |
| Caster level (priest / mage) | spell power | base level + class casting-level stat (+ wild-surge mod for wild mages) | wild-surge table not read | none | Actor.cpp:5275-5278 |
| Wild-surge mod | random caster level shift | one roll per cast from wmLevelMods; cached | table not read | defect: repeat call returns 0 (5251-5252) | Actor.cpp:5243-5267 |
| Damage type table | damage types and chunking | per type: resist stat, chunking threshold | FIRE 8 / CHUNKING 5; CRUSHING CHUNKING 8 | none | unhardcoded/shared/dmginfo.2da line 8 |

Not read in this donor (say so, do not invent): stamina and stance economy, block/parry/riposte windows, poise and stagger ladders, hit location and bleed, armour per slot and wear, XP curves (GetXPLevel and the level table), respec, CHR use (pcf_stat_cha only sets the stat), magic school list (only the damage-type table was read). Frankendom must source these from other donors.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's rules (3E ability modifier, trained-only skill, luck-vs-opponent dice with the crit guard, fatigue bucket count, weight tiers, percent resist, zero-stat clamp). It omits the 3E threat-range path, the DEX skill table, morale, intoxication, Lore, proficiency stars, the difficulty percent, mirror images, the spell learn roll, and the data-table lookups (they become parameters). It FIXES the wild-surge defect: the donor returns 0 on a repeat call; the sketch returns the cached value. It also drops the donor's fatigue portrait and complaint timer.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch from the described rules, not a translation of the donor lines.
export type Ability = "str" | "dex" | "con" | "int" | "wis" | "chr";
export type Rng = (size: number) => number; // returns an integer 1..size

// Ability modifier, the 3E-style rule: value / 2 - 5 (C integer division; scores are >= 0).
export function abilityMod(value: number): number {
  return Math.trunc(value / 2) - 5;
}

// Skill value: derived points plus the ability modifier, but only once trained (base points > 0) or when the
// skill is free-use. An untrained, non-free skill is 0. DEX (modAbility null) is added by a separate table.
export function skillValue(basePoints: number, derivedPoints: number, modAbility: number | null, freeUse: boolean): number {
  let ret = derivedPoints;
  if (basePoints > 0 || freeUse) {
    if (modAbility !== null) ret += modAbility;
  } else {
    ret = 0;
  }
  return Math.max(0, ret);
}

// Luck-weighted roll. Defender luck counts against the roller; each die is shifted by luck and clamped to 1..size.
// Natural 1s and natural maxima are counted first, so a critical can still come out as 1 or the maximum.
export function luckyRoll(
  rng: Rng, luck: number, oppLuck: number, dice: number, size: number, add: number,
  opts: { negative?: boolean; critical?: boolean } = {},
): number {
  let l = luck - oppLuck;
  if (opts.negative) l = -l;
  if (dice < 1 || size < 1) return Math.max(1, add + l);
  let result = 0;
  let misses = 0;
  let hits = 0;
  for (let i = 0; i < dice; i++) {
    const natural = rng(size);
    if (natural === 1) misses++;
    else if (natural === size) hits++;
    result += Math.min(size, Math.max(1, natural + l));
  }
  if (opts.critical && dice === misses) return 1;
  if (opts.critical && dice === hits) return size * dice;
  if (opts.critical && result + add >= size * dice) return size * dice - 1; // luck alone cannot make a crit
  return result + add;
}

// Fatigue: one point per 4 game hours since the last rest, counted by bucket boundaries.
export function fatigueGained(elapsedNow: number, elapsedAtLastCheck: number, hourTicks: number): number {
  const period = 4 * hourTicks;
  return Math.floor(elapsedNow / period) - Math.floor(elapsedAtLastCheck / period);
}

// Weight tiers: 1 = full speed, 2 = half speed, a huge divisor = cannot move. Hostile side (2E) ignores weight.
export function encumbranceFactor(carried: number, maxCarry: number, hostile: boolean, threeE: boolean): number {
  if (carried <= maxCarry || (hostile && !threeE)) return 1;
  if (carried <= maxCarry * 2) return 2;
  return 123456789;
}

export function movementRate(rate: number, factor: number, hostile: boolean, threeE: boolean): number {
  if (hostile && !threeE) return rate;
  return Math.trunc(rate / factor);
}

// Percent resistance (2E style): resisted = trunc(damage * pct / 100). Out-of-range values count as 0.
export function percentResist(damage: number, resistPct: number, maxAbs: number): number {
  const r = Math.abs(resistPct) > maxAbs ? 0 : resistPct;
  return damage - Math.trunc((damage * r) / 100);
}

// Ability set to zero or less: death if the rule is on and the actor has no minimum-stat effect, else held at 1.
export function clampAbility(value: number, deathOnZero: boolean, minimumEffect: boolean): { value: number; dead: boolean } {
  if (value > 0) return { value, dead: false };
  if (deathOnZero && !minimumEffect) return { value, dead: true };
  return { value: 1, dead: false };
}

// Wild-surge level offset: rolled once per cast and reused on every later call in that cast.
// fix: the donor returns 0 on the repeat call (its TODO says so); this sketch returns the cached value.
export interface CastState { wildMod: number | null; }
export function wildMod(st: CastState, rng: Rng, table: number[][], level: number): number {
  if (st.wildMod !== null) return st.wildMod;
  const lvl = Math.min(Math.max(level, 1), table[0].length);
  const row = rng(table.length) - 1;
  st.wildMod = table[row][lvl - 1];
  return st.wildMod;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (work/gemrb-stats.ts copied to /tmp/sk002-gemrb-stats.ts).

Best transferable idea: a luck-weighted d20 where the defender's luck subtracts from the attacker's, with a critical guard so luck alone can never turn a normal result into a maximum-roll crit.

Decision (proposed): adapt - take the opponent-luck roll and the critical guard, but express luck as a fight-table stat (src/fight/stats.ts) that the server rolls, and drop the per-game tables and the fatigue clock (we have stamina for fight fatigue). Fix: the wild-surge repeat-call defect is fixed in the sketch; the WIS luck comment (1223) disagrees with the pst table (15-17 = +1, 18-24 = +2, 25 = +3): fix: trust the table and correct the comment in our catalogue.

Acceptance: a server test seeds 10,000 rolls for a luck +3 attacker against a luck 0 defender and asserts a measurable hit-rate shift, that a natural 1 always misses and a natural maximum always crits under the critical flag, and that no luck value turns a non-natural result into a crit.

## 5. Lands in

- TARGET `src/fight/stats.ts` (new module: ability and derived stat catalogue, skill gate, luckyRoll, weight tiers, percent resist). Parity-checklist row 21 (catalogue fields): the stat and skill rows become fields in the catalogue; the server owns the RNG and the roll.
- Also touches row 18 (server tick / loot-and-XP award) only through the initiative clamp, which is a per-turn server value. Not claimed as a separate row.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only, shape and numbers as data)
- Brief rule served: one engine, zones as data (the numbers are catalogue rows, not constants in code); server-verified (the roll is the server's)

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the described rules and the donor's numbers are data rows, not code.
- Luck and opponent: Frankendom has MAX_ATTACKERS = 3. The donor subtracts one opponent's luck per roll. With three attackers on one defender, the rule must say whether each attacker's roll uses the defender's luck once (per attacker) or the group's average. The donor does not answer this.
- Weight and fatigue do not map to our rulings: the donor's 4-hour fatigue clock is game time, not fight time. Fight fatigue is stamina (checklist row 3). Keep the weight tier idea only for zone travel, as data.
- The hostile-side exemption (weight and damage difficulty skipped or scaled by alignment) is a 2E design choice. It conflicts with one ledger and with the rule that the server decides outcomes; reject that part unless it becomes a data field per zone.
- The skill gate (trained or free-use) fits weapon and skill rows; the DEX-by-table split is awkward and should be one catalogue rule.
- The donor's numbers come from PST, iwd2 and 2E tables with different rules. The sketch's abilityMod is the 3E rule; a Frankendom catalogue must pick one scale and say so.
- Missing from this donor (not read): stamina, block, parry, roll, stagger, hit location, armour slots, XP curve. Frankendom needs other donors for these.

---
