# vcmi-vcmi (zones-world, cell 7)

Donor: `/mnt/frankendom-donors/vcmi-vcmi/lib/rmg/modificators/ObjectManager.cpp` (`chooseGuard` 728-787, `addGuard` 789-815) with `lib/rmg/modificators/TreasurePlacer.cpp` (`createTreasures` 932-1085, `isGuardNeededForTreasure` 704-707, `prepareTreasurePile` 709-740) | Licence: GPL-2.0-or-later (per the `CRmgTemplate.cpp` header: "License: GNU General Public License v2.0 or later"; `license.txt` is the GPL v2 text) | C++ | symbol `ObjectManager::chooseGuard`

Checked: The list hint `lib/rmg/CRmgTemplate.cpp` is the zone data definition (JSON fields, treasure tiers, budget recalc), not the population logic. Opened: `ObjectManager.cpp` 700-815; `TreasurePlacer.cpp` 670-745 and 925-1085; `CRmgTemplate.h` 45-66; `CRmgTemplate.cpp` 276-292 (read) and 504-538 (grep only); `config/randomMap.json` 15-24; `CMapGenerator.cpp` 174-182. Callers, by grep: `addGuard` from `ObjectManager.cpp` 412, 448, 493 and `ConnectionsPlacer.cpp` 485-486 (zone gates); `chooseGuard` from `ConnectionsPlacer.cpp` 275 (zone guard). Not read: `ObjectManager::placeAndConnectObject`, `TreasurePlacer::getRandomObject`, the rest of `addGuard` (after 815), `TreasurePlacer` after 1085, `Zone.cpp` (treasure value and span factor, 278-308, grep only), `CZonePlacer.cpp` (zone layout, not read), and how `creatureToCount` (670-702) feeds creature piles (not traced). Confidence: high on the guard strength curve, the need test, the candidate rule and the pile count (read in full); medium on placement (read only up to the scoring function). Depth: thin, because placement was not read. Zone-world topic; not a camera cell.

Note on the generator: this is map generation, run once when a random map is made. Nothing here runs at play time. It is the closest donor to "zone population", and only the authoring half of row 23 transfers.

## 1. Mechanism

- Zone data (`CRmgTemplate.h` 49-62; `CRmgTemplate.cpp` 40-63, 276-283): each zone carries treasure tiers (min, max, density), a monster tier (none, weak, normal, strong; JSON mapping at `CRmgTemplate.cpp` 504-530, grep only), and a zone max treasure value. The max is the largest tier max (276-283), and it caps any single object (for example `TreasurePlacer.cpp` 129).
- Piles per tier (`createTreasures` 964-985): tiers are sorted richest first (965). For each tier, count = zone tiles × density / 400 (984-985), where the zone's tile count is `zone.area()->getTilesVector().size()` (970).
- Spacing: `totalDensity` adds this tier's density (982), and the tier's minimum pile distance is `max(sqrt(min(tier.min, 30000) / 10 / totalDensity), 1)` (987). Because the sum is cumulative, a later tier is measured against a larger total density.
- Pile build (`prepareTreasurePile` 709-740): the target value is a random integer in [min, max] (715). Objects are added while the running total is at or below the target minus 100 (719); a pile's value is the sum of its objects' values (999-1003).
- Guard decision (1021-1023): a pile is guarded if `isGuardNeededForTreasure(value)` is true, which means the zone has monsters (not `ZONE_NONE`) and `value > minGuardedValue` (706). The threshold is `minGuardedValues[idx]` with `idx = zone tier + map tier - 1` (937-939; ZONE_NORMAL is 0, so the zone tier is -1, 0 or 1 and the map tier is 2, 3 or 4). Then `addGuard(rmgObject, value)` (1023).
- Guard strength (`chooseGuard` 728-787). The strength input is the pile value. The index is `zone tier + map tier - 1` for treasure guards; zone guards use 0 for the zone part (737). Two hinge terms are added (743-746):
  s1 = trunc(max(0, (v - value1[idx]) x mult1[idx]));
  s2 = trunc(max(0, (v - value2[idx]) x mult2[idx]));
  strength = s1 + s2.
  If strength is below `minGuardStrength` (747-748; config 2000), there is no guard.
- Creature choice (750-772): skip creatures that are `special` or have AI value 0 (755-758), and any creature whose faction is not in the zone's list (759-760). Keep a creature when its average stack value (AI value x (ammMin + ammMax) / 2) is below the strength and the strength is below 100 x its AI value (761). Pick one at random (768). Amount = strength / AI value (769). If the amount is 4 or more, multiply it by a uniform factor in [0.75, 1.25] (770-771).
- Fallback (773-777): if no creature fits, the guard is the Azure Dragon, with amount = strength / its AI value. No jitter on this branch (the jitter is inside the candidate branch, 770-771).
- The guard is a hostile creature object with that stack (779-785). The pile is then placed by `placeAndConnectObject` (1050; not read); `addGuard` first restricts the accessible tiles to the border outside the entrable area (796-807), then takes the minimum over them with a comparator whose body was not read (814-815).
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

Worked example (arithmetic from the table above): a pile of value 6000 in a normal zone on a normal map has idx = 0 + 3 - 1 = 2. s1 = (6000 - 1000) x 1.0 = 5000; s2 = max(0, 6000 - 7500) = 0. Strength = 5000, which passes the 2000 cutoff. Guard needed: 6000 > 3000. A creature with AI value 500 fits if its average stack size is below 10 (500 x average < 5000) and 5000 < 500 x 100. Amount = 5000 / 500 = 10, jittered to 7 to 12 (10 x 0.75 = 7.5 floors to 7; 10 x 1.25 = 12.5 floors to 12).

## 4. TypeScript sketch

simplified: the sketch keeps the donor order of the guard decision: index, the two hinge terms with truncation, the 2000 cutoff, the candidate test, the random pick, the amount, and the jitter only on a candidate stack (the fallback is not jittered, as in the donor). It omits: the `special` flag and the AI-value-zero check (the caller must pass filtered creatures), the faction list lookup, `getRandomObject` and pile construction, the two-attempt rebuild and the emergency counter, the placement scoring and road and blocking rules, the `creatureToCount` tier logic, and the C++ integer details beyond flooring each positive result. The index formula `tierIndex` is shown for reference; the caller computes the index. The random source is a function argument.


```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface GuardCandidate { name: string; aiValue: number; avgStack: number; }

// Zone tier and map tier are -1..1 and 2..4 in the donor. Index 0..4 selects the row.
const VALUE1 = [2500, 1500, 1000, 500, 0];
const VALUE2 = [7500, 7500, 7500, 5000, 5000];
const MULT1 = [0.5, 0.75, 1.0, 1.5, 1.5];
const MULT2 = [0.5, 0.75, 1.0, 1.0, 1.5];
const MIN_GUARDED_VALUE = [6500, 4167, 3000, 1833, 1333];
const MIN_GUARD_STRENGTH = 2000;   // config: minGuardStrength

// Index row for a zone tier and a map tier (zone NONE is handled by the caller).
function tierIndex(zoneTier: number, mapTier: number): number {
  return zoneTier + mapTier - 1;
}

// Guard strength for a treasure pile of this value. Two hinge terms are added, so the slope steepens above value2.
function guardStrength(value: number, idx: number): number {
  const s1 = Math.max(0, (value - VALUE1[idx]) * MULT1[idx]);
  const s2 = Math.max(0, (value - VALUE2[idx]) * MULT2[idx]);
  return Math.trunc(s1) + Math.trunc(s2);
}

// A pile needs a guard only if its zone has guards at all and the pile is above the tier threshold.
function needsGuard(value: number, idx: number, zoneHasGuards: boolean): boolean {
  return zoneHasGuards && value > MIN_GUARDED_VALUE[idx];
}

// Pick one creature type whose average stack is weaker than the strength and whose full stack is stronger than it.
// rng returns a float in [0, 1). Returns null when the strength is below the cutoff.
function pickGuard(strength: number, candidates: GuardCandidate[], rng: () => number,
                   fallback: GuardCandidate): { name: string; amount: number } | null {
  if (strength < MIN_GUARD_STRENGTH) return null;
  const fits = candidates.filter(c => c.avgStack * c.aiValue < strength && strength < c.aiValue * 100);
  if (fits.length === 0) {
    return { name: fallback.name, amount: Math.floor(strength / fallback.aiValue) };   // no jitter on the fallback
  }
  const pick = fits[Math.floor(rng() * fits.length)];
  let amount = Math.floor(strength / pick.aiValue);
  if (amount >= 4) amount = Math.floor(amount * (0.75 + 0.5 * rng()));   // +-25 percent jitter
  return { name: pick.name, amount };
}

// Piles per zone: area in tiles times density, divided by 400.
function pileCount(areaTiles: number, density: number): number {
  return Math.floor((areaTiles * density) / 400);
}

// Minimum distance between piles for the tier. totalDensity includes this tier and the richer ones before it.
function minPileDistance(minValue: number, totalDensity: number): number {
  return Math.max(Math.sqrt(Math.min(minValue, 30000) / 10 / totalDensity), 1);
}
```

## 5. Lands in

- TARGET `origins/zones/guard-strength.ts` (new, authoring-time helper, not the server): the tier tables and the strength rule, used to set guard stacks in zone data. Parity-checklist row 23 (zone population) is the closest row. The donor's population is generated once and does not run at play time, so row 23's runtime half (caps, respawn, despawn) is not covered by this donor. Say so in review.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: zones as data (tier rows, densities and the cutoff are zone or config data); one engine (one strength function for every zone); server-verified (the guard stack is computed once and stored as data, not decided by the client)

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism; no donor lines are copied.
- Generation time only. Nothing here caps, respawns or despawns creatures during play. Row 23's runtime rules must come from another donor.
- The curve is a sum of two hinge terms, not a single piecewise function: the slope rises at value1 and again at value2 (ObjectManager.cpp 743-746). Frankendom should write the formula as tested data, not as a picture of a curve.
- The fallback is a hard-coded Azure Dragon (775), although the comment above it says "just pick any available creature" (774). Frankendom should make the fallback a named zone field.
- The jitter does not apply to the fallback (770-776). That may be intended; it is not stated in the donor. Keep the rule and document it.
- A pile whose build fails twice is dropped, and the exit counter grows only when no pile info is produced (995, 1005-1018). The loop has no other exit in the code read, so a zone where every build fails could loop without end. This is read, not run. Frankendom's generator must count failed builds toward its exit.
- Rounding: each hinge term is truncated to int before the sum (743-744), and the amount is an integer division by AI value (769). The sketch floors each term. Frankendom must pick one rounding and test it.
- The zone tier and map tier are added to pick a row (737, 937). Frankendom has no map tier. Zone data should carry its own tier, and a single global tier should not be inferred.
- The zone guard (`zoneGuard = true`) ignores the zone tier and uses only the map tier (737). Gate guards therefore do not scale with the zone tier. Frankendom should decide, not inherit.
- Pile count is a proportion of area (985). A bigger zone gets more piles unless the designer lowers density. Frankendom's zones must state density per tile on purpose.
- Placement is the hard part. `placeAndConnectObject` and `getRandomObject` were not read, so the spacing and road rules here are thin. Treat the placement rules as not verified.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later)
Brief rule served: zones as data; one engine; server-verified (stored as data)
Best transferable idea: A reward's guard strength is a two-term hinge curve of the reward value with a per-tier row, the guard is the creature whose AI value fits that strength, and its count is the strength divided by that AI value.
Decision (proposed): adapt - keep the strength formula, the candidate-fit rule and the count rule as authoring-time data (the tier row is picked by zone data, the fallback is a named field); reject the generator's random placement and its retry loop, which Frankendom does not need at play time.
Acceptance: An authoring test: a pile of value 6000 in a normal zone on a normal map gives strength 5000, a guard is required, the stack amount is 5000 divided by the creature's AI value, jittered to 75 to 125 percent only when the amount is 4 or more, and a pile at or below the tier threshold gets no guard.

## Checker findings

- Verdict: CLEAN
- Corrected: nothing to correct
- Missed: In createTreasures the local 'guarded' result of manager.addGuard (1021-1023) is discarded; the pile is pushed to treasures regardless and guarded state is re-read from rmgObject.isGuarded() at 1032, so a failed addGuard still places an unguarded high-value pile
