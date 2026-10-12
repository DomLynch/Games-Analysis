# 0ad-0ad (city-map-design, cell 1)

Donor: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/maps/random/rmgen/painter/CityPainter.js` (district fill) with `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/maps/random/rmgen-common/player.js` (hub: centre plus ring of services) | Licence: GPL-2.0-or-later (`/mnt/frankendom-donors/0ad-0ad/LICENSE.txt` lines 17-18: "binaries/data/ / GPL version 2 (or later)"; clean-room only) | JavaScript (map-generation scripts) | symbols `CityPainter.prototype.paint`, `placeStartingEntities`

Checked: opened CityPainter.js in full (84 lines); player.js lines 1-200 and 208-242 (hub placement, base build order, CityPatch; not the rest of the file); jebel_barkal.js lines 255-345, 690-735 and 880-930 (the Kush city layout and the district call; not the whole map); RandomMap.js 289-294; library.js 51-63 (head of `getObstructionSize`); civs/athen.json 38-57 (the starting-entity data table); LICENSE.txt 12-30. Callers grepped (not read in full): caledonian_meadows.js 623, island_stronghold.js 120, wild_lake.js 647 and 672, fortress.js 89, survivalofthefittest.js 92, belgian_uplands.js 270. The hint file (belgian_uplands.js) is the wrong place: its only relevant line is the call at 270. Not read: `avoidClasses`, `ConvexPolygonPlacer`, `StayAreasConstraint`, `PassableMapAreaConstraint`, `Vector2D.rotate`, `placeEntityAnywhere`, `distributePointsOnCircularSegment` (rmgen/math.js 45, grep only). Confidence: high on the CityPainter loop (read end to end); medium-high on the hub ring (read end to end, but the donor's rotation helper is not read, so the exact side convention is taken from the arithmetic in the lines). Landmarks, signage and minimap were not found in these functions and were not searched for in depth (not read). camera_scope: not a camera cell.

Best transferable idea: a town is built from data in a fixed order: a centre first, then each service group placed on its own side at a set distance, and each district filled by a greedy first-fit scan over candidate tiles where every building type carries a quota and its own spacing rule from other types and from roads.
Decision (proposed): adapt - keep the hub ring and the quota plus spacing first-fit district, but generate them from a seed on both server and client, add a priority field, and shuffle the scan order.
Acceptance: a zone-data town built from one seed shows the same building positions on the server and in the client, no building type exceeds its quota, and a server test fails if a required service (market, forge) is missing when there is free space near a road.

## 1. Mechanism

Two linked pieces. Both are map-generation code, not runtime code.

**(a) Hub: centre plus ring of services (player.js 75-101, 109-112).** `placeStartingEntities(location, playerID, civEntities, dist = 6, orientation)`:
1. The first entry is the centre. If its template starts with `structures/`, it is placed at `location` and the index moves on (lines 79-83).
2. Every later entry is a "side" group j. Its facing is `orientation - PI * (1 - j/2)`, so j = 1, 2, 3, 4 give four sides at 90 degree steps (line 90).
3. Each group has `Count` members (default 1, line 91). Member `num` sits at `location + (dist, 0) rotated by -angle`, plus a lateral offset `space * (-num + (count-1)/2)` rotated by `angle`, with `space = 2` (lines 87, 93-100). So the group is centred on its side and its members are 2 tiles apart.
4. Each member is placed with `placeEntityPassable` (line 101). The return value is not checked, so a member on an impassable tile is skipped silently.

`placeCivDefaultStartingEntities` (109-112) calls this with `dist = 6` and then `placeStartingWalls`, which places a wall only for one civ and only on maps above 128 (line 122).

**(b) Base build order (player.js 17-27, 154-185).** `g_PlayerBaseFunctions` is an ordered list: CityPatch, Trees, Mines, Treasures, Berries, StartingAnimal, Decoratives. The comment says "Create the largest and most important entities first" (line 20). `placePlayerBase` walks the list in order (line 169), skips any entry the map did not ask for (line 176), and calls `placePlayerBase<Name>` (line 185). So the order of services is fixed by the list, not by the map.

**(c) District fill: CityPainter (CityPainter.js 4-84).** A painter that fills an area with a list of building templates:
- Constructor (lines 4-24): each template gets an obstruction size from the template's own Obstruction data (line 10), an optional `margin` (line 10), a `maxCount` that defaults to `Infinity` (line 13), an optional constraint list (line 14) and an optional painter (line 15).
- `paint(area)` (26-84): it creates a per-district tile class (line 40). It then scans a grid from x = 0 to mapSize and y = 0 to mapSize in steps of 0.5 (lines 44-45), rotates each point around the map centre by the district angle, and rounds it to a tile (line 47). Each tile is visited once (line 48 and 51 via `processed`).
- For each tile in the area that is passable (line 48), the templates are tried in a fresh random order (line 53). A template is skipped if its constraint says no (line 55), or if its footprint (its obstruction corners rotated by a random 90 degree step, lines 59-63) does not fit inside the area, does not hit the district tile class and is passable (lines 65-69).
- On a fit: the building is placed at the centre of its footprint with angle `-buildingAngle` (line 71); its painter, if any, paints the footprint (line 74); the footprint tiles are added to the tile class so later buildings avoid them (lines 76-77); the count goes up (line 79); templates at `maxCount` are removed from the list (line 80); and the loop breaks (line 81).

**Layout data (jebel_barkal.js 262-328, 910-927).** The Kush city is one `layoutKushCity` list of eleven entries (house, fortress, civic centre, elephant stable, stable, barracks, tower, market, forge, Noba camp, Blemmye camp). Spacing and road rules are per entry: fortress keeps 25 tiles from its own class and must be within 8 tiles of the path class (line 271); civic centre keeps 60 and the same road rule (line 277); barracks keeps 12 (line 295); tower keeps 17 (line 301); market keeps 15 (line 307). The list is filtered by difficulty (line 328). No entry sets `maxCount` (grep count 0 in the file). The district call (910-927) runs `CityPainter` once per grid cell of a city grid, with the district angle averaged from the two grid edges (line 924), a road-desert terrain painter and a city tile class.

**Starting entities data (civs/athen.json 38-57).** The table gives the centre as `structures/athen/civil_centre` (line 40), then four groups: 4 female citizens, 2 spearmen, 2 slingers, 1 cavalry javelineer (lines 42-55). So the hub is four sides, one service group each, and the centre is data in the civ file.

Tick: none. This is build-time generation. It runs once when the map is made; nothing in it runs per frame.

## 2. Key functions

- `placeStartingEntities`: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/maps/random/rmgen-common/player.js` 75-102. Centre first, then one centred group per side, `space = 2`.
- `placeCivDefaultStartingEntities`: same file 109-113. Wraps the hub with `dist = 6` and the optional walls.
- `placePlayerBase` and its build-order loop: same file 154-187, list at 17-27.
- `placePlayerBaseCityPatch`: same file 222-242. Clump of radius `defaultPlayerBaseRadius() / 3` (line 236) painted as the base area. (Read; not a placement list.)
- `CityPainter` constructor and `CityPainter.prototype.paint`: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/maps/random/rmgen/painter/CityPainter.js` 4-24 and 26-84.
- `RandomMap.prototype.placeEntityPassable`: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/maps/random/rmgen/RandomMap.js` 289-295 (checks `validTilePassable`, then places anywhere).
- Layout list and district call: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/maps/random/jebel_barkal.js` 262-328 and 910-927.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Centre first, then one group per side at a fixed distance, members spaced evenly and centred on the side | `dist = 6` (player.js 75) and `space = 2` (player.js 87) |
| Four sides at 90 degree steps from the map orientation | `PI * (1 - j/2)` (player.js 90) |
| Greedy first-fit over candidate tiles, footprint must be free and not in a blocked class | Candidate step 0.5 (CityPainter.js 44-45); tile rounding (47) |
| Quota per building type, removed when reached | `maxCount` defaults to `Infinity` (CityPainter.js 13); not set in the Kush layout (grep count 0) |
| Spacing from the same building class, and nearness to a road | Fortress 25 and road 8 (jebel_barkal.js 271); civic centre 60 (277); barracks 12 (295); tower 17 (301); market 15 (307) |
| Random 90 degree building angle, aligned to the district | `randIntInclusive(0, 3) * Math.PI / 2` (CityPainter.js 59) |
| Silent skip of a member that cannot be placed | No retry (player.js 101; `placeEntityPassable` returns undefined at RandomMap.js 291-292) |

## 4. TypeScript sketch

simplified: the sketch keeps the hub order (centre, then four side groups from the same angle arithmetic) and the district first-fit with quotas and spacing supplied by the caller. It changes three things on purpose: (1) it adds a `priority` field and tries higher priority first (the donor has none; the list order is shuffled per candidate, CityPainter.js 53), (2) it shuffles the candidate scan order (the donor scans x then y, so spacing binds from the scan start), and (3) it uses its own seeded RNG so the server and client agree. It omits the donor's obstruction shapes (`ConvexPolygonPlacer`), the terrain and road painters, the passability and map-area constraints, the tile class bookkeeping (the caller does it in `commit` and `fits`), the rounding of rotated points, the `margin` value (the caller must apply it in `fits`), and the silent skip behaviour (the sketch reports skips by omission only, as the donor does). It does not fix the donor's rounding waste (TODO at CityPainter.js 37); that fix belongs in `fits`, on whole-tile footprints.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Template {
  name: string;
  priority: number;   // higher is tried first; donor has no priority (list order is shuffled per candidate)
  maxCount: number;   // quota per district (donor: maxCount, line 13)
  margin: number;     // clearance in tiles around the footprint (donor: margin, line 10)
}

export interface Hub {
  centre: string;                              // placed first
  ring: { name: string; count: number }[];     // one group per side, in order
  dist: number;                                // tiles from centre to each group (donor default 6, line 75)
  spacing: number;                             // tiles between members of a group (donor: space = 2, line 87)
}

export interface Placed { name: string; x: number; y: number; angle: number; }

// Seeded RNG (mulberry32) so server and client produce the same town from one seed.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(xs: T[], rnd: () => number): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  return xs;
}

// Own rotation helper for this sketch (the donor's Vector2D.rotate is not read).
function rot(x: number, y: number, a: number): [number, number] {
  return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
}

// Hub: centre first, then one centred group per side. Group j = 1..4 faces side orient - PI*(1 - j/2).
export function placeHub(
  hub: Hub,
  orient: number,
  cx: number,
  cy: number,
  put: (name: string, x: number, y: number, angle: number) => boolean,
): Placed[] {
  const out: Placed[] = [];
  if (put(hub.centre, cx, cy, orient)) out.push({ name: hub.centre, x: cx, y: cy, angle: orient });
  hub.ring.forEach((group, k) => {
    const side = orient - Math.PI * (1 - (k + 1) / 2);
    for (let num = 0; num < group.count; num++) {
      const [ax, ay] = rot(hub.dist, 0, -side);
      const [bx, by] = rot(hub.spacing * (-num + (group.count - 1) / 2), 0, side);
      const x = cx + ax + bx;
      const y = cy + ay + by;
      if (put(group.name, x, y, side)) out.push({ name: group.name, x, y, angle: side });
    }
  });
  return out;
}

function tryOrder(sorted: Template[], rnd: () => number): Template[] {
  const out: Template[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j < sorted.length && sorted[j].priority === sorted[i].priority) j++;
    out.push(...shuffleInPlace(sorted.slice(i, j), rnd));   // shuffle only among equal priority
    i = j;
  }
  return out;
}

// District: greedy first-fit over candidate tiles. The caller supplies fits() (footprint free, zone
// constraints such as spacing from a class or nearness to a road) and commit(). Mutates `cells`.
export function placeDistrict(
  cells: { x: number; y: number }[],
  templates: Template[],
  baseAngle: number,
  fits: (t: Template, x: number, y: number) => boolean,
  commit: (t: Template, x: number, y: number) => void,
  rnd: () => number,
): Placed[] {
  const counts = new Map<string, number>();
  const placed: Placed[] = [];
  const order = [...templates].sort((a, b) => b.priority - a.priority);
  shuffleInPlace(cells, rnd);   // fix: donor scans x then y, so greedy placement always fills from the scan start
  for (const c of cells) {
    for (const t of tryOrder(order, rnd)) {
      if ((counts.get(t.name) ?? 0) >= t.maxCount) continue;
      if (!fits(t, c.x, c.y)) continue;
      commit(t, c.x, c.y);
      counts.set(t.name, (counts.get(t.name) ?? 0) + 1);
      const angle = baseAngle + Math.floor(rnd() * 4) * (Math.PI / 2);   // aligned, 90-degree steps (donor line 59)
      placed.push({ name: t.name, x: c.x, y: c.y, angle });
      break;
    }
  }
  return placed;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/cm001-0ad-city.ts, with `export {};` appended): exit 0.

Defects found, each with the fix:
- Scan-order bias: candidates are visited x then y (CityPainter.js 44-45) and each placement blocks later ones, so when a spacing rule binds the far side of a district gets fewer buildings. fix: shuffle the candidates with the seeded RNG (sketch, `shuffleInPlace(cells, rnd)`).
- List order is not priority: the templates are shuffled for every candidate (CityPainter.js 53), so a required building can lose its slot to a house. fix: a `priority` field and `tryOrder` (sketch), with shuffle only among equal priority.
- Rounding waste: the donor's own TODO says rounding wastes space (CityPainter.js 37), and points are rounded (47). fix: test footprints as whole-tile rectangles with an explicit `margin` in `fits` (not in the sketch).
- Silent skip: a hub member on an impassable tile is dropped with no retry (player.js 101, return value unused). fix: count the skips and retry on the nearest free tile, or fail the zone build (sketch returns only what was placed).
- Unused quota: `maxCount` exists but the Kush layout sets none (grep count 0). Not a defect in the code; a reminder that quotas must be set in zone data.

## 5. Lands in

- TARGET `origins/zones/town-layout.ts` (proposed new module; the zone loader calls it once per zone seed, data from the zone file). The fight module `src/fight/` is not involved.
- Parity-checklist row 23 (zone population: spawn caps, respawn, despawn, zone data fields). The layout is zone content placement, not population; no row covers layout, so row 23 is the nearest one, and it is an approximate match. Fields to add to zone data: `hub.dist` (6 tiles), `hub.spacing` (2 tiles), per-template `maxCount`, `margin`, `priority`, and the spacing and road-distance rules as data (values from the Kush layout above).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: zones as data (one runtime; the layout is a zone file, not a code branch); row 23 for the zone-content placement; the server must generate the same town from one seed.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not translated.
- Build-time code: the donor runs it once when the map is made. Frankendom's zone loader must run it deterministically on the server and the client from the same seed, or the two sides will see different buildings. The donor's RNG seeding is not read (not read), so the seeded RNG in the sketch is ours.
- Server-verified: a building that a player can attack or loot must come from the same placement on the server. The hub skip (silent drop) must be counted and visible, not hidden.
- One engine: placement must run in the one runtime that loads zones, not in a map-only tool, so the Pit client never needs it.
- The donor's layout depends on the difficulty setting (jebel_barkal.js 328). In Frankendom difficulty should be a zone-data field, not a global.
- Road and spacing rules are checked against the path class in the donor. Frankendom has no road grid yet, so the road rule (8 tiles, line 271) needs a road definition first.
- Civ-specific starting walls (player.js 122) do not transfer as-is; they are one civ and one map size. Treat as a data flag if used at all.
- Landmarks, signage and minimap: not in these functions (not read).

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: zones as data; row 23 zone content placement; one seed, one town, server and client agree.
