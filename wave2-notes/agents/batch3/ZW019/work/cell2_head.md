# pmbstyle-L2Solo (zones-world, cell 7)

Donor: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/World/WorldAreaCatalog.js` | Licence: Apache-2.0 (the donor's LICENSE file is Apache License, Version 2.0, January 2004; no NOTICE file in the donor root; no licence header in WorldAreaCatalog.js) | JavaScript (CommonJS) | symbol `resolve` (with `matches`, `areaForSpot`)

Checked: Opened and read in full: `src/GameServer/World/WorldAreaCatalog.js` (1-255), `src/GameServer/World/TownRespawn.js` (1-153), `src/GameServer/Bot/AI/SpotService.js` (1-84 and 236-248). Also read: `tests/test_town_respawn.js` (1-30 only). Callers were found by grep across the repo, and I read none of them in full: `resolve` is called from `BotLifeState.js` (962, 1037, 1041, 1045), `SpotService.js` (75), `WorldObserverServer.js` (116, 286, 320, 390, 818, 1736); `WorldAreaCatalog` is imported by `BotChatLocation.js`, `NativeItemLocations.js` and the tests. `isLocalForState` has no callers (grep found only its definition and export). Not read: how the spot index is built (`SpotIndex`, SpotService 84-235); how `BotLifeState` uses the result (grep lines only); how zones reach clients or how the world streams (`World.js`, `NpcVisibility.js` not read). Confidence: high on matching, resolution and spot classification (read in full); medium on what consumers do with the result. The list hint `WorldAreaCatalog.js` is the right file. Zone-world topic; not a camera cell.

## 1. Mechanism

- A zone is data. `AREAS` (50-152) is a frozen list of area objects. Each has a `zones` list of axis-aligned boxes (`minX`, `maxX`, `minY`, `maxY`, optional `minZ`, `maxZ`, `belowZ`, `aboveZ`), or a geodata `cell` tag, or both. The Cruma Tower box (58-64) spans 13,850 units on X and on Y (X 10800 to 24650, Y 107200 to 121050) and Z -12352 to -6320; these bounds are read but each is shorter than 15 characters, so they have no receipt. The seven Seven Signs dungeons are generated from C4 data by `sevenSignsArea` (20-48, 151).
- Matching (`matches`, 182-189) is an AND over the constraints an area has. An area with no cell, no zones and no `belowZ` never matches (183). A cell tag must equal the point's grid cell (185). The point must fall in at least one of the area's boxes (186). An area-level `belowZ` requires a known z below it (187).
- A box (`matchesZone`, 166-180) tests each bound that is set. X and Y bounds are inclusive (171-174). A z bound fails when z is unknown (175-178). A bound that is not set is not tested, so a box with no z bounds matches at any height.
- Grid cell (`mapCell`, 159-164): `(x >> 15) + 20` and `(y >> 15) + 18`, joined with `_`. Cells are 32768 units. Cells are used as tags only (185), for example Elven Ruins on `21_25` and Mithril Mines on `25_12` (114-121, 135-143).
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

simplified: the sketch keeps the donor order: the no-constraint check, then the cell tag, the box test, the area-level band; first match in list order; spot classification with the partition shortcut, the arrival-point scan (party-only or catacomb wins at once), and the centre fallback; the level gate. It omits: the number parsing (`finite()`), the Seven Signs generator, the spot-id grid and `constrainToSpotGrid`, the capacity and tag decoration, the public projection used by WorldObserver, and the TownRespawn polygon model. The cell key uses `Math.floor` division by 32768 where the donor uses a 32-bit `>>` shift; these agree for the coordinate range the donor uses. The sketch returns `null` instead of the donor's `undefined` fallthrough only where the donor also uses `|| null`.

