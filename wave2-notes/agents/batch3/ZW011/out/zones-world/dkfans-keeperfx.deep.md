# dkfans-keeperfx (zones-world, cell 3)

Donor: `/mnt/frankendom-donors/dkfans-keeperfx/src/room_entrance.c` (process_entrance_generation 382-417, generation_due_for_dungeon 92-110, generation_available_to_dungeon 112-120, weighted pick 250-308); interval from `/mnt/frankendom-donors/dkfans-keeperfx/src/player_utils.c` (update_dungeon_generation_speeds 475-504) | Licence: GNU GPL version 2 or any later version (`room_entrance.c` header lines 13-16; `/mnt/frankendom-donors/dkfans-keeperfx/LICENSE`, "Version 2, June 1991") | C | symbol `process_entrance_generation`

Checked: `room_entrance.c` read in full (453 lines): create 51-90, due 92-110, available 112-120, attraction 122-161, excess 163-178, will-generate 197-237, pick 250-308, generate-at-entrance 310-326, generate 328-380, process 382-417, pool 419-453. `process_entrance_generation` is called from `process_dungeons` (`game_update.cpp` 269-280, line 276 read); the caller of `process_dungeons` was not traced. Interval: `update_dungeon_generation_speeds` (`player_utils.c` 475-504, read in full). Map limit: `creature_count_below_map_limit` (`thing_creature.c` 4904-4910, read). Seed: `PLAYER_RANDOM` (`game_merge.h` 71; `LbRandomSeries` not read). Config: default generate speed 350 (`config_rules.c` 169; where a player's speed is set was not traced), default entrance score 10 (`config_creature.c` 457). Hint file: `ariadne_regions.c` was opened (first 40 lines): it is the Ariadne region array, not spawn logic, so the hint was the wrong file. Not read: `calculate_free_lair_space`, `create_creature`, `pick_random_room_of_role`, the place where `num_active_creatrs` is incremented, `update_dungeons_scores`, per-model entrance room table (`config_crtrmodel.c` 1050-1087 seen by grep only). camera_scope: not a camera cell. Confidence: high on order of steps and every formula in `room_entrance.c` (read in full); high that the max in `update_dungeon_generation_speeds` is written wrong (read, not run). Confidence on the interval's effect: medium (formula read, not run).

Best transferable idea: a spawn director that fires on a turn interval, picks one kind from a weighted table whose weights rise with what the zone supports, and stops at an active-count cap and at a price the player cannot pay.
Decision (proposed): adapt - the interval, weighted pick, cap and pool gates map onto row 23 spawn tables as zone data (caps, weights, intervals per zone); the donor spawns at the player's entrance and never despawns, so Frankendom keeps the director shape and makes the server own spawn and any despawn.
Acceptance: server test: a zone with cap 6 and interval 10 turns never holds more than 6 live creatures and spawns at most one per interval; the timer resets when the cap blocks a spawn, so blocked ticks do not bank spawns; over 1000 seeded picks, adding three matching zone features raises that kind's share (the test asserts the direction, not a fixed number).

## 1. Mechanism

- Each game update, `process_dungeons` (game_update.cpp 276) calls `process_entrance_generation`. For each existing player dungeon it asks `generation_due_for_dungeon` (room_entrance.c 395).
- Due (92-110): not due while the creature count is at the map limit (94), or while armageddon has been cast and its countdown has run (100). Due needs an interval other than -1 (102) and `turn - last >= interval` (103).
- If due, and the player is an active keeper not in a lost state (398), the code generates only if `generation_available_to_dungeon` (400): the owner has a room with role CrPoolSpawn (115), no armageddon countdown is running (117-118), and active creatures are below `max_creatures_attracted` (119).
- Then, whether or not a creature came: `last_entrance_generation_gameturn` = now (403) and `portal_scavenge_boost` = 0 (404). So the timer resets on every due turn for an active keeper.
- Pick (250-308): for each model that `creature_will_generate_for_dungeon` allows (in the pool, allowed, forced, or every room requirement met; 197-237), weight = max(1, base `entrance_score` + excess attraction) (269-272). Excess attraction (163-178) = sum over the model's up to three room slots i of `room quantity / (i+1)`, where room quantity is per room kind (122-161): lair `(slabs x (256 - used)/256)/2 - owned`; heart or bridge `slabs/9 - owned`; workshop or garden `slabs/4 - owned`; treasure `slabs x used/256/3`; others `slabs/3 - owned`.
- Roll: `PLAYER_RANDOM(owner, total)` (288), then the first model whose cumulative weight exceeds the roll (291).
- Generate (328-380): if the model's `pay` is above the owner's gold, nothing happens (339); the gold is only checked here, not taken. If `lair_space >= 0` (346), the creature is created at a random CrPoolSpawn room (314-320) and the pool count drops by one (324). A full lair (space 0) still lets one homeless creature in (comment at 348). Negative lair space: nothing.
- Interval (player_utils.c 498): `turns_between = max_manage_score x generate_speed / own manage_score`. So the best-run dungeon gets the base speed and others wait longer (as intended; see the gap below for the max). If own score is 0 the interval is the plain generate speed (default 350, `config_rules.c` 169; assignment at `player_utils.c` 500).

## 2. Key functions

- `process_entrance_generation`: `/mnt/frankendom-donors/dkfans-keeperfx/src/room_entrance.c` 382-417. Due, availability, reset, the one-per-turn generation.
- `generation_due_for_dungeon`: same file, 92-110. Map limit, armageddon, interval test.
- `generation_available_to_dungeon`: same file, 112-120. Room, armageddon, active cap.
- `calculate_attractive_room_quantity` and `calculate_excess_attraction_for_creature`: same file, 122-161 and 163-178. The attraction weights.
- `creature_will_generate_for_dungeon`: same file, 197-237. The eligibility gate.
- `calculate_creature_to_generate_for_dungeon`: same file, 250-308. The weighted pick.
- `generate_creature_for_dungeon`: same file, 328-380. Gold and lair gates, then creation.
- `update_dungeon_generation_speeds`: `/mnt/frankendom-donors/dkfans-keeperfx/src/player_utils.c` 475-504. The interval per dungeon.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Director fires on a turn interval, timer resets on each due turn | Interval = max score x base speed / own score (theirs, player_utils.c 498); default base speed 350 (theirs, config_rules.c 169) |
| Weighted roulette over eligible kinds, weight = base + bonus, floor 1 | Base 10 (theirs, config_creature.c 457); floor 1 (theirs, room_entrance.c 270-272) |
| Bonus from zone features with diminishing slots | First slot full, second 1/2, third 1/3 (theirs, comment at 173; arithmetic at 174) |
| Feature counts per kind | One per 9 (heart, bridge), per 3 (most rooms), per 4 (workshop, garden), lair half of free share (theirs, 132-156) |
| Active-count cap | `max_creatures_attracted` (theirs, room_entrance.c 119) |
| Global cap | Creature count below the rules limit (theirs, thing_creature.c 4909) |
| Pool counts, consumed on success | Pool kind count (theirs, 201, 243, 324) |
| Price gate, no spend in this function | Pay above gold (theirs, 339) |
| Seeded per player | `PLAYER_RANDOM` (theirs, game_merge.h 71) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order: due test (blocked, interval, active keeper), then availability (room, active cap), then the weighted pick (eligibility, weight = max(1, base + excess), roll), then the gold and lair gates, then the pool decrement. It omits: the room-role lookup and the creature creation (the sketch assumes creation succeeds, while the donor only decrements the pool after a creature is created), the armageddon countdown (the donor checks it twice, once in the due test and once in availability; the sketch merges them into one flag), the messages and events, the `portal_scavenge_boost` reset, the lair-space function (passed as a number), and the forced-enable count comparison (passed as a boolean). The roll function is assumed to return 0 to n-1 (LbRandomSeries not read).

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch of the shape only, written from the described order of steps, not a translation.
const ENTRANCE_ROOMS = 3;           // donor: ENTRANCE_ROOMS_COUNT (creature_control.h)

type RoomKind = "lair" | "heart" | "bridge" | "workshop" | "garden" | "treasure" | "other";

interface RoomReq { kind: RoomKind; slabsReq: number; }

interface Model {
  entranceScore: number;            // base weight (donor default 10; zone/level data)
  rooms: RoomReq[];                 // up to ENTRANCE_ROOMS requirements
  pay: number;                      // gold needed to arrive
  owned: number;                    // owned_creatures_of_model
  pool: number;                     // creatures of this kind still in the pool
  allowed: boolean;
  forced: boolean;                  // donor: force_enabled above models_joined
}

interface Dungeon {
  slabs: Record<RoomKind, number>;  // room slab counts
  usedFrac256: Record<RoomKind, number>; // used capacity on a 0..256 scale
  turnsBetween: number;             // turns_between_entrance_generation
  lastGenTurn: number;
  active: number;                   // num_active_creatrs
  maxActive: number;                // max_creatures_attracted
  gold: number;
  lairSpace: number;                // free lair space; negative = over capacity
  rnd: (n: number) => number;       // seeded per player, returns 0..n-1
}

// Donor calculate_attractive_room_quantity: each room kind gives a count, per model, with its own formula.
function roomQuantity(d: Dungeon, kind: RoomKind, owned: number): number {
  const s = d.slabs[kind];
  const used = d.usedFrac256[kind];
  switch (kind) {
    case "lair": return Math.trunc(Math.trunc(s * (256 - used) / 256) / 2) - owned;
    case "heart": case "bridge": return Math.trunc(s / 9) - owned;
    case "workshop": case "garden": return Math.trunc(s / 4) - owned;
    case "treasure": return Math.trunc(Math.trunc(s * used / 256) / 3);
    default: return Math.trunc(s / 3) - owned;
  }
}

// Donor calculate_excess_attraction_for_creature: first room counts fully, second 1/2, third 1/3.
function excessAttraction(d: Dungeon, m: Model): number {
  let excess = 0;
  for (let i = 0; i < ENTRANCE_ROOMS; i++) {
    const r = m.rooms[i];
    if (r && r.slabsReq > 0) excess += Math.trunc(roomQuantity(d, r.kind, m.owned) / (i + 1));
  }
  return excess;
}

// Donor creature_will_generate_for_dungeon: in pool, allowed, then forced, else room space met.
function canGenerate(d: Dungeon, m: Model): boolean {
  if (m.pool <= 0 || !m.allowed) return false;
  if (m.forced) return true;
  return m.rooms.every(r => r.slabsReq <= 0 || d.slabs[r.kind] >= r.slabsReq);
}

// Donor calculate_creature_to_generate_for_dungeon: weighted pick, weight = max(1, base + excess).
function pickModel(d: Dungeon, models: Model[]): number {
  const cum: number[] = [];
  let total = 0;
  for (const m of models) {
    if (canGenerate(d, m)) total += Math.max(1, m.entranceScore + excessAttraction(d, m));
    cum.push(total);
  }
  if (total <= 0) return -1;
  const rnd = d.rnd(total);
  for (let i = 0; i < models.length; i++) {
    if (canGenerate(d, models[i]) && rnd < cum[i]) return i;
  }
  return -1;
}

// Donor generate_creature_for_dungeon: gold is only checked (no deduction in this function); lair space 0 still allows one.
function generateOne(d: Dungeon, models: Model[]): boolean {
  const i = pickModel(d, models);
  if (i < 0) return false;
  const m = models[i];
  if (m.pay > d.gold) return false;
  if (d.lairSpace < 0) return false;
  models[i].pool -= 1;              // remove_creature_from_generate_pool (donor: only after a creature was created)
  return true;
}

// Donor process_entrance_generation, per dungeon and turn.
// blocked = map creature limit or armageddon (donor: generation not due, timer NOT reset).
// The timer resets for an active keeper even when nothing is generated (donor line 403).
export function processTurn(d: Dungeon, models: Model[], turn: number, blocked: boolean, hasEntrance: boolean, activeKeeper: boolean): void {
  if (blocked) return;
  if (d.turnsBetween === -1 || turn - d.lastGenTurn < d.turnsBetween) return;
  if (!activeKeeper) return;
  if (hasEntrance && d.active < d.maxActive) generateOne(d, models);
  d.lastGenTurn = turn;
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population director: interval, weighted pick, cap, pool; server-owned). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). The donor has spawn caps and respawn but no despawn or grace timer, so only those two parts of row 23 are covered.
- today: not read (no Frankendom repo was read in this pass).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: zones as data (per-zone caps, weights, intervals); one engine (the director lives on the server); server decides who spawns.

## 6. Gaps and risks

- Donor bug (player_utils.c 486-487): the scan compares `total_score` against the running max, then stores `manage_score`. The intended maximum is over `manage_score`. As written, `max_manage_score` takes the `manage_score` of any active keeper whose `total_score` is larger than the running value of `max_manage_score`; when that value stays 0, dungeons with a positive score get an interval of 0, i.e. generation on every due turn (read, not run). Keep the idea (interval scales with the best zone's score); the fix is to compute the maximum over one field, explicitly, in the server code, and test it.
- Timer behaviour: the donor resets the timer for an active keeper even when the cap blocks the spawn (403 is outside the availability check), so blocked turns do not bank spawns. But the map-limit and armageddon blocks do not reset it (the due test returns first). Frankendom must pick and test one rule; the sketch follows the donor.
- No despawn, no grace timer, no empty-zone rule: creatures in the donor stay until they die or leave by their own AI. Row 23 needs despawn on empty with a grace timer, which this donor does not have.
- The price gate only checks gold; nothing is spent in this function (339). If Frankendom copies the gate it must say who pays and debit one ledger, not a per-dungeon total.
- Global mutable pool (`game.pool.crtr_kind`): the donor shares one pool across all players. Frankendom must keep the pool on the server as one ledger, with a clamp on add (room_entrance.c 431-446, read).
- Attraction uses owned counts and the owner's own room counts. A zone version needs zone-level counts as data and must say which zone a feature belongs to.
- `ENTRANCE_ROOMS_COUNT` is 3 (room requirement slots), which is unrelated to `MAX_ATTACKERS = 3` (fight engine). Do not merge the two numbers.
- Only one caller was traced for `process_entrance_generation` (game_update.cpp 276). The caller's turn rate was not read, so the interval unit (game turns) is taken from the code's own name for it.
- The score and speed refresh (`update_dungeons_scores`, `update_dungeon_generation_speeds`) runs only on a turn when some dungeon was due and the armageddon turn is 0 (room_entrance.c 409-416), so intervals stay stale between due turns.
- `generate_creature_for_dungeon` raises the NoMoreLivingSet event (room_entrance.c 361-369) when lair space is 0 or less; not covered.

## Checker findings

- Verdict: MINOR
- Corrected: own manage_score 0 interval: plain generate speed is 350 by default, not 500 (config_rules.c 169, player_utils.c 500)
- Missed (also added to section 6): score/speed refresh trigger (a due dungeon and armageddon_cast_turn == 0, room_entrance.c 409-416); NoMoreLivingSet event when lair space is exhausted (361-369)
