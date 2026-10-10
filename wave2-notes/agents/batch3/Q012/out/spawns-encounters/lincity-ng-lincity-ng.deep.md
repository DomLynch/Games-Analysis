# lincity-ng-lincity-ng (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/modules/shanty.cpp` | Licence: GPL-2.0-or-later (COPYING.txt is GPL version 2, June 1991; the shanty.cpp header says "either version 2 of the License, or (at your option) any later version") | C++ | symbol `update_shanty`

Checked: Read `modules/shanty.cpp` in full (1-279). Read the call site and cadence in `simulate.cpp` 96-135, pool inflow and pull in `modules/residence.cpp` 368-392, the spiral searches `Map::find_group` and `find_bare_area` in `engine.cpp` 276-321, constants in `modules/shanty.hpp` 40-60, `modules/commune.hpp` 49, `lintypes.hpp` 59. The list hint `fire.cpp` was not opened (not read). Not read: the value of `GROUP_HEALTH_TECH` (depends on MAX_TECH_LEVEL, not read), `Construction::detach` and `placeItem` internals, the `Fire` burn behaviour beyond `makeFire`. Open question, not verified: `add_a_shanty` tests `r == -1` on a `std::optional<MapPoint>` (lines 87 and 104); I did not confirm how that compiles or whether a failed search reaches `*r`. Confidence high on the director numbers and order of operations; medium on the removal path (detach internals not read).

## 1. Mechanism

- A monthly director, not a per-tick loop. `simulate.cpp` 107-110 calls `update_shanty` only when `total_time % DAYS_BETWEEN_SHANTY == 15` and `tech_level > GROUP_HEALTH_TECH`. `DAYS_BETWEEN_SHANTY` is `NUMOF_DAYS_IN_MONTH * 1` and `NUMOF_DAYS_IN_MONTH` is 100 (`lintypes.hpp` 59), so the update runs every 100 game days.
- The driver is a city-wide pool of unhoused people (`world.people_pool`). Residences feed it and draw from it: `residence.cpp` 375 raises a residence's desirability with the pool, 383 adds to the pool when a resident leaves, and 389 takes from it when one moves in. Each update first drains the pool by 5 per live shanty (`shanty.cpp` 123) and counts those lost people as deaths (126).
- Target count. Subtract the commune reserve (`COMMUNE_POP * communes`, 127), then `i = (pool - 150) / 50` with integer division (128). `SHANTY_MIN_PP` is 150 and `SHANTY_POP` is 50 (`shanty.hpp` 49-50). If `i < 0`, `i = 0` (129-130).
- Add branch (131-134): if `i > current`, spawn `1 + (i - current) / 10` shanties, each by `add_a_shanty`. Integer division, so a deficit under 10 adds exactly one per update.
- Remove branch (135-149): only if `current > 0` and `i < current - 1`. That is a hysteresis: a single spare shanty is tolerated. Remove `1 + (current - i) / 10` shanties. Each removal picks a random point, finds the nearest shanty by spiral search (`find_group`, 136-138), detaches it and sets it on fire (`makeFire`, 146-147). Removal is a burn-down event, not an instant delete.
- Placement (`add_a_shanty`, 71-114). A random point is drawn (76-77). If shanties exist and `rand() % 8 != 0` (7 in 8, line 78), search outward for the nearest shanty group from that point (80) and then a bare 2x2 area near it (86). Otherwise search for the nearest market (98); if there is none, return silently (99-100), which means no shanty before a market exists. Then `placeItem` (113).
- `find_group` (engine.cpp 280-291) walks a square spiral outward from the point and returns the first tile of that group. `find_bare_area` (309-321) does the same for a `size x size` clear area.

## 2. Key functions

- `update_shanty`: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/modules/shanty.cpp` 116-150. Pool drain, target, add batch, remove batch with hysteresis.
- `add_a_shanty`: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/modules/shanty.cpp` 71-114. Placement: 7-in-8 near shanties, else near market; bare 2x2 area; commit.
- `Shanty::makeFire`: `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/modules/shanty.cpp` 267-277. Sets a 2x2 burn with `burning_days = FIRE_LENGTH - 25` on removal.
- `World::end_of_month_update` (pool decay): `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/simulate.cpp` 124-127 (read; decay is probabilistic, `rand() % 1000 < people_pool`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A periodic director: target count = (feed pool after live units drain it, minus a reserve, minus a minimum) / step | Minimum 150, step 50 (theirs, shanty.hpp 49-50); reserve 5 per commune (theirs, commune.hpp 49) |
| Each live unit drains the feed pool each update, so the pool self-limits | Drain 5 per shanty per update (theirs, shanty.cpp 123) |
| Batched catch-up: spawn 1 + deficit / 10 per update | Batch divisor 10 (theirs, shanty.cpp 132) |
| Hysteresis on removal: remove only when target < count - 1 | Tolerance 1 (theirs, shanty.cpp 135) |
| Placement near existing cluster with a small chance of a fresh anchor | 7 in 8 near shanties, 1 in 8 near market (theirs, shanty.cpp 78) |
| Clear-footprint check before placing | 2x2 (theirs, shanty.cpp 86) |
| Monthly cadence | 100 game days, offset 15 (theirs, simulate.cpp 107; lintypes.hpp 59) |
| Removal is a fire, not an instant delete | Burn days = FIRE_LENGTH - 25 (theirs, shanty.cpp 275) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: drain by live count, compute the target from surplus above the reserve, add in batches when below target, remove in batches only when more than one above target. It reorders nothing else. It omits the city-level tech gate, the 15-day offset, the monthly probabilistic pool decay, the residence pool flows, the spiral searches and the 2x2 footprint test (passed in as callbacks), the market fallback, the fire on removal and the pollution and waste effects. The sketch does not model the `r == -1` optional comparison the donor uses.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface ZoneCity {
  pool: number;      // people waiting for housing in the zone
  communes: number;  // reserved-population buildings
  spawns: number;    // current count of spawned settlements
}

export interface DirectorParams {
  drainPerSpawn: number;   // pool lost per settlement per update
  reservePerCommune: number;
  minPool: number;         // surplus needed before the first settlement
  poolPerSpawn: number;    // surplus per additional settlement
  batchDivisor: number;    // extra spawns per this much deficit
}

export interface UpdateResult { pool: number; drained: number; added: number; removed: number; }

// One periodic update. addOne/removeOne do the placement and return success; removal is a burn-down event.
export function periodicUpdate(
  z: ZoneCity,
  p: DirectorParams,
  addOne: () => boolean,
  removeOne: () => boolean,
): UpdateResult {
  const before = z.pool;
  z.pool = Math.max(0, z.pool - p.drainPerSpawn * z.spawns);
  const drained = before - z.pool;

  const surplus = z.pool - p.reservePerCommune * z.communes;
  let target = Math.trunc((surplus - p.minPool) / p.poolPerSpawn); // integer division truncates toward zero
  if (target < 0) target = 0;

  let added = 0;
  let removed = 0;
  if (target > z.spawns) {
    const n = 1 + Math.trunc((target - z.spawns) / p.batchDivisor);
    for (let k = 0; k < n; k++) if (addOne()) added++;
  } else if (z.spawns > 0 && target < z.spawns - 1) {  // hysteresis: one spare is tolerated
    const n = 1 + Math.trunc((z.spawns - target) / p.batchDivisor);
    for (let k = 0; k < n; k++) if (removeOne()) removed++;
  }
  z.spawns += added - removed;
  return { pool: z.pool, drained, added, removed };
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population director; the pool is a per-zone pressure value and the removal is a server despawn). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). The hysteresis (remove only when count exceeds target by more than one) is the despawn shape row 23 asks for; the monthly cadence is replaced by the server tick.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: zones as data on one runtime (step, reserve, drain and batch numbers per zone); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not translated from the donor lines.
- Cadence: the donor updates once every 100 game days, a city-builder rhythm. Frankendom needs a server-tick cadence in seconds, and a 100-day gap is far too slow for a fight zone. Set the period as zone data and test it; do not port the monthly value.
- The feed pool here is economic (residences feed and draw from it). In Frankendom the pool would be a pressure value fed by something the design defines (for example kills, time since last clear, or a zone's own budget). That source is not in this code and has to be designed; do not claim the donor gives it.
- Removal is a burn-down: the donor sets the building on fire rather than deleting it. In Frankendom a despawn must be a server event with a grace timer and one ledger entry, not a visual effect.
- The batch rule (1 + deficit / 10) means a deficit under 10 spawns only one per update, so a large deficit refills slowly. Frankendom's spawn pacing (row 23 respawn) needs its own rule; this is a donor choice and should be tested before adoption.
- Placement uses random points plus a spiral search over the whole map. Frankendom's zones are data, so placement should draw from the zone's own spawn cells and check the server's visibility, not a map spiral.
- The 7-in-8 "near existing cluster" rule is a city-growth flavour. For encounters it would cluster enemies on one side of the zone. Do not adopt it without a design reason.
- The donor has no fight, no attacker cap and no MAX_ATTACKERS. Population here is a settlement count, not simultaneous attackers; do not merge it with MAX_ATTACKERS = 3.
- Open donor question: the `r == -1` optional comparison (shanty.cpp 87, 104) is unverified. Do not copy the failure path without reading it.

Best transferable idea: a periodic director in which a zone's pressure pool is drained by each live spawn, the target count is the pool surplus above a reserve in fixed steps, spawns come in batches, and removal starts only when the count is more than one above target.
Decision (proposed): adapt - the feedback loop (live spawns drain the feed, target from surplus, one-spare hysteresis on removal) is the shape row 23 needs for despawn with a grace timer; the cadence, pool source, burn-down removal and placement map are not adopted.
Acceptance: server test on zone data with reserve 0, minimum 150, step 50: with 5 live spawns and pool 375 before the update, nothing is removed (target 4); with pool 325, exactly one spawn is removed (target 3); with 0 spawns and pool 500, exactly one is added per update.
