# exult-exult (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/exult-exult/objs/egg.cc` (main: `Monster_egg::hatch_now` 324-351, `Egg_object::is_active` 829-), `/mnt/frankendom-donors/exult-exult/objs/egg.h`, `/mnt/frankendom-donors/exult-exult/objs/chunks.cc` (`Chunk_cache::activate_eggs` 591-625, `Map_chunk::find_spot` 1265-1317) | Licence: GNU GPL, version 2 or any later version (per the `egg.cc` header, lines 7-8: "either version 2 of the License, or (at your option) any later version"; `COPYING` is GPL-2.0) | C++ | symbol `Egg_object::hatch`

Checked: Read the egg spawn point end to end: the trigger call from the actor's tile change (`actors.cc` 4754 calls `activate_eggs`; the enclosing function was not read), `Chunk_cache::activate_eggs` (591-625: each egg's `is_active` at 605, then `hatch` at 607), `Egg_object::is_active` (829-: hatched gate 837-838, nocturnal gate 843-845, `avatar_near` and `party_near` cases 872-896), `Egg_object::set_area` (761-799), `Egg_object::hatch` (1296-1352: the roll, the hatch call, the once removal, the hatched flag), `Monster_egg` (294-352: `create_monster`, the count and schedule decode, `hatch_now`), `Map_chunk::find_spot` (1265-1317, read in full) and the flag and criteria enums in `egg.h` (96-126, `can_unhatch` at 177-178). Not read: the other egg subclasses (jukebox, missile, usecode, teleport, path, field), `Monster_actor::create`, the other `nocturnal` check at `egg.cc` 959 (belongs to another criteria, not read), the map-editor branch in `is_active`, and the enclosing function of `actors.cc` 4754. Only one trigger site was read. Confidence: high on the trigger, roll and group count; high on `find_spot` order; medium on which actor types reach the trigger in every path (only the call site at `actors.cc` 4754 was read). camera_scope: not applicable (spawns topic).

Best transferable idea: a spawn point is a data record with a tile-entry trigger square, one percentage roll per entry, a group size, once or re-arm flags, a night-only flag, and a placement search that starts at the spawn tile and rings outward.

Decision (proposed): adapt - the spawn point as zone data (square radius, chance, group size, once or re-arm, night window) is a clean fit for a server zone director; the GPL licence means we write our own code from the shape only, and the trigger must be checked by the server on the tile the player enters, not by client placement.
Acceptance: a server test walks a seeded player into a spawn square and asserts exactly one edge trigger per entry, no trigger between hours 5 and 20 for a night-only point, and at most `groupMax` foes placed at free tiles within the placement radius; a player walking into the square sees the group appear around the spawn tile, not on top of the player.

## 1. Mechanism

- Each egg is a map object with a trigger criteria, a trigger radius (`distance`, 5-bit field from the record, `egg.cc` 679), a probability 0-100 (`probability`), flags `nocturnal`, `once`, `hatched`, `auto_reset` (`egg.h` 96-99), and data words for the spawned shape, schedule, alignment and group size (`egg.cc` 314, `Monster_egg` constructor).
- Trigger: when an actor's tile changes, `actors.cc` 4754 calls `activate_eggs` on the chunk list. `Chunk_cache::activate_eggs` (591) walks the chunk's eggs; for each egg whose `is_active` is true (605), it calls `hatch(obj, now)` (607). Order: `is_active` first (is the trigger legal for this actor and tile), then `hatch` (is the roll won).
- `is_active` (829), in the order the code runs: (a) map-editor disables it (cheat check at 834; not read further). (b) If already hatched and not auto-reset, return false (837-838). (c) If nocturnal and the hour is 5 to 20 inclusive, return false (843-845: `hour < 21 && hour > 4` means "not night"). (d) Criteria switch. `avatar_near` accepts only the main actor (873); `party_near` requires the object to be in the party (the `in_party` check). Both then require the lift to be close (`deltaz / 2 == 0` for most types, 891-896), the new tile inside the area and the old tile outside (896). This is an edge trigger: entering the square, not standing in it.
- Area (`set_area`, 761-799): for the default criteria, a square of `distance` tiles each side: `width = 2 * distance`, then `width++` (784-785), `TileRect(t.tx - distance, t.ty - distance, width, width)` (792). Clamped to the world (797-798).
- Hatch (`Egg_object::hatch`, 1296-1352): a monster egg is not "unhatchable" (`can_unhatch` default false, `egg.h` 177-178), so the hatched gate in `hatch` does not apply. The roll is `1 + rand() % 100` (1334), unless the caller passes `must` (roll 0). If `roll <= probability` (1335), `hatch_now` runs (1339). If the egg is `once` and not unhatchable, it is removed (1345-1346). The hatched flag is set after every attempt (1351).
- Monster egg `hatch_now` (324-351): for NPC shapes, return if armageddon (328), else `num = cnt`, and if `cnt > 1` then `num = 1 + rand() % cnt` (332-333), then `create_monster` `num` times (334-335). Non-NPC shapes create an item instead (not read further).
- `create_monster` (299-308): `find_spot(get_tile(), 5, mshape, 0, 1)` (300). If a tile is found (dest.tx != -1), create the monster with the egg's schedule and alignment (302), set its frame, mark it dirty and add it to the nearby NPC list.
- `Map_chunk::find_spot` (1265-1317): if the egg's own tile is free (1285-1286), use it. Otherwise pick a random side (`dir = rand() % 8`, 1289), then for each ring `d` from 1 to the radius, walk the ring starting near that side and return the first tile that is not blocked (1295-1303), else (-1, -1, -1).
- Re-arm: a monster egg with `auto_reset` is not blocked by `hatched` (837), so each entry re-rolls. Without `auto_reset`, it hatches at most once and `hatched` blocks further triggers (837-838).

## 2. Key functions

- `Chunk_cache::activate_eggs`: `/mnt/frankendom-donors/exult-exult/objs/chunks.cc` 591-625. Loop over the chunk's eggs; `is_active` at 605, `hatch` at 607.
- `Egg_object::is_active`: `/mnt/frankendom-donors/exult-exult/objs/egg.cc` 829-. Hatched gate 837-838; nocturnal gate 843-845; criteria 872-896.
- `Egg_object::set_area`: same file, 761-799. Square area 784-792.
- `Egg_object::hatch`: same file, 1296-1352. Roll 1334-1335; once removal 1345-1346; hatched flag 1351.
- `Monster_egg::create_monster` and `hatch_now`: same file, 299-351. Spot search 300; group size 332-335.
- `Map_chunk::find_spot`: `/mnt/frankendom-donors/exult-exult/objs/chunks.cc` 1265-1317. Start tile 1285-1286; random side 1289; ring walk 1295-1303.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Edge trigger on entering a square around the spawn point | Square of `distance` tiles each side, width 2 * distance + 1 (theirs, egg.cc 784-792; distance is a 5-bit record field, 679) |
| One percentage roll per trigger | `1 + rand() % 100` against `probability` 0-100 (theirs, egg.cc 1334-1335) |
| Night-only spawn point | Hours 5 to 20 blocked, night is 21 to 4 (theirs, egg.cc 843) |
| Once or re-arm | `once` removes after a hatch (theirs, 1345-1346); `auto_reset` clears the hatched gate (theirs, 837-838, egg.h 115) |
| Group size | `cnt = (d1 & 0xff) >> 2` (theirs, egg.cc 314); group = `1 + rand() % cnt` when cnt > 1 (theirs, 332-333) |
| Placement search around the spawn tile | Radius 5 (theirs, egg.cc 300); own tile first, then rings with a random starting side (theirs, chunks.cc 1286-1303) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: the trigger (re-arm and night gates, then the edge rule), then one percentage roll, group size, placement per member, once removal, hatched flag. It drops the map-editor and armageddon gates, the lift check, the `party_near` rule (the sketch uses the main-actor rule only, which is donor `avatar_near`), the non-NPC item branch, the `must` flag, the other egg types, the schedule and alignment fields, and the donor's exclusive bounds detail (`rollBelow` is assumed to return [0, n)). The placement function is supplied by the caller; the donor's ring walk is described in section 1 but not reproduced.

```ts
// Licence: GPL-2.0-or-later (donor, Exult). Clean-room: written from the described mechanism, not translated.
export interface Tile { x: number; y: number; }

export interface SpawnPoint {
  x: number;
  y: number;
  radius: number;         // trigger square half-size in tiles (donor: distance field)
  chancePct: number;      // 0..100 per entry (donor: probability)
  nightOnly: boolean;     // donor: nocturnal, not active from hour 5 to 20
  once: boolean;          // donor: removed after a successful hatch
  rearm: boolean;         // donor: auto_reset, may hatch again after re-entry
  hatched: boolean;
  removed: boolean;
  groupMax: number;       // donor: cnt; group is 1 + roll below cnt when cnt > 1
  placeRadius: number;    // donor: find_spot radius 5 for monster eggs
}

const inside = (sp: SpawnPoint, t: Tile): boolean =>
  Math.abs(t.x - sp.x) <= sp.radius && Math.abs(t.y - sp.y) <= sp.radius;

// Edge trigger: the player steps from outside the square to inside it.
export function isTriggered(sp: SpawnPoint, hour: number, from: Tile, to: Tile, isPlayer: boolean): boolean {
  if (sp.removed) return false;
  if (sp.hatched && !sp.rearm) return false;
  const night = hour >= 21 || hour <= 4;
  if (sp.nightOnly && !night) return false;
  if (!isPlayer) return false;
  return inside(sp, to) && !inside(sp, from);
}

// Hatch: one percentage roll per trigger; on success spawn a group, then apply once-removal.
// rollBelow(n) returns an integer in [0, n); placeFree(x, y, r) returns a free tile or null.
export function hatch(
  sp: SpawnPoint,
  rollBelow: (n: number) => number,
  placeFree: (x: number, y: number, r: number) => Tile | null,
): Tile[] {
  const spawned: Tile[] = [];
  const roll = 1 + rollBelow(100);                  // 1..100
  if (roll <= sp.chancePct) {
    let n = sp.groupMax;
    if (n > 1) n = 1 + rollBelow(n);                // group of 1..cnt
    for (let i = 0; i < n; i++) {
      const t = placeFree(sp.x, sp.y, sp.placeRadius);
      if (t !== null) spawned.push(t);
    }
    if (sp.once) sp.removed = true;
  }
  sp.hatched = true;
  return spawned;
}

export {};
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (server zone director: the spawn point is zone data, the trigger is evaluated on the server from the tile the player enters, the group is placed by the server). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer; this note covers the spawn point and its re-arm).
- Server tick sub-line: the trigger runs on the actor's tile change, so the server evaluates it on the tick that applies the move ("server tick: fixed step, input intake, per-tick NPC budget", row 18 / post-K item 3).
- Zone data fields: trigger radius, chance, night window, group size, once or re-arm (see the JSON sidecar).
- Reuse tag: adapt (GPL-2.0-or-later; clean-room, shape only)
- Brief rule served: zone population (row 23): spawn points are zone data on the one engine; server-verified spawns (rulings: one engine, zones as data, server-verified kills)

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism; no donor line is translated.
- No population cap is visible on this path. The egg fires whenever its roll succeeds, and `once` is the only limit. Frankendom needs a per-zone cap as data; `MAX_ATTACKERS = 3` is about attackers on one player, not spawn points.
- Re-arm without a cap means a player who walks back and forth across the edge can re-roll every entry (837 plus the edge rule 896). Frankendom needs a grace timer or an entry cooldown (row 23 "grace timer") to stop this.
- The trigger is on the actor's tile change, which is client-driven movement in the donor. Frankendom must evaluate the trigger on the server from the authoritative position.
- The roll uses C `rand()` (`egg.cc` 62 and 1334). The seeding was not read. Server-verified spawns need a seeded server RNG so an audit can reproduce the roll.
- The placement ring search (`chunks.cc` 1289-1303) depends on map blocking (`is_blocked`, not read in full). Frankendom placement must use the zone's own walkable grid, not the donor's blocking test.
- Group count is packed into record bits (`egg.cc` 314). Frankendom should keep it as a named data field, not a bit pack.
- The nocturnal rule uses the in-game clock hour (843). Frankendom's clock source (zone or server) must be chosen once.
- The other egg types (jukebox, missile, usecode, teleport, path, field) were not read and are out of scope here.

Reuse tag: adapt (GPL-2.0-or-later; clean-room, shape only)
Brief rule served: zone population (row 23); server tick sub-line (row 18 / post-K item 3)
