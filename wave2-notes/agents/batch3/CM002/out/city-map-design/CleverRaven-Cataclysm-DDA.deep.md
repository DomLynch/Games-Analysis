# CleverRaven-Cataclysm-DDA (city-map-design, cell 1)

Donor: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/overmap_city.cpp` | Licence: CC-BY-SA 3.0 (`LICENSE.txt` line 1: "Cataclysm is licensed under the Creative Commons Attribution-ShareAlike 3.0 Unported License") | C++ | symbols `overmap::place_cities`, `overmap::build_cities`, `overmap::build_city_street`, `overmap::place_building`, `overmap::pick_random_building_to_place`

Checked: Hint file `src/panels.h` was not opened (UI panel header by name; not the generator). Read in full or in the ranges cited: `overmap_city.cpp` 36-58, 65-240, 235-305, 306-381 (`lay_out_street`), 384-460 (`build_city_street`), 516-559 (flood fill); `overmap.cpp` 986-1000 (call order), 2559-2645 (`build_connection`), 2658-2735 (`connect_closest_points`), 2874-2876 (`turn_random`), 2967-3035 (`can_place_special`), 2205-2222 (inter-city road caller); `regional_settings.h` 45-85; `rng.cpp` 80-87; data `regional_map_settings.json` 363-370. Callers checked by grep: `place_cities` and `build_cities` run from `overmap.cpp` 991 and 997 (only when `settings->city_spec`); `build_city_street` is called only from `build_cities` and itself; `place_building` only from `build_city_street`. Not read: `place_special` body (`overmap.cpp` 3036 onward), the building bin contents, the highway branch of `lay_out_street`, `weighted_int_list::pick`. Confidence: high on the town grammar (order of steps and the size and ring numbers); medium on the exact tile count of a street (straight_path can add one step when a connection is ahead, see section 6). Camera scope: not applicable.

Best transferable idea: Grow each town from one hub as four arms with side streets at block-sized gaps, and place its services one building at a time by ring distance from the centre, with unique landmarks tracked per town.
Decision (proposed): adapt - the growth grammar and the ring rule suit a build-time zone generator that writes zone data, but the donor's unbounded redraw and silent give-up must be fixed first and the random tile grid dropped.
Acceptance: A player entering a fresh zone with seed S sees the same town on server and client, shops near the centre and houses at the rim, at most one copy of each unique landmark per town, and a server test fails if a catalogue bin with no fitting entry does not return null.

## 1. Mechanism

- Stage 1, seeding (`place_cities`, `overmap_city.cpp` 65-212). In random mode the number of towns per overmap is a roll of (overmap area x 2^-spacing / area per town) (123). Each town takes a random candidate point; candidates within 2 tiles are removed (188-190). The centre tile becomes a four-way road ("every city starts with an intersection", 198). Town size is `rng(size - 1, max)` (173), then a bucket: one in three tiny (x1/3, 174), else one in two small (x2/3), else one in two large (x3/2), else huge (x2) (branches 174-182). The result is clamped to 2..55 (184-185). The donor comments give 33 / 33 / 17 / 17 percent, which matches the odds of these branches.
- Stage 2, arms (`build_cities`, 214-233). For each town a random start direction (222) and four arms, one per cardinal direction, each started from the hub with the town size (229-230). Each town gets its own set of CITY_UNIQUE buildings (226). The flood fill runs after all arms (232).
- Stage 3, one arm (`build_city_street`, 384-460). `lay_out_street` returns a straight path up to size + 1 tiles (343-346 can add one step when a connection is ahead), stopped early by river, ravine, highway, or a tile that would touch two road tiles (313-381). The road is built (401). The walk then runs one step per iteration with `c` counting down from the size (409-410). When `c >= 2` and `c < croad - block_width`, the step spawns a left and a right side street of length `size - rng(1,3)` (415-416; a length of 1 is bumped to 2), and `croad` is set to `c` so the next side street waits for a gap (413-414). The side streets alternate width: a width-2 arm gives its children width `rng(3,5)`, and a wider arm gives its children width 2 (407). At each step, after the side streets, each side places a building with probability 3/4 (439 and 442; `BUILDINGCHANCE` is 4 at line 36).
- Stage 4, end of arm (449-456). `size` shrinks by `rng(1,3)` (449). If the walk ran its full length (`c == 0`, 451), a new arm starts at the far end with a random left or right turn (453; `turn_random` is a coin flip, `overmap.cpp` 2876), and with one in five a second arm goes the other way (455).
- Stage 5, one building at a time (`place_building`, 281-304). The anchor is one tile off the street (284-285). `town_dist` is the trig distance from the town centre to the anchor, as a percent of town size (287). Up to 10 tries (289): pick a building, check its footprint with `can_place_special` (292), place it, add its tiles to the city, and if it is CITY_UNIQUE record it for this town (298-299).
- Stage 6, which bin (`pick_random_building_to_place`, 235-279). `shop_normal = max(shop_radius, normal draw(shop_radius, shop_sigma))` (249-250) and the same for parks with the park radius and sigma (253-254). If `shop_normal > town_dist` the shop bin is used (257); else if `park_normal > town_dist` the park bin (259); else houses. The pick redraws until the entry is not an already-placed unique and its city_size range contains the town size (268-277).
- Stage 7, joining and leftovers. `flood_fill_city_tiles` (516-559) adds any non-city region that is enclosed by city tiles and does not reach the overmap edge (541, 555). Towns are joined by `connect_closest_points` (`overmap.cpp` 2658-2735) from the inter-city caller (2214-2220, road points are the town centres; with no towns a random fallback point is used, 2210). It sorts all pairs by distance (2680), accepts edges in Kruskal order (union by subgraph, 2685-2728), and adds a loop edge with one-in-ten chance when both ends are already joined (2719). Each accepted edge is built as a road (2726).

## 2. Key functions

- `place_cities`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/overmap_city.cpp` 65-212. Towns: count, seed, size bucket, four-way hub.
- `build_cities`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/overmap_city.cpp` 214-233. Random start arm, four arms, per-town unique set, flood fill.
- `build_city_street`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/overmap_city.cpp` 384-460. Arm walk: side streets at block gaps (413-416), buildings per step (439-443), end-of-arm turn (449-456).
- `place_building`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/overmap_city.cpp` 281-304. Ring distance, 10 tries, footprint check, unique record.
- `pick_random_building_to_place`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/overmap_city.cpp` 235-279. Shop, park, house by ring; redraw loop (268-277).
- `connect_closest_points`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/overmap.cpp` 2658-2735. Hub-to-hub roads by Kruskal plus one-in-ten loops.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor numbers (where it lives) |
|---|---|
| Walk an arm from the hub, side streets every block-sized gap, width alternates | Block width rng(3,5) or 2 (407); side street length size - rng(1,3) (415-416); gap test c < croad - block_width (413). Gap is the donor's own rule, data-free. |
| Each step tries a building on each side, skipping some | BUILDINGCHANCE 4, so 3 in 4 tries (36, 439, 442). Engine constant. |
| Ring rule: service by distance from centre, percent of town size | Shop radius 30 and sigma 50 (data, JSON 367-368); park radius 20 and sigma 80 (JSON 369-370). Code defaults are shop sigma 20 (`regional_settings.h` 61) and park sigma 100 - park radius (66), overridden by the data. |
| Normal draw with a floor at the radius | `max(radius, normal(radius, sigma))` (250, 254); `normal_roll` is a std normal_distribution (`rng.cpp` 80, 86). |
| Tries per building | 10 (289). Donor's redraw for a fitting entry has no cap (268-277). |
| Town size spread | rng(size-1, max), buckets 1/3 x1/3, 1/3 x2/3, 1/6 x3/2, 1/6 x2 (173-182), clamp 2..55 (184-185). |
| Unique landmarks per town | CITY_UNIQUE set per town (226, 270, 298-299). |
| Hub-to-hub roads | Kruskal on trig distance (2674, 2680) plus loop chance one in ten (2719). |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (side streets left then right, then buildings left then right, per step; end-of-arm turn last). It works on an abstract street tree and a caller-supplied distance and placement callback, not a tile grid, so it omits road bitmasks, highways, rivers, the 2-neighbour collision stop, manholes, megacity, the `GLOBALLY_UNIQUE` and `OVERMAP_UNIQUE` checks, and the place_special footprint. It uses a uniform pick where the donor uses a weighted bin. It assumes each arm is exactly `size` steps (the donor can add one step when a connection is ahead). The end-of-arm turn side is geometry and is left to the caller. It bounds the redraw at 20 tries (donor: none) and returns false from placement instead of failing silently (donor: 10 tries, then nothing).

```ts
// Licence: CC-BY-SA 3.0 (donor, Cataclysm: DDA). Clean-room sketch of the described mechanism, not a translation of the donor lines.
export {};

type Kind = 'shop' | 'park' | 'house';
type Side = 'left' | 'right';

// Zone data: the four numbers that change per region. Percents are of town radius.
interface ZoneTownData {
  shopRadius: number;
  shopSigma: number;
  parkRadius: number;
  parkSigma: number;
}

interface Catalogue {
  id: string;
  minSize: number;   // inclusive town size the entry may appear in
  maxSize: number;   // inclusive
  unique: boolean;   // at most once per town
}

type Bins = Record<Kind, Catalogue[]>;

interface Rng {
  int(lo: number, hi: number): number; // inclusive, like the donor's rng(lo, hi)
  chance(n: number): boolean;          // true with probability 1 / n, like one_in(n)
  unit(): number;                      // [0, 1)
}

interface Town {
  size: number;
  placedUnique: Set<string>;
}

// Box-Muller normal draw from the injected uniform source.
function normalRoll(rng: Rng, mean: number, sd: number): number {
  const u1 = Math.max(rng.unit(), 1e-12);
  const u2 = rng.unit();
  return mean + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Ring rule. distPct is the distance from the town centre as a percent of town size.
// The shop ring is at least shopRadius; a normal draw can only widen it. Parks use the
// same shape. The draw happens per call, so the boundary is fuzzy per building.
function pickKind(distPct: number, z: ZoneTownData, rng: Rng): Kind {
  const shopNormal = z.shopSigma > 0
    ? Math.max(z.shopRadius, Math.trunc(normalRoll(rng, z.shopRadius, z.shopSigma)))
    : z.shopRadius;
  const parkNormal = z.parkSigma > 0
    ? Math.max(z.parkRadius, Math.trunc(normalRoll(rng, z.parkRadius, z.parkSigma)))
    : z.parkRadius;
  if (shopNormal > distPct) return 'shop';
  if (parkNormal > distPct) return 'park';
  return 'house';
}

// Fix for the donor's unbounded do/while: a bounded number of draws, then null.
function pickCatalogue(distPct: number, town: Town, z: ZoneTownData, bins: Bins, rng: Rng, maxTries = 20): Catalogue | null {
  const bin = bins[pickKind(distPct, z, rng)];
  if (bin.length === 0) return null;
  for (let i = 0; i < maxTries; i++) {
    const c = bin[rng.int(0, bin.length - 1)];
    if (c.minSize > town.size || c.maxSize < town.size) continue;
    if (c.unique && town.placedUnique.has(c.id)) continue;
    return c;
  }
  return null;
}

// Place one building at a time, up to 10 candidate tries (donor place_building).
// Returns false when every try fails, so the caller can count it instead of failing silently.
function placeOne(town: Town, z: ZoneTownData, bins: Bins, rng: Rng, distPct: number, tryPlace: (c: Catalogue) => boolean): boolean {
  for (let r = 10; r > 0; r--) {
    const c = pickCatalogue(distPct, town, z, bins, rng);
    if (c !== null && tryPlace(c)) {
      if (c.unique) town.placedUnique.add(c.id);
      return true;
    }
  }
  return false;
}

interface Ctx {
  town: Town;
  z: ZoneTownData;
  bins: Bins;
  rng: Rng;
  distanceOf: (street: number, step: number) => number; // caller's geometry, in tiles
  tryPlace: (street: number, step: number, side: Side, c: Catalogue) => boolean;
  failures: number;
  nextStreet: number;
}

// Grow one street of length cs from the hub (donor build_city_street, abstract tiles).
// Side streets sprout every few steps, the widths alternate, and buildings go on both sides
// of each step with a 3-in-4 chance per side. A full-length street ends with a turn.
function buildStreet(ctx: Ctx, cs: number, blockWidth: number, street: number): void {
  let size = cs;
  let c = size;
  let croad = size;
  const newWidth = blockWidth === 2 ? ctx.rng.int(3, 5) : 2;

  for (let step = 1; step <= size; step++) {
    c--;
    if (c >= 2 && c < croad - blockWidth) {
      croad = c;
      let left = size - ctx.rng.int(1, 3);
      let right = size - ctx.rng.int(1, 3);
      if (left === 1) left++;
      if (right === 1) right++;
      buildStreet(ctx, left, newWidth, ctx.nextStreet++);
      buildStreet(ctx, right, newWidth, ctx.nextStreet++);
    }
    const sides: Side[] = [];
    if (!ctx.rng.chance(4)) sides.push('left');
    if (!ctx.rng.chance(4)) sides.push('right');
    for (const side of sides) {
      const distPct = Math.trunc((ctx.distanceOf(street, step) * 100) / Math.max(ctx.town.size, 1));
      const ok = placeOne(ctx.town, ctx.z, ctx.bins, ctx.rng, distPct,
        (cat) => ctx.tryPlace(street, step, side, cat));
      if (!ok) ctx.failures++;
    }
  }

  // Donor: the end-of-street turn uses a reduced size. c === 0 means the walk ran its full length.
  size -= ctx.rng.int(1, 3);
  if (size >= 2 && c === 0) {
    // The turn side (left or right of the walk) is geometry; this abstract walk does not model it.
    buildStreet(ctx, size, 2, ctx.nextStreet++);
    if (ctx.rng.chance(5)) buildStreet(ctx, size, newWidth, ctx.nextStreet++);
  }
}

// Build one town: four arms from the hub, one per cardinal direction (donor build_cities).
// The donor picks a random first arm; that only changes the order of RNG draws, so it is omitted.
export function buildTown(
  size: number,
  z: ZoneTownData,
  bins: Bins,
  rng: Rng,
  distanceOf: (street: number, step: number) => number,
  tryPlace: (street: number, step: number, side: Side, c: Catalogue) => boolean,
): { failures: number } {
  const ctx: Ctx = {
    town: { size, placedUnique: new Set<string>() },
    z,
    bins,
    rng,
    distanceOf,
    tryPlace,
    failures: 0,
    nextStreet: 1,
  };
  for (let arm = 0; arm < 4; arm++) {
    buildStreet(ctx, size, 2, ctx.nextStreet++);
  }
  return { failures: ctx.failures };
}
```

## 5. Lands in

- TARGET `origins/world/town-layout.ts` (proposed new module, not in the repo yet): build-time generator that writes a zone's town layout as data, seeded per zone. Not on the server tick and not at runtime.
- Parity-checklist row 20 (catalogue as runtime source): the shop, park and house bins and their size ranges and unique flags are the catalogue; the generator reads them from zone data.
- Reuse tag: rewrite-from-idea (CC-BY-SA 3.0: clean-room, shape only)
- Brief rule served: zones as data (one runtime, the layout is data written before play); keep the idea, fix the defect (2026-10-10 rule). Parity row 23 is the nearest zone row but it covers population, not layout, so it is not used here.

## 6. Gaps and risks

- Licence CC-BY-SA 3.0: clean-room only. The sketch is written from the described order of steps, not from the donor lines.
- Defect 1, unbounded redraw (`overmap_city.cpp` 268-277): if no entry fits the town size or the bin is all unique, the loop never ends. Fix: bounded tries that return null (sketch `pickCatalogue`, 20 tries), and a build-time check that every bin has an entry for every size class.
- Defect 2, silent give-up (289): after 10 tries the lot stays empty and nothing is reported. Fix: return false and count failures per town (sketch `placeOne`), so the generator can report an empty lot in a test.
- Defect 3, comment and code disagree (246 says clamp at half the radius; 250 clamps at the full shop radius). Fix: the code is the rule; the sketch clamps at the full radius and the comment is not carried over.
- Defect 4, two default sources: code default park sigma is 100 minus park radius (`regional_settings.h` 66) while the data sets 80 (JSON 370). Fix: the zone data file is the only source; the sketch takes all four numbers as data and has no hidden default.
- Design point kept on purpose: the draw is per attempt, so the shop and park edge is fuzzy per building. Frankendom must seed it per zone (no `Math.random` in the generator) so the same seed gives the same town on server and client.
- Straight-path length (`overmap_city.cpp` 343-346 adds one step when a connection is ahead; `straight_path` 36-58 returns the source as the first node): the sketch assumes exactly `size` steps, so the end-of-arm turn (c === 0) can differ by one tile from the donor.
- Not read: `place_special` (`overmap.cpp` 3036 onward) and the bin contents, so footprints and the weighted pick are not described. Frankendom would need its own footprint check and weights.
- Only CITY_UNIQUE is modelled. GLOBALLY_UNIQUE and OVERMAP_UNIQUE (lines 270-274) need a zone-wide registry in Frankendom.
- Tile grid, road bitmasks, rivers, highways, manholes and megacity are not in the sketch and are not needed for the grammar.
- Minimap: partly read (`pixel_minimap.cpp` 74-108, 153-175). It draws terrain colour per tile and paints attacking or following monsters red with a sine flicker (`get_critter_color`, `build_batches`). It is client-only; not part of this note's mechanism; not carried into section 5.
