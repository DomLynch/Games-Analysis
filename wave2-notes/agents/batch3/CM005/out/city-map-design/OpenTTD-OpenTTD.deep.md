# OpenTTD-OpenTTD (city-map-design, cell 3)

Donor: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/town_cmd.cpp` (town growth, zone rings and house choice; the list hint `src/genworld.cpp` is the world-generation driver and only calls the town generator, it has no town layout code) | Licence: GPL version 2 (header text: "...under the terms of the GNU General Public License as published by the Free Software Foundation, version 2."; no or-later wording; COPYING.md is GPLv2) | C++ | symbols `GrowTown`, `GrowTownAtRoad`, `GrowTownInTile`, `UpdateTownRadius`, `GetTownRadiusGroup`, `TryBuildTownHouse`, `TownTickHandler`

Checked: Read in full: `TownTickHandler` and `OnTick_Town` (town_cmd.cpp 888-914), the driver `CallLandscapeTick` (landscape.cpp 1729; the call lines 1732-1734 read), `GrowTown` (1870-1920), `GrowTownAtRoad` (1765-1846, including the `do ... while (--iterations >= 0)` loop end at 1843), `GrowTownInTile` (1505-1712), `IsRoadAllowedHere` (1040-1066), `GetTownRoadGridElement` (1121-1168; the sloped-tile template part not traced), `UpdateTownRadius` (1926-1967), `GetTownRadiusGroup` (2514-2526), `TryBuildTownHouse` (2819-2912, retry loop read to the not-sloped check), `GetNormalGrowthRate` (3898-3912) and `UpdateTownGrowthRate` (3918-3925), `UpdateTownGrowth` (3931-3967, goal gate at 3951 read), `HouseZone` and `HZ_ZONE_ALL` (house.h 57-82), `TownLayout` (town_type.h 80-90). Partly read: `GrowTownWithExtraHouse` (1181-1200, the count test not read), `CanFollowRoad` (1722-1745). Callers: `GrowTownAtRoad` only from `GrowTown` (1896); `UpdateTownRadius` from town_cmd.cpp 2013, 2066, 2077, 2801, 3139, 3326, 3338 and town_sl.cpp 52 (names read, contexts not read); `GetTownRadiusGroup` from TryBuildTownHouse (2832), station_cmd.cpp 3768, road_cmd.cpp 2051 and several NewGRF hooks. Not read: `TownLayoutAllowsHouseHere`, the bridge and tunnel growth branches (1280-1420), `TOWN_GROWTH_TICKS`, `TownTicksToGameTicks`, the minimap window (`src/smallmap_gui.cpp`, 2192 lines, not opened), any signage code (a narrow grep for TownLayout, GrowTown and TownZone found none). Second candidate read: `src/town_cmd.cpp` (the same file) and `src/landscape.cpp` (tick caller). Camera: not a camera cell. Confidence: high on the tick order, the zone radius rule and the house pick; medium on the exact walk stop conditions (the bridge and tunnel branches were not read).

Best transferable idea: grow a settlement outward from its centre in concentric zone rings whose squared radii come from the building count, and pick each building by a weighted roll over only the building types whose zone mask covers that ring.
Decision (proposed): adapt - the ring-by-count rule and the zone-mask pick are good for authoring towns as data (rings and building masks in a zone file, generated once); the per-tick growth countdown is rejected for Frankendom, because zones are fixed data and nothing grows during play.
Acceptance: a seeded authoring test generates a 40-building town and asserts that each building's zone is the innermost ring that contains it, that the centre ring appears only when the town is funded (or within the fixed disc), and that the same seed writes the same zone file twice.

## 1. Mechanism

**Tick (the loop that drives town growth).** `CallLandscapeTick` (landscape.cpp 1732-1734) runs `OnTick_Town` once per game tick, inside the game loop's landscape block. `OnTick_Town` (town_cmd.cpp 911-912) calls `TownTickHandler` for every town. A growing town (flag `IsGrowing`) counts `grow_counter` down by one each tick (893). When the counter goes below zero (894), `GrowTown` tries one growth step. On success the counter resets to the growth rate (895-896). On failure it waits `min(growth_rate, TOWN_GROWTH_TICKS - 1)` ticks (899). So growth is a fixed-step countdown with a failure backoff, not a per-frame process.

**Growth rate.** `GetNormalGrowthRate` (3898-3912): a table by funded state and active station count (rows at 3899-3900; `_grow_count_values[funded?0:1][min(n,5)]`, with n from `CountActiveStations`, 3903). The value is shifted down by the `town_growth_rate` setting (3908), halved for larger towns (3909), then divided by `houses / 50 + 1` (3911) and converted to game ticks. Growth is also gated: when the town is not funded, every acceptance goal must be met (3951), except the winter and desert goals (not read in full).

**One growth step (`GrowTown`, 1870).** Scan a fixed 13-offset pattern around the town centre for a tile with road bits (1895). If one is found, `GrowTownAtRoad` starts a walk from it. If none is found, clear one flat tile and build a random road block (1911).

**Road walk (`GrowTownAtRoad`, 1765).** A budget of steps: `10 + houses * k / 9` with k = 2 (better roads, 1780), k = 1 (grid layouts, 1785), k = 4 (original, 1789). The loop is `do { ... } while (--iterations >= 0)` (1842), so the budget plus one steps run. Each step calls `GrowTownInTile` on the current tile. `Succeed` returns true. `SearchStopped` sets the budget to 0 and ends the walk after this step. Otherwise the walk picks a random outgoing road bit that is not the way it came, walks one tile, and repeats (1807-1830, partly read).

**Per-tile decision (`GrowTownInTile`, 1505).** Three cases.
- No road on the tile (1512-1561). Stop if roads are not allowed. Grid layouts: the grid element decides the road bits (`GetTownRoadGridElement`, 1121); no element means stop. Original and better: `IsRoadAllowedHere` must pass; a random turn is taken with chance 1 in 4 (1538); a curved new road is allowed only if a house sits beside it.
- Road exists but not toward the target: extend the road (1562-1583).
- Road exists and a random side is chosen (1584-1690). If the side has a road, a corner house is placed on a turn. Otherwise the house tile is the next tile on that side. Grid layouts set `allow_house = !rcmd.Any(target_rb)` (1653), so houses sit only where the grid puts no road. Original and better allow a house beside a road on a 60% roll (1666, `Chance16(6, 10)`) or when a road is not allowed. A house is built with `TryBuildTownHouse` (1681).
- Otherwise the road is built (1692-1711) through bridge (1701), tunnel or road (1708) (the tunnel branch between them not read in full).

**Spacing and edges.** `IsRoadAllowedHere` refuses a tile on the map edge (1047) and refuses a tile whose neighbour already carries road, with neighbour distance 1 for `Original` and 2 for the others (1065). A sloped tile may be terraformed toward the needed slope (after 1065, partly read). Water is refused in `GrowTownInTile` at the house tile ("Don't walk into water"), not in `IsRoadAllowedHere`.

**Grid layouts (`GetTownRoadGridElement`, 1121-1168; the sloped-tile template part not traced).** The offset from the town centre is tested: a road runs along y when `grid_pos.x % 3 == 0` (1131, Grid2x2) or `% 4 == 0` (1136, Grid3x3), and along x when the other offset passes the same test. This makes blocks of 2x2 or 3x3 houses between roads.

**Zone rings (`UpdateTownRadius`, 1926-1967).** Each town keeps five squared radii, one per zone: edge, outskirt, outer suburb, inner suburb, centre. For fewer than 92 houses (23 rows x 4), the radii come from a table row per four houses (1954-1955). For 92 houses or more, `mass = houses / 8` and the radii are `mass*15-40`, `mass*9-15`, 0, `mass*5-5`, `mass*3+5` (1961-1965). The comment says the offsets keep the radii from shrinking at the table boundary. I checked the boundary at 92 houses: the formula gives edge 125, outskirt 84, inner 50 and centre 38, all at or above the last table row (121, 81, 0, 49, 36) in the same zone order. The zone classifier `GetTownRadiusGroup` (2514-2526) gives the centre zone to a funded town within squared distance 25 (2518). Otherwise it loops the zones from edge to centre (`HZ_ZONE_ALL`, house.h 80-86) and keeps the last zone whose squared radius exceeds the squared distance (2522). So a tile gets the innermost ring that contains it, and the edge if none does.

**House pick (`TryBuildTownHouse`, 2819).** The layout's own forbidding check runs first (`TownLayoutAllowsHouseHere`, not read). The tile's zone set is built from `GetTownRadiusGroup` (2832) plus one climate bit. Every house spec whose availability mask covers all bits of that set, (and that is enabled and not overridden) enters a pool with its weight (2852); the year range is NOT a pool filter. A weighted roll picks one (2878). Each tried spec is removed from the pool, whether or not it builds, and the loop continues until the pool is empty or a house builds. The year check (`min_year`/`max_year`) and the `BuildingIsHistorical` skip (outside world generation and the editor) run only after the roll (2894-2898); a failing spec is removed and re-rolled, so the outcome distribution matches a pre-filtered pool but the order of draws differs. Church and stadium are one-of per town (2903-2909). The not-sloped check follows (not read further).

## 2. Key functions

- Tick: `TownTickHandler` `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/town_cmd.cpp` 888-904; caller `OnTick_Town` 907-914; landscape block `CallLandscapeTick` `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/landscape.cpp` 1729 (calls at 1732-1734).
- Growth rate: `GetNormalGrowthRate` `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/town_cmd.cpp` 3898-3912.
- Road walk: `GrowTownAtRoad` `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/town_cmd.cpp` 1765-1846; per-tile decision `GrowTownInTile` 1505-1712.
- Zone rings: `UpdateTownRadius` `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/town_cmd.cpp` 1926-1967; zone classifier `GetTownRadiusGroup` 2514-2526.
- House pick: `TryBuildTownHouse` `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/town_cmd.cpp` 2819-2912.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Countdown per tick; success resets to rate; failure waits up to rate | Failure cap `TOWN_GROWTH_TICKS - 1` (899; value not read) |
| Growth rate from a count table, funded and normal rows | Normal row 320, 420, 300, 220, 160, 100 by stations 0 to 5+; funded row 120, 120, 120, 100, 80, 60 (3899-3900) |
| Rate shift by setting, halved for large towns, banded by houses | Shift by setting (3908); halve (3909); divide by houses/50 + 1 (3911) |
| Walk budget scales with house count, per layout | Base 10; per-house share 2/9, 1/9, 4/9 (1780-1789) |
| Zone radii from building count | Table: 23 rows per four houses (1928-1952); large-town formula with mass = houses/8 (1961-1965) |
| Funded centre disc | Squared radius 25 (2518) |
| Innermost ring containing the tile | Zone order edge to centre (house.h 80-86) |
| Weighted pick over masks, remove tried items | Mask must cover all zone bits (2852); weight per spec (data) |
| Grid spacing by layout | Spacing 3 (Grid2x2, 1131) and 4 (Grid3x3, 1136) |
| Original layout house beside road | 60% (1666) |
| Random turn | 1 in 4 (1538) |
| Road spacing | Neighbour distance 1 (Original) or 2 (others) (1065) |

## 4. TypeScript sketch

simplified: the sketch follows the donor order (zone radii from the house count, innermost zone by squared distance with the funded override, weighted house pick over availability masks with each tried spec removed, the road-walk budget, the per-tick countdown with success reset and failure wait). It omits the 23-row table (passed in, not copied), the climate bit in the zone set, the road scan around the centre and the random block clear, the bridge and tunnel branches, the water, slope and edge checks, `LevelTownLand`, the historical-house and one-of checks (church, stadium), the not-sloped check, `TownLayoutAllowsHouseHere`, the goal gate, and the conversion to game ticks. It also drops the donor's exact integer shifts: the rate uses a right shift as the donor does, but the donor's `TownTicksToGameTicks` is not modelled.

```ts
// Clean-room sketch. Donor: OpenTTD (GPL version 2, file header). Written from the described mechanism, not a translation.
type Rng = () => number;
type Zone = 0 | 1 | 2 | 3 | 4; // 0 edge, 1 outskirt, 2 outer suburb, 3 inner suburb, 4 centre (donor order)
type Layout = "original" | "better" | "grid";

interface Spec { name: string; availability: number; weight: number; minYear: number; maxYear: number }
interface TownState {
  cx: number; cy: number; houses: number; funded: boolean; stations: number; larger: boolean;
  layout: Layout; growing: boolean; counter: number; rate: number;
}

// Zone radii as squared tile distances. Small towns read a table row per four houses (the donor table is
// passed in, not copied). Large towns use the donor's formula: edge, outskirt, outer suburb, inner suburb, centre.
function zoneRadii(houses: number, table: number[][]): number[] {
  if (houses < table.length * 4) return table[Math.floor(houses / 4)];
  const mass = Math.floor(houses / 8);
  return [mass * 15 - 40, mass * 9 - 15, 0, mass * 5 - 5, mass * 3 + 5];
}

// Innermost zone whose squared radius still exceeds the squared distance: the donor loops edge to centre and
// keeps the last match. A funded town has a centre disc of squared radius 25 regardless of the table.
function zoneOf(t: TownState, x: number, y: number, radii: number[]): Zone {
  const d2 = (x - t.cx) ** 2 + (y - t.cy) ** 2;
  if (t.funded && d2 <= 25) return 4;
  let z: Zone = 0;
  for (let i = 0; i < 5; i++) if (d2 < radii[i]) z = i as Zone;
  return z;
}

// House pick: a spec is eligible when its availability mask covers every bit of the tile's zone set.
// Weighted roll over the eligible pool; each tried spec is removed from the pool whether or not it builds.
function pickHouse(specs: Spec[], tileBits: number, year: number, rng: Rng, tryBuild: (s: Spec) => boolean): Spec | null {
  const pool = specs.filter((s) => (s.availability & tileBits) === tileBits);
  for (;;) {
    const total = pool.reduce((a, s) => a + s.weight, 0);
    if (pool.length === 0 || total <= 0) return null;
    let r = Math.floor(rng() * total);
    let i = 0;
    while (i < pool.length - 1 && pool[i].weight <= r) {
      r -= pool[i].weight;
      i++;
    }
    const pick = pool[i];
    pool[i] = pool[pool.length - 1];
    pool.pop();
    if (year < pick.minYear || year > pick.maxYear) continue; // donor checks the year after the roll (2898)
    if (tryBuild(pick)) return pick;
  }
}

// Growth rate in ticks: table by funding and active station count, shifted by the setting, halved for
// large towns, divided by a house band. The donor then converts to game ticks (not read).
const GROW_TABLE: number[][] = [
  [120, 120, 120, 100, 80, 60], // funded
  [320, 420, 300, 220, 160, 100], // normal
];
function normalRate(t: TownState, shift: number): number {
  let m = GROW_TABLE[t.funded ? 0 : 1][Math.min(t.stations, 5)] >> shift;
  if (t.larger) m = Math.floor(m / 2);
  return Math.floor(m / (Math.floor(t.houses / 50) + 1));
}

// Road-walk budget. The donor runs this many steps plus one (do ... while (--iterations >= 0)).
function walkBudget(layout: Layout, houses: number): number {
  if (layout === "better") return 10 + Math.floor((houses * 2) / 9);
  if (layout === "grid") return 10 + Math.floor((houses * 1) / 9);
  return 10 + Math.floor((houses * 4) / 9);
}

// Grid layouts: a road runs along a line when the offset from the centre is a multiple of the spacing (3 or 4).
function gridRoads(dx: number, dy: number, spacing: number): { roadY: boolean; roadX: boolean } {
  return { roadY: dx % spacing === 0, roadX: dy % spacing === 0 };
}

// Original and better layouts: a house beside a new road is allowed when a road is not allowed here, or on a 60% roll.
function houseBesideRoad(roadAllowed: boolean, rng: Rng): boolean {
  return !roadAllowed || rng() < 0.6;
}

// Per game tick: count down; at zero try one growth step. Success resets to the rate; failure waits up to the
// rate, capped at cap - 1 (the donor's TOWN_GROWTH_TICKS - 1; the value was not read).
function tickTown(t: TownState, grow: () => boolean, cap: number): void {
  if (!t.growing) return;
  let i = t.counter - 1;
  if (i < 0) i = grow() ? t.rate : Math.min(t.rate, cap - 1);
  t.counter = i;
}

export {};
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (existing file; the zone-authoring generator would be a new module beside it, not yet created). The rings and the building masks are authoring-time zone data; the server reads them.
- Parity-checklist row 23 (zone population). The growth countdown and the failure wait are population timing, and the nearest row for them is 23. No row covers zone layout by itself.
- Reuse tag: rewrite-from-idea (GPL version 2; clean-room only)
- Brief rule served: zones as data (Frankendom ruling). No combat rule is served by this note.

## 6. Gaps and risks

- GPL version 2 with no "or later" wording: clean-room only. The sketch was written from the described order; no donor lines were translated.
- Authoring time, not runtime. The growth countdown is rejected for Frankendom's zones: a zone that grows during play would need the server to verify every new building. The per-tick path belongs to the donor's game loop only.
- Defect (efficiency, fix named): `ForAllStationsNearTown` (town_cmd.cpp 3809) uses the squared edge radius divided by two as the linear search radius. The donor's own comment says it should be close to the true radius and suggests an integer square root. The search area is far larger than needed (for a squared radius of 121 the search radius is 60, against a true radius of 11). The exact squared test that follows keeps the result correct. Fix: integer square root of the squared radius, then the same squared test. Not in the sketch (the sketch has no stations).
- The table is hand-tuned and irregular: some rows set outer suburb to 0 and some set outskirt or centre to 0. That is a designer's choice; Frankendom should keep the table as data, not port the numbers.
- Zone rings depend on the house count, so an authoring tool must recompute them after each placement. The donor calls `UpdateTownRadius` from the callers listed in the Checked line; their contexts were not read, so the exact refresh points are only partly known.
- Not read: `TownLayoutAllowsHouseHere`, the bridge and tunnel branches, `TOWN_GROWTH_TICKS`, `TownTicksToGameTicks`, the winter and desert goal branches, and the minimap window (`src/smallmap_gui.cpp`). The minimap and signage topics are not rated in this cell.
- Half read: engine code for generation and growth (not the server or client half). The house specifications (their availability masks, weights and year ranges) are data and were not read; the town name strings and their grammar were not read either.
- The sketch is only typechecked (VPS, `tsc --strict --target es2020`, exit 0). It was not run on a town.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
MINOR.
- Last table row quoted as 121,81,0,49,25; real last row (town_cmd.cpp 1951) is {121,81,0,49,36}. Boundary conclusion still holds (centre formula 38 >= 36).
- Year range was described as a pool filter; real code checks year (and BuildingIsHistorical) after the roll (2894-2898), failed specs removed and re-rolled.
- Missed: GrowTownWithExtraHouse (1646, 1657) places a second house for Grid3x3 and BetterRoads layouts; GrowTown road-block fallback is gated by TownAllowedToBuildRoads (1904).

Fixed 2026-10-12: table row corrected to 36; house pick text and TypeScript sketch now check year after the roll; added the two missed mechanisms above.
