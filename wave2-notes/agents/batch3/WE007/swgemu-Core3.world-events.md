# Feel note: swgemu-Core3, topic world-events (WE007)

Donor tree (VPS, read-only): /mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/
Licence: repo is AGPL v3 (README.md, COPYING line 1). Many Lua scripts carry an LGPL header (AU051 counted 18,274 of 30,521). None of the files I read below carry a licence header, so they fall under the repo AGPL statement. Copyleft, so donor values are not used as data: every donor_value below is null.
Half read: SERVER. Lua scripts under bin/scripts (managers/gcw_manager.lua, screenplays/crackdown, screenplays/battlefields, screenplays/events/lifeDay.lua, screenplays/gcw/newsnet.lua, screenplays/space/SpaceSurpriseAttackScreenplay.lua, squadrons/CorsecSquadronScreenplay.lua, ai/crackdown.lua) plus C++ under src/server/zone/managers/gcw and src/server/zone/objects/region/space. DATA: the space wave-spawner form table in sql/datatables.sql. The CLIENT half (.tre art, string tables) is not in the box; string keys such as the cantina call-in lines resolve to text I did not read. Paired donor in the box: swgemu-engine3 (not read).
Checked: about 12 files opened in full or in part, plus grep hits in others (paths in JSON). Numbers quoted here were read at the line given (receipts.tsv). Confidence high on the constants and the state machines; medium on the spawner internals I did not open (ConfigManager values, the wave consumer).

Cells (each one a mechanism, verdict in brackets):
- C1 Base faction tug, hourly tally and lead ladder [STRONG]
- C2 Base vulnerability window, 3 h open every 48 h [STRONG]
- C3 Wild contraband scan, one roll per cycle per planet [STRONG]
- C4 Cantina ambush: entry roll, timed harasser beats, capped backup [STRONG]
- C5 Space surprise attack: squad spawned ahead of the player ship [STRONG, adapt to ground]
- C6 Space spawn area director: caps, weighted roll, grace on removal [STRONG, row 23]
- C7 Life Day seasonal window with a one-hour waypoint lure [STRONG for the lure, PARTIAL for the content]
- C8 Battlefield markers with no-build and no-spawn zones [PARTIAL, thin]
- C9 Newsnet headlines keyed to the controlling faction [PARTIAL, thin]
- C10 Event perk cap per player [PARTIAL, thin]

Best transferable idea (one line per cell):
- C1: a per-planet faction tally that the server recomputes on a fixed clock, with a lead ladder that scales the enemy.
- C2: a repeating vulnerability window stored as a start time, so the next window is always computable.
- C3: one roll per cycle that stops after the first success, with a per-player cooldown.
- C4: an ambush with an entry roll, a cooldown per place, and a backup cap.
- C5: an ambush spawned in front of the target and given a leader that others follow.
- C6: a spawn director with a total cap, a per-type cap and a 60 s grace before the no-spawn area drops.
- C7: a seasonal window that a player can follow to a point by a one-hour waypoint.
- C8: a visible ring of contested ground with a no-build buffer larger than the ring.
- C9: a line of news that changes with who holds the planet.
- C10: a cap of five purchased perks per player, one of which is limited to one.

## 1. What the player sees and feels (375 wide)
Walk into a cantina in one of the faction cities and a patrol NPC may call for help: a single short spoken line, then the NPC walks through the cantina room and starts to goad you. If you fight, a backup squad arrives through three doors, is never more than three, and leaves on its own after a few minutes. The same city has a faction tug: once an hour the server adds up the bases each faction holds on the planet. The winning side's lead sets a crackdown difficulty scale of 1, or 2 once the lead reaches 64 points. On a planet with wild scans, a player out in the open may suddenly be stopped for a contraband search: each eligible player in turn gets a 5 percent roll, and at most one is picked per cycle. A base that is overt goes vulnerable for three hours in every forty-eight, so the window is always known in advance. In space, a squad drops in 600 to 1200 units ahead of your ship and engages at once; the leader holds the others in formation. Life Day runs from 1 December: fifteen fixed NPCs stand at set points on six planets, and a one-hour waypoint lures you to one of three planet points. Each player takes one gift per year.

## 2. Why it works / is striking
Criteria: readable silhouette or beat at 375 wide, one signature behaviour, one signature sound or line, could be made ours at 20 to 30 percent resemblance.
- C4 (cantina ambush): strong. One NPC, one spoken line, a fixed sequence of beats that the player can read. The backup cap (three doors) is a silhouette count you can see at 375 wide. Signature behaviour: the NPC walks, stops, says a line, then acts. Could be ours as a sentry that calls for two reinforcements.
- C1 and C2 (faction tug and vulnerability window): strong as world structure, weak at the moment of play. The player feels them through a sign or a banner, not a single beat. Signature: a visible lead number, not a sound.
- C3 (wild scan): the beat is a sudden stop. Signature: a 5 percent roll every 15 to 25 minutes means most players never see it. Good for surprise, poor for planning.
- C5 (space ambush): the squad drops in front of you, which is a strong beat, but it is space and uses four or five ships. Could be a ground ambush at three.
- C7 (Life Day): the waypoint is the hook; the fixed NPCs are the destination. Signature: a seasonal marker. Content is light.
- C8, C9, C10: thin. Signage and rule text, not felt in the body.

## 3. The rule behind it
The shared pattern is a cycle with a roll: a fixed clock or an entry trigger, one roll, a per-place or per-player cooldown, then a fixed sequence of timed beats with a cap.

C1 (faction tug): every hour the server sums base points per faction (HQ table of 23 entries: forward outposts 1 to 2 points, field hospital 3 to 6, tactical centre 4 to 8, detached HQ 10 to 20; pvp variants are higher). The winner is the faction with more points; the lead is the difference. Scale = number of thresholds at or below the lead, counted only when there is a lead (updateWinningFaction, lines 549 to 557). Thresholds are {0, 64}, so a lead of 1 to 63 gives scale 1 and 64 or more gives scale 2. The scale feeds the wild-scan session (getWinningFactionDifficultyScaling), so it is a crackdown difficulty value, not a patrol count. A planet holds at most 25 bases; extra bases are scheduled for destruction. Read: managers/gcw_manager.lua lines 76 and 104 to 125; GCWManagerImplementation.cpp lines 332 to 405 and 536 to 558.

C2 (vulnerability window): overt bases open a 10800 s window every 172800 s. The window start is stored; on refresh the code steps the stored start forward by whole periods while start plus period is not after now (loop at line 1134), then decides vulnerable or not. If now is inside the window, the base is vulnerable and the end is set; if not, the base is invulnerable and the next start is scheduled. Read: gcw_manager.lua lines 5 and 8; GCWManagerImplementation.cpp lines 972 to 1180 (refresh path).

C3 (wild scan): a task runs on a planet in a list of ten. First run 900 s plus a fixed 600 s after boot (start function). Each later run waits the interval plus a random 0 to 600 s. Each run walks the zone's players and skips mounted, city, cooldown, dead, incapacitated, in-combat, link-dead and privileged players and anyone under the 240 s login delay. An eligible player has a 5 percent roll; the loop breaks after the first session starts, so at most one scan per planet per cycle. Cooldowns: a 48 h per-player value (its use in the session code not read) and a 3 h scanner cooldown (set in ContrabandScanSessionImplementation.cpp line 68). Read: gcw_manager.lua lines 80 to 84; GCWManagerImplementation.cpp lines 64 to 90 and 3480 to 3525; tasks/CheckWildContrabandScanTask.h line 35.

C4 (cantina ambush): screenplays/crackdown/cantina.lua. 14 cantinas across three planets (cantinaOids table). On entry, if the place is not in a crackdown and the cooldown has passed, a 20 percent roll starts one. The harasser NPC spawns in the foyer after 15 s, calls in, patrols to the cantina, then to a harass point, and runs timed beats (7 s, 10 s, 12 s, 15 s steps). Targets: opposite faction only, level 6 or higher, and a smuggler-skill avoidance roll of 10 to 25 percent. When combat starts the harasser calls for backup: up to three spawns in the foyer, the cantina and the back hallway; each backup leaves after 300 to 360 s. The harassing phase is cut short 60 s after the first combat starts (onStartedCombat, line 208). Cooldown is one hour, written as an integer clock value (see the defects in section 4).

C5 (space surprise attack): space/SpaceSurpriseAttackScreenplay.lua and squadrons/CorsecSquadronScreenplay.lua. The ships spawn 600 to 1200 metres ahead of the pilot's ship with a 100 to 150 offset on two axes. The first ship becomes squadron leader; the rest are assigned to it. All engage the pilot ship at once. Counts in the three missions read: 4 ships (one fighter plus three), 4 scavengers, 5 aggressors. Guard patrol range 100 to 1000 units.

C6 (space spawn area): C++ in src/server/zone/objects/region/space/SpaceSpawnAreaImplementation.cpp. The area reacts to player ship position updates. Checks in order: total spawn cap (line 36), server config minimum interval (not read), a weighted roll across possible groups (line 203), a per-type cap (line 235). The spawn is placed at a random point in the area. When a spawner leaves, counts drop, and the no-spawn zone is removed 60 s later (line 164). A wave-spawner form in sql/datatables.sql (table spawner_spawner_wave_generic, ten fields: spawns list, min and max spawn distance, min and max spawn time, spawn count, min and max loiter distance, min and max reset time). The consumer of those fields was not read.

C7 (Life Day): screenplays/events/lifeDay.lua. Start gate: from month-day-hour-minute 12010600 onward, and the window runs to the end of December. Fifteen mobiles: three at city points (naboo, tatooine, corellia) and twelve across dathomir, endor and yavin4 (four per planet). A daily timer reschedules the despawn check until the end of the year. A player gets a one-hour waypoint to one of three planet points (dathomir, endor, yavin4) chosen at random among those enabled (line 115 timer). Gifts: one of four items, or the robe. Completion is one flag keyed by the year (line 139).

C8 (battlefields): screenplays/battlefields/battlefield_spawner.lua. 21 markers across eight planets (corellia 4, naboo 3, tatooine 4, dathomir 1, yavin4 2, talus 3, rori 3, endor 1). Marker radius 128 or 256. Each marker gets a no-build and no-spawn active area of 768 radius (lines 8, 109 to 110). The loop writes a global variable pObj (line 92), a small defect.

C9 (newsnet): screenplays/gcw/newsnet.lua. Terminal line per planet. Named planets (naboo, corellia) get their own headline set; all others use a general set. State: controlling faction wins (4 variants), loses (4 variants), or equal (1). Text not read (string table).

C10 (event perks): screenplays/events/eventPromoter.lua. 17 promoter NPCs. Non-privileged players hold at most five event perks, and one shuttle beacon (lines 134 to 139).

Where seen (asked for):
- Idle and ambient: the crackdown idle tree (ai/crackdown.lua lines 58, 66 to 71) patrols five points 30 m from home, runs droids and walks others, and waits 5 to 10 s at each point. Only ambient behaviour in the donor with a readable beat.
- Death and respawn presentation: after a failed exit the harasser (or backup) leaves or is destroyed 7 s later (cantina.lua doFailedExit, lines 826 to 840). No loot reveal ceremony read in this topic.
- Loot reveal: not in the topic files read (not read).
- Walk density: crackdown triggers per cantina entry (20 percent), wild scans per planet per 15 to 25 min at 5 percent per eligible player. Few encounters per walk; the cantina is the one a player meets on foot.
- Readability at 375 wide: one spoken line, one banner per event, max three backups; the GCW tally is a number, not a shape.

## 4. For Frankendom
Mapping: 700 zones as data. C4 is a zone-data hook: a place id, an entry roll, a cooldown and a list of beats. C1 and C2 are per-zone-group state on the server; the client gets a banner or a ring. C3 is a per-planet cycle task with a cooldown per player. C7 is a global clock window; the server verifies the window and the one-gift flag, and the client presents the waypoint.

Keep:
- one roll per cycle that breaks after the first success (C3)
- the entry roll with a per-place cooldown (C4)
- the timed beats with a spoken line before each (C4)
- the lead ladder for enemy difficulty (C1)
- the stored window start with the next start computed from it (C2)
- the grace on removal before a no-spawn area drops (C6)

Change:
- Backup cap: Core3 can field a harasser plus three backups, four attackers. Ours is three attackers, so the harasser plus two backups.
- Space ambush counts of four and five ships become three.
- Cooldown: Core3 stores a day-hour-minute integer and adds 100 for one hour (cantina.lua lines 102 and 120). It compares integers across month ends, and the add rolls past 23:59 into the wrong clock. Fix: store server time in ms and compare durations.
- Wild scan first-run comment disagrees with the code (comment: random 10 min, code: fixed 600 s at start, random 600 s after). Fix: one rule, documented.
- Life Day gate compares strings of different length (lifeDay.lua line 44). It works by prefix, but do it with timestamps.
- battlefield_spawner.lua writes a global (pObj). Use a local.
- The wild scan takes the first eligible player its zone-object loop reaches and breaks (loop head not read). Our pick should be seeded, fair across players and logged.
- Server authority: all rolls, windows and the faction tally run on the server; the client only shows the banner, the line and the ring.

Frankendom rule rows:
- C6 spawn caps, respawn and grace: row 23, target origins/server/world-spawns.ts (Lead ruling; file not checked in the repo).
- C4 ambush reflex and backup cap: row 4 (aggro, chase, leash) with the 3-attacker cap; target src/fight/<module>.ts (not checked).
- C1, C2, C3: server-side zone state; cite row 18 and the server tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" for the scheduled checks.

## 5. 5-minute look test (Dom, on a phone)
Build as a style flag on the existing fight scene (no release rows, no lock), publish to the preview folder.
- Compare A: a plain patrol that walks in and fights. Compare B: the same spot with a three-second banner, a spoken line, then one harasser and two backups that arrive one at a time with a 15 s gap.
- Judge at 375 wide: does the banner read in one glance, is the line readable over the fight, does the three-person cap feel like an ambush and not a crowd.
- Second flag: a faction chip on the map with a lead number 0, 1 or 2 that tints the enemies. Judge whether the tint reads as escalation.

## 6. Licence / IP
Code is AGPL v3 for the repo; some scripts claim LGPL. Conflict, so class C for the scripts, and shape only. Game content (creature names, ship templates, string keys, planets as set in this donor) has an unclear origin (AU051 says so), so no names, template ids, string keys or coordinates are copied. Ours, category-level: a patrol that calls for backup; a faction ladder that scales an enemy; a seasonal waypoint. Distinct original: the three-attacker cap (kept: backup from the place where the fight starts; changed: cap 3 and no cooldown integers). No legal conclusion.

## 7. Gaps
- Not read: most of src/server (the combat, AI and screenplay C++), the wild scan session code (ContrabandScanSessionImplementation.cpp read only at the cooldown line), CheckGCWTask and the other GCW tasks, the spawn-area config values (minimum interval, disable flag, check range), the wave-spawner consumer, the crackdown NPC templates, the string table text.
- Not read in bin/scripts: screenplays/themepark (themeParkLogic 2,223 lines), screenplays/spawner (8 files), managers/city_manager.lua, managers/weather_manager.lua (weather is another topic), screenplays/events/bestineMuseum.lua, screenplays/events/bestine_election, coa, syren.
- Half read: server. Client half absent (AU051). Paired donor swgemu-engine3 not read.
- Counts: 61 files in screenplays/events, 1 in crackdown, 1 in battlefields, 6 in gcw, 8 in spawner (counted, not all opened).
