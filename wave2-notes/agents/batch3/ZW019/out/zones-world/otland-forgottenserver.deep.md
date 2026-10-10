# otland-forgottenserver (zones-world, cell 7)

Donor: `/mnt/frankendom-donors/otland-forgottenserver/src/spawn.cpp` | Licence: GPL-2.0 (the donor's LICENSE file is the GPL v2 text; `spawn.cpp` and `spawn.h` headers say "governed by the GPL-2.0 License"; no "or later" wording found in spawn.cpp, spawn.h or game.cpp) | C++ | symbol `Spawn::checkSpawn`

Checked: Opened and read in full: `src/spawn.cpp` (1-442) and `src/spawn.h` (1-84). Also read: `src/monster.cpp` 153-190, 741-790, 1850-1919; `src/game.cpp` 760-766, 3863-3880; `src/map.h` 159-163, 209-213; `src/map.cpp` 392-410; `src/npc.cpp` 426-431; `src/configmanager.cpp` 250-273; `config.lua.dist` 149-165 (partly by grep); `data/world/forgotten-spawn.xml` (head). The list hint `src/tile.h` was not read; it is not the spawn mechanism. Not read: the death path that leads to `Monster::onRemoveCreature` on the spawned monster (monster.cpp 182-184 is the only call site read); how creatures are put into the 10 think buckets; the body of `getSpectators` past line 440; how map data streams to clients; `Spawn::isInSpawnZone` (declared at spawn.h:42, no definition found by grep). Confidence: high on the spawn check, the presence gate and the leash; medium on what wakes the zone check when a monster dies (only the removal call site was read). Zone-world topic; this is not a camera cell.

## 1. Mechanism

- A zone is one `<spawn>` node in an XML file: a centre (`centerx`, `centery`, `centerz`), an optional `radius`, and a list of spawn points. The zone is a `Spawn` object (`spawn.h` 22-63). A point is either a single `<monster>` with its own `spawntime`, or a `<monsters>` block: several types, each with a `chance`. Each point holds at most one live monster; the live set is a multimap keyed by point id, and `checkSpawn` skips points that are occupied (`spawn.cpp` 363-364).
- Load (`Spawns::loadFromXml`, 23-196): spawntime is in seconds; anything under 10 s or over one day is rejected (`spawn.cpp` 20-21, 67-76, 153-165). A block's chances default to an equal split `100 / n` (104); the total is capped at 100 (110-113); the types are sorted highest chance first (129-132).
- Startup (`Spawn::startup`, 344-351): every point is filled at once with `startup = true`, which skips the presence gate (275) and skips the placement events (320-322).
- Cadence: the zone's check is a scheduler event whose delay is the smallest spawntime in the zone (`interval = std::min(interval, sb.interval)`, 401; `addEvent(createSchedulerTask(getInterval()` at 245). The timers read `OTSYS_TIME()` (wall-clock milliseconds) at 340 and 368, not a counted tick.
- `checkSpawn` (353-383), in this order:
  (a) `cleanup()` drops monsters flagged removed (357; 385-397).
  (b) For each point in order: skip if its monster is alive (363-364); skip if `now < lastSpawn + interval` (368).
  (c) Attempt (below). On failure, `lastSpawn = now`, so the point waits one full spawntime again (369-371). On success, count it and stop once the count reaches `RATE_SPAWN` for this check (374-376).
  (d) Reschedule the check only if some point is still empty (380-382).
- Attempt (`spawnMonster` for a block, 273-310):
  (a) Presence gate: `isBlocked = !startup && findPlayer(sb.pos)` (275). `findPlayer` (258-271) asks the map for the players around the point (`getSpectators(..., false, true)`, 261) and returns true if any of them lacks the `IgnoredByMonsters` flag (266).
  (b) Blocked types are skipped unless the type has `isIgnoringSpawnBlock` (280). If every type is blocked, the attempt fails (304-305).
  (c) Chance pass, only when there is more than one open type: each type in chance order is spawned if `chance >= rand(1..100)` (289). The first type to pass and place wins.
  (d) Fallback: if no type passed, the first open type is spawned with no roll (309; `spawnFunc(false)` returns on the first non-blocked type, 285-286). So a multi-type point spawns something unless all its types are blocked or placement fails.
- A placed monster gets its direction, its zone link, and `masterPos = point` (334-336). The point's `lastSpawn` is set to now (340).
- Leash (`Monster::onThink`, once per second). The monster's think script runs first (764; whether a true return skips the leash depends on `callFunction`, not read). Then `isInSpawnRange(position)` (769) decides:
  - Outside the leash with `monsterOverspawn` on: the monster is removed from its zone, the zone check is re-armed, and the monster has no zone (771-775).
  - Outside the leash otherwise: a poof effect is added at its position (777). If `removeOnDespawn` is on the monster is removed (778-779); otherwise it is teleported to `masterPos` and set idle (781-782).
  - Inside the leash: `updateIdleStatus()` and, if not idle, `addEventWalk()` (786-790).
- The leash box is global, not per zone (`isInSpawnRange`, 1896-1919): `|dx| <= despawnRadius` and `|dy| <= despawnRadius` from `masterPos`, and `|dz| <= despawnRange`; a zero radius or range turns that test off (1902-1914). `canWalkTo` refuses a step whose next tile is outside this box (1850-1861, 1853).
- Ticks: `Game::checkCreatures` runs one bucket every 100 ms (game.cpp 3863-3866; creature.h 56-58) and calls `onThink(EVENT_CREATURE_THINK_INTERVAL)` on each creature in the bucket (3874). The argument is the constant 1000, not the real elapsed time, so there is no accumulator.
- Respawn trigger: when a spawned monster is removed from the map, `Monster::onRemoveCreature` calls `spawn->startSpawnCheck()` (monster.cpp 182-184). The respawn is then the first zone check at or after `lastSpawn + interval`. `lastSpawn` is the time of the last spawn, not the death (368).

## 2. Key functions

- `Spawn::checkSpawn`: `/mnt/frankendom-donors/otland-forgottenserver/src/spawn.cpp` 353-383. Cleanup, the occupied and due tests, the attempt, the failure reset, the per-check cap, and the reschedule.
- `Spawn::spawnMonster` (block overload): `/mnt/frankendom-donors/otland-forgottenserver/src/spawn.cpp` 273-310. Presence gate, chance pass, fallback.
- `Spawn::findPlayer`: `/mnt/frankendom-donors/otland-forgottenserver/src/spawn.cpp` 258-271. The presence query.
- `Spawns::loadFromXml`: `/mnt/frankendom-donors/otland-forgottenserver/src/spawn.cpp` 23-196. Zone and point parsing, spawntime bounds, chance defaults and sort.
- `Spawn::startup`: `/mnt/frankendom-donors/otland-forgottenserver/src/spawn.cpp` 344-351. Boot fill with no presence gate.
- `Spawns::isInZone`: `/mnt/frankendom-donors/otland-forgottenserver/src/spawn.cpp` 232-240. Box test; radius -1 means unlimited (234-236).
- `Monster::onThink`, leash block: `/mnt/frankendom-donors/otland-forgottenserver/src/monster.cpp` 769-790. Overspawn, poof, remove, teleport home.
- `Monster::isInSpawnRange`: `/mnt/frankendom-donors/otland-forgottenserver/src/monster.cpp` 1896-1919. The global leash box.
- `Game::checkCreatures`: `/mnt/frankendom-donors/otland-forgottenserver/src/game.cpp` 3863-3880. The 100 ms bucket loop that calls `onThink` with 1000.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Point timer: spawn when now >= last spawn + spawntime | spawntime attribute in seconds; bounds 10 s to 86400 s (spawn.cpp 20-21) |
| Zone check cadence = smallest spawntime in the zone | none (derived, spawn.cpp 401) |
| One live monster per point; no respawn while it is alive | none (spawn.cpp 363-364) |
| Presence gate: a point is blocked while a player is in the window | window of 11 tiles on X and Y (`maxViewportX = 11`, map.h 159; default range at map.cpp 403-406) |
| Per-check spawn cap | `rateSpawn` default 1 (configmanager.cpp 273) |
| Chance roll per type, highest first, then an unconditional fallback | chance attribute in percent; default 100 / n (spawn.cpp 104) |
| Leash box around the home point, then remove or send home | `deSpawnRadius` default 50 tiles (configmanager.cpp 267); `deSpawnRange` default 2 floors (266); both global |
| Behaviour toggles | `removeOnDespawn` default true (250); `monsterOverspawn` default false (254) |
| Think cadence | 1000 ms (creature.h 57), one bucket per 100 ms (creature.h 58) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: alive check, due check, attempt with presence gate, chance pass, unconditional fallback, failed attempt resets the point timer, per-check cap, reschedule only while a point is empty; and the leash box test with its tests in donor order. It omits: `isIgnoringSpawnBlock` and `IgnoredByMonsters` flags; startup placement; Lua hooks (`onSpawn`, the think script); NPC spawns; the spectator cache and the real window shape; the floor test uses an absolute difference (`getDistanceZ` not read); the poof effect and the removal and detach calls (the sketch returns an action instead); the sort, which the caller does at load.

```ts
// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface SpawnType { name: string; chance: number; }      // percent; sorted highest chance first

interface SpawnPoint {
  id: number;
  x: number; y: number; z: number;
  types: SpawnType[];
  intervalMs: number;     // spawntime
  lastSpawnMs: number;    // set on a successful spawn and on a failed attempt
  liveId: number | null;  // the one monster this point may hold
}

interface World {
  playerInWindow(x: number, y: number, z: number): boolean; // presence gate
  place(name: string, x: number, y: number, z: number): number | null; // monster id, or null
  isAlive(id: number): boolean;
  roll(): number;         // integer 1..100
}

interface Zone {
  points: SpawnPoint[];
  rateSpawn: number;      // spawns allowed per check
}

// Wake-up cadence of the zone: the smallest spawntime among its points.
function zoneCadenceMs(z: Zone): number {
  return Math.min(...z.points.map(p => p.intervalMs));
}

function placeType(p: SpawnPoint, t: SpawnType, now: number, w: World): boolean {
  const id = w.place(t.name, p.x, p.y, p.z);
  if (id === null) return false;
  p.liveId = id;
  p.lastSpawnMs = now;
  return true;
}

// One spawn attempt at a point: presence gate, chance pass, then an unconditional fallback.
function attempt(p: SpawnPoint, now: number, w: World): boolean {
  const open = w.playerInWindow(p.x, p.y, p.z) ? [] : p.types;
  if (open.length === 0) return false;
  if (open.length > 1) {
    for (const t of open) {
      if (w.roll() <= t.chance && placeType(p, t, now, w)) return true;
    }
  }
  return placeType(p, open[0], now, w);
}

// One zone check, run by a scheduler event. Returns the next check time, or null when every point is full.
function checkZone(z: Zone, now: number, w: World): { nextCheckMs: number | null; spawned: number } {
  let spawned = 0;
  for (const p of z.points) {
    if (p.liveId !== null && w.isAlive(p.liveId)) continue;   // occupied: no respawn while alive
    p.liveId = null;
    if (now < p.lastSpawnMs + p.intervalMs) continue;          // not due yet
    if (!attempt(p, now, w)) { p.lastSpawnMs = now; continue; } // failed: wait a full spawntime
    if (++spawned >= z.rateSpawn) break;                       // per-check cap
  }
  const anyEmpty = z.points.some(p => p.liveId === null || !w.isAlive(p.liveId));
  return { nextCheckMs: anyEmpty ? now + zoneCadenceMs(z) : null, spawned };
}

interface Leash { radius: number; zRange: number; overspawn: boolean; removeOnDespawn: boolean; }
interface Pos { x: number; y: number; z: number; }
type LeashAction = 'stay' | 'detach-and-recheck' | 'remove' | 'home';

function inLeash(home: Pos, at: Pos, cfg: Leash): boolean {
  if (cfg.radius === 0) return true;
  if (Math.abs(at.x - home.x) > cfg.radius || Math.abs(at.y - home.y) > cfg.radius) return false;
  if (cfg.zRange === 0) return true;
  return Math.abs(at.z - home.z) <= cfg.zRange;
}

// Called once per monster think (1000 ms). Outside the leash, the monster is detached or removed, or sent home.
function leashStep(home: Pos, at: Pos, cfg: Leash): LeashAction {
  if (inLeash(home, at, cfg)) return 'stay';
  if (cfg.overspawn) return 'detach-and-recheck';
  return cfg.removeOnDespawn ? 'remove' : 'home';
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone spawn director, engine logic on the server; the zone file supplies the numbers). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). The donor has no grace timer; see section 6.
- The 1000 ms leash think and the 100 ms bucket loop are server tick. For that, the sub-line is "server tick: fixed step, input intake, per-tick NPC budget" (post-K item 3); this note does not claim a row for it.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: zones as data (points, chances, leash and cap as zone fields); server-verified (the spawn decision and the timers run on the server, the client only renders); one engine (the director is engine code, zones only supply data)

## 6. Gaps and risks

- GPL-2.0: clean-room only. The sketch is written from the mechanism, and no donor line is copied.
- No grace timer. A spawned monster that leaves the leash is removed, or sent home, on the same think (monster.cpp 769-784). Row 23 asks for a grace timer before despawn on empty; the donor has none, so that part is ours to design.
- The leash radius is global in the donor (configmanager.cpp 267). The zone's own `radius` attribute is stored (spawn.cpp 59; spawn.h 54) and used only for NPCs (npc.cpp 431; game.cpp 762). Monsters are not leashed to their zone radius. Frankendom wants the leash radius as zone data, so it must not copy this.
- The respawn clock runs from the last spawn, not from the death (spawn.cpp 340, 368). A monster that outlives its spawntime is replaced at the zone check that runs one cadence after its removal (startSpawnCheck, 184; 245), not after a fresh spawntime. Frankendom must choose the clock on purpose.
- A blocked attempt sets the point timer to now (370), so a point that was skipped because a player was near waits one more full spawntime. Frankendom's zone rule needs its own presence grace; do not inherit the reset by accident.
- The presence window is a fixed 11 tiles (map.h 159; map.cpp 403-406), not zone data. The donor has no per-zone presence window.
- The per-check cap is `rateSpawn` (spawn.cpp 374), per zone check, and it is global config (configmanager.cpp 273). Frankendom's per-tick NPC budget is a server-wide limit and sits above the zone cap.
- Respawn wake-up depends on `Monster::onRemoveCreature` (monster.cpp 182-184). The death path that removes the monster was not read, so the exact wake-up on death is unverified.
- Monsters are defined in XML and the donor's `onSpawn` script can veto a spawn (spawn.cpp 316). Frankendom's catalogue is data (row 21); it needs no script veto for spawns, but a hook may be wanted for event zones.
- The donor is a single process with one spawn check per zone; the one-ledger rule (each spawn is written once) is not something the donor enforces across servers. Frankendom must make the spawn event the one write.

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
Brief rule served: zones as data; server-verified; one engine
Best transferable idea: A zone is a list of spawn points, each holding at most one monster with its own timer, a presence gate that blocks only the points a player is near, and a per-check spawn cap.
Decision (proposed): adapt - the shape (points with timers, one live monster per point, presence gate, per-check cap) fits row 23, but the donor's global leash radius and missing grace timer do not, so the leash radius goes into zone data and a grace timer is added.
Acceptance: A server test (origins/server/world-spawns.test.ts) with a zone of two points at 60 s spawntime: a player within 11 tiles of point A keeps A empty; A spawns at the first zone check after the player has been away for the grace time; no more than rateSpawn spawns happen in one zone check.
