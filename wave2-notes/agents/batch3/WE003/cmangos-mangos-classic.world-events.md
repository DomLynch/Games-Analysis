# Feel note: cmangos-mangos-classic, topic world-events (WE003)

Donor tree (VPS, read-only): /mnt/frankendom-donors/cmangos-mangos-classic/
Licence: code GPL v2 (LICENSE line 2; GameEventMgr.cpp line 5 "it under the terms of the GNU General Public License"). Game content: COPYRIGHT.md line 7 names the game content as Blizzard Entertainment's copyright, and the project says it is not affiliated (AU010, class C). Inspiration is category-level only. No code, row, string or broadcast text copied.
Half read: "both" here means server code plus the data pack. Server: src/game/GameEvents/GameEventMgr.cpp and .h, src/game/World/WorldState.cpp (Scourge state, HandleDefendedZones, StopScourgeInvasion), src/game/World/World.cpp (weekly reset), src/game/AI/ScriptDevAI/scripts/world/scourge_invasion.cpp (Mouth, camps, minion spawner, rare roll), src/game/Entities/Creature.cpp (world-boss rank lines only). Data pack: sql/base/mangos.sql (game_event schema and the empty data block), sql/updates/mangos/z2745_01_mangos_game_event_split.sql (dates moved to game_event_time).
Data finding: the game_event table has 0 rows in the base dump (LOCK TABLES block at mangos.sql 1727 is empty), and every game_event_* event table has 0 insert blocks in this box. The event rows are not here, so no event count is possible. Events are counted by the names the code uses.
Paired donor: azerothcore-azerothcore-wotlk (same topic, WE003). It has the same event engine and the same Scourge invasion shape; see its note. Differences noted below.
Client half: none in the box.
AU010 and DC013 read first (catalogue for the Pools and weather mechanisms is there; not repeated here).
Checked: 6 candidate files opened (GameEventMgr.cpp/.h, WorldState.cpp, scourge_invasion.cpp, World.cpp weekly reset, mangos.sql schema, the split update). Confidence high on code paths read; nothing run.

## 1. What the player sees and feels
On a 375-wide phone, the world changes on a calendar. The server opens a festival window on a set day and it runs for a week; the town banner or sign that shows it is client presentation, not read here. Some festivals are tied to the real sky: the lunar new year window is worked out from the moon's phase. Easter is a seven-day window computed from the calendar. Events can be chained with a link, so the second one only runs while the first is active. Another event, the Scourge siege, is a set of camps around a Mouth-style NPC. The camp code resets a five-second spawn timer (693, 892). The Mouth speaks at random, anywhere from 150 seconds to an hour apart. A zone win adds to a shared win total (the zone-clear lines in this donor were not read; the rule is the same shape as the AC donor's); at 50 wins a milestone event starts; at 100 another replaces it; at 150 the main invasion event is stopped in code.
What is not here: no roaming world boss. The search found a world-boss elite rank in Creature.cpp (corpse decay at 489-490, HP and damage rate config at 1502-1522) and no roaming script.

## 2. Why it works, or is striking
- Readable at 375 wide: a festival banner or a sign that a window is open is a yes/no state the player can read in one glance.
- One signature behaviour: a calendar window that is computed, not typed in. The Darkmoon Faire opens on the first Monday of a month, and its two fairs each come once every three months, one month apart.
- One signature sound: none in the server files (client, not read).
- Could be made ours at 20 to 30 percent resemblance: a quarterly fair on the first Monday of a month, a seven-day window, and a chain of stalls where the second needs the first to be running.

## 3. The rule behind it
Window engine (GameEventMgr.cpp 36-88, 669-712): a window is active when start < now < end and (now - start) mod occurence is under length (39). Update skips events with occurence 0 unless they are server-side (676). An event starts only when its linkedTo event is active (684); the loader clears a link to an invalid event (186-189). Start and stop with overwrite move the start to now (67-87).
Calendar rules (ComputeEventStartAndEndTime, 1210-1325):
- Darkmoon Faire: the first fair is the first whole week of the month, on a three-month rotation (monthRemainder = month mod 3, 1227-1235). A second fair takes the next phase in the same rotation. Length seven days (1248-1259). Building stages are offset by a day or two around the same Monday.
- Yearly: the stored start and end are moved to the same dates in the current year (yearly case of ComputeEventStartAndEndTime; line not pinned).
- Lunar new year: a moon-phase routine (Moon class, from 1276) finds the solstice-to-new-moon date; an eight-hour China offset is applied (comment at 1293); window 21 days.
- Easter: Gauss routine (1162); the Easter case starts at 1309 and the window is seven days.
The calendar is recomputed on the weekly quest reset (World.cpp 2337 inside ResetWeeklyQuests, 2326).
Scourge siege (scourge_invasion.cpp and WorldState.cpp): the Mouth's yell repeats in a window of 150 seconds to one hour (ScriptDevAI 307, 310). Zone wins come from the zone-clear rule (the shared logic is the same shape as the AC donor's; the cmangos zone-clear lines were not separately counted). Minion spawner ticks every five seconds (693, 892). Rare roll 1 in 217 per tick (254). Milestones at 50, 100 and 150 wins are hard-coded (WorldState.cpp 1287-1299). At 150, the main event is stopped (1299). The milestone start is unguarded (1293), so a win inside a band re-runs that event's apply step. StopScourgeInvasion (1168-1174) lists the main and zone events and not 50, 100 or 150.

Data fields (name, unit; donor value null because the code is GPL and the data pack is empty in the box; the donor's numbers are in receipts.tsv):
- event_window_start / event_window_end (timestamp), event_occurence_min (minutes), event_length_min (minutes)
- link_to_event (event id, 0 for none)
- schedule_kind (enum: fixed, first_monday_quarterly, yearly, lunar_new_year, easter)
- calendar_window_days (days)
- lunar_region_offset_h (hours)
- siege_yell_min_s / siege_yell_max_s (seconds)
- siege_spawn_tick_s (seconds)
- rare_roll_one_in (count)
- milestone_wins (count list)

## 4. For Frankendom
Mapping: 700 zones as data. The calendar rule is a zone or world row with schedule_kind and window length, computed on the server; the client only receives the window. This keeps one ledger and server-verified events, with the sign and the banner as client presentation.
Chains: a stall that needs another event running (linkedTo) is a clean data field and a natural quest gate for the world, without a state machine.
Target (proposed): src/fight/world-event-tick.ts for the window tick. Parity row: 18 (server tick: fixed step, per-tick NPC budget). Any calendar window that spawns NPCs would also use row 23 (zone population: spawn caps, respawn, despawn).
Keep: the window formula; the first-Monday rule as data; linkedTo chains; the Mouth yell window as an ambient cadence field; milestone ladder keyed to total wins.
Change: fix the day-of-month rollover (defect 1 below); guard occurence 0 at load, not only in the update loop; replace the 50/100/150 hard-coded steps with data; do not stop the main event in code at 150 without a logged reason; cap minions per camp (MAX_ATTACKERS = 3 and row 23 spawn caps). Drop the 150-second minimum on talk (chatter).

## 5. The 5-minute look test
On a phone at 375 wide: a banner for a first-Monday fair with a seven-day countdown, and a second stall that is locked until the first is running. Dom judges whether the lock reads as a reason to go and find the first stall, or as a dead end. Second: a Mouth beacon in a siege zone with three camps and a count of wins at the bottom of the screen; compare it with the same zone with no count. Judge whether the count changes how much the zone feels worth walking.

## 6. Licence and IP
Code: GPL v2. No code copied; shape only. Game content is Blizzard copyright per COPYRIGHT.md line 7 and 19; category-level only (a festival, a siege, a camp). Names are ours. The Mouth's lines are not reproduced. Trait kept: a calendar window that is computed and a chain gate. Trait changed: our names, our calendar, our rewards.

## 7. Gaps
Not read: the LoadFromDB body for game_event beyond the lines that set links and validity (107-240 partly read), UpdateEventNPCFlags and GameEventSpawn detail, SendEventMails (called at 729 and 762; name only, not read), the Moon class body (moon.cpp), the OutdoorPvP folder (not traced for this topic), the world-boss respawn lines in Creature.cpp (296, 596; not read), Pools (covered in the catalogue DC013 section 5), the other SQL files beyond the event schema, the Scourge zone table (the cmangos zone list was not counted), sql/updates for game_event data (none found).
EventGroup: the mangos.sql column (line 1718) says it is for daily or weekly random event groups. The source has no reader for it (grep of src returns nothing). The idea is in the schema, not built.
Half read: server and data pack. Client: absent.
Defects found (keep the idea, fix the defect):
1. Day-of-month rollover (DMF). ComputeEventStartAndEndTime adds months to firstMonday (1232-1235) without resetting tm_mday to 1 (tm_hour is reset at 1226). If the weekly recalculation falls on a day that does not exist in the target month, mktime rolls forward. Example by date arithmetic: a recalc on 31 January aiming at February gives 3 March (Feb 31 normalises), so the window is computed in March. The fair can open late or run short until the next recalc. Not run; from reading and a date check. Fix: set tm_mday = 1 before adding months, then compute the Monday.
2. Milestone re-apply. HandleDefendedZones calls StartEvent on the 50 band (1293) with no active check, so each win in the band re-runs the apply step. Fix: check IsActiveEvent first, as the donor Herald does in AC.
3. Stop path. StopScourgeInvasion (1168-1174) does not stop the 50, 100 or 150 milestone events. Fix: stop them too.
4. Hard-coded milestones and a stop at 150 (1287-1299). Fix: move to data, and log the stop.
5. Occurence 0 is skipped in Update (676), which guards the zero-divide risk that the AC copy lacks (see the AC note, defect 1). Keep this guard.
Decision: adapt (idea), with the calendar rule as data and defect 1 fixed. Design note only; no sketch typechecked.
Best transferable idea: a festival window is computed from a calendar rule on the server (first Monday of a quarter, seven days), with a linkedTo gate so the second stall needs the first.
