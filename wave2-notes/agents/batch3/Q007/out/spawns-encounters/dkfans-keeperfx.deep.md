# dkfans-keeperfx (spawns-encounters, cell 5)

Donor: `/mnt/frankendom-donors/dkfans-keeperfx/src/room_entrance.c` (plus `src/game_update.cpp`, `src/player_utils.c`, `src/dungeon_stats.c`, `src/creature_states_scavn.c`) | Licence: GPL-2.0-or-later (room_entrance.c header lines 15-16: "either version 2 of the License, or (at your option) any later version"; the LICENSE file is GPL v2, June 1991) | C / C++ | symbol `process_entrance_generation`

Checked: `process_entrance_generation` (room_entrance.c 382-417) read in full, with its callees `generation_due_for_dungeon` (92-110), `generation_available_to_dungeon` (112-120), `creature_will_generate_for_dungeon` (197-237), `calculate_creature_to_generate_for_dungeon` (250-308), `generate_creature_for_dungeon` (328-380), `generate_creature_at_random_entrance` (310-326), `create_creature_at_entrance` (51-90) and `calculate_attractive_room_quantity` (122-161). The loop that drives it is game_update.cpp `process_dungeons` (269-280, call at 276), called once per update pass (507) with the turn counter at 534. Read in part: `update_dungeon_generation_speeds` (player_utils.c 475-504), `update_dungeon_scores_for_player` (dungeon_stats.c 219-278), `can_scavenge_creature_from_pool` (creature_states_scavn.c 237-248), `creature_count_below_map_limit` (thing_creature.c 4904-4910), `calculate_free_lair_space` (room_lair.c 50-75, the rest not read). Not read: `PLAYER_RANDOM` beyond its macro, `pick_random_room_of_role`, `setup_person_move_to_position`, the sub-scores `compute_dungeon_rooms_attraction_score` / `compute_dungeon_creature_tactics_score` / `compute_dungeon_train_research_manufctr_wealth_score`, and the rest of `calculate_free_lair_space`. Callers: `process_entrance_generation` has one caller (game_update.cpp:276); `generate_creature_for_dungeon` and `generate_creature_at_random_entrance` have one caller each (checked by grep). Confidence: high on the spawn path and the interval; medium on the manage score, which I read in outline only. Best transferable idea and decision are below.

Best transferable idea: a zone spawn director that draws each new arrival from a finite per-kind pool by one weighted roll, gated by presence of required room slabs and a population cap, on a fixed-step attempt clock whose interval scales with how well the zone is run.
Decision (proposed): adapt — the cap, finite pool, presence gate, single weighted roll and per-zone clock fit parity row 23 as zone data; the gold, lair, room-role and manage-score inputs are Dungeon Keeper economy and must be replaced by a zone-defined input, and the clock runs on the server fixed step.
Acceptance: a server test with cap 3, a 30 s interval and a pool of 2 goblins spawns exactly 2 and never exceeds 3 live; an attempt made while the cap is full still restarts the clock; the pool drops by one per spawn and never on a refused attempt.

## 1. Mechanism

- The director runs once per game turn, inside the fixed update pass. `process_dungeons` calls `process_entrance_generation` (game_update.cpp 276); the turn counter advances once per pass (534). So the tick is a fixed step in game turns, not wall-clock time. There is no accumulator in the code read.
- Per existing player (room_entrance.c 386-408): `generation_due_for_dungeon` first checks the map-wide creature limit (94-98). If the world is full the attempt is not due and the clock is not touched. Then it checks armageddon (100-107) and the interval (102-103): due when `get_gameturn() - last_entrance_generation_gameturn >= turns_between_entrance_generation`.
- If due: `due` is set (397) so the scores refresh later (409-416). Only an active keeper who has not lost is served (398). For that player, generation happens only if `generation_available_to_dungeon` passes (400): the dungeon has a room with the CrPoolSpawn role (115), no armageddon is running (117), and `num_active_creatrs < max_creatures_attracted` (119).
- Kind choice (`calculate_creature_to_generate_for_dungeon`, 250-308). A kind is eligible if its pool count is above zero (201-204), it is allowed for this dungeon (207-211), and either it is forced (213-216) or every entrance room it names has at least its required slab count (222-234). Each eligible kind gets weight `entrance_score + excess attraction`, floored at 1 (269-272). Excess attraction is the sum over its entrance rooms of the room's attraction divided by (rank + 1) (173-174). The weights are summed into a running total (273-274). One roll `PLAYER_RANDOM(owner, cum_freq)` (288) picks the first kind whose running sum exceeds the roll (291-300).
- Gates (`generate_creature_for_dungeon`, 328-380), in this order. (a) Gold: if the kind's `pay` is greater than the owner's gold (339-345), nothing arrives and a gold message may show. (b) Lair: `lair_space = calculate_free_lair_space` (336). If `lair_space >= 0` (346) the creature is generated at a random entrance (354). "One homeless creature is also allowed" (348), so at exactly zero free space one still comes. If `lair_space < 0` nothing arrives (356-360).
- Creation (`generate_creature_at_random_entrance`, 310-326). A random CrPoolSpawn room of the owner is chosen (314). `create_creature_at_entrance` (51-90) creates the creature at the room centre, sets the entrance level, counts it as attracted, and sends it to the heart. The pool is decremented only if the creature was created (320-324).
- Timer reset (room_entrance.c 402-404). For every due attempt by an active keeper, the clock is reset to now and `portal_scavenge_boost` is cleared, whether or not a creature arrived. Refused attempts (cap full, no gold, no lair room) therefore still restart the interval.
- Interval (player_utils.c 475-504). `turns_between_entrance_generation = max_manage_score * generate_speed / own manage_score` (498), or `generate_speed` when own manage_score is 0 or less (500). Each dungeon's manage score comes from `update_dungeon_scores_for_player` (dungeon_stats.c 219-278), which sums attraction, tactics, room variety and wealth terms, subtracts a creature-count term, and cuts the result by up to half for angry creatures (277). The scores and intervals are recomputed only on a pass where some dungeon was due and armageddon is off (409-416).
- Pool helpers: `add_creature_to_pool` (431-447) saturates at INT32 limits; `clear_creature_pool` (449-453). `can_scavenge_creature_from_pool` (creature_states_scavn.c 241-244) uses the same two gates, pool above zero and `num_active_creatrs < max_creatures_attracted`.

## 2. Key functions

- `process_entrance_generation`: `/mnt/frankendom-donors/dkfans-keeperfx/src/room_entrance.c` 382-417. The per-turn loop: due check, active-keeper gate, availability, generate, timer reset, then the score refresh.
- `generation_available_to_dungeon`: `/mnt/frankendom-donors/dkfans-keeperfx/src/room_entrance.c` 112-120. Room-role check, armageddon check, population cap.
- `creature_will_generate_for_dungeon`: `/mnt/frankendom-donors/dkfans-keeperfx/src/room_entrance.c` 197-237. Pool, allowed, forced bypass, presence gate.
- `calculate_creature_to_generate_for_dungeon`: `/mnt/frankendom-donors/dkfans-keeperfx/src/room_entrance.c` 250-308. Cumulative weights and one seeded roll.
- `generate_creature_for_dungeon`: `/mnt/frankendom-donors/dkfans-keeperfx/src/room_entrance.c` 328-380. Gold gate, lair gate, then creation.
- `update_dungeon_generation_speeds`: `/mnt/frankendom-donors/dkfans-keeperfx/src/player_utils.c` 475-504. The interval formula.
- `update_dungeon_scores_for_player`: `/mnt/frankendom-donors/dkfans-keeperfx/src/dungeon_stats.c` 219-278. The managing score that scales the interval (read in outline).
- Driver: `/mnt/frankendom-donors/dkfans-keeperfx/src/game_update.cpp` 269-280 (`process_dungeons`, call at 276) and 507 and 534 (the update pass and turn counter).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Population cap on live arrivals | Default cap 200 (theirs, config_rules.c 170, `DEFAULTMAXCREATURESGENERATEENTRANCE`); the cap is compared with active creatures (room_entrance.c 119) |
| Attempt clock in whole game turns, reset on every due attempt | Default interval 350 turns (theirs, config_rules.c 169, `DEFAULTGENERATESPEED`); the interval is scaled by a score ratio (player_utils.c 498) |
| Base weight per kind, floored at 1 | Base weight 10 (theirs, config_creature.c 457); floor 1 (room_entrance.c 270) |
| Presence gate: required slabs of a room before a kind can arrive | Per kind, from config (entrance_slabs_req, default 0 at config_creature.c 455) |
| Excess weight from rooms, later rooms count less | Ranks divided by 1, 2, 3 (room_entrance.c 173-174) |
| Room attraction, minus owned count of that kind | 1 per 3 slabs for most entrance rooms (room_entrance.c 148); 1 per 9 slabs for dungeon heart and bridge (136); 1 per 4 slabs for workshop and garden (152); lair half the free fraction per slab (132); treasure per used fraction over 3, no owned term (156) |
| Gold gate per arrival | Per kind `pay` (room_entrance.c 339) |
| Lair gate, one over-capacity arrival allowed | Threshold 0 (room_entrance.c 346, 348 comment) |
| Map-wide ceiling checked before the clock | Rule `creatures_count` (thing_creature.c 4909); hard ceiling `CREATURES_COUNT-1` (4906) |
| Managing score cut by up to half for angry creatures | Factor 1/2 base plus mood term (dungeon_stats.c 277, comment 276) |
| Pool as finite stock, decremented on success only | Starts from level script (add_creature_to_pool, room_entrance.c 431); no default read |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: due check, population cap, one weighted roll over eligible kinds (pool above zero, allowed, presence gate), gold gate, lair gate, pool drop only on success, and clock restart on every due attempt. It omits the map-wide creature limit, the excess-attraction term and owned-count penalty (weights are plain inputs here), the forced-kind bypass, the armageddon pause, the choice of entrance room and creature creation, the portal scavenge boost reset, the active-keeper and lost-level gate, the score refresh after a due pass, and the gold message. It does not deduct gold on arrival; the donor's generation function does not either (the code read has no deduction). It does not reproduce the donor's max-score loop bug (player_utils.c 486-487); `intervalFor` takes the best score as an input. The donor's seeded random series is replaced by an injected `roll` function.

```ts
// Licence: GPL-2.0-or-later (donor header, src/room_entrance.c lines 15-16). Clean-room sketch of the mechanism, not a translation.
// clean-room
interface Kind {
  id: string;
  pool: number;           // finite stock of this kind still waiting to arrive
  allowed: boolean;
  weight: number;         // base weight (donor: entrance_score, default 10)
  requiredSlabs: number;  // presence gate: slabs of the attracting room
  pay: number;            // gold an arrival needs (gate only in this sketch)
}

interface Zone {
  cap: number;            // max live creatures (donor: max_creatures_attracted)
  active: number;
  gold: number;
  roomSlabs: number;      // slabs of the attracting room (one room type here)
  lairFree: number;       // free lair capacity; may go negative when over capacity
  lastAttempt: number;    // game turn of the last due attempt
  intervalTurns: number;  // turns between attempts
}

// Weighted pick: one roll over the cumulative weights of the eligible kinds.
function pickKind(kinds: Kind[], zone: Zone, roll: (n: number) => number): Kind | null {
  const eligible = kinds.filter(k => k.pool > 0 && k.allowed && zone.roomSlabs >= k.requiredSlabs);
  if (eligible.length === 0) return null;
  const weights = eligible.map(k => Math.max(1, k.weight));
  const total = weights.reduce((a, b) => a + b, 0);
  let rnd = roll(total);
  for (let i = 0; i < eligible.length; i++) {
    if (rnd < weights[i]) return eligible[i];
    rnd -= weights[i];
  }
  return null;
}

// One fixed-step turn of the director. Due check, cap, pick, gates; the clock restarts on every due attempt.
export function directorTick(zone: Zone, kinds: Kind[], now: number, roll: (n: number) => number): boolean {
  if (now - zone.lastAttempt < zone.intervalTurns) return false;   // not due
  let spawned = false;
  if (zone.active < zone.cap) {                                     // population cap
    const kind = pickKind(kinds, zone, roll);
    if (kind && zone.gold >= kind.pay && zone.lairFree >= 0) {      // gold gate, lair gate
      kind.pool -= 1;                                                // pool drops only on success
      zone.active += 1;
      spawned = true;
    }
  }
  zone.lastAttempt = now;                                            // clock restarts either way
  return spawned;
}

// Interval scales with the zone's score: a zone scored below the best one waits longer.
export function intervalFor(bestScore: number, ownScore: number, speed: number): number {
  if (ownScore <= 0) return speed;
  return Math.floor((bestScore * speed) / ownScore);
}

export {};
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population director, one tick per zone on the server fixed step). Parity-checklist row 23 (zone population: spawn cap, respawn, despawn). The director's attempt clock is the respawn interval; the cap is the spawn cap. The donor has no despawn, so row 23's despawn half is not covered by this cell. The server tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" applies to the clock (row 18 / post-K item 3). I did not read the Frankendom target file in this pass.
- today: (not read) `origins/server/world-spawns.ts`.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: spawn decisions in the server engine, zones as data); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not from the lines.
- Economy inputs do not transfer. Gold `pay`, lair free space, room-role spawn points and the manage score are Dungeon Keeper concepts. In Frankendom the shape transfers (cap, finite pool, presence gate, one weighted roll, clock) and each economy input must become a zone-defined field with a default, not a constant in the function.
- Units. The donor clock counts game turns (default 350). Frankendom must store the interval in seconds on the server tick, and the conversion is a zone-data decision.
- Clock on refused attempts. The donor restarts the clock on every due attempt, including ones refused by the cap, the gold gate or the lair gate (room_entrance.c 402-404). Frankendom must choose and test this. A full zone then waits a whole interval before it retries, and a refused arrival does not get a faster retry.
- Map-wide ceiling. The donor checks the world creature limit before the clock (room_entrance.c 94-98), so a full world leaves the clock untouched and the next free slot fills at once. Frankendom must state which behaviour it wants.
- Randomness. Each due attempt draws one roll even when a later gate refuses the arrival (room_entrance.c 288 comes before 339 and 346). The donor uses one seeded series (game_merge.h 71; net_checksums.c 192 includes it in the checksums). Frankendom needs one seeded stream per zone so the server can replay a spawn.
- Donor bug (player_utils.c 486-487, read). The max-score loop compares `dungeon->total_score` with `max_manage_score` but stores `dungeon->manage_score`. So the value used as the numerator is not guaranteed to be the largest manage score among the dungeons. (Inference, not tested: this can shift every dungeon's interval.) Do not copy this loop.
- Scaling input. The interval scales with a Dungeon Keeper score. Frankendom needs a designer-defined zone score (for example, clear pace) as zone data, with the same formula shape. Do not reuse the Keeper score itself.
- Not the fight cap. The donor cap of 200 is a zone population cap. MAX_ATTACKERS = 3 is a per-fight rule and stays in src/fight. Do not merge the two.
- No despawn. The code read has no despawn and no grace timer (room_entrance.c read in full). Row 23 needs despawn on empty with a grace timer. Look for that in another donor; this one does not show it.
