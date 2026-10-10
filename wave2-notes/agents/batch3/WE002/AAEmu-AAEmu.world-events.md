# Feel note: AAEmu-AAEmu, topic world-events (WE002)

Donor tree (VPS, read-only): /mnt/frankendom-donors/AAEmu-AAEmu/
Licence (from the AU002 asset audit, re-checked here): code licence conflicts inside the repo. README.md says LGPL v3; LICENSE.GPL is GPL v3; LICENSE.MIT is MIT. The repo does not say which file covers which code. Treat as no-copy. Game data files (Data/*.json, *.xml) carry no licence line. Game client files are not in the repo. Unofficial server; the README says it is not affiliated with the game's rights holder.
Half read: server. Read: AAEmu.Game/Models/Game/InstantGame/ (InstantGame.cs, InstantGameEvents.cs, GameRuleSet.cs, Battlefield.cs), Core/Managers/InstantGameManager.cs (queue start rule), GameData/BattlefieldGameData.cs, GameData/SchedulesGameData.cs, Models/Game/Schedules/GameSchedules.cs, Core/Managers/GameScheduleManager.cs (outline and key blocks), Models/Game/AI/v2/AiCharacters/BigMonsterRoamingAiCharacter.cs, Models/Game/AI/v2/Behaviors/Common/RoamingBehavior.cs, Models/Game/AI/Utils/AIUtils.cs, Models/Game/World/WorldEvents.cs.
Data half: one file read, AAEmu.Game/Data/battlefields.json (two battlefield records). The schedule and rule-set tables (game_schedules, game_schedule_spawners, game_schedule_doodads, game_schedule_quests, game_rule_sets) are loaded from a SQLite game-data file that is not in the repo, so those rows are not in the half I read.
Client half: not read.
Asset audit: AU002 covers the assets (icons, attribution pages). Not re-read here.

Depth is thin. This donor has no world-event system in the sense of an invasion, a world-boss timer or a server-wide event calendar. The code has four event-like parts: a battlefield match with a queue, a roaming AI for big monsters, cron-gated spawners and doodads, and a set of instance event hooks. Searches for invasion, world-event, game-event and scheduler terms across AAEmu.Game and AAEmu.Commons returned 16 files; the matching lines read show no invasion or world-boss timer.

## 1. What the player sees and feels
A player joins a queue for a battlefield. When enough players are in, the match gives a start countdown of about twenty seconds, and the two sides are dropped at their own spawn points on the map. During play the server sends each score as it lands, with the scorer's name, so the ticker feels live. The match ends when one side reaches the victory score or when the play timer runs out. A result screen then sits for the ending time before the instance is torn down. Elsewhere, big monsters idle near their post, wander a few steps, pause, wander again, and turn to attack as soon as one player is in aggro range. Some spawners and props appear only on certain days or at certain clock times, so a camp can be there at night and gone by day. None of this is announced in the world.

## 2. Why it works / is striking
- Readable at 375 wide: a queue, a countdown, a score line with a name, and a result. Each is one line of text and one number.
- One signature behaviour: the roam-pause-roam loop of the big monster, with the switch to attack on aggro.
- One signature effect: the score-by-name line during the match. No sound or particle is read in the code.
- Could be made ours at 20 to 30 percent resemblance: yes for the match timer and the roam loop. The cron-gated camp is a good data idea. The per-spawner day window is a cheap daily rhythm without a live calendar.

## 3. The rule behind it
### 3a. Battlefield match (server, InstantGame.cs)
- Rule set (GameRuleSet): corps size, two faction ids, time_opening, time_playing, time_ending (all minutes), victory score. Rows come from game_rule_sets (not in the repo).
- Match phases: queue; start when members equal corps size times two (InstantGame.cs line 152); start countdown of 20000 ms (line 159), with the players reset after a 3000 ms delay (Start method, not line-checked); a play timer of time_playing minutes; EndGame sends the result and waits time_ending minutes (line 194), then the instance is removed.
- Victory: a score at or above victory_score ends the match early (InstantGameEvents.cs line 18).
- The client gets the opening time in milliseconds at join (SCInstantGameJoinedPacket, line 20).
- Queue start rule (InstantGameManager.cs line 204): minimum to start is 1 when the queue count is above zero, else corps size times two. What the queue count means at that call site was not settled in the half read.
- Open gap: a TODO at InstantGame.cs line 151 says the game should expire after 60 seconds without enough players. The expiry is not implemented in the read code.

### 3b. Battlefield spawns (data)
- Data/battlefields.json: two records (BattlefieldId 11 and 7). Each has a Corps1Spawn and a Corps2Spawn with a zone id and X, Y, Z. Record 11 uses zone 302 with the two corps spawns 200 apart on Y. Record 7 uses zone 198.

### 3c. Roaming big monster (AI)
- BigMonsterRoamingAiCharacter.cs: roam is the default behaviour (line 13). On an aggro target change it goes to BigMonsterAttack. On talk it goes to Talk. When it loses aggro it returns to its state.
- RoamingBehavior.cs: each hop picks a point in a square of half-width 6 around the idle point (AIUtils.cs line 16, maxRoamingDistance = 6; units not checked, likely game units). After arriving, it pauses for Random.Shared.Next(3, 6) seconds (line 53), which gives 3, 4 or 5 seconds because the upper bound is exclusive. A TODO at line 65 says group member handling is not done.
- AiParamType (Models/Game/AI/Enums/AiParamType.cs): Roaming 13, BigMonsterRoaming 20, ArcherRoaming 22, WildBoarRoaming 24.

### 3d. Cron-gated spawners and doodads (server, data)
- SchedulesGameData.cs loads four tables: game_schedules, game_schedule_spawners, game_schedule_doodads, game_schedule_quests (lines 30, 62, 82, 102).
- A game schedule holds a day of week (or any), start and end time in minutes, and start and end dates (GameSchedules.cs). GameScheduleManager.cs turns these into a cron expression for the start and the end, and reports a period status for each spawner and doodad. Spawners and doodads are looked up by spawner id or doodad id.
- Result: a camp or prop is present only inside its schedule window. The rows are not in the repo, so the actual windows are not known.

### 3e. Instance event hooks (WorldEvents.cs)
- Six event hooks on each world instance (WorldInstance.cs line 88): unit killed, unit spawned, combat started, combat ended, area clear, doodad spawned. The comments name them as instance events. The consumers were not read.

## 4. Frankendom mapping
- 700 zones as data: the schedule row (day, start minute, end minute, start and end date) fits a zone row without code. Zones read the same rows and the server evaluates the window.
- 100 Pit characters reused across zones: the roam loop (idle point, wander, pause, aggro switch) is a reusable AI shape for any Pit character. The 6-unit radius and the 3 to 5 second pause are good starting numbers for many-vs-one, because they keep one boss near its post.
- Many-vs-one, max three attackers: the battlefield queue fits a small-group fight (corps size of three), not a 40-person war. The score line with a name is a clean way to show three attackers' contributions.
- Server-verified: the queue, the countdown, the score and the result are sent by the server. Keep this. The client should draw the timer from the server's opening time in milliseconds.
- What to keep: the four match phases (queue, countdown, play, result), the victory-score early end, the day-and-clock schedule rows, the roam-pause loop.
- What to change: add the queue expiry that the TODO names. Keep the group-member handling that the roam TODO names, so a roaming boss does not wander away from its group. Drop the 20000 ms countdown as a hard-coded number; make it a data field.

## 5. The 5-minute look test (Dom, on the phone)
Build one screen with three parts at 375 wide: a queue card reading "3 of 6 for the Ash Ridge match" with a fill bar; a match card with a 20-second countdown, then a score line "Ash Ridge 2 to 1, Kestrel scored"; a result card showing the winner for 10 seconds. Separately, one roaming boss in a field that wanders six units, pauses three to five seconds, then turns to attack when a player enters its aggro ring. Dom judges: does the queue fill read at a glance; does the score line feel like a live contest; does the wander-and-pause read as a boss waiting, not a bug.

## 6. Licence and IP
- Code: conflicting licence files in the repo (LGPL v3 in the README, GPL v3 and MIT in the licence files). No code copied. Category-level only.
- Data: no licence line on the data files. Coordinates and schedule rows are not reproduced here.
- Recreate as a clearly distinct original: keep the four match phases and the roam loop; change the names, the map, the numbers and the score-line wording.

## 7. Gaps
- Not read: the rest of GameScheduleManager.cs (599 lines; key blocks only); the rest of InstantGameManager.cs; Npc.cs and DoodadSpawner.cs beyond the grep hits; Creatures.xml and npc_spawns.json beyond a roam count (6 and 6 matches; npc_spawns.json has 213909 lines).
- Consumers of WorldEvents not read (grep found only the field on WorldInstance).
- No invasion or world-boss timer found in the code read.
- Half read: server. Data: battlefields.json only; the SQLite rule-set and schedule rows are not in the repo.
