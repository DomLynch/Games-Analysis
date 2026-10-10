# swgemu-Core3 (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects/region/SpawnAreaImplementation.cpp` (world spawn areas), with `managers/creature/DynamicSpawnObserverImplementation.cpp` (lair population), `objects/creature/ai/AiAgentImplementation.cpp` (respawn, despawn on empty), `objects/creature/events/DespawnCreatureOnPlayerDissappear.h`, `objects/intangible/TheaterObject*.{idl,cpp}`, `managers/creature/CreatureManagerImplementation.cpp` and `conf/ConfigManager.h` | Licence: GNU AGPL-3.0 (COPYING, Version 3) | C++ with Lua lair data | symbol `SpawnAreaImplementation::tryToSpawn`

Checked: Read in full: `DynamicSpawnObserverImplementation.cpp` (1-213), `SpawnAreaImplementation.cpp` (1-130, 131-200, 181-402 ranges used; 404-438), `DespawnCreatureOnPlayerDissappear.h` (1-68), `RespawnCreatureTask.h` and `DespawnDynamicSpawnTask.h` (whole files), `DespawnCreatureTask.h` (18-55), `TheaterObjectImplementation.cpp` (18-58), `TheaterObject.idl` (60-80), `DespawnLairOnPlayerDisappear.cpp` (19-66), `AiAgentImplementation.cpp` 614-732 (respawn), 1818-1832, 2177-2235, 2236-2262, 2286-2330, 2383-2400, 2406-2456, 3891-3930 (partly), `CreatureManagerImplementation.cpp` 200-275, `LairTemplate.h` line 84 and `LairSpawn.h` lines 20-31 and 76-77, `ConfigManager.h` 736-745, 762-770, 788-799, `PlanetManagerImplementation.cpp` 1069 (one line), and `bin/scripts/mobile/lair/creature_lair/tatooine/tatooine_cupa_cupa_neutral_medium_boss_01.lua` (whole file). Not read: `CreatureManager::spawn` (the call at SpawnArea 323 was not followed), `SpawnArea.idl` body and `SpawnAreaObserver`, `areaShape->getRandomPosition` and `planetManager->isSpawningPermittedAt` (their bodies), `playerMan->calculatePlayerLevel`, the `CreatureHerdObserver`, `LairObserverImplementation.cpp` (857 lines; a separate, older lair path), the `CREATUREDESPAWNED` observers beyond the dynamic lair, and whoever calls `notifyPositionUpdate` each move. Confidence: high on the caps, lives, respawn and grace order (read end to end); medium on the random-position rule (shape function not read); the 4-lives count is read from the counter check and its comment, and I traced it by hand, not by running it. camera_scope: n/a.

## 1. Mechanism

Two layers. A world **spawn area** puts lairs near players. A **dynamic lair** (a theater object) holds a fixed group of mobs that respawn until each has used up its lives.

- Trigger. `SpawnAreaImplementation::notifyPositionUpdate` is the entry point (SpawnAreaImplementation.cpp 23-58). It does nothing unless: the area has players in it (24), the entry is a player (30), the server is not loading or shutting down (36-37), the time since the last spawn is at least `minimumLairSpawnInterval` (40; default 5000 ms, ConfigManager.h 742), world spawns are not disabled (44), and the player is not invisible (54). Then it calls `tryToSpawn`.
- Gates, in the order `tryToSpawn` runs them (181-402): (a) the area is under its total cap, `totalSpawnCount >= maxSpawnLimit` stops it (197); the cap comes from region data (PlanetManagerImplementation.cpp 1069). (b) A weighted pick over the area's lair entries: `choice = System::random(totalWeighting - 1)` with cumulative weights (204-218). (c) The entry's own cap: `spawnLimit > -1 && currentSpawnCount >= spawnLimit` stops it (230-241); -1 means no cap (LairSpawn.h 31). (d) A point from the area shape around the player (called at 249; the position function is at 111-128 and passes 32.0f at 126; the shape function body was not read). (e) The point must be permitted: `isSpawningPermittedAt(x, y, checkRange)` with `checkRange = lair size + spawnCheckRange` (262-265). The spawn check range defaults to 64 (ConfigManager.h 794).
- Lair level and building level (278-313). The player level is the group level when grouped, otherwise `calculatePlayerLevel` (SpawnArea 404-435). The lair level is `min(max, min + random(range))` (300). The ratio `playerLevel / lairLevel` picks a building level from 1 to 5 using thresholds 0.25, 0.5, 0.75 and 1.0 (301-313).
- Bookkeeping on success (380-395): `lastSpawn` is reset, an observer is attached to the lair object for its removal (382-391), `totalSpawnCount` goes up (393) and the per-entry count goes up (395). On removal (`SpawnAreaImplementation::notifyObserverEvent`, 131-179) the counts go down (146-156). A lair object also leaves a no-spawn bubble of radius `spawnCheckRange` for 30 s (162-174).
- Dynamic lair population (`spawnDynamicSpawn`, CreatureManagerImplementation.cpp 225-264). A theater object is created with `setDespawnOnNoPlayersInRange(true)` (246) and a `DynamicSpawnObserver` on `CREATUREDESPAWNED` and removal (255-256). Then `spawnInitialMobiles` runs (261).
- Count. `totalNumberToSpawn = spawnLimit/3 + (difficulty - 2)/2` (C++ integer division, truncating), where `difficulty` is the lair building level 1-5 from the player-to-lair level ratio (SpawnAreaImplementation.cpp 301-313). `CreatureManagerImplementation::spawn` (70-84) routes by building type: LAIR goes to `spawnLair` and THEATER to `spawnTheater` (the older path), and only `LairTemplate::NONE` reaches `spawnDynamicSpawn` (81), which receives that building level as `difficulty` (225). The minimum is 1 (DynamicSpawnObserverImplementation.cpp 90-98). `spawnLimit` is the lair template's value (LairTemplate.h 84; the example lair template sets `spawnLimit = 15`, which gives 5 + the difficulty term). Each slot picks a mobile template by a uniform index into the weighted mobile list (101), grouped by template (104-111).
- Placement and state. Each mob is placed at the building position plus `size - random(size*20)/10` on each axis (129-130), with its home set to the building (164), its despawn-on-empty flag set to false (160; the lair owns that), and its respawn timer zeroed (162). A herd template's first mob leads, and the rest follow it in FOLLOWING state (171-201).
- Death. `AiAgentImplementation::notifyDespawn`, when the home has `CREATUREDESPAWNED` observers, notifies the home and returns (2294-2303). So the home lair owns the respawn. The observer then decides (DynamicSpawnObserverImplementation.cpp 11-77):
  - If `respawnCounter > 2` (30): the mob leaves the list and its home is cleared (31-35). If the list is then empty, the lair despawns 60 s later (49-53).
  - Otherwise a `RespawnCreatureTask` runs after `(60 + level*2)` seconds (66-74). Creatures use their adult level (66-71).
- Respawn itself (`AiAgentImplementation::respawn`, 614-732). It fails if the agent is still in a zone (615-617). It reloads the template (689-691), resets HAM and wounds (699-707), moves the agent home (709-724), increments `respawnCounter` (727), and restarts the behaviour tick (731).
- Lives. A mob gets its first life, then up to three respawns. The donor comment says "Each creature should spawn 4 times" (29). Counting the checks by hand: death 1, 2 and 3 each lead to a respawn (counter 0, 1, 2); death 4 meets counter 3 and the mob is removed.
- Non-lair creatures with their own respawn timer respawn after `respawnTimer` seconds. With `randomRespawn` the delay is `System::random(r) + r/2` with r in ms, so it lies in [r/2, 1.5r) (AiAgentImplementation.cpp 2307-2315).
- Presence grace. When the last player leaves a creature (`notifyDissapear`, 2432-2451), a 30 s despawn event is scheduled (2448-2450), and `setDespawnOnNoPlayerInRange(true)` with nobody in range schedules the same 30 s (1824-1830). When the event fires (DespawnCreatureOnPlayerDissappear.h 34-56), it clears itself (42), returns if the flag was turned off (49), and destroys and notifies the agent only if the player count is still zero (52-54). The event is not cancelled when a player comes back (`notifyInsert`, 2177-2194, has no cancel), so the check at fire time decides.
- Theater grace (the lair population's container). When the count reaches zero and the flag is set, the theater schedules a 300 s despawn (TheaterObjectImplementation.cpp 51-55; TheaterObject.idl 64-70, line 69). A player entering cancels it (TheaterObjectImplementation.cpp 29-30). When it fires it destroys the theater only if still empty (DespawnLairOnPlayerDisappear.cpp 53-61). Lair objects and POI buildings use the same 300 s (LairObject.idl 85; PoiBuilding.idl 85).
- Tick gate. `activateAiBehavior` cancels the behaviour event when no players are in range, the agent has no follow object and it is not retreating (AiAgentImplementation.cpp 3903-3906), so idle mobs do not tick. A player entering reschedules it (notifyInsert calls `activateAiBehavior`, 2192).

## 2. Key functions

- `SpawnAreaImplementation::notifyPositionUpdate` (`.../objects/region/SpawnAreaImplementation.cpp` 23-58): the presence and interval gate.
- `SpawnAreaImplementation::tryToSpawn` (same file, 181-402): caps, weighted pick, permit check, level, spawn, counts.
- `SpawnAreaImplementation::buildSpawnList` (92-108): group entries to a weighted list.
- `SpawnAreaImplementation::notifyObserverEvent` (131-179): count decrement on removal; no-spawn bubble.
- `CreatureManagerImplementation::spawnDynamicSpawn` (`.../managers/creature/CreatureManagerImplementation.cpp` 225-264): the lair population container.
- `DynamicSpawnObserverImplementation::spawnInitialMobiles` (`.../managers/creature/DynamicSpawnObserverImplementation.cpp` 79-209): count, placement, herd.
- `DynamicSpawnObserverImplementation::notifyObserverEvent` (same file, 11-77): lives, respawn schedule, empty-lair despawn.
- `AiAgentImplementation::notifyDespawn` (`.../objects/creature/ai/AiAgentImplementation.cpp` 2200-2320): home notify or own respawn timer.
- `AiAgentImplementation::respawn` (same file, 614-732), `setDespawnOnNoPlayerInRange` (1818-1832), `notifyDissapear` (2406-2456).
- `DespawnCreatureOnPlayerDissappear::run` (`.../objects/creature/events/DespawnCreatureOnPlayerDissappear.h` 34-56); `DespawnLairOnPlayerDisappear::run` (`.../objects/tangible/DespawnLairOnPlayerDisappear.cpp` 19-66); `TheaterObjectImplementation::notifyInsert` and `notifyDissapear` (`.../objects/intangible/TheaterObjectImplementation.cpp` 18-56).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Total cap per area, then a per-template cap, both checked before a spawn | Area cap from region data (PlanetManagerImplementation.cpp 1069); per-template cap `spawnLimit`, -1 = none (LairSpawn.h 31; SpawnAreaImplementation.cpp 236) |
| Spawn only while players are present, and at most once per interval | Min interval 5000 ms (ConfigManager.h 742); players-in-area check (SpawnAreaImplementation.cpp 24) |
| Weighted pick of the next entry | Weights are data (summed at 105) |
| Lair population from a count and a difficulty term | `spawnLimit/3 + (difficulty-2)/2`, at least 1 (DynamicSpawnObserverImplementation.cpp 90-98); the 3 and the 2 are fixed |
| Lives: a mob retires on the death after its 3rd respawn | Counter test `> 2` (DynamicSpawnObserverImplementation.cpp 30) |
| Respawn delay grows with level | `60 + level*2` seconds (DynamicSpawnObserverImplementation.cpp 74) |
| Empty lair despawns after a delay | 60000 ms (DynamicSpawnObserverImplementation.cpp 53) |
| Creature grace before despawn | 30000 ms (AiAgentImplementation.cpp 1830, 2450) |
| Theater/lair grace before despawn | 300000 ms (TheaterObject.idl 69; LairObject.idl 85; PoiBuilding.idl 85) |
| No-spawn bubble after a lair object is removed | 30000 ms (SpawnAreaImplementation.cpp 174), radius = spawn check range |
| Spawn check range (permit test and bubble) | Default 64 (ConfigManager.h 794), plus lair size |
| Lair building level from the player/lair level ratio | Thresholds 0.25 / 0.5 / 0.75 / 1.0 for levels 1-4, else 5 (SpawnAreaImplementation.cpp 301-313) |
| Creature own respawn | `respawnTimer` seconds; random mode: a delay between r/2 and 1.5r (`random(r) + r/2` in ms, so [r/2, 1.5r)) (AiAgentImplementation.cpp 2307-2315) |

## 4. TypeScript sketch

simplified: the donor runs its gates in two layers (notifyPositionUpdate, then tryToSpawn). The sketch merges them into one function and keeps the donor's order: players, interval, area cap, weighted pick, entry cap, point, permit. The point source is injected as `point()` because the shape function was not read. The sketch omits the lair level and building-level math, the lair object creation, the no-spawn bubble, the observer that decrements counts on removal, the server-loading and invisibility checks, herds, babies, the theater's cancel-on-entry (described in the note, not coded), and the grace timers' cancellation rules. The lair part models only the count, the lives, the respawn delay and the empty despawn; it does not model the spawn of each mob.

```ts
// Licence: AGPL-3.0 (donor). Clean-room sketch of the mechanism shape, not a translation of the donor lines.
type Rng = () => number; // returns a number in [0, 1)
type Point = { x: number; y: number };

// ---- Area director: one attempt per player position update, gated in the donor's order ----
interface Template { id: string; weight: number; cap: number; count: number; } // cap -1 = no cap
interface Area {
  players: number;          // players inside the area now
  lastSpawnMs: number;
  minIntervalMs: number;    // donor default 5000 ms (config)
  total: number;
  maxTotal: number;         // per-area cap, set from region data
  templates: Template[];
}

function tryAreaSpawn(a: Area, now: number, rng: Rng, point: () => Point | null, permitted: (p: Point) => boolean): Template | null {
  if (a.players <= 0) return null;
  if (now - a.lastSpawnMs < a.minIntervalMs) return null;
  if (a.total >= a.maxTotal) return null;

  const totalWeight = a.templates.reduce((s, t) => s + t.weight, 0);
  if (totalWeight <= 0) return null;
  let choice = Math.floor(rng() * totalWeight);
  let picked: Template | null = null;
  for (const t of a.templates) {
    if (choice < t.weight) { picked = t; break; }
    choice -= t.weight;
  }
  if (picked === null) return null;
  if (picked.cap > -1 && picked.count >= picked.cap) return null;

  const p = point();
  if (p === null || !permitted(p)) return null;

  a.lastSpawnMs = now;
  a.total += 1;
  picked.count += 1;
  return picked;
}

// ---- Dynamic lair: a fixed group that respawns until each member has used its lives ----
const LIVES_AFTER_RESPAWNS = 3;   // a mob retires on the death that follows its 3rd respawn

interface LairMob { level: number; respawns: number; alive: boolean; retired: boolean; respawnAt: number | null; }
interface Lair { mobs: LairMob[]; emptyAt: number | null; }

// Donor: trunc(spawnLimit / 3) + trunc((difficulty - 2) / 2), at least 1 (C++ int division truncates toward zero).
// `difficulty` is the donor's building level (1-5), not a mob level.
function lairSize(spawnLimit: number, difficulty: number): number {
  return Math.max(1, Math.trunc(spawnLimit / 3) + Math.trunc((difficulty - 2) / 2));
}

function onMobDeath(lair: Lair, mob: LairMob, now: number): void {
  mob.alive = false;
  if (mob.respawns > LIVES_AFTER_RESPAWNS - 1) {      // donor: respawnCounter > 2
    mob.retired = true;
    if (lair.mobs.every((m) => m.retired)) lair.emptyAt = now + 60000; // lair despawns 60 s later
    return;
  }
  mob.respawnAt = now + (60 + 2 * mob.level) * 1000; // respawn delay: 60 s plus 2 s per level
}

function tickLair(lair: Lair, now: number): void {
  for (const m of lair.mobs) {
    if (!m.alive && !m.retired && m.respawnAt !== null && now >= m.respawnAt) {
      m.alive = true;
      m.respawns += 1;
      m.respawnAt = null;
    }
  }
}

// ---- Presence grace: when the last player leaves, despawn after a timer if still empty ----
const CREATURE_GRACE_MS = 30000;
const LAIR_GRACE_MS = 300000;

// The timer fires later; it re-checks the count then. Creatures do not cancel it on re-entry; theaters do.
function graceFireTime(now: number, graceMs: number): number { return now + graceMs; }
function graceFires(players: number): boolean { return players <= 0; }
export {};
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population director: area gates, spawn caps, lair group, respawn and grace timers, all driven by zone data). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). Server tick sub-line: the population director runs on the fixed server step; the donor's tick is the per-agent behaviour event (cell 2 note), not measured here.
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
- Brief rule served: 1 (one engine; spawn logic in the engine, numbers as zone data); server-verified kills do not apply here; population caps are server-side

## 6. Gaps and risks

- AGPL-3.0: clean-room only. The sketch is written from the described mechanism.
- Two caps share a name. `LairSpawn.spawnLimit` (per entry, -1 = none) and `LairTemplate.spawnLimit` (per lair, sets the group size) are different numbers. Frankendom zone data needs distinct field names (for example `template_cap` and `group_size`).
- The donor's counts are event counters. `numberOfPlayersInRange` is raised and lowered by enter and leave events and clamped at zero (AiAgentImplementation.cpp 2432-2445; SpawnAreaImplementation.cpp 85-89). A counter can drift, so the donor clamps it. Frankendom should recompute presence from zone membership on the server instead of keeping a counter.
- The random point and the permit test depend on world terrain and planet rules that were not read. Frankendom zones are data, so the placement rule must be a zone field, not an engine guess.
- Lives and the 3-respawn rule are fixed in the donor's counter test (line 30). Frankendom should make the lives a zone field only if a designer needs it. Otherwise keep them as an engine constant and say so.
- Donor grace times (30 s, 300 s, 60 s) are constants in the code. Frankendom should expose them as zone data with the same defaults.
- Duplicate-death race: the donor notes a cancel race that can send a second CREATUREDESPAWNED, bounded by the cap (AiAgentImplementation.cpp 2210-2220). Frankendom's kills are server-verified, so death handling must be idempotent: one death, one ledger entry, one respawn schedule.
- The donor's lair path (`LairObserverImplementation.cpp`, 857 lines) is a separate, older population logic. Not read; do not assume it matches the dynamic lair.
- Units: spawn range 64 and placement offsets are donor units (unit not checked against Frankendom zone units).

Best transferable idea: a zone director that only spawns while players are present, checks a total cap and then a per-entry cap before a weighted pick, holds a fixed lair group that respawns with a lives counter, and despawns on empty only after a grace timer that re-checks the count when it fires.
Decision (proposed): adapt - take the gates, the caps, the lives counter, the respawn delay and the grace timer; drop the building-level and difficulty-ratio math (the lair-size formula still needs a building-level input from 1 to 5, which Frankendom takes from zone data) and the donor's counter-based presence, which Frankendom should recompute from zone membership on the server. Put every cap, weight, delay and grace time in zone data with these donor values as defaults.
Acceptance: In a zone test with a total cap of 3 and one template capped at 1, a server simulation with a player present never holds more than 3 spawns and never more than one of that template; after the player leaves, the zone's population is still present at 29 s, gone by 31 s, and still present if the player returns at 20 s.

Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
Brief rule served: 1 (one engine; spawn logic in the engine, numbers as zone data)


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** Mechanism never says what `difficulty` is in totalNumberToSpawn: CreatureManagerImplementation.cpp 70-84 routes by building type and only LairTemplate::NONE reaches spawnDynamicSpawn (81), passing lairBuildingLevel (1-5, from the player/lair ratio, SpawnArea 301-313) as `difficulty`; LAIR and THEATER types go to spawnLair/spawnTheater (the older path). The Decision drops the building-level math but the count formula depends on it. Sketch comment says floor() but C++ truncates (code uses trunc, correct). Table row 'random mode r + r/2' is ambiguous: real range is [r/2, 1.5r) (2310-2311). All other numbers/lines verified (5000, 64, 30 s, 60 s, 300 s x3 idl, 60+2*level, >2 counter, spawnLimit/3+(d-2)/2, 0.25/0.5/0.75/1.0, AGPL v3).

**Missed:** tryToSpawn rejects positions within 0.01 of (0,0) (254-260) and rewrites maxDifficulty>=500 to 5+min+random(5) (289-291); respawn() rolls a baby spawn (chance 500 for lairs, 627-686); notifyDissapear skips pets (2448); DynamicSpawnObserver OBJECTREMOVEDFROMZONE calls despawnSpawns (12-14).
