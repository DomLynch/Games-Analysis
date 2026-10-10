# cuteshaun-lineage2-api (zones-world, cell 3)

Donor: `/mnt/frankendom-donors/cuteshaun-lineage2-api/src/lib/data/indexes.ts` (with `src/lib/api/dto/location.ts`) | Licence: MIT (repo `LICENSE` line 1 "MIT License", line 3 "Copyright (c) 2026 Andrii Tsapko") | TypeScript | symbols `resolveLocationForCoordinate`, `computePrimaryLocation`, `resolvePrimaryLocationForNpc`

Checked: The hint file `src/app/api/[chronicle]/locations/route.ts` (43 lines, read in full) is only the catalogue endpoint. It returns the zone list unchanged (34-39). The mechanism is in the resolver. Opened: `src/lib/data/indexes.ts` 640-655 (sort), 1548-1640 (resolver, read in full); `src/lib/api/dto/location.ts` 92-203 (read in full apart from the module header); `src/lib/api/dto/npc.ts` 126-175 (doc) and 375-398 (call site); `src/lib/types.ts` 431-470 (type and doc); `LICENSE`. Callers found by grep (only `location.ts` 155 and `npc.ts` 391 were read): `npc.ts` 391 (NPC detail, via `resolvePrimaryLocationForNpc`); `quest.ts` 370 (quest start location, via `computePrimaryLocation`); `spawn.ts` 58 (per-spawn DTO, via `resolveLocationForSpawn`); `tests/locations.snapshot.test.ts` (out-of-world null cases; not read). Not read: the DAT parser that writes `huntingzones.json` (the territory drop is stated in a comment only, types.ts 446), `loaders.ts`, `resolveRegionForCoordinate` (the M4 region path). Confidence: high on the resolver, the threshold test and the home-zone rule (each line receipted). The 10000-unit figure is the code's constant, not checked against the game data. camera_scope: not applicable (zones topic).

## 1. Mechanism

- Zones are authored as single centre points (anchors), not polygons. The types doc says so (`types.ts` 439-442). Each zone has an id, a type byte, a minimum level (0 means none), and `(x, y, z)` (`types.ts` 451-470).
- Catalogue order: zones are sorted by id once per chronicle (`indexes.ts` 649), and `getHuntingZones` returns that list (1567-1569). The route maps each to a reference DTO and returns the whole list (`route.ts` 34-39). No pagination.
- Point lookup, `resolveLocationForCoordinate` (`indexes.ts` 1599-1627), in order:
  - (a) An empty zone list returns null (1608-1609).
  - (b) The limit is the threshold squared, where the threshold is 10000 game units (1564, 1610-1611).
  - (c) Loop over all zones in id order (1614). Take the 2D offset from the anchor to the point, ignoring z (1615-1616). Take the squared distance (1617).
  - (d) A strictly smaller distance becomes the new best (1618-1620). An equal distance with a lower id also replaces it (1621-1623). Because the list is sorted by id, the strict test already keeps the lowest id, so the second branch cannot change the result (this follows from the sort at 649; not tested).
  - (e) Return the best zone only if its squared distance is at most the limit squared (1626). Otherwise null, so a point far from every anchor has no zone.
  - The z argument is accepted and unused (comment 1603-1606, and the 1557-1562 note on multi-floor zones).
- Spawn lookup: `resolveLocationForSpawn` (1633-1637) passes the spawn's x, y and z to the same resolver.
- Home zone of a group, `computePrimaryLocation` (`location.ts` 147-177):
  - (a) No spawns gives null (151).
  - (b) Each spawn is resolved (155). Spawns resolving to null are skipped (156). Per zone id, a count is kept (157-162).
  - (c) No counted zone gives null (164). Otherwise the zone with the largest count wins. On a tie, the lower id wins (166-175, the condition at 170).
  - (d) The chosen zone is converted to a reference DTO (176). Callers omit the field when the result is null (doc comment, `npc.ts` 167-171).
- Override wrapper, `resolvePrimaryLocationForNpc` (`location.ts` 189-203): an NPC id found in the override map (194) returns that zone if the chronicle has it (196-197). Otherwise it falls through to the home-zone rule (202). The map has one entry, NPC 29001 mapped to zone 34 (128-130). The doc comment gives its reason: the nearest zone for the boss's spawns was a surface zone at 8845 units, while the dungeon zone sat at 12846 units, just outside the threshold (comment `location.ts` 119-122; the distances are the comment's, not checked against the data).
- Call sites: the NPC detail builder computes the home zone from the cleaned spawns (`npc.ts` 375-391). The quest builder uses `computePrimaryLocation` on the quest's start spawns (`quest.ts` 370). The region-based home value is computed just before the NPC zone (380, `computePrimaryRegion`, not read; the rule is documented as mode by region id with lowest-id tie, `npc.ts` 126).
- Timing: the resolver runs per request. There is no per-frame loop. Cost is one pass over all anchors per point (the doc says so, `indexes.ts` 1590-1592).

## 2. Key functions

- `resolveLocationForCoordinate`: `/mnt/frankendom-donors/cuteshaun-lineage2-api/src/lib/data/indexes.ts` 1599-1627. Nearest anchor within the threshold; null otherwise.
- `LOCATION_NEAREST_DISTANCE_THRESHOLD`: same file, 1564. Global threshold, 10000 units.
- `computePrimaryLocation`: `/mnt/frankendom-donors/cuteshaun-lineage2-api/src/lib/api/dto/location.ts` 147-177. Most frequent resolved zone among spawns, lowest id on a tie.
- `resolvePrimaryLocationForNpc`: same file, 189-203. Audited override first, then the home-zone rule.
- Catalogue route: `/mnt/frankendom-donors/cuteshaun-lineage2-api/src/app/api/[chronicle]/locations/route.ts` 27-40 (read in full).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Nearest authored anchor, brute-force squared 2D distance, reject beyond a radius | Radius 10000 game units, one global value (theirs, `indexes.ts` 1564) |
| Ties go to the lowest id (list sorted by id) | None |
| Home zone = most frequent resolved zone among a group's members, lowest id on a tie | None (counts spawns; not time or kills) |
| Audited override from a member id to a zone id, applied before the rule | One entry: 29001 to 34 (theirs, `location.ts` 129) |
| Anchor-only zones with no polygon | Anchors are centres (theirs, `types.ts` 439-442) |

## 4. TypeScript sketch

simplified: the sketch keeps the nearest-anchor search with the squared threshold, the lowest-id tie, the home zone as the most frequent resolved zone, and the override applied first. It omits the z argument (the donor ignores it), the chronicle lookup and per-chronicle index, the DTO name normalisation and the 0-to-null level mapping, the omission of the field when the result is null, the territory filter at parse time, and the equal-distance branch (which the sort makes unnecessary). It takes anchors already sorted by id, as the donor does (`indexes.ts` 649).

```ts
// Licence: MIT (donor, cuteshaun-lineage2-api, Copyright (c) 2026 Andrii Tsapko). Adaptable; this sketch is a rewrite of the shape.
interface Anchor { id: number; x: number; y: number; minLevel: number; }
interface Spawn { x: number; y: number; }

const THRESHOLD = 10000;   // max 2D distance in game units (donor: LOCATION_NEAREST_DISTANCE_THRESHOLD)

// Nearest anchor by squared 2D distance, ties to the lowest id, null beyond the threshold.
// Assumes anchors are sorted by id ascending, so a strict "<" already keeps the lowest id on a tie.
function resolveZone(anchors: Anchor[], x: number, y: number): Anchor | null {
  if (anchors.length === 0) return null;
  const limit2 = THRESHOLD * THRESHOLD;
  let best: Anchor | null = null;
  let bestD2 = Number.POSITIVE_INFINITY;
  for (const a of anchors) {
    const dx = a.x - x;
    const dy = a.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) { bestD2 = d2; best = a; }
  }
  return best !== null && bestD2 <= limit2 ? best : null;
}

// A group's home zone: the most frequent resolved zone among its spawns, ties to the lowest id.
// Spawns that resolve to nothing are skipped; no resolved spawn gives null (the field is omitted).
function homeZone(anchors: Anchor[], spawns: Spawn[], overrideZoneId?: number): Anchor | null {
  if (overrideZoneId !== undefined) {
    const forced = anchors.find((a) => a.id === overrideZoneId);
    if (forced) return forced;
  }
  const counts = new Map<number, { zone: Anchor; count: number }>();
  for (const s of spawns) {
    const z = resolveZone(anchors, s.x, s.y);
    if (!z) continue;
    const hit = counts.get(z.id);
    if (hit) hit.count += 1;
    else counts.set(z.id, { zone: z, count: 1 });
  }
  let best: Anchor | null = null;
  let bestCount = -1;
  let bestId = Number.POSITIVE_INFINITY;
  for (const { zone, count } of counts.values()) {
    if (count > bestCount || (count === bestCount && zone.id < bestId)) {
      bestCount = count;
      bestId = zone.id;
      best = zone;
    }
  }
  return best;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/zw010-lineage-nearest-anchor.ts`, exit 0.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population engine logic: attributing a spawn to a zone). Parity-checklist row 23 (zone population). Used for labels and per-zone population budgets; containment for legality stays with the zone polygons (row 23 as well).
- Reuse tag: adaptable (MIT; keep the copyright notice in any copied code). This sketch is a rewrite of the shape.
- Brief rule served: zones as data on one runtime (zone anchors and radius are data); parity row 23.

## 6. Gaps and risks

- MIT: adaptable. Keep the notice if any code is copied; this note's sketch is a rewrite.
- One threshold for every zone: 10000 (`indexes.ts` 1564) applies to all zones. Frankendom zones differ in size, so the radius must be a per-zone data field, not a global constant.
- Anchors have no size or shape. A point near a small zone's centre resolves to it even if it is outside the zone's real edge. Use the anchor only for labels and budgets where a zone has no polygon. Legality (a spawn inside a zone, a kill inside a zone) must use containment.
- Brute force: one pass over all anchors per point, per request (`indexes.ts` 1590-1592). Fine for a web catalogue. In a Frankendom server tick, resolve each spawn's zone once at spawn time and store the id; do not resolve every tick.
- z is ignored (the note at 1557-1562: a multi-floor dungeon collapses to one anchor). Frankendom must decide how multi-level zones are represented before using this.
- The home-zone rule counts spawns, not time, kills or players. It describes where a creature was placed, not where players fight it.
- The override map is audit-justified per entry (`location.ts` 104-127). Frankendom should keep overrides in zone data with an audit reference, not in code.
- Not read: the DAT parser and the territory drop (stated in a comment only, `types.ts` 444-449), `loaders.ts`, and the M4 region resolver.

Best transferable idea: name a position by the nearest authored anchor within a fixed radius, and take a group's home zone as the most frequent zone among its members, with ties going to the lowest id.
Decision (proposed): adapt — Use nearest-anchor-within-radius for zone labels and population attribution where a zone has no polygon, with the radius as zone data. Keep polygon containment for anything that decides legality.
Acceptance: a server test places a spawn 9,000 units from a zone anchor whose radius is 10,000 and expects that zone; a spawn 11,000 units from every anchor expects no zone; a creature with three spawns in zone 7 and three in zone 4 reports zone 4 (lowest id on a tie).

Reuse tag: adaptable (MIT; keep the copyright notice in any copied code)
Brief rule served: zones as data on one runtime; parity row 23 (zone population).
