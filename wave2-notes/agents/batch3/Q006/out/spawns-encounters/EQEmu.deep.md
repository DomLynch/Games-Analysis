# EQEmu (spawns-encounters, cell 1)

Donor: `/mnt/frankendom-donors/EQEmu/zone/spawn2.cpp` | Licence: GPL-3.0-or-later (spawn2.cpp header "either version 3 of the License, or (at your option) any later version"; LICENSE.md is GPL v3) | C++ | symbol `Spawn2::Process`

Checked: Symbol `Spawn2::Process` is at spawn2.cpp 152-353 (read in full, about 200 lines). Also read in full: `Spawn2::ForceDespawn` 407-450, `Spawn2::DeathReset` 453-473, `Spawn2::resetTimer` and `despawnTimer` 118-150, `SpawnGroup::GetNPCType` spawngroup.cpp 71-119, and the entity limit functions entity.cpp 4225-4310. Confidence: high on the order of steps and the numbers. Medium-high on the engaged-NPC bullet in section 1: I read it end to end but did not run it. Not read: the zone's main loop that calls `Zone::Process` (only the 1000 ms timer and the Process loop, zone.cpp 1524-1537), the NPC AI, the hate list internals, and the Lua and Perl hooks that also call `Despawn`. The hint file (`utils/sql/svn/979_unique_spawn_by_name.sql`) is one `ALTER TABLE` adding the `unique_spawn_by_name` column to `npc_types`, so it is not the mechanism; the unique check itself is at `zone/spawn2.cpp:232`.


Best transferable idea: A spawn point owns one timer: a respawn after death with a jittered delay, group and type caps checked at roll time, and a despawn timer that removes only an unengaged NPC and never a fight in progress.
Decision (proposed): adapt — row 23 needs this shape (caps, respawn, grace despawn as zone data), but keep one NPC per point (the donor's engaged path can leave two) and drive the pass from our fixed-step server tick, not a separate 1 s timer.
Acceptance: Server test: one point with respawn 60 s and variance 10 s; after its NPC dies a new NPC appears 55-65 s later; an engaged NPC past the despawn timer stays in the world and no second NPC appears at that point.

## 1. Mechanism

- Each spawn point is one `Spawn2` object with one timer (spawn2.cpp:109-110 for a fresh point). It points at a spawn group (`SpawnGroup`) that holds weighted entries (NPC type, chance, optional hour window, optional condition-value filter, per-type cap).
- The zone runs a 1000 ms timer and calls `Process` on every point in its list on each pass (zone.cpp:956, 1524, 1531). `Process` returns at once if a live NPC is at the point and the group's despawn mode is 0 (spawn2.cpp:161-162).
- Order of steps when the point timer fires (spawn2.cpp:165 onward): (1) the timer is disabled and the spawn condition is checked; a failed check calls `Reset` and returns (172-178). (2) `GetNPCType` picks a type (208). (3) No type: `Reset`, which rearms the respawn timer (214, 382). (4) Unique-by-name and per-type cap checks; a blocked type retries in 5000 ms (234, 240-242). (5) If the group's despawn mode is not 0 and the point has no condition, `zone->Despawn(spawn2_id)` runs (256-257). That calls `ForceDespawn` on the point (spawn2.cpp:628-636). (6) If `IsDespawned` is set, the pass ends without a spawn (260). (7) Otherwise a new NPC is created at the point (or a random waypoint), `npcthis` is set to it, and the zone limit ledger records it (285-309).
- `GetNPCType` (spawngroup.cpp:71-119): the whole group is skipped if the group cap is reached (76). Each entry is skipped if its type cap is reached (84), if the zone clock is outside its hour window (88-92), or if its condition-value filter differs (94). The remaining chances are summed (98), one roll is taken in `[0, total-1]` (107), and the weights are walked (110-116).
- `ForceDespawn` (407-450): (a) if the live NPC has the ignore-despawn flag, return (413). (b) If the NPC is not engaged (416), a despawn mode of 3 or 4 calls `Depop(true)`, which runs `DeathReset`, sets `IsDespawned` and returns (418-422). Any other mode calls `Depop(false)`, which disables the point timer and clears the pointer (428; npc.cpp:861-863). (c) The next timer is 100000 ms by default (435). Modes 1 and 3 use `resetTimer()` (440). Modes 2 and 4 use `despawnTimer(despawn_timer)` (445). The timer is armed with it (449).
- Engaged NPC path (as read, not run): step (b) is inside `if(!npcthis->IsEngaged())` (416). If the NPC is engaged, `npcthis` is not cleared and `IsDespawned` is not set. `ForceDespawn` still arms the timer (449) and returns. `Process` then checks `IsDespawned` (260), which is false, so it creates a new NPC (285) and overwrites `npcthis` (287). The engaged NPC is not depopped, so as read this path can leave two live NPCs at one point.
- Death: `attack.cpp:2605` calls `respawn2->DeathReset(1)`. `DeathReset` counts the kill, computes `resetTimer()`, arms the timer, clears `npcthis`, and writes the remaining time to the database (spawn2.cpp:453-470). `attack.cpp:2845` removes the NPC from the zone limit ledger.
- Persistence: at zone load the saved remaining time is turned into a timer (spawn2.cpp:500, 548). A point with no saved time arms `resetTimer()` and triggers at once (109-110). Each point runs `Process` once at load (580).

## 2. Key functions

- `Spawn2::Process`: `/mnt/frankendom-donors/EQEmu/zone/spawn2.cpp` 152-353 (timer, condition, pick, caps, despawn call, spawn).
- `Spawn2::resetTimer`: `/mnt/frankendom-donors/EQEmu/zone/spawn2.cpp` 118-133 (respawn seconds to ms, +/- variance/2 roll, 100 ms floor).
- `Spawn2::despawnTimer`: `/mnt/frankendom-donors/EQEmu/zone/spawn2.cpp` 135-150 (same roll for the despawn timer).
- `Spawn2::ForceDespawn`: `/mnt/frankendom-donors/EQEmu/zone/spawn2.cpp` 407-450 (engaged check, modes, timer choice).
- `Spawn2::DeathReset`: `/mnt/frankendom-donors/EQEmu/zone/spawn2.cpp` 453-473 (kill count, respawn timer, database write).
- `SpawnGroup::GetNPCType`: `/mnt/frankendom-donors/EQEmu/zone/spawngroup.cpp` 71-119 (group cap, type cap, hour window, condition filter, weighted roll).
- `EntityList::LimitCheckType` and `LimitCheckGroup`: `/mnt/frankendom-donors/EQEmu/zone/entity.cpp` 4252-4292 (count of live NPCs per type and per group against a cap; a cap below 1 means no limit).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One timer per spawn point; respawn when it fires; the timer is rearmed on death | Respawn is stored in seconds per point and converted to ms (spawn2.cpp:120) |
| Respawn jitter: roll the delay uniformly within plus or minus variance/2, floor 100 ms | Variance in seconds (spawn2.cpp:124 `rspawn = zone->random.Int(rspawn - var_over_2, rspawn + var_over_2);`); floor 100 (spawn2.cpp:127) |
| Population cap per group and per type, counted from the live NPC ledger, checked at roll time | Group cap from the group row (spawngroup.cpp:76); type cap from npc_types.spawn_limit (spawngroup.cpp:84) |
| Weighted pick among open entries | Chance is an integer weight (spawngroup.cpp:98, 107, 110) |
| Engaged NPCs are protected from the despawn timer; unengaged ones are removed | Engaged means the hate list is not empty (zone/mob.h:783); the despawn timer default is 100 s (base_spawngroup_repository.h:145) |
| Persist the remaining timer across zone loads | Stored as start + duration in the respawn table (spawn2.cpp:500) |
| Zone pass cadence | 1000 ms (zone.cpp:956) |

## 4. TypeScript sketch

simplified: the sketch keeps the order of the donor: timer due, then (if an NPC is alive) despawn-or-keep, then group cap, then weighted type pick with type caps, then spawn. It omits: spawn conditions, hour windows, unique-by-name, waypoint spawns, roam boxes, zone-idle paths, database persistence, killcount, and the 5 s retry. It deliberately differs from the donor in the engaged case: the sketch keeps the one NPC and checks again later, and does not create a second NPC at the point (the as-read path in section 1). Constants are the donor's, except the sketch uses one despawn interval per point.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Ms = number;

interface Npc { id: number; type: string; group: number; engaged: boolean; }
interface Entry { type: string; chance: number; typeCap: number; } // typeCap 0 = no cap
interface Point {
  group: number;
  groupCap: number;   // 0 = no cap
  respawnS: number;
  varianceS: number;  // rolled as +/- varianceS / 2
  despawnS: number;   // 0 = an alive NPC is never removed by the point
  entries: Entry[];
  npc: Npc | null;
  dueAt: Ms;          // 0 = nothing scheduled
}

const MIN_TIMER_MS = 100;
const TICK_MS = 1000; // zone pass interval (fixed step); the caller runs passPoint for every point each pass

function rollMs(seconds: number, varianceS: number, rng: () => number): Ms {
  const base = seconds * 1000;
  if (varianceS === 0) return base;
  const half = (varianceS * 1000) / 2;
  return Math.max(MIN_TIMER_MS, Math.round(base - half + rng() * 2 * half));
}

function countLive(world: Npc[], pred: (n: Npc) => boolean): number {
  let c = 0;
  for (const n of world) if (pred(n)) c++;
  return c;
}

function removeNpc(world: Npc[], npc: Npc): void {
  const i = world.indexOf(npc);
  if (i >= 0) world.splice(i, 1);
}

// Weighted pick among entries whose type is still under its cap.
function pickType(p: Point, world: Npc[], rng: () => number): string | null {
  const open = p.entries.filter(e => e.typeCap === 0 || countLive(world, n => n.type === e.type) < e.typeCap);
  const total = open.reduce((s, e) => s + e.chance, 0);
  if (total <= 0) return null;
  let roll = Math.floor(rng() * total);
  for (const e of open) {
    if (roll < e.chance) return e.type;
    roll -= e.chance;
  }
  return null;
}

// Called on the NPC's death: the point forgets it and rearms its respawn timer.
function onDeath(p: Point, world: Npc[], now: Ms, rng: () => number): void {
  if (p.npc) removeNpc(world, p.npc);
  p.npc = null;
  p.dueAt = now + rollMs(p.respawnS, p.varianceS, rng);
}

// One pass per point. `spawn` creates the NPC and adds it to `world`.
function passPoint(p: Point, world: Npc[], now: Ms, rng: () => number, spawn: (type: string, group: number) => Npc): void {
  if (p.dueAt === 0 || now < p.dueAt) return;
  p.dueAt = 0;

  if (p.npc !== null) {
    // The despawn timer ran out while the NPC is still alive.
    if (p.npc.engaged) { p.dueAt = now + p.despawnS * 1000; return; } // fight in progress: keep it, check again later
    removeNpc(world, p.npc);                                          // unengaged: remove it, respawn later, no spawn this pass
    p.npc = null;
    p.dueAt = now + rollMs(p.respawnS, p.varianceS, rng);
    return;
  }

  if (p.groupCap > 0 && countLive(world, n => n.group === p.group) >= p.groupCap) {
    p.dueAt = now + rollMs(p.respawnS, p.varianceS, rng);
    return;
  }
  const type = pickType(p, world, rng);
  if (type === null) {
    p.dueAt = now + rollMs(p.respawnS, p.varianceS, rng);
    return;
  }
  p.npc = spawn(type, p.group);
  p.dueAt = p.despawnS > 0 ? now + p.despawnS * 1000 : 0;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population: one timer per spawn point; group and type caps; engaged-protected despawn). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn with a grace timer).
- The engaged test must read the server's fight state from `src/fight` (row 4, fight loop), not a hate list copied into the spawn code.
- Data fields (zone data unless noted): respawn seconds, variance seconds, despawn seconds, group cap, type cap, chance weight, hour window. Engine constants: the 100 ms floor, the 1000 ms pass, the 5000 ms type-cap retry (not in the sketch).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 23 (zone population: caps, respawn, despawn on empty with a grace timer); rule 4 (fight loop) for the engaged check

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism. Do not port the line structure.
- The as-read engaged path (section 1, step 6) can leave two live NPCs at one point. Frankendom must not copy it: one point, one NPC, and a test that an engaged NPC past its despawn timer stays and no second NPC appears.
- "Engaged" here means only that the hate list is not empty (zone/mob.h:783). That is not a cap on attackers. Frankendom's MAX_ATTACKERS = 3 is a fight-engine rule, and it is not a spawn cap.
- Persisted timers (spawn2.cpp:469, 500) store the remaining time in a database row. Frankendom's one ledger should keep the same remaining time in zone state on the server, never on the client.
- The donor counts live NPCs by walking a map at roll time (entity.cpp:4252-4292). Frankendom needs the count to come from the one ledger, not a second list.
- The 1000 ms zone pass is the donor's cadence. Frankendom's server tick is a fixed step (row 18 sub-line "server tick: fixed step, input intake, per-tick NPC budget"); the spawn pass should run on that tick, not on a separate 1 s timer.
- Respawns here are timers only: a kill is handled by `attack.cpp:2605`, and the donor does not check that a kill was server-verified. Frankendom kills are server-verified, so `onDeath` must run only from the server's verified kill.
