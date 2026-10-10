# exult-exult (zones-world, cell 3)

Donor: `/mnt/frankendom-donors/exult-exult/objs/egg.cc` | Licence: GPL-2.0-or-later (per the egg.cc header: "either version 2 of the License, or (at your option) any later version"; the COPYING file is GPL v2) | C++ | symbol `Egg_object::hatch` (with `Egg_object::is_active`, `Monster_egg::hatch_now`, `Map_chunk::find_spot`, `Game_window::emulate_cache`, `Game_map::cache_out`)

Checked: Read in full: egg.cc 294-351 (Monster_egg), 761-799 (set_area), 829-924 (is_active, all criteria), 1296-1352 (hatch), 668-696 (constructor bit fields); egg.h 52-128 (fields, enum), 177-234 (can_unhatch, reset); chunks.cc 1265-1309 (find_spot); gamemap.cc 1752-1877 (cache_out, cache_out_schunk); gamewin.cc 3008-3101 (emulate_cache); actors.cc 4763-4811 (switched_chunks). Read in part: chunks.cc 591-629 (activate_eggs; the per-tile mask setter at 236-292 only skimmed). Not read: Monster_actor::create, Map_chunk::is_blocked, Get_square (ring order), Actor::cache_out, the game clock. Confidence: high for the egg spawn path and the latch; medium for the exact re-arm timing, because the chunk window is traced from the caller and the setter was not read in full. Camera: not applicable (zones topic). Cell N = list column value 3.
Best transferable idea: A spawn point rolls once per trigger entry and latches (the latch is set even on a failed roll), and the latch is re-armed by a window rule rather than a timer.
Decision (proposed): adapt - Frankendom zones are data and row 23 needs caps, respawn and a despawn grace, which this donor does not have; take the one-roll latch, the entry trigger, the random count range and the ring placement, and reject the superchunk byte serialisation because we load zone data rather than save world state.
Acceptance: A server test asserts that a spawn point with chance 50 and count 1..3 rolls once per entry, a failed roll still uses the entry, the point does not roll again until the player has left its re-arm distance, and each monster lands on a free tile within 5 tiles or the shortfall is counted, not dropped.

## 1. Mechanism

- Population is a set of spawn points placed as "egg" objects on the map, not a list of spawn records. Each egg carries a trigger criteria, a trigger area (derived from its distance field), a chance from 1 to 100, and four flags: nocturnal, once, starts-hatched and auto_reset (egg.cc 678-690; egg.h 56).
- Trigger path: `Chunk_cache::activate_eggs` (chunks.cc 591-629) walks the egg bits for a tile. Its callers include actor moves (actors.cc 4754 and 5288), dropping objects (drag.cc 759, 916) and the barge code (barge.cc 884); those call sites were found by grep and not read. A 16-bit mask per tile selects eggs; eggs past the 15th are checked in a separate loop (chunks.cc 613-628). For each egg `is_active` decides, and `hatch` runs if it returns true (chunks.cc 604-607).
- `is_active` order (egg.cc 829-924): map editor off; then the latch: a hatched egg that is not auto_reset returns false (837-838); then the nocturnal band, which blocks a nocturnal egg when the hour is between 5 and 20 (840-846); then the criteria switch. For avatar_near the actor must be the main actor (873), and the case then falls through to party_near (878-880), which also requires the in_party flag (881-883), and the step must go from outside the area to inside it (896). For cached_in (criteria 0) the area is 64x64 tiles centred on the egg (769); the first trigger fires (865-867); with auto_reset a later trigger fires only on re-entry from outside (870).
- `hatch` (egg.cc 1296-1352): roll = 1 + rand() % 100 (1334). If roll <= probability, `hatch_now` runs (1335-1339). A once egg is removed after a successful hatch only when it cannot be unhatched (`!can_unhatch()`, 1345-1347); `hatch` also returns early when the egg can be unhatched and is already hatched (1330-1332). After the roll, the hatched latch is set whether or not the roll hit (1350-1351). So each latch gets exactly one roll: a failed roll uses up the trigger until the latch is cleared.
- Monster egg (`Monster_egg::hatch_now`, egg.cc 324-336): nothing happens during armageddon (328). For an NPC shape the count is `cnt`, randomised to 1 + rand() % cnt when cnt > 1 (331-333), and one monster is created per count (335-336). `create_monster` (299-307) calls `Map_chunk::find_spot` with radius 5 and max_drop 1 (300) and creates the monster only if a tile is found (301). A non-NPC shape creates an item instead (338-349; read, not otherwise followed).
- Ring search (`Map_chunk::find_spot`, chunks.cc 1265-1309): the origin is tried first (1284-1286). Then rings d = 1..dist are tried; ring d has 8d tiles (1292-1293); the walk starts at a random direction (1288-1291) offset by d/2 (1298); the first tile that is not blocked is taken (1301-1306). If none is free it returns (-1, -1, -1) (1308).
- Re-arm: `Main_actor::switched_chunks` calls `Game_window::emulate_cache` on each chunk change (actors.cc 4810); `Game_window::set_camera_actor` also calls it when the camera returns to the main actor in a new chunk (gamewin.cc 1150). `emulate_cache` compares the old and new 5x5 chunk windows (2 chunks each side; gamewin.cc 3023-3030). Eggs in old-window chunks that are outside the new window get `reset()` (3079-3080); the base `Egg_object::reset` first calls `unhatch_now` when the egg is hatched and can be unhatched, then clears the hatched latch (egg.h 227-234). `Monster_egg` does not override reset, so it re-arms. Temporary objects in those chunks are removed (3081-3094). `Field_object` overrides reset to return false (egg.h 262-264), so it does not take that path.
- Streaming (same zone, separate mechanism): a superchunk is 16x16 chunks of 16x16 tiles, and a map is 12x12 superchunks (exult_constants.h 31-35). `ensure_chunk_read` reads a superchunk that is not yet read (gamemap.h 136-143; `get_superchunk_objects`, gamemap.cc 1199-1206). Its callers were not traced, so when the read happens is not confirmed. When the POV changes chunk, `Game_map::cache_out` (gamemap.cc 1752-1791, called from gamewin.cc 3097) keeps the 3x3 superchunks around the POV and serialises each other read, unmodified superchunk into a byte buffer (`cache_out_schunk`, 1793-1877; write at 1849). Its live objects are removed (1856-1859) and its actors are cached out (1862-1864). A modified superchunk is never cached out (1802-1803). On a map switch the whole old map is cached out (gamewin.cc 3098-3100).

## 2. Key functions

- `Egg_object::is_active`: `/mnt/frankendom-donors/exult-exult/objs/egg.cc` 829-924 (latch 837-838; nocturnal 840-846; criteria switch 850-923).
- `Egg_object::hatch`: `/mnt/frankendom-donors/exult-exult/objs/egg.cc` 1296-1352 (roll, hatch_now call, once removal, latch).
- `Monster_egg::hatch_now` and `create_monster`: `/mnt/frankendom-donors/exult-exult/objs/egg.cc` 299-336 (count, armageddon guard, placement call).
- `Egg_object::set_area`: `/mnt/frankendom-donors/exult-exult/objs/egg.cc` 761-799 (trigger square per criteria; the cached_in 64x64 square at 769; default square at 792).
- `Chunk_cache::activate_eggs`: `/mnt/frankendom-donors/exult-exult/objs/chunks.cc` 591-629 (per-tile mask walk).
- `Map_chunk::find_spot`: `/mnt/frankendom-donors/exult-exult/objs/chunks.cc` 1265-1309 (origin, then rings).
- `Game_window::emulate_cache`: `/mnt/frankendom-donors/exult-exult/gamewin.cc` 3008-3101 (window compare; reset of eggs; temp removal; cache_out call).
- `Main_actor::switched_chunks`: `/mnt/frankendom-donors/exult-exult/actors.cc` 4763-4811 (calls emulate_cache at 4810).
- `Game_map::cache_out` and `cache_out_schunk`: `/mnt/frankendom-donors/exult-exult/gamemap.cc` 1752-1791 and 1793-1877 (3x3 keep set; unmodified-only; serialisation).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One roll per trigger; hit if roll <= chance; the latch is set either way | Chance is a byte 1-100 per egg (theirs, egg.h 56; roll at egg.cc 1334-1335) |
| Random spawn count between 1 and a per-point maximum | Maximum is the 6-bit field `(d1 & 0xff) >> 2`, so up to 63 (theirs, egg.cc 314, 333) |
| Trigger square around the point | Half-width is the 5-bit distance field, 0-31 tiles (theirs, egg.cc 679, 792); cached_in uses a fixed 32 tiles each way (theirs, egg.cc 769) |
| Placement by ring search from the point | Radius 5 and max_drop 1 (theirs, egg.cc 300); ring d has 8d tiles (theirs, chunks.cc 1293) |
| Re-arm by distance from the player's chunk window | Window is 2 chunks each side, 5x5 (theirs, gamewin.cc 3023, 3027-3030); chunk is 16 tiles (theirs, exult_constants.h 31) |
| Nocturnal gate by time of day | Active outside hours 5 to 20 (theirs, egg.cc 843) |
| Global spawn stop | Armageddon flag (theirs, egg.cc 328) |

Engine-fixed versus zone data: chance, count maximum, trigger radius, nocturnal and once flags, auto_reset, and the criteria are per egg, so they are zone data. The search radius (5), the cached_in radius (32), the 5x5 window (2 chunks), the 16-tile chunk and the night band are fixed in the engine.

## 4. TypeScript sketch

simplified: The sketch keeps the entry-based trigger (the donor's avatar_near rule, egg.cc 896), the one-roll latch that is set even on a miss (egg.cc 1334-1351), the count rule (1 + rand % cnt when cnt > 1, egg.cc 331-333), the ring search with its random start and d/2 offset (chunks.cc 1288-1298), and the window re-arm. It omits the cached_in 64x64 trigger and the avatar_far rule, the nocturnal band, the once flag, the item branch for non-NPC eggs, armageddon, the lift (deltaz) checks, the party-membership check, the 16-bit per-tile mask and its overflow loop, the blocked-tile test (Map_chunk::is_blocked, not read), and the donor's ring order (Get_square, not read; the sketch walks the perimeter clockwise). The re-arm uses the new chunk only, while the donor walks the old 5x5 window.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Tile { x: number; y: number; }

interface SpawnPoint {
  at: Tile;
  chance: number;        // 1..100, zone data
  countMax: number;      // spawn count is 1..countMax (0..63 in the donor's 6-bit field), zone data
  radius: number;        // trigger square half-width in tiles, zone data
  autoReset: boolean;    // re-arm on re-entry from outside the trigger, zone data
  latched: boolean;      // set after the first roll, cleared only by re-arm
}

const SEARCH_RADIUS = 5;    // engine constant: spawn search radius in tiles
const WINDOW_CHUNKS = 2;    // engine constant: chunks kept armed around the player

function inTrigger(sp: SpawnPoint, t: Tile): boolean {
  return Math.abs(t.x - sp.at.x) <= sp.radius && Math.abs(t.y - sp.at.y) <= sp.radius;
}

// Called once per player step with the tile stepped from and the tile stepped onto.
// Entry-based rule only (the donor's avatar_near case); the donor's cached_in and avatar_far cases are not reproduced.
function shouldRoll(sp: SpawnPoint, from: Tile, to: Tile): boolean {
  if (sp.latched && !sp.autoReset) return false;
  return inTrigger(sp, to) && !inTrigger(sp, from);
}

// One roll per latch. The latch is set whether or not the roll hits.
// Returns the number of monsters to place.
function rollSpawn(sp: SpawnPoint, rnd: () => number): number {
  const roll = 1 + Math.floor(rnd() * 100);            // 1..100
  let count = 0;
  if (roll <= sp.chance) {
    count = sp.countMax > 1 ? 1 + Math.floor(rnd() * sp.countMax) : sp.countMax;
  }
  sp.latched = true;
  return count;
}

// Tiles at Chebyshev distance d from origin, clockwise from the top-left corner (simplified order).
function perimeter(origin: Tile, d: number): Tile[] {
  const out: Tile[] = [];
  for (let x = -d; x <= d; x++) out.push({ x: origin.x + x, y: origin.y - d });
  for (let y = -d + 1; y <= d; y++) out.push({ x: origin.x + d, y: origin.y + y });
  for (let x = d - 1; x >= -d; x--) out.push({ x: origin.x + x, y: origin.y + d });
  for (let y = d - 1; y >= -d + 1; y--) out.push({ x: origin.x - d, y: origin.y + y });
  return out;
}

// Ring search: the origin first, then rings d = 1..SEARCH_RADIUS. Each walk starts at a random direction.
// Returns null when nothing is free; the caller must count the shortfall, not drop it silently.
function findSpot(origin: Tile, free: (t: Tile) => boolean, rnd: () => number): Tile | null {
  if (free(origin)) return origin;
  const dir = Math.floor(rnd() * 8);
  for (let d = 1; d <= SEARCH_RADIUS; d++) {
    const ring = perimeter(origin, d);
    const n = ring.length;                               // 8 * d
    const pref = ((dir + 1) % 8) * d;
    let index = (pref - Math.floor(d / 2) + n) % n;
    for (let k = 0; k < n; k++) {
      const p = ring[index];
      if (free(p)) return p;
      index = (index + 1) % n;
    }
  }
  return null;
}

// Re-arm: a spawn point more than WINDOW_CHUNKS chunks from the player's chunk loses its latch.
// Simplified: the donor walks the old 5x5 window; this checks distance from the new chunk only.
function rearmIfOutsideWindow(sp: SpawnPoint, playerChunk: Tile, tilesPerChunk: number): void {
  const dx = Math.abs(Math.floor(sp.at.x / tilesPerChunk) - playerChunk.x);
  const dy = Math.abs(Math.floor(sp.at.y / tilesPerChunk) - playerChunk.y);
  if (dx > WINDOW_CHUNKS || dy > WINDOW_CHUNKS) sp.latched = false;
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (parity row 23, zone population): the spawn point record, the one-roll latch, the entry trigger, the random count range and the ring placement. The zone-data fields are chance, count maximum, trigger radius, auto_reset and the re-arm distance. Engine constants are the search radius, the re-arm window and the chunk size.
- Plainly: row 23 also asks for a population cap, a respawn timer and a despawn on empty with a grace timer. This donor has none of those. Eggs keep no count of live monsters and there is no timer; the only limit is the latch. So row 23 is only partly covered by this donor.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: zones as data (rule); row 23 for the spawn shape; the server must own the latch (server-verified kills rule applies to who clears it).

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not from the lines.
- No population cap. An egg places up to 63 monsters on one trigger and nothing counts live monsters from the same point. Frankendom needs its own cap (row 23) and must not rely on the latch for it.
- The latch is one roll per entry. A failed roll uses the spawn point until it is re-armed (egg.cc 1350-1351). Frankendom must decide and test whether a miss should use up the point; the donor does, by design of the flag.
- The re-arm is driven by where the player's client reports it is, through chunk changes (actors.cc 4810). In Frankendom the server must decide the re-arm from server-known positions. The donor is single-player and has no server, so none of its re-arm timing transfers as is.
- Nothing in the egg links a spawned monster back to its point. Monster death was not read, so the donor's behaviour when a spawned monster dies is unknown; the latch is not cleared by death in the code read.
- Placement can fail silently: when find_spot returns (-1, -1, -1), the monster is not created and nothing is counted (egg.cc 301). Frankendom must count and report the shortfall.
- The 5x5 window (2 chunks) and the 16-tile chunk are constants in the donor. Frankendom zones are data, so the re-arm distance should be a zone-data field, not a constant.
- Superchunk byte serialisation (gamemap.cc 1793-1877) saves live monster state into a buffer. Frankendom does not need that for zones, which are data; do not port it. The rule that a modified superchunk is never cached out (1802-1803) is an idea for persistent zone state, not part of this sketch.
- Not read: Monster_actor::create, Map_chunk::is_blocked, the Get_square ring order and Actor::cache_out.
- `hatch` takes a `must` flag that sets the roll to 0 (egg.cc 1334) and is passed to `hatch_now` (1339); the sketch's single roll does not model a forced hatch.
- In Serpent Isle, cached_in with a lift difference (deltaz / 5 != 0) on a monster egg marks it hatched (unless auto_reset) and returns false without hatching (egg.cc 854-860).

## Checker findings

- Verdict: MINOR
- Corrected: once-egg removal is conditional on !can_unhatch(); early return for can_unhatch() && is_hatched() added; Egg_object::reset also calls unhatch_now for hatched, unhatchable-capable eggs; avatar_near fall-through to party_near and its in_party requirement stated in the mechanism
- Missed (also added to section 6): hatch(must) flag skipping the dice roll; SI cached_in lift-difference path marking the egg hatched without hatching (854-860)
