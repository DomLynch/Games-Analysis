# alexbatalov-fallout2-ce (character-stats-skills, cell 2)

Donor: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/stat.cc` (with `skill.cc`, `skill_defs.h`, `stat_defs.h`, `random.cc`, `combat.cc` 4520-4640, `item.cc` 1596-1630) | Licence: Sustainable Use License 1.0 (`LICENSE.md` in the repo root: use and distribution only for internal business, non-commercial or personal use, free of charge; not an OSI licence) | C++ | symbols `critterUpdateDerivedStats`, `critterGetStat`, `skillGetValue`, `skillRoll`, `randomRoll`, `pcAddExperienceWithOptions`, `armourDamage` path in `combat.cc`

Checked: Opened stat.cc (42-60 table; 182-392 critterGetStat; 393-438 base and bonus getters; 554-580 derived stats; 654-676 XP curve; 708-724 statRoll; 725-760 XP gain), skill.cc (30-96 table and struct; 230-275 skillGetValue; 291-330 skillAdd; 355-375 cost; 452-481 skillRoll; 506-545 XP per use; 546-610 First Aid; 1113-1143 difficulty modifier; 1144-1182 use slots), random.cc (85-130), combat.cc (4505-4640 damage with DT and DR), item.cc (1596-1630 throw range), stat_defs.h, skill_defs.h. Confidence: high for the derived stats, the skill formula, the d100 check, the XP curve and the DT/DR order (read line by line). Medium on one reading: skillUse passes the critical chance (which includes Luck) as the check modifier (skill.cc 567 and 477-478), so Luck seems to count twice in First Aid. Not read: perk.cc and the perk skill-modifier bodies; trait bodies (traitGetStatModifier, traitGetSkillModifier); the hit-chance function in combat.cc (not located); the ammo DR/DT modifiers and the GLOVZ and YAAM damage branches; Repair, Doctor and Steal bodies (only their use-slot checks); weapon strength requirements in item proto; XP for kills. Half read: rules and data tables (the game data files are not in the box). camera_scope: n/a.

## 1. Mechanism

- Two layers again. `critterUpdateDerivedStats` (554-577) writes the derived values into the prototype's base-stat array from the SPECIAL values. `critterGetStat` (182-370) then returns base (trait-modified for the dude, 186), plus bonus stat (187), then two adjustments: overweight costs action points (197-199) and, in combat, armour class gets unarmed evade and AP terms (204-241, only when it is not that critter's turn, 205); then dude-only perk adjustments (246-368); then a clamp to the stat table's min and max (369).
- Derived formulas (554-577, read): max hit points = STR + 2 x END + 15, with STR and END read from the trait-modified base, not the perk-modified value (567); max action points = AGI / 2 + 5 (568); armour class = AGI (569); melee damage = max(STR - 5, 1) (570); carry weight = 25 x STR + 25 (571); sequence = 2 x PER (572); healing rate = max(END / 3, 1) (573); critical chance = LUCK (574); radiation resistance = 2 x END (576); poison resistance = 5 x END (577).
- Overweight (197-199): when carry weight minus inventory weight is negative, AP lose `trunc(over / 40) + 1`. So AP are a carry-capacity stat in the donor.
- Perk stat hooks, dude only (read, numbers from the code): Gain Strength, Perception, Endurance, Charisma, Intelligence, Agility and Luck each add +1 (252 and following). Alcohol and Autodoc HP perks add +2 or +4 and -2 or -4 to max HP. Dermal impact armour adds 5 (or assault enhancement 10) to damage resistance. Phoenix implants add 5 (or 10) to laser, fire and plasma resistance. Vault City inoculations add 10 to radiation and poison resistance. Adrenaline Rush adds +1 STR while HP is below half of max (257).
- Skill value (230-275): if the base points are negative, return them. Otherwise `default + statModifier x (stat1 + stat2) + base points x baseValueMult` (248). For the dude only: a tagged skill adds base points x multiplier again and +20, except the fourth tag when the Tag perk is held (252-255); then trait and perk skill modifiers, and the game-difficulty modifier (259-261). Capped at 300 (264).
- Game-difficulty skill modifier (1113-1143): for twelve listed skills (First Aid, Doctor, Sneak, Lockpick, Steal, Traps, Science, Repair, Speech, Barter, Gambling, Outdoorsman), hard subtracts 10 (1131) and easy adds 20 (1133). Other skills get 0.
- Skill cost (skillAdd 291-330, skillsGetCost 355-375): unspent skill points buy +1 at the current value's tier: 1 point below 101, 2 at 101-125, 3 at 126-150, 4 at 151-175, 5 at 176-200, 6 at 201 and up (357, 365; intermediate tiers read). A skill at 300 cannot be raised (skillAdd returns -3 at 300).
- Skill check (skillRoll 452-481): for the dude, if the best party member in that skill is a different character and that character's best skill is this one, that character rolls instead (skill.cc 452-466, read); Steal is excluded from this substitution (458). The check is `randomRoll(skillValue + modifier, critical chance)` (477-478). Steal gets +30 while sneaking (skill.cc 472).
- d100 roll (random.cc 85-130): `delta = difficulty - d100` (87). If delta is below 0 the roll fails; a second d100 at or below `-delta / 10` is a critical failure (115). If delta is 0 or more the roll succeeds; a second d100 at or below `delta / 10 + critical modifier` is a critical success (124). The critical bands are open only once `gameTime / GAME_TIME_TICKS_PER_DAY >= 1` (113, 122), unless the sfall option removes the limit. So the first game day has no criticals.
- Stat check (statRoll 708-724): `chance = d10` (1..10, 711); success when `chance <= stat + modifier` (717). No clamp: a value of 10 or more always passes.
- XP and level (stat.cc 662-672, 725-760): the XP for level L is `1000 * (L/2) * L` for odd L and `1000 * (L/2) * (L-1)` for even L (668-672). Read by hand, both branches equal 1000 x L(L-1)/2, so the total XP thresholds are 1000, 3000, 6000, 10000, 15000, 21000, 28000, 36000, 45000 for levels 2 to 10. The level cap is 99 (664). Each XP gain adds Swift Learner rank x 5 percent (737) and then levels up while XP reaches the next threshold (750).
- Skill XP per use (506-545): `xpToAdd = successes x experience` (527), with the skill's experience from its table row (Doctor 50, First Aid 25, Lockpick 25, Steal 25, Traps 25, Outdoorsman 100, others 0 in the rows read). For flagged skills (Lockpick, Steal, Traps), a negative critical modifier adds its absolute value (524).
- Use cap (1144-1182 and the three callers 575, 676, 866): First Aid, Doctor and Repair get three use slots per skill. A new use is refused while all three are used and the oldest is within 24 game hours (1153-1154). Otherwise the oldest slot is shifted out.
- First Aid (skill.cc 560-610, read): the Healer perk sets min heal = 4 x rank (562) and max heal = 10 x rank (563). A robotic target always fails (603). On success the heal is `randomBetween(min + 1, max + 5)` (610), so 1 to 5 HP with no Healer perk. The check's modifier is the critical chance (Luck plus the caller's modifier, 567).
- Armour and damage (combat.cc 4527-4612, read): damage type sets which threshold (DT) and resistance (DR) to read, `STAT_DAMAGE_THRESHOLD + type` and `STAT_DAMAGE_RESISTANCE + type` (4527-4528). For a DAM_BYPASS hit that is not EMP damage, DT and DR are both scaled to 20 percent (4530-4532; EMP skips the scaling). Otherwise a weapon with the penetrate perk (or penetrating unarmed) scales DT to 20 percent (4537). When the dude is the attacker and has the Finesse trait, the TARGET's damage resistance gets +30 on the non-bypass path (combat.cc 4540-4541, read): Finesse makes the dude's own hits weaker, it is not armour for the dude. Then in the default branch: DR is raised by the ammo modifier and clamped to 0..100; the damage is weapon damage + bonus, times the ammo multiplier, divided by the ammo divisor, then halved (a TODO asks why, 4600), times the combat difficulty percent (100 default; 75 easy and 125 hard for enemies, 4556, 4559), divided by 100 (4603), minus DT (4606), and then if still above 0, minus `damage x DR / 100` (4609). Only positive results are added.
- Throw range (item.cc 1596-1630, read): effective STR = STR + 2 x Heave Ho rank, capped at PRIMARY_STAT_MAX = 10 (1613, 1617; the cap is an sfall fix per the comment), and throw range = min(weapon range, 3 x effective STR) (1624).

## 2. Key functions

- `critterUpdateDerivedStats` stat.cc 554-577 (read): derived formulas.
- `critterGetStat` stat.cc 182-370 (read, perk block read in part): the stat pipeline and the clamp.
- `skillGetValue` skill.cc 230-275 (read): skill formula, tag, trait, perk and difficulty terms, cap 300.
- `skillAdd` / `skillsGetCost` skill.cc 291-375 (read): point cost tiers.
- `skillRoll` skill.cc 452-481 and `randomRoll` / `randomTranslateRoll` random.cc 85-130 (read): the d100 check.
- `statRoll` stat.cc 708-724 (read): d10 stat check.
- `pcGetExperienceForLevel` / `pcAddExperienceWithOptions` stat.cc 662-760 (read): XP curve and level-up loop.
- `skillUse` / `_show_skill_use_messages` / `skillGetFreeUsageSlot` skill.cc 506-610, 1144-1182 (read in part): XP per use, use cap, First Aid heal.
- Damage with DT and DR: combat.cc 4505-4640 (read in full for the armour part).
- `critterGetWeaponRange`-style throw range: item.cc 1596-1630 (read).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Derived stats are simple linear formulas of a few base stats | HP = STR + 2 x END + 15; AP = AGI / 2 + 5; carry = 25 x STR + 25 |
| Overload costs a resource in steps | AP lost = trunc(over / 40) + 1 |
| Skill = default + linear stats + invested points x multiplier, capped | default 0 to 5; stat multipliers 2 to 5; cap 300 |
| Pick a skill as a tag for a bonus | +20 and doubled point term; fourth tag excepted with the Tag perk |
| Cost to raise rises by tier | 1 / 2 / 3 / 4 / 5 / 6 points at 0-100 / 101 / 126 / 151 / 176 / 201+ |
| Check = skill value vs d100; crit band from the margin | margin / 10 percent crit band; critical bands gated by the first game day |
| Armour: flat threshold, then percent | DT subtracted first, then DR percent; 20 percent of both for bypass |
| Difficulty scales enemy damage | 75 / 100 / 125 percent |
| Uses per window | 3 uses, 24 game hours |
| Level curve by triangular sums | 1000 x L(L-1)/2 total XP |

## 3b. Stat and skill table (SK rows)

| name | what it does | formula | number ranges | caps (soft/hard) | file:line |
|---|---|---|---|---|---|
| SPECIAL (STR, PER, END, CHA, INT, AGI, LUCK) | base stats, 1 to 10 | stored base + trait modifier + bonus | 1 to 10 (PRIMARY_STAT_MIN/MAX) | hard 1..10 in table (stat.cc 43-49) | stat_defs.h:7-10; stat.cc:42-49 |
| Max HP | health pool | STR + 2 x END + 15 | roughly 18 to 45 at SPECIAL 1-10 (computed) | table 0..999 | stat.cc:567; table row 50 |
| Max AP | action points per turn | AGI / 2 + 5 | 5 to 10 at AGI 1-10 (computed) | table 1..99 | stat.cc:568; table row 51 |
| Armour class (base) | defence | = AGI, plus unarmed evade in combat | 1 to 10 base (computed) | table 0..999 | stat.cc:569, 204-241 |
| Melee damage | melee bonus | max(STR - 5, 1) | 1 to 5 at STR 1-10 (computed) | table 0..500 | stat.cc:570 |
| Carry weight | capacity | 25 x STR + 25 | 50 to 275 at STR 1-10 (computed) | table 0..999 | stat.cc:571 |
| Overweight AP loss | AP cost of carrying too much | -(trunc(over/40) + 1) | 1 per 40 weight over, plus 1 | none | stat.cc:197-199 |
| Sequence | initiative order | 2 x PER | 2 to 20 (computed) | table 0..60 | stat.cc:572 |
| Healing rate | rest heal | max(END / 3, 1) | 1 to 3 (computed) | table 0..30 | stat.cc:573 |
| Critical chance | crit band and luck | = LUCK | 1 to 10 base | table 0..100 | stat.cc:574; table row 58 |
| Better criticals | crit damage | base 0 | -60 to 100 | table -60..100 | stat.cc:59 |
| Radiation / poison resistance | resists | 2 x END / 5 x END | 2-20 and 5-50 (computed) | table 0..100 | stat.cc:576-577 |
| Damage threshold (DT) per type | flat reduction | armour value per type | per item (not read) | threshold x 20 percent on bypass or penetrate | combat.cc:4527, 4531, 4537 |
| Damage resistance (DR) per type | percent reduction | target's armour value per type, +30 when the dude attacks with Finesse | clamped 0..100 (default branch) | 100 | combat.cc:4528, 4541, 4609 |
| Skill value | every skill check | default + stat sum x modifier + points x mult; tag and trait and perk and difficulty | 0 to 300 | hard 300 | skill.cc:248-264 |
| Skill point cost | cost to raise | tiers by current value | 1 to 6 points | none | skill.cc:357-365 |
| Small Guns | ranged skill | 5 + 4 x AGI | 9 to 45 base (computed) | 300 | skill.cc:79 |
| First Aid | heal skill | 2 x (PER + INT); XP 25 per use | 4 to 40 base (computed) | 300; 3 uses / 24 h | skill.cc:85, 575, 1153-1154 |
| Speech | social check | 5 x CHA | 5 to 50 base (computed) | 300 | skill.cc:93 |
| Gambling | luck check | 5 x LUCK | 5 to 50 base (computed) | 300 | skill.cc:95 |
| Outdoorsman | survival | 2 x (END + INT); XP 100 | 4 to 40 base (computed) | 300 | skill.cc:96 |
| Tag bonus | pick skills | base x2 term and +20 | +20 per tag except 4th with Tag perk | none | skill.cc:252-255 |
| Difficulty skill modifier | per difficulty | -10 hard, +20 easy on twelve skills | -10 / 0 / +20 | none | skill.cc:1131-1133 |
| d100 skill check | success test | success if d100 <= value + modifier | 1 to 100 | 1 and 100 | random.cc:87, 115, 124 |
| Crit bands | crit success / failure | margin/10 + modifier; -margin/10 | 0 to 10 percent (+ modifier) | open after day 1 | random.cc:113-124 |
| Stat check (d10) | attribute test | d10 <= stat + modifier | 1 to 10 | no clamp | stat.cc:711-717 |
| XP to level L | level curve | 1000 x L(L-1)/2 | 1000 at L2 to 45000 at L10 | level cap 99 | stat.cc:664-672 |
| Swift Learner | XP bonus | +5 percent per rank | +5 / +10 ... percent | none | stat.cc:737 |
| XP per skill use | learning by use | successes x experience | 25 / 50 / 100 per success on listed skills | per use | skill.cc:527 |
| First Aid heal | hit points healed | randomBetween(min+1, max+5); min 4r, max 10r | 1 to 5 base; 4r+1 to 10r+5 with Healer rank r | robotic always fails | skill.cc:562-563, 603, 610 |
| Throw range | throw distance | min(weapon range, 3 x eff. STR); eff. STR cap 10 | 3 to 30 by STR | cap 10 on eff. STR | item.cc:1613-1624 |
| Combat difficulty (enemy damage) | scale enemy damage | 75 easy, 100 normal, 125 hard | 75 / 100 / 125 | none | combat.cc:4556, 4559 |

Not read: the tables for skill descriptions beyond names; trait and perk skill bodies; the hit-chance function; ammo DR and DT modifiers; the GLOVZ and YAAM damage branches; weapon strength requirements; kill XP.

## 4. TypeScript sketch

simplified: the sketch keeps the derived formulas, the skill value with its tag term, the d100 check with a second d100 for the crit band, the d10 stat check, the XP curve, the use cap, and the DT-then-DR armour step. It omits the perk and trait bodies, the party-member substitution in skillRoll, the Finesse and Penetrate branches (only bypass is modelled), the ammo modifiers, the GLOVZ and YAAM branches, the hit-chance and AP-cost logic, and the first-day critical gate (passed as a flag). It reorders nothing else. It FIXES one thing in the donor: the halving of damage is a parameter (`divisor`, 2 in the donor; Frankendom passes 1), because its purpose is not documented (TODO at 4600). It does not port the critical-time gate: that is a time limit, reject.

```ts
// Licence: Sustainable Use License 1.0 (donor; restricted). clean-room sketch from the described rules, not a translation.
export interface Special { str: number; per: number; end: number; int: number; agi: number; luck: number; chr: number; }

// Derived stats from the SPECIAL values, using the donor's non-trait formulas.
export function derivedStats(s: Special) {
  return {
    maxHp: s.str + 2 * s.end + 15,
    maxAp: Math.trunc(s.agi / 2) + 5,
    armourClass: s.agi,
    meleeDamage: Math.max(s.str - 5, 1),
    carryWeight: 25 * s.str + 25,
    sequence: 2 * s.per,
    healingRate: Math.max(Math.trunc(s.end / 3), 1),
    critChance: s.luck,
    radiationRes: 2 * s.end,
    poisonRes: 5 * s.end,
  };
}

// Clamp to the stat table range (min and max per stat).
export function clampStat(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

// Action points lost to overweight: -(trunc(over / 40) + 1) when carried weight exceeds the carry limit.
export function apCarryPenalty(carryMax: number, inventoryWeight: number): number {
  const remaining = carryMax - inventoryWeight;
  return remaining < 0 ? -(Math.trunc(-remaining / 40) + 1) : 0;
}

// Skill value: default + statModifier * (stat1 + stat2) + base points * multiplier.
// A tagged skill doubles the base-point term and gets +20 unless it is the fourth tag while the Tag perk is held.
export interface SkillRow { defaultValue: number; statModifier: number; baseValueMult: number; }
export function skillValue(
  row: SkillRow, statSum: number, basePoints: number,
  tagged: boolean, skipTagBonus: boolean, traitMod: number, perkMod: number, difficultyMod: number,
): number {
  let value = row.defaultValue + row.statModifier * statSum + basePoints * row.baseValueMult;
  if (tagged) {
    value += basePoints * row.baseValueMult;
    if (!skipTagBonus) value += 20;
  }
  value += traitMod + perkMod + difficultyMod;
  return Math.min(value, 300);
}

// Cost in points to raise a skill by one, by its current value.
export function skillCost(value: number): number {
  if (value >= 201) return 6;
  if (value >= 176) return 5;
  if (value >= 151) return 4;
  if (value >= 126) return 3;
  if (value >= 101) return 2;
  return 1;
}

// Skill check against a d100. delta = difficulty - d100. Crit bands use a second d100 and are open only after the day gate.
export type Outcome = "crit-fail" | "fail" | "success" | "crit-success";
export function d100Check(difficulty: number, critMod: number, d100: number, critD100: number, critGateOpen: boolean): Outcome {
  const delta = difficulty - d100;
  if (delta < 0) {
    return critGateOpen && critD100 <= Math.trunc(-delta / 10) ? "crit-fail" : "fail";
  }
  return critGateOpen && critD100 <= Math.trunc(delta / 10) + critMod ? "crit-success" : "success";
}

// Stat check: one d10 (1..10) against the stat plus a modifier. No clamp: a value of 10 or more always passes.
export function statCheck(value: number, d10: number): boolean {
  return d10 <= value;
}

// XP needed to reach a level (0 = nothing). Odd levels: 1000 * (L/2) * L. Even: 1000 * (L/2) * (L - 1).
export function xpForLevel(level: number): number {
  if (level >= 99) return -1;
  const v1 = Math.trunc(level / 2);
  return level % 2 !== 0 ? 1000 * v1 * level : 1000 * v1 * (level - 1);
}

// Skill use cap: slots holds the last three use times (null = empty, index 0 oldest). Refused while the oldest is within 24 hours.
export function useAllowed(slots: Array<number | null>, nowHours: number): boolean {
  if (slots.some((t) => t === null)) return true;
  return nowHours - (slots[0] as number) > 24;
}

// Armour: raw damage, then the donor's halving (divisor 2; Frankendom sets 1), a difficulty percent, then the flat
// threshold (DT) and the percent resistance (DR). Bypass scales both DT and DR to 20 percent.
export function armourDamage(raw: number, dt: number, drPct: number, difficultyPct: number, divisor: number, bypass: boolean): number {
  let threshold = dt;
  let dr = Math.min(100, Math.max(0, drPct));
  if (bypass) {
    threshold = Math.trunc((20 * threshold) / 100);
    dr = Math.trunc((20 * dr) / 100);
  }
  let damage = Math.trunc(raw / divisor);
  damage = Math.trunc((damage * difficultyPct) / 100);
  damage -= threshold;
  if (damage > 0) damage -= Math.trunc((damage * dr) / 100);
  return Math.max(0, damage);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (copied to /tmp/sk002-f2-stats.ts), exit 0. The sketch file is work/f2-stats.ts.

Best transferable idea: take the armour order from the donor (flat threshold first, then percent resistance on what remains, with the threshold and resistance both cut to 20 percent for bypass or penetrating hits), and the d100 check whose critical band grows with the margin over the difficulty.

Decision (proposed): adapt - take the flat-then-percent armour step and the margin-based crit band for the fight, with the armour values per slot as catalogue data (src/fight/stats.ts). Fixes: the unexplained halving (TODO at 4600) becomes a data parameter set to 1 (no halving); the probable Luck double count in First Aid (skill.cc 567 and 477-478: Luck enters the check value and the crit band) is not copied: the crit band uses Luck, the check does not. Reject the first-game-day gate on criticals: a time limit, not a rule for a fight.

Acceptance: a server test asserts raw 20 against DT 4 and DR 20 percent gives 13 with no halving, that raw 4 against DT 4 gives 0, and that a bypass hit uses 20 percent of DT and DR.

## 5. Lands in

- TARGET `src/fight/stats.ts` (catalogue fields for SPECIAL, derived stats, skill value and armour DT/DR per slot; the server computes every check). Parity-checklist row 21 (catalogue fields).
- The DT/DR step itself belongs in the duel damage step (row 1), which this note does not change.
- Reuse tag: rewrite-from-idea (Sustainable Use License 1.0: clean-room only, shape and numbers as data)
- Brief rule served: one engine, zones as data (numbers as catalogue rows, not constants); server-verified (checks and rolls run on the server)

## 6. Gaps and risks

- Licence: Sustainable Use License 1.0 is not an open-source licence and limits use to internal, non-commercial or personal use. Clean-room only; the sketch uses formulas and numbers written as data, not copied code.
- Turn-based donor: AP are spent per turn and the formulas assume rounds. A fast browser fight needs the armour and check shapes, not the AP model. Do not port AP-per-turn.
- Criticals gated by the first game day is a time limit, not a fight rule; reject it. The critical band as margin/10 percent is fine as data.
- Skill values reach 300 and skill points cost up to 6 per point. Frankendom's catalogue must say whether skill ranks are capped lower (MAX_ATTACKERS = 3 does not bear on this, but one ledger does: a skill point spent must be recorded once).
- The party-member substitution in skillRoll (a companion rolls the skill if they are best at it) conflicts with one-character-one-ledger and server-verified kills; reject that part.
- Stat clamps: the table's min and max are data; the donor's table has no soft caps.
- Missing from this donor (not read): stamina and stance economy, block and parry windows, stagger, hit location, armour per slot values, weapon strength requirements, and any magic or mental school. Frankendom needs other donors for these.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Finesse direction reversed: combat.cc 4540-4541 adds +30 to the target's damageResistance when the dude attacks; note said the dude gets +30 DR. Confirmed; text and table row fixed (sketch omits Finesse, so no code change).
- DAM_BYPASS 20 percent scaling is skipped for EMP (4530). Confirmed, added.
- skillRoll party substitution excludes SKILL_STEAL (458). Confirmed, added.
- Crit chance stat table row is 58, not 59 (59 is Better Criticals). Confirmed, fixed.
- AC evade/AP term applies only when it is not the critter's turn (205). Confirmed, added.
- Missed: skillAdd checks cost against the skill's current value including tag/perk bonuses (skill.cc 309-315), so a tagged skill reaches the next cost tier earlier. Gap for the point-spend rule; not modelled in the sketch.

Fixed 2026-10-12: Finesse direction (rule text and table), EMP bypass exception, Steal exclusion, stat row 58, AC turn condition. No TypeScript changed.
