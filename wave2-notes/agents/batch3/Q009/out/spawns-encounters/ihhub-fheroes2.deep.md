# ihhub-fheroes2 (spawns-encounters, cell 2)

Donor: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/world/world.cpp` (with `kingdom/week.cpp`, `maps/maps_tiles_helper.cpp`, `game/game_static.cpp`, `engine/rand.cpp`) | Licence: GPL-2.0-or-later (`kingdom/week.cpp` header: "either version 2 of the License, or ... (at your option) any later version"; repo `LICENSE` is the GPL v2 text) | C++ | symbols `World::NewDay`, `World::NewWeek`, `World::_monthOfMonstersAction`, `updateMonstersOnTile`, `Week::RandomWeek`

Checked: The list's hint file `src/fheroes2/campaign/campaign_scenariodata.cpp` (831 lines) is campaign scenario data; grep for spawn, growth and respawn finds nothing in it. The real mechanism was found by grep for `NewWeek` and `Monster`: read in full are `world.cpp` NewDay/NewWeek/NewMonth/_monthOfMonstersAction (425-630) and its helpers (71-142), `kingdom/week.cpp` (1-206), `maps_tiles_helper.cpp` updateMonstersOnTile and setMonsterOnTile (1697-1781), `game_static.cpp` (310-321), `maps.cpp` getAroundIndexes start (405-425), `rand.cpp` (67-119). Other candidates opened and not used: `castle/castle.cpp` Castle::ActionNewWeek (838-872; castle dwelling growth, a different mechanism), `maps_tiles_helper.cpp` updateObjectInfoTile (1641-1695; dwelling and resource updates, `updateDwellingPopulationOnTile` at 929 not read). Not read: the `MP2::isInGameActionObject` and `MP2::isWeekLife` predicates, `Monster::GetRNDSize` (monster data), the `setMonsterCountOnTile` body (893), the rest of `Castle::ActionNewWeek`, `Maps::ScanAroundObject`. Confidence: high on the order of operations and the numbers for the monthly invasion and weekly stack growth; the join rules were read in full. Camera: not applicable.

Best transferable idea: a seeded monthly plan that picks spawn tiles by priority tier with spacing and open-space rules, caps each tier on its own, and a weekly growth rule per stack (expected count/7 per week, capped).

Decision (proposed): adapt. The seeded, tiered placement fits zones as data and lets the server replay one spawn plan; but the donor's weekly growth uses an unseeded device-seeded generator and has no zone-level cap, so Frankendom takes the plan shape with a per-zone seed and a zone cap, and not the unseeded growth.

Acceptance: Server test: one zone seed and one period index give the same spawn tiles on two runs, with no tile holding two stacks; a stack of 7 grows by exactly 1 in each of 10,000 simulated weeks, and a stack of 10 averages 10/7 per week within 2%.

## 1. Mechanism

- Calendar (world.h 69, 71, 398, 413): 7 days per week, 4 weeks per month. `NewDay` (world.cpp 425-460) runs the month routine first (`NewMonth`, 438-440), then the week routine (`NewWeek`, 443-449), then the per-day routines. A month start is always a week start, so on a month start both routines run on the same day.
- Week and month types (kingdom/week.cpp 33-74, 193-206): the type is seeded from the world seed plus the week counter (world.cpp 1263-1268, cached by seed at 413). A normal week is 75% a creature-named week (38-45) and 25% a monster week (49). The first week of a month takes the month table instead (195): 50% regular (ANT to BEETLE), 40% monster month (57-69), 10% plague (73). A monster month names one of 12 creatures (89-91 and the switch); a monster week names one from PEASANT to BONE_DRAGON (81).
- Monthly invasion (world.cpp 493-498, 500-630): runs at a month start only when it is not the first month of the game (495) and the month type is a monster month. The monster is the month's monster (496). The plan is built in one pass over the tiles (528-583):
  - Excluded sources: castle, hero and monster tiles (521-526). Water is never a source or a target (529-531; target check at 92).
  - Tier 1, primary: an action object (the comment at 506-507 lists resources, artifacts, mines and capture objects; the predicate was not read) with no excluded tile within radius 3 (543). Its target is a random suitable neighbour (547). Only the source is then excluded (550), so later sources near it are blocked; the target is added to the list only (549).
  - Tier 2, road: radius 4 (554), at least two empty neighbours (558), random target (562), source excluded (565).
  - Tier 3, clear ground: radius 4 (569), at least four empty neighbours (573), random target (577), source excluded (580).
  - Neighbour rule (`findSuitableNeighbouringTile`, 78-124): radius 1 (`getAroundIndexes` default). If the source is not passable from all directions, only neighbours with an index at or above `tileId + width - 2` count (86-88). Water and non-clear tiles are skipped (92); event tiles are skipped (99-105); coast counts only with other coast nearby (108-114). The pick is uniform (123).
  - Each of the three lists is shuffled with the seeded generator (586-588).
  - Count: base = primary candidates / 3 (591); floor = tiles / 360 (592). If the base is below the floor, the count is the floor; otherwise it is uniform in 75-125% of the base, seeded (594-599).
  - Split: 85% primary (604), 10% road (613), 5% clear (622), each capped by its own candidates (605-607, 614-616, 623-625). A short tier is not made up from another.
  - Placement (610): `setMonsterOnTile` gives a random stack size from the monster data (1759). Ghosts and elementals never join (1762-1764). Designer-set stacks and the week's monster join for money (1766-1770). Any other stack joins free with a 2-in-10 chance (1774-1775), else for money.
- Weekly growth (world.cpp 462-491; maps_tiles_helper.cpp 1697-1725): no growth in the first week of the game (465). Each map tile with a monster object (473-474) gets `updateMonstersOnTile`, in every week. A stack of 0 or at or above the limit does not grow (1707, 1712). Otherwise the bonus is one more unit when `Rand::Get(1, 7) <= count % 7` (1718), so growth = count / 7 + bonus (1719), capped so the stack stays at the limit (1720), and written back (1724). Expected growth per week is count / 7 before the cap.
- Limit: 4000 per stack on original maps (game_static.cpp 319), 4,000,000 on Resurrection maps (315).
- Randomness: the invasion plan uses the generator seeded with world seed plus month (517), so it replays. Weekly growth draws from `Rand::Get`, which uses a thread-local generator seeded from the OS random device (rand.cpp 88, 99), so it does not replay.
- Tick: no fixed-step loop. Both routines run once per game day boundary from `NewDay`.

## 2. Key functions

- `World::NewDay`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/world/world.cpp` 425-460. Order: month routine, then week routine, then per-day routines.
- `World::NewWeek`: same file, 462-491. Weekly growth for every map monster tile.
- `World::NewMonth` and `World::_monthOfMonstersAction`: same file, 493-498 and 500-630. The monthly invasion plan and placement.
- Helpers (anonymous namespace): same file, 71-76 (`isTileBlockedForSettingMonster`), 78-124 (`findSuitableNeighbouringTile`), 126-142 (`getNeighbouringEmptyTileCount`).
- `updateMonstersOnTile`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/maps/maps_tiles_helper.cpp` 1697-1725. One stack's weekly growth.
- `setMonsterOnTile`: same file, 1727-1781. Stack size and join rule.
- `Week::RandomWeek`, `WeekRand`, `MonthRand`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/kingdom/week.cpp` 33-74, 193-206.
- `GameStatic::getNeutralMonsterLimit`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/game/game_static.cpp` 310-321.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants and where they are |
|---|---|
| 7-day week, 4-week month | world.h 69 and 71 (engine constants) |
| Week type: 3 buckets of 4 regular (75%), else monster (25%) | week.cpp 38-41, 49 (engine constants) |
| Month type: 5 of 10 regular, 4 monster (40%), 1 plague (10%) | week.cpp 57-73 (engine constants) |
| Source spacing: radius 3 for action objects, radius 4 for road and clear | world.cpp 543, 554, 569 (engine constants) |
| Neighbour requirement: road needs 2 empty neighbours, clear needs 4 | world.cpp 558, 573 (engine constants) |
| Base count = primary candidates / 3; floor = tiles / 360 | world.cpp 591, 592 (engine constants; the map size enters via the floor) |
| Count jitter 75-125% of base, seeded | world.cpp 598 (engine constant) |
| Tier split 85 / 10 / 5, each capped by its own candidates | world.cpp 604, 613, 622 (zone data in Frankendom terms: a designer would tune it) |
| Free join 2 in 10 for ordinary stacks | maps_tiles_helper.cpp 1774 (engine constant) |
| Growth = count / 7 plus one with chance (count mod 7) / 7 | maps_tiles_helper.cpp 1718-1719 (engine constant) |
| Stack cap 4000 (original) / 4,000,000 (Resurrection) | game_static.cpp 319 and 315 (per-stack; zone data in Frankendom terms) |
| First week and first month excluded | world.cpp 465, 495 (engine constants) |

## 4. TypeScript sketch

simplified: a flat cell array stands in for the map; events, coast tiles, the action-object predicate and the monster data (stack size, join) are left out; the castle, hero and monster tiles are a single `blocked` kind; the neighbour square leaves out the centre tile (the donor's centre handling was not read). The sketch keeps the donor order: sources scanned in tile order, tier lists shuffled, count from the primary list, split 85/10/5 with each tier capped on its own. The one-side rule is the donor's index rule, copied as is, without a geometry check. Frankendom additions: a `taken` set so that no two sources pick the same target tile (the donor does not check this), and an own xorshift generator in place of the donor's PCG32. The weekly growth follows `updateMonstersOnTile` in shape, using the generator passed in, so a caller can seed it per zone and week.

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Kind = 'water' | 'road' | 'clear' | 'action' | 'blocked'; // blocked = castle, hero or monster tile

interface Cell {
  kind: Kind;
  open: boolean; // passable from every side; closed objects take a monster from one side only
}

// Own small xorshift32 generator, seeded per period so the plan can be replayed on the server.
class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = (seed >>> 0) || 1;
  }
  next(): number {
    let x = this.s;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.s = x >>> 0;
    return this.s / 4294967296;
  }
  int(lo: number, hi: number): number {
    return lo + Math.floor(this.next() * (hi - lo + 1)); // inclusive
  }
  shuffle<T>(a: T[]): void {
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
  }
}

function square(i: number, w: number, h: number, r: number): number[] {
  const x0 = i % w;
  const y0 = Math.floor(i / w);
  const out: number[] = [];
  for (let y = y0 - r; y <= y0 + r; y++) {
    for (let x = x0 - r; x <= x0 + r; x++) {
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const n = y * w + x;
      if (n !== i) out.push(n);
    }
  }
  return out;
}

function isClear(c: Cell): boolean {
  return c.kind === 'road' || c.kind === 'clear';
}

function emptyNeighbours(cells: Cell[], i: number, w: number, h: number): number {
  return square(i, w, h, 1).filter((n) => isClear(cells[n])).length;
}

// Picks a clear neighbour at random. A closed object only takes a monster from the far side
// (the donor's index rule, copied as is; it does not check geometry).
function pickNeighbour(cells: Cell[], i: number, w: number, h: number, open: boolean, rng: Rng): number {
  const options = square(i, w, h, 1).filter((n) => {
    if (!open && n < i + w - 2) return false;
    return isClear(cells[n]);
  });
  if (options.length === 0) return -1;
  return options[rng.int(0, options.length - 1)];
}

export interface Plan {
  spawns: number[]; // tile indexes that get a stack
  count: number;    // planned stacks before tile caps
}

// One monthly plan: candidate tiles by tier, a seeded count, an 85/10/5 split, capped per tier.
function monthlyPlan(cells: Cell[], w: number, seed: number): Plan {
  const h = cells.length / w;
  const rng = new Rng(seed);
  const excluded = new Set<number>();
  const taken = new Set<number>(); // Frankendom addition: no tile is picked twice
  cells.forEach((c, i) => {
    if (c.kind === 'blocked') excluded.add(i);
  });

  const primary: number[] = [];
  const road: number[] = [];
  const clear: number[] = [];

  const nearExcluded = (i: number, r: number): boolean => square(i, w, h, r).some((n) => excluded.has(n));

  cells.forEach((c, i) => {
    if (c.kind === 'water' || excluded.has(i)) return;

    if (c.kind === 'action') {
      if (nearExcluded(i, 3)) return;
      const t = pickNeighbour(cells, i, w, h, c.open, rng);
      if (t >= 0 && !taken.has(t)) {
        primary.push(t);
        taken.add(t);
        excluded.add(i);
      }
    } else if (c.kind === 'road') {
      if (nearExcluded(i, 4)) return;
      if (emptyNeighbours(cells, i, w, h) < 2) return;
      const t = pickNeighbour(cells, i, w, h, true, rng);
      if (t >= 0 && !taken.has(t)) {
        road.push(t);
        taken.add(t);
        excluded.add(i);
      }
    } else if (c.kind === 'clear') {
      if (nearExcluded(i, 4)) return;
      if (emptyNeighbours(cells, i, w, h) < 4) return;
      const t = pickNeighbour(cells, i, w, h, true, rng);
      if (t >= 0 && !taken.has(t)) {
        clear.push(t);
        taken.add(t);
        excluded.add(i);
      }
    }
  });

  rng.shuffle(primary);
  rng.shuffle(road);
  rng.shuffle(clear);

  // Base count: a third of the primary candidates, floored at tiles/360; otherwise 75-125% of the base.
  const base = Math.floor(primary.length / 3);
  const floor = Math.floor(cells.length / 360);
  const count = base < floor ? floor : rng.int(Math.floor((base * 75) / 100), Math.floor((base * 125) / 100));

  // Each tier is capped by its own candidates; a short tier is not made up from another.
  const nPrimary = Math.min(Math.floor((count * 85) / 100), primary.length);
  const nRoad = Math.min(Math.floor((count * 10) / 100), road.length);
  const nClear = Math.min(Math.floor((count * 5) / 100), clear.length);

  return {
    spawns: [...primary.slice(0, nPrimary), ...road.slice(0, nRoad), ...clear.slice(0, nClear)],
    count,
  };
}

// Weekly growth of one neutral stack. Expected growth is count / 7 per week.
function weeklyGrowth(count: number, cap: number, rng: Rng): number {
  if (count <= 0 || count >= cap) return count;
  const bonus = rng.int(1, 7) <= count % 7 ? 1 : 0;
  const growth = Math.min(Math.floor(count / 7) + bonus, cap - count);
  return count + growth;
}

// Usage with a small map, so the file exercises the types.
const demo: Cell[] = Array.from({ length: 100 }, (_, i) => ({
  kind: i % 9 === 0 ? 'action' : i % 13 === 0 ? 'road' : 'clear',
  open: i % 2 === 0,
}));
const plan = monthlyPlan(demo, 10, 12345);
const grown = weeklyGrowth(10, 4000, new Rng(7));
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, on `/tmp/ihhub-fheroes2-monster-plan.ts` with `export {};` appended: exit 0.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population: a seeded monthly plan and per-stack weekly growth, both server-side). Parity-checklist row 23 (zone population: spawn caps, respawn). The server tick sub-line does not apply here: the donor drives both from the day boundary, not from a tick loop.
- Reuse tag: adapt (GPL-2.0-or-later: clean-room; shape only, no line-by-line port)
- Brief rule served: zones as data (tier split, spacing radii, count divisor and growth cap are zone fields); one engine (the plan and the growth are engine logic that replays from one seed).

## 6. Gaps and risks

- Copyleft: the sketch is written from the described shape. Do not port the donor lines.
- Unseeded growth: weekly growth draws from `Rand::Get`, which is seeded from the OS random device (rand.cpp 88, 99; maps_tiles_helper.cpp 1718). Two servers, or a replay, diverge. Frankendom should use one seeded stream per zone and week.
- Possible double placement (read only, not run): the chosen target tile is not excluded (world.cpp 549-550, 565, 580), so two sources can pick the same neighbour. The placement loop then sets the same tile twice (610 and the two later loops), so one planned stack is lost. The sketch closes this with a `taken` set.
- No zone cap and no despawn. The only cap is per stack (game_static.cpp 319). The number of stacks comes from the candidate count (world.cpp 591), so a map with many action objects gets more monsters, and nothing sets a designer's number. Frankendom's row 23 cap has to be a zone field.
- Tier shortfall: the split does not carry over (world.cpp 605-607, 614-616, 623-625), so the placed total can fall below the planned count. Frankendom should decide whether a short tier is an error or a smaller spawn.
- Same-day growth: a stack placed at a month start also gets that day's weekly growth, because `NewMonth` and `NewWeek` run in one `NewDay` call (world.cpp 438-444). Frankendom should decide whether a new spawn waits a tick.
- Presence: the weekly loop walks every map tile (world.cpp 469-476) with no player check. The same gap as cell 1.
- Calendar: the week and month rules run on game-day boundaries, not the server tick. Frankendom should drive them from the tick so tests can step them.
- Not read: the action-object predicate, the week-life predicate, `Monster::GetRNDSize`, the castle growth rules beyond line 872. The stack size and the join rules are therefore the donor's shape, not its numbers.



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code.

**Errors / corrections:** Risk 'possible double placement' (note section 6, sketch taken-set) is wrong: each source is excluded after use and later sources are blocked within radius 3/4 (world.cpp 543,554,569) while targets are radius 1, so two sources cannot pick the same target tile. All cited lines, constants (7/4 calendar world.h 68-71, 75/25 and 50/40/10 week.cpp, 85/10/5 at 604-622, /3 and /360 at 591-592, 75-125%, 1..7 growth, 4000/4000000 cap, seed+_month at 517, GPL v2 or later) verified.

**Missed:** Weekly NewWeek (465-476) routes isWeekLife tiles to updateObjectInfoTile in an else-if before the monster branch; mentioned only as not read. Nothing major.
