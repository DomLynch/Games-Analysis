# dkfans-keeperfx (progression, cell 10)

Donor: `/mnt/frankendom-donors/dkfans-keeperfx/src/creature_states.c` (spend-to-level, 4900-4918) with `src/thing_shots.c` (hit experience, 755-777), `src/thing_creature.c` (level step, 6419-6434) and `src/thing_stats.c` (stats by level, 355-385 and 925-934) | Licence: GPL-2.0-or-later (source headers, e.g. `src/thing_stats.c` lines 14-16: "either version 2 of the License, or (at your option) any later version"; the LICENSE file is the GPL version 2 text) | C (update loop in C++) | symbols `check_experience_upgrade` (spend and level-up flag), `apply_shot_experience` (hit gain), `update_creature_levels` (level step), `compute_creature_max_health` (stat by level)

Checked: Read in full: `check_experience_upgrade` (creature_states.c 4900-4918), `apply_shot_experience` (thing_shots.c 755-766), `apply_shot_experience_from_hitting_creature` (772-777), `creature_can_gain_experience` (creature_control.c 342-354), `update_creature_levels` through the one-level branch (thing_creature.c 6419-6434), `compute_creature_max_health` (thing_stats.c 355-371), the start of `compute_creature_max_strength` (374-385, its classic-bug branch not read) and `update_relative_creature_health` (thing_stats.c 925-934). Read in part: the hit call site (thing_shots.c 1222-1237), the creature update call (thing_creature.c 6685; update_creature 6498), the creature list update (thing_list.c 1359-1371), the per-turn update (game_update.cpp 472, 505, 534: the turn counter line is at 534, not checked whether it is inside update()), training experience (creature_states_train.c 469, one line). Callers: `apply_shot_experience` has one caller (`apply_shot_experience_from_hitting_creature`, thing_shots.c 776), reached from `shot_hit_creature_at` (1237) only for creature-vs-creature hits. `check_experience_upgrade` has several callers (training, lair, digging, hits, Lua), read by grep only. Not read: the grow-up branch of `update_creature_levels` (after 6440), `calculate_correct_creature_max_health` (called at thing_stats.c 929; the wrapper was not read), `get_creature_health_permil` (not read), the lair and digging experience sources, the frame cadence of the turn loop. Camera: not applicable. Confidence: high on the experience, cost and stat rules; medium on the timing, because the turn loop was read at its call sites only.

## 1. Mechanism

Each creature has experience points, a level (0 to 9 internally, shown as 1 to 10) and stats that scale with level. The fight-relevant source is a hit by one creature on another.

(a) Gain on a hit. `shot_hit_creature_at` calls the hit experience when both shooter and target are creatures (thing_shots.c 1237). `apply_shot_experience` first checks that the shooter may gain experience (`creature_can_gain_experience`, 342-354: refused when the level is at the owner's cap (347), or at the top level unless the model can grow up (351)). The gain is `exp_mag x (factor + gain% x factor x target level / 100)` (761-762), where `exp_mag` is the shot's experience value, `factor` is the target's `exp_for_hitting` and the level is the target's (776). The `<< 8` and `/ 256` in line 762 cancel exactly, so the gain is the plain product. The points are added (764) and the upgrade check runs straight away (765).

(b) Spend to level (`check_experience_upgrade`, 4900-4918). The cost to leave level L is `to_level[L] << 8` (4904), that is the table value times 256 points. If the points are below the cost, nothing happens (4905). Otherwise the cost is taken from the points (4909), and if the level is below the owner's cap and (below level 9, or the model can grow up), a level-up is flagged (4915). Points are spent, not kept as a running total. The UI bar compares the same points with the same cost (`frontmenu_ingame_tabs.c` 1865).

(c) Apply (`update_creature_levels`, 6419-6434). The flag is cleared (6426). If the new level would be below the top, the level becomes L+1 (6433) and the upgrade check runs again (6434), so the next level can be flagged straight away. The top-level branch is not read. `update_creature_levels` is called from `update_creature` (6685). That runs for every creature in the creatures list (thing_list.c 1371, inside `update_things` at 1359), and `update_things` is called from `update()` (game_update.cpp 505). So at most one level step per creature per update call.

(d) Stats by level (thing_stats.c 355-385). For each stat, the maximum is `base + gain% x base x min(level, 9) / 100`, in integer arithmetic. Health (362-365) uses 64-bit arithmetic and clamps to INT32_MAX. The gain% comes from config per stat. The default in the header is 35, marked as a default that the config file should replace (`config_creature.h` 39-41).

(e) Health on a level change (`update_relative_creature_health`, 925-932). The maximum is recomputed (929) and the current health becomes the new maximum times the old health permil, divided by 1000 (931-932), so the creature keeps the same fraction of its maximum.

Timing: experience is added at hit time, not per tick. Levels apply on the creature's next update. There is no accumulator and no timer.

## 2. Key functions

- `check_experience_upgrade`: `/mnt/frankendom-donors/dkfans-keeperfx/src/creature_states.c` 4900-4918. Cost at 4904, points check at 4905, spend at 4909, flag at 4915.
- `apply_shot_experience`: `/mnt/frankendom-donors/dkfans-keeperfx/src/thing_shots.c` 755-766. Gate at 757, gain at 761-762, add at 764, upgrade check at 765.
- `apply_shot_experience_from_hitting_creature`: `/mnt/frankendom-donors/dkfans-keeperfx/src/thing_shots.c` 772-777 (factor from the target's `exp_for_hitting`, line 776).
- `creature_can_gain_experience`: `/mnt/frankendom-donors/dkfans-keeperfx/src/creature_control.c` 342-354.
- `update_creature_levels`: `/mnt/frankendom-donors/dkfans-keeperfx/src/thing_creature.c` 6419-6434 (one-level branch).
- `compute_creature_max_health` / `compute_creature_max_strength`: `/mnt/frankendom-donors/dkfans-keeperfx/src/thing_stats.c` 355-385 (health formula at 365, strength at 381).
- `update_relative_creature_health`: `/mnt/frankendom-donors/dkfans-keeperfx/src/thing_stats.c` 925-934.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Hit gain scales with the target's level | gain% default 35 (`config_creature.h` 41); target factor `exp_for_hitting` (776); shot value `experience_given_to_shooter` (761) |
| Level cost from a table, spent from points | `to_level[L] << 8` (4904); table filled from LEVELSTRAINVALUES (`config_crtrmodel.c` 1889); grow-up slot from GROWUP (1902) |
| Level cap: owner's cap, absolute top, grow-up exception | per-owner cap (`creature_control.c` 347); `CREATURE_MAX_LEVEL` 10 (`thing_stats.h` 29); top index 9 (351) |
| Linear percent per level, clamped to the top index | 362, 365, 381 |
| Keep the health fraction across a level change | 929-932 |
| One level step per update | 6426-6434 |

Worked arithmetic from the formulas (not a run):
- A hit on a level-4 target with `exp_for_hitting` 100 and shot value 1, default 35%: 100 + 35 x 100 x 4 / 100 = 240 points.
- Base health 100 at level 4 with 35%: 100 + 35 x 100 x 4 / 100 = 240. At level 9: 100 + 35 x 100 x 9 / 100 = 415. Levels above 9 use 9.
- A table value of 1 costs 256 points (1 << 8).

## 4. TypeScript sketch

simplified: clean-room, shape only. Keeps the donor's order for a hit (gate, gain with the target-level term, then the spend-to-level check), the one-step level apply that re-checks for the next step, the stat at a level, and the health rescale by ratio. It omits: the grow-up branch, the owner score add and remove, instance counts, size and render changes, the overflow flag in the strength formula, the 64-bit health arithmetic and INT32 clamp, the permil helper (a health/max ratio stands in for it), the lair, digging and training experience sources, the Lua hook, and the battle-happy state change. It also models one generic stat, not the donor's per-stat list. Integer division is written with Math.floor on non-negative values.

```ts
// Licence: GPL-2.0-or-later (donor source headers). clean-room: shape only, written from the described rules, not a translation.
const MAX_LEVEL = 10;             // levels 0..9; the top index is 9
const GAIN_PER_LEVEL_PCT = 35;    // percent of base per level (donor default; a per-model config value in the donor)

interface Creature {
  level: number;                  // 0-based
  points: number;                 // experience points, not scaled
  levelUpPending: boolean;
  baseHealth: number;             // unscaled base of the model
  maxHealth: number;
  health: number;
  canGrowUp: boolean;
  ownerMaxLevel: number;          // per-owner cap on this model
}

// Stat at a level: base + gain% x base x level / 100, level clamped to the top index. Integer math.
function statAtLevel(base: number, level: number): number {
  const lv = Math.min(level, MAX_LEVEL - 1);
  return base + Math.floor((GAIN_PER_LEVEL_PCT * base * lv) / 100);
}

// Gate: no experience at the owner's cap, or at the top level unless the creature can grow up.
function canGainXp(c: Creature): boolean {
  if (c.level >= c.ownerMaxLevel) return false;
  if (c.level >= MAX_LEVEL - 1 && !c.canGrowUp) return false;
  return true;
}

// Level cost: the table value for the current level, times 256 points.
function levelCost(table: number[], level: number): number {
  return table[level] * 256;
}

// Spend-to-level: if the points cover the cost, the cost is taken and a level-up is queued (below the caps).
function checkLevelUp(c: Creature, table: number[]): boolean {
  const cost = levelCost(table, c.level);
  if (c.points < cost) return false;
  c.points -= cost;
  if (c.level < c.ownerMaxLevel && (c.level < MAX_LEVEL - 1 || c.canGrowUp)) {
    c.levelUpPending = true;
  }
  return true;
}

// A hit: the shooter gains mag x (target factor + gain% x factor x target level / 100), then the upgrade check runs.
function hitXp(shooter: Creature, table: number[], mag: number, targetFactor: number, targetLevel: number): boolean {
  if (!canGainXp(shooter)) return false;
  const gained = mag * (targetFactor + Math.floor((GAIN_PER_LEVEL_PCT * targetFactor * targetLevel) / 100));
  shooter.points += gained;
  checkLevelUp(shooter, table);
  return true;
}

// Once per creature update: at most one level step; the next step is checked again on a later update.
function applyPendingLevel(c: Creature, table: number[]): void {
  if (!c.levelUpPending) return;
  c.levelUpPending = false;
  if (c.level + 1 >= MAX_LEVEL) return;          // grow-up branch not modelled
  const oldMax = c.maxHealth;
  c.level += 1;
  c.maxHealth = statAtLevel(c.baseHealth, c.level);
  c.health = oldMax > 0 ? Math.floor((c.maxHealth * c.health) / oldMax) : c.maxHealth;
  checkLevelUp(c, table);
}
```

## 5. Lands in

- TARGET `src/fight/progression.ts` (new): the per-model cost table, the gain that scales with target level, and the linear percent per level, all as catalogue data. Parity-checklist row 18 (loot roll and XP award).
- today: (not read; no Frankendom file opened from this session)
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later: clean-room, shape only; no line-by-line translation)
- Brief rule served: one ledger (the points spend and the level change go through one step); zones as data (per-owner cap and per-model table); server-verified (points are added on the server at the hit, not in the client)
Best transferable idea: a hit's experience scales with the target's level, the level-up cost is taken from the points against a per-level table, and stats grow linearly by percent per level up to a fixed top index.
Decision (proposed): adapt - keep the target-level gain, the spend-from-points cost table and the capped linear percent per level as per-model data; reject the lair, digging and training experience sources (no Frankendom counterpart) and the classic-bug overflow flag.
Acceptance: A server test: a hit by a creature on a level-4 target with `exp_for_hitting` 100 and shot value 1 adds exactly 240 points; base health 100 at level 4 gives max 240 and, after a level step, keeps the same health fraction; at most one level step happens per update.

## 6. Gaps and risks

- Points are spent when a level is bought, not kept as a running total. Frankendom's XP award (row 18) needs a ruling: spend or accumulate. The donor spends.
- Experience is per hit. Many small hits can farm XP, so a server-verified fight needs a per-fight cap or a per-kill award. Kills are server-verified in Frankendom, so the donor's per-hit award is the wrong unit unless hits are verified too.
- The gain uses the target's level, not the shooter's. With MAX_ATTACKERS = 3 many-on-one fights, the choice of target level for the award must be made and tested.
- One level per update (6426-6434) fits a fixed server step only if the server's per-tick NPC budget allows the re-check; the donor has no budget. Row 18 sub-line "server tick: fixed step, input intake, per-tick NPC budget" applies.
- Health keeps its fraction on a level change (929-932). Frankendom's hero stat or heal rules must define this explicitly, with the permil helper read first (not read here).
- The donor's default 35% per level is a config value per stat and model. It must be data in the catalogue, not a constant in the engine.
- The donor's 64-bit health arithmetic and overflow flag exist for old-game bugs. Do not copy them.
- Not read: the grow-up branch, the permil helper, the health wrapper, the lair and digging sources, and the frame cadence of the turn loop.
