# diasurgical-DevilutionX (spawns-encounters, cell 1)

Donor: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/monster.cpp` | Licence: Sustainable Use License 1.0 (`/mnt/frankendom-donors/diasurgical-DevilutionX/LICENSE.md` line 1; use limited to internal or non-commercial purposes, so not an OSI open-source licence: clean-room, shape only) | C++ | symbol `InitMonsters` (with `PlaceGroup`)

Checked: `InitMonsters` (monster.cpp 3686-3748) and `PlaceGroup` (308-381) read in full; `CanPlaceMonster` (282-290) and `PlaceMonster` (292-306) read. Callers: `PlaceGroup` has two (monster.cpp 3403 leader pack, 3736 scatter loop), found by grep and read; `InitMonsters` has three (diablo.cpp 3153, 3174, 3274), read, but the branch conditions above diablo.cpp 3146 and 3171 were not read. Not read: the definitions of `IsTileVisible`, `FlipCoin` and `GenerateRnd`; the `dTransVal` setter only at drlg_l4.cpp 1026-1048. Hint file `player.cpp` is item respawn and the player's hit code, not monster spawning. A repo-wide grep for "respawn" finds no monster respawn (hits are dropped items: player.cpp 291-323, items.cpp 3734). Confidence: high on the population numbers and the order of steps (every number has a receipt); medium on what `dTransVal` means (called a region tag by inference).

## 1. Mechanism

- Population is set once per level, when the level is built or loaded. There is no monster respawn and no despawn in this donor (see Checked).
- Budget (monster.cpp 3706-3718): count non-solid tiles over the 80 by 80 interior [16,96) (3707-3710). Target = count / 30 (3713). Multiplayer adds half again (3714-3715). The target is capped so the total stays at MaxMonsters - 10 = 190 (3716-3717). Unique and quest monsters are placed before the count (3701-3705), so they use part of the budget. `totalmonsters` = placed + new (3718).
- Scatter loop (3727-3737): while the active count is below `totalmonsters`, pick a random type flagged PLACE_SCATTER (skeleton types, 3481), choose a group size, call `PlaceGroup` with no leader. Group size: level 1 is always 1 (3730-3731). Otherwise a coin flip gives 1 (`FlipCoin`, not read). Otherwise level 2 or crypt gives 2 to 3 (3732-3733), and other levels give 3 to 5 (3734-3735).
- `PlaceGroup` (308-381): up to 10 seed attempts (312).
  - Each attempt first rolls back the group the previous attempt placed: active count down, tile occupancy cleared (313-318).
  - Seed: random tile in [16,96) on each axis, repeated until `CanPlaceMonster` passes (329-331). `CanPlaceMonster` rejects a tile with a monster or a player on it, a tile visible to the player, a set-piece tile, or an occupied tile (282-290).
  - Size is clipped so the total does not pass `totalmonsters` (336-338).
  - Members: up to 100 failed tries (341). Each step moves the cursor by a random 8-direction step on x and another on y; the y term reads `deltaX`, which the BUGFIX comment on line 341 flags. A tile is accepted when it passes `CanPlaceMonster` and its `dTransVal` equals the seed's (342-343). Leashed packs also need |dx| and |dy| at most 3 from the seed (344). An accepted member is placed with a random facing (304) and the active count goes up (367).
  - After each seed attempt, stop if `placed >= num` (372-373). Otherwise the next attempt rolls back. After the tenth attempt there is no rollback, so the last partial group stays (read from the loop structure at 312-373).
- Leader packs (unique bosses, 3403): minions are seeded next to the leader (322-324). Each minion gets double max hit points (352) and a leash to the leader when the pack is leashed (357).
- In-fight summons: a skeleton spawn (2406-2409) and a Horkspawn attack (3042-3043) each check `ActiveMonsterCount < MaxMonsters` (200, monster.h 38) first. Level population stops at 190, so 10 slots stay free for these (the code does not say why; this is inference).

Best transferable idea: Spawn a group only on tiles the player cannot see, by rejection sampling from a seed, roll back a failed group before the next seed, and set the level budget from open area divided by a density number and capped below the hard limit.

Reuse tag: rewrite-from-idea (Sustainable Use License: clean-room only)

## 2. Key functions

- `InitMonsters`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/monster.cpp` 3686-3748. Budget, then the scatter loop.
- `PlaceGroup`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/monster.cpp` 308-381. Seed, member walk, rollback, partial group kept.
- `CanPlaceMonster`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/monster.cpp` 282-290. The legality test: no monster, no player, not visible, no set piece, not occupied.
- `MaxMonsters`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/monster.h` 38.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Population budget = open area / density, capped, with a multiplayer share | Divisor 30 (monster.cpp 3713); multiplayer +50% (3715); cap MaxMonsters - 10 = 190 (3716) with MaxMonsters 200 (monster.h 38) |
| Group size chosen by level band, with a coin flip | 1 on level 1 (3730); 2 to 3 on level 2 or crypt (3733); 3 to 5 elsewhere (3735) |
| Seed by rejection sampling, roll back a failed group | 10 seed attempts (312); seed range [16,96) (329-330) |
| Members walk out from the seed; same-region test; leash | 100 failed tries (341); region test on `dTransVal` (343); leash limit 3 tiles (344) |
| Never spawn where the player can see | The visibility term in `CanPlaceMonster` (287). The rule is the reusable part; the test itself is not read |
| Summons check a hard cap | 200 (2406, 3042) |

Derived, not written in the code: on a fully open 80 by 80 interior the raw target is 6400 / 30 = 213, so the cap of 190 is the binding limit there.

## 4. TypeScript sketch

simplified: keeps the donor's order (budget, then scatter groups, then seed attempts with rollback, then the member walk). It omits leader packs, leashing, unique and quest placement, set pieces, per-type choice (the caller supplies sizes), monster stats and facing, and the in-fight summon checks. The donor's two loops have no bound (seed search at 328-331, scatter at 3728); the sketch adds a bound of 1000 seed draws and 10000 rounds. The member step uses one random direction for both axes; the donor's y step reads the x delta (BUGFIX comment, line 341), and the sketch does not copy that. `region` stands in for `dTransVal`, and `seen` stands in for `IsTileVisible` (definition not read). The sketch typechecks on the VPS with `npx -p typescript tsc --noEmit --strict --target es2020`, exit 0.

```ts
// Licence of donor: Sustainable Use License 1.0. clean-room sketch written from the described mechanism, not a translation of the donor lines.
export {};

interface Pos { x: number; y: number; }
interface Tile { solid: boolean; seen: boolean; occupied: boolean; region: number; }
interface Grid { tile(x: number, y: number): Tile | undefined; }
interface Rng { int(n: number): number; } // uniform integer in [0, n)

const SEED_TRIES = 10;          // seed attempts per group
const MEMBER_TRIES = 100;       // failed member tiles allowed per seed attempt
const SEED_SEARCH = 1000;       // added bound: the donor loops until it finds a free seed tile
const INTERIOR_MIN = 16;        // seeds are drawn from [16, 96) on each axis
const INTERIOR_SPAN = 80;
const STEPS: readonly Pos[] = [
  { x: 0, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 },
  { x: 0, y: 1 }, { x: -1, y: 1 }, { x: -1, y: 0 }, { x: -1, y: -1 },
];

function canPlace(g: Grid, p: Pos): boolean {
  const t = g.tile(p.x, p.y);
  return t !== undefined && !t.solid && !t.seen && !t.occupied;
}

function setOccupied(g: Grid, p: Pos, on: boolean): void {
  const t = g.tile(p.x, p.y);
  if (t !== undefined) t.occupied = on;
}

// Population target: one member per `perUnit` open tiles, plus half again in multiplayer,
// never taking the total past `cap`.
function populationTarget(openTiles: number, perUnit: number, cap: number, placed: number, multiplayer: boolean): number {
  let want = Math.floor(openTiles / perUnit);
  if (multiplayer) want += Math.floor(want / 2);
  return placed + Math.min(want, Math.max(0, cap - placed));
}

// Group size by level: level 1 is always 1; otherwise a coin flip gives 1; else 2 to 3 on level 2 or
// crypt-like levels, and 3 to 5 elsewhere.
function pickGroupSize(level: number, cryptLike: boolean, rng: Rng, flip: () => boolean): number {
  if (level === 1 || flip()) return 1;
  if (level === 2 || cryptLike) return 2 + rng.int(2);
  return 3 + rng.int(3);
}

function findFreeSeed(g: Grid, rng: Rng): Pos | undefined {
  for (let i = 0; i < SEED_SEARCH; i++) {
    const p: Pos = { x: INTERIOR_MIN + rng.int(INTERIOR_SPAN), y: INTERIOR_MIN + rng.int(INTERIOR_SPAN) };
    if (canPlace(g, p)) return p;
  }
  return undefined;
}

// Place one group of up to `size` members around a seed. `roster` holds all live spawns and
// `total` is the population target; a group never takes the roster past `total`.
function placeGroup(g: Grid, rng: Rng, roster: Pos[], size: number, total: number): number {
  const group: Pos[] = [];
  for (let seedTry = 0; seedTry < SEED_TRIES; seedTry++) {
    // A failed seed attempt is rolled back before the next one starts.
    while (group.length > 0) {
      const p = group.pop();
      if (p !== undefined) {
        roster.pop();
        setOccupied(g, p, false);
      }
    }
    const seed = findFreeSeed(g, rng);
    if (seed === undefined) continue;
    const seedRegion = g.tile(seed.x, seed.y)?.region;
    const need = Math.min(size, total - roster.length);
    let cur: Pos = seed;
    let fails = 0;
    while (group.length < need && fails < MEMBER_TRIES) {
      const t = g.tile(cur.x, cur.y);
      if (t !== undefined && t.region === seedRegion && canPlace(g, cur)) {
        setOccupied(g, cur, true);
        group.push(cur);
        roster.push(cur);
      } else {
        fails++;
      }
      // One random direction per step. The donor's y step reads the x delta (its BUGFIX comment
      // at monster.cpp 341); this sketch steps both axes from the same direction.
      const s = STEPS[rng.int(STEPS.length)];
      cur = { x: cur.x + s.x, y: cur.y + s.y };
    }
    if (group.length >= need) break;
  }
  return group.length;
}

// Level population: place groups until the target is met. The donor's loop has no bound;
// the sketch stops after 10000 rounds.
function populateLevel(
  g: Grid, rng: Rng, roster: Pos[], openTiles: number, cap: number, multiplayer: boolean,
  level: number, cryptLike: boolean, flip: () => boolean,
): number {
  const total = populationTarget(openTiles, 30, cap, roster.length, multiplayer);
  let rounds = 0;
  while (roster.length < total && rounds < 10000) {
    rounds++;
    placeGroup(g, rng, roster, pickGroupSize(level, cryptLike, rng, flip), total);
  }
  return roster.length;
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population, server-side spawn decision). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). The donor supplies the budget, the group placement and the rollback; it has no respawn or grace timer, so those fields come from Frankendom's zone data.
- Reuse tag: rewrite-from-idea (Sustainable Use License: clean-room only)
- Brief rule served: zones as data (cap, density divisor and group sizes become zone fields); server-verified kills and spawns (the placement runs once per level on the server, never on a client)

## 6. Gaps and risks

- Licence: Sustainable Use License, non-commercial limits, not open source. Clean-room, shape only. The sketch is written from the described mechanism.
- No respawn and no despawn in this donor. The respawn seconds and the grace timer of row 23 are not in this code and must be designed, not copied.
- Population is decided once per level build or load (diablo.cpp 3153, 3174, 3274). Frankendom zones need the spawn decision on the server and re-derivable from zone data.
- The spawn-out-of-view rule uses the player's visibility (monster.cpp 287). Frankendom's camera is client-only, so the server must use line of sight or distance from its own state. The donor's `IsTileVisible` was not read, so its exact test is unknown.
- MAX_ATTACKERS = 3: the donor's groups are up to 5 (3735), and group size only sets placement. The donor has no engagement limit, so Frankendom must cap simultaneous attackers in the engine.
- Both donor loops are unbounded (seed search at 328-331, scatter loop at 3728). Frankendom must bound them.
- The budget counts non-solid tiles (`IsTileSolid`, tile_properties.cpp 20-27). A zone's open area only maps across if its solid flags are set the same way.
- `dTransVal` as a region tag is an inference; only its copy sites at drlg_l4.cpp 1026-1048 were read.
- Unique and leader packs, leashing, set pieces and the Nakrul rule are not in the sketch.
