# AAEmu-AAEmu (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/NPChar/NpcSpawner.cs` | Licence: GPL-3.0 (LICENSE.GPL full text; README "Licensing information" header says LGPL-3.0; a LICENSE.MIT file (MIT, Rain0Ash 2019) exists but no .cs file names it, so its scope is unclear) | C# | symbol `NpcSpawner.Update`

Checked: Read in full `NpcSpawner.cs` (1-1400), `NpcSpawnerNpc.cs` (1-150), `NpcSpawnerTemplate.cs`, `Spawner.cs`, and `SpawnManager.cs` 27-182, 849-1120 and 1042-1113 (respawn/despawn thread). Read `WorldManager.cs` 156-208 and 365 (the driver), `NpcGameData.cs` 100-130 (table load), `Npc.cs` 840 and 1029 (death), `LootingContainer.cs` 42, `GameObject.cs` 48-49. Not read: `AI/v2/Behaviors/Common/SpawningBehavior.cs` and `DespawningBehavior.cs`, the `Simulation` class, the body of `GameScheduleManager`, the body of `WorldManager.GetAround`, and `LootingContainer.cs` 290-310. Candidates opened for this topic: `NpcSpawner.cs`, `SpawnManager.cs`, `Spawner.cs`, `NpcSpawnerNpc.cs`, `WorldManager.cs`, `NpcSpawnerDoSpawnTask.cs` (13 lines, a wrapper). Confidence: high on what the code does as read; nothing was run, so the two reading-only claims in section 6 (cap overshoot, spawn flag) are marked. camera_scope: n/a.

Best transferable idea: Scale a spawn point's population to the players standing near it (one per player, at least one, never above the zone cap), and hold replacement until the old body has left the world.
Decision (proposed): adapt — the player-scaled cap and corpse-gated replacement fit row 23 and zones-as-data; the donor's spawn flag and its despawn-on-empty branch (which reads as unreachable) must not be copied.
Acceptance: server test: zone max 2 with three players in radius holds two members; after one dies there is no replacement until its corpse is removed at 20 s, and a fourth nearby player never lifts the count above 2.

## 1. Mechanism

- Driver. `WorldManager.ActiveRegionTick` is subscribed to the tick manager at one second, async (`WorldManager.cs` 365). Each tick it takes the spawners whose `IsPlayerInSpawnRadius()` is true (183-184, 206-208) and calls `Update()` on each (195). Spawners with no player in radius are not updated at all (see gap 1).
- `Update()` (73) runs under one static lock shared by every spawner (37). Order: (a) if `CanDespawnNpcs()` then despawn members (81-82); else (b) if no player is in radius and members exist, despawn them now (87-89, see gap 1); (c) only if neither acted, `CanSpawnNpcs()` then `DoSpawn()` (94-95).
- `CanSpawn` (176-225) checks in this order: template exists; no corpse in the member list (`HasCorpse`, 184); not despawning; spawn flag not set (196); this spawner is the optimal one of its group (202); the game schedule or time window allows it (208); population below the cap (214).
- The cap (`CheckSpawnCountCanSpawn`, 385-413). Nearby players are counted around the first NPC of the first entry in the spawner's member lists (`SpawnedNpcs.Values.FirstOrDefault()`, then element 0; 528-532), not necessarily a live member or one of this spawner's own group, within `test_radius_npc x 50` (392, 532). An empty spawner therefore always has a cap of 1. Zero becomes one (393-394). The effective cap is `min(max(players, 1), MaxPopulation)`. The two `MinPopulation` branches (396-402) reduce to the same value for valid data (gap 4). It is blocked when `members + group-count >= cap` (411), or at `SuspendSpawnCount` (405).
- Presence (`IsPlayerInSpawnRadius`, 455-486). Radius is `test_radius_pc` (or `test_radius_npc` if zero) x 50, squared (457-458). The answer is cached for 10 s (463).
- `DoSpawn` (from 921; end not checked). It checks `CurrentSpawnCount >= MaxPopulation` once (932), then loops over every member line `SpawnableNpcs` (957) and calls `npcTemplate.Spawn(this)` (972), which creates one NPC per line at the spawner position (`NpcSpawnerNpc.cs` 80-138; `SpawnNpc` body). It then adds them to the member list and decrements the reservation counter (`DecrementCount`).
- Death (`Npc.DoDie`, `Npc.cs` 840 stamps death; 1029 calls `Spawner.DoDespawn`). `DoDespawn` (from 733; end not checked) does this: if `RespawnTime > 0` and `group-count + reservations < MaxPopulation` (740), it reserves a slot (743) and sets the respawn time to death time plus `RespawnTime` (746). `RespawnTime` is a random integer drawn at spawn as `(int) Random.Shared.Next(SpawnDelayMin, SpawnDelayMax)` (`NpcSpawnerNpc.cs` 123; defaults 5 and 10). The delays are floats, so this is the donor's float extension `Next(float, float)` (`AAEmu.Commons/Utils/RandomExtensions.cs`, upper bound exclusive) cast to int, which truncates: 5 to 9 s by default, never 10. Whether or not it reserves, it sets the removal time to now plus `DespawnTime` (756; default 20 s, `Spawner.cs` 14), plus 300 s if loot remains (762; `LootingContainer.cs` 42). It queues the NPC for removal (767).
- Queues. `SpawnManager.CheckRespawns` (1042) runs on its own thread per world (317) and sleeps one second per pass (1113). For a respawn-ready NPC it calls `SetSpawnScheduled(false)` (1056). For a removal-ready NPC it calls `Spawner.Despawn` (`SpawnManager.cs` 1074-1077), which is `NpcSpawner.cs` 663: it takes the NPC out of the list, deletes it and releases its id.
- Replacement timing as read. The replacement cannot spawn while the dead member is still in the list (corpse gate, 184 and 442). It leaves the list at removal time, so the replacement appears about `DespawnTime` after death (20 s), or about 320 s when loot remains. The 5-10 s respawn timer only clears the spawn flag (see gap 2).

## 2. Key functions

- `NpcSpawner.Update`: `NpcSpawner.cs` 73-100. The per-tick decision: despawn first, then spawn.
- `NpcSpawner.CanSpawn` and `CheckSpawnCountCanSpawn`: `NpcSpawner.cs` 176-225 and 385-413. The gate list and the cap.
- `NpcSpawner.IsPlayerInSpawnRadius` and `GetNumberOfPlayerInSpawnRadius`: `NpcSpawner.cs` from 455 and from 507. The presence test and the player count, each with a 10 s cache.
- `NpcSpawner.DoSpawn`: `NpcSpawner.cs` from 921 (cap check 932, loop 957, spawn call 972). One cap check, then one NPC per member line.
- `NpcSpawner.DoDespawn` and `DoDespawnNow`: `NpcSpawner.cs` from 733 and from 777. Death path (reserve, respawn time, removal time) and the despawn-now path (reserve, queue removal with no delay).
- `SpawnManager.CheckRespawns`: `SpawnManager.cs` 1042-1113. The one-second respawn and removal queue.
- `WorldManager.ActiveRegionTick`: `WorldManager.cs` 156-208. The driver.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Cap = min(max(players near, 1), zone max) | Max population default 1 (`NpcSpawnerTemplate.cs` 9). Loaded from the `npc_spawners` table (`NpcGameData.cs` 113). Player count radius = `test_radius_npc` x 50 (`NpcSpawner.cs` 532). |
| Presence gate with a cache | Radius = `test_radius_pc` (or `test_radius_npc`) x 50, squared (`NpcSpawner.cs` 457-458). Cache 10 s (463). |
| Corpse blocks replacement | No number (rule at 184 and 442). |
| Corpse removal delay | 20 s (`Spawner.cs` 14). Plus 300 s when loot remains (`LootingContainer.cs` 42; used at `NpcSpawner.cs` 762). |
| Respawn timer | Random draw, 5 to 9 s by default (float draw with exclusive upper bound, cast to int; `NpcSpawnerNpc.cs` 123; `NpcSpawnerTemplate.cs` 13 and 20). Queue default 15 s (`Spawner.cs` 13), overwritten at each spawn. |
| Minimum spawn delay | Field 5 s (`NpcSpawnerTemplate.cs` 13). Never enforced: `_lastSpawnTime` is never assigned (`NpcSpawner.cs` 47, 166). |
| Presence and group caches | 10 s each (`NpcSpawner.cs` 463, 513, 581). |
| Driver | 1 s tick (`WorldManager.cs` 365). |

## 4. TypeScript sketch

simplified: the sketch follows the donor order for the parts that work as read: presence gate (caller side, with the 10 s cache), corpse gate, cap = min(max(players, 1), max), then the whole member list in one pass. It leaves out the spawn flag (`IsSpawnScheduled`) that the donor checks after the corpse gate, the schedule and time-window checks, the group-count loop, the random respawn draw, the global lock, the optimal-spawner choice, and the NPC creation itself. The reservation is used only in the death gate, and the spawn gate uses the live list count plus the group term; in the usual single-group case the donor's group term is zero, and the sketch keeps the term as a field so the zero stays visible. It is a model of the rule, not of the donor's exact state.

```ts
// Licence: copyleft (AAEmu LICENSE.GPL is GPL-3.0; README "Licensing information" header is LGPL-3.0).
// clean-room: written from the described mechanism, not a translation of the donor lines.
type Seconds = number;

interface SpawnPoint {
  maxPopulation: number;   // zone data (donor default 1)
  inList: number;          // living plus dead members still held by the spawn point
  corpses: number;         // dead members still held (they block replacement)
  reservedRespawns: number;// respawns queued and not yet filled
  othersInGroup: number;   // members of other spawn points in the same group (donor: usually 0)
}

// Presence gate: the caller only ticks a spawn point while a player is inside its test radius.
// The donor caches that answer for 10 s, so a change is seen up to 10 s late.
class PresenceCache {
  private at: Seconds = Number.NEGATIVE_INFINITY;
  private value = false;
  constructor(private readonly ttl: Seconds = 10) {}

  test(now: Seconds, probe: () => boolean): boolean {
    if (now - this.at >= this.ttl) {
      this.value = probe();
      this.at = now;
    }
    return this.value;
  }
}

// Target = one per nearby player, never above the zone cap, never below one.
function targetCount(playersNear: number, maxPopulation: number): number {
  return Math.min(Math.max(playersNear, 1), maxPopulation);
}

// One tick. Returns how many members to add (0 when blocked). membersPerPass is the
// number of member lines in the spawn point; the donor adds all of them in one pass.
function spawnTick(p: SpawnPoint, playersNear: number, membersPerPass: number): number {
  if (p.corpses > 0) return 0;                          // a corpse blocks replacement
  if (p.inList + p.othersInGroup >= targetCount(playersNear, p.maxPopulation)) return 0;
  return membersPerPass;                                // cap is checked once, before the pass
}

// Record that a fill happened (reservations are consumed by spawns).
function onSpawn(p: SpawnPoint, added: number): void {
  p.inList += added;
  p.reservedRespawns = Math.max(0, p.reservedRespawns - added);
}

// Death: the body stays in the list until removeAt. A respawn is queued only if the
// zone still has room after counting queued respawns.
function onDeath(p: SpawnPoint, now: Seconds, corpseHold: Seconds, lootHold: Seconds, hasLoot: boolean): { queued: boolean; removeAt: Seconds } {
  p.corpses += 1;
  const queued = p.reservedRespawns + p.othersInGroup < p.maxPopulation;
  if (queued) p.reservedRespawns += 1;
  return { queued, removeAt: now + corpseHold + (hasLoot ? lootHold : 0) };
}

// Corpse removal at removeAt: the member leaves the list, which re-opens the gate.
function onCorpseRemoved(p: SpawnPoint): void {
  p.corpses = Math.max(0, p.corpses - 1);
  p.inList = Math.max(0, p.inList - 1);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS passed (`/tmp/spawn-sketch.ts`).

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population engine logic, server side). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn). The 1-second driver is the server tick sub-line: "server tick: fixed step, input intake, per-tick NPC budget" under row 18 / post-K item 3.
- today: the zone spawn code does not exist yet (not read in this pass).
- Reuse tag: rewrite-from-idea (GPL-3.0 / LGPL-3.0; clean-room only)
- Brief rule served: zones as data (cap, radius, respawn and loot holds as zone fields), server-verified (spawn and removal state on the server), one ledger (members and reservations in one place).

## 6. Gaps and risks

- Gap 1, no despawn on empty as read. The branch that despawns when no player is near (`NpcSpawner.cs` 87-89) is reached only from `Update()`. The live caller passes spawners that already have a player in radius (`WorldManager.cs` 183-184, 195, 206-208). `SpawnManager.cs` 166 (`SpawnAllNpcs`) also calls `spawner.Update()` for every spawner with no radius test, but its only invocation is commented out (852), so the conclusion stands. The 10 s cache (463) gives the same answer within one tick, so the branch looks unreachable (reading, not run). A spawner with no player near is not updated, and its members are not removed by this path. Row 23 wants despawn with a grace timer, so the donor does not supply it. Frankendom needs its own rule, with the grace as zone data. Not run.
- Gap 2, the spawn flag can block a spawner. `IsSpawnScheduled` is set true on the time-window path (`NpcSpawner.cs` 1029 and 1054), and `IsWithinSpawnTime` returns true when a spawner has no window (1080). `CanSpawn` returns false while the flag is set (196). The flag is reset to false only at the start of the schedule check (1021), which runs only after the flag check passed, and by `SetSpawnScheduled(false)` from the respawn queue (`SpawnManager.cs` 1056). So once set, the flag stays until a death with room queues a respawn. A spawner emptied another way is not re-armed (reading, not run). Frankendom must use explicit state (idle, filling, blocked) and must not copy the flag.
- Gap 3, the minimum spawn delay is never enforced. `_lastSpawnTime` is declared at `NpcSpawner.cs` 47 and never assigned, so `IsSpawnDelayNotElapsed` always returns false (155, 166). The delay field is dead. The random 5-10 s draw (`NpcSpawnerNpc.cs` 123) only sets a timer that the flag path uses.
- Gap 4, `MinPopulation` does nothing for valid data. The two branches (396-402) reduce to `min(players, MaxPopulation)`. Only data with `MinPopulation > MaxPopulation` changes the result (reading). Do not give the field a meaning the donor does not use.
- Gap 5, cap overshoot for packs (reading, not run). `DoSpawn` checks the cap once (932), then adds one NPC per member line (957-972). A spawner with three member lines and a cap of 3 can reach 2 alive plus 3 new, i.e. 5. Frankendom's MAX_ATTACKERS = 3 is a fight rule and does not cover spawn caps. Check the cap per member.
- Gap 6, the group-count term adds the wrong value (reading, not run). `AreOtherNpcsInSpawnZone` loops over the other spawner keys and adds `CurrentSpawnCount + _scheduledCount` (601), which is this spawner's own count, once per other key. Its 10 s cache (581) is shorter than the 60 s that a comment in the same method describes (comment not quoted). Group clones share one dictionary because `Clone` is a `MemberwiseClone` (`NpcSpawner.cs` 1396). That sharing is the intent behind the group count, and the loop above is the bug.
- Gap 7, the reservation is counted only in the death gate. The death path (740, 784) counts `_scheduledCount`. The spawn gate (411) does not, unless another group key has members. Reservations are consumed only by `DecrementCount` on spawn (`DoSpawn`). Frankendom should count one ledger in one place.
- Gap 8, the schedule path may churn (reading, not run). `IsDespawningScheduleEnabled` returns true when a member is outside its window (1093-1094) and also when the game schedule is in progress (1099-1100). `IsNpcInTimeWindow` returns true for `InProgress` (1132). Both comments beside those lines say the NPC stays (1095, 1101). As read, a scheduled spawner in an open window would call `DoDespawn` on its members every tick, pushing their removal time forward. The intent may differ. Do not port this path until it is confirmed.
- Gap 9, one static lock (37) serialises every spawner's update across all worlds. Frankendom's server tick should budget spawn work per tick instead (row 18 sub-line "per-tick NPC budget").
- Gap 10, units. The radius is in the donor's world units after an x50 factor (457-458). The unit meaning of that factor was not read. Frankendom zone data should state its own unit.
- Gap 11, the corpse counts against the cap and blocks replacement until removal, and loot extends it to 320 s. Frankendom kills are server-verified, so a corpse cannot stay forever in a server-authoritative world; the removal time must be a zone field, not a constant.

Reuse tag: rewrite-from-idea (GPL-3.0 / LGPL-3.0; clean-room only)
Brief rule served: zones as data; server-verified spawn state; one ledger


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** Verified: Update order 73-100 and static lock 37, CanSpawn order 176-222 (template, corpse 184, despawning 190, spawn flag 196, optimal 202, schedule 208, cap 214), cap logic 385-418 (min(max(players,1),max); both MinPopulation branches reduce as claimed), suspend 405, group-count bug 601 and 10 s vs 60 s comment 580-581, presence 455-486 with 10 s cache, DoSpawn 921-990, DoDespawn 733-775 (740, 743, 746, 756, 762, 767), DoDespawnNow 777-796, flag logic 1021/1029/1054/1080 and SetSpawnScheduled from respawn queue SpawnManager 1056, _lastSpawnTime never assigned (47,166), IsDespawningScheduleEnabled inverted use 1093-1103 vs CanDespawnNpcs 113, driver WorldManager 183-208 and 365, Spawner.cs 13-14, LootDespawnExtensionTime 300, Clone 1396. Small errors: (1) 'first live member' - code uses SpawnedNpcs.Values.FirstOrDefault() list element 0 (528-532), not necessarily live nor this spawner's own list. (2) Respawn draw 'random integer from SpawnDelayMin to SpawnDelayMax (5 and 10)': Random.Shared.Next(min,max) has an exclusive upper bound, so 5..9 if the int overload is used (NpcSpawnerNpc.cs 123). (3) Gap 1 says Update() has only one caller; SpawnManager.cs:166 (SpawnAllNpcs) also calls spawner.Update() for every spawner with no radius test, but its only invocation is commented out at line 852, so the conclusion stands but the claim 'only caller' is incomplete even though the range was read.

**Missed:** SpawnAllNpcs path (dormant) and the NpcSpawnerNpc.Weight field (29) which is never used for selection; the 'first member list' player-count quirk means an empty spawner always has cap 1.
