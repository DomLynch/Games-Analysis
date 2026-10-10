# gemrb-gemrb (zones-world, cell 7)

Donor: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/WorldMap.cpp` | Licence: GPL-2.0-or-later (SPDX header, WorldMap.cpp line 3; repo COPYING is GPL v2) | C++ | symbol `WorldMap::GetEncounterLink`

Checked: `WorldMap::CalculateDistances` (248-316), `WorldMap::GetEncounterLink` (361-396), `WorldMap::SetEncounterArea` (401-463), `WorldMap::ClearEncounterArea` (465-482), `UpdateAreaVisibility` (492-511), `UpdateReachableAreas` (520-541), the script-side caller `GemRB_WorldMap_GetDestinationArea` (GUIScript.cpp 2849-2929), `Game::RandomEncounter` (Game.cpp 2442-2454), and the script actions `ForceRandomEncounter` (Actions.cpp 7795-) and `SetEncounterProbability` (6437-, the write at 6448). All read in full except where noted in section 6. Callers: `GetEncounterLink` has one caller (GUIScript.cpp:2871); `CalculateDistances` has two (WorldMapControl.cpp:43 and :49); `SetEncounterArea` has three (Actions.cpp:7807, GUIScript.cpp:2905 and :2921). Confidence: high for the trip-interruption path (route, per-leg roll, midpoint placement). Not read: the ambush area files and their monster spawns, the RAND implementation, the ADIRF_CENTER value. camera_scope: n/a (not a camera topic).

## 1. Mechanism

- The world map is a graph of zones (WMP entries). Each directed link between two zones is a leg with a cost (`DistanceScale * 4`), an encounter chance (0-100), and five ambush-zone slots (`EncounterAreaResRef[5]`). The WMP file supplies these per link (WMPImporter.cpp 173, 178; WorldMap.h 96-99).
- Route search (`CalculateDistances`, 248-316). Runs when the map opens and when the player moves the travel target (WorldMapControl.cpp 43, 49). It is a label-correcting search from the current zone, not a timed loop: `pending` is a list; a zone is pushed again whenever its distance improves (308). Only walkable neighbours relax (301), and only the first link to each neighbour from a zone is considered (295). Start zone is 0 (268).
- Trip interruption (`GetEncounterLink`, 361-396). Called for every query (GUIScript.cpp:2871), preview included; the roll inside it runs every time, and the caller acts on the result only when `eval` is set (2880). It walks the stored route from the target back to the start (371-374), then rolls the legs in travel order, starting at the start side (384). Each leg fires when `EncounterChance > RAND(0,99)` (389). The first leg that fires sets `encounter` and stops (390). If none fires, the function still returns the last leg (395) with `encounter` false.
- Caller decision (`GemRB_WorldMap_GetDestinationArea`, GUIScript.cpp 2849-2929). The `eval` argument is parsed at 2851-2852. With it off, the caller returns target, entrance and distance and chooses no ambush. With it on: clear the previous temporary ambush (2885); if the roll fired, check a chance of 100 or more and take 100 off the stored link (2893-2894); then try a bounty ambush first (2900); if not, pick one of the five slots from a random start index `RAND(0,4)` (2908), wrap over five, skip empty and the current area (2911-2913). The chosen zone is entered with entrance empty and direction `ADIRF_CENTER` (2918), so the player arrives in the middle.
- Ambush placement (`SetEncounterArea`, 401-463). Adds a temporary zone at the midpoint of the interrupted leg (432). It splits that leg into two links with half the cost (445, 449) and zero chance (446, 450), flags the new zone visible, accessible and visited (422), and records its index (461). If the zone already exists on the map it returns at once (403). `ClearEncounterArea` (465-482) removes it again on the next evaluation (479-480).
- Distance reported to the GUI: the total cost to the leg's far end minus half that leg (2904, 2920). That is the cost to the midpoint, which is where the ambush happens.
- Reachability: `UpdateReachableAreas` (520-541) turns zones visible, adjacent and accessible when a global flag from the `worlde` table is set (535, 537). `UpdateAreaVisibility` (492-511) reveals neighbours of the zone just reached (506-508).
- Bounty ambush (`Game::RandomEncounter`, Game.cpp 2442-2454): picks a row by reputation divided by ten (2447-2448), rolls `RAND(1,100)` against the row value (2449), and names the ambush zone as the first four characters of the destination plus "10" (2452), which must exist as an area file (2453). Tried before the five-slot list.

## 2. Key functions

- `WorldMap::CalculateDistances`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/WorldMap.cpp` 248-316. Route costs, first-link rule, walkable filter.
- `WorldMap::GetEncounterLink`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/WorldMap.cpp` 361-396. Path rebuild, per-leg roll, first hit wins, returns the leg.
- `WorldMap::SetEncounterArea` and `ClearEncounterArea`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/WorldMap.cpp` 401-463 and 465-482. Midpoint zone with split links, then removal.
- `GemRB_WorldMap_GetDestinationArea` (the only roll-and-choose caller): `/mnt/frankendom-donors/gemrb-gemrb/gemrb/plugins/GUIScript/GUIScript.cpp` 2849-2929. Bounty, then five-slot pick, then placement.
- `Game::RandomEncounter`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Game.cpp` 2442-2454. Reputation-keyed bounty roll.
- `GameScript::SetEncounterProbability` and `GameScript::ForceRandomEncounter`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/GameScript/Actions.cpp` 6437-6449 and 7795-7809. Scripts set a leg chance or force an ambush on a leg.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Route cost per leg, cheapest path from the current zone | Cost per leg = DistanceScale x 4 (theirs, WorldMap.cpp 303) |
| One roll per leg, in travel order, first hit stops the trip | Fires when chance > RAND 0..99 (theirs, WorldMap.cpp 389); a chance of 100 or more always fires |
| Interruption placed at the leg midpoint | Halves cost DistanceScale/2 and chance 0 (theirs, WorldMap.cpp 445-450); reported cost is the far end minus cost/2 (theirs, GUIScript.cpp 2904) |
| Pick one of five ambush zones from a random start, wrap, skip empty and current | Five slots (theirs, WorldMap.h 98); start RAND(0,4) (theirs, GUIScript.cpp 2908) |
| Bounty ambush keyed to a reputation band | Reputation / 10 row (theirs, Game.cpp 2447); roll RAND(1,100) against row value (theirs, Game.cpp 2449); name = 4 chars + "10" (theirs, Game.cpp 2452) |
| Stored chance above 100 | Take 100 off after the roll (theirs, GUIScript.cpp 2893-2894) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: plan the cheapest route, roll each leg in travel order from the start, stop at the first hit, pick an ambush zone from five slots (random start, wrap, skip empty and current), and report the cost at the midpoint of the interrupted leg. It omits the bounty branch (reputation table and the four-letter name rule), the walkable filter, the temporary midpoint zone and its split links (it reports a cost instead of inserting links), the 100-plus chance subtraction, the eval/preview split, the visibility and reachability flags, and the donor's `pending` list details beyond a plain queue.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type ZoneId = string;

interface Leg {
  from: ZoneId;
  to: ZoneId;
  cost: number;                      // route cost of this leg
  encounterPct: number;              // 0..100 chance that travel on this leg is interrupted
  ambushSlots: (ZoneId | null)[];    // 5 ambush zone slots, null = empty
}

type Graph = Map<ZoneId, Leg[]>;
type Rng = (lo: number, hi: number) => number; // inclusive bounds

interface Plan {
  dist: Map<ZoneId, number>;
  via: Map<ZoneId, Leg>;             // the leg that reached each zone on its best known path
}

// Label-correcting search. Only the first leg to each neighbour from a zone is considered.
function plan(g: Graph, start: ZoneId): Plan {
  const dist = new Map<ZoneId, number>([[start, 0]]);
  const via = new Map<ZoneId, Leg>();
  const pending: ZoneId[] = [start];
  while (pending.length > 0) {
    const here = pending.shift() as ZoneId;
    const seen = new Set<ZoneId>();
    for (const leg of g.get(here) ?? []) {
      if (seen.has(leg.to)) continue;
      seen.add(leg.to);
      const candidate = (dist.get(here) ?? 0) + leg.cost;
      if (candidate < (dist.get(leg.to) ?? Infinity)) {
        dist.set(leg.to, candidate);
        via.set(leg.to, leg);
        pending.push(leg.to);
      }
    }
  }
  return { dist, via };
}

// Legs from start to target, in travel order. Empty if target is the start or unreachable.
function legsTo(p: Plan, start: ZoneId, target: ZoneId): Leg[] {
  const legs: Leg[] = [];
  let at = target;
  while (at !== start && p.via.has(at)) {
    const leg = p.via.get(at) as Leg;
    legs.unshift(leg);
    at = leg.from;
  }
  return at === start ? legs : [];
}

export interface TravelResult {
  reached: ZoneId;          // where the player ends up
  ambushZone?: ZoneId;      // set when an interruption happened
  ambushAtCost?: number;    // route cost at which the interruption happens (half the leg cost before its far end)
}

// Walk the legs in order; the first leg whose roll succeeds interrupts the trip.
// The roll is encounterPct > rng(0, 99), as in the donor (a value of 100 always fires).
export function travel(g: Graph, start: ZoneId, target: ZoneId, currentZone: ZoneId, rng: Rng): TravelResult {
  const p = plan(g, start);
  const legs = legsTo(p, start, target);
  for (const leg of legs) {
    if (leg.encounterPct <= rng(0, 99)) continue;
    // pick an ambush zone: random start slot, wrap over 5, skip empty and the current zone
    const first = rng(0, 4);
    for (let j = 0; j < 5; j++) {
      const zone = leg.ambushSlots[(first + j) % 5];
      if (zone && zone !== currentZone) {
        // the ambush sits at the middle of the leg: cost to far end minus half the leg
        const atCost = (p.dist.get(leg.to) ?? 0) - Math.floor(leg.cost / 2);
        return { reached: zone, ambushZone: zone, ambushAtCost: atCost };
      }
    }
    return { reached: target }; // fired, but no usable ambush zone: the trip completes
  }
  return { reached: target };
}

export {};
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population: the ambush is a zone-level encounter spawned by a trip, rolled on the server). Parity-checklist row 23 (zone population). Closest fit only: row 23 covers caps, respawn and despawn, and a per-trip interruption roll is not one of those. No row 1-22 fits better.
- today: not checked. I did not open the Frankendom repo, so I do not know whether it already has a zone-to-zone travel roll. The brief's rulings name `origins/server/world-spawns.ts` as the zone spawn logic, and that is where this would sit.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: zones as data on one runtime (the five slots and chance are zone data); server-verified outcomes (the roll and the ambush zone are decided by the server, not the client)

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not translated.
- Authority: the donor rolls with a global RAND in a single-player program. Frankendom must roll on the server and record the chosen ambush zone and cost in its one ledger, or the client can pick its own outcome.
- Mutable state: the donor's >= 100 step (GUIScript.cpp 2893-2894) writes into the stored link, so a later trip over that link sees a changed chance. Frankendom must keep chance as read-only zone data.
- Pointer hazard: `GetEncounterLink` returns a pointer into `area_links` (a vector, WorldMap.h 126). `AddAreaLink` can reallocate it (WorldMap.cpp 94-97, 453-454). The donor reads the link fields before `SetEncounterArea` (GUIScript.cpp 2904 before 2905) by hand. Frankendom should return zone ids, not pointers.
- Temporary zone: the donor inserts a real map entry for the ambush and removes it later. The sketch returns a cost instead. Frankendom should not add a map node for a single trip unless it needs one.
- Frankendom's rulings describe zones, not an overworld route. If zones only connect through portals, this mechanism does not apply and the decision is reject.
- Not read: the ambush area files and their spawns (the donor's ARE files), the RAND function, the ADIRF_CENTER value, area loading and streaming (Map.cpp, Game area change). Their role in streaming is not claimed here.

Best transferable idea: Roll the encounter once per leg of a trip, in travel order, stop at the first hit, and place the ambush at the midpoint of that leg from a five-slot zone list.
Decision (proposed): adapt - only if Frankendom gains zone-to-zone routes; the per-leg roll and first-hit order transfer, but the roll must be server-side and recorded in the one ledger, and the donor's global RAND and mutable link chance do not.
Acceptance: a server test: on a three-leg route with chances 0, 100, 0 the trip stops at the midpoint of leg 2 in a data-slot zone; with all chances 0 the trip reaches the target; a 100 chance with all five slots empty completes with no ambush.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: zones as data on one runtime; server-verified outcomes
