# ihhub-fheroes2 (zones-world, cell 3)

Donor: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/maps/maps_tiles_helper.cpp` (growth step `updateMonstersOnTile`, 1697-1725), driven by `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/world/world.cpp` (`World::NewWeek`, 462-477) | Licence: GPL-2.0-or-later (maps_tiles_helper.cpp header: "either version 2 of the License, or" / "(at your option) any later version."; root `LICENSE` is GPL v2) | C++ | symbol `updateMonstersOnTile`

Checked: The hint file `src/fheroes2/world/world_regions.h` is the map region graph (`MapRegion`, `MapRegionNode`, flood fill for AI and reachability). It is not the population rule, so it was used only to rule out; its builder (`world_regions.cpp` 97-150, 320-398) was not read. The population mechanism was found by grep for `growth`, `population` and `updateMonstersOnTile`, then read in `world.cpp` (418-490), `maps_tiles_helper.cpp` (893-928, 1660-1725), `game_static.cpp` (305-320), `mp2.cpp` (511-549, the week-life list), `world.h` (69, 394-404), `engine/rand.h` (155-166) and `engine/rand.cpp` (67-119). Confidence: high on the weekly path, the formula, the cap and the zero and at-cap guards. Medium on what removes a stack from the map when its count reaches zero (not read: the removal path in `heroes_action.cpp` and `ai_hero_action.cpp` only shows the calls that set the count to 0). Castle dwelling growth (`castle/castle.cpp` 858-882) is a second population mechanism, seen by grep only and not read. Camera: not applicable (zones-world).

## 1. Mechanism

Order of operations, one week:

1. A week begins when the day count mod 7 is 1 (`world.h` 398, `numOfDaysPerWeek` = 7 at line 69). `World::NewDay` calls `NewWeek` at that point (`world.cpp` 443-444).
2. `NewWeek` does the object updates only when `_week > 1` (465). So the first week never grows monsters.
3. It reads the neutral cap once for the whole map: `GameStatic::getNeutralMonsterLimit` (467). That is 4000 for the original maps and 4,000,000 for resurrection maps (`game_static.cpp` 313-319).
4. For every tile: if the object is a week-life object (dwellings, mills, the like, `mp2.cpp` 513-543) it is updated by its own rule (470-471). Otherwise, if the main object is `OBJ_MONSTER` (473), the stack on that tile is grown (474). `OBJ_MONSTER` is not in the week-life list (`mp2.cpp` 513-543), so a monster stack always reaches the growth call. (Checked by reading the list; no receipt for an absent line.)
5. `updateMonstersOnTile` (`maps_tiles_helper.cpp` 1697-1725), for a stack with count `c`:
   - if `c` is 0, return (1707-1710). A cleared stack never regrows.
   - if `c` is at or over the cap, return (1712-1715).
   - Draw `bonus = 1` if `Rand::Get(1, 7) <= c % 7`, else 0 (1718). The draw is inclusive (`rand.cpp` 82, `uniformIntDistribution`).
   - Growth = `floor(c / 7) + bonus` (1719), then clamped to the room left under the cap: `min(growth, limit - c)` (1720).
   - Write `c + growth` back to the tile (1722-1724, `setMonsterCountOnTile` at 893-921, which stores the count in tile metadata at 920).

Worked numbers: for `c = 10`, `floor(10 / 7) = 1` and `10 % 7 = 3`, so the bonus is 1 with probability 3/7. Growth is 1 or 2, and the mean is 10/7 = 1.43. In general the expected growth is exactly `c / 7`, because the bonus probability is `(c % 7) / 7`.

## 2. Key functions

- `updateMonstersOnTile`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/maps/maps_tiles_helper.cpp` 1697-1725. One stack, one week.
- `setMonsterCountOnTile`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/maps/maps_tiles_helper.cpp` 893-927. The count store, for monster and other count-carrying objects.
- `World::NewWeek`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/world/world.cpp` 462-477 (the growth loop is 465-476). The week driver.
- `GameStatic::getNeutralMonsterLimit`: `/mnt/frankendom-donors/ihhub-fheroes2/src/fheroes2/game/game_static.cpp` 310-320. The per-map cap.
- `Rand::Get` and `uniformIntDistribution`: `/mnt/frankendom-donors/ihhub-fheroes2/src/engine/rand.cpp` 67-99. The integer draw, inclusive of both ends.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Growth per period is `count / 7`, rounded so the expected value is exact (a single integer draw pays the fraction) | Divisor 7 (1718-1719) |
| The draw weight is the remainder over the divisor | `c % 7` over `Rand::Get(1, 7)` (1718) |
| No growth from zero | Count 0 returns (1707-1710) |
| Cap: no growth at or above the limit, and growth never passes it | Cap from `getNeutralMonsterLimit`: 4000 (original), 4,000,000 (resurrection) (game_static.cpp 315, 319) |
| Week skip: the first week does not grow | `_week > 1` (world.cpp 465) |
| Week length | 7 days (world.h 69) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: skip the first period, skip a zero stack, skip a stack at the cap, compute `floor(count / 7)` plus one draw-weighted bonus, then clamp to the room under the cap. It takes the random draw as a parameter (the donor draws from its own thread RNG, `rand.cpp` 99), and it keeps counts as plain numbers rather than tile metadata. It omits the object-type switch, the week-life branch, the resurrection-map cap, the dwelling growth path, and the call sites that set a stack to zero (for example `heroes_action.cpp` 2271, not read in context).

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// randInt returns an integer in [lo, hi], both ends included.
type RandInt = (lo: number, hi: number) => number;

interface Stack { count: number; }

// Donor: growth per period is count / 7, and the fraction is paid by one draw.
const GROWTH_DIVISOR = 7;
// Donor: no growth in the first period (world.cpp 465).
const FIRST_GROWING_PERIOD = 2;

// One growth step for one neutral stack. Expected growth is exactly count / 7.
function growStack(s: Stack, limit: number, randInt: RandInt): number {
  const before = s.count;
  if (before === 0) return 0;            // a cleared stack does not regrow
  if (before >= limit) return 0;         // at or over the cap: no growth
  const remainder = before % GROWTH_DIVISOR;
  const bonus = randInt(1, GROWTH_DIVISOR) <= remainder ? 1 : 0;
  let growth = Math.floor(before / GROWTH_DIVISOR) + bonus;
  growth = Math.min(growth, limit - before);
  s.count = before + growth;
  return growth;
}

// One period across all neutral stacks on the map.
function runPeriod(stacks: Stack[], period: number, limit: number, randInt: RandInt): void {
  if (period < FIRST_GROWING_PERIOD) return;
  for (const s of stacks) growStack(s, limit, randInt);
}

export {};
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (the engine logic file named by the parity addendum for row 23). The growth step runs on the server, once per zone period, for each living neutral stack. The per-zone cap is zone data.
- Parity-checklist row: 23 (zone population). This is a partial fit. Row 23 names spawn caps, respawn and despawn. The donor gives the cap and the refill of a living stack toward it. It has no respawn of a killed stack (a cleared stack never regrows, `maps_tiles_helper.cpp` 1707-1710), so respawn timers and grace timers in row 23 are not covered here.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: zones as data (cap and rate are zone fields); server-verified kills (growth is a server step, never a client one); MAX_ATTACKERS = 3 is not changed by growth. Rules 7-9 n/a.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, and the typecheck passed on the VPS with `tsc --strict`.
- Clock: the donor's period is a calendar week of 7 days (`world.h` 69, 398). Frankendom's zones run on a real-time server tick, so the period must be a zone field (for example seconds per growth step), not a copy of the 7-day week.
- Randomness: the growth draw uses `Rand::Get` on the thread's RNG (`maps_tiles_helper.cpp` 1718, `rand.cpp` 99), which is not replayable. Frankendom's fight records and server-verified results need a seeded draw; `Rand::GetWithSeed` exists in `rand.cpp` 102-110 and was not checked further.
- Expected value versus one roll: the mean growth is exact, but one step can differ by one. Server tests must check the mean over many draws, or use a seeded draw, not a single step.
- No respawn: the donor refills only living stacks and never restarts a cleared stack (1707-1710). Frankendom's respawn and grace rules from row 23 need their own timers; this mechanism does not supply them.
- Caps: the donor's 4000 is for original maps. Frankendom must keep the cap as zone data and make sure growth never adds attackers in a fight; MAX_ATTACKERS = 3 is the fight ruling and growth does not change it.
- Removal at zero: how a stack leaves the map when its count reaches 0 was not read (see Checked). Frankendom needs a rule for the object at zero before adopting this step.
- Dwelling growth in `castle/castle.cpp` 858-882 is a second population mechanism with its own weekly rule (grep only). It is not written up here.
- The hint file, `world_regions.h`, is a region graph used for AI and reachability (`world_regions.cpp` 97-150 and 320-398 not read). It is a second candidate for zone layout and boundaries, and it is not written up here.

Best transferable idea: Grow a living population by its exact expected rate, using one random draw to pay the fractional part, capped at the zone's limit, and never restart a cleared stack from zero.
Decision (proposed): adapt — take the stochastic-rounding growth step and its cap and no-regrow-from-zero guards as a server step for living camps, with the rate and cap as zone data; reject it as a respawn rule, because the donor never refills a killed stack and row 23's respawn and grace timers still need their own design.
Acceptance: Server test: over 10,000 growth draws from a camp of 75 members, the mean growth is within 0.1 of 75/7 (about 10.71), no step takes the camp above the zone cap, and a camp at 0 members stays at 0 after any number of ticks.
