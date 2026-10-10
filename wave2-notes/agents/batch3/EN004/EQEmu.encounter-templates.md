# EQEmu (encounter-templates, EN004)

Donor: /mnt/frankendom-donors/EQEmu (VPS, read-only)
Licence: GPL-3.0 (LICENSE.md line 3, "Version 3, 29 June 2007"). Clean-room, shape only. No code, tables or content copied. All numbers below are Frankendom starting points or the code's own constants described in words, not game data.
Halves: server half read (zone/spawn2.cpp, zone/spawngroup.cpp, zone/npc.cpp HandleRoambox, zone/waypoints.cpp, zone/mob.cpp RandomTimer, zone/entity.cpp idle loop, zone/common.h grid enum). Client half NOT in the box (client_files/ holds only an export and import tool). Data half: schema only (utils/sql migrations and common/repositories base classes). The zone spawn rows (spawn2, spawngroup, spawnentry, waypoint grids) are NOT in the box, so no walk density can be counted. No paired donor in the box.
Correction to AU018 (asset audit): it says the server half was not read and no server source is listed. The zone/ source tree is in the box (about 40 files, including spawn2.cpp at 1377 lines and spawngroup.cpp at 402 lines). This note reads it.
Depth: thin. The spawn, wander and idle logic is read in full. Zone data is absent, and grid, pathing and NPC death code were not read.

## 1. What the player sees and feels

On a 375-wide phone a camp of creatures stands inside a loose box around its post. They do not march in step. Each creature takes a short random step, stops for a random pause, then steps again, and it never leaves the box. A step is only chosen if the ground is near the creature's height and the server's path test passes from the creature to the target point (tried at three heights), so the wander does not pick points it cannot reach. A creature that is not in a fight and has been alive past its grace time leaves the field (despawns), and its spawn point waits and repopulates later. A boss lair stays shut until a timed in-world event moves a spawn condition past its threshold. Patrols follow a waypoint loop: circular, ping-pong, random near points, or one-way that ends with the creature leaving.

Where the donor has the rest: idle movement is the pause and step above. Death and respawn: the spawn point starts its respawn timer (with variance) when the creature dies, and the remaining time is saved and restored on zone restart. Loot reveal: not read. Walk density: not countable, because the zone spawn rows are not in the box. Readability at 375 wide: not applicable, since the client is not in the box.

## 2. Why it works, or why it is striking

- Readable rhythm: a move-stop-move cycle with a random pause in a stated range. Silhouette and beat are clear at phone size and the creatures look alive without animation work.
- One signature behaviour: a short step within a box, checked for ground height and a path test, then a pause. Simple to re-express in a browser game.
- Lair gate: a boss you can see but cannot yet fight, opened by a scheduled in-world event that changes a numeric condition. The player learns the schedule and comes back.
- Idle-zone freeze: when no player is in a zone the server does not simulate its creatures, except spawn points marked to keep moving. For 700 zones of data this is the compute win.
- Could be made ours at 20-30 percent resemblance: yes. Keep the box wander with random pause, the grace despawn and the timed lair gate. Change the names, the box sizes and the timings.

## 3. The rule behind it

Spawn point (spawn2):
- Respawn time in seconds, with a variance window of plus or minus half the variance (spawn2.cpp lines 118-133). Floor of 100 ms (line 127).
- Initial spawn: the timer starts with a respawn roll and fires at once (constructor, lines 109-110), so a fresh zone fills in its first tick. A saved remaining time overrides this on restart.
- A spawn point is gated by a spawn condition: it spawns only when the condition's current value is at least the spawn's minimum (line 173).
- The group picks one entry by weight among entries that pass three filters: a time-of-day window (line 89), a condition-value filter (line 94), and a per-type spawn cap (line 84). The weighted roll is at line 107. A group-wide cap is checked first.
- A unique-by-name type or a type over its cap does not spawn; the point retries in five seconds (spawn2.cpp, spawn-limit branches).
- When the creature dies the point starts its respawn timer and writes the remaining time to the respawn table (line 469), so a zone restart restores the wait.

Despawn (spawn group field despawn, despawn_timer default 100 seconds):
- The point re-checks on its timer while a creature is alive (line 256). If the creature is not engaged, the point despawns it (ForceDespawn, lines 407-452) and then waits again.
- Mode 1 and mode 3 wait the respawn time (resetTimer); mode 2 and mode 4 wait the grace time (despawnTimer, line 445). An engaged creature is kept and the check is rescheduled.
- Modes 3 and 4 depop with the spawn timer started by the depop path and return before the point's own timer start (line 418 onward). This path was not traced end to end. Recorded as unverified.

Roambox wander (npc.cpp HandleRoambox, from line 3739; the failure reset is around line 3878):
- Up to 10 attempts per step (line 3768). Each attempt picks a random offset within plus or minus the box distance around the creature's current position (lines 3769-3770), clamped to the box (lines 3771-3772).
- The ground at the new point must be within 100 units of the creature (line 3775). A path test (CanPathTo) is tried at heights 0, +250 and -250 (line 3782 call inside the loop over the height list at line 3780).
- If the chosen point sits on a box edge it is re-rolled inside the box (line 3803) to stop creatures bunching on the border.
- On arrival, the pause is RandomTimer(min_delay, delay) where the delay is clamped to at least the minimum (line 3743). Pause units: milliseconds.

Random timer (mob.cpp lines 4979-4986): returns a random value between min and max only when both are non-zero and min is strictly less than max. Otherwise it returns 14000 ms (line 4981).

Grid wander types (common.h lines 740-751; waypoints.cpp CalculateNewWaypoint):
- Circular (loop), Random10 (random among the 10 nearest points), Random, Patrol (ping-pong, lines 360-368), OneWayRepop and OneWayDepop (advance only; the creature repops or leaves at the end, line 747), Rand5LoS (random among the 5 nearest with line of sight, line 379), CenterPoint, RandomCenterPoint (alternate between centre and non-centre points), RandomPath (path to a random point rather than walking straight).

Idle zone (entity.cpp lines 480-520): with no clients present the server skips a creature's processing, unless the creature's spawn point is flagged to keep moving or a settle timer is still running (settle time = the zone's seconds-before-idle rule, line 482). Spawn events can still fire while empty.

Spawn events (spawn2.cpp): a scheduled change to a numeric spawn condition. Each event has a period in EQ minutes, a strict flag (only fire in the same hour), and an action: set, add, subtract, multiply or divide (enum at spawn2.h lines 137-141; add at line 817).

Data fields (Frankendom starting numbers; donor values null because the code is GPL):

| name | unit | donor value |
|---|---|---|
| respawn_s | s | null (spawn row) |
| variance_s | s | null (spawn row) |
| spawn_floor_ms | ms | null (code constant 100) |
| despawn_mode | enum 0-4 | null (spawn group) |
| despawn_grace_s | s | null (default 100 in migration) |
| roam_dist | world units | null |
| roam_ground_tol | world units | null (code constant 100) |
| roam_los_heights | units | null (code constants 0, 250, -250) |
| roam_attempts | count | null (code constant 10) |
| roam_pause_min_ms | ms | null |
| roam_pause_max_ms | ms | null |
| entry_weight | integer | null |
| entry_time_window | hours 0-24 | null |
| type_spawn_cap | count | null |
| group_spawn_cap | count | null |
| condition_min | value | null |
| event_period | EQ minutes | null |
| event_action | enum set/add/sub/mul/div | null |
| idle_settle_s | s | null (zone rule) |
| retry_unique_s | s | null (code constant 5) |

## 4. For Frankendom

Shape mapping:
- 700 zones as data: a camp is a set of spawn points (each with respawn, variance, box, and a weighted entry list), a lair is a spawn point gated by a condition, and the schedule is a list of events. The server decides every spawn, despawn and condition change. The client shows the step, the pause and the arrival.
- Zone population is row 23: group cap and per-type cap are the spawn caps, respawn with variance is the respawn, the despawn grace is the grace, and the box plus point count is the coverage. The parity row covers all of these.
- Many-vs-one (MAX_ATTACKERS = 3): a camp's engaged count must stay at or below three. A fourth entry waits outside the box until a slot frees.
- Server tick (row 18 sub-line): fixed step, per-tick NPC budget. The idle-zone freeze is the budget tool: zones with no players skip creature processing except flagged posts.
- Creature actor and leash (rows 4 and 7): the roambox is only the wander box. The chase and leash behaviour when a creature is engaged was not read, so the leash rule is ours to write (row 4).

Keep:
- Random step within a box, checked for ground and line of sight, then a random pause.
- Grace despawn for a creature that nobody has engaged, with the respawn wait saved across restarts.
- Lair gate by a condition changed by a scheduled event.
- Idle-zone freeze except for flagged posts.

Change:
- Fixed weights become zone data.
- The random-timer fallback and the variance floor are fixed (below).
- Engaged-count cap of three added at the spawn point.

Defects found (keep the idea, fix the defect):
1. RandomTimer returns 14000 ms when min equals max or either is zero (mob.cpp lines 4981-4982). HandleRoambox passes the clamped delay and the minimum, so a box with equal delay and minimum pauses for 14 s (npc.cpp line 3743). Decision: adapt (idea: random pause in a range). Fix: when min equals max return min; otherwise an inclusive uniform roll.
2. The variance floor is applied after the roll (spawn2.cpp lines 124-127). With variance larger than the respawn time the low end is negative, so most rolls land on the 100 ms floor. Decision: adapt (idea: respawn with variance). Fix: clamp the low end to the floor before the roll, then roll once.
3. Despawn modes 3 and 4 return before the point's own timer start when the creature is not engaged (spawn2.cpp lines 418-424). The schedule then relies on the depop path. Decision: adapt, with the timer set explicitly. Fix: start the timer in every despawn branch and test each mode in the sketch.

Look test (5 minutes, on a phone, 375 wide):
Place three creatures in a box six tiles wide on a test zone. Each steps and pauses. Show two variants side by side: a fixed two-second pause and a random one-to-three-second pause. Then add the defect case: equal minimum and maximum pause, which shows the 14-second stall. Next, a lair gated by a brazier that a timed event lights every fixed period. Dom judges whether the random pause reads as alive, whether the stall reads as broken, and whether the lit brazier reads as a schedule the player can learn.

## 5. Licence and IP

- Code: GPL-3.0. Shape only. No code, table content or text copied. Frankendom starting numbers are the designer's own.
- Zone data: not in the box. The AU018 note on ProjectEQ world data is unconfirmed in the tree.
- Name the trait kept (box wander with random pause, grace despawn, scheduled condition gate) and the trait changed (names, sizes, timings, data layout). No legal conclusion drawn.

## 6. Gaps

Not read:
- Zone spawn data (spawn2, spawngroup, spawnentry, waypoint grids): not in the box. Walk density is not countable.
- Pathing and navigation code (pathing.cpp, pathfinder files, mob_movement_manager).
- NPC death, corpse, loot and emote code.
- Client half (not in the box).
- ForceDespawn modes 3 and 4 end to end.
- Zone time (EQ clock) implementation behind IsInbetweenTime.
- lua/perl spawn hooks beyond the names (lua_spawn.cpp, perl_spawn.cpp).
- Escort: no escort-named code in zone/. The nearest mechanisms are the one-way grid types and quest-set grids (lua_npc SetGrid and AssignWaypoints). Not traced further.
- Ambush: no ambush-named code in zone/. Not a donor mechanism here.
- Camp: no camp type in code. A camp is several spawn points at one place (inferred from data shape; not verifiable without zone data).
- Half read: server only. Client absent. Data schema only.

Best transferable idea: a box wander with a random pause and a grace despawn that a lair gate can switch on, capped at three engaged creatures.
