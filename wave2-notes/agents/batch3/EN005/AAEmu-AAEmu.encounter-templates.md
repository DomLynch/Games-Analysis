# AAEmu-AAEmu (encounter-templates, EN005)

Donor: AAEmu-AAEmu, an unofficial Archeage server emulator in C#. Tree: /mnt/frankendom-donors/AAEmu-AAEmu/ (VPS, read only).
Licence: conflicting in the repo. README.md lines 33-46 cite LGPL, LICENSE.GPL is the GPL v3 text, LICENSE.MIT is an MIT licence (Rain0Ash). The repo does not say which code is under which licence. No licence line on the game data (Creatures.xml, Doodads.xml, Worlds/*, npc groups SQL). Class C for any use of code or data: shape only, category-level inspiration.

Checked: spawn director (AAEmu.Game/Models/Game/NPChar/NpcSpawner.cs, 1,400 lines; read 54-275, 385-520, 733-826, 875-1165, 1208-1393), spawn tick (Core/Managers/World/SpawnManager.cs 150-175, 977-1100; Core/Managers/World/WorldManager.cs 175-210), spawner entry (NpcSpawnerNpc.cs 42-150; Models/Game/World/Spawner.cs 1-40), npc group loader and model (GameData/NpcGroupGameData.cs 40-96; Models/Game/NpcGroup/*.cs), AI behaviours (Models/Game/AI/v2/Behaviors/Common/IdleBehavior.cs, FollowPathBehavior.cs, AlmightyAttackBehavior.cs), old patrol classes (Models/Game/Units/Patrol.cs, Combat.cs), data (Data/Worlds/*/npc_spawns.json, Data/Path/*.path, SQL/patches/compact/2026-01-23-npc_groups.sql and -npc_group_members.sql).
Confidence: high on the order of operations in the code read; medium on live behaviour (nothing run). Defects below are read, not run.
Half read: both, partially. Server code is read. Data read: spawn positions (JSON) and npc group rows (SQL). Not in the box: the spawner template table (population, delays, schedule, radius) and the creature stat rows; the loader reads them from compact.sqlite3 (not in the repo).

## 1. What the player sees and feels
On a phone at 375 wide, AAEmu's outdoor enemies are placed as spawn points with a creature id and a position, and each spawn point keeps its population between a minimum and a maximum that rises with players close by. Nothing spawns unless a player is inside the point's test radius, and the population drops away when players leave. By the code defaults, a killed creature's body stays about 20 s; if it dropped loot, it stays 300 s more (template values not read). The spawn point refills after a random delay between two set values. A guard that chased someone walks back to its home point at a set speed and then resumes its route. Groups are a leader with followers at small fixed offsets; most groups in the data are two or three members.

## 2. Why it works, or is striking
- Readable at 375 wide: the group shape is the readable part. 101 of 158 groups have 2 or 3 members (npc group rows). The leader is marked (158 is_leader rows, one per group). Not measured on screen.
- One signature behaviour: the return-home walk after a chase (AlmightyAttackBehavior.cs 94-113), which needs no extra data.
- One signature sound or effect: none read. Idle skills exist (IdleBehavior.cs 104 TryUseIdleSkill) but their content was not read.
- Could be made ours at 20-30 percent resemblance: yes. "Leader plus followers at fixed offsets, walk home after a chase, refill after a random delay" is simple and reusable with no creature data.

## 3. The rule behind it
Order of operations as the code does it:
a. Player presence: a spawner is active only if a player is inside its test radius (IsPlayerInSpawnRadius, NpcSpawner.cs 455-505, cached 10 s). The world tick updates only active spawners (WorldManager.cs 183-196, 206-208).
b. Despawn check first (NpcSpawner.cs 81-91): if the despawn schedule says so, despawn; else if no player is in radius and NPCs exist, despawn now.
c. Spawn check second (94-99): the spawn gate (CanSpawn, 176-221) refuses while the spawn flag is set (196). The population cap follows players in radius: the cap is the player count when that count is between min and max, it is the template max when the count is above max, and it falls to the player count when the count is below min (385-417, line 396-397). Suspend and max checks apply.
d. Spawn (921-1006): the cap is checked once (line 932), then every template in the spawner's list spawns one NPC each (957-988). Weight is not used here.
e. Random spawn path (DoRandomSpawn, 1235-1245) picks one template by weight. Only this path uses weight.
f. Death (DoDespawn, 733-756): if a respawn time is set and the zone has room, the NPC is queued to respawn at its death time plus the spawner's respawn time (line 746). The body is removed DespawnTime seconds after the despawn is ordered (default 20 s, Spawner.cs 14; line 756), plus 300 s if loot remains (LootingContainer.cs 42).
g. Respawn tick (SpawnManager.cs 1042-1065): the spawner is flagged, and the next Update spawns a fresh NPC. The old object is not reused.
h. Groups: a group row is loaded (leader flag, move-leader flag, formation offsets x, y, z, formation tension, aggro rule id, enable respawn; NpcGroupGameData.cs 67-89). No code I read uses any of these fields outside the loader and model (grep of AAEmu.Game).
i. Return home (AlmightyAttackBehavior.cs 94-113): when the aggro table is empty and no path points remain, the NPC queues a walk at speed param 3 to its home position, then resumes its follow-path behaviour.
j. Idle priority (IdleBehavior.cs 73-98): aggro, then alert, then follow path, then follow the nearest NPC, then default. Talk has low priority.

Designer-tunable fields are in the JSON file. Donor values are not copied (licence conflict, class C).

## 4. For Frankendom
- 700 zones as data: AAEmu's spawn files are per-world JSON of creature id and position (main_world npc_spawns.json has 26,273 entries). Keep that split: spawn data apart from geometry, as in our zone-as-data rule.
- 100 Pit characters across zones: one creature id per spawn point, reused across worlds. Keep it.
- Many-vs-one: most groups are 2 or 3 members (101 of 158). Groups larger than 3 (55 of 158, up to 12 members) need our MAX_ATTACKERS = 3 cap in the engine; AAEmu has none.
- Server-verified events: the spawn director runs on the server tick. Keep it server-side. The client reads position and state only.
- Row 23 (zone population): caps and respawn map directly. Despawn on empty does not work as the code reads it (see defect D7), so our version must have its own grace timer, set as data.
- Row 17 (death and respawn): the corpse-linger and loot-linger pair (20 s, plus 300 s when loot remains) is a clean presentation rule. Keep the idea; the numbers are our data fields.
- Row 4 (fight loop: aggro, chase, leash): the return-home walk is the leash. Keep it. Our engine should reuse the same order: aggro, alert, follow path, idle.

## 5. Five-minute look test (Dom, on a phone)
Sandbox zone with one camp of three (leader plus two followers at -2 m offsets), one two-member guard pair that walks a six-point path and returns home after a chase, and one spawn point with a 60 s respawn and 20 s corpse linger. Dom walks it for five minutes at 375 wide and judges: can he tell the leader from the followers; does the guard walk home without teleporting; does a cleared camp refill with a visible gap; does a corpse with loot stay readable. Second pass with the respawn at 300 s. These are our test values, not donor values.

## 6. Licence and IP
Code licence conflicts in the repo (LGPL text in README, GPL v3 file, MIT file). Clean-room, shape only. Game data has no licence line; the repo says it is unofficial and not affiliated with the publisher (README line 48, as read). Client data is not in the repo (AGPL-like caution applies). The two attributed icons (CC BY-SA 4.0 and CC BY 3.0 US) are not used. No legal conclusion is drawn.

## 7. Gaps and half read
- Not read: spawner template rows (population, delays, radius, schedule) that the loader reads from compact.sqlite3; the npc_spawners rows; the creature stat rows; the idle skill content; the path follow code beyond FollowPathBehavior.cs 15-70 (Track, Line, Simulation not traced); SpawnAllNpcs caller (SpawnManager.cs 151, marked unused in code).
- Old patrol classes: Combat is never instantiated (grep count 0). Patrol.cs 126-187 (PauseAuto, Recovery) is commented out at its only call site (Npc.cs 1123), so the old resume-after-combat rule is dormant. Track and Simulation are instantiated twice each; not traced.
- Walk density: spawn positions only. main_world 26,273 NPC and 42,656 doodad entries; instance_library 2,277 NPC; instance_nachashgar 99 NPC; instance_training_camp 14 NPC (grep count of the UnitId key in each npc_spawns.json and doodad_spawns.json). Area is not measured, so density per square metre is not given. Population at a point is set by the unread template rows.
- Death and respawn presentation: timing only. The client death view was not read.
- Loot reveal: not read.
- Readability at 375 wide: not measured; the cap on enemies per frame comes from unread template rows.

## Defects (keep the idea, fix the defect)
D1 Cap overshoot. DoSpawn checks the cap once before the loop (NpcSpawner.cs 932), then every template spawns (957-988). A spawner with several templates can exceed MaxPopulation. Decision: adapt. Fix: check CurrentSpawnCount < MaxPopulation inside the loop.
D2 Weight ignored on the normal path. DoSpawn spawns every template (972); weight is used only in DoRandomSpawn (1245). Decision: adapt. Fix: pick one template per slot by weight, or document that weight is random-only.
D3 Spawn cooldown never active. IsSpawnDelayNotElapsed reads _lastSpawnTime (NpcSpawner.cs 164-170), which is declared readonly at DateTime.MinValue (line 47) and never assigned in the code read. Fix: stamp it in DoSpawn and use it as the per-spawner pacing limit.
D4 Schedule in-window branch reads as inverted. IsDespawningScheduleEnabled returns true for an NPC outside its window (1093, 1123) and also for an NPC whose schedule is in progress (1099, 1132). CanDespawnNpcs treats true as despawn (113). The comments at 1095 and 1101 say those NPCs should stay. Read, not run. Fix: return true only for outside-window NPCs; in-window NPCs stay.
D5 Group spawn is a stub. SpawnNpcGroup calls the single-NPC spawn (NpcSpawnerNpc.cs 146-148), so a group row spawns one NPC from its member id. Leader, offsets, tension and aggro rule are loaded and unused. Decision: adapt. Fix: spawn the leader first, then members at the offsets; use tension as follow stiffness; cap attackers at 3.
D6 Shared respawn roll. Each spawn rewrites the spawner's RespawnTime (NpcSpawnerNpc.cs 123), so every member uses the last roll. Fix: store the roll on the NPC.
D7 Empty-area despawn is not reached in the tick. The world tick updates only spawners with a player in radius (WorldManager.cs 183-184, 206-208), and DespawnNpcsNow is called only from Update (NpcSpawner.cs 87-91). Once players leave, NPCs of that spawner may stay. Read, not run; the live test is needed. Fix: a separate sweep over spawners that hold live NPCs, with a grace timer.
D8 No grace on immediate despawn. DoDespawnNow (NpcSpawner.cs 777-795) sets no despawn time, so the NPC is removed at the next respawn tick (SpawnManager.cs 1074). The only grace is the 10 s presence cache. Fix: set a despawn time from data.
D9 Spawn gate can stick. The spawn flag is set true when the schedule check passes (NpcSpawner.cs 1029, 1054; the no-window case also passes, line 1080), and CanSpawn refuses while the flag is set (196). Only a respawn event clears it (SpawnManager.cs 1056). A spawner emptied by the no-player despawn (D7, DoDespawnNow) queues no respawn event, so the flag can stay set and the spawner may not refill when a player returns. Read, not run; a live test is needed. Fix: clear the flag when the spawner's population drops below the cap, not only on a respawn event.
D10 Spawn-all early return. NpcSpawner.SpawnAll (NpcSpawner.cs 621-626) returns before DoSpawn when IsSpawningScheduleEnabled() is true, which is the usual case (line 1080). GM commands call SpawnAll (Scripts/Commands/Spawn.cs 108; SpawnGrid.cs 67). The condition reads inverted. Read, not run. Fix: return only when the schedule is not enabled.
Also read: the NPC spawn start in SpawnManager.SpawnAll is commented out (SpawnManager.cs 852), and NpcSpawnerDoSpawnTask has no callers. NPCs therefore spawn only through the world tick's Update, for spawners with a player in radius.

Best transferable idea: a spawn point is a slot with a creature id and a player-presence radius; a leader with followers at fixed offsets, a walk home after a chase, and a respawn after a random delay give a readable group without any new data.
Reuse tag: not checked against other lanes (FEEL reader, no repo search).
Brief rule served: encounter-templates feel note, walk density, rows 4, 17, 18 (server tick: fixed step, per-tick NPC budget), 23.
