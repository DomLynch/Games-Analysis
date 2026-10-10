# vcmi-vcmi (zones-world, cell 7)

Donor: `/mnt/frankendom-donors/vcmi-vcmi/lib/rmg/modificators/ObjectManager.cpp` (`chooseGuard` 728-787, `addGuard` 789-815) with `lib/rmg/modificators/TreasurePlacer.cpp` (`createTreasures` 932-1085, `isGuardNeededForTreasure` 704-707, `prepareTreasurePile` 709-740) | Licence: GPL-2.0-or-later (per the `CRmgTemplate.cpp` header: "License: GNU General Public License v2.0 or later"; `license.txt` is the GPL v2 text) | C++ | symbol `ObjectManager::chooseGuard`

Checked: The list hint `lib/rmg/CRmgTemplate.cpp` is the zone data definition (JSON fields, treasure tiers, budget recalc), not the population logic. Opened: `ObjectManager.cpp` 700-815; `TreasurePlacer.cpp` 670-745 and 925-1085; `CRmgTemplate.h` 45-66; `CRmgTemplate.cpp` 276-292 (read) and 504-538 (grep only); `config/randomMap.json` 15-24; `CMapGenerator.cpp` 174-182. Callers, by grep: `addGuard` from `ObjectManager.cpp` 412, 448, 493 and `ConnectionsPlacer.cpp` 485-486 (zone gates); `chooseGuard` from `ConnectionsPlacer.cpp` 275 (zone guard). Not read: `ObjectManager::placeAndConnectObject`, `TreasurePlacer::getRandomObject`, the rest of `addGuard` (after 815), `TreasurePlacer` after 1085, `Zone.cpp` (treasure value and span factor, 278-308, grep only), `CZonePlacer.cpp` (zone layout, not read), and how `creatureToCount` (670-702) feeds creature piles (not traced). Confidence: high on the guard strength curve, the need test, the candidate rule and the pile count (read in full); medium on placement (read only up to the scoring function). Depth: thin, because placement was not read. Zone-world topic; not a camera cell.

Note on the generator: this is map generation, run once when a random map is made. Nothing here runs at play time. It is the closest donor to "zone population", and only the authoring half of row 23 transfers.

## 1. Mechanism

- Zone data (`CRmgTemplate.h` 49-62; `CRmgTemplate.cpp` 40-63, 276-283): each zone carries treasure tiers (min, max, density), a monster tier (none, weak, normal, strong; JSON mapping at `CRmgTemplate.cpp` 504-530, grep only), and a zone max treasure value. The max is the largest tier max (276-283), and it caps any single object (for example `TreasurePlacer.cpp` 129).
- Piles per tier (`createTreasures` 964-985): tiers are sorted richest first (965). For each tier, count = zone tiles × density / 400 (984-985), where the zone's tile count is `zone.area()->getTilesVector().size()` (970).
- Spacing: `totalDensity` adds this tier's density (982), and the tier's minimum pile distance is `max(sqrt(min(tier.min, 30000) / 10 / totalDensity), 1)` (987). Because the sum is cumulative, richer tiers that come first leave the later tiers a smaller total.
- Pile build (`prepareTreasurePile` 709-740): the target value is drawn uniformly from [min, max] (715). Objects are added while the running total is at or below the target minus 100 (719); a pile's value is the sum of its objects' values (999-1003).
- Guard decision (1021-1023): a pile is guarded if `isGuardNeededForTreasure(value)` is true, which means the zone has monsters (not `ZONE_NONE`) and `value > minGuardedValue` (706). The threshold is `minGuardedValues[idx]` with `idx = zone tier + map tier - 1` (937-939; ZONE_NORMAL is 0, so the zone tier is -1, 0 or 1 and the map tier is 2, 3 or 4). Then `addGuard(rmgObject, value)` (1023).
- Guard strength (`chooseGuard` 728-787). The strength input is the pile value. The index is `zone tier + map tier - 1` for treasure guards; zone guards use 0 for the zone part (737). Two hinge terms are added (743-746):
  s1 = trunc(max(0, (v - value1[idx]) x mult1[idx]));
  s2 = trunc(max(0, (v - value2[idx]) x mult2[idx]));
  strength = s1 + s2.
  If strength is below `minGuardStrength` (747-748; config 2000), there is no guard.
- Creature choice (750-772): skip creatures that are `special` or have AI value 0 (755-758), and any creature whose faction is not in the zone's list (759-760). Keep a creature when its average stack value (AI value x (ammMin + ammMax) / 2) is below the strength and the strength is below 100 x its AI value (761). Pick one at random (768). Amount = strength / AI value (769). If the amount is 4 or more, multiply it by a uniform factor in [0.75, 1.25] (770-771).
- Fallback (773-777): if no creature fits, the guard is the Azure Dragon, with amount = strength / its AI value. No jitter on this branch (the jitter is inside the candidate branch, 770-771).
- The guard is a hostile creature object with that stack (779-785). Its tile is chosen by `placeAndConnectObject` (not read); `addGuard` first looks for the tile nearest the object's visitable tile among accessible tiles (796-814, read to 815).
- Placement in `createTreasures` (1034-1079, read to 1079): a candidate tile is refused when any tile of the pile is closer than `minDistance` to another object (1053-1057). A guarded pile above `blockingGuardMaxValue` (zone max / 3, 940) cannot have its guard tile next to a road (1063-1066). A guard whose blocked side overlaps a path or road or the visitable area is refused (1068-1072). A guard that hides a road has its score divided by 10 (1075-1076).
- Ticks and timing: none. Everything above runs when the map is generated.

## 2. Key functions

- `ObjectManager::chooseGuard`: `/mnt/frankendom-donors/vcmi-vcmi/lib/rmg/modificators/ObjectManager.cpp` 728-787. The strength curve, the minimum cutoff, the candidate rule, the random pick, the amount and jitter, and the fallback.
- `ObjectManager::addGuard`: same file, 789-815 (read to the guard tile choice; the rest not read). Calls `chooseGuard`, then picks an entrable, accessible tile.
- `TreasurePlacer::isGuardNeededForTreasure`: `/mnt/frankendom-donors/vcmi-vcmi/lib/rmg/modificators/TreasurePlacer.cpp` 704-707. Zone has monsters and the pile is above the tier threshold.
- `TreasurePlacer::prepareTreasurePile`: same file, 709-740 (read to 740; `getRandomObject` not read). Target value and object fill.
- `TreasurePlacer::createTreasures`: same file, 932-1085 (read to 1085). Tier order, pile count, min distance, the pile loop with guard decision, and the placement scoring.
- `ZoneOptions::recalculateMaxTreasureValue`: `/mnt/frankendom-donors/vcmi-vcmi/lib/rmg/CRmgTemplate.cpp` 276-283. Zone max treasure value as the largest tier max.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Two hinge terms summed: strength rises from value1 with slope mult1, and again from value2 with slope mult2 | value1 2500 / 1500 / 1000 / 500 / 0 (ObjectManager.cpp 738); value2 7500 / 7500 / 7500 / 5000 / 5000 (739); mult1 0.5 / 0.75 / 1.0 / 1.5 / 1.5 (740); mult2 0.5 / 0.75 / 1.0 / 1.0 / 1.5 (741) |
| Index row = zone tier + map tier - 1 | Zone tiers ZONE_WEAK -1, ZONE_NORMAL 0, ZONE_STRONG 1 (CRmgTemplate.h 55-57); global map tiers 2, 3, 4 (58-60) |
| Guard cutoff | minGuardStrength 2000 (randomMap.json 19; ObjectManager.cpp 747) |
| Guard needed above a tier threshold | minGuardedValues 6500 / 4167 / 3000 / 1833 / 1333 (TreasurePlacer.cpp 938) |
| Stack amount = strength / AI value, jittered when at least 4 | jitter 0.75 to 1.25 (ObjectManager.cpp 770-771) |
| Pile count = area x density / 400 | DENSITY_CONSTANT 400 (TreasurePlacer.cpp 984-985) |
| Minimum pile distance from the tier minimum | min capped at 30000 and floor 1 (987) |
| Blocking-guard cap | zone max treasure / 3 (940) |
| Hidden-road penalty | score / 10 (1076) |
| Fallback creature | Azure Dragon (ObjectManager.cpp 775) |

Worked example (arithmetic from the table above): a pile of value 6000 in a normal zone on a normal map has idx = 0 + 3 - 1 = 2. s1 = (6000 - 1000) x 1.0 = 5000; s2 = max(0, 6000 - 7500) = 0. Strength = 5000, which passes the 2000 cutoff. Guard needed: 6000 > 3000. A creature with AI value 500 and a stack below 5000 / 500 units of average value fits, since 5000 < 500 x 100. Amount = 5000 / 500 = 10, jittered to 7 to 12 (10 x 0.75 = 7.5 floors to 7; 10 x 1.25 = 12.5 floors to 12).

## 4. TypeScript sketch

simplified: the sketch keeps the donor order of the guard decision: index, the two hinge terms with truncation, the 2000 cutoff, the candidate test, the random pick, the amount, and the jitter only on a candidate stack (the fallback is not jittered, as in the donor). It omits: the `special` flag and the AI-value-zero check (the caller must pass filtered creatures), the faction list lookup, `getRandomObject` and pile construction, the two-attempt rebuild and the emergency counter, the placement scoring and road and blocking rules, the `creatureToCount` tier logic, and the C++ integer details beyond flooring each positive result. The index formula `tierIndex` is shown for reference; the caller computes the index. The random source is a function argument.

