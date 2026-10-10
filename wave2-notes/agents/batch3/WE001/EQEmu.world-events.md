# Feel note: EQEmu, topic world-events (WE001)

Donor tree (VPS, read-only): /mnt/frankendom-donors/EQEmu/
Licence: GPL-3.0 code (LICENSE.md). Game content (SQL rows) is not in the repo. Donor values are therefore not used as data (copyleft, so donor_value_or_null is null throughout).
Half read: server (world, zone and common scheduler code, spawn conditions and spawn events, quest event codes, NPC emote types). Data half: schema and migration read; no event rows exist in utils/sql (0 INSERT files for spawn_events, spawn_conditions or server_scheduled_events), so the live event content is not in the repo. Client half: client_files holds only export/import tooling (CMakeLists.txt, export/, import/); not read further.

## 1. What the player sees and feels
A server-wide yellow line lands in chat on every connected zone at the time an event fires: a broadcast from the scheduler, a zone-connect or zone-shutdown notice, or a reload notice. A hot zone gives no banner at all: the player just gets more experience per kill while the zone flag is on, and loot rules keyed to hot-zone state can change what drops. Camps change without a warning line: when a counter (a spawn condition) crosses its threshold, every spawn point tied to that counter either despawns its mob, repops it, or sends it a signal, and the signal is where the quest script (not in this repo) decides what the mob says or does. NPCs also speak on their own triggers (spawn, despawn, enter and leave combat, death, a PC kill, a hail), with four speech kinds (say, emote, shout, proximity).

## 2. Why it works or is striking (criteria)
- Readable beat at 375 wide: weak as shipped. The broadcast is one chat line; it has no shape at phone width. The camp flip (counter crosses a line, mobs change) is the stronger beat because the world itself changes.
- One signature behaviour: the threshold-to-signal chain. A counter moves in steps (set, add, subtract, multiply, divide), and when it crosses a line the spawn point does one chosen thing (nothing, despawn, repop, repop only if the respawn timer is ready, or signal the mob with signal number = on_change minus 10).
- One signature sound or effect: none in this repo (sound and VFX not in repo; not read).
- Could be made ours at 20-30 percent resemblance: yes. Keep the threshold-to-signal chain and the once-a-minute scheduler. Replace the chat-line announce with a banner.

## 3. The rule behind it
Three layers, each owned by a different process:
- World process: a scheduler polls once per real minute, re-reads the events table when it changes, and sends broadcasts and world reloads to all zones (code: world/world_event_scheduler.cpp).
- Zone process: a second scheduler polls once per real minute and turns hot-zone, rule-change and content-flag events on and off in memory. When a window ends, it reloads rules and clears the active list (code: zone/zone_event_scheduler.cpp).
- Spawn conditions: a per-zone integer, each spawn point sees the threshold it needs. Spawn events move that integer on a timer. Period is in EQ minutes, and one EQ minute is 3 real seconds (code: zone/spawn2.cpp, timer at line 732; zone/spawn2.h, line 155).

Rules that bite (read from code, not run):
- A broadcast with a start time and no end time fires on every minute poll from its start, not once. The check only tests whether now is past start and before end when an end is set (common/server_event_scheduler.cpp, ValidateEventReadyToActivate). A one-shot banner therefore needs an end window. (Inference from code; not tested live.)
- A zero in any start or end field means "use the current value of that field", so a partial window quietly drifts (BuildStartTimeFromEvent and BuildEndTimeFromEvent). Midnight (hour 0) cannot be written as a fixed hour.
- Cron windows fire when the next cron time is within a 10-second pad of now (common/server_event_scheduler.cpp, line 92).
- A strict spawn event fires only if the tick lands within N EQ minutes of its trigger hour (rule default 3). Missed windows are skipped, not replayed (common/ruletypes.h, line 381; zone/spawn2.cpp, strict branch).

Data fields (designer-tunable; donor values null because the donor is GPL):

| name | unit | donor_value_or_null |
|---|---|---|
| event_type (broadcast, reload_world, hot_zone_activate, rule_change, content_flag_change) | enum string | null |
| window_start / window_end (minute, hour, day, month, year; 0 = use now) | calendar fields | null |
| cron_expression | cron string, 100 chars max | null |
| cron_pad | seconds | null |
| scheduler_poll | seconds (donor: once per real minute) | null |
| eq_minute | real seconds (donor: 3) | null |
| strict_window | EQ minutes (donor rule default: 3) | null |
| hotzone_xp_bonus | multiplier added (donor rule default: 0.75) | null |
| spawn_event_period | EQ minutes | null |
| spawn_event_action | enum: set, add, subtract, multiply, divide | null |
| on_change | enum: nothing, despawn, repop, repop_if_ready, signal (base 10) | null |
| quest_event_codes | count (150 identifier lines read in zone/event_codes.h) | null |

## 4. For Frankendom
- 700 zones as data: an events table with a scope list of zones and a window per row. Keep the EQ split of world-scope rows (broadcast, reload) from zone-scope rows (hot zone, rule change). In our case a zone-scope row only changes that zone's counter.
- 100 Pit characters reused across zones: a signal is a presentation trigger, not a spawn. The same character can react to the same counter in every zone that carries it, so the threshold chain is the reuse point.
- Many-vs-one: the counter-to-signal chain fits many-vs-one, because a signal changes what a mob does, not how many spawn. The three-attacker cap is our own rule, and spawn caps are a separate topic that is not decided here.
- Server-verified events driving client presentation: the server ticks the scheduler, writes one ledger row per event start (keyed by event id, so a restart cannot double-announce), and the client only draws the banner from that row.
- Keep: the strict window (missed = skipped), the threshold-to-signal chain, and the cron pad idea.
- Change: make start and end explicit (no zero-means-now); add a fire-once latch per event id; avoid the EQ broadcast repeat trap.

## 5. Five-minute look test
Build three ways to show one zone event in the existing phone build (375 wide): (a) EQ style, a plain yellow chat line only; (b) a top banner with a single NPC bark and a 10-second countdown; (c) the banner plus a ground marker where the camp changes. Dom judges on his phone: in three seconds can he say what started and where? Then restart the server mid-event and see whether the banner replays once or repeats. Repeats are the defect to catch.

## 6. Licence and IP
GPL-3.0 code. Game content (rows, quest text) is not in the repo, and the README says it does not claim the original game's assets. Inspiration stays at category level: a counter-driven camp flip, a strict scheduling window, a cron window. No code, no string text, no rule values are copied as data. Donor values are not recorded.

## 7. Gaps
- Not read: client half (client_files is export/import tooling only), quest scripts (not in repo), sound and VFX (none in repo), the NPC emote rows (data, not in repo).
- Not verified: the repeat-every-minute broadcast behaviour is from reading ValidateEventReadyToActivate and the world poll loop; not run.
- Half read: server only. The data half is schema-only in this repo.
