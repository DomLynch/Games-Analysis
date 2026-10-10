# angband-angband (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/angband-angband/src/mon-make.c` (trigger in `src/game-world.c` 506-509) | Licence: dual, read from the mon-make.c header (lines 10-18): (a) GNU GPL version 2, or (b) the "Angband licence" (copying for educational, research and not-for-profit purposes only). Treated as clean-room, shape only | C | symbol `pick_and_place_distant_monster`

Checked: Read `game-world.c` 457 (process_world signature), 506-509 (the spawn roll and call), 1074-1076 (process_world called every 10 game turns). Read `mon-make.c` 175-189 (weighted draw helper, partial), 221-300 (get_mon_num: out-of-depth boost, race filters, 60% and 10% re-rolls), 1360-1400 (place_new_monster: group gate and friends loop head), 1457-1520 (pick_and_place_monster and pick_and_place_distant_monster). Read `cave-view.c` 30-46 (distance). Read `lib/gamedata/constants.txt` (level-max, mon-gen, max-sight). Grep only: `gen-cave.c` callers of pick_and_place_distant_monster at generation, `mon-move.c` 1032 (breeder cap). The list hint is INFERRED and was not a file; a search for the topic found game-world.c 506. Other candidates opened: game-world.c, mon-make.c, cave-view.c. Not read: place_friends and the group size logic, place_new_monster_one failure path, square_isempty and square_ismon_restrict, where character_dungeon is set, and the energy system that turns game turns into player turns. Confidence: high on the trickle roll, the distance gate and the race re-roll; medium on group behaviour, which is not read, so depth is thin.

## 1. Mechanism

- Trickle spawner, not a director. Every 10 game turns (`game-world.c` 1075) `process_world` runs. Inside it, `one_in_(z_info->alloc_monster_chance)` (506) with `mon-gen:chance` 500 (constants.txt line 18) decides whether to try a spawn. That is about one attempt per 5,000 game turns on average (game turns, not converted to player turns).
- On success of the roll, `pick_and_place_distant_monster(cave, player->grid, max_sight + 5, true, player->depth)` (507-508). `max_sight` is 20 (constants.txt 195), so the spawn must be more than 25 away.
- Placement (mon-make.c 1483-1512): draw a random grid over the whole chunk (1494) for up to 10,000 draws. A grid is rejected unless it is empty floor (1497). It is accepted when `distance(grid, to_avoid) > dis` (1504). The distance is approximate: the larger axis plus half the smaller (cave-view.c 38-45). If all 10,000 draws fail, it returns false and the check is silent.
- Race choice (`get_mon_num`, mon-make.c 221-300):
  - Out-of-depth boost: with chance 1/25 (`mon-gen:ood-chance` 25, line 33), the level used for picking rises by `min(level / 4 + 2, 10)` (`mon-gen:ood-amount` 10, line 36; lines 231-233).
  - Table: entries sorted by depth; stop at the first race deeper than the level (240). Skip seasonal races outside late December, uniques already alive, and force-depth races deeper than the current depth (251-262).
  - Weighted draw over the remaining races (181), then `p = randint0(100)`. If p < 60 draw again and keep the deeper race (278-287). If p < 10 draw a third time and keep the deeper one (291-299). Net: about 40% one draw, 50% two, 10% three.
- Placement of the chosen race (`pick_and_place_monster` 1461-1465 and `place_new_monster` 1360-1400): the monster is placed; if group placement is allowed (passed as true at 1515), each entry in the race's friends list rolls `randint0(100)` against its percent chance (1387) and places a group. The group expansion body was not read.
- Population: the spawner has no cap of its own. The only hard limit found is the level array of 1024 monsters (`level-max:monsters`, constants.txt line 11), plus a separate breeder cap of 100 (`repro-max`, mon-move.c 1032, grep only).

## 2. Key functions

- `process_world` spawn roll: `/mnt/frankendom-donors/angband-angband/src/game-world.c` 506-509. One-in-N roll, then the distant placement call.
- `pick_and_place_distant_monster`: `/mnt/frankendom-donors/angband-angband/src/mon-make.c` 1483-1520. Random grid draws, empty-floor and distance gate, then one placement.
- `get_mon_num`: `/mnt/frankendom-donors/angband-angband/src/mon-make.c` 221-300. Out-of-depth boost, depth-sorted table, weighted draw, 60% and 10% re-rolls that keep the deeper race.
- `distance`: `/mnt/frankendom-donors/angband-angband/src/cave-view.c` 38-46. The approximate metric used by the gate.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-check trickle roll, one in N, independent of population | 1 in 500 per 10 game turns (theirs, constants.txt 18; game-world.c 506, 1075) |
| Spawn only farther than a set distance from the player, on empty floor | Gate = max_sight + 5 = 25 with max_sight 20 (theirs, game-world.c 508; constants.txt 195); approximate metric (cave-view.c 45) |
| Bounded search for a valid cell | 10,000 random draws (theirs, mon-make.c 1487) |
| Rare out-of-depth boost of the tier used for picking | 1 in 25 (theirs, constants.txt 33); boost min(d/4 + 2, 10) (theirs, constants.txt 36; mon-make.c 232) |
| Harder-tier re-roll that keeps the deeper result | 60% one re-roll, 10% a second (theirs, mon-make.c 280, 291) |
| Population cap | None in the spawner; level array 1024 (theirs, constants.txt 11) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: the one-in-N roll first, then up to maxAttempts random cells each checked for free floor and approximate distance, then the race pick with the out-of-depth boost and the 60% and 10% re-rolls that keep the deeper race. It omits the group and friends expansion, the seasonal and unique filters, the force-depth rule, the sleep flag, the breeder cap, the 1024 level array, the energy system (the sketch counts checks, not player turns), and the donor's silent failure message. The races are given as weighted entries, not the donor's probability table.

```ts
// Licence: GPL-2.0 or the Angband licence (dual, donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Race { name: string; level: number; weight: number; }

export interface TrickleParams {
  oneInN: number;      // 1 in N chance per spawn check
  oodOneIn: number;    // 1 in N chance that the depth used for picking is boosted
  oodAmount: number;   // cap on the boost
  minDist: number;     // spawn only farther than this from the player (approximate metric)
  maxAttempts: number; // tries to find a free floor cell
}

// Approximate distance: larger axis plus half the smaller axis.
export function approxDist(dx: number, dy: number): number {
  const a = Math.abs(dx);
  const b = Math.abs(dy);
  return Math.max(a, b) + (Math.min(a, b) >> 1);
}

// Pick a race for this depth. Weighted draw; then 60% chance of a second draw and 10% of a third,
// keeping the deeper race each time (a ties keep the newer draw, as in the donor).
export function pickRace(depth: number, races: Race[], p: TrickleParams, rng: () => number): Race | null {
  let gen = depth;
  if (depth > 0 && rng() * p.oodOneIn < 1) gen += Math.min(Math.floor(gen / 4) + 2, p.oodAmount);

  const legal = races.filter((r) => r.level <= gen && r.weight > 0);
  const total = legal.reduce((s, r) => s + r.weight, 0);
  if (total <= 0) return null;

  const draw = (): Race => {
    let v = Math.floor(rng() * total);
    for (const r of legal) {
      if (v < r.weight) return r;
      v -= r.weight;
    }
    return legal[legal.length - 1];
  };

  let race = draw();
  const roll = Math.floor(rng() * 100);
  if (roll < 60) {
    const alt = draw();
    race = alt.level >= race.level ? alt : race;
  }
  if (roll < 10) {
    const alt = draw();
    race = alt.level >= race.level ? alt : race;
  }
  return race;
}

// One spawn check (called once per 10 game ticks in the donor).
export function trySpawn(
  depth: number,
  races: Race[],
  p: TrickleParams,
  player: { x: number; y: number },
  width: number,
  height: number,
  isFreeFloor: (x: number, y: number) => boolean,
  rng: () => number,
): { x: number; y: number; race: Race } | null {
  if (rng() * p.oneInN >= 1) return null;
  for (let i = 0; i < p.maxAttempts; i++) {
    const x = Math.floor(rng() * width);
    const y = Math.floor(rng() * height);
    if (!isFreeFloor(x, y)) continue;
    if (approxDist(x - player.x, y - player.y) > p.minDist) {
      const race = pickRace(depth, races, p, rng);
      return race ? { x, y, race } : null;
    }
  }
  return null;
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone trickle spawn: rate roll, distance gate from the player, encounter tier). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). The donor has no cap of its own, so the cap in row 23 has to come from Frankendom, not from this code. Server tick cadence (process once per fixed server tick) is post-K item 3 sub-line "server tick: fixed step, input intake, per-tick NPC budget", cited with row 18 as the server tick row.
- Reuse tag: rewrite-from-idea (GPL-2.0 or the Angband licence, dual; clean-room only)
- Brief rule served: zones as data on one runtime (rate, distance and tier numbers per zone); rules 7-9 n/a

## 6. Gaps and risks

- Dual licence: the Angband licence option is limited to not-for-profit use. Clean-room only, shape not code; do not translate the lines.
- No cap: the donor spawns with a one-in-N roll and no population limit except the 1024-monster array. Frankendom needs the cap of row 23 as zone data; do not copy the uncapped trickle as the whole rule.
- Spawns are asleep (`sleep` true, 1515). Frankendom's wandering or aggro state is a design choice for the zone, not this code.
- Time base: the donor's 1 in 500 is per 10 game turns, and the energy conversion to player turns was not read. Frankendom must choose the interval in seconds and test the rate; do not port the number.
- The gate uses an approximate metric from the player position. Frankendom's server must use its own pathing or a visibility rule; the donor's gate says nothing about line of sight.
- The encounter-tier re-roll (60% and 10%) keeps the deeper race, so harder enemies become more likely. That is a useful difficulty knob but it also means a zone can drift harder without a design decision; make it zone data with a default of no re-roll.
- Group expansion (friends) is the main encounter shape in this code, and it was not read. Do not adopt the group behaviour from this note.
- Angband has no fight, no attacker cap and no MAX_ATTACKERS = 3. The spawn count here is a level population, not simultaneous attackers; do not merge the two.
- The breeder cap (repro-max 100, mon-move.c 1032) is a separate rule seen only by grep; do not cite it for row 23 without reading it.

Best transferable idea: a per-check trickle roll (one in N, every 10 ticks) that places one enemy on free floor farther than a set distance from the player, with a tier pick that re-rolls with a 60% and 10% chance and keeps the harder result.
Decision (proposed): adapt - the trickle roll and far-from-player gate are the simple spawn rate row 23 needs; the population cap comes from Frankendom, the tier re-roll becomes an explicit zone difficulty knob with default off, and the time base is seconds on the server tick.
Acceptance: server test on a zone with a 1-in-500 roll per 10 ticks and a 25-cell gate: over 10,000 ticks (about 1,000 checks) the spawn count is within sampling error of 2, every spawn is on free floor more than 25 approximate cells from the player, and no spawn happens while the zone population is at its cap.
