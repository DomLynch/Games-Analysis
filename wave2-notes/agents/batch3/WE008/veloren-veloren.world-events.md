# Feel note: veloren-veloren, topic world-events (WE008)

Donor: /mnt/frankendom-donors/veloren-veloren (VPS, read-only). Paths below are relative to that root.
Licence: code GPL-3.0 (LICENSE lines 1-2, "GNU GENERAL PUBLIC LICENSE", "Version 3, 29 June 2007"). Assets carry per-entry licences in assets/credits.ron, with the file's own rule that a missing licence is assumed GPL3 (asset audit AU055). Copyleft: shape only. No code, names, sounds or art reused. Every donor_value below is null.
Half read: SERVER-side simulation: rtsim/src/rule/npc_ai/mod.rs (lines 360-510), rtsim/src/rule/report.rs (whole), rtsim/src/rule/replenish_resources.rs (whole), rtsim/src/rule/npc_ai/airship_ai.rs (parts), rtsim/src/event.rs (first 90 lines), common/src/calendar.rs (whole). WORLD: world/src/civ/airship_travel.rs (struct fields). DATA: not read for this topic (assets/world and assets/common not opened). CLIENT (voxygen): not read.
Checked: about 9 files opened in full or in part (listed in the JSON paths). Grep only: rtsim/src/rule/simulate_npcs.rs (symbols), rtsim/src/lib.rs (line 112). Confidence high on constants and branch order read; medium on consumer side (what NPCs do with reports, where calendar is built) which was not read. 30 receipts (V1-V5) are in the shared receipts.tsv, all verified with the gate script.

Cells (verdict in brackets):
- V1 NPC pirate raid: gather, hire, march, return [STRONG; raid body is a placeholder]
- V2 Witness reports within a radius [STRONG]
- V3 Calendar windows by date [STRONG; Easter is a heuristic]
- V4 Airship timetable and dock countdown [STRONG]
- V5 Regrowth clock with a per-tick budget [STRONG]

Best transferable idea (one line per cell):
- V1: a group that gathers before it marches, with each recruit's chance scaling with how many are already in.
- V2: a death or theft is a report that only the people within a radius hear, and they act on it later.
- V3: a seasonal window is a date range checked once, not a stored event.
- V4: a route on one world clock, with dock calls spaced irregularly so a wait feels like a countdown.
- V5: a slow regrowth clock that touches a fixed number of chunks each tick, so cost stays flat.

---

## V1. NPC pirate raid: gather, hire, march, return [STRONG]
Decision: adapt (idea). Target: src/fight/raid-party.ts (proposed). Row: 4 (fight loop: aggro, chase, leash).

### 1. What the player sees and feels
- A pirate leader at home waits for a chance. Then it follows its unhired pirates one by one, asks each to join, and marches the group to a nearby site at a steady pace (speed 0.8, rtsim npc_ai/mod.rs:491).
- At the site the group stands about for 60 to 120 seconds (mod.rs:495). Then it marches home slower (speed 0.6, mod.rs:498) and the hires end.
- On a 375-wide phone: a column of NPCs walking out and back, no fight in the code read. The raid body is a placeholder (see defect).

### 2. Why it works / is striking
- Readable: a column at 375 wide is one shape; the group's size is the threat.
- One signature behaviour: the group gathers before it marches, and recruiting speeds up as the group grows (the chance rises with each hire above three).
- One signature sound: none read (dialogue strings not read).
- Could be ours at 20-30 percent: yes. Keep the gather, the threshold, the march and the return.

### 3. The rule behind it
Order, for the leader (rtsim npc_ai/mod.rs:372-406):
1. Only the leader, only at home, only when not already out, and only when more than three unhired pirates of its faction are present (mod.rs:406, "> 3").
2. Roll 1 in 1200 per evaluation (mod.rs:380). The comment says about once an hour (mod.rs:379); how often the choice is evaluated was not read.
3. Choose a target site from the nearby list, within a distance check (mod.rs:386: the comment says 10 km; the value is 10000 world units; the unit was not checked).
4. Recruit: follow an unhired pirate until within 6 units and send the hire request (mod.rs:437, "inviting raid participant"). Hire chance per try: 0 while hired count is 0 to 3 (mod.rs:481); otherwise (hired minus 3) times 1/1200, divided by the number still unhired (mod.rs:482).
5. March to the target at speed 0.8 (mod.rs:491).
6. Act out the raid for 60 to 120 s (mod.rs:495).
7. March home at speed 0.6 (mod.rs:498), then end every hire.

Data fields:
- trigger_per_eval: 1/1200. Unit: probability per evaluation. Donor value null.
- min_group: 3 (plus one). Unit: unhired members. Donor value null.
- recruit_scale: 1/1200. Unit: probability per hired member above 3. Donor value null.
- march_speed, return_speed: 0.8, 0.6. Unit: fraction of speed. Donor value null.
- raid_s: 60 to 120. Unit: seconds. Donor value null.
- target_range: 10000. Unit: world units (comment says 10 km). Donor value null.

### 4. For Frankendom
- Shape: a group state machine on the server: gather, march, act, return. The client shows the column.
- Many-vs-one: once at the zone the group counts against MAX_ATTACKERS = 3. The engine's hate list owns targeting.
- 700 zones as data: the trigger, group size and times are zone fields. The march is the leash of row 4.
- Keep: the gather threshold, the march out and back, the stop when the group is spent. Change: the placeholder raid body becomes our fight with the attacker cap.
- Defects, with fixes:
  (a) The raid body is a TODO (mod.rs:493, "Replace this with raiding stuff"): the group stands at a villager action. Fix: a real raid with the attacker cap.
  (b) The range comment says 10 km but the value is 10000 world units (mod.rs:386 and the distance check under it). Fix: state the unit in the data field.
  (c) "Once an hour" depends on the evaluation rate (not read). Fix: state the rate per second in the data.

### 5. A 5-minute look test
- Build: one zone with a four-member group at a camp, a march of about 30 metres, a 60-second wait and a return.
- Dom watches it at 375 wide for five minutes and says whether the column reads as a threat before it reaches him, and at what size.

### 6. Licence and IP
- Code GPL-3: shape only. No code, names or dialogue reused.

### 7. Gaps
- Not read: rtsim/src/rule/simulate_npcs.rs (off-screen movement; symbols only); npc_ai/movement.rs; the hire message handler (NpcMsg::RequestHire); the villager action; dialogue.rs; the evaluation rate of the choice.

---

## V2. Witness reports within a radius [STRONG]
Decision: adapt (idea). Target: src/fight/death-witness.ts (proposed). Row: 17 (death and respawn presentation).

### 1. What the player sees and feels
- An NPC dies in a town: every NPC within 32 units gets a report with who died, who killed it, and the time of day (report.rs:23, 27). A theft within 24 units gives the same kind of report (report.rs:53).
- What the witnesses then do with it is in code not read (dialogue and quest files).
- On a 375-wide phone: nothing shows at once. The effect would be a later change in how nearby NPCs talk or act.

### 2. Why it works / is striking
- Readable: radius-based news means the player can plan around who saw it.
- One signature behaviour: the news is local. No global chat, no list.
- One signature effect: none read.
- Could be ours at 20-30 percent: yes. A witness rumour in a zone, held per chunk.

### 3. The rule behind it
- On death with a position: every actor within 32 units gets one report, created once and shared by all of them (report.rs:23-27). The report holds who died, who killed, and the time of day.
- On theft: every actor within 24 units gets a theft report (report.rs:53).
- Reports go into each NPC's inbox (report.rs:35 has a TODO: a chunk-based structure would be better).

Data fields:
- death_witness_units: 32. Unit: world units. Donor value null.
- theft_witness_units: 24. Unit: world units. Donor value null.

### 4. For Frankendom
- Shape: a local event fans out to witnesses on the server; the client shows only what the NPC then does.
- 700 zones as data: the radii are zone fields.
- Keep: the local witness, the time stamp. Change: the TODO (store reports per chunk and let NPCs query them, which is the TODO's own suggestion) fits our zones better than per-NPC inboxes.

### 5. A 5-minute look test
- Build: a test town with three bystanders, two in range and one out of range, and a theft and a death in each run.
- Dom checks which bystanders react later at 375 wide, once the reaction is defined in the build.

### 6. Licence and IP
- Code GPL-3: shape only.

### 7. Gaps
- Not read: the consumers of reports (dialogue.rs, quest.rs); report lifetime and any decay; the OnTheft emitter; rtsim/src/event.rs beyond line 90.

---

## V3. Calendar windows by date [STRONG]
Decision: adapt (idea). Target: src/fight/calendar-window.ts (proposed). Row: 21 (catalogue fields: the nearest row; a date window is zone data, not a fight rule).

### 1. What the player sees and feels
- On a set date range the world can dress for an event. The code defines four: Christmas, Halloween, April Fools and Easter (calendar.rs:9-12).
- On a 375-wide phone: a seasonal sign or prop appears only inside its window. The consumers (the dressing) were not read.

### 2. Why it works / is striking
- Readable: a dated sign is the simplest timed event there is.
- One signature behaviour: the window is a date range computed when asked, not a stored event.
- One signature effect: none read.
- Could be ours at 20-30 percent: yes, as zone data (a date range per zone).

### 3. The rule behind it
- Build the list from the current date, local time or a configured time zone (calendar.rs:29-34).
- Windows: December 20 to 30 (calendar.rs:41); October 24 to 31 (calendar.rs:45); April 1 (calendar.rs:49); and Easter as March 31 or April 1 to 7 (calendar.rs:53).
- No state is kept between calls.

Data fields:
- christmas_window: 12-20 to 12-30. Unit: month-day. Donor value null.
- halloween_window: 10-24 to 10-31. Unit: month-day. Donor value null.
- april_fools_day: 04-01. Donor value null.
- easter_window: 03-31 to 04-07 (heuristic). Donor value null.

### 4. For Frankendom
- Shape: a server date check that sets a zone flag; the client shows the flag.
- 700 zones as data: each zone can carry its own windows.
- Keep: named windows, a date check with no stored state. Change: compute Easter, and rebuild the list after midnight (defects below).
- Defects, with fixes:
  (a) Easter is a hand-picked range, not the date (calendar.rs:53). Fix: compute the date, or drop the window.
  (b) The list is built when from_tz is called (the caller was not read). If it runs once at boot, a server that runs across midnight at a window edge keeps the old list. Fix: rebuild at each day change.

### 5. A 5-minute look test
- Build: a test sign that switches on from a date window, with the clock set to 23 and 24 October in a test build.
- Dom compares the two at 375 wide and says whether the change reads.

### 6. Licence and IP
- Code GPL-3: shape only.

### 7. Gaps
- Not read: the consumers of CalendarEvent (the dressing); where from_tz is called and how often.

---

## V4. Airship timetable and dock countdown [STRONG]
Decision: adapt (idea). Target: src/fight/event-countdown.ts (proposed). Row: 14 (HUD) for the countdown; the schedule itself is server state.

### 1. What the player sees and feels
- An airship flies a fixed route between docks. Its position follows one world clock (airship_ai.rs:238).
- At the dock the crew calls out the time left. The first call comes 5 to 8 seconds after docking (airship_ai.rs:677). Gaps are 10 to 16 seconds (airship_ai.rs:689). The last call comes about 10 to 12 seconds before departure (airship_ai.rs:678).
- A dock shorter than 10 seconds gets no calls (airship_ai.rs:672).
- On a 375-wide phone: a spoken countdown with irregular gaps, read as a clock.

### 2. Why it works / is striking
- Readable: a countdown in spoken lines needs no HUD bar.
- One signature behaviour: the irregular spacing makes the wait feel like it has beats.
- One signature sound: the spoken calls (strings and voice files not read).
- Could be ours at 20-30 percent: yes, as a countdown for a timed boss or event.

### 3. The rule behind it
- The route is built in world generation. Each leg segment carries a cumulative route time (world/src/civ/airship_travel.rs:190). A spawn carries an effective route time (world/src/civ/airship_travel.rs:257).
- The route clock is anchored at spawn: route time zero equals now minus the spawn's route time (airship_ai.rs:316 and the comment block above it).
- At each phase end the lateness against the schedule is measured (airship_ai.rs:238). More than 10 seconds late, or more than 10 early, writes a debug line (airship_ai.rs:240, 253; the macro's release form was not read). No correction is made.
- Docked: a list of call times is drawn at random (first 5 to 8, then 10 to 16 while the time is more than 10 from the end, one more near the end if the gap allows; airship_ai.rs:677-689).

Data fields:
- lateness_tolerance_s: 10. Unit: s. Donor value null.
- first_call_s: 5 to 8. Unit: s. Donor value null.
- call_gap_s: 10 to 16. Unit: s. Donor value null.
- last_call_before_end_s: 10 to 12. Unit: s. Donor value null.
- min_dock_s: 10. Unit: s. Donor value null.

### 4. For Frankendom
- Shape: one world clock for timed events. Dock-type calls are the countdown; the client shows them.
- 700 zones as data: a timed event's cue spacing is a zone field.
- Keep: one schedule, irregular cue spacing, no cues on short waits. Change: act on lateness. Today it is logged and nothing else happens.

### 5. A 5-minute look test
- Build: a 30-second countdown before a timed event, with five calls at the irregular spacing above.
- Dom watches it at 375 wide and says whether the spacing reads as a countdown without a bar.

### 6. Licence and IP
- Code GPL-3: shape only. Spoken lines and sound files not used.

### 7. Gaps
- Not read: the client voice and sound mapping (voxygen); airship route generation in world/ beyond the struct fields; airship_logger.rs; the localisation string for the landing line.

---

## V5. Regrowth clock with a per-tick budget [STRONG]
Decision: adapt (idea). Target: src/fight/tick-budget.ts (proposed). Row: 18 (server tick: fixed step, per-tick budget; post-K item 3).

### 1. What the player sees and feels
- A harvested patch comes back over time, gradually, not all at once. The code comment says full replenishment takes one hour and that this makes farming unviable (replenish_resources.rs:5-9).
- On a 375-wide phone: a patch you cleared is partly back when you return. The player does not see the budget.

### 2. Why it works / is striking
- Readable: an hour-long refill that the player feels as a slow return.
- One signature behaviour: the refill is spread across chunks, so no single tick does much work.
- One signature effect: none (not a visual).
- Could be ours at 20-30 percent: yes. A refill that touches a fixed number of zones each tick.

### 3. The rule behind it
Each tick (replenish_resources.rs:25-34):
1. Up to 8192 chunks are topped up (replenish_resources.rs:15).
2. The chunks chosen rotate with the tick: the group is tick modulo group count (replenish_resources.rs:34).
3. Each chunk gains a small amount: world area times the tick length, divided by one hour times 8192 (replenish_resources.rs:9, 25).
4. Each resource is clamped between 0 and 1.

Hand arithmetic (not run): over one hour a chunk gains about world area divided by (chunks plus 8192), which is about one full refill when the chunk count equals the world area.

Data fields:
- refill_s: 3600. Unit: s. Donor value null.
- chunks_per_tick: 8192. Unit: chunks. Donor value null.

### 4. For Frankendom
- Shape: a per-tick budget on the server, rotating through zones. The client only sees the node.
- 700 zones as data: each zone sets its own refill time and budget share.
- Keep: the rotating budget and the clamp. Change: a per-zone refill field instead of one global constant.

### 5. A 5-minute look test
- Build: a 60-second refill on one test zone, and a node cleared by the player.
- Dom gathers the node on a 375-wide phone and says whether it returns within the minute.

### 6. Licence and IP
- Code GPL-3: shape only.

### 7. Gaps
- Not read: which resources exist and what they are; whether the tick length is fixed (dt is passed in); the rtsim tick loop.
