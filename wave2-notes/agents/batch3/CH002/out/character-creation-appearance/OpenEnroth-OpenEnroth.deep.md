# OpenEnroth-OpenEnroth (character-creation-appearance, cell 3)

Donor: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Objects/Character.cpp` (race stat table 62-107; `CharacterCreation_GetUnspentAttributePointCount` 314-342; `SetInitialStats` 2937-2941; `SetSexByVoice` 2944-2978; `ChangeClass` 2981-2997; `GetSkillIdxByOrder` 3000-3031; `DecreaseAttribute` 3035-3049; `IncreaseAttribute` 3053-3077; `bodyType` 2929-2934), with the party-creation screen `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/GUI/UI/UIPartyCreation.cpp` (`PlayerCreation_Choose4Skills` 70-82; `CreateParty_EventLoop` 84-255) | Licence: GNU LGPL version 3 (`/mnt/frankendom-donors/OpenEnroth-OpenEnroth/LICENSE`, lines 1-2: "GNU LESSER GENERAL PUBLIC LICENSE / Version 3, 29 June 2007"; copyleft, clean-room, shape only) | C++ | symbol `CharacterCreation_GetUnspentAttributePointCount` (with `IncreaseAttribute` and `DecreaseAttribute`)

Checked: Read in full: `Character.cpp` 62-107 (race stat table), 2893-3077 (sex by voice, body type, initial stats, class change, skill order, decrease and increase), 314-342 (point pool); `UIPartyCreation.cpp` 1-260 (all of the event loop: voice, face, plus and minus, skill, class, OK, reset, name). `Character.cpp` 240-300 read partly (tables, not the creation path). Not read: `UIPartyCreation.cpp` 260-867 (the window draw and update code), `Character::RandomizeName` (2113), `grng->random` semantics (the level 1 experience and birth year rely on it), the `ATTRIBUTE_*` and `RACE_*` enum values, the health and mana formulas, `Party::Reset` and `Party.cpp` 497-521 (grepped for the calls only), `Party.h` 335 (grepped only), and whether the server re-checks the OK conditions (the OK check is in the UI loop at 203; no server caller was read). Callers of `CharacterCreation_GetUnspentAttributePointCount`: found by grep, all in `Character.cpp` (3066, 3073, and inside the function) and `UIPartyCreation.cpp` (203); all read. Depth: full for the point pool and the step rules. Confidence: high for the formula and the step rules; high for the four-race table values (read by line); high for the claim that only Dwarf has its own body type. camera_scope: not applicable.

Best transferable idea: Price each stat from its own state (the dropped step per point at or above base, a step-scaled refund below base) and spend one budget per character, with a floor and a cap per race row.
Decision (proposed): adapt — keep the cost-from-state rule and the asymmetric steps, with a per-character budget in place of the donor's shared party pool and an exact-cost check in place of the threshold.
Acceptance: the create screen shows "N points left" from the cost rule, and plus is disabled when the next step would exceed the budget or the race cap; a server test asserts that Elf Might at 9 costs 4 points, that Elf Intelligence at 12 refunds 4, and that a click over budget is refused.

## 1. Mechanism

- Start: every character's stats are set to the race base values (`SetInitialStats`, 2940). Callers found by grep: each face change in the creation screen (UI 142, 164) and the four party members in `Party.cpp` 497-521 (the party reset; those lines were grepped, not read).
- Pool: the points are not stored. `CharacterCreation_GetUnspentAttributePointCount` starts from 50 (316), loops over every party member (321), and adds for each stat the cost of its current value (328-337). Result is the points left, shared by the whole party (the party is `std::array<Character, 4>`, `Party.h` 335). Negative cost is a refund.
- Cost of one stat, read from its race row (`base`, `max`, `dropped`, `step`):
  - at or above base (328-330): `cost = dropped * (cur - base) / step` (337, integer division);
  - below base (331-333): `refund = step * (base - cur) / dropped` (the same line with the multipliers swapped).
- Plus (`IncreaseAttribute`, 3053): the step is `step` at or above base; below base the two step sizes are swapped (3068-3072) so the step is `dropped`. The click is taken only if the pool is at least the (possibly swapped) `droppedStep` (3073-3074), and the value stays at or below `max` (3075).
- Minus (`DecreaseAttribute`, 3035): the step is `dropped` when the value is at or below base (3047), else `step`. The value may not go below `base - 2` (3044, 3048). There is no pool check on minus; it always refunds through the recomputed pool.
- Race rows (70-107): Human, Elf, Goblin and Dwarf, each with seven stats. Human uses dropped 1 and step 1 for every stat except Endurance and Luck base 9. Elf and Goblin and Dwarf trade a 2 and a 1 between a "strong" and "weak" stat (for example Elf Might: dropped 2, step 1; Elf Intelligence: dropped 1, step 2).
- Gate on OK (UI 201-208): refused while the pool is not zero (203) or any character does not have exactly four chosen skills (`PlayerCreation_Choose4Skills`, 70-82; count checked at 78). The error shows for 4 seconds (204).
- Skills: `ChangeClass` (2981) sets the class, level 1, experience `251 + grng->random(100)` (2984) and birth year `1147 - random(6)` (2985); primary skills become novice, all other skills are cleared (2987-2993); health and mana go to max (2995-2996).
- Skill order (`GetSkillIdxByOrder`, 3000-3031): order 0-1 are primary skills (automatic); order 2-3 are required "available" picks; order 4-12 are optional and may be inactive (3014-3017). The UI picks from these slots (UI 191-196 and 213-230).
- Face, voice and sex: face next and previous cycle a 20-entry index (161 for next, and the prev block at 134-139). Choosing a face sets the voice id to the same number (163), resets the stats (164), derives the sex (165, `SetSexByVoice`) and randomizes the name (166). Voice next and previous cycle 0 to 19 and keep the sex (125-126 and 103-111); they do not reset stats.
- Body type (2929-2934): dwarf gets dwarf male or female; every other race (Human, Elf, Goblin) gets human male or female.
- Name: at most 15 characters while typing (234).

## 2. Key functions

- `CharacterCreation_GetUnspentAttributePointCount`: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/Engine/Objects/Character.cpp` 314-342. Starts at 50, loops over the party, adds each stat's cost.
- `Character::IncreaseAttribute`: same file 3053-3077 (swap at 3068-3072, check at 3074, cap at 3075).
- `Character::DecreaseAttribute`: same file 3035-3049 (step choice at 3047, floor at 3044 and 3048).
- `Character::SetInitialStats`: same file 2937-2941.
- `Character::SetSexByVoice` and `GetSexByVoice`: same file 2893-2927 and 2944-2978 (voice to sex lists).
- `Character::ChangeClass`: same file 2981-2997.
- `PlayerCreation_Choose4Skills` and the event loop: `/mnt/frankendom-donors/OpenEnroth-OpenEnroth/src/GUI/UI/UIPartyCreation.cpp` 70-82 and 84-255.

## 3. Numbers vs mechanism

Race stat rows (`base / max / dropped / step`, from Character.cpp):

| Race | Might | Intelligence | Personality | Endurance | Accuracy | Speed | Luck | line numbers |
|---|---|---|---|---|---|---|---|---|
| Human | 11 / 25 / 1 / 1 | 11 / 25 / 1 / 1 | 11 / 25 / 1 / 1 | 9 / 25 / 1 / 1 | 11 / 25 / 1 / 1 | 11 / 25 / 1 / 1 | 9 / 25 / 1 / 1 | 72-78 |
| Elf | 7 / 15 / 2 / 1 | 14 / 30 / 1 / 2 | 11 / 25 / 1 / 1 | 7 / 15 / 2 / 1 | 14 / 30 / 1 / 2 | 11 / 25 / 1 / 1 | 9 / 20 / 1 / 1 | 81-87 |
| Goblin | 14 / 30 / 1 / 2 | 7 / 15 / 2 / 1 | 7 / 15 / 2 / 1 | 11 / 25 / 1 / 1 | 11 / 25 / 1 / 1 | 14 / 30 / 1 / 2 | 9 / 20 / 1 / 1 | 90-96 |
| Dwarf | 14 / 30 / 1 / 2 | 11 / 25 / 1 / 1 | 11 / 25 / 1 / 1 | 14 / 30 / 1 / 2 | 7 / 15 / 2 / 1 | 7 / 15 / 2 / 1 | 9 / 20 / 1 / 1 | 99-105 |

Cost examples from the formula (integer division, as in the donor):

| Stat (base, dropped, step) | Value | Pool effect | Derivation |
|---|---|---|---|
| Human any (11, 1, 1) | 12 | cost 1 | 1 * 1 / 1 |
| Elf Might (7, 2, 1) | 9 | cost 4 | 2 * 2 / 1 |
| Elf Might (7, 2, 1) | 5 | refund 1 | 1 * 2 / 2 |
| Elf Intelligence (14, 1, 2) | 16 | cost 1 | 1 * 2 / 2 |
| Elf Intelligence (14, 1, 2) | 18 | cost 2 | 1 * 4 / 2 |
| Elf Intelligence (14, 1, 2) | 12 | refund 4 | 2 * 2 / 1 |
| Elf Might (7, 2, 1) | 15 (max) | cost 16 | 2 * 8 / 1 |
| Pool | 50 for the whole party | party-wide, not per character | 316, 321 |
| Floor | base - 2 | 5 for Elf Might | 3044 |
| Cap | max per race | 15 for Elf Might | 72-87 |

Step grid used by plus and minus: above base the step is `step`; at or below base (for minus) and below base (for plus) the step is `dropped`. So the value moves on its own grid, and the integer division in the cost is exact for these rows (checked for every row, see section 6).

## 4. TypeScript sketch

simplified: the sketch keeps the donor's cost-from-state rule and its step choice (dropped below base, step above), the decrease floor, and the cap. It omits the shared party pool (the sketch scores one character against one budget), the four-skill gate, class change, skill slots, the face and voice cycle, the sex table, the body type and the level-1 experience. The floor is applied in both directions here (the donor only applies it to minus). The donor checks the pool against one step threshold; the sketch checks the exact new budget, which gives the same answer for every row in this table but also for rows the donor would get wrong.

```ts
// Licence: LGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface StatRule {
  base: number;      // starting value for the race
  max: number;       // highest value a build can reach
  dropped: number;   // step size below base (and for a decrease at base)
  step: number;      // step size above base
}

// Budget cost of one stat relative to its race base. Negative means a refund.
// At or above base: dropped * (cur - base) / step. Below base: -(step * (base - cur) / dropped).
// Integer division truncates toward zero, as in the donor.
export function statCost(r: StatRule, cur: number): number {
  if (cur >= r.base) return Math.trunc((r.dropped * (cur - r.base)) / r.step);
  return -Math.trunc((r.step * (r.base - cur)) / r.dropped);
}

// simplified: the donor recomputes the pool for the whole party (one shared pool of 50).
// This sketch takes one character's stats and one budget (the one-character rule).
export function buildCost(rules: StatRule[], stats: number[]): number {
  let spent = 0;
  for (let i = 0; i < rules.length; i++) spent += statCost(rules[i], stats[i]);
  return spent;
}

// One plus or minus click on one stat. Returns the new stats, or null when the click is refused.
// simplified: the donor's decrease floor is base minus 2; here the same floor applies to both directions.
export function clickStat(
  rules: StatRule[],
  stats: number[],
  i: number,
  dir: 1 | -1,
  budget: number,
): number[] | null {
  const r = rules[i];
  const cur = stats[i];
  // Donor: an increase below base uses the dropped step; a decrease at or below base uses the dropped step.
  const size = dir === 1 ? (cur < r.base ? r.dropped : r.step) : (cur <= r.base ? r.dropped : r.step);
  const next = cur + dir * size;
  if (next < r.base - 2 || next > r.max) return null;
  const after = stats.slice();
  after[i] = next;
  // fix: check the exact new cost against the budget. The donor compares the pool with one step factor.
  if (budget - buildCost(rules, after) < 0) return null;
  return after;
}

export {};
```

Typecheck: copied to `/tmp/openenroth-build-pool.ts` on the VPS and run with `npx -p typescript tsc --noEmit --strict --target es2020` (TypeScript 7.0.2): exit 0, no output.

Defects found in the donor (keep the idea, fix the defect):
- Shared pool: one 50-point pool for the whole party (316, 321). Frankendom has one character per account and one ledger. fix: a per-character budget (sketch `buildCost`).
- Threshold check: the plus check compares the pool with `droppedStep` after the swap (3073-3074), not with the exact cost of the step. It matches the exact cost for all four rows here (checked by hand for each step size), but it is not a general rule. fix: check the exact new cost (sketch, last check).
- Integer rounding: `dropped * (cur - base) / step` rounds in the whole product. It is exact for these rows because each stat moves in its own step grid. A row with a step that does not divide the distance would round silently. fix: validate every race row at load (the step divides the distance on its own grid, or the cost is computed per point).
- Voice list and sex table do not match: the UI cycles voice ids 0-19 only (125, and prev at 107-108 wraps to 19); the sex function lists ids 0-24 except 22, and id 22 falls through to `assert(false)` (2924). Ids 20, 21, 23 and 24 are sexed but the UI cannot reach them (as read). fix: one list of voice ids shared by the UI and the sex table, with no gaps.
- Face and voice share one number (161, 163), so choosing a face also fixes the sex. Coupled on purpose or by accident: not stated in the code. fix: keep face and voice as separate fields in Frankendom.
- Body type: only Dwarf has its own body type (2929-2934); Elf and Goblin get human bodies. fix: body family per race and sex as catalogue data (parity row 21), not a two-way branch.
- Dead call: `IncreaseAttribute` calls the pool function at 3066 and discards the result. Harmless; cost time only.

Not run: none of this was executed; every claim above is from reading the code and the table rows listed.

## 5. Lands in

- TARGET `origins/character/build-budget.ts` (new, proposed): per-character stat cost from state, clicks with floor and cap, and the race stat table as data. The server re-checks every click (the donor checks only in the UI loop at 203).
- Parity-checklist row 21 (catalogue fields): the race stat rows (base, max, dropped, step) are catalogue fields, not code. The point budget is an engine rule. The hint row 3 does not fit; row 21 is the best fit for the table.
- Reuse tag: rewrite-from-idea (LGPL-3.0; clean-room only)
- Brief rule served: one ledger (one budget per character, computed from the stats and never stored separately); server-verified (every click is validated on the server); class-free start (the budget is spent on stats and four skills, with no class required for the stat step).

## 6. Gaps and risks

- The donor is class-based: `ChangeClass` (2981) sets primary skills and the four skill picks depend on class affinity (3006-3031). The class-free start in Frankendom can keep the stat budget and the step rule, but must drop the class-based skill slots (the shape transfers; the class does not).
- Party pool versus one character: the shared pool is a donor choice for a party of four. It does not transfer to a one-character account (see defects).
- Step grid: the donor's exactness depends on each stat moving on its own grid. Frankendom must validate each row at load or the costs can drift.
- Death and respawn, pets, and the Pit are not involved in this cell.
- Body families: the donor's body types are two (human, dwarf) by sex, with Elf and Goblin using human bodies. Frankendom's body family per race (shared rig) is a new table, not this one.
- Faces and scars: the donor has a 20-entry face and voice list and no scar or wound appearance on creation. Scars-as-grades cannot be taken from this code.
- Name rules: a 15-character limit while typing (234). No character set or word check was read in this creation path (not read).
- LGPL-3.0: clean-room. The sketch is written from the mechanism; no donor line is translated.
