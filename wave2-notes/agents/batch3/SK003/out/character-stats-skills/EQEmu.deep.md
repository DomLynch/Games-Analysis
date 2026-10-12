# EQEmu (character-stats-skills, cell 3)

Donor: `/mnt/frankendom-donors/EQEmu/zone/client.cpp` (`Client::CheckIncreaseSkill`, 3038-3112) with `/mnt/frankendom-donors/EQEmu/common/skill_caps.cpp` (cap table) | Licence: GPL-3.0 (as read: `LICENSE.md`, GNU General Public License Version 3, 29 June 2007; `skill_caps.cpp` header: "either version 3 of the License") | C++ | symbol `Client::CheckIncreaseSkill`

Checked: Read in full: `Client::CheckIncreaseSkill` (client.cpp 3038-3112), `Client::MaxSkill` (3189-3200), `GetSkillTrainLevel` wrapper (3202-3213), `common/skill_caps.cpp` (whole file, 138 lines). Read only as single lines: the four rule lines in `ruletypes.h` (111, 131, 193, 194). Read in part: `GetMaxSkillAfterSpecializationRules` (client.cpp 3215-3235 only). Call sites: about 25 `CheckIncreaseSkill` calls found by grep in `zone/attack.cpp` and `zone/client_packet.cpp`; the modifier values are read from those grep lines, not from the surrounding function bodies. Not read: the one-argument `MaxSkill` overload, `SpecializeSkill`, the rest of `GetMaxSkillAfterSpecializationRules`, and the event hooks after line 3112. The skill-cap data rows are not in this box (only the table schema and loader, and one rule SQL file); the cap numbers are therefore not given. Stat and HP formulas (STR, STA, DEX, AGI, INT, WIS, CHA; HP, mana, endurance; regen) were located by grep in `zone/mob.cpp` and `zone/client.cpp` but not opened, and are marked (not read) in section 3. Callers were not read in full, so the statement that skill-ups never happen against client targets is from the gate in `CheckIncreaseSkill` itself. Confidence: high for the skill-up chance and the gates (read end to end); medium for the cap table (loader read, data not present); the train-level defect is read and confirmed on the loop. The donor's CLAUDE.md and AGENTS.md were not opened and not followed.

## 1. Mechanism

- Use-based skill-up, one roll per use. `CheckIncreaseSkill(skill, against, chancemodi)` runs when a skill is used, with a per-use modifier in percent points (for example -10 for a parry, see section 3).
- Order of operations (client.cpp): (a) bail if dead or unconscious (3039), if AI-controlled (3043), if the target is a corpse (3047), or if the skill id is above the highest skill (3051); (b) read the raw skill (3055) and the max skill from the class/level cap table after the specialization rules (3056); (c) fire the quest hook (3058-3066); (d) gate on the target: no gain when the target has aggro immunity, is a client, or is gray-con (3068-3077); (e) no roll at or above the max (3080); (f) chance (3082-3092); (g) roll `zone->random.Real(0, 99) < Chance` (3094) and add one point (3096).
- Chance is a decaying curve. The donor's own comment states it: `f(x) = (max - min + modification) * .99^skillval + min` (3087). Max and min come from rules (25 and 2 percent by default, ruletypes.h 193-194), the modification is the per-use value, and the result is scaled by `SkillUpModifier / 100` (3091, rule 100 by default, ruletypes.h 111). Early skill gains are cheap and late ones rare; the per-use value shifts the top end, not the floor.
- Floor branch: if `max + mod - min <= min`, the chance is the floor min and the global modifier is not applied (3083-3084). This is a branch the normal formula does not reach.
- Cap: `MaxSkill` returns the table row for (class, skill, level), with level clamped to the skill's maximum level, which defaults to the `SkillCapMaxLevel` rule of 75 (skill_caps.cpp 38-67; ruletypes.h 131). A missing row gives cap 0 (skill_caps.cpp 66).
- Tick: none. A per-use call, synchronous.

## 2. Key functions

- `Client::CheckIncreaseSkill`: `/mnt/frankendom-donors/EQEmu/zone/client.cpp` 3038-3112.
- `Client::MaxSkill`: client.cpp 3189-3200. `Client::GetSkillTrainLevel`: 3202-3213.
- `SkillCaps::GetSkillCapMaxLevel`: `/mnt/frankendom-donors/EQEmu/common/skill_caps.cpp` 38-47. `SkillCaps::GetSkillCap`: 49-67. `SkillCaps::GetSkillTrainLevel`: 69-89 (has the defect in section 3). `SkillCaps::LoadSkillCaps`: 91-132.
- Rules: `/mnt/frankendom-donors/EQEmu/common/ruletypes.h` 111 (SkillUpModifier 100), 131 (SkillCapMaxLevel 75), 193 (SkillUpMaximumChancePercentage 25), 194 (SkillUpMinimumChancePercentage 2).

## 3. Numbers vs mechanism

Values are the donor's own. Chances are computed from the formula, not measured; the rounding is to 0.1 percent.

| Name | What it does | Formula | Number ranges (min/max/typical) | Caps (soft/hard) | file:line |
|---|---|---|---|---|---|
| Skill (raw) | the learned level per skill | raw value from the character profile (`GetRawSkill`) | range not read | cap from the table, see next row | client.cpp 3055 |
| Skill cap | ceiling per class, skill and level | row key = class x 1000000 + level x 1000 + skill; level clamps to the skill's max level | table rows not in this box; schema and loader only | hard: no roll at or above | client.cpp 3056, 3080, 3199; skill_caps.cpp 38-67, 106-107 |
| Skill-up chance (default) | chance one use raises the skill | ((25 - 2 + mod) x 0.99^skill + 2) x 100 / 100, percent | 25.0 at skill 0; 10.4 at skill 100; 5.1 at skill 200; 3.1 at skill 300 (mod 0) | floor 2 (rule, see the floor branch) | client.cpp 3082-3092; ruletypes.h 193-194 |
| Skill-up chance (parry at 100, mod -10) | example of a melee defence skill | ((25 - 2 - 10) x 0.99^100 + 2), percent | 6.8 | floor 2 | client.cpp 3090; attack.cpp 566 |
| Global skill-up modifier | scales every chance | chance x SkillUpModifier / 100 (not in the floor branch) | 100 percent default | none | client.cpp 3091; ruletypes.h 111 |
| Gray-con gate | no gain against trivial monsters | target gray-con (`GetLevelCon == Gray`) gives no gain | gray-con relative to the player's level (the con function not read) | none | client.cpp 3073 |
| Client target gate | no gain against players | target is a client gives no gain | any | none | client.cpp 3072 |
| Aggro-immune gate | no gain against aggro-immune mobs | special ability check | any | none | client.cpp 3070-3071 |
| Dead, unconscious, AI-controlled, corpse | no gain at all in these states | early returns | any | none | client.cpp 3039-3047 |
| Use modifier: block, parry, dodge, riposte | melee defence use | -10 percent points | -10 | none | attack.cpp 496, 538, 566, 593 |
| Use modifier: offense, defense | attack and defence skills, per hit | -15 percent points | -15 | none | attack.cpp 1657, 1809 |
| Use modifier: sneak, hide | stealth use | +5 percent points | +5 | none | client_packet.cpp 14735; 8904 |
| Use modifier: apply poison, mend | item-use skills | +10 percent points | +10 | none | client_packet.cpp 3038, 10419 |
| Use modifier: alcohol tolerance | consumption | +25 percent points | +25 | none | client_packet.cpp 5691 |
| Use modifier: begging, tracking | social and tracking use | begging -10; tracking -20 (and +15 at 15398) | -20 to +15 | none | client_packet.cpp 4011, 4975, 15398 |
| Use modifier: swimming, bind wound, disarm | other use | swimming -17; bind wound +5; disarm +4 or +2 | -17 to +5 | none | client_packet.cpp 5063; client.cpp 3537, 3448, 3455 |
| Max skill level | level used for the cap table | rule `SkillCapMaxLevel` 75, or the per-skill max from the table, whichever is set | 75 default | none | ruletypes.h 131; skill_caps.cpp 38-47, 109-124 |
| Train level | level at which a skill becomes trainable | intended: first level with a cap row | donor returns 1 or 0 (defect, below) | none | client.cpp 3212; skill_caps.cpp 69-89 |
| Specialization (forte) | a second, specialised max under AA | max specialisations 2 when the secondary forte AA is set; a specialised skill above 50 counts as primary | 50 (threshold from the code read) | per-rule | client.cpp 3223-3235 (partly read) |
| Attributes, HP, mana, endurance, regen, carry weight, luck, spells, mental and social skills | not read in this pass | (not read) | (not read) | (not read) | (not read) |

Fast-fight read: the decay means a skill rises quickly from 0 to about 50, then slowly, so the first training hours are cheap. The per-use table is the design value to copy: a parry or a block is -10 points, a bind wound is +5, and an apply-poison is +10, so a use's cost is part of the design, not an afterthought. The gray-con gate is the piece that stops grinding trivial mobs for skill.

Defects found:
- `GetSkillTrainLevel` (skill_caps.cpp 79-88): the key is built once from the `level` argument (80), not from `current_level` inside the loop (81-82), so the loop returns 1 if a row exists at that level and 0 otherwise (84, 88). The result is never the first level with a row. Fix: build the key from `current_level` inside the loop and return the first level where a row exists, 0 if none.
- The floor branch (client.cpp 3083-3084) returns the minimum chance without the global `SkillUpModifier` (3091), so a server that sets the modifier to 0 still gets a 2 percent floor. Fix: decide whether the floor is a fixed rule (keep it, document it) or part of the modifier (apply it in both branches). The sketch keeps the donor's behaviour and marks it.

simplified: the sketch keeps the donor's gate order (gates first, then the cap, then the chance, then the roll) and the decaying chance with the floor branch. It omits the quest hook, the specialization rules, the event log, the cap-table loader (the cap is an input), and the train-level function. It uses percent units as the donor does.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: gates (client or trivial target) before the cap, then the decaying chance with the floor branch, then the roll. It omits the quest hook, the specialization rules, event logging, and the train-level function; the cap is passed in from a table. The global modifier is applied only in the normal branch, as in the donor.

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Chances are percentages (0-100), as the donor rules are. Every number here is a tuning field.

export interface SkillUpRules {
  maxChance: number;   // share for a fresh skill before per-use modifiers (donor rule default 25)
  minChance: number;   // floor after modifiers (donor rule default 2)
  modifier: number;    // global multiplier in percent (donor rule default 100)
}

// Chance (percent) that one use raises a skill. Decays with skill value; the per-use modifier shifts the top end.
export function skillUpChance(skill: number, rules: SkillUpRules, useMod: number): number {
  if (rules.maxChance + useMod - rules.minChance <= rules.minChance) {
    return rules.minChance; // donor returns the floor here, without the global modifier
  }
  const working = (rules.maxChance - rules.minChance + useMod) * Math.pow(0.99, skill) + rules.minChance;
  return (working * rules.modifier) / 100;
}

export interface SkillState { value: number; max: number; }

// One use of a skill. Trivial or player targets give nothing (donor gates, checked before the cap).
export function tryIncrease(
  s: SkillState, useMod: number, rules: SkillUpRules,
  roll: () => number,              // returns 0..99.99
  targetIsClientOrTrivial: boolean,
): boolean {
  if (targetIsClientOrTrivial) return false;
  if (s.value >= s.max) return false;
  const chance = skillUpChance(s.value, rules, useMod);
  if (roll() < chance) {
    s.value += 1;
    return true;
  }
  return false;
}

// Cap from a class, skill and level table. The level clamps to the skill's maximum level; a missing row gives 0.
export function skillCap(
  table: Map<string, number>, cls: number, skill: number, level: number, maxLevel: number,
): number {
  const lv = Math.min(level, maxLevel);
  return table.get(`${cls}:${skill}:${lv}`) ?? 0;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/skill-up.ts` (new engine progression step, called after each hit, parry, block or dodge is resolved on the server). Parity-checklist row 18 (loot roll and XP award; the skill-up is the skill side of the award). The per-use modifier table is the data for this module.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one combat core, two clients); SK focus item 8 (use-based skill gain, caps, decay); item 4 (block, parry, dodge use cost)

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism; the formula is the donor's idea, the code is not copied.
- Server-verified: the roll must run on the server after the hit is verified. A client that reports its own parry would earn skill, so the donor's client-side call has to move to the engine.
- One ledger: the skill value and the cap are one record per character; the roll result is written once.
- Grinding: the gray-con gate and the client-target gate are the anti-grind rule. Frankendom's zones can have many weak spawns, so the gate must use Frankendom's own "trivial" rule (for example a level gap), and a test must show no gain from trivial spawns.
- Zones as data: the cap table (class x skill x level) and the use modifiers are data a designer sets per class or zone. The donor's table rows are not on this box, so the cap curve must be authored, not copied.
- MAX_ATTACKERS = 3: a many-on-one fight calls the roll once per hit, so each attacker's skill-up is separate. The donor does not cap this (not read).
- Replay (row 19): the roll is a random draw; a fight record needs a seeded roll to reproduce the same gains.

Best transferable idea: make skill gain decay with the skill value, give each kind of use its own percent modifier, and gate it so trivial or player targets give nothing, which makes grinding weak mobs stop paying.
Decision (proposed): adapt - the decaying chance and the per-use modifier table fit a melee skill ladder (block, parry, dodge, riposte); the floor and modifier are data, the gray-con gate becomes Frankendom's trivial-target rule, and the cap table is authored per class and zone.
Acceptance: a server test asserts that a parry at skill 100 with the -10 modifier lands about 6.8 percent of the time over 100000 seeded rolls, that 1000 hits on a trivial spawn give zero skill-ups, and that the train level returns the first level with a cap row after the defect fix.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 1 (one combat core, two clients); SK focus item 8 (skill gain, caps, decay), item 4 (block, parry, dodge use cost)
