# Feel note: l1j-en-classic, topic world-events (WE007)

Donor tree (VPS, read-only): /mnt/frankendom-donors/l1j-en-classic/
Licence: GPL v2 (COPYING line 1; AU029 cites README line 115). Source headers carry GPL notices. Copyleft, so donor values are not used as data: every donor_value below is null.
Half read: SERVER. Java under src/l1j/server/server (controllers: BossEventController, UbTimeController, WarTimeController, CrackOfTimeController, TimedDungeonController; model: L1BossCycle, L1UltimateBattle, L1UbSpawn, L1WarSpawn (flag spawn only); datatables: UBTable; Announcecycle; L1MonsterInstance death hook). Config: config/altsettings.properties (boss event, war), config/server.properties (news timer). DATA: data/xml/Cycle/BossCycle.xml (29 entries), db/l1jdb_m10.sql (ub_times, ub_settings tables). CLIENT half absent (no art, sound, or string text; the broadcast lines are ids or strings not in the box). Paired donor: none in the box.
Checked: 13 files opened in part or in full (paths in JSON), counts read at the line given (receipts.tsv). Confidence high on the flow and the constants; medium on L1SpawnUtil and Config defaults, which I did not open.

Cells (verdict in brackets):
- C1 Scheduled window boss from a base time, a period and start and end offsets [STRONG, two defects fixed in the sketch]
- C2 Random "strange aura" boss event: hourly roll, warning broadcast, 1 to 3 bosses near random eligible players [STRONG, one defect fixed]
- C3 Ultimate Battle arena: timed start, five-minute warning, countdown, four rounds with waits [STRONG, one defect fixed]
- C4 Castle siege windows: 8 castles, 2 h war every 4 days, reset on end [STRONG]
- C5 Crack of Time: linked portal pair opened on a timer [STRONG for the idea; timing as written is broken, no numbers taken]
- C6 Scheduled news line and daily dungeon reset (broadcast and reset clocks) [PARTIAL, thin]

Best transferable idea (one line per cell):
- C1: a window that is a pure function of time (base, period, start, end), with the exact spawn moment drawn once per cycle.
- C2: a warning broadcast, a short walk, then a roll that decides how many bosses appear, each placed near one eligible player.
- C3: a timed arena with a visible countdown and round gates whose waits are data.
- C4: a siege window that repeats on an interval and ends with a clean-up of who is inside and a reset of the faction's money.
- C5: two linked portals spawned as a pair, so the event is a way in and a way out.
- C6: a rotating news line on a fixed timer, and a dungeon reset that is a short window, not a point in time.

## 1. What the player sees and feels (375 wide)
Once an hour the server picks a random moment before minute 57 and shouts a red line in every chat window: a strange aura has appeared. The players then have two to five minutes to walk. Then one to three bosses appear, placed a few tiles from a random eligible player (level 55 or above, not dead, not a GM). A crack object (the donor's name for a placeholder) shows at the placement point for about three seconds before the boss spawns there, and each new boss gets its own announcement line. A connection can take at most two of these bosses per day. Separately, a scheduled boss on a fixed clock: a window opens at a set minute and the boss may appear at any moment in it, which keeps the player checking the clock. Ultimate Battle: five minutes before a slot, a server-wide notice tells everyone to enter the arena; the last ten seconds are a countdown from ten to one and then a "Deathmatch" line; four rounds follow, each followed by a wait. A castle war starts with a broadcast, the gates are repaired, players from outside the owning clan are sent to a set return point, and the end of the war is also a broadcast that resets the castle's tax.

## 2. Why it works / is striking
Criteria: readable beat at 375 wide, one signature behaviour, one signature line or sound, could be ours at 20 to 30 percent resemblance.
- C2 (aura event): strong. The red line is a clear beat; the ring is a readable telegraph. Signature behaviour: the boss appears on top of a player who did not ask for it. Signature line: the aura announcement. Could be ours at 20 to 30 percent: an aura that marks a random nearby player, with one to two bosses and a ring.
- C1 (window boss): medium. The window is a clock fact, the boss's exact moment is a surprise. Good as world structure; weak as a single beat.
- C3 (Ultimate Battle): strong. The countdown from ten and the "Deathmatch" line are the most readable ceremony in the donor. Round gates make a visible rhythm.
- C4 (castle war): strong as a world story; the walls being repaired and players being sent out are readable only if the map shows them.
- C5 (Crack of Time): the portal pair is a readable object; the timing cannot be trusted as written.
- C6: thin.

## 3. The rule behind it
Pattern: a clock (time-of-day window or a fixed period) decides when; one random draw decides where or how many; the server announces before the event; the event is a fixed list of timed steps with a hard cap.

C1 (window boss): one entry per boss in BossCycle.xml (29 entries; periods 24 h x8, 2 h x5, 4 h x3, 5 h x4, 7 h x3, 8 h x2, 1 h x2, 3 h x1, and 1 d 2 h 31 min x1). Each entry is base date and time, a period, a start offset and an end offset. The window is the period's start plus the offset; the appearance moment is a random point inside the window (L1BossCycle.java lines 248 to 258). Without a base date the base is today's midnight at server start (lines 59 and 135; XML comment line 3). A user override file replaces entries by name (line 371).

C2 (aura event): BossEventController.java. Once per hour the controller draws a random delay inside the first 57 minutes (line 85) and then waits. At the draw it broadcasts the aura line (line 96), waits two to five minutes (line 97), rolls the count (10,000-point roll: below 2,000 gives 3 bosses, below 8,000 gives 2, otherwise 1; lines 100 to 107), then for each boss: picks a random player from all online players; rejects anyone not on map 4, not in a normal zone, below level 55, GM or dead (lines 119 to 120); rejects a connection that already has two bosses today (lines 125 to 127); picks a boss from a list of 25 ids (altsettings line 85); places a ring object at a random offset of up to about nine tiles (line 139) for three seconds (line 163) then spawns the boss near that point with a lifetime value of 1500000 (line 168); announces the boss name (line 169). The daily cap resets at a set time (config). A kill of any of the 25 bosses broadcasts a "protected" line naming the killer (L1MonsterInstance.java lines 453 and 463). The whole event is off by default (altsettings line 78).

C3 (Ultimate Battle): UbTimeController polls every 15 s (line 46) and starts an arena five minutes before its slot (L1UltimateBattle.java line 521 with BEFORE_MINUTE = 5 at line 83). The slots come from the ub_times table: five arenas with three start times each, 15 slots (db/l1jdb_m10.sql; UBTable.java line 112). The thread then runs a countdown: about 290 s of silence, then 10, 5, 4, 3, 2, 1, "Deathmatch" (line 200 and the countdown code). Four rounds follow (line 246). Each round spawns its pattern's groups with a per-group delay, drops supplies if anyone is left, and waits 60, 60, 20 and 180 seconds (WAIT_TIME_TABLE line 229, ten-second ticks at line 232). Survivors are teleported out after the last round.

C4 (castle war): WarTimeController.java. Eight castles, each with its own war start time. A war lasts 2 h and repeats every 4 d (altsettings lines 106 and 108). At start (line 169): gates are repaired, a broadcast goes out, and players outside their own clan are sent to the castle's return point. At end (line 194 onward): the same clean-up, a broadcast, the next start moved by the interval, the tax reset to 10 percent (line 198), flags, crowns and towers in the area deleted. If the server was down past a window, the next start is set to now plus one interval (constructor). Outsiders are sent to a set return point (getGetBackLoc).

C5 (Crack of Time): CrackOfTimeController.java. A linked pair of portal objects is spawned: one of two entry points and one of nine exits are drawn, and two portal NPCs are created, each teleporting to the other end (spawnCrack and createCrack). A broadcast announces the rift at spawn (string id 1469) and another at the up time (string id 1467); the text is not in the box. Timers are counted in 500 ms ticks (line 77) against values in milliseconds (line 51). See defect D5.

C6 (news and resets): Announcecycle.java schedules the news line at a fixed rate (line 97), first run after 60 s, then every ShowINGAMENEWS_Time minutes (360 in server.properties line 169). The news file holds one message, so the rotation is one line. TimedDungeonController polls every 5 s (line 24) and resets dungeons inside a six-second window after a set time (line 52).

Data counts: BossCycle 29; altsettings boss ids 25; ub_times 15 (5 arenas x 3); ub_settings 5 arenas; ingamenews 1 message; announcements 5 lines (not opened for meaning). Table counts for spawnlist_boss and boss_kills not done.

### Defects (keep the idea, fix the defect, sketch carries the fix)
- D1 window search steps one period at a time (L1BossCycle.java lines 220 to 224 and 227 to 231). Cost grows with time since the base date. Fix: closed form, n = floor((target minus base) / period), then one step.
- D2 spawn moment is re-drawn on every call (line 256). The same boss reports a different time each time it is asked. Fix: draw once per cycle, seeded by the cycle index, and store it.
- D3 no base date means server start, so non-24 h cycles shift on every restart (lines 59 and 135). Fix: an explicit anchor in data.
- D4 one exception ends the aura controller for the whole uptime: the catch (line 186) sits outside the loop and then only logs. Fix: catch per cycle, log, continue.
- D5 the Crack of Time window is in milliseconds but is counted in ticks: the cap of 19 h / 2 written as 34,200,000 (line 51) is compared to a tick counter that goes up every 500 ms (lines 77 and 118). As written the window is about 198 days long, not hours, and the "up" broadcast fires on the same tick count, so it is effectively never reached within a normal uptime. The gate of 150 x 600 ticks (line 110) mixes units the same way. Fix: time in ms from a clock, not in ticks. Timing numbers from this cell are not used.
- D6 aura pick happens after a two-to-five-minute wait over a snapshot of online players (line 90 snapshot, line 97 wait). Line 125 reads the connection without a null check. Whether the connection is null for a logged-out player was not read. Fix: re-check online state and connection at pick time.
- D7 Ultimate Battle waits run even when no member is left: spawns are guarded (lines 256 and 264) but the wait is unconditional (line 268). Fix: end the arena when the member count is zero.

## 4. For Frankendom
Mapping: 700 zones as data. C1 is 29 windows as zone data: each boss has a window that is a pure function of server time, so the server can verify and the client only shows it. C2 is a zone-group event: the server rolls the count and the placement, sends a banner and a ring to the client, then spawns through the same spawn path as ordinary bosses. C3 is a dungeon-like arena whose rounds are data and whose end gives the reward. C4 is faction control per castle-like zone. C5 is a linked teleport pair as zone data.

Keep:
- the aura as a warning to the whole zone, then a short walk (ours shorter: 60 to 120 s, phone-first)
- one to three bosses by weighted roll, each near one eligible player (cap 3, same as MAX_ATTACKERS)
- a countdown from ten and a round gate with waits as data (C3)
- a window that repeats on an interval and ends with a clean-up and a reset (C4)
- one ring telegraph of about three seconds before a spawn (C2)

Change:
- per-IP cap: use per-account and per-device caps. Shared connections (cafés) share the donor cap.
- kill line that names the killer: keep, but the name is the player's own, not a fixed string.
- arena end waits: stop when the arena is empty (D7).
- every time value in one unit (ms) read from the server clock (D1 to D5).
- no fixed boss list in config: zone data only.

Frankendom rule rows:
- C2 spawns and their lifetime: row 23 (spawn caps, respawn, despawn with grace). Target origins/server/world-spawns.ts (Lead ruling; file not checked in the repo). The lifetime value is unit-unclear in the donor (line 168), so define the unit ours.
- C2 roll and placement: server-side, cite row 18 (loot roll and XP award) only for kill rewards; the server tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" for the timer loop.
- C3 rounds: row 4 (fight loop: aggro, chase, leash) for the groups; end-of-round reward row 18.
- Aura banner, ring and countdown: client presentation, row 14 (HUD) and row 12 (combat sound cues).

## 5. 5-minute look test (Dom, on a phone)
Build as a style flag on the existing fight scene (no release rows, no lock), publish to the preview folder.
- Flag A: a red banner "a strange aura has appeared", a 60 s countdown chip, then a three-second ring under one spot a few tiles from you, then one boss. Compare to a plain spawn at the same spot.
- Flag B: the ten-second countdown with the big number and a "Deathmatch" card, then two rounds with a 20 s gap. Compare to no countdown.
- Judge at 375 wide: is the banner readable in one glance; does the ring read in three seconds; does a countdown feel like an event or like a delay.

## 6. Licence / IP
GPL v2 for the source and the data in the repo (COPYING line 1; AU029). The README says the project is a clean-room server emulator and names the target client (AU029, README lines 6 and 84). Game-specific tables (boss ids, arena layouts, castle names, map ids, text) are not cleared, so class C for the data; mechanics only. No boss names, ids, map numbers, town names, arena coordinates or broadcast strings are copied. Our versions are distinct originals: a named boss of our own, a ring of our own colour (no donor colour codes), our own countdown wording. Kept: a window from a clock; a warning before a spawn; a roll on count; a countdown; a round gate; a siege window. Changed: all numbers and names, the per-IP cap, the arena end rule. No legal conclusion.

## 7. Gaps
- Not read: L1SpawnUtil.spawn (unit of the lifetime value), Config defaults (BossEvent related keys, ALT_WAR keys beyond the two in altsettings), L1World online-player snapshot, the L1PcInstance logout path (for D6), L1UbSpawn and L1UbPattern beyond the round loop, L1WarSpawn beyond the flag spawn, UbTimeController beyond the poll, the full UBSpawnTable, the boss spawn table (spawnlist_boss, count not done), BossSpawnTable, SpawnTimeTable, TreasureBox, the other timed controllers (FishingTimeController, LightTimeController, HomeTownTimeController, AuctionTimeController, HouseTaxTimeController, NpcChatTimeController, RankingsController, dungeon folder).
- Data not read for meaning: announcements.txt (5 lines), badnames.txt, idstate.dat, the 567 maps files (not related to events), db/archive.
- Half read: server. Client half absent. No paired donor.
- Death and respawn presentation: not read in this topic (the boss death hook is a broadcast only). Loot reveal ceremony: not read. Idle and ambient animation: none in a server-only donor. Walk density: the aura event is one per hour per server; the window bosses are per-boss; not measured.
