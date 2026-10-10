# xoreos-xoreos (progression, cell 10)

Donor: `/mnt/frankendom-donors/xoreos-xoreos/src/engines/nwn/gui/chargen/chargenchoices.cpp` (with `charskills.cpp`) | Licence: GPL-3.0-or-later (`charskills.cpp` lines 8-10: GNU GPL, "version 3", "or any later version"; `COPYING` is GPL v3) | C++ | symbols `CharGenChoices::computeAvailSkillRank`, `CharSkills::changeRank`

Checked: Read `computeAvailSkillRank` (chargenchoices.cpp 560-577), `getSkillItems` (579-620), `getAbilityModifier` (463-468) and `getTotalAbility` (460) in full. Read `charskills.cpp` 96-264 (rank up and down, budget, reset, OK, list build) and 266-296 (recommended skills) in full. Read `nwn2/creature.cpp` 686-706 (per-level skill points read from the creature file, not computed) and `nwn/creature.cpp` 791-792 (XP loaded from a save). Callers: `computeAvailSkillRank` and `getSkillItems` have one caller each (`charskills.cpp` 250 and 253); `CharSkills` is created once, in `charpackage.cpp` 98, which is the character-package screen. Confidence high on the budget formula and the spend rules (every line read). Medium on whether the same budget runs at level-up: no level-up screen was found in the NWN tree. Not read: the class and skill 2DA tables (`SkillPointBase`, `SkillsTable`, `ClassSkill` values are data files, not in the donor); `hasFeat` body; the `charpackage` flow beyond line 98. Not found: any XP formula or XP award. `nwn/creature.cpp` 792 only loads the saved `Experience` value, so this note covers skill points, not XP.

## 1. Mechanism

- Trigger: opening the skills screen. `CharSkills` is built in `charpackage.cpp` 98; its constructor calls `createSkillsList` (`charskills.cpp` 148), which sets the pool from `computeAvailSkillRank` (250) and builds one list row per skill from `getSkillItems` (253).
- Pool (`computeAvailSkillRank`, chargenchoices.cpp 560-577), in this order: (a) start with the intelligence modifier (561), clamped to 0 if negative (562-563); (b) add the class's `SkillPointBase` from the `classes` table (565-567); (c) add 1 if the character has feat 258 (570-571; the donor's own comment calls it "Quick to master"); (d) if hit dice is 0, multiply the whole pool by 4 (573-574). The multiplier covers the modifier and the feat point too, not only the class base.
- Modifier (`getAbilityModifier`, 463-466): total ability is base plus racial (460), then the code computes `(total - total % 2) / 2`, which is floor(total / 2), then subtracts 5 (466). So a total of 14 gives 2.
- Per-skill cap and cost (`getSkillItems`, 599-613): cap = 4 + hit dice (599). A cross-class skill gets half that cap, computed as `(maxRank - maxRank % 2) / 2` (605), which is floor(cap / 2). Each skill starts at rank 0 in the list (609), and the class-skill flag comes from the class's `SkillsTable` (585-597).
- Cost per rank (`charskills.cpp` 99, 106, 118): a class skill costs 1 point per rank; a cross-class skill costs 2.
- Rank up (`changeRank`, 117-136): refuse if rank equals the cap (121). Otherwise try to spend `cost` points; `changeAvailableSkillRank` refuses if the pool would go below 0 (191-192; the check is at 192). On success, the pool drops by the cost and the rank rises by 1 (123-126).
- Rank down (128-131): refuse at min rank 0 (128-129); otherwise refund the cost and lower the rank by 1.
- Reset (`reset`, 160-173): add back, for every skill, rank times cost (169), clear each skill's entry in the choices object (170), then call `item.reset()` (171; the body of `WidgetListItemSkill::reset` was not read, so whether it zeroes the displayed rank is not verified).
- OK (213-229): copy every rank into the choices object (222), then store the leftover pool with `setNotUsedSkills` (225; the setter is at chargenchoices.cpp 302-303).
- Recommended (266-296): reset, then for each preferred skill in order, raise it until a raise fails (286-290). The loop stops early when the pool reaches 0, but only between skills (276-277).

## 2. Key functions

- `CharGenChoices::computeAvailSkillRank`: `/mnt/frankendom-donors/xoreos-xoreos/src/engines/nwn/gui/chargen/chargenchoices.cpp` 560-577. The pool.
- `CharGenChoices::getSkillItems`: same file, 579-620. Per-skill cap, class flag, rank 0.
- `CharGenChoices::getAbilityModifier`: same file, 463-468. Modifier formula.
- `WidgetListItemSkill::changeRank` and `CharSkills::changeAvailableSkillRank`: `/mnt/frankendom-donors/xoreos-xoreos/src/engines/nwn/gui/chargen/charskills.cpp` 117-136 and 191-198. Spend and refund.
- `CharSkills::reset` and the OK handler: same file, 160-173 and 213-229.
- `CharSkills::setRecommendedSkills`: same file, 266-296.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A pool of points per level = a stat modifier (floored at 0) + a class base + a bonus, with a multiplier on the first level | Modifier `floor(total / 2) - 5` (chargenchoices.cpp 465-466); bonus +1 for feat 258 (570-571); first-level x4 (573-574); class base from the `classes` 2DA (data, not in donor) |
| A skill's rank cap grows with level | 4 + hit dice (599) |
| Off-profession skills are capped at half and cost double | Half, rounded down (605); cost 2 vs 1 (charskills.cpp 99, 118) |
| A spend is refused when the cap or the pool blocks it; a refund returns the points | Refusal checks at charskills.cpp 121 and 192; refund 130 and 169 |
| Reset refunds the whole spend | Sum of rank x cost (169) |

Worked arithmetic from the donor's formulas only (no table values assumed): total INT 14 gives modifier 2. At hit dice 0 with a class base B and no feat, the pool is (max(0, 2) + B) x 4. With the feat, the +1 comes before the multiply, so the pool is (max(0, 2) + B + 1) x 4 (570-574 order).

## 4. TypeScript sketch

simplified: the sketch keeps the pool formula (clamp, base, bonus feat, x4 at hit dice 0), the modifier, the cap and half-cap for cross-class skills, the cost per rank, the spend and refusal rules, and the reset refund. It takes the class base and the bonus flag as inputs instead of reading the 2DA tables and feats. It omits the donor's uint8 casts, the recommended-skills fill, the widget and label updates, the save of the leftover pool (`setNotUsedSkills`, 225 and 302), and the character-package flow. It uses `>=` for the cap check where the donor uses `==` (121); both give the same result because the rank never passes the cap.

```ts
// clean-room: written from the described mechanism, not a translation of the donor lines
export interface Skill { classSkill: boolean; rank: number }

// Ability modifier from a total score: floor(score / 2) - 5.
export function abilityMod(total: number): number {
  return Math.floor(total / 2) - 5;
}

// Points for one level. Modifier is clamped at 0, then class base, then +1 for a bonus feat,
// then x4 when this is the first level (hitDice 0).
export function levelPool(abilityModValue: number, classBase: number, hasBonusFeat: boolean, hitDice: number): number {
  let pool = Math.max(0, abilityModValue) + classBase;
  if (hasBonusFeat) pool += 1;
  if (hitDice === 0) pool *= 4;
  return pool;
}

// Highest rank a skill may reach. A cross-class skill gets half the cap, rounded down.
export function rankCap(hitDice: number, classSkill: boolean): number {
  const cap = 4 + hitDice;
  return classSkill ? cap : Math.floor(cap / 2);
}

// Points per rank: 1 for a class skill, 2 for a cross-class skill.
export function rankCost(classSkill: boolean): number {
  return classSkill ? 1 : 2;
}

// Raise one skill by one rank. Returns the new pool, or null if the cap or the pool blocks it.
export function rankUp(pool: number, s: Skill, hitDice: number): number | null {
  if (s.rank >= rankCap(hitDice, s.classSkill)) return null;
  const cost = rankCost(s.classSkill);
  if (pool - cost < 0) return null;
  s.rank += 1;
  return pool - cost;
}

// Reset: give back every point spent on these skills.
export function resetPool(pool: number, skills: Skill[]): number {
  let refund = 0;
  for (const s of skills) refund += s.rank * rankCost(s.classSkill);
  return pool + refund;
}
```

Typecheck: `work/xoreos/skill-budget.ts` (with `export {};`) passed `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/progression.ts` (proposed module; server-owned skill pool and rank spends). Parity-checklist row 18 (loot roll and XP award): the pool and rank changes are the progression side of the award. The donor has no XP award to copy (see the Checked line).
- today: Frankendom's progression code was not checked in this pass (no repo access in this task).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: one ledger (the pool and the ranks are a server-owned value; the picker is a client that proposes a rank). Server-verified (the server checks the cap and the pool on every spend).

Best transferable idea: Make each level's skill points a server-owned pool where a class skill costs 1 point per rank and a cross-class skill costs 2 and is capped at half, so the server refuses any spend the cap or the pool does not allow.

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism, not translated from the donor lines.
- No XP formula or XP award in this donor. `nwn/creature.cpp` 792 only loads a saved value. Frankendom's XP curve (row 18) needs its own rule; do not look for it here.
- The budget is wired only into the character-package screen (`charpackage.cpp` 98). The formula is written for any hit dice, but no level-up screen was found in the NWN tree, so a per-level budget from this donor is not proven.
- The donor keeps the pool and the ranks in the GUI widget (`CharSkills`). Under Frankendom's one-ledger rule the pool must live on the server, and the Pit only shows it. The donor's client-side arithmetic cannot be the source of truth.
- The leftover pool is saved to `_notUsedSkills` (chargenchoices.cpp 302-303, and 225 in charskills.cpp), but no getter was found in `src/engines/nwn` by grep. Where the leftover goes after the screen closes is not read. Frankendom must decide it explicitly.
- The donor stores pool and rank in `uint8_t` (`SkillItem` fields in `chargenchoices.h` 44-46; the pool cast at `chargenchoices.cpp` 576). Frankendom should use validated integers with a stated maximum, not wrap-around types.
- MAX_ATTACKERS = 3 does not apply to this mechanism; no fight data is involved.
- Not read: the `classes` and `skills` 2DA values, so the class bases and skill tables are unknown here.
