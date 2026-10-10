# azerothcore-azerothcore-wotlk (encounter-templates, EN006)

Donor/Licence: VPS path /mnt/frankendom-donors/azerothcore-azerothcore-wotlk (read-only). Code is GNU GPL v2 (LICENSE). Game data is game-derived with no asset licence (class C, per AU005 and DC007). Inspiration here is category-level and shape-only. No code copied, no creature, spell or zone names, no IDs in our build. Not legal advice.

Checked: server code read for ambush (Maps/Map.cpp, Maps/SpawnData.h, AI/SmartScripts/SmartScriptMgr.h), camp (Entities/Creature/CreatureGroups.cpp and .h), patrol (Movement/MovementGenerators/WaypointMovementGenerator.cpp, Movement/Waypoints/WaypointDefines.h), lair (Map.cpp 2860-2903), escort (AI/ScriptedAI/ScriptedFollowerAI.cpp, 374 lines, read at 173-234). Data read as counts and sample rows: creature.sql, waypoint_data.sql, creature_formations.sql, linked_respawn.sql, spawn_group.sql, spawn_group_template.sql, smart_scripts.sql, pool_template.sql, pool_creature.sql. Confidence high on the mechanisms I quote (receipts.tsv, 62 rows, all verified). Medium on the consistency defects below: read, not run. Depth: full for the five shapes, thin for walk density.

Half read: both. Data (db_world SQL) and server code. The client half is not in this box (no models, art, or sound: AU005). The client-side paired donor is the WoWdot donor in this batch (not read for this topic).

Shape verdicts: ambush STRONG. camp STRONG. patrol STRONG (pause and event rules; the donor's generator is long, I read the parts that decide pauses). lair STRONG. escort STRONG (FollowerAI). walk density PARTIAL (data only, no area sizes).

Decision: adapt (idea). Two defects fixed in the plan below, plus two dead-or-latent code points listed under Change.

## 1. What the player sees and feels (375 wide, phone)
- Ambush: a quiet stretch of road, then a group of about 9 to 10 creatures appears in one beat when the player steps on a trigger. The spawn is all or nothing. In this donor the start is a smart-script event action (action 131), so a server event can start the group. The sister donor (cmangos) does the same job with an area trigger, a quest check and a forced spawn. The arrival reads as a trap.
- Camp: a leader and up to a dozen followers stand in a loose group at fixed distances and angles. When one of them is hit, the others join the fight (the assist flags). The leader will not walk off while a follower is still engaged, so the pack moves as one.
- Patrol: a creature walks a fixed loop of points and stops for a set time at some of them. 144,105 of 147,377 path points have no stop; 3,272 points do stop (the most common stops are 1 s, 10 s, 5 s and 2 s).
- Lair: a boss with minions that are held back while the boss is down. When a minion's respawn comes up and its boss is still dead, the minion is re-queued to the boss's respawn time plus a short random offset. A self-linked spawn is re-checked a day later, so in practice it does not return.
- Escort: a quest NPC walks a route with the player. If the player gets more than 100 yards away, the escort fails and the NPC leaves. The check runs once a second after a 2.5 s head start, and pauses while the NPC is in combat.

Readability: the group silhouette is the beat. A camp of three in a wedge reads at 375 wide; a camp of twelve will not. The lair gate shows as absence, so it needs a UI line (a greyed marker) or the player only sees a missing minion.

## 2. Why it works / is striking
- Readable at 375 wide: camp and ambush give a group silhouette; the lair gate gives a visible absence beat. Pass.
- One signature behaviour: camp = assist both ways (groupAI 3, 3,262 of 6,021 member rows). Lair = dependents hold until the master is back. Escort = a distance fail with a head start. Pass.
- One signature sound or effect: not in the data box. The client half is absent, so no sound or effect is read. Not claimed.
- Could be ours at 20-30 percent resemblance: yes. Each shape is generic (a pack, a boss guard, a route, a trap). Our version changes the trigger, the numbers and the presentation.

## 3. The rule behind it
Order of operations, with the numbers as data.

Ambush (manual spawn group).
1. A group carries a flag. MANUAL_SPAWN is 0x04 (src/server/game/Maps/SpawnData.h line 46). A manual group starts off on each map (Map.cpp 2642).
2. A smart action turns it on: action 131 (spawn group, ignore respawn, force). Action 132 turns it off. In smart_scripts.sql: 4 rows of 131, 8 rows of 132, out of 52,768 smart rows.
3. Group 100 has 10 members, group 101 has 9, group 102 has 10, group 103 has 9. Group 1 has 5. Total 43 member rows in 5 groups (spawn_group.sql).
4. Gate on respawn: respawn checks for members of an inactive group test the active flag (Map.cpp 2848 and 2939). A manual group therefore stays down until a smart action turns it on.

Camp (formation groups).
1. One row per member: leader GUID, member GUID, distance, angle in degrees (converted to radians at CreatureGroups.cpp 111), group AI bits, and two waypoint points. 6,021 member rows over 1,586 leaders. Most leaders have 2 to 5 members (530 leaders with 2, 415 with 3, 228 with 4, 155 with 5). 13 leaders have more than 12 members (not itemised).
2. Group AI bits. Member assists leader 0x001. Leader assists member 0x002. Evade together 0x004. Respawn on evade 0x008. Follow leader 0x200 (CreatureGroups.h 32-43). Counts: 3 (both assist) on 3,262 rows; 514 (follow plus leader assists) 666 rows; 515 (follow plus both assists) 587 rows; 2 (leader assists) 421 rows. About 1,620 rows carry the follow bit (values 512 to 539).
3. The leader does not start a move while any living member is engaged or evading (CanLeaderStartMoving, CreatureGroups.cpp 433-438). A forced wait retries after 1,000 ms (WaypointMovementGenerator.cpp 215).

Patrol (waypoint path).
1. Each point: position, orientation, velocity, delay in ms, smooth flag, move type, event id, event chance in percent. waypoint_data.sql has 147,377 rows over 7,210 creature GUIDs (the id column is a creature GUID).
2. Move types (WaypointDefines.h 26-33): 0 walk, 1 run, 2 land, 3 takeoff. Counts: walk 133,112; run 11,041; land 3,224.
3. Delay: a point with delay greater than zero stops the spline, sets the wait, and counts it down by the frame diff (WaypointMovementGenerator.cpp 140-143, 424-431, 471-474). Delay counts: 0 on 144,105 rows; 1,000 ms on 380; 10,000 ms on 326; 5,000 ms on 285; 2,000 ms on 196.
4. An event fires at a point with probability event chance (percent): ScriptsStart on the event id (WaypointMovementGenerator.cpp 407, receipted).

Lair (linked respawn).
1. linked_respawn.sql: 4,279 rows (guid, linkedGuid, linkType). linkType 0 has 4,225 rows; linkType 1 has 54. Self-linked rows: 12. Fan-in: the largest master has 180 dependents; 139 masters have 2 or more.
2. Respawn gate (Map.cpp 2884-2903): if a dependent's master has a respawn time set (still dead), the dependent is not respawned now. It is re-queued at the master's respawn time plus urand(5, 60) seconds (Map.cpp 2898). A self-link is re-queued one day out (Map.cpp 2896). A forced respawn and hard-reset creatures bypass the gate.
3. A boss kill can lock a spawn for good: BossAI binds the spawn to a DONE encounter (Map.cpp 2873-2880; the check repeats every 5 s).

Escort (FollowerAI, script-level).
1. Range 100 yards (ScriptedFollowerAI.cpp 23). First check after 2,500 ms (ctor, line 31), then every 1,000 ms (line 226). The check passes if the leader, or any group member, is within range.
2. Combat pauses the check (`!me->GetVictim()`). The return-to-leader state skips the check once (line 177-197 region, read).
3. On failure: despawn (log text at line 221). On complete: despawn (line 177-181 region).
4. Scripts: 52 files in the server tree mention EscortAI or FollowerAI (grep count, includes headers).

Walk density (data only).
1. Creature spawn rows: 149,879 over 33 maps. Largest: map 571 (33,806), map 530 (31,076), map 1 (30,282), map 0 (30,173).
2. Respawn seconds (spawntimesecs): 2,272 rows at 30 s or less; 10,625 at 31 to 120 s; 114,727 at 121 to 600 s; 22,255 over 600 s. Most of the world refills in 2 to 10 minutes.
3. Roaming: wander_distance above zero on 78,425 rows. MovementType: 0 idle on 65,129; 1 random on 78,075; 2 waypoint on 6,675 (enum at MotionMaster.h 39-41).
4. Per-zone density cannot be read: zoneId is 0 on 144,967 of 149,879 rows (96.7 percent). Only 49 zones carry any spawn. areatable_dbc and map_dbc have 0 data rows (DC007), so area size and walk time are not in the box.

Data fields (designer-tunable; donor values null, GPL and class C).
- group_ai_bits (bitmask): assist member-to-leader, assist leader-to-member, evade together, respawn on evade, follow leader. Unit: flags.
- follow_dist (unit: yards), follow_angle (unit: degrees), group_point_1 and group_point_2 (waypoint ids).
- respawn_seconds (unit: s): per spawn; donor distribution above.
- wander_radius (unit: yards).
- patrol_delay (unit: ms per point); patrol_event_chance (unit: percent).
- link_respawn_offset_min (unit: s, donor 5), link_respawn_offset_max (unit: s, donor 60), self_link_wait (unit: s, donor 86400).
- escort_range (unit: yards, donor 100), escort_check_interval (unit: ms, donor 1000), escort_head_start (unit: ms, donor 2500).
- manual_group_default (flag, off), group_trigger_event (smart action id).

## 4. For Frankendom
Mapping to our shape (700 zones as data; the 100 Pit characters reused across zones; many-vs-one; server-verified events drive client presentation).
- Ambush: a zone-data group, off by default, turned on by a server event (a trigger or quest state), spawned all at once. Row 23 (zone population: spawn caps, respawn, despawn with grace timer). Engine: origins/server/world-spawns.ts, the group's cap and respawn numbers as zone data. The client only shows the arrival. Server-verified: the server decides the spawn, not the client's trigger.
- Camp: a pack of up to MAX_ATTACKERS = 3 that joins when one is hit. Row 4 (fight loop: aggro, chase, leash). Target file (proposed): src/fight/pack.ts. The assist bit is the rule: when one engages, the others engage the same target. Our cap is 3, so the pack is a wedge or ring of three, never twelve.
- Patrol: a route with stops. Row 2 (AI brain: out-of-combat behaviour). Target file (proposed): src/fight/patrol.ts. The stop times are zone data.
- Lair: boss-gated minions. Row 23 (spawn gate) for the respawn wait, row 4 for the aggro link. Target: origins/server/world-spawns.ts (spawn gate) and src/fight/pack.ts (aggro link).
- Escort: the NPC walks with the player, fails at 100 yards. Row 4 (leash). Target file (proposed): src/fight/leash.ts. Our escort needs a warning before the fail, not a silent despawn (the donor's fail is silent).

Keep: the group flags as data (one bitmask per group); the all-or-nothing ambush; the leader that waits for members; the lair gate that re-queues instead of dropping; the 2.5 s head start and 1 s check on escorts.

Change:
- Drop the escort's silent fail. Show a warning and a 5 s return window.
- Lair gate: show the minion as a greyed marker while it waits. Do not show nothing.
- Respawn timing: keep the minute-scale re-queue offset but cap it to our zone pacing.
- Do not copy the flag names. Our names: pack_assist, pack_evade, pack_follow, zone_group_manual.

Defects found (keep the idea, fix the defect):
1. Dead flag: SPAWNGROUP_FLAG_DYNAMIC_SPAWN_RATE (SpawnData.h 47) is defined and listed in the ALL mask, and nothing in src/server/game reads it. Fix: each group flag gets one reader and one test, or the flag goes.
2. Dead flag: SPAWNGROUP_FLAG_ESCORTQUESTNPC (SpawnData.h 48) is defined and named in the config text (worldserver.conf.dist 4878). No reader found in src/server or modules (grep). Fix: the escort group flag must drive the escort start, or be removed. Our escort uses the quest state directly.
3. Latent narrowing: groupAI is uint16 (CreatureGroups.h 68) but is copied to uint8 at CreatureGroups.cpp 204, 244 and 291. The assist and evade bits fit in a byte, so this is latent, not active. Fix: use uint16 in all three copies.
4. Unreconciled data: 6,675 spawn rows have MovementType 2 (waypoint) and 7,210 creature GUIDs have waypoint rows. Not reconciled here. Fix: a data check before we trust either number.

## 5. Five-minute look test (Dom, on his phone)
Build one flag on the existing fight scene (no release rows, no lock). Three looks at the fight camera, 375 wide.
- A: a camp of three in a wedge in front of the hero. The first hit draws the other two in within one second.
- B: a camp of three in a ring around the hero with a slow angle wobble (about 20 percent of the spacing). Compare how readable the ring is at 375 wide.
- C: a lair: one boss and two minions. The minions are greyed out while the boss is up and come in only after the boss falls.
Ask: can you tell at a glance who is bound to whom (A or B), and does the lair gate read as "waiting" (C)? Target: src/fight/pack.ts, row 4.

## 6. Licence and IP
Code is GPL v2 (LICENSE). Game data is game-derived with no asset licence (AU005, DC007). Category-level inspiration only: a pack that joins when one is hit; minions held until the boss is back; a route that stops at points; an escort with a distance fail and a head start. Our names and numbers. The donor's readme says it is not an official Blizzard product (.github/README.md line 88, per AU005, not re-checked here).

## 7. Gaps
- Not read: the rest of WaypointMovementGenerator.cpp (only the pause and the event parts); BossAI and the scripts folder beyond the escort base and grep counts; the 52 escort-mentioning files (grep only); creature_summon_groups (not checked); the client half (absent); tests.
- Counts only, not read row by row: creature.sql, waypoint_data.sql, creature_formations.sql, pool_template.sql (9,229 rows), pool_creature.sql (1,671 rows).
- No sketch written. No TypeScript typecheck run (the feel note does not need a sketch to pass).
- Walk density per 20 s of walking is not measurable from this box (no area sizes, zoneId missing on 96.7 percent of rows). Walk density is recorded as partial, not as a number.
- Half read: both (data and server). The client half is not in the box.
- Idle and ambient: the roam radius and idle or random motion types are counted (section 3), the animation vocabulary is not read.
- Death and respawn presentation: the respawn seconds are data; no client death or respawn screen is in the box.
- Loot reveal ceremony: not read.
- Readability at 375 wide: judged from silhouette and group size only; no screenshots, no client.
