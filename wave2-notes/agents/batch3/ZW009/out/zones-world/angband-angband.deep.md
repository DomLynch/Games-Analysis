# angband-angband (zones-world, cell 2)

Donor: `/mnt/frankendom-donors/angband-angband/src/game-world.c`, `src/mon-make.c`, `src/gen-cave.c` (classic_gen) | Licence: dual, GPL-2 (option a) or the "Angband licence" (option b: copy and distribute for educational, research and not-for-profit purposes), per the header of `src/mon-make.c` lines 10-14 and `src/game-world.c` lines 10-13 | C | symbol `process_world` (trickle spawn), with `pick_and_place_distant_monster`, `get_mon_num` and `compact_monsters`

Checked: The list hint is INFERRED (no file named), so I searched with grep for `alloc_monster`, `pick_and_place`, `level_monster`, `compact_monsters`. Read in full: the spawn roll and driver (`process_world` 457-466 and 506-508; caller at 1074-1076), `pick_and_place_distant_monster` (1483-1517), `pick_and_place_monster` (1457-1470), `get_mon_num` (221-300), `compact_monsters` (482-530), `distance()` in `src/cave-view.c` 38-46, the cdis distance in `src/mon-util.c` 301-335 (only the dungeon branch of `pgrid` is confirmed; the else branch was not read), classic level population (gen-cave.c 1295-1317), and the constants in `lib/gamedata/constants.txt`. Read in part: `place_new_monster` entry and the start of `place_new_monster_group` (1360-1400, 1215-1240); `place_friends` (1283-1360) and `place_new_monster_one` (1079-1215) were not read, so pack placement details are not claimed. Town monsters (town-day, town-night) were not read. Callers (grep over `src`): `compact_monsters` is called from `process_world` with 64 (463) and 0 (467), and also from `generate.c` 1404 and `save.c` 977 (not read). `pick_and_place_distant_monster` is called from the trickle roll (507) and from eight generator sites in `gen-cave.c` (classic 1317, labyrinth 1602, and others not read). `get_mon_num` is also used by nests and pits (`gen-room.c` 2709, 2835, with depth + 10) and by summons (`mon-summon.c` 433), which are not the spawn path. Confidence: high on the spawn roll, distance gate, cap and compaction numbers; medium on the group part. Camera scope: not a camera cell.

Best transferable idea: a zone population director with a trickle spawn (one roll per fixed interval, placed out of the player's sight), a hard cap, and cap relief by relaxing passes that remove the farthest and weakest creatures first, with a saving throw.
Decision (proposed): adapt - take the roll, the out-of-sight placement gate and the relaxing compaction passes as the cap rule for row 23; reject the depth-random monster choice for now, because Frankendom's zones are data and the race table is not per zone yet. Engaged creatures must be protected; the donor's rule does not protect anything the player is fighting.
Acceptance: a server test fills a zone to its cap, requests one trickle spawn, and asserts the new creature appears at least the zone's min-away distance from every player, and that compaction never removes a creature engaged with a player (MAX_ATTACKERS = 3) or a boss.

## 1. Mechanism

- Driver: `process_world` runs once every ten game turns (`if (!(turn % 10) && ...)` at `game-world.c` 1075, call at 1076). No accumulator is visible in the lines read (1060-1080); the world tick is a modulo test on the game-turn counter (`turn`).
- Cap relief first (`process_world` 462-463): if the monster count plus 32 is over `level_monster_max` (1024 in constants line 11), `compact_monsters(c, 64)` runs. A separate pass (not read in full) compresses holes when the count is far below the array size.
- Trickle spawn (506-508): one roll per `process_world` call, `one_in_(alloc_monster_chance)`, which is 1 in 500 (constants line 18). On success it calls `pick_and_place_distant_monster(c, player->grid, max_sight + 5, true, player->depth)`. With max-sight 20 (constants 195), the gate is 25.
- Placement (1483-1517): up to 10000 random grids (1487, 1492). A grid must be empty floor and not in a restricted room (only when no character dungeon), and its `distance()` from the player must be greater than 25 (1504). The distance is the donor's approximate metric: the longer axis plus half the shorter (cave-view.c 45). Only after a grid is found does it choose a monster (1515), so a failed placement costs no monster draw.
- Race pick (`get_mon_num`, 221-300): the generated level is the depth. With chance 1 in 25 (`ood-chance`, 231), it is raised by `min(level/4 + 2, 10)` (232-233; constants 33 and 36). Only races at or below that level (240) are eligible; the donor also skips town races in the dungeon (246), seasonal races outside late December (252), uniques already at their max count (257) and force-depth races deeper than the current level (261). The skip checks are read but not receipted. The weighted pick is then taken. A random p in 0-99 (278) decides extra draws: if p < 60 a second draw is made and kept if it is not shallower (keep-deeper rule at 287); if p < 10 a third draw is made under the same rule (291-299). The comment at 277 says "once (50%) or twice (10%)", which does not match the threshold of 60 at line 280; the code is used here.
- Groups: after the race is placed, `place_new_monster` checks the race's friends list and places more with `place_friends`. The group size is capped at `group-max` 25 (1230; constants 39). `group-dist` 5 (constants 42) is the donor's "maximum distance of a group from a related group" (the use site was not read).
- Cap relief (`compact_monsters`, 482-530): pass k (k = 1, 2, ...) spares monsters with level above `max_lev = 5 * k` (497, 510) and monsters nearer the player than `min_dis = 5 * (20 - k)` (500, 513; no distance check once min_dis is zero or below). Each remaining monster gets a saving throw: 90 percent (516), 99 percent for uniques (523). The roll is `randint0(100) < chance` (526). Passes repeat until the requested number is deleted. The donor does not stop mid-pass when the target is reached.
- Initial population (`classic_gen`, gen-cave.c 1295 and 1313; the labyrinth generator at 1601 uses the same pattern, the other generators were not read): k = clamp(depth / 3, 2, 10); the level starts with `level-min` (14) + 1d8 + k monsters, each placed through `pick_and_place_distant_monster` with a distance of 0 (call at 1317; at distance 0 the far gate only excludes the player's own grid, and the sleep flag is true). Depth 1 to 5 gives k = 2; depth 30 or more gives k = 10.

Comment versus code: the comment at `mon-make.c` 211-212 says the out-of-depth boost is "up to four levels". The code (232-233) gives `min(depth/4 + 2, 10)`, which is up to 10 levels at depth 32 and above. The code is used here.

## 2. Key functions

- `process_world`: `/mnt/frankendom-donors/angband-angband/src/game-world.c` 457-466 (cap relief), 506-508 (trickle roll), caller 1074-1076 (every 10 game turns).
- `pick_and_place_distant_monster`: `/mnt/frankendom-donors/angband-angband/src/mon-make.c` 1483-1517.
- `pick_and_place_monster`: `/mnt/frankendom-donors/angband-angband/src/mon-make.c` 1457-1470.
- `get_mon_num`: `/mnt/frankendom-donors/angband-angband/src/mon-make.c` 221-300.
- `compact_monsters`: `/mnt/frankendom-donors/angband-angband/src/mon-make.c` 482-530.
- `distance()`: `/mnt/frankendom-donors/angband-angband/src/cave-view.c` 38-46.
- Initial population in `classic_gen`: `/mnt/frankendom-donors/angband-angband/src/gen-cave.c` 1295 and 1313.
- Constants: `/mnt/frankendom-donors/angband-angband/lib/gamedata/constants.txt` lines 11, 18, 21, 33, 36, 39, 42, 195.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (theirs) |
|---|---|
| Trickle spawn: one roll per fixed tick, rare | 1 in 500 per call; calls every 10 game turns (constants 18; game-world 1075) |
| Placement outside the player's view | gate of max-sight + 5 = 25 (constants 195; game-world 508; mon-make 1504) |
| Hard cap with a compaction trigger | level max 1024; trigger when count + 32 > max; compact 64 (constants 11; game-world 462-463) |
| Cap relief that spares near and strong creatures first | pass k: level <= 5k and distance >= 5(20 - k) spared; save 90, uniques 99 (mon-make 497-526) |
| Initial population with a depth term | 14 + 1d8 + clamp(depth/3, 2, 10) (gen-cave 1295, 1313; constants 21) |
| Out-of-depth roll | 1 in 25; boost min(depth/4 + 2, 10) (mon-make 231-232; constants 33, 36) |
| Group size cap | 25 (1230; constants 39) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: distance gate and the empty-cell search first (location before monster), then the monster draw with the rare out-of-depth boost, then the two extra draws that keep the deeper race, and for cap relief the relaxing passes with saving throws. It omits group and pack placement (`place_friends`, group-max, group-dist), the seasonal and force-depth filters, the depth-zero guard on the out-of-depth boost (the sketch assumes depth at least 1), the skip of uniques already on the level, quest-monster compaction, the town rules and the day and night town counts, the sleep flag, drops, and the hole-compression pass. It adds one guard the donor does not have: a pass limit of 1000 so the loop ends on an all-unique list. It returns null when there are no legal races, as the donor does. It uses a passed-in random source instead of `randint0`.

```ts
// Licence: Angband dual licence (GPL-2, or the non-commercial "Angband licence"). Clean-room: shape only, rewritten here.
// Zone population for one level: trickle spawn with a distance gate, depth-based race pick, and cap relief by compaction.

export interface Pos { x: number; y: number; }
export interface Race { name: string; level: number; weight: number; unique: boolean; }
export interface Mon { id: number; level: number; dist: number; unique: boolean; }

export const TUNING = {
  rollOneIn: 500,      // donor: mon-gen:chance (1 in 500 per process_world call)
  minAwayDist: 25,     // donor: player max-sight 20 + 5
  levelMinBase: 14,    // donor: mon-gen:level-min (initial population base)
  maxPerLevel: 1024,   // donor: level-max:monsters
  oodOneIn: 25,        // donor: mon-gen:ood-chance
  oodAmountCap: 10,    // donor: mon-gen:ood-amount
};

// Distance as the donor measures it: longer axis plus half the shorter one.
export function gridDist(a: Pos, b: Pos): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return dy > dx ? dy + Math.floor(dx / 2) : dx + Math.floor(dy / 2);
}

// Weighted pick among races at or below maxLevel.
function draw(races: Race[], maxLevel: number, rand: () => number): Race | null {
  const pool = races.filter((r) => r.level <= maxLevel);
  const total = pool.reduce((sum, r) => sum + r.weight, 0);
  if (total <= 0) return null;
  let roll = rand() * total;
  for (const r of pool) {
    roll -= r.weight;
    if (roll < 0) return r;
  }
  return pool[pool.length - 1];
}

// Depth pick: rare out-of-depth boost, then up to two extra draws that keep the deeper race.
export function pickRaceForDepth(races: Race[], depth: number, rand: () => number): Race | null {
  let genLevel = depth;
  if (Math.floor(rand() * TUNING.oodOneIn) === 0) {
    genLevel += Math.min(Math.floor(genLevel / 4) + 2, TUNING.oodAmountCap);
  }
  let best = draw(races, genLevel, rand);
  const p = Math.floor(rand() * 100);
  if (p < 60) {
    const again = draw(races, genLevel, rand);
    if (best && again && again.level >= best.level) best = again;
  }
  if (p < 10) {
    const third = draw(races, genLevel, rand);
    if (best && third && third.level >= best.level) best = third;
  }
  return best;
}

// Random empty cell at least minAwayDist from the player, up to `attempts` tries.
export function pickFarEmptyCell(
  width: number, height: number, player: Pos,
  isEmpty: (p: Pos) => boolean, rand: () => number, attempts = 10000,
): Pos | null {
  for (let i = 0; i < attempts; i++) {
    const p = { x: Math.floor(rand() * width), y: Math.floor(rand() * height) };
    if (!isEmpty(p)) continue;
    if (gridDist(p, player) > TUNING.minAwayDist) return p;
  }
  return null;
}

// One trickle roll (donor: called once per process_world, every 10 game turns).
export function trickleRoll(
  races: Race[], depth: number, width: number, height: number, player: Pos,
  isEmpty: (p: Pos) => boolean, rand: () => number,
): { cell: Pos; race: Race } | null {
  if (Math.floor(rand() * TUNING.rollOneIn) !== 0) return null;
  const cell = pickFarEmptyCell(width, height, player, isEmpty, rand);
  if (!cell) return null;
  const race = pickRaceForDepth(races, depth, rand);
  return race ? { cell, race } : null;
}

// Cap relief: relaxing passes. Pass k spares monsters above level 5k and nearer than 5*(20-k).
// Each eligible monster gets a saving throw (90 percent, uniques 99 percent).
export function compactForCap(mons: Mon[], num: number, rand: () => number): number {
  if (mons.length === 0) return 0;
  const removed = new Set<number>();
  let deleted = 0;
  for (let iter = 1; deleted < num && iter < 1000; iter++) {
    const maxLevel = 5 * iter;
    const minDist = 5 * (20 - iter);
    for (const m of mons) {
      if (removed.has(m.id)) continue;
      if (m.level > maxLevel) continue;
      if (minDist > 0 && m.dist < minDist) continue;
      const save = m.unique ? 99 : 90;
      if (Math.floor(rand() * 100) < save) continue;
      removed.add(m.id);
      deleted++;
    }
  }
  return deleted;
}

// Initial population for a generated level: base plus 1d8 plus a depth term k (k = clamp(depth/3, 2, 10)).
export function initialPopulation(depth: number, rand: () => number): number {
  const k = Math.max(Math.min(Math.floor(depth / 3), 10), 2);
  return TUNING.levelMinBase + (1 + Math.floor(rand() * 8)) + k;
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts`, parity row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). The trickle roll is the respawn rate; the cap relief is the despawn rule under pressure. The donor has no "empty zone" trigger and no per-creature respawn timer, so only the cap and the relaxing despawn land in row 23; the grace-on-empty rule does not come from this donor.
- The trickle roll is driven by the server tick (row 18 / post-K item 3 sub-line "server tick: fixed step, input intake, per-tick NPC budget"). The donor's 10-game-turn counter is the same shape: a fixed step with a counter.
- Numbers as zone data fields: roll chance, minimum distance from players, cap, cap-relief pass bounds, save chances (see JSON sidecar).
- Reuse tag: rewrite-from-idea (dual GPL-2 / non-commercial licence: clean-room, shape only; the sketch is rewritten from the described mechanism, not translated).
- Brief rule served: zones as data (per-zone caps, chances and distances); server-verified (the roll and the compaction run on the server, with a test that checks the cap).

## 6. Gaps and risks

- The licence is dual. Option b (non-commercial, not-for-profit) is not an open-source licence, so the only safe reading for Frankendom is clean-room: nothing copied, only the shape.
- The donor's compaction deletes monsters by distance and level, not by whether a player is fighting them. The donor would remove an engaged creature at distance 6 if the pass allows it. Frankendom must protect engaged creatures (MAX_ATTACKERS = 3) and bosses before any pass runs. This is a change, not a port.
- The donor's `randint0` is not seeded for replay. Frankendom needs a seeded RNG per zone so the fight record (row 19) and server tests can replay a run.
- The donor is single-player and has no authority; its numbers have not been checked in play. The test should assert the cap and the gate, not the donor's feel.
- The donor's compaction removes monsters by array holes; Frankendom's ledger (one ledger) means every removal must go through the same store as kills and loot. A removal that is not a kill must not pay out loot or XP.
- The donor's out-of-depth and group rules (groups of up to 25) are much larger than a fighting game's needs; Frankendom's MAX_ATTACKERS = 3 means a group placement must be capped by the engine, not by the zone data alone.
- Not read: `place_friends` and `place_new_monster_one` (group placement details), the hole-compression pass in `process_world`, and the town counts. No claim about them is made.
