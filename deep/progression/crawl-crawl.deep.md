# crawl-crawl (progression, cell 10)

Donor: /mnt/frankendom-donors/crawl-crawl/crawl-ref/source/skills.cc | Licence: GPL-2 | C++ | symbol calc_skill_level_change / skill_exp_needed
Symbol check: calc_skill_level_change opens at 430 and closes at 449; calc_skill_cost 169-181; scaled_skill_cost 215-225 (a UI cost display, not used in the mechanism); exercise 860-880; _level_up_check 884-899; _train 1618-1695; train_skills 1049-1097; _get_skill_cost_for 2631-2651; skill_exp_needed 2653-2657 (all opened this pass). Caller opened: /mnt/frankendom-donors/crawl-crawl/crawl-ref/source/player.cc lines 2955-2978.

## 1. Mechanism
- Turn-based roguelike skills. Practice is recorded, then earned XP is spent in a training pass, then skill points convert to levels.
- Practice: exercise(skill, degree) (860-880) returns if the skill is already at MAX_SKILL_LEVEL (27, defines.h 143). Otherwise, per degree it always pushes the skill into the exercises_all queue and, only when the skill is currently trained, also into the exercises queue (each queue is fixed length: push back, pop front). It then calls reset_training.
- Driver (not previously listed): gain_exp in player.cc (2955-2978) adds the experience, adds 10 x skill_xp to exp_available, calls train_skills (and loops while a selected skill can still be afforded), then level_change. So the training pass runs when XP is gained, not on every turn. train_skills (1049-1097) picks a path (distributed-training mutation, innate-caster mutation, or the normal loop), spends via _train_skills, calls check_skill_level_change for every skill, then resets training. The normal loop caps each batch at the XP that reaches the next skill cost level (1079-1083).
- Cost per point: calc_skill_cost(you.skill_cost_level) (169-181) is a fixed 27-entry table (1 up to 265); the cost level comes from the character's total experience (comment 154-158), not from the skill.
- Threshold: skill_exp_needed(level, skill, species) (2653-2657) = _get_skill_cost_for(level) (2631-2651) times species_apt_factor(skill, species) (declared skills.h 122, body not read), converted to unsigned int. The table for levels 0 to 27 is 25 x L x (L + 1); for each breakpoint 9, 18 and 26 that the level is above, it adds half of 25 x (L - breakpoint) x (L - breakpoint + 1), integer division (2625-2647).
- Spend: _train (1618-1695) takes cost = the per-point cost. In the normal path it sets a spending limit of min(10 x 265, available XP), points = limit / cost, capped by the points left to the player's training target (1602-1616 helper opened), and cost becomes points x cost. In the distributed-training path (a mutation) it scales the per-point cost with random rounding and adds a single point. It returns 0 if points are 0 or the cost exceeds the XP. Remaining skill manual points add bonus points (up to the points bought) (1648-1661). Then it adds to the skill's points, deducts cost from exp_available, adds it to total_experience and the wind category weights. _level_up_check (884-899) is called after training elsewhere (1026, 1161, 1199): when the skill's points reach the level 27 threshold it zeroes the training weight and, outside a simulation, sets both train modes to disabled.
- Level: calc_skill_level_change (430-449) walks up while the points reach the next threshold (and the level is under 27), walks down (asserting >= 0) while they are under the current threshold, stops when stable. check_skill_level_change (451-462) applies it.
- Inputs: skill, points, species, practice degree, available XP. Outputs: level, points, queues.

## 2. Key functions
- calc_skill_level_change | /mnt/frankendom-donors/crawl-crawl/crawl-ref/source/skills.cc | 430-449 | up or down walk from the current level to the band that fits the points.
- exercise | /mnt/frankendom-donors/crawl-crawl/crawl-ref/source/skills.cc | 860-880 | records practice (two queues; the second only for trained skills) and resets the training pass.
- _train | /mnt/frankendom-donors/crawl-crawl/crawl-ref/source/skills.cc | 1618-1695 | XP to points for one skill, with the spending limit, training-target cap and manual bonus.
- train_skills | /mnt/frankendom-donors/crawl-crawl/crawl-ref/source/skills.cc | 1049-1097 | the driver: picks the spend path, runs _train_skills, then re-checks every skill's level.
- _level_up_check | /mnt/frankendom-donors/crawl-crawl/crawl-ref/source/skills.cc | 884-899 | stops training once the points reach the level 27 threshold and disables the training entry.
- calc_skill_cost | /mnt/frankendom-donors/crawl-crawl/crawl-ref/source/skills.cc | 169-181 | XP spent per point by the character's cost level (27-entry table).
- _get_skill_cost_for | /mnt/frankendom-donors/crawl-crawl/crawl-ref/source/skills.cc | 2631-2651 | cumulative cost curve with breakpoints.
- skill_exp_needed | /mnt/frankendom-donors/crawl-crawl/crawl-ref/source/skills.cc | 2653-2657 | species-scaled threshold.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Cumulative threshold curve times an aptitude factor | Curve 25 * L * (L + 1) and half add-ons (theirs, skills.cc 2625-2647) |
| Level walk up or down until stable | Breakpoints 9, 18, 26 (theirs, skills.cc 2634); maximum level 27 (theirs, defines.h 143) |
| Practice queue that drives the training pass (exercise, skills.cc 860-880) | Cost table 1 to 265 across 27 steps (theirs, skills.cc 171-176); spending limit 265 x 10 (theirs, skills.cc 52 and 1638) |

## 4. TypeScript sketch
simplified: only the threshold curve and the level walk are sketched. Omitted: the species aptitude factor (passed in as a plain multiplier, with truncation to an integer as the donor's unsigned conversion does), the cost-per-point table, _train and its spending limit and target cap, the practice queues, the skill-manual bonus, the mutation paths and the training disable at the cap. The walk has no lower bound assertion.
```ts
// Licence: GPL-2 (crawl-crawl) | clean-room: written from the mechanism, no donor lines.
const MAX_LEVEL = 27;            // theirs
const BREAKPOINTS = [9, 18, 26]; // theirs

function modCost(l: number): number {
  return 25 * l * (l + 1);       // theirs: curve factor
}

// Cumulative cost to reach a level, with half-weight add-ons after each breakpoint.
function costFor(level: number): number {
  let c = modCost(level);
  for (const bp of BREAKPOINTS) {
    if (level <= bp) break;
    c += Math.floor(modCost(level - bp) / 2);
  }
  return c;
}

// Threshold scaled by species aptitude (theirs: per species and skill).
function thresholdFor(level: number, aptitude: number): number {
  return Math.trunc(costFor(level) * aptitude);   // donor converts the float product to unsigned int
}

// Walk up or down from the current level until the points fit a band.
function levelFor(start: number, points: number, aptitude: number): number {
  let lvl = start;
  for (;;) {
    if (lvl < MAX_LEVEL && points >= thresholdFor(lvl + 1, aptitude)) lvl++;
    else if (points < thresholdFor(lvl, aptitude)) lvl--;
    else break;
  }
  return lvl;
}

```

## 5. Lands in
- Frankendom file(s): TARGET origins/progression/model.ts (exists). It already holds the same shape: requirement(level), cumulative(level) in closed integer form, and levelOfCredit(credit, cap), which walks `while (level < cap && cumulative(level + 1) <= credit) level++`. That is this donor's calc_skill_level_change minus the down-walk (credit never falls). So the donor adds nothing to build for levels. The one idea not in model.ts is a per-skill aptitude multiplier on the curve; Frankendom has one career with no per-skill training, so it has no consumer today.
- Parity-checklist row: 18 (loot roll and XP award). Skill training itself is not one of rows 1-22.
- Reuse tag: rewrite-from-idea (GPL-2; mechanism only), not planned.
- Brief rule served: (category default, not per-cell) one-character, one-ledger rule; rules 7-9 n/a

## 6. Gaps and risks
- Frankendom ruling "one ledger": the donor spends a pool of XP across several skills and mutates points, queues, total_experience and wind weights in one call chain. Frankendom has one career credit, written in one transaction (origins/server/mob-rewards.ts), with no spendable pool.
- Frankendom ruling "server-verified kills": gain_exp (player.cc 2955-2978) trusts the caller's XP. Frankendom computes CP only from a server-replayed kill.
- Turn-based pass triggered per XP gain; Frankendom's real-time fight needs the award attached to the verified kill, not to a tick.
- RNG: the distributed-training path uses random rounding (_train 1633) and the manual bonus is state-dependent. Frankendom awards are integer and seeded (model.ts); any ported rounding must use the seeded stream.
- Species aptitude body (species_apt_factor, skills.cc 2620-2623 apt_to_factor is the exponential 1/2^(apt/4); the per-species table was not read) would be catalogue fields in Frankendom ("no hidden numbers").
- Training-target system around 1564-1616 was read only for the point-diff helper; the target UI (1897-2020) was not read.
- Level-up effects are not in this path. Stat changes happen elsewhere (_change_skill_level, not read).
- GPL-2: mechanism only, no code lifted.
