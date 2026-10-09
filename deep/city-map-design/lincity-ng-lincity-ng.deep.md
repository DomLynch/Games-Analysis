# lincity-ng-lincity-ng (city-map-design, cell 20)

Donor: /mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/init_game.cpp | Licence: GPL-2.0-or-later per init_game.cpp header (code; data dual GPL/CC-BY-SA per COPYING-data.txt) | C++ | symbol setup_land / create_new_city / setup_river (input line 144 verified: `setup_land`; `create_new_city` at 235, `setup_river` at 754)

## 1. Mechanism

- Builds a new city map once, at new-game time (`create_new_city`, 235-281). Order: place coal reserves (243), pick a mountain value and a climate-dependent aridity (245-261), then build the ground and water by one of two paths, then `setup_land` (270), then set the ore reserve on every tile (271, 303-306), then optional villages (273-274) and the border transport connection (277-278). For every bare tile `setup_land` works out how far it is from water and how high it is above the water table, then gives it a random ground type (desert, bare, three tree kinds, or water) from a score that favours wet, low tiles.
- Inputs: the city settings (with-village, without-trees), the map size, a climate choice (0 to 3), and the random generator. Climate sets the aridity value (wetter or drier) and the mountain value.
- Rivers: the old path (`setup_river`, 754-779, then `setup_ground` 820) carves one river from the bottom edge, a 3-tile-wide mouth of 1 + len/18 + rand%(len/8) tiles that forks into two tributaries (`setup_river2`, 781-818, recursive forks while y > 20). The new path (`new_setup_river_ground`, 308-627) first builds a height field by diamond-square with a mountain-scaled random offset that shrinks by 0.7 per level (`fract`, line 351; `Keco` 30, line 356), smooths it twice with a gaussian mask (sigma 3.5, mask size 7), mirrors it so the two lowest borders face the viewer, and picks a sea level (~1/5.3 of the corner heights, capped at a third of the maximum); then `new_setup_river` (629-719) pours a set number of lakes and rivers from random points, following water downhill with a priority queue and a weighted coin for the runner-up, ending at the border or another river, then flattens lake levels by backtracking upstream; finally everything below sea level is flooded (608-616).
- Land: `setup_land` finds distance from water with a first-in-first-out relaxation over the grid. A neighbour takes the current tile's distance plus one and its water level when that gives a lower cost. Cost = (distance squared divided by 5, plus 1) plus aridity plus (altitude minus water level) times 50 over the altitude step.
- Each bare tile (194-219): a random value `rand() % (d2/5 + 1)` plus aridity plus the altitude term gives a score `r`. Before that, when the global aridity is positive, it is cut for tiles near water: to a third if the squared distance is under 5, to two thirds if under 17, unchanged farther out (209-214). River tiles and non-bare tiles are skipped (202-203). `do_rand_ecology` (1000-1113) then maps `r` to a ground type by band with one more random draw: from r >= 300 (mostly desert, rest bare or a tree) down through 160, 80, 40, 0, -40, -80, -120 to wetland below that (water tiles appear only below -40, from the band -80 to -41 down; with the without-trees setting every tree outcome becomes bare). Every tile that is not desert gets the underground-water flag (1110-1112).
- Coal reserves are placed before the ground exists (`coal_reserve_setup`, 283-301: random start cells in the interior, a short random walk adding random coal at each of five steps); ore is set uniformly on every tile after the land (303-306). Villages (`random_start`, 897) and the border transport connection come last.
- Output: the map tiles. Nothing per tick.

## 2. Key functions

- `setup_land`, `/mnt/frankendom-donors/lincity-ng-lincity-ng/src/lincity/init_game.cpp`, lines 144-228. Distance and water-level relaxation (visible tiles only, FIFO deque); then per-tile score and `do_rand_ecology`.
- `create_new_city`, same file, lines 235-281. Climate to aridity and mountain values; river setup; land; reserves; villages.
- `setup_river`, same file, lines 754-779. Old-path river: mouth and forks.
- `new_setup_river`, same file, lines 629-719. New-path lakes and rivers: downhill follow, then level backtrack.
- `setup_river2`, same file, lines 781-818. Random-walk river segment with forks.
- `new_setup_river_ground`, same file, lines 308-627. Diamond-square ground, smoothing, border mirror, rivers, sea flood.
- `do_rand_ecology`, same file, lines 1000-1113. Score band to ground type.
- `coal_reserve_setup` / `ore_reserve_setup`, same file, lines 283-301 / 303-306.
- `setup_ground` (old path, from 820) and `random_start` (897) were not read in full.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Distance-to-water by relaxation from all water tiles, cost mixes distance and altitude | Distance squared over 5 plus one (theirs, lines 180, 182, 216); altitude times 50 over the altitude step (theirs, lines 181, 183, 217); initial dry-tile distance 50 and water level three quarters of altitude (lines 165-166) |
| Random value below a bound grows with distance, then offsets by altitude and aridity decides ecology | Aridity ranges per climate: -150 to 299, 200 to 399, 0 to 199, -200 to -1 (theirs, lines 249-258); the ecology bands 300, 160, 80, 40, 0, -40, -80, -120 (lines 1002-1082) |
| Follow a surface downhill with a priority queue and a weighted coin, then flatten lake levels backwards | Lake count: (100 minus aridity / 4) times (5 plus a binomial draw of 10 at 0.5) times map area over 1,000,000 (theirs, lines 630-631) |
| Mountain value drawn from a range, divided for swamps | 100 to 399 for mountainity (line 245); divided by 5 for swamp (line 259) (theirs) |

## 4. TypeScript sketch

simplified: the sketch covers only the water-distance relaxation and the score. It omits the visible-tile test, the band table (`do_rand_ecology`) and everything after the score, the two ground generators (diamond-square and rivers), the lake backtracking, the sea flood, the reserves, villages and transport. In `spreadWater` the dry-cell initial level uses `Math.trunc(alt * 0.75)` where the donor computes `3 * alt / 4` in integers (the same for non-negative altitudes), and the initial distance is passed as `farStart` (the donor uses 50). `ecologyScore` damps aridity exactly as the donor does but draws with `Math.floor(unit() * bound)` in place of `rand() % bound`.

```ts
// Licence: GPL-2.0-or-later (code; data dual GPL/CC-BY-SA) - clean-room sketch of the algorithm (restructured: helper functions, table-driven damping), no lines translated.
// Idea: every tile gets a "distance to water" and a "reference water level"; the nearest-looking source wins by a
// blended cost of distance and height. A random draw then turns that into an ecology score per bare tile.

interface Tuning { aridity: number; altStep: number; farStart: number; }
interface Terrain { size: number; isWater: Uint8Array; altitude: Int32Array; waterAlt: Int32Array; }

// Blend of horizontal distance and height above the reference level; lower means wetter.
const wetness = (d: number, alt: number, level: number, t: Tuning): number =>
  Math.trunc((d * d) / 5) + 1 + t.aridity + Math.trunc(((alt - level) * 50) / t.altStep);

export function spreadWater(tr: Terrain, t: Tuning): { dist: Int32Array; level: Int32Array } {
  const n = tr.size;
  const dist = new Int32Array(n * n).fill(t.farStart);
  const level = new Int32Array(n * n);
  const work: number[] = [];                       // grows as cells improve; read with a moving head
  for (let i = 0; i < n * n; i++) {
    if (tr.isWater[i]) { dist[i] = 0; level[i] = tr.waterAlt[i]; work.push(i); }
    else level[i] = Math.trunc(tr.altitude[i] * 0.75);   // dry cells start from a fraction of their own height
  }
  const around = (i: number): number[] => {
    const x = i % n, y = (i - x) / n, out: number[] = [];
    if (x > 0) out.push(i - 1);
    if (y > 0) out.push(i - n);
    if (x < n - 1) out.push(i + 1);
    if (y < n - 1) out.push(i + n);
    return out;
  };
  for (let head = 0; head < work.length; head++) {
    const here = work[head];
    for (const nb of around(here)) {
      const offer = wetness(dist[here] + 1, tr.altitude[nb], level[here], t);
      const current = wetness(dist[nb], tr.altitude[nb], level[nb], t);
      if (offer >= current) continue;
      dist[nb] = dist[here] + 1;
      level[nb] = level[here];
      work.push(nb);
    }
  }
  return { dist, level };
}

// Near water the dryness is damped (only when aridity is positive): [squared-distance limit, numerator, denominator].
const DAMPING: Array<[number, number, number]> = [[5, 1, 3], [17, 2, 3]];

export function ecologyScore(d: number, alt: number, level: number, t: Tuning, unit: () => number): number {
  const d2 = d * d;
  let arid = t.aridity;
  if (arid > 0) {
    const hit = DAMPING.find(([limit]) => d2 < limit);
    if (hit) arid = Math.trunc((arid * hit[1]) / hit[2]);
  }
  const bound = Math.trunc(d2 / 5) + 1;
  return Math.floor(unit() * bound) + arid + Math.trunc(((alt - level) * 50) / t.altStep);
}
```

## 5. Lands in

- Frankendom target: `origins/world/relief.ts` is the existing seeded ground-height function (hills as seeded warped fbm, flat pads that blend back, no `Math.random`); this donor's relevant part is the wetness score that would drive a zone's ground cover (trees, bare, water) on top of that relief: a NEW `origins/world/ecology.ts` (does not exist today), with its band table as data in the zone schema (`origins/world/schema.ts` has a `density` group for npcs, props and creatures, and a seed per zone). Files on the VPS snapshot /root/work-k7 (not main); headers and the `origins/world/README.md` read only.
- Parity-checklist row: none of rows 1 to 22. Feature-map section: zones as data and brief rules 4 and 10 (zone copies with seeding), `docs/specs/zone-runtime.md`.
- Reuse tag: rewrite-from-idea (licence GPL-2.0 for code, data CC-BY-SA; clean-room sketch only).
- Brief rule served: (category default, not per-cell) 4 (zones are data); rules 7-9 n/a

## 6. Gaps and risks

- RNG: the donor uses the C library `rand()` for the climate, mountain value, coal, the old river mouth (759, 766), the diamond-square offsets and `setup_land` itself, and a separate generator (`BasicUrbg`) for the new river path and for the old path's tributaries (630, 638, 674, 782, 790). Neither is seeded per zone copy; Frankendom must use one seeded generator (rule 10), as `relief.ts` and `generate.ts` already do.
- The donor's relaxation uses a FIFO queue (a deque) and relaxes by cost, so a tile can be re-queued; it does not guarantee the exact shortest distance in one pass. Frankendom should decide whether that is acceptable.
- Climate values and ecology bands are donor constants (249-258, 1002-1082). Frankendom zones need them as data with defaults.
- Villages, reserves and transport connections are a city-builder layer; Frankendom's zones need only the terrain part.
- Server-verified: the ground and cover of a zone copy must be generated from a server-held seed, and any gameplay effect (cover, water) must be checked against the same function on the server; a client-side map is only a view.
- Pit is a client only; MAX_ATTACKERS = 3 and one engine are unaffected.
- The sketch's distance pass is a donor-shaped approximation written from the mechanism. It is not a translation.
- Not read: `setup_ground` (old path), `random_start`, `MapTile::setTerrain`, `connect_transport`, `desert_water_frontiers`.
