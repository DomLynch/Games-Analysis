# Feel note: TrinityCore-TrinityCore, topic world-events (WE002)

Donor tree (VPS, read-only): /mnt/frankendom-donors/TrinityCore-TrinityCore/
Licence: GPL-2.0. COPYING line 1 reads "GNU GENERAL PUBLIC LICENSE", version 2 (June 1991). The event and script files carry the same GPL header. Code is copyleft, so no donor value is used as data (donor_value_or_null is null throughout). Concept-level inspiration only.
Half read: server. Read: src/server/game/Events/GameEventMgr.h and GameEventMgr.cpp (the scheduler, state machine, condition and quest progress), src/server/scripts/Events/zalazane_fall.cpp, src/server/scripts/Events/fireworks_show.cpp.
Data half: schema only. sql/base/dev/world_database.sql holds the game_event schema. The donor box holds 0 INSERT INTO game_event rows (checked sql/old and sql/custom; the one world update that names game_event tables, sql/updates/world/master/2026_09_22_02_world_2026_09_11_00_world.sql, only touches the spawn-link tables). So the live event content is not in this tree.
Client half: not read.
Asset audit and catalogue: none exist for TrinityCore in the AU or DC folders. Not used.

## 1. What the player sees and feels
A server-wide yellow line lands in chat when a timed event starts, if that event is set to announce. On a holiday night the town hears a cheer and sees sparks: at the top of the hour a burst fires, then one burst every one to two seconds for ten minutes, each at a random spot picked from a per-zone list. At 00:10:30 on New Year there is a finale of ten rapid bursts. In a progress event, a counter (shown as a world-state bar) goes up as players complete the linked quests. When it fills, the bar stops and a countdown starts, then the next event fires. In the Zalazane's Fall chain, a tiger vehicle near a player makes the matriarch appear beside that player with a line of dialogue. She pounces every 30 seconds. Below 20 percent health she stops taking damage, ejects the riders and summons the next boss for the same player. The feel is a ritual with a clock, and a gate that opens by stages.

## 2. Why it works / is striking
- Readable at 375 wide: the window is one number pair (period in minutes, length in minutes) plus an optional start and end date. A player can read "on for 10, every 60" in one glance.
- One signature behaviour: a fixed clock on the hour (fireworks) and a lockout aura that stops a second summon for 50 seconds (matriarch).
- One signature sound or effect: the cheer from a speaker, then a burst of sparks in a random spot.
- Could be made ours at 20 to 30 percent resemblance: yes. The window, the escalation ladder and the holiday ritual all reduce to data and a few timers. We would redraw the sparks and the chain, and rename every boss.

## 3. The rule behind it
### 3a. Timed window (scheduler)
A game_event row has a start, an end, an occurrence period and a length, all in minutes or dates. Inside the window the event is on. The next-check code (GameEventMgr.cpp, NextCheck) computes the time to the next toggle as: if the time since start modulo the period is less than the length, the event is in its window, and the delay runs to the end of the window; otherwise the delay runs to the next start. The end date caps the delay. (GameEventMgr.cpp lines 83 to 121; the window test is at line 110.)

### 3b. Progress event (state machine)
Six states (GameEventMgr.h, enum GameEventState, lines 34 to 42): NORMAL 0, WORLD_INACTIVE 1, WORLD_CONDITIONS 2, WORLD_NEXTPHASE 3, WORLD_FINISHED 4, INTERNAL 5. A world event sits in CONDITIONS while its counters rise. Each linked quest adds a number to one counter (HandleQuestComplete, around line 1557 for the add). Only when every counter reaches its required number (CheckOneGameEventConditions, line 1591) does it move to NEXTPHASE, set a follow-up start time of length minutes ahead, and later go to FINISHED. Progress is saved to the characters database each time, so a restart keeps it.

### 3c. Holiday ritual (scripted, not table-driven)
fireworks_show.cpp. At minute 0, second 0 (local time), when a holiday or New Year event is active, the cheer and the first burst fire (line 808). Bursts repeat every one to two seconds (line 883, ScheduleEvent with 1s and 2s) at a random position from the zone list (line 860) until minute 10, when the stop branch cancels the burst event (the stop branch sits just above line 831). New Year finale at 00:10:30 (line 831): ten bursts scheduled one second apart.

### 3d. Summon gate and escalation (scripted)
zalazane_fall.cpp. A check runs every 5 seconds (line 132). It looks for a tiger vehicle within 15 yards (line 112) that is a summon. If the summoner is not in combat and lacks the no-summon aura (line 121), the matriarch is summoned for them and the aura is applied. The matriarch pounces every 30 seconds and re-applies the no-summon aura every 50 seconds (lines 150 and 231). At below 20 percent health (line 187) she takes no damage, becomes non-attackable, summons the next boss, ejects passengers, removes the gate auras and despawns.

### 3e. Announce
One byte per event: 0 silent, 1 announce, 2 follow the config (GameEventMgr.cpp, ApplyNewEvent, line 1107 for the message).

### 3f. World-state bars
Each condition may carry a max and a done world-state id. The server pushes both values to each player (SendWorldStateUpdate). This gives the client a bar with no extra packet design.

## 4. Frankendom mapping
- 700 zones as data: one row per timed event with period, length, start, end and a holiday or cosmetic key. The window formula runs once on the server. Zones read the same row, so no zone needs its own clock.
- 100 Pit characters reused across zones: the summon gate is a per-summoner lock. We can use it as "one active escalation per player per zone" and reuse the same boss rig in 700 zones.
- Many-vs-one, max three attackers: the 20 percent stage switch fits a three-stage fight (open, pressure, switch). Cap attackers at three; the switch fires once.
- Server-verified: the counter, the phase and the window live on the server. The client draws the bar, the countdown and the spark burst from the state it is sent. A client cannot force a phase.
- What to keep: the window formula, the explicit state machine with a saved phase, the per-player gate, the countdown after the bar fills, and the on-the-hour ritual.
- What to change: add a timeout to any progress event (the code has none in this path), so an event that stalls can expire. Keep the counters in our ledger, not in quest completion alone. Drop the hard-wired New Year finale and make the finale a data row.

## 5. The 5-minute look test (Dom, on the phone)
Build a single zone card with three things and compare them at 375 wide:
1. A window badge: "on 10 min, every 60" with a countdown, and a progress bar that reads 0 of 20 kills.
2. When the bar fills, a two-minute countdown, then the next boss row appears on the same card.
3. A three-stage gate: a summon at 100 percent, the boss at 40 percent pounces every 30 seconds, and at 20 percent the boss breaks off and a bigger one appears for the same player.
Dom judges: can he read the window and the bar in under two seconds; does the switch at 20 percent feel like an event; does the ritual on the hour read as a town event without a chat line.

## 6. Licence and IP
Code: GPL-2.0. We copy no code and no table. We take the category only: timed windows, progress gates, a per-player summon lock, and a staged boss switch. Recreate as a clearly distinct original: keep the window, the gate and the stage switch; change the boss names, the spark art, the sound and the chain.
Content: the event rows are not in the donor box, so no content is taken.

## 7. Gaps
- Not read: client half (no client event UI read); DBC or hotfix holiday tables (only the holiday ID column name is noted); characters database save tables beyond the names game_event_save and game_event_condition_save.
- Not read in detail: 10 of the 13 .cpp files in src/server/scripts/Events (brewfest, childrens_week, darkmoon_faire, events_script_loader, hallows_end, love_is_in_the_air, lunar_festival, midsummer, pilgrims_bounty, winter_veil). operation_gnomeregan.cpp was read by grep only. The Anniversary folder was not opened. Only file names were read for these.
- Counts: 14 game_event* CREATE TABLE statements in sql/base/dev/world_database.sql; 16 loader queries in GameEventMgr.cpp (15 in LoadFromDB plus one arena season query); 20 files in game/ and scripts/ mention GameEventMgr or the game-event SmartAI hooks.
- Half read: server. Data: schema only, 0 event rows.
