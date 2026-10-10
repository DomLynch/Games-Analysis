# cmangos-mangos-classic (encounter-templates, EN006)

Donor/Licence: VPS path /mnt/frankendom-donors/cmangos-mangos-classic (read-only). Code is GNU GPL v2 (LICENSE; DC013 and AU010). Game content is named as Blizzard Entertainment copyright (COPYRIGHT.md line 7). Inspiration here is category-level and shape-only: no code copied, no creature, zone, quest or item names in our build. Quest 1126 and the trap-group name appear only as receipts for how the donor gates an ambush. Not legal advice.

Checked: server code for formation groups (src/game/Maps/SpawnGroup.cpp and SpawnGroupDefines.h, read at 111-235, 439-486, 1541-1690 and 1827-1911; function list only for the rest), linking (src/game/Entities/CreatureLinkingMgr.cpp and .h, read 402-512, 555-614, 641-753), escort (src/game/AI/ScriptDevAI/base/escort_ai.cpp, read in full at the update and start paths), ambush trigger (src/game/AI/ScriptDevAI/scripts/kalimdor/silithus.cpp, 303-318), vicinity respawn callers (Maps/SpawnManager.cpp 332-336, Chat/Level3.cpp 5434), waypoint delay (src/game/MotionGenerators/WaypointMovementGenerator.cpp, 73-81, 211-216), schema and sample blocks (sql/base/mangos.sql), loader queries (src/game/Globals/ObjectMgr.cpp 1125-1398). Confidence high on the mechanisms and quotes (receipts.tsv, 62 rows, verified). Medium on the defects: read, not run. Depth: full for camp, lair and escort; thin for patrol and ambush (the data is absent, so the mechanism is read from code only).

Half read: server code and schema only. The data half is empty: the base dump has schema and sample rows only, the creature spawn list and spawn-group rows are not in the box (AU010, DC013). The client half is not in the box and no paired donor exists.

Shape verdicts: ambush STRONG (trigger and gate read; data absent). camp STRONG. patrol PARTIAL (delay rules read; path data absent, generator mostly unread). lair STRONG (with one likely defect). escort STRONG. walk density NONE (no creature rows in the box; the base dump cannot give a density).

Decision: adapt (idea). Four defects fixed in the plan below, each with a fix line.

## 1. What the player sees and feels (375 wide, phone)
- Ambush: a player steps across a line on a quest road and a small group (the donor's trap group) appears together. The trigger is an area trigger; the spawn is forced, so the group does not wait for its timers. The beat reads as a trap, not as wandering monsters.
- Camp: a leader and followers hold a loose wedge or ring. Each follower sits at its own angle and distance, and the angles drift on a slow, eased wobble so the group never freezes. The shape is picked from seven formations (random wedge, single file, side by side, geese, fanned out behind, fanned out in front, circle the leader). The gap between members comes from each model's collision width times 3, so big models get bigger gaps.
- Patrol: a creature walks a route and pauses at points for a wait time set in the path row. The donor's default if a route has one point with no wait is a 5 s hold.
- Lair: a minion pack that does not respawn while its boss is down. The minion is held back and re-queued to the boss's respawn time. A minion can also be set to despawn when its boss dies, or to respawn when its boss respawns.
- Escort: a quest NPC walks the route with the player. If the player and their group go beyond 66 yards, the escort fails. The check runs every second after a 2.5 s head start. It pauses while the NPC is in combat and while it is paused by a script.

Readability: a camp reads well when it has 3 members and a clear wedge. A ring of 8 or more reads as a crowd at 375 wide.

## 2. Why it works / is striking
- Readable at 375 wide: the seven formation shapes are readable as silhouettes at small counts (1 to 3 members). The lair gate reads as absence and needs a line in the UI.
- One signature behaviour: camp = the formation that holds a shape and eases its wobble; lair = a respawn gate that waits for another creature; escort = a distance fail with a head start.
- One signature sound or effect: none in the box. The ambush trigger calls a broadcast text on the first drone (silithus.cpp 317), which is sound-adjacent but not a sound.
- Could be ours at 20-30 percent resemblance: yes. The formation shapes are generic geometry; the lair gate is a generic rule; the escort fail is a generic rule.

## 3. The rule behind it
Order of operations, numbers as data.

Ambush (trigger and forced group spawn).
1. A group is a named set of creatures and game objects. A group starts enabled if its entry says so; the loader turns it off when a member's spawn mask is zero (ObjectMgr.cpp 1519).
2. The area trigger handler (silithus.cpp 303-313): not for GMs, the player must be alive, and must hold quest 1126 (line 308). Then SpawnGroup::Spawn(forced = true, ignoreRespawn = false) (line 313). Forced spawns skip the enabled check (SpawnGroup.cpp 159).
3. The other path, a GM command, calls RespawnSpawnGroupsInVicinity (Level3.cpp 5434). The vicinity function (SpawnGroup.cpp 439-472) saves each member's respawn time as now (line 471), so every member comes back on the next pass. Its only caller in src is that GM command. The donor does not automate a refill when players come near.
4. The group's cap is the maximum alive (MaxCount, SpawnGroup.cpp 175). Random entries pick by min count first, then an explicit chance roll, then a shuffled equal chance (SpawnGroup.cpp 116-155, read).

Camp (formation).
1. Shapes (SpawnGroupDefines.h 128-139): random 0, single file 1, side by side 2, geese 3, fanned out behind 4, fanned out in front 5, circle the leader 6. Options: keep compact (0x02) collapses dead slots. Follower-does-not-pathfind (0x01) is marked not yet implemented in the header.
2. Random shape spacing: testInterSpread = modelWidth * 3 (SpawnGroup.cpp 1588). The first member goes behind on one side, the second behind on the other side, the third and fourth straight behind, further back, and members from 10 on sit beside the leader in pairs (the integer division at 1674 is deliberate pairing, checked).
3. Slot wobble: each slot holds a target angle and distance, a maximum variation of pi/8 times model width for angle and the spacing for distance (SpawnGroup.cpp 1680). The variation point is picked in a band around the slot (1883-1893). Each update moves a fraction (1/20) of the way to the target (1897-1899), see defect 1.
4. Mirroring: when the group is flagged to mirror on the path, the angle flips to 2 pi minus the variation (1872).
5. Group flags (SpawnGroupDefines.h 76-80): aggro together 0x01, respawn together 0x02, evade together 0x04, mirror formation 0x10. Group max alive (MaxCount) is data.

Lair (linked spawns).
1. Link flags (CreatureLinkingMgr.h 58-81): aggro on aggro, respawn on evade, despawn on evade, selfkill on death, respawn on death, despawn on death, respawn on respawn, despawn on respawn, follow, despawn on despawn, can't-spawn-if-boss-dead (0x0400), can't-spawn-if-boss-alive (0x0800), evade on evade. Events: aggro, evade, die, respawn, despawn (CreatureLinkingEvent, lines 46-53).
2. Dispatch (DoCreatureLinkingEvent, CreatureLinkingMgr.cpp 402-512): linked slaves are found by entry and by guid, then the master side runs only for the flags that apply to the reverse direction. An aggro on a slave pulls the master into combat with the same enemy (CreatureLinkingMgr.cpp, DoCreatureLinkingEvent, read 402-512).
3. Spawn gate (CanSpawn, 699-752): a map-wide link (search range 0) reads the boss encounter state and the boss's respawn readiness. A local link (search range above 0) reads the master's alive state in a squared-distance window (659).
4. Respawn readiness (IsRespawnReady, 663-676): a master is ready when it has no respawn time (alive) or its timer has passed, and the master itself passes CanSpawn (666).

Escort (npc_escortAI).
1. Start (escort_ai.cpp 239-297): refused in combat or while already escorting. Path from the waypoint manager. Head start of 2,500 ms before the first move (294).
2. Range check (UpdateAI, 129-169): only while escorting, not in combat, not returning, not paused. Every 1,000 ms (162) the check passes if the player or any group member is within 66 yards (17). On failure: the quest fails for the player and group; then either an instant respawn, a pet unsummon, a group despawn or a forced despawn (136-160).
3. Arrival at the last point (MovementInform, 182-203): instant respawn or forced despawn.
4. Open question left in the code (escort_ai.cpp 141): the author asks whether the NPC should keep going after the player leaves. Not decided here.

Patrol (waypoint).
1. Point rows (mangos.sql 14287-14298): path id, point, position, orientation, wait time (ms), script id, comment. The base dump has no insert rows for this table (0 rows).
2. Single point with no wait: forced to a 5 s wait (WaypointMovementGenerator.cpp 81, with a DB error log at about 76).
3. Wait time: a script can change a node's delay; the new wait is the node delay plus the script's time (211).

Walk density: NONE in the box. The creature spawn list is not in the base dump, so per-area or per-20-second density cannot be measured.

Data fields (designer-tunable; donor values null, GPL v2 and category-level data).
- formation_shape (enum 0 to 6), formation_spread (unit: game distance, donor default 3.0), spacing_factor (unit: multiple of model collision width, donor 3.0), angle_wobble_max (unit: radians, donor pi/8 times model width), ease_divisor (unit: frames, donor 20).
- group_max_alive (count), group_flags (bitmask: aggro together, respawn together, evade together, mirror).
- link_can_spawn_if_boss_dead (flag 0x0400), link_can_spawn_if_boss_alive (flag 0x0800), link_search_range (unit: game distance; 0 means map-wide).
- escort_range (unit: yards, donor 66), escort_head_start (unit: ms, donor 2500), escort_check_interval (unit: ms, donor 1000).
- patrol_wait (unit: ms per point, donor 5000 for the single-point default).

## 4. For Frankendom
Mapping: 700 zones as data; the 100 Pit characters reused across zones; many-vs-one; server-verified events drive presentation.
- Camp formations for our three attackers: row 4 (fight loop). Target file (proposed): src/fight/pack.ts. Only three slots (MAX_ATTACKERS = 3), so the random wedge with two behind and one in front, the fan in front, and the ring. The wobble is client presentation only; the slot the server assigns is the one that counts.
- Ambush trigger: row 23 (zone population). Target: origins/server/world-spawns.ts for the group and gate. The trigger is a server event (quest or trigger), so the spawn is server-verified and the client only shows the arrival.
- Lair gate: row 23 for the respawn wait; row 4 for the aggro link. Targets: origins/server/world-spawns.ts and src/fight/pack.ts.
- Escort: row 4 (leash). Target (proposed): src/fight/leash.ts. Our rule: a warning at 50 yards, a 5 s return window, then the fail. The donor's fail is silent.
- Patrol: row 2 (AI brain, out of combat). Target (proposed): src/fight/patrol.ts. Wait times are zone data.

Keep: the seven shapes as a small enum (we need three); the model-width spacing (silhouettes scale with the creature); the lair gate that re-queues instead of dropping; the 2.5 s head start and 1 s check; group flags as one bitmask.

Change:
- Replace the silent escort fail with a warning and a return window.
- Show the lair gate as a greyed marker while the minion waits.
- Do not use the donor's vicinity respawn as an automatic rule; it is a GM command in this donor.
- Do not copy flag names; ours are pack_assist, pack_evade, zone_group_manual, gate_on_boss_dead.

Defects found (keep the idea, fix the defect):
1. Slot wobble snaps down. SpawnGroup.cpp 1897 tests diff > 0.01 only, so an eased move happens when the target is above the current value. A target below the current value snaps to it in one frame (1901-1902 else branch). Fix: step both ways using the absolute difference; ease the distance with the same rule (the distance test at 1905 has the same one-sided form).
2. Two different rules for the same boss gate. Map-wide CANT_SPAWN_IF_BOSS_DEAD returns false whenever the instance says an encounter is in progress (725-726), and otherwise returns the master's respawn readiness (728). The local branch returns the master's alive state (743). These disagree: while the boss is alive during an encounter, the map-wide branch blocks the minion, and the local branch allows it. Also, after the boss's respawn timer passes but before it respawns, the map-wide branch allows the minion while the local branch blocks it. Fix: one rule. Decide explicitly whether an encounter in progress should block. Mark as needs a check of intent.
3. Unbounded recursion risk. IsRespawnReady calls CanSpawn for the master (666). If the master has its own can't-spawn link, the chain continues. Two links that point at each other would recurse without end. Not triggered in the box (no linking rows in the base dump). Fix: a visited set or a depth cap of about 8.
4. Zero spacing without a collision width. modelWidth is taken only from members that have an owner with a collision width (the loop at 1548-1557). If none has one, testInterSpread is 0 and every slot stacks on the leader. Fix: a floor on modelWidth (for example 1 game unit).

Checked, not defects: Position::GetDistance returns squared distance (Object.h 298-299), and both range tests compare squared to squared (CreatureLinkingMgr.cpp 659; SpawnGroup.cpp 439 uses the same squared compare). The integer division at 1674 is intended pairing. Pools and weather are covered in the earlier catalogue, not here.

## 5. Five-minute look test (Dom, on his phone)
Build one flag on the existing fight scene (no release rows, no lock). Three looks at the fight camera, 375 wide, with three attackers:
- A: random wedge (two behind, one in front), with the wobble on.
- B: fanned out in front, with the wobble on.
- C: the same wedge with the donor's defect 1 reproduced (the wobble only eases up). Watch for a snap when the angle comes back down.
Ask: which silhouette reads fastest at 375 wide, and does C show a snap. Target: src/fight/pack.ts, row 4.

## 6. Licence and IP
Code is GPL v2 (LICENSE line 2). Shape only: no code copied, no names. Game content is Blizzard copyright per COPYRIGHT.md line 7, so inspiration stays category-level: a wedge of three that holds its shape; a minion that waits for its boss; an escort that fails at a distance. The donor's own notice says it is not affiliated with Blizzard (COPYRIGHT.md line 28, per AU010). Not legal advice.

## 7. Gaps
- Not read: most of WaypointMovementGenerator.cpp (only the first delay rules), RandomMovementGenerator and IdleMovementGenerator (idle and roam behaviour not read), most of SpawnGroup.cpp (Despawn, the spawn loop past line 235, the group-to-group link at 556), the spawn-group loader in full (ObjectMgr.cpp 1125-1398 read by query text only), BossAI and most scripts (grep counts only: 19 grep hits for SpawnGroup( or SpawnGroupSpawn(, 34 files use npc_escortAI, 1 JoinCreatureGroup call, 27 MoveWaypoint call sites under AI).
- Data half empty: spawn-group, linking, formation, waypoint and creature spawn rows are schema only in the base dump (mangos.sql). No density, no pool, no spawn counts from data.
- Client half: none in the box. Death and respawn presentation, loot ceremony, sound: not read.
- Idle and ambient animation vocabulary: not read.
- No sketch written and no typecheck run (the note does not need a sketch to pass).
- Readability at 375 wide: judged from silhouette and member count only; no screenshots.
