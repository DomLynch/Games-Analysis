# pmbstyle-L2Solo (zones-world, cell 7)

Donor: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/World/WorldAreaCatalog.js` | Licence: Apache-2.0 (the donor's LICENSE file is Apache License, Version 2.0, January 2004; no NOTICE file in the donor root; no licence header in WorldAreaCatalog.js) | JavaScript (CommonJS) | symbol `resolve` (with `matches`, `areaForSpot`)

Checked: Opened and read in full: `src/GameServer/World/WorldAreaCatalog.js` (1-255), `src/GameServer/World/TownRespawn.js` (1-153), `src/GameServer/Bot/AI/SpotService.js` (1-84 and 236-248). Also read: `tests/test_town_respawn.js` (1-30 only). Callers were found by grep across the repo, and I read none of them in full: `resolve` is called from `BotLifeState.js` (962, 1037, 1041, 1045), `SpotService.js` (75), `WorldObserverServer.js` (116, 286, 320, 390, 818, 1736); `WorldAreaCatalog` is imported by `BotChatLocation.js`, `NativeItemLocations.js` and the tests. `isLocalForState` has no callers (grep found only its definition and export). Not read: how the spot index is built (`SpotIndex`, SpotService 84-235); how `BotLifeState` uses the result (grep lines only); how zones reach clients or how the world streams (`World.js`, `NpcVisibility.js` not read). Confidence: high on matching, resolution and spot classification (read in full); medium on what consumers do with the result. The list hint `WorldAreaCatalog.js` is the right file. Zone-world topic; not a camera cell.

## 1. Mechanism

- A zone is data. `AREAS` (50-152) is a frozen list of area objects. Each has a `zones` list of axis-aligned boxes (`minX`, `maxX`, `minY`, `maxY`, optional `minZ`, `maxZ`, `belowZ`, `aboveZ`), or a geodata `cell` tag, or both. The Cruma Tower box (58-64) spans 13,850 units on X and on Y (X 10800 to 24650, Y 107200 to 121050) and Z -12352 to -6320; these bounds are read but each is shorter than 15 characters, so they have no receipt. The seven Seven Signs dungeons are generated from C4 data by `sevenSignsArea` (20-48, 151).
- Matching (`matches`, 182-189) is an AND over the constraints an area has. An area with no cell, no zones and no `belowZ` never matches (183). A cell tag must equal the point's grid cell (185). The point must fall in at least one of the area's boxes (186). An area-level `belowZ` requires a known z below it (187).
- A box (`matchesZone`, 166-180) tests each bound that is set. X and Y bounds are inclusive (171-174). A z bound fails when z is unknown (175-178). A bound that is not set is not tested, so a box with no z bounds matches at any height.
- Grid cell (`mapCell`, 159-164): `(x >> 15) + 20` and `(y >> 15) + 18`, joined with `_`. Cells are 32768 units. Cells are used as tags only (185), for example Elven Ruins on `21_25` and Mithril Mines on `25_12` (140).
- Resolution (`resolve`, 191-193): the first area in `AREAS` order that matches wins. Overlaps are not detected; the list order is the rule.
- Spot classification (`areaForSpot`, 207-222), run once while the spot index is built (comment at 210-214):
  (a) start from the area of the spot's centre (208);
  (b) if the spot's `partitionedAreaId` equals that area's id, keep it and stop (209);
  (c) scan the arrival points in order; the first one whose area is `catacomb` or `party_required` wins at once (215-218); otherwise the first area seen becomes the fallback when the centre had none (219);
  (d) return the fallback (221).
  `decorateSpot` (224-237) then copies the area's name, tags, `spotCapacity` (233) and level gate onto the spot.
- Level gate (`isLocalForState`, 239-245): an area with `localStarterRegions` is open to everyone once the player's level is above `localUntilLevel`; at or below that level only the listed starter regions pass. Exported, no callers found.
- Partitioned areas in the bot spot grid (SpotService.js): `partitionedAreaAt` (74-78) returns the area only when its tags include `catacomb` or `party_required`; `spotIdAt` (80-84) calls it (83). The spot grid itself is 6000 units (`GRID_SIZE`, line 1).
- Tick and timing: none. This is static data, read on demand. No loop, no accumulator.

## 2. Key functions

- `matches`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/World/WorldAreaCatalog.js` 182-189. The AND of the area's constraints.
- `matchesZone`: same file, 166-180. One box, each bound optional.
- `mapCell`: same file, 159-164. The 32768-unit grid key with the +20 and +18 offsets.
- `resolve`: same file, 191-193. First match in list order.
- `areaForSpot`: same file, 207-222. Centre first, then party-only or catacomb arrival points win.
- `decorateSpot`: same file, 224-237. Copies the area's name, tags, capacity and level gate onto the spot.
- `isLocalForState`: same file, 239-245. Starter-region level gate (no callers found).
- `sevenSignsArea`: same file, 20-48. Builds the Seven Signs boxes from C4 spawn points, with a 300-unit margin in X and Y and a 256-unit margin in Z (25, 34-39).
- Second zone model in the same donor, `TownRespawn.js`: `isInsidePolygon` (84-95, point-in-polygon crossing count); `getRegionGroup` (97-111: Z-aware cell override first, then polygon zones `RESPAWN_ZONES` in order, then the cell-to-group table); `getClosestTown` (113-122, nearest town by squared distance when no region); `getChaoticRespawnCoords` (133-144, random point from the group's list). Read in full; not used by WorldAreaCatalog.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Axis-aligned box with an optional z band; unset bounds are not tested | Cruma Tower box 13,850 x 13,850 units, z -12352 to -6320 (58-64; read, no receipt) |
| Grid cell key from integer shift, with an offset | 32768-unit cells (shift 15); offsets +20 and +18 (163) |
| Generated zone = source points grown by a margin | 300 units in X and Y (25); 256 units in Z (38-39) |
| Spot capacity per zone | 48 Cruma Tower (68); 72 Tower of Insolence (87); 72 Antharas' Lair (106); 64 Elven Ruins (126); 48 Mithril Mines (149) |
| Level gate for starter-region zones | `localUntilLevel` 20 on Elven Ruins (125) and Mithril Mines (148) |
| Spot grid for hunting sectors | 6000 units (SpotService.js 1) |
| Classify once, party-only wins over centre | none (rule) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: the no-constraint check, then the cell tag, the box test, the area-level band; first match in list order; spot classification with the partition shortcut, the arrival-point scan (party-only or catacomb wins at once), and the centre fallback; the level gate. It omits: the number parsing (`finite()`), the Seven Signs generator, the spot-id grid and `constrainToSpotGrid`, the capacity and tag decoration, the public projection used by WorldObserver, and the TownRespawn polygon model. The cell key uses `Math.floor` division by 32768 where the donor uses a 32-bit `>>` shift; these agree for coordinates inside the 32-bit range.


```ts
// Licence: Apache-2.0 (donor). Re-expression of the zone-as-data shape in our own types; no donor lines copied.
// clean-room
interface ZoneBox {
  minX?: number; maxX?: number; minY?: number; maxY?: number;
  minZ?: number; maxZ?: number;
  belowZ?: number; aboveZ?: number;   // z band: strictly below / strictly above
}

interface ZoneArea {
  id: string;
  cell?: string;                      // optional grid-cell tag, e.g. "21_25"
  boxes?: ZoneBox[];                  // any box may match
  belowZ?: number;                    // extra requirement: z < belowZ
  tags: string[];
  spotCapacity?: number;
  localStarterRegions?: string[];
  localUntilLevel?: number;
}

interface Loc { x: number; y: number; z: number | null; }  // z may be unknown

function cellOf(x: number, y: number): string {
  return `${Math.floor(x / 32768) + 20}_${Math.floor(y / 32768) + 18}`;
}

function boxMatch(b: ZoneBox, p: Loc): boolean {
  if (b.minX !== undefined && p.x < b.minX) return false;
  if (b.maxX !== undefined && p.x > b.maxX) return false;
  if (b.minY !== undefined && p.y < b.minY) return false;
  if (b.maxY !== undefined && p.y > b.maxY) return false;
  if (b.minZ !== undefined && (p.z === null || p.z < b.minZ)) return false;
  if (b.maxZ !== undefined && (p.z === null || p.z > b.maxZ)) return false;
  if (b.belowZ !== undefined && (p.z === null || p.z >= b.belowZ)) return false;
  if (b.aboveZ !== undefined && (p.z === null || p.z <= b.aboveZ)) return false;
  return true;
}

function areaMatch(a: ZoneArea, p: Loc): boolean {
  const boxes = a.boxes ?? [];
  if (!a.cell && boxes.length === 0 && a.belowZ === undefined) return false; // unconstrained area never matches
  if (a.cell && cellOf(p.x, p.y) !== a.cell) return false;
  if (boxes.length > 0 && !boxes.some(b => boxMatch(b, p))) return false;
  if (a.belowZ !== undefined && (p.z === null || p.z >= a.belowZ)) return false;
  return true;
}

// Areas are ordered; the first match wins, so overlaps are settled by list order.
function resolveArea(areas: ZoneArea[], p: Loc): ZoneArea | null {
  return areas.find(a => areaMatch(a, p)) ?? null;
}

interface Spot { center: Loc; arrivalPoints: Loc[]; partitionedAreaId?: string; }

// Classify a hunting spot once. A party-only or catacomb area found among the arrival points wins over the centre.
function classifySpot(spot: Spot, areas: ZoneArea[]): ZoneArea | null {
  let fallback = resolveArea(areas, spot.center);
  if (spot.partitionedAreaId && fallback?.id === spot.partitionedAreaId) return fallback;
  for (const p of spot.arrivalPoints) {
    const a = resolveArea(areas, p);
    if (!a) continue;
    if (a.tags.includes('catacomb') || a.tags.includes('party_required')) return a;
    if (!fallback) fallback = a;
  }
  return fallback;
}

// Level gate for starter-region zones: local content is open to other regions only from localUntilLevel up.
function localForLevel(a: ZoneArea, starterRegion: string, level: number): boolean {
  const allowed = a.localStarterRegions ?? [];
  if (allowed.length === 0 || starterRegion === '' || level > (a.localUntilLevel ?? 0)) return true;
  return allowed.includes(starterRegion);
}
```

## 5. Lands in

- TARGET `origins/server/world-zones.ts` (new: zone boundary data and resolver, server side; the zone file supplies the boxes and the level gate). Parity-checklist row 23 (zone population) is the closest row: zones feed population (caps, respawn), but no row covers boundary matching, so the row 23 link is a stretch. Say so in review.
- Reuse tag: adapt-from-idea (Apache-2.0: code may be adapted; keep the licence and any NOTICE if donor code is copied; this sketch is a re-expression, no donor lines copied)
- Brief rule served: zones as data on one runtime (boxes, bands and tags are data, the resolver is engine code); server-verified (classification and gates decided on the server)

## 6. Gaps and risks

- Apache-2.0: code may be adapted. This sketch is a re-expression, not a copy. The donor root has no NOTICE file.
- Two zone models in one donor. `WorldAreaCatalog.js` uses boxes with first-match order; `TownRespawn.js` uses polygons (`RESPAWN_ZONES`, 66-70) and its own cell-to-group table (`REGION_GROUPS`, 47-63). The cell key is written twice (WorldAreaCatalog.js 163; TownRespawn.js 98-99). Frankendom has one zone runtime, so it should pick one model and not port both.
- First match in list order is the only overlap rule. The donor does not detect overlaps; the only test (`tests/test_town_respawn.js` 10-14) checks that an unconstrained area never matches. Frankendom should reject overlapping zones at load, or state the order in the data.
- Unknown z fails every z test (175-178, 187). If Frankendom zones are flat, drop z from the zone shape; if they have height, keep the rule and test it.
- Spot classification reads only arrival points, not the whole spot. The donor comment (210-214) admits that the averaged sector centre may not be a valid dungeon coordinate. Frankendom should classify from its own spawn points at build time and test the result.
- The level gate (`isLocalForState`) has no callers in the donor (grep). Do not describe it as proven behaviour; if we want it, it needs a caller and a test.
- The grid key is a Lineage II geodata convention (shift 15, offsets +20 and +18). Frankendom needs its own grid, if it needs one, without these offsets.
- The Mithril Mines and Elven Ruins entries use a z band to separate a surface area from an underground floor under the same map cell (117-121 and 136-143). That is a geodata workaround. Frankendom zone data should say which floor a zone means, on purpose.
- Static data only: nothing here streams zones to clients or decides when a zone loads (not read: `World.js`, `NpcVisibility.js`). The streaming question for Frankendom stays open.

Reuse tag: adapt-from-idea (Apache-2.0)
Brief rule served: zones as data on one runtime; server-verified; one engine
Best transferable idea: A zone is plain data, a list of axis-aligned boxes with an optional z band and an optional grid-cell tag, resolved by first match in list order, and a hunting spot takes the party-only zone found among its arrival points over its centre's zone.
Decision (proposed): adapt - the box-and-band zone data and the classify-once step fit our zones-as-data ruling, but the first-match-without-overlap-check rule and the Lineage II cell offsets do not, so overlaps are rejected at load and the grid is ours.
Acceptance: A server test: a point inside a box and inside its z band resolves to that zone; a point below the band resolves to none; an area with no box, cell or band never matches; two overlapping zones fail to load; a spot whose arrival point lies in the party-only zone is classed party-only even when its centre is open.
