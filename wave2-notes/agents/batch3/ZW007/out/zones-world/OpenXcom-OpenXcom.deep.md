# OpenXcom-OpenXcom (zones-world, cell 1)

Donor: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Savegame/AlienMission.cpp` (with `src/Mod/RuleRegion.cpp`, `src/Mod/UfoTrajectory.h`, `src/Savegame/AlienStrategy.cpp`, `src/Savegame/WeightedOptions.cpp`, `src/Geoscape/GeoscapeState.cpp`) | Licence: GPL-3.0 (LICENSE.txt "Version 3, 29 June 2007"; source headers, e.g. `src/Mod/RuleRegion.h` lines 9-10, say "version 3 of the License, or (at your option) any later version") | C++ | symbols `AlienMission::think`, `AlienMission::getLandPoint`, `AlienMission::getWaypoint`, `RuleRegion::getRandomPoint`, `AlienStrategy::chooseRandomRegion`

Checked: Read in full: `RuleRegion::getRandomPoint` (171-196), `AlienMission::think` (162-263), `AlienMission::start` (383-397), `AlienMission::getWaypoint` (738-761), `AlienMission::getLandPoint` (771-802), `AlienMission::ufoShotDown` (538-555), `AlienMission::ufoReachedWaypoint` (422-470), `GeoscapeState::time30Minutes` (1231-1240), `AlienStrategy` chooseRandomRegion / chooseRandomMission / removeMission (112-170), `WeightedOptions::choose` (31-47), and the mission builder's start path at `GeoscapeState.cpp` 2560-2600 and 2645-2662. Not read: `GeoscapeState.cpp` 2600-2645 (the middle of the mission builder), `AlienMission::ufoReachedWaypoint` 470-537 (after the landed branch), `Ufo.cpp`, `BattlescapeGenerator.cpp` (battle maps). Callers checked: `getWaypoint` (from `spawnUfo` at 366 and 376, and from `ufoReachedWaypoint` at 445); `getLandPoint` (from `spawnUfo` and from `getWaypoint` at 758); `ufoShotDown` has one caller (`DogfightState.cpp:1055`); `ufoReachedWaypoint` has one caller (`GeoscapeState.cpp:720`); `chooseRandomRegion` and `chooseRandomMission` have one caller each (GeoscapeState 2571 and 2597). The weighted-draw bias was checked by replaying the donor's exact loop in Python (`work/xcom_choose_bias.py`). Confidence: high for the sampling, land-check, countdown and weighted-draw mechanisms; medium for the full mission-start path (2600-2645 not read). camera_scope: n/a (zones-world topic). Zone streaming: none found in the geoscape code; the whole globe is one resident object.

## 1. Mechanism

- A mission zone is a list of rectangles on the globe. Each rectangle has longitude/latitude min and max, a texture id and an optional name. A rectangle with zero size and a name is a city (`src/Mod/RuleRegion.h` 35 and 51; `RuleRegion::getCities`, which builds the city list from point-sized named areas).
- Sampling a point in a zone (`RuleRegion::getRandomPoint`): pick one rectangle index uniformly by count (`RuleRegion.cpp` 175), then draw longitude and latitude uniformly inside that rectangle (190-191). Rectangle size is ignored, so a tiny rectangle has the same chance as a huge one. A rectangle whose min is greater than its max is flipped before drawing.
- Membership (`RuleRegion::insideRegion`): a rectangle whose longitude min is greater than its max wraps across the 0 / 2π seam (`RuleRegion.cpp` 107-110).
- Land check (`AlienMission::getLandPoint`, 771-802): if the zone's first area is a point (a city), the sampled point is used as it is. Otherwise the sampler redraws until the point is on land and inside the region, with at most 100 tries (794). After 100 failed tries the last sample is kept and a debug log line says the UFO is "forced to land on water" (798). The land check is applied only when the leg after the current waypoint is a ground leg (`getWaypoint`, 756-758).
- Routes are data. A `UfoTrajectory` is a sequence of waypoints, each holding a zone index, an altitude index (turned into a name such as STR_GROUND by `getAltitude`) and a speed percentage (`src/Mod/UfoTrajectory.h` 45 and the `TrajectoryWaypoint` struct above it). The zone sequence is the route through the world, so "transitions between zones" are authored as data.
- Choosing the next destination (`AlienMission::getWaypoint`, 738-761): normally a plain zone sample (760). A special case for objective waves sends the craft to the min corner (lonMin, latMin) of the chosen mission-site rectangle (`_missionSiteZone`) when the leg is in the spawn zone; that branch is not described further here.
- Arrival (`AlienMission::ufoReachedWaypoint`, 422-470): if there is no next waypoint the UFO is marked destroyed (status set, then `return`; what removes it later was not read). Otherwise the trajectory index is advanced (443), the next destination is picked with `getWaypoint` (445), and in the air the speed is set from the next waypoint's percentage.
- Spawn cadence (`AlienMission::think`, 162-263): called once per 30 game minutes by `GeoscapeState::time30Minutes` (1231, and the `callThink` call at 1236). If the countdown is above 30 it is reduced by 30 and the function returns (168-171). Otherwise the next UFO of the current wave is spawned (175) and the wave counter moves on. The next countdown is set from the next wave's spacing: `(spawnTimer/2 + RNG::generate(0, spawnTimer)) * 30` (261), where `spawnTimer` is the wave's spacing divided by 30. The first countdown when a mission starts is set the same way (391 in `start`), unless an initial count is passed in.
- Wave pacing after a kill: `ufoShotDown` (538-555), for a destroyed or crashed UFO and not the last wave, adds `30 * (RNG::generate(0, 400) + 48)` minutes to the countdown (551). That is 1440 to 13440 minutes, about 1 to 9.3 game days. The only caller is `DogfightState.cpp:1055`, a client UI state.
- Mission choice (`GeoscapeState` mission builder, 2571 and 2597): the region is drawn from `AlienStrategy::chooseRandomRegion`, whose starting weights are the regions' weights from the ruleset (`AlienStrategy.cpp` 61). The mission type is drawn from that region's weighted list (`chooseRandomMission`). When the mission command has `UseTable` set, the chosen mission is removed from the region's list (`removeMission`, 2653-2655; `AlienStrategy.cpp` 163). A region whose list is empty gets its region weight set to 0 (167). When all regions are empty the whole table is rebuilt from the ruleset (`chooseRandomRegion`, 131-134). So the table is a bag drawn without replacement and refilled when empty.
- Weighted draw (`WeightedOptions::choose`, 31-47): returns "" if the total weight is 0 (33). Otherwise it draws `RNG::generate(0, _totalWeight)` (37), which is inclusive at both ends (`RNG.h` 39), and walks the options in map (sorted id) order. Because the draw has total+1 values, the first option in map order gets one extra slot. Replayed exactly: weights 1 and 1 give 2/3 and 1/3, not 1/2 and 1/2; weights 10 and 10 give 11/21 and 10/21. Weights 1 to 1 to 1 to 1 give 2/5 for the first id and 1/5 for each other.

## 2. Key functions

- `RuleRegion::getRandomPoint`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Mod/RuleRegion.cpp` 171-196. Two-stage pick: rectangle index uniform by count, then uniform lon and lat in it.
- `AlienMission::getLandPoint`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Savegame/AlienMission.cpp` 771-802. Bounded rejection sampling (100 tries), then a kept water point with a log.
- `AlienMission::getWaypoint`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Savegame/AlienMission.cpp` 738-761. Chooses between plain zone sample and land-checked sample, based on the next leg's altitude.
- `AlienMission::think`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Savegame/AlienMission.cpp` 162-263. Half-hour countdown; spawns when the countdown is at most 30; resets the countdown from the next wave's spacing.
- `AlienMission::ufoShotDown`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Savegame/AlienMission.cpp` 538-555. Adds a 1-to-9.3-day delay to the next wave for a destroyed UFO.
- `AlienStrategy::chooseRandomRegion` / `removeMission`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Savegame/AlienStrategy.cpp` 119-170. Bag draw with removal and full refill.
- `WeightedOptions::choose`: `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Savegame/WeightedOptions.cpp` 31-47. The inclusive draw that gives the first option an extra slot.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Zone = list of rectangles; point = rectangle picked uniformly by count, then uniform inside it | Rectangle size ignored (theirs, `RuleRegion.cpp` 175) |
| Bounded resample for a valid spot, then keep the last sample and log | 100 tries (theirs, `AlienMission.cpp` 794); a city (point zone) skips the check (mechanism, 780-782) |
| Route = ordered list of zone ids with speed and altitude per leg | Zone list and speed percentages are YAML data (theirs, `UfoTrajectory.h` 45) |
| Half-hour countdown: subtract 30, fire at 30 or less | 30 minutes per tick (theirs, `AlienMission.cpp` 168-170; called from `GeoscapeState.cpp` 1231) |
| Next spacing jittered around the nominal spacing | `(S/2 + rand(0..S)) * 30` with S = spacing/30 (theirs, `AlienMission.cpp` 391). The header comment says "spawnTimer/4 or 3*spawnTimer/4" (`RuleAlienMission.h` 50); the code gives about 0.5x to 1.5x. The code is what runs. |
| Pause the next wave after a kill | `30 * (rand(0..400) + 48)` minutes (theirs, `AlienMission.cpp` 551) |
| Weighted bag drawn without replacement, refilled when empty | Weights come from the ruleset (theirs, `AlienStrategy.cpp` 61) |
| Weighted pick | Inclusive draw 0..total gives the first option an extra slot (theirs, `WeightedOptions.cpp` 37; replayed, see section 1) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for a route leg (land check only when the next leg is ground, bounded to 100 tries, last sample kept on failure), the two-stage zone pick, the 30-minute countdown tick, the first countdown, the shot-down delay and the weighted pick. It omits: the objective mission-site branch in `getWaypoint`; the last-wave check in `ufoShotDown`; the countdown reset after a spawn (the donor sets it from the next wave); the city shortcut; the water log line; the altitude and landed states; the speed percentage; the wrap-around membership test; and the infiltration and base paths. It reorders nothing, but it replaces the donor's inclusive weighted draw with a half-open one on purpose (see the comment on `pickWeighted`), so it does not reproduce the donor's bias.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Rect { lonMin: number; lonMax: number; latMin: number; latMax: number; }
export type Rand = (min: number, max: number) => number;     // continuous uniform, [min, max]
export type RandInt = (min: number, max: number) => number;  // integer, inclusive at both ends
export interface RouteLeg { zone: Rect[]; ground: boolean; speedPct: number; }

// Two-stage zone pick: a rectangle chosen uniformly by COUNT (not by area), then a uniform point inside it.
export function pickPointInZone(zone: Rect[], rndInt: RandInt, rnd: Rand): [number, number] {
  const r = zone[rndInt(0, zone.length - 1)];
  return [rnd(r.lonMin, r.lonMax), rnd(r.latMin, r.latMax)];
}

// Bounded rejection sampling. After maxTries the last sample is kept even if it fails ok(), and fellBack is set.
export function pickValidPoint(zone: Rect[], ok: (lon: number, lat: number) => boolean,
                               rndInt: RandInt, rnd: Rand, maxTries = 100): { point: [number, number]; fellBack: boolean } {
  let p = pickPointInZone(zone, rndInt, rnd);
  let tries = 1;
  while (!ok(p[0], p[1]) && tries < maxTries) {
    p = pickPointInZone(zone, rndInt, rnd);
    tries++;
  }
  return { point: p, fellBack: !ok(p[0], p[1]) };
}

// Next destination on a route of zones. Returns null when the route is finished (the donor destroys the UFO).
export function nextDestination(route: RouteLeg[], next: number, ok: (lon: number, lat: number) => boolean,
                                rndInt: RandInt, rnd: Rand): { point: [number, number]; fellBack: boolean } | null {
  if (next >= route.length) return null;
  const leg = route[next];
  const landCheck = next + 1 < route.length && route[next + 1].ground;
  if (landCheck) return pickValidPoint(leg.zone, ok, rndInt, rnd);
  return { point: pickPointInZone(leg.zone, rndInt, rnd), fellBack: false };
}

// Wave clock in game minutes. spawnTimerMin is the wave's nominal spacing (zone or mission data).
// The countdown is jittered over floor(S/2) .. floor(S/2)+S thirty-minute units, S = spawnTimerMin/30 (about 0.5x to 1.5x of the spacing).
export function startWaveCountdown(spawnTimerMin: number, rndInt: RandInt): number {
  const units = Math.floor(spawnTimerMin / 30);
  return (Math.floor(units / 2) + rndInt(0, units)) * 30;
}

// Called once per 30 game minutes. Fires when the countdown is already at or below 30.
export function tickWave(countdown: number): { countdown: number; fire: boolean } {
  if (countdown > 30) return { countdown: countdown - 30, fire: false };
  return { countdown, fire: true };
}

// A shot-down wave pushes the next spawn out by 30 * (rndInt(0, 400) + 48) minutes.
export function onWaveShotDown(countdown: number, rndInt: RandInt): number {
  return countdown + 30 * (rndInt(0, 400) + 48);
}

// Weighted pick with a half-open draw [0, total). The donor draws the inclusive range [0, total],
// which gives the first id in its map order one extra slot; this version does not copy that.
export function pickWeighted(items: [string, number][], rndInt: RandInt): string {
  const total = items.reduce((s, [, w]) => s + w, 0);
  if (total === 0) return "";
  let v = rndInt(0, total - 1);
  for (const [id, w] of items) {
    if (v < w) return id;
    v -= w;
  }
  return items[items.length - 1][0];
}

export {};
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (engine spawn logic; zone rectangles, routes, spacing and counts as zone data): zone sampling with a bounded land or walkable check, route-through-zones patrols, and the wave countdown. Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). The 30-minute tick is not the server tick: the server tick has its own sub-line (row 18 / post-K item 3, "server tick: fixed step, input intake, per-tick NPC budget"), which this donor does not supply.
- today: Frankendom's current spawn file was not read in this pass.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: zones as data on one runtime; server-verified kills (the wave pause must come from a verified kill, not a client call); parity row 23

Best transferable idea: Describe a zone as a list of rectangles and a route as an ordered list of zone ids, pick spawn points by choosing a rectangle uniformly by count and then a point inside it, and retry a bounded number of times for a valid spot.
Decision (proposed): adapt - take the zone-as-rectangles data and the route-through-zones shape, but not the 30-minute geoscape clock or the kill-triggered wave pause as a client call (kills are server-verified, so the server applies the pause).
Acceptance: A server test with one zone of two rectangles of very different sizes draws each rectangle about 50% of the time over 10,000 draws (count-based, as the donor does), a roaming group visits zones in the order listed in its data, and a spawn that fails 100 valid-spot tries is either skipped or clamped by one stated rule, never placed silently on an invalid cell.

## 6. Gaps and risks

- The donor calls `ufoShotDown` from `DogfightState.cpp:1055`, a client UI state. Frankendom's kills are server-verified, so the wave pause must be applied by the server on a verified kill. Do not port the client call.
- Donor cadence is a geoscape clock of 30 game minutes. A fight-speed zone runs on the server tick. Do not carry the minute values over as seconds; re-state them as zone data in the server's own unit.
- The donor's header comment for the spacing jitter (`RuleAlienMission.h` 50) disagrees with the code. Pin the code's behaviour with a test before copying the numbers.
- The weighted draw has the off-by-one described in section 1 (`WeightedOptions.cpp` 37). Copying the function copies the bias. Add a frequency test (for example 10,000 draws over weights 1 and 1 should be near 50/50).
- The area pick ignores rectangle size (`RuleRegion.cpp` 175). Decide on purpose: count-uniform for "pick a sub-area", or area-weighted for "spawn density". The donor does not choose for you.
- The land sampler keeps a water point after 100 tries and only logs it (`AlienMission.cpp` 794-798). Frankendom needs one rule: skip the spawn, or clamp to a valid cell, and never place an enemy on an invalid cell silently.
- Random draws use a single shared global RNG (`RNG::generate`). For server-verified fights the server needs its own seeded stream so a fight can be replayed.
- No zone streaming was found in the geoscape code; the whole globe is one resident object. The donor's closest zone-layout code is the battle map generator (`BattlescapeGenerator.cpp`), which was not read in this pass.
- The bag refill (`AlienStrategy.cpp` 131-134) rebuilds the whole table when every region is empty. Frankendom needs an explicit refill rule for per-zone spawn tables rather than an implicit one.
- Nothing in this mechanism covers many-on-one targeting (no hate list, no MAX_ATTACKERS-style cap).
