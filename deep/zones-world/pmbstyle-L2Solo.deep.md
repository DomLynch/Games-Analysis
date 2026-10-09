# pmbstyle-L2Solo (zones-world, cell 7)

Donor: /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/World/WorldAreaCatalog.js | Licence: Apache-2.0 | JavaScript | symbol AREAS / sevenSignsArea

Symbol check (opened, 2026-10-09 correction pass): sevenSignsArea 20-48, AREAS 50-152, mapCell 159-164, matchesZone 166-180, matches 182-189, resolve 191-193 all land on the named code. Also opened: publicArea 195-205, areaForSpot 207-222, decorateSpot 224-237, isLocalForState 239-245, exports 247-255 (file is 255 lines).

## 1. Mechanism
- A static, frozen catalogue AREAS (50-152) of named areas. Each area has id, name, kind, parentRegion, mapLayer, a mapAnchor (surface point used to place it on a map), tags with tagsAuthoritative, an optional spotCapacity, optional localStarterRegions and localUntilLevel, and its location test: zone boxes (`zones`), a geodata `cell` key, a `belowZ` limit, or a combination. Hand-written entries are Cruma Tower, Tower of Insolence, Antharas' Lair, Elven Ruins (cell 21_25 plus belowZ -3790, because its interior sits under the surface atlas, 117-121) and Mithril Mines (cell 25_12 plus two boxes, the second with its own belowZ -1600, 136-144). The last line spreads in the generated Seven Signs areas (151).
- sevenSignsArea(dungeon) (20-48): takes the dungeon's first spawn file, flattens the coords of all its spawns (21-22), anchors the map at dungeon.outside.spawn (23, 32), derives the id from the spawn file's selfId (27), and builds a single box from the min and max of the spawn points' locX, locY, locZ expanded by 300 in X and Y and 256 in Z (25, 33-40). Tags are dungeon and catacomb for a Catacomb, plus necropolis for a Necropolis (43-45).
- finite() (154-157) turns anything non-numeric into null. mapCell (159-164) returns null when either coordinate is non-finite, otherwise `(x >> 15) + 20` and `(y >> 15) + 18` joined with an underscore; the shift is JavaScript's 32-bit shift.
- matchesZone(zone, loc) (166-180): x or y missing fails; then inclusive minX, maxX, minY, maxY; then minZ, maxZ, belowZ (strictly below) and aboveZ (strictly above) each fail when z is missing. A box can therefore carry belowZ and aboveZ, not only the area.
- matches(area, loc) (182-189): an area with no cell, no zone boxes and no belowZ never matches (183). Otherwise every present test must pass: cell equal, any one zone box matches, and z strictly below area.belowZ (z missing fails).
- resolve(loc) (191-193): first area in array order that matches, else null.
- Use: areaForSpot (207-222) classifies a hunting spot from its centre; if the centre misses or is not party-only it scans the spot's arrival points and prefers an area tagged catacomb or party_required, otherwise the first area found (the partitionedAreaId shortcut at 209 returns early when the centre already matches that id). decorateSpot (224-237) copies the area's name, public fields, tags, capacity and local-starter settings onto the spot. isLocalForState (239-245) says whether a spot is "local" for a character's starter region and level.
- Inputs: a location {locX, locY, locZ}. Outputs: the area object or null. Pure lookup, called when a hunting spot index is built (212-214 comment).

## 2. Key functions
- sevenSignsArea | /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/World/WorldAreaCatalog.js | 20-48 | builds a dungeon area with a spawn-derived box.
- mapCell | /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/World/WorldAreaCatalog.js | 159-164 | cell key from coordinates.
- matchesZone | /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/World/WorldAreaCatalog.js | 166-180 | inclusive box test with optional Z limits and belowZ / aboveZ.
- matches | /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/World/WorldAreaCatalog.js | 182-189 | area gate: cell, zone boxes, belowZ.
- resolve | /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/World/WorldAreaCatalog.js | 191-193 | first match wins.
- areaForSpot | /mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/World/WorldAreaCatalog.js | 207-222 | picks the area for a spawn cluster, preferring party-only content among its points.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Named boxes with inclusive bounds, first match wins | Array order as priority (theirs, 192) |
| Cell key from coordinate shift | Shift of 15 bits; offsets 20 and 18 (theirs, 163) |
| Box derived from spawn points with a margin | Margin 300 in X and Y, 256 in Z (theirs, 25, 38-39) |
| Area carries tags, capacity and local-until-level | spotCapacity 48 to 72, localUntilLevel 20 (theirs, data) |

## 4. TypeScript sketch
simplified: no map layer, anchor, parentRegion or capacity fields; no sevenSignsArea box builder; no partitionedAreaId shortcut at the start of areaForSpot; no decorateSpot or isLocalForState; locations use x y z field names instead of locX locY locZ; the cell shift on JavaScript numbers is the same 32-bit shift as the donor.
```ts
// Licence: Apache-2.0 (pmbstyle-L2Solo). Lift permitted; re-expression of WorldAreaCatalog.js 154-193, 207-222.
interface Box {
  minX?: number; maxX?: number; minY?: number; maxY?: number; minZ?: number; maxZ?: number;
  belowZ?: number; aboveZ?: number;
}
interface Area { id: string; cell?: string; zones?: Box[]; belowZ?: number; tags: string[]; }
interface Loc { x: number; y: number; z: number | null; }

const fin = (v: number | null | undefined): number | null =>
  v === null || v === undefined || !Number.isFinite(v) ? null : v;

function inBox(b: Box, p: Loc): boolean {
  const x = fin(p.x), y = fin(p.y), z = fin(p.z);
  if (x === null || y === null) return false;
  if (b.minX !== undefined && x < b.minX) return false;
  if (b.maxX !== undefined && x > b.maxX) return false;
  if (b.minY !== undefined && y < b.minY) return false;
  if (b.maxY !== undefined && y > b.maxY) return false;
  if (b.minZ !== undefined && (z === null || z < b.minZ)) return false;
  if (b.maxZ !== undefined && (z === null || z > b.maxZ)) return false;
  if (b.belowZ !== undefined && (z === null || z >= b.belowZ)) return false;
  if (b.aboveZ !== undefined && (z === null || z <= b.aboveZ)) return false;
  return true;
}

// Cell key: coordinates shifted right by 15 (32-bit shift, as in the donor), plus offsets.
function cellOf(p: Loc, offX: number, offY: number): string | null {
  const x = fin(p.x), y = fin(p.y);
  if (x === null || y === null) return null;
  return `${(x >> 15) + offX}_${(y >> 15) + offY}`;
}

function matches(a: Area, p: Loc, offX: number, offY: number): boolean {
  if (!a.cell && !(a.zones && a.zones.length > 0) && a.belowZ === undefined) return false;
  const z = fin(p.z);
  if (a.cell && cellOf(p, offX, offY) !== a.cell) return false;
  if (a.zones && a.zones.length > 0 && !a.zones.some((b) => inBox(b, p))) return false;
  if (a.belowZ !== undefined && (z === null || z >= a.belowZ)) return false;
  return true;
}

// First match in array order wins.
function resolve(areas: Area[], p: Loc, offX: number, offY: number): Area | null {
  return areas.find((a) => matches(a, p, offX, offY)) ?? null;
}

// A spot is classified from its centre, then its arrival points can override: a party-only area wins.
function areaForSpot(areas: Area[], center: Loc, arrivals: Loc[], offX: number, offY: number): Area | null {
  let fallback = resolve(areas, center, offX, offY);
  for (const pt of arrivals) {
    const a = resolve(areas, pt, offX, offY);
    if (!a) continue;
    if (a.tags.includes('catacomb') || a.tags.includes('party_required')) return a;
    if (!fallback) fallback = a;
  }
  return fallback;
}
```

## 5. Lands in
- Frankendom file(s): TARGET origins/world/zone-rules.ts (new: boxes as zone data, first match wins) used by the zone-change check in `zone1.ts` (today hand-built). Cell key not adopted.
- Parity-checklist row: 20 (catalogue as runtime source: area records and tags are data) and 21 (catalogue fields: capacity, tags).
- Reuse tag: adapt (Apache-2.0; the box-and-first-match shape fits zones as data; the cell key is donor-specific).
- Brief rule served: 4 (zones are data on one runtime); rules 7-9 n/a

## 6. Gaps and risks
- Areas are hand-written tables plus generated dungeon boxes. Frankendom's zones are data (zones as data, one engine); the table format is the reusable part, the 255-line JS file is not.
- First match wins by array order only. Overlapping boxes need a rule from Lead.
- The 32-bit shift wraps coordinates beyond int32. Frankendom must not copy the cell key without checking its world range.
- Dungeon boxes come from spawn points, not geometry. A position inside the dungeon but outside the spawn spread falls outside the area.
- Server-verified kills: resolve() reads a location; the server must supply that location, never the client. Tags such as party_required must not gate rewards on the client; MAX_ATTACKERS = 3 stays in the engine, not in an area tag.
- The area test is a classifier for a hunting-spot index in a single-player server; it contains no spawn, aggro or reward logic. Where `spotCapacity` is enforced was not read.
