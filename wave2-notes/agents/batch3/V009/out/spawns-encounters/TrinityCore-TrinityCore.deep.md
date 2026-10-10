# TrinityCore-TrinityCore (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Pools/PoolMgr.cpp` (with `src/server/game/Maps/Map.cpp` for the respawn queue) | Licence: GPL-2.0-or-later (PoolMgr.cpp and Map.cpp headers: "either version 2 of the License, or (at your option) any later version"; the repo COPYING is GPL v2) | C++ | symbol `PoolGroup<T>::SpawnObject`

Checked: `PoolGroup<T>::SpawnObject` (PoolMgr.cpp 277-342) read in full. Read around it: `DespawnObject` (186-196), `AddSpawn` and `RemoveSpawn` for creatures (81-108), `PoolGroup<Creature>::Spawn1Object` (345-355), `PoolMgr::UpdatePool` (861-867), `SpawnPool<Creature>` (745-750). Respawn queue: `Map::ProcessRespawns` (Map.cpp 2236-2285) read in full, `Map::CheckRespawn` (1999-2068) read in full, the respawn tick in `Map::Update` (682-690), `Map::ApplyDynamicModeRespawnScaling` (2287-2329), `Creature::setDeathState` JUST_DIED branch (Creature.cpp 2209-2237), read in part. Config defaults are the `DefaultValue` fields in World.cpp (read at those lines). Callers of `SpawnObject`: `UpdatePool` (from `ProcessRespawns` when a pooled member is due, and from the creature's compat-mode respawn at Creature.cpp 2371) and `SpawnPool` (at map init, `Map.cpp` 154, and by GameEventMgr.cpp 1258). Not read: `RandomResize`, the body of `SpawnedPoolData::GetSpawnedObjects` (only its lookup, 40-44), the default argument of `saveRespawnTime` in `Despawn1Object` (PoolMgr.h, not read), the body of `Creature::SaveRespawnTime`, the grid-load spawn handler, the DB tables `pool_template` and `pool_creature` (values not read). Respawn units: the queue uses `GameTime` seconds, so the delay is in seconds (inferred from `GameTime::GetGameTime() + respawnDelay`, not read in the unit definition). camera_scope: not applicable. Confidence: high on the pool cap, the refill order and the spawned-set bookkeeping; medium on the exact death-to-refill timing in the compat-mode branch, which I did not follow. Cell hint was TrinityCore root; the real mechanism is `PoolMgr.cpp` (grep `SpawnObject`).

## 1. Mechanism

- A pool is a named group of members (creatures, gameobjects or child pools). Its row sets `max_limit`; each member may carry a `chance` (percent). The pool keeps at most `max_limit` members counted as spawned. A member counts from the moment it is spawned until it is despawned by the pool, and a dead creature stays counted until its own respawn time is due (see step 3).
- Refill, `PoolGroup<T>::SpawnObject(spawns, limit, triggerFrom)` (277-342), in order:
  (a) If a trigger member is given, it is despawned first (281-282). `DespawnObject` (186-196) removes it from the spawned set and from the count (`RemoveSpawn`, 192; the count is decremented at 106-107), and removes its object from the world.
  (b) `count = limit - spawned count of this pool` (284). If `count <= 0`, stop (285-286).
  (c) Candidates are all members not currently in the spawned set (288-301).
  (d) If any candidate has a chance, one roll is made: `roll = rand_chance()`, a float in [0, 100) (309; `rand_chance` in Random.cpp 82-85). Each chanced candidate subtracts its chance in turn; the first one that takes the roll below 0 is picked, and no second chanced member is picked in the same refill (311-321).
  (e) The remaining slots (`count` minus picked) are filled by a random subset of the other candidates (327-334; `RandomResize`, not read).
  (f) Each picked member is marked spawned first (339), then created from its database spawn if its area is loaded (340; `Spawn1Object` at 346-355 checks the grid at 352). If the grid is not loaded the member stays marked; the grid loader later spawns marked members (`ShouldBeSpawnedOnGridLoad`, Map.cpp 2345-2347).
- Trigger, the respawn queue (Map.cpp 2236-2285). When a creature dies (Creature.cpp 2217-2234), its respawn time is set to now plus the delay (scaled in step 4) and saved (2237). `Map::Update` runs `ProcessRespawns` every `Respawn.MinCheckIntervalMS` (683-690; default 5000, World.cpp 847). The timer resets to the full interval on each run (687). In `ProcessRespawns`, a due entry that belongs to a pool is taken out of the queue and the pool is refilled with that member as the trigger (2245-2256). So the due member is a candidate again and can be picked again, or another member can be picked.
- Non-pool respawns, `CheckRespawn` (1999-2068), in order: no respawn while the spawn group is inactive (2005-2008); no respawn while a live instance of the same spawn exists (2011-2047); a linked spawn waits until the linked unit's time plus a random 5 to 15 seconds (2049-2063). A blocked entry without a time is dropped (2271-2277).
- Respawn is `DoRespawn` (2210-2234), which creates the object from the database spawn.

## 2. Key functions

- `PoolGroup<T>::SpawnObject`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Pools/PoolMgr.cpp` 277-342. The cap, the trigger, the one chance roll, the random fill.
- `PoolGroup<T>::DespawnObject`: same file 186-196.
- `SpawnedPoolData` add and remove (creature overloads): same file 81-85 and 102-108.
- `PoolMgr::UpdatePool` (template): same file 861-867, and `SpawnPool<Creature>` 745-750 (passes `max_limit`).
- `Map::ProcessRespawns`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Maps/Map.cpp` 2236-2285.
- `Map::CheckRespawn`: same file 1999-2068.
- `Map::ApplyDynamicModeRespawnScaling`: same file 2287-2329.
- `Creature::setDeathState` (JUST_DIED branch): `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Creature/Creature.cpp` 2209-2237 (read in part).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Keep at most N members spawned, where a dead member still counts until its respawn is due | `max_limit` per pool (theirs, PoolMgr.cpp 419 and 435; the row values are in the world database, not read) |
| Refill only when a member's own respawn time is due | Respawn check interval 5000 ms default (theirs, World.cpp 847; Map.cpp 683-687) |
| One chance roll per refill, the rest random | Roll range 0 to 100 (theirs, Random.cpp 84; PoolMgr.cpp 309); one chanced pick (320) |
| Respawn delay shrinks with players in the zone, never below a floor | Dynamic mode off by default (theirs, World.cpp 848); rate 10.0 per player count (theirs, World.cpp 928); floor 10 (theirs, World.cpp 852); applied only when rate / players < 1 (Map.cpp 2322) |
| Linked spawn waits a random time after its linked unit | 5 to 15 seconds (theirs, Map.cpp 2062) |
| Instance unload grace after the last player leaves | 30 minutes default (theirs, World.cpp 764; set at Map.cpp 3021-3022) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order: the due member leaves the count first, the count is the limit minus spawned members, candidates are the members not spawned, one chance roll, a random fill of the rest, then each picked member is marked spawned before its creation is attempted. It differs in three ways. It always rolls, where the donor rolls only if some member in the pool has a chance (PoolMgr.cpp 307). It fills the rest with a simple swap-removal random subset in place of `RandomResize` (not read). It takes the area-loaded check and the random source as inputs. It omits the object despawn and saved respawn time, gameobject and child-pool members, the database cleanup, the respawn queue itself and its timer, the spawn-group and linked-respawn checks, and the dynamic delay scaling.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Member {
  id: string;
  chance: number;   // percent; 0 means an equal-chance member
}

export interface PoolState {
  maxLimit: number;          // population cap for this pool (zone data)
  spawned: Set<string>;      // members counted as spawned, including dead ones waiting to respawn
}

// Refill one pool. dueId is the member whose respawn timer just fired (undefined on first spawn).
// rng returns a value in [0, 1). canCreate says whether the member's area is loaded right now.
export function refillPool(
  pool: PoolState,
  members: Member[],
  dueId: string | undefined,
  rng: () => number,
  canCreate: (id: string) => boolean,
): string[] {
  if (dueId !== undefined) pool.spawned.delete(dueId);   // the due member leaves the count first
  const count = pool.maxLimit - pool.spawned.size;
  if (count <= 0) return [];

  let candidates = members.filter((m) => !pool.spawned.has(m.id));
  if (candidates.length === 0) return [];

  const picked: Member[] = [];

  // One chance roll per refill: subtract each chanced candidate's chance from a 0..100 roll.
  let roll = rng() * 100;
  for (const m of candidates) {
    if (m.chance > 0) {
      roll -= m.chance;
      if (roll < 0) {
        picked.push(m);
        candidates = candidates.filter((c) => c !== m);
        break;
      }
    }
  }

  // Fill the remaining slots with a random subset of the rest.
  const remaining = count - picked.length;
  if (remaining > 0 && candidates.length > 0) {
    const rest = [...candidates];
    while (rest.length > remaining) rest.splice(Math.floor(rng() * rest.length), 1);
    picked.push(...rest);
  }

  const created: string[] = [];
  for (const m of picked) {
    pool.spawned.add(m.id);                 // marked first, as in the donor
    if (canCreate(m.id)) created.push(m.id);
  }
  return created;
}

export {};
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (the engine's zone population step: spawn caps, respawn, despawn). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). The numbers (cap, chances, respawn seconds, grace seconds, coverage) are zone data; the refill rule is engine logic.
- Server tick (cited against row 18 / post-K item 3, sub-line "server tick: fixed step, input intake, per-tick NPC budget"): the donor runs the due check on its own 5000 ms timer inside `Map::Update` (Map.cpp 683-690), not on every tick. Our fixed step must drive that timer by ticks, so a replay of the same inputs refills the same slots.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine, zones as data); rule 2 (server-verified spawns: the refill runs on the server only)

Best transferable idea: a zone population cap that counts dead members until their own respawn is due, refills only at that moment with the due member as the trigger, and uses one chance roll then a random fill, so a zone never exceeds its cap and a dead spawn does not bring back a crowd at once.
Decision (proposed): adopt - the cap-and-refill-on-due rule is the shape row 23 asks for, and the donor keeps the cap in data (a pool row) with the rule in code; it does not depend on the grid or DB tables we do not use.
Acceptance: a server test asserts that a zone with cap 3 and five members never has more than three counted members (alive or waiting), that a slot refills only when the dead member's respawn time is due, and that in a pool whose only chanced member has chance 100, that member is picked on every refill where it is a candidate.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism; no donor line is copied.
- The donor has no despawn-on-empty for open-zone creatures. Its only grace timer is the instance unload after the last player leaves (World.cpp 764; Map.cpp 3021-3022), which removes the whole map, not single spawns. Row 23's grace timer is therefore not supported by this donor's code, and we must design it ourselves.
- A dead member counts toward the cap until its respawn is due. A long respawn therefore keeps the zone thin after a kill; the respawn delay must be tuned as zone data, not left as a donor default.
- The dynamic respawn scaling (Map.cpp 2287-2329) shortens delays as players enter a zone, with a floor of 10 s. It is off by default (World.cpp 848). If we adopt it, it is a crowd-balance rule, so it needs its own test and must not change the cap.
- The donor's chance roll uses a float random source (Random.cpp 82-85). Our replay and server tests need a seeded source, or a fight record will not reproduce.
- The donor creates members only if their area is loaded and marks them otherwise. Frankendom zones are data on one runtime with no grids; drop the loaded check, keep the marking rule.
- Not read: `RandomResize`, the `saveRespawnTime` default argument, `Creature::SaveRespawnTime`, the grid-load spawn handler, and the pool table rows.
