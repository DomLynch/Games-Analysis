# flareteam-flare-engine (zones-world, cell 3)

Donor: `/mnt/frankendom-donors/flareteam-flare-engine/src/MapRenderer.cpp` | Licence: GPL-3.0-or-later (per the MapRenderer.cpp header: "either version 3 of the License, or (at your option) any later version"; the COPYING file is GPL v3) | C++ | symbol `MapRenderer::pushEnemyGroup` (with `MapRenderer::enemyGroupPlaceEnemy`, `EntityManager::handleNewMap`, `EntityManager::isCleared`)

Checked: Read in full: MapRenderer.cpp 92-165 (placement and group push), 176-240 (load); Map.cpp 599-770 (group key parse); UtilsMath.h 34-66 (random helpers); EntityManager.cpp 113-192 (map-load entity build) and 445-454 (isCleared); MapCollision.cpp 226-262 (tile check and collide branch); Entity.cpp 350-362; GameStatePlay.cpp 328-337 and 914-923; MapRenderer.cpp 1185-1200. Read in part: Map.h 67-160 (Map_Group and Map_Enemy defaults), MapSaver.cpp 202-248 (writeEnemies). Not read: EnemyGroupManager::getRandomEnemy (the level-range pick), the float MapCollision::isValidPosition, StatBlock::setWanderArea, the map-file reader that fills [enemy] blocks, the rest of isValidTile below line 262. Confidence: high for the group spawn and the load order; medium-high for "placement does not avoid tiles taken by other members", which rests on the COLLIDE_TYPE_NONE branch (MapCollision.cpp 242-251) because the float isValidPosition was not read. Camera: not applicable (zones topic). Cell N = list column value 3.

Best transferable idea: A zone's enemy groups are rolled once per map load (a chance gate, an inclusive count range, and bounded random placement with a row-major fallback), so a zone is a data record that is re-rolled on each entry, not a timer.
Decision (proposed): adapt - the group record is the zone-data shape row 23 needs (chance, count range, area, requirement gate); the donor has no population cap across groups, no respawn timer and no despawn grace, and it re-rolls on every load, so Frankendom keeps server-owned population state and adds those rules; reject re-rolling on every load as the whole rule.
Acceptance: A server test loads a zone with a group of 2..4 members, chance 50 and a 3x3 area, and asserts that the group is rolled once per zone load, members land on distinct walkable tiles, and any shortfall is reported with its count.

## 1. Mechanism

- A zone's population is a list of enemy groups read from the map file (Map.cpp `loadEnemyGroup`, 599-770). A group has a category (the enemy types it may use), a level range (610-611), a rectangle (pos plus size; size 0 means a single point, 615-618), a count range (622-623), a chance percent clamped to 0..100 (626-627), a direction (random by default), a wander radius (default 4, Map.h 69 and 100; a waypoint list for a single-enemy group sets it to 0, 648), requirement lists (status, level, currency, item, class; 657-742), invincible requirement lists (743-762) and a spawn-level rule (765).
- Load order: `MapRenderer::load` (176) calls `Map::load`, then calls `pushEnemyGroup` for every group (223-225). So the whole population of a zone is decided on load, before any entity exists.
- `pushEnemyGroup` (119-165), in order:
  - (a) chance gate: if the group's chance roll fails, return (121-123). `percentChanceF(p)` is `randBetweenF(0, 100) < p` (UtilsMath.h 63-64), with `randBetweenF` scaling `rand()` by `RAND_MAX` (51-53).
  - (b) count: `enemies_to_spawn = randBetween(numbermin, numbermax)`, an inclusive range (132; UtilsMath.h 45-48).
  - (c) miss budget: `allowed_misses = 5 * numbermax` (135).
  - (d) loop while members are owed and the budget is not spent: pick a random tile in the area (139-140) and try `enemyGroupPlaceEnemy` (142). On success count one down; on failure spend one miss (144-145).
  - (e) if members are still owed, scan the area row by row from pos and place into free tiles (147-160).
  - (f) if members are still owed, log an error with the group's numbers (161-164). The shortfall is not kept as a count.
- `enemyGroupPlaceEnemy` (92-117): accepts a tile if the walkable check passes with COLLIDE_TYPE_NONE (93). It picks an enemy type from the category and level range (94), then makes a `Map_Enemy` with a direction (98), wander radius (99), requirements (100), invincible requirements (101), waypoints for single-enemy groups (103-108) and the spawn level (110), and pushes it onto the zone's enemy queue (112).
- Entity build, `EntityManager::handleNewMap` (113-172), runs when the map is entered (GameStatePlay.cpp 337 loads the map and 382 builds the entities). It deletes the previous map's entities except hero allies (119-127; allies kept at 123). Then for each queued enemy it skips the member if its requirements fail now (148-149), creates the entity from its prototype, sets the position and direction (154-156), sets the wander flag and area (157-158), copies the invincible requirements (159), applies the spawn level from the hero's stats (162-164), recalculates (167), and blocks the tile (171).
- Clear state: `EntityManager::isCleared` (445-454) returns true when no live entity that is not a hero ally exists, and an empty list is cleared (446, 449). GameStatePlay sets `mapr->enemies_cleared` in its play logic step, next to `mapr->logic` (921-922; the enclosing function was not read in full). On-clear events run once it is set (MapRenderer.cpp 1191-1193).
- Immunity gate: for a target that is not the hero and not an ally, a hazard is not applied when the target's invincible requirements are met (Entity.cpp 355-357; the enclosing function was not read in full).
- Persistence: `MapSaver::writeEnemies` (202-215) writes the group records back out. The code read writes no live enemy state, so a zone's population is rebuilt from its groups on each load.

## 2. Key functions

- `MapRenderer::pushEnemyGroup`: `/mnt/frankendom-donors/flareteam-flare-engine/src/MapRenderer.cpp` 119-165 (chance gate, count, miss budget, random loop, row-major fallback, shortfall log).
- `MapRenderer::enemyGroupPlaceEnemy`: `/mnt/frankendom-donors/flareteam-flare-engine/src/MapRenderer.cpp` 92-117 (walkable check, type pick, member fields, queue push).
- `MapRenderer::load`: `/mnt/frankendom-donors/flareteam-flare-engine/src/MapRenderer.cpp` 176-225 (calls pushEnemyGroup per group at 223-225).
- `Map::loadEnemyGroup`: `/mnt/frankendom-donors/flareteam-flare-engine/src/Map.cpp` 599-770 (zone data keys and clamps).
- `EntityManager::handleNewMap`: `/mnt/frankendom-donors/flareteam-flare-engine/src/EntityManager.cpp` 113-192 (delete, requirement gate, build, block).
- `EntityManager::isCleared`: `/mnt/frankendom-donors/flareteam-flare-engine/src/EntityManager.cpp` 445-454.
- `Math::percentChanceF` and `Math::randBetween`: `/mnt/frankendom-donors/flareteam-flare-engine/src/UtilsMath.h` 45-65.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One chance roll per group per load; a failed roll leaves the group empty | Chance is a float 0-100, default 100 (theirs, Map.cpp 627; Map.h 97) |
| Count drawn inclusively from a range | Default range 1..1 (theirs, Map.h 95-96; draw at MapRenderer.cpp 132) |
| Bounded random placement, then a fallback scan | Miss budget 5 times the maximum (theirs, MapRenderer.cpp 135) |
| Placement area: pos plus size, size 0 is a point | Area default 1x1 (theirs, Map.h 92); a point group has no fallback scan (the loops run zero times, 151-152) |
| Wander leash around the spawn | Default wander radius 4 (theirs, Map.h 69, 100); a waypoint list sets it to 0 (theirs, Map.cpp 648) |
| Requirement gate evaluated at load | Requirement lists are per group (theirs, Map.cpp 657-742; checked at EntityManager.cpp 148) |

Zone data versus engine rule: chance, count range, area, category, level range, wander radius, requirements and invincible requirements are per group, so zone data. The miss factor of 5 and the random pick over the area are engine rules.

## 4. TypeScript sketch

simplified: The sketch keeps the donor order: the chance gate, the inclusive count range, the miss budget of 5 times the maximum, the random placement loop, and the row-major fallback. It omits the category and level pick (EnemyGroupManager::getRandomEnemy, not read), the direction, wander and waypoint copies, the invincible requirements, the spawn-level rule, the hero-ally rule, the entity build and the enemies-cleared check. It makes one deliberate change: it records chosen tiles so two members never share a tile, which the donor does not do. The donor's float isValidPosition is replaced by a walkable callback.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Pt { x: number; y: number; }

interface EnemyGroup {
  pos: Pt;                   // top-left tile, zone data
  size: Pt;                  // width and height in tiles; 0 means a single point (donor: area 0)
  chance: number;            // percent 0..100, zone data, read once per map load
  countMin: number;          // zone data
  countMax: number;          // zone data
  requirementsMet: boolean;  // status or level gate, evaluated once per map load
}

const MISS_FACTOR = 5;       // engine constant: random misses allowed = MISS_FACTOR * countMax

function percentChance(percent: number, rnd: () => number): boolean {
  return rnd() * 100 < percent;
}

// Inclusive range, as the donor's randBetween.
function randBetween(lo: number, hi: number, rnd: () => number): number {
  if (lo === hi) return lo;
  return lo + Math.floor(rnd() * (hi - lo + 1));
}

function randomCell(g: EnemyGroup, rnd: () => number): Pt {
  const x = g.size.x === 0 ? g.pos.x : g.pos.x + Math.floor(rnd() * g.size.x);
  const y = g.size.y === 0 ? g.pos.y : g.pos.y + Math.floor(rnd() * g.size.y);
  return { x, y };
}

// Returns the tiles to fill for this group on this map load. Empty when the group is gated off or its chance fails.
function placeGroup(g: EnemyGroup, rnd: () => number, walkable: (p: Pt) => boolean, taken: Set<string>): Pt[] {
  if (!g.requirementsMet) return [];
  if (!percentChance(g.chance, rnd)) return [];

  const key = (p: Pt): string => `${p.x},${p.y}`;
  const usable = (p: Pt): boolean => walkable(p) && !taken.has(key(p));   // taken check: a change from the donor, which only checks walkability

  let toSpawn = randBetween(g.countMin, g.countMax, rnd);
  let misses = MISS_FACTOR * g.countMax;
  const out: Pt[] = [];

  while (toSpawn > 0 && misses > 0) {
    const p = randomCell(g, rnd);
    if (usable(p)) {
      out.push(p);
      taken.add(key(p));
      toSpawn--;
    } else {
      misses--;
    }
  }

  // Fallback: the first free tiles in row-major order inside the area.
  for (let x = g.pos.x; x < g.pos.x + g.size.x && toSpawn > 0; x++) {
    for (let y = g.pos.y; y < g.pos.y + g.size.y && toSpawn > 0; y++) {
      const p = { x, y };
      if (usable(p)) {
        out.push(p);
        taken.add(key(p));
        toSpawn--;
      }
    }
  }

  // Anything still missing is a shortfall; the caller must report it, not drop it silently.
  return out;
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (parity row 23, zone population): the group record as zone data (chance, count range, area, requirement gate), the once-per-load roll, the bounded placement with occupancy, and the shortfall counter.
- Plainly: row 23 also asks for a population cap across groups, a respawn timer and a despawn on empty with a grace timer. The donor has none of these; it re-rolls on every map load and has no timer. So this donor covers the spawn shape only, and the cap, respawn and grace must come from elsewhere.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: zones as data (rule); row 23 for the spawn shape; the server must own population state (row 23 and the one-engine rule).

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism, not from the lines.
- Rolls happen once per map load. A group that fails its chance, or whose requirement is not met, is empty for that visit, and nothing re-rolls it. Row 23 needs a respawn rule the donor does not have.
- Population is rebuilt from the group records on each load (MapSaver writes only the records, 202-215), so a zone repopulates when the player re-enters. The donor has no saved live state to contradict that. Frankendom's ledger needs the opposite choice, and that choice is for Lead to decide.
- No occupancy during placement: `pushEnemyGroup` does not block the tiles it fills (92-117 has no collider block), and COLLIDE_TYPE_NONE skips the entity checks (MapCollision.cpp 242-251). Members of one group, or of two groups, can share a tile. The donor blocks each entity only after it is created (EntityManager.cpp 171). The sketch tracks taken tiles; Frankendom must too.
- A shortfall is logged and not counted (MapRenderer.cpp 161-164). Frankendom needs a counter the server can report.
- Empty zones count as cleared: `isCleared` returns true with no entities (EntityManager.cpp 446). So a zone whose groups all rolled empty counts as cleared at once, and its on-clear events fire on the next event check after the flag is set (922; MapRenderer.cpp 1191-1193; the frame order was not traced). Frankendom's clear must come from the server ledger, not from the absence of spawned entities.
- The miss factor of 5 (135) and the default wander radius of 4 (Map.h 69) are hard numbers. Frankendom should keep the miss factor as an engine constant and the wander radius as zone data.
- Requirements are checked once at load (EntityManager.cpp 148-149). A quest change while the player stays in the zone does not add or remove members until the next load. Any live gate in Frankendom must be rechecked on each tick or on each event, not only at load.
- Not read: EnemyGroupManager::getRandomEnemy, StatBlock::setWanderArea, the float isValidPosition, the map-file reader that fills the [enemy] blocks.
