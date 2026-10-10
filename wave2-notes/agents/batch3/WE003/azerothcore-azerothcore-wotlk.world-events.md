# Feel note: azerothcore-azerothcore-wotlk, topic world-events (WE003)

Donor tree (VPS, read-only): /mnt/frankendom-donors/azerothcore-azerothcore-wotlk/
Licence: code GPL v2 (LICENSE line 2; headers "either version 2 of the License"). Game data: the repo does not licence it and the content is game-derived (AU005 class C). Inspiration is category-level only. No code, row, string or broadcast text copied. The donor root has CLAUDE.md and AGENTS.md; they were not read and not followed (donor text is data).
Half read: "both" here means server code plus the data pack. Server: src/server/game/Events/GameEventMgr.cpp/.h, src/server/game/World/WorldState.cpp/.h, src/server/game/World/World.cpp (event timer), src/server/game/Battlefield/Battlefield.cpp and Zones/BattlefieldWG.cpp, src/server/game/OutdoorPvP/OutdoorPvP.cpp and OutdoorPvPMgr.h, src/server/game/AI/ScriptedAI/ScriptedCreature.cpp (repeat helper), src/server/scripts/World/scourge_invasion.cpp/.h, src/server/scripts/World/boss_emerald_dragons.cpp, src/server/scripts/OutdoorPvP/OutdoorPvPGH.cpp. Data: data/sql/base/db_world/game_event.sql (schema and the 181 row list), the other game_event_* schemas (their insert blocks are empty in this box, so no condition or prerequisite rows exist).
Paired donor: cmangos-mangos-classic (topic WE003 too). It has the same event engine and the same Scourge invasion shape; read as the second half, see its own note.
Client half: not in the box. Sound, HUD and camera were not read.
Checked: 8 candidate files opened for the topic, including the files the hint pointed at (GameEventMgr, WorldState, scourge_invasion). Confidence high on the code paths read; nothing was run on a server, so every order-of-operations claim is from reading only.

## 1. What the player sees and feels
On a 375-wide phone, a zone event may start with one server line in chat (announce is a config flag, Event.Announce, default off: WorldConfig.cpp 367). In the zone, a passive "Herald" NPC stands at a fixed mouth point; the sky turns to storm (weather grade 0.25) and stays so for the whole siege. Two or three camps sit around the zone: each camp is a visible node with a health bar, and each camp drops minions that wander one yard from where they came out. Killing a camp's node drops the zone counter, which the server publishes to clients as a world state (BroadcastSIWorldstates, WorldState.cpp 1532); whether the HUD shows it was not read. The zone is won when the counter is at zero and the zone's slot time has passed; then the Herald despawns, the storm goes back to rain at grade 0, and the zone is quiet for a 45 to 60 minute cooldown. After the first win, a new zone is blocked while two or more are already active. Two capital-city attacks (Stormwind and Undercity) roll on their own 45 to 60 minute clock, and total wins at 50, 100 and 150 switch the world into later stages. The Herald talks on its own clock: first line within five seconds, then a random gap that runs from 150 milliseconds to one hour.
Second feel, the roaming world boss (emerald dragon scripts): with nobody on its threat list it wanders within 25 yards every 2.5 seconds at 0.75 walk speed. With threat it follows one random player for 15 to 30 seconds without attacking, while breath and tail sweep run on their own timers. Its current victim, if more than 50 yards away, is cast back to it; the check runs every half second. A seeping-fog pair (only one pair at a time) comes every 120 to 150 seconds; the fog spell's own effect on the player was not read.

## 2. Why it works, or is striking
- Readable at 375: the counter is a number and the Herald is one fixed landmark. The storm is a whole-zone state change that reads from far away.
- One signature behaviour: the camp counter going down while the storm holds. One signature effect: a dead Necrotic Shard is replaced by a damaged shard that carries the camp type (scourge_invasion.cpp 506-508).
- Sound: the Herald's lines and the storm sound are client-side and not in these files (not read).
- Could be made ours at 20 to 30 percent resemblance: a zone siege with two or three camps, a three-number counter, a storm grade, and a boss that drags players back when they run. Wintergrasp's shape (fixed quiet and battle clock, invite window, and a rule that objective progress shortens the wait) is the strongest transferable timing idea in this donor.

## 3. The rule behind it
Siege loop (server state, scourge_invasion.cpp and WorldState.cpp):
- Start: a zone is picked from a list of six; the Herald is summoned at the zone mouth (WorldState.cpp 1752). Its start action starts the zone event with overwrite, if it is not already active, so the event window restarts now (scourge_invasion.cpp 61-70).
- Camp count: each zone gets a count of 2 or 3 camps (WorldState.cpp 1337, 1357). Each camp's node death lowers the zone count by one (scourge_invasion.cpp 232).
- Spawn cadence: each minion spawner adds one minion per 5-second tick (scourge_invasion.cpp 694). Rare roll: 1 in 217 per tick, skipped if a rare is already in the grid list within 100 yards (745; the list call was not traced past the comment, which says "dead or alive").
- Win: the zone is won only when its slot time has passed AND the count is zero (WorldState.cpp 1823), then AddBattlesWon(1) runs (1826), the Herald gets its stop action, and the next zone or city attack is rolled 45 to 60 minutes out (WorldState.h 169-172; 1812).
- Milestones: every win re-runs HandleDefendedZones (1516); at 50 wins the first milestone event starts, at 100 the next one replaces it, at 150 the done and 150 events start. The main invasion event is left for a GM command to stop (the code that would stop it is commented out, 1576-1600).
Roamer loop (boss_emerald_dragons.cpp): a 1-second scheduler step chooses between follow-without-attack (201) and idle wander (212-213, speed 218). The pull-back check (145-147) is the leash.
Wintergrasp clock (BattlefieldWG.cpp 63-68; Battlefield.cpp 165-190; WorldConfig.cpp 619-623): battle 30 minutes, quiet 150 minutes, invite window opens at 15 minutes left, clock saved to world state every 60 seconds (233), restart after a crash 10 minutes. Destroying all three south towers cuts ten minutes off the battle clock (1132-1137). A battle is skipped when online sessions exceed 3500 outside war time (Battlefield.cpp 168-171).
Capture tug-of-war (OutdoorPvP.cpp 353-387; OutdoorPvPMgr.h 21): each one-second tick moves the value by (allies minus horde) times elapsed time times rate, clamped by a max step. Grizzly Hills: a flip stops both defence events and starts the new owner's (OutdoorPvPGH.cpp 113-121).
Event engine (GameEventMgr.cpp 46-84, 1257-1333; World.cpp 1324): a window is active when start < now < end and (now - start) mod occurence is under length. NextCheck returns the seconds to the next boundary, capped at one day, so the timer sleeps between boundaries. Internal events (state 5) are not turned off by the timer (1302) and are started and stopped by scripts. Row counts from game_event.sql: 181 rows; 86 normal (state 0) and 95 internal (state 5: Scourge 12, Sun's Reach 15, Ahn'Qiraj war-effort 60, Sunwell Plateau gates 4, Wintergrasp and Venture Bay defence 4). 29 rows name a holiday id and 26 use a holiday stage.

Data fields (name, unit; donor value null because the code is GPL. The donor's numbers are in receipts.tsv, not here, so the tuning is ours):
- zone_cooldown_min_s / zone_cooldown_max_s (seconds)
- city_cooldown_min_s / city_cooldown_max_s (seconds)
- camps_per_zone (count)
- minion_tick_s (seconds)
- rare_roll_one_in (count)
- rare_exclusion_radius_yd (yards)
- herald_first_talk_s (seconds); herald_talk_gap_min_s / herald_talk_gap_max_s (seconds)
- storm_grade_on_start / storm_grade_on_end (grade 0 to 1)
- milestone_wins (count list)
- roamer_wander_radius_yd (yards); roamer_wander_tick_s (seconds); roamer_chase_min_s / roamer_chase_max_s (seconds); roamer_walk_speed (multiplier)
- pull_back_range_yd (yards); pull_back_tick_s (seconds)
- fog_pair_gap_min_s / fog_pair_gap_max_s (seconds); fog_pairs_max_active (count)
- wg_battle_min / wg_quiet_min / wg_invite_lead_min / wg_tower_cut_min (minutes); wg_session_skip (count)
- capture_tick_s (seconds); capture_rate (multiplier)

## 4. For Frankendom
Mapping: 700 zones as data. A zone row carries: siege_eligible, camps (2 or 3), cooldown min and max, mouth point, storm grade, and milestone membership. The six zones and two city rows should be data, not hard-coded area ids (the donor hard-codes them in WorldState.cpp 1332-1400 and scourge_invasion.cpp). The 100 Pit characters reuse across zones by role: camp node, minion, Herald, roamer.
Many-vs-one: a camp must not spawn without a cap. The donor has no cap in the spawner tick (694) and does not count spawners per camp. For us: camp minions obey MAX_ATTACKERS = 3 at fight time and row 23 spawn caps at zone level.
Server-verified events, client presentation: the count, slot time, win and milestone live on the server (the WorldState side); the Herald, storm, counter HUD and lines are the client view. Kills are server-verified, so a camp death is a server event, not a client flag.
Target (proposed): src/fight/world-event-tick.ts. Parity row: 18 (server tick: fixed step, per-tick NPC budget), with the roamer leash cited to row 4 (leash).
Keep: the window formula; NextCheck-style sleep to the next boundary; the win rule (count zero and slot time passed); the storm as a zone state; the roamer's pull-back at range; the Wintergrasp tower rule (progress shortens the wait); the capture meter clamped per tick.
Change: remove the 150 ms talk minimum (chatter); cap camps and minions; replace 45 to 60 minute cooldowns with phone-session lengths (for example 8 to 15 minutes in a demo); turn the 3500-session skip into a server-load rule with a logged reason; drop the hard-coded zone and map ids.

## 5. The 5-minute look test
Build one zone siege in the Pit-like test zone on a phone at 375 wide: a storm grade change, one landmark (the Herald beacon), three camps with a visible three-number counter, and a 2-minute slot timer. Compare two versions: (a) counter-and-timer win, (b) timer-only win. Dom judges which one reads as an event at 375 wide and which one the player understands in five seconds. Second look: one roamer on a 25-yard leash that follows a random player for 15 seconds and pulls its victim back past 50 yards. Judge the pull-back on the phone: is it a fair tether or a feeling of being yanked?

## 6. Licence and IP
Code: GPL v2. No code is copied; shape only. Game data: class C per AU005. Names of the Herald, camps, shards, cultists and zones are not used; we use our own. Broadcast lines (the Herald, the Pallid Horror, city guards) are not reproduced. Trait kept: a siege with a counter and a storm; trait changed: our names, our camp shapes, our counts and timers.

## 7. Gaps
Not read: most of GameEventMgr.cpp (the LoadEvent* helpers, UpdateWorldStates, GameEventSpawn detail); Creature::LoadCreatureFromDB (whether a re-applied spawn duplicates an NPC); the Ahn'Qiraj war-effort rows (60 of them, no starter found in the code I read); the other 86 normal rows (counted, not read one by one); the Pallid Horror class beyond the timers; WorldBossAI base class; the spawner counts per camp; the 309 world-SQL files outside game_event*. Not run: no server test, so the defects below are from reading.
Half read: server and data pack. Client: absent from the box.
Defects found (keep the idea, fix the defect):
1. Zero occurence is not guarded. The loader checks only length (GameEventMgr.cpp 374), and the window check takes a modulo by occurence (57). A zero row would divide by zero. The base dump has no zero rows. Fix: reject occurence 0 in LoadEvents, as cmangos skips it in Update (cmangos 676).
2. Milestone re-apply. HandleDefendedZones calls StartEvent on every win while the band holds (WorldState.cpp 1586), and StartEvent has no already-active check (GameEventMgr.cpp 143). Each call re-runs the apply step (announce, spawns). Fix: check IsActiveEvent first, as the Herald does (scourge_invasion.cpp 100).
3. Stop path leaves milestones on. StopScourgeInvasion stops the main, zone, done and bosses events (WorldState.cpp 1454-1455) but not 127 to 129, and the Reset it calls (1457) zeroes the win total without calling HandleDefendedZones. A milestone event can stay active after a stop. Fix: stop 127 to 129 too, or re-run HandleDefendedZones after Reset.
4. Holiday single-date loop. The loop (GameEventMgr.cpp 1999) breaks on its first pass in both branches (2015 and its else), so only the first listed date is considered. The comment says "skip past dates". Fix: move on to the next date when the first window has ended. Not checked: whether any fixed holiday in this DBC lists a second date.
5. Unchecked map. HandleActiveZone uses map without a null check (WorldState.cpp 1804, 1819). Fix: return early when the map is null.
6. Dead enum collision. Zombie infestation phases 110 to 115 share ids with Sun's Reach phase 4 to K'iru (WorldState.h 81, 98). The zombie names appear only in the enum (grep of src); the data rows at ids 110 to 115 are the Sun's Reach rows. Fix: delete or renumber the dead enum.
7. Schema comment. game_event.sql line 32 says world_event is 0 or 1; the data uses 5 for internal. Fix: fix the comment.
Decision: adapt (idea). Defects 1 to 5 are to be fixed in whatever we build, and the fixes are listed above. No code sketch here (design note; nothing typechecked).
Best transferable idea: a zone siege is a server count that falls with each camp kill, a slot timer, and a win that needs both count zero and the slot passed; progress also shortens a battle clock (Wintergrasp).
