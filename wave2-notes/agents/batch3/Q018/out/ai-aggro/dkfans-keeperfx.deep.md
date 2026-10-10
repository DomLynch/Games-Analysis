# dkfans-keeperfx (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/dkfans-keeperfx/src/creature_states_combt.c` | Licence: GPL-2.0-or-later (per the `creature_states_combt.c` header: "either version 2 of the License, or (at your option) any later version"; repo `LICENSE` is the GPL v2 text) | C | symbols `get_combat_score`, `creature_change_to_most_suitable_combat`, `check_for_better_combat`, `check_for_possible_combat`, `thing_update_enemy_to_fight_with`, `seek_the_enemy`, `creature_combat_flee`

Checked: Read in full: `get_combat_score` (creature_states_combt.c 1512-1556), `creature_is_most_suitable_for_combat` (1727-1751), `check_for_possible_combat` (2677-2706), `creature_change_to_most_suitable_combat` (2708-2724), `check_for_better_combat` (2725-2764), `add_melee_attacker` (1115-1155), `add_waiting_attacker` (1156-1177), `set_creature_combat_state` (1178-1255; read 1115-1256 as one block), `creature_combat_flee` (1374-1444), `creature_in_flee_zone` (2452-2461), `check_for_possible_melee_combat_with_attacker_within_distance` (1558-1593), `check_for_possible_combat_with_attacker_within_distance` (1691-1721), `thing_update_enemy_to_fight_with` (creature_states.c 4589-4620), `seek_the_enemy` (4749-4800, partly), `creature_can_hear_within_distance` (4682-4696), `get_nearest_enemy_creature_possible_to_attack_by` (thing_list.c 2094-2104), `near_thing_pos_thing_filter_is_enemy_which_can_be_attacked_by_creature` (thing_list.c 339-360), `get_combat_state_for_combat` (creature_battle.c 235-265), slot limits (creature_control.h 44-46, creature_battle.c 98-101 and 138-141). Hint file `config/fxdata/lua/bindings/ai.lua` was NOT read: it is a Lua binding and the mechanism is in C. Not read: the ranged variant of the candidate search (1594-1629), `creature_will_attack_creature` (4422, the hostility rule behind the nearest-enemy filter), `creature_scared` and the flee trigger, `creature_has_spare_slot_for_combat`, `change_creature_with_existing_attacker`, the waiting-to-melee promotion, `creature_can_have_combat_with_creature`, the near-flee branch detail, `get_flee_position`. Callers: `creature_is_most_suitable_for_combat` is called at 2846, 2870 and 2923 (state functions, not read); `check_for_better_combat` at 2830 (not read). Confidence: high on the score, slot and switch numbers and on the enemy-cache and flee timer; medium on the complete hostility rule (not read). `camera_scope` not applicable to this cell.

## 1. Mechanism

- Two separate choices. (a) Who a fighter fights, as an "attacker-first" rule: `check_for_possible_combat` (2677) first looks at creatures already fighting this one (`check_for_possible_combat_with_attacker_within_distance`, the fighter's own opponent lists), and only if none is usable does it look for a new enemy (`check_for_possible_combat_with_enemy_creature_within_distance`, called inside 2677-2706). (b) For the enemy it already fights, a score decides whether to switch.
- The score (`get_combat_score`, 1512-1556). For a melee-type attack by a melee-preferring creature (the default branch, 1546): `score_base = 258 * (4 - enemy.melee_attackers) + 258 + 128`. The distance term (1553-1555): distance is capped at 5376 and the term is `((5376 - distance) << 8) / 5376`, which lies between 0 and 256. So one free slot on the enemy (258 points) outweighs the whole distance term (at most 256). Distance is measured by `get_combat_distance` (196-210): 2D distance plus half the height gap (not for doors), minus the average clip size, floored at 0.
- Slots. Each creature has 4 melee and 4 ranged opponent slots (`COMBAT_MELEE_OPPONENTS_LIMIT` 4, `COMBAT_RANGED_OPPONENTS_LIMIT` 4, creature_control.h 44 and 46). `add_melee_attacker` (1115) checks the enemy's slot count (1130) and takes the slot. When the melee slot is full, `set_creature_combat_state` (1178) tries ranged if the creature has a ranged weapon (1239), then a waiting entry (1245). `get_combat_state_for_combat` (creature_battle.c 235-265) gives the same order as a state chooser: ranged if the creature prefers ranged and has a ranged weapon with a free ranged slot; melee if a melee slot is free and the creature has a melee attack; ranged if a ranged slot is free and it has a ranged weapon; otherwise Waiting.
- Switch rule. `creature_is_most_suitable_for_combat` (1727-1751) scores the current fight, then the best alternative among current attackers. It keeps the current fight unless the alternative is more than 258 points better: `return (enmtng->index == other_enmtng->index) || (other_score <= curr_score + 258);` (1750). The re-check runs only when `(get_gameturn() + index) % BATTLE_CHECK_INTERVAL == 0` with `BATTLE_CHECK_INTERVAL` 8 (`check_for_better_combat` 2730, `creature_states_combt.h` 36). The offset by creature index spreads the checks across turns.
- Stability. `check_for_better_combat` (2725-2764): a creature already in a real melee or ranged fight does not change enemy (the test at 2747 returns 0 unless the state is Waiting; the donor's comment on that line says this "makes battles very stable"). A Waiting creature takes a spare slot, or replaces an existing attacker (`change_creature_with_existing_attacker`, not read) (from 2753).
- Enemy acquisition when idle. `seek_the_enemy` (4749) calls `thing_update_enemy_to_fight_with` (4589). The cached enemy (`seek_enemy.enemy_idx`) is kept only if it still exists and its `creation_turn` matches (4595-4601); the cache is searched again when `get_gameturn() - turn_looked_for_enemy > 64` (4609). The search is `get_nearest_enemy_creature_possible_to_attack_by` (thing_list.c 2094), which uses a maximizer filter (339-360) that returns `INT32_MAX - distance` for enemies the creature will attack, so the nearest wins.
- Chase. `seek_the_enemy` moves toward the enemy only if `creature_can_hear_within_distance` (4758): the creature's `hearing` value in subtiles (4687), or 2560 for mature food (same function, read). If heard and not yet in a fight (`instance_id == CrInst_NULL`): if the enemy is within 2304 and the countdown is under 20 turns, it plays a fight sound and a short celebrate instance (4762); otherwise with probability 3 in 4 (`THING_RANDOM(4) != 0`, 4770) it tries to walk close, and if that is not set up it takes a random adjacent slab. If not heard, with probability 1 in 64 (`THING_RANDOM(64) == 0`, 4787) it walks close anyway.
- Flee (`creature_combat_flee`, 1374-1444). Distant branch (2 slabs or more from `flee_pos`, 1374-1444): if it still has melee or ranged attackers, or needs healing, it keeps moving to `flee_pos` and resets `flee_start_turn` to now. Otherwise, while `turns_in_flee <= game_turns_in_flee` (default 200, config_rules.c 131), it moves to `flee_pos` for the first `max(50, game_turns_in_flee >> 2)` turns (1398-1399) and then wanders to a random adjacent slab. After the window ends it returns to its start state (`set_start_state`). Near branch: after 8 turns of fleeing it looks for a fight within 2304 and fights to the death if it finds one; otherwise it wanders while within `game_turns_in_flee`, then ends the flee.

## 2. Key functions

- `get_combat_score`: `/mnt/frankendom-donors/dkfans-keeperfx/src/creature_states_combt.c` 1512-1556. The points for free slots and distance.
- `creature_is_most_suitable_for_combat`: same file, 1727-1751. The 258-point switch margin.
- `check_for_possible_combat`: same file, 2677-2706. Attacker-first, then a new enemy.
- `check_for_better_combat` and the enemy-switch block: same file, 2725-2764. Re-check gate, stability rule, spare slot or replace.
- `add_melee_attacker`, `add_waiting_attacker`, `set_creature_combat_state`: same file, 1115-1255. Slot take and queue.
- `thing_update_enemy_to_fight_with`: `/mnt/frankendom-donors/dkfans-keeperfx/src/creature_states.c` 4589-4620. The enemy cache.
- `seek_the_enemy`, `creature_can_hear_within_distance`: same file, 4682-4800 (4749-4800 partly read). Hearing gate and chase rolls.
- `creature_combat_flee`: `/mnt/frankendom-donors/dkfans-keeperfx/src/creature_states_combt.c` 1374-1444. Flee timer.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Score a target by free attack slots first, then distance; one slot outweighs all distance | 258 per free slot, 258 + 128 flat for a melee attack, distance cap 5376, distance term 0..256 (theirs, 1546, 1553-1555) |
| Keep current target unless the alternative is clearly better | Margin 258 (theirs, 1750) |
| Cap concurrent attackers per target, queue the rest | 4 melee and 4 ranged slots (theirs, creature_control.h 44, 46) |
| Spread re-checks across frames by entity id | Every 8 turns (theirs, creature_states_combt.h 36; 2730) |
| Cache the nearest enemy, validated by generation, refreshed on a timer | Refresh after 64 turns (theirs, creature_states.c 4609) |
| Hearing gate for chasing | Per-creature `hearing` in subtiles (theirs, 4687); 2304 range for the fight sound (4762); 3 in 4 and 1 in 64 chase rolls (4770, 4787) |
| Flee timer that resets while attacked | Default 200 turns (theirs, config_rules.c 131); escape window max(50, turns >> 2) (theirs, 1398-1399) |

## 4. TypeScript sketch

simplified: the sketch covers the melee branch of the score, the 258 switch margin, the slot take and queue, the enemy cache with its generation check and timer, the turn-stagger gate, and the flee timer for the distant case. It omits the ranged candidate search and its scoring, the ranged-preference branch of `get_combat_score`, the attack-type choice (`creature_can_have_combat_with_creature`), the waiting-to-melee promotion and `change_creature_with_existing_attacker` (not read), the stability test's state check, the hostility rule (`creature_will_attack_creature`, not read), the near-flee branch and its 2304 fight search, the flee-point choice, the fear trigger, and the donor's "distance from `get_combat_distance`" (the sketch takes a distance as given). The sketch reorders nothing: it keeps the donor's order of score, switch margin, then slot.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const SLOTS = 4;            // donor COMBAT_*_OPPONENTS_LIMIT; Frankendom sets its own cap (MAX_ATTACKERS = 3)
const SLOT_POINTS = 258;    // one free slot outweighs the whole distance term (which is 0..256)
const CHAIN_POINTS = 128;   // flat bonus for a melee-type attack (donor default branch)
const DIST_CAP = 5376;      // distance at or beyond this scores zero distance points
const SWITCH_MARGIN = 258;  // switch target only when the best alternative beats the current one by more than this
const CHECK_EVERY = 8;      // turns between re-checks, staggered by fighter id
const ENEMY_REFRESH = 64;   // turns before the nearest-enemy cache is searched again
const FLEE_TURNS = 200;     // donor default rule GAMETURNSINFLEE

interface Foe { id: number; gen: number; attackers: number; distance: number; }

// Score of one candidate: free slots first, then distance. Mirrors the default melee branch, not every branch.
function score(foe: Foe): number {
  const free = Math.max(0, SLOTS - foe.attackers);
  const slotTerm = SLOT_POINTS * free + SLOT_POINTS + CHAIN_POINTS;
  const d = Math.min(foe.distance, DIST_CAP);
  return slotTerm + Math.floor(((DIST_CAP - d) * 256) / DIST_CAP);
}

// Keep the current target unless an alternative beats it by more than SWITCH_MARGIN.
function pickBetterTarget(current: Foe, attackingMe: Foe[]): Foe | null {
  const currentScore = score(current);
  let best: Foe | null = null;
  let bestScore = currentScore;
  for (const f of attackingMe) {
    if (f.id === current.id && f.gen === current.gen) continue;
    const s = score(f);
    if (s > bestScore) { bestScore = s; best = f; }
  }
  return best !== null && bestScore > currentScore + SWITCH_MARGIN ? best : null;
}

// Take a melee slot if the foe has one free; otherwise the fighter waits in the queue.
function assignSlot(foe: Foe): "melee" | "waiting" {
  if (foe.attackers < SLOTS) { foe.attackers += 1; return "melee"; }
  return "waiting";
}

// Cached nearest enemy: keep it while it is the same entity (generation check), search again every ENEMY_REFRESH turns.
interface EnemyCache { id: number; gen: number; lookedAt: number; }
function refreshEnemy(c: EnemyCache, now: number,
                      live: (id: number, gen: number) => boolean,
                      nearest: () => { id: number; gen: number } | null): { id: number; gen: number } | null {
  let found: { id: number; gen: number } | null =
    c.id !== 0 && live(c.id, c.gen) ? { id: c.id, gen: c.gen } : null;
  if (now - c.lookedAt > ENEMY_REFRESH) { c.lookedAt = now; found = nearest(); }
  c.id = found === null ? 0 : found.id;
  c.gen = found === null ? 0 : found.gen;
  return found;
}

// Re-check only on every CHECK_EVERY-th turn, offset by fighter id so the work is spread out.
function dueForCheck(now: number, fighterId: number): boolean {
  return (now + fighterId) % CHECK_EVERY === 0;
}

// Flee from attackers keeps the flee alive; otherwise flee for FLEE_TURNS, moving straight for the first quarter (at least 50 turns).
function fleeAction(turnsInFlee: number, attackers: number): "move-to-point" | "wander" | "end" {
  if (attackers > 0) return "move-to-point";
  const escape = Math.max(50, FLEE_TURNS >> 2);
  if (turnsInFlee <= FLEE_TURNS) return turnsInFlee <= escape ? "move-to-point" : "wander";
  return "end";
}

export {};
```

## 5. Lands in

- TARGET `src/fight/ai.ts` (AI brain: target choice and switch rule, enemy cache, flee timer). Parity-checklist row 2 (AI brain).
- today: (not checked) the Frankendom repo was not opened in this pass.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later: clean-room, shape only)
- Brief rule served: 1 (one engine: target choice and the attacker cap live in the engine, not the client); MAX_ATTACKERS = 3 is set by Frankendom and replaces the donor's 4 per side (gap noted in section 6)

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism; no donor lines are translated.
- The cap is 4 melee and 4 ranged per creature here. Frankendom's MAX_ATTACKERS = 3 is a ruling. Use the same slot-and-queue shape with cap 3; do not copy the 4.
- The score is distance-plus-slots. There is no threat or hate list in this file (the donor's threat is the count of attackers; the damage side was not read). Frankendom's many-on-one hate list must come from elsewhere.
- Stability is a design choice in the donor: a fighter in a real fight does not switch, and switching needs a 258-point gap. That is a number Frankendom should make data (per zone or per encounter), not a constant.
- The attacker-first rule means a creature facing several enemies keeps fighting the ones already on it. That is good for duels; check it against the many-on-one feel in the Pit and zones before adopting.
- The donor's "waiting" queue is not a list on the enemy: a waiting creature is a fighter with a Waiting flag and a battle entry (`add_waiting_attacker`, 1156-1177). Frankendom's one-ledger rule would want the queue in the engine, with the server verifying slot counts.
- Flee is a movement with a timer in the donor, and the timer resets while attacked. Frankendom's flee is a state change verified by the server. Keep the reset rule as a state fact (attacked -> still fleeing) and make the timer data.
- Units: the donor's distances are its map coordinates (the scale to metres or Frankendom units was not read). Frankendom must pick its own distance unit before using 5376, 2304 or 258.
- Per-tick budget: the 8-turn stagger (2730) is the donor's compute budget for target re-checks. Matches the post-K item 3 sub-line "per-tick NPC budget"; row 18 is the closest parity row for the server tick.
- Not read: the ranged candidate search, `creature_will_attack_creature` (the hostility rule, 4422), the flee trigger (`creature_scared`), the spare-slot test, the waiting promotion, the near-flee branch detail.

Best transferable idea: score a target by free attack slots first and distance second, switch only when the alternative beats the current one by a fixed margin, and queue the attackers that do not fit.
Decision (proposed): adapt - the slot-first score, the switch margin and the queue fit a many-on-one fight with a cap of 3, but the cap, the margin and the distance unit must be Frankendom's own data values.
Acceptance: a server test with one player and four hostile creatures in range asserts that at most 3 attack at once, the fourth is queued, and the monster keeps its current target when a new candidate beats it by less than the margin; a second test asserts that a monster's target switches to a candidate with a free slot once its current target is at the cap.
