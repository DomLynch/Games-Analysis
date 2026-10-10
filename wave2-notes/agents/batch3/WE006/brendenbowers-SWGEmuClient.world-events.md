# brendenbowers-SWGEmuClient (world-events, cell WE006)

Donor: /mnt/frankendom-donors/brendenbowers-SWGEmuClient/ (VPS, read-only over ssh). Unreal client for a Star Wars Galaxies emulator.
Licence (as the files say): no LICENSE, COPYING or NOTICE file. Plugins/SWGEmu/README.md says the code is "provided as-is for educational purposes related to SWG EMU" (AU007). No asset licence stated. The README says the game data comes from retail TRE files, which are not in the repo. Class C (AU007). Shape only, clean-room. No code, texture or sky copied.
Checked: the client's galactic clock (SWGTerrainSubsystem.cpp and .h, read in full for the clock, day fraction, sun arc and fog/weather paths), the server-time message (ServerTimeMessage.h/.cpp), the opcode table (SWGMessageOp.h), the crafting subsystem header, and grep across Plugins/ and Source/ for invasion, roaming, respawn, countdown, schedule, boss, raid, rumour, weather and time terms. Confidence high on what the code does; the clock arithmetic is worked by hand from the code, not run.
Audit and catalogue used: AU007 (assets), DC010 (catalogue; client half read in part).

Half read: CLIENT. DATA: the planet terrain header (TimeCycle) is in the TRE files, not read; the environment table (weather rows) is in TRE, not read. SERVER: the matching server halves are in the box but not in my donor list: ProjectSWGCore-Holocore and swgemu-Core3 (server), SWG-Source-dsrc (data templates). Not read. The server is where the galactic time and any event would come from.

Verdict for this topic (addendum scale): PARTIAL. Real clock mechanism read in full. The client has no invasion, roaming boss or scheduled-event system. The weather path is wired for one state only, and the crafting countdown is declared but never fired.

## 1. What the player sees and feels
The sky moves on a day cycle that matches the server's clock. The sun climbs, sits high, sets behind the ridge and the sky ramps through dusk into a starfield. Day is the longer stretch in this donor (about 0.64 of the cycle against 0.36 for night, set by the sunset and sunrise fractions). The player sees the change as a smooth drift, not a jump, as long as the sync is on time. Every 60 seconds the server sends its galactic time and the client re-anchors to it, so the drift corrects itself. On a phone the sky change is the main world signal; no event banner exists here.

## 2. Why it works, or is striking
- Readable at 375 wide: the sky is a single ramp over one cycle, not a text cue. Not measured on a phone.
- One signature behaviour: the clock runs on the client between syncs and re-anchors to the server, so one server packet is enough to keep a whole zone in step.
- One signature sound or effect: none in the clock path (sound is outside this topic).
- Could be made ours at 20-30 percent resemblance: yes. A server-anchored day clock with two fractions for sunset and sunrise is a clear, generic rule. Our palette, sky, and the dusk length would differ.

## 3. The rule behind it
A server-owned absolute time is pushed, the client stores the time with the local clock reading at that moment, then each frame computes the current time as the stored time plus local elapsed time times a test scale, wraps it by the planet's cycle length, adds a phase offset, and maps the result to an hour angle on two spans: a night span (sunset to sunrise) and a day span (sunrise to sunset). The day fraction then drives the sun arc, the sky colour ramp and the fog.

Order of operations (read from code):
1. The server sends galactic time in ServerTime (opcode doc: "every 60 s", SWGMessageOp.h:59) and in CmdStartScene (SWGTerrainSubsystem.cpp:403-409). The value is int64 seconds (ServerTimeMessage.h:19).
2. SetGalacticTime stores the value and the local clock at receipt (cpp:413-417).
3. Pinned test path: if swg.TimeOfDay is zero or above, the day fraction is that value (cpp:428-430). Before any sync the fraction is 0.25 (cpp:432-434).
4. Normal path: cycle = planet TimeCycle if above 1, otherwise 3600 s (cpp:436). Now = stored time + (local clock minus stored local time) times the test scale, floored at zero (cpp:437). Day fraction = fractional part of (now mod cycle divided by cycle, plus the phase offset) (cpp:438).
5. Hour angle (cpp:826-840): night span = fractional part of (sunrise minus sunset plus one), floored at 0.05. Inside the night span the hour angle runs 90 to 270 degrees; outside it, -90 to 90. Defaults: sunset 0.5 (cpp:134), sunrise 0.86 (cpp:138). Night is 0.36 of the cycle and day is 0.64.
6. Tick applies the day fraction each frame while a sun exists (cpp:624-632).

Data fields (designer-tunable; donor values null, because the donor is not MIT, Apache or BSD):
| name | unit | donor_value_or_null | ours to start (not donor) |
|---|---|---|---|
| sync_interval | seconds | null | 30 (server sends more often than the donor's 60) |
| cycle_length | seconds | null | per zone, from zone data |
| phase_offset | fraction of cycle | null | per zone |
| sunset_fraction | fraction of cycle | null | 0.50 |
| sunrise_fraction | fraction of cycle | null | 0.86 |
| test_time_scale | multiplier | null | 1 (60 only in test, see E1) |
| ease_on_sync | seconds | null | 2 |
| weather_index | row id | null | 0 (clear) |

## 4. For Frankendom
- Target file: src/fight/event-timer.ts (proposed name, repo not checked), parity row 18 (sub-line 'server tick: fixed step'). Section 5 names one row: row 18. Row 23 (zone population, origins/server/world-spawns.ts) is where a scheduled spawn would live.
- Keep: a server-owned absolute time, client-side extrapolation between syncs, a cycle wrap and a phase offset per zone, and two fractions that set night and day lengths. A long dusk is a cheap way to make a timed event feel like a season.
- Change: the sky is client-only. Spawns, roaming bosses and any timed event are decided on the server from the same clock and sent as events. The client never starts a spawn because the sky is dark.
- Zones as data: cycle length, phase offset, sunset and sunrise fractions are all per zone data, not planet globals.
- Server-verified: the clock is authoritative. The client only shows and eases it.

## 5. Five-minute look test (Dom, on a phone)
One zone, the day clock at test scale 60 for three minutes, with the server sync every 60 s as the donor does. Version A: the sync snaps the sky back each minute (donor behaviour, see E1). Version B: the same sync eases over two seconds. Compare the sunset on a phone: does dusk read as a warning that a night event is coming, and does the snap break it. Nothing else is built for the look test.

## 6. Licence and IP
No licence, class C, the README gives an educational-use line only. Shape only, clean-room. The clock rule is a generic technique (server time, local extrapolation, cycle wrap, two-fraction day). Nothing in our code is adapted from this donor. The sky, sun and star art are not copied. No legal conclusion.

## 7. Gaps
- Not read: the server halves (ProjectSWGCore-Holocore, swgemu-Core3, SWG-Source-dsrc); the TRE terrain header (TimeCycle) and environment table; the sky and cloud materials; most UI widgets; the fog table values.
- Half read: client. Data half: TRE not in repo, so the cycle and weather rows are unread.
- No invasion, roaming-boss or scheduled-event code in the client (grep over Plugins/ and Source/ for invasion, roaming, respawn, countdown, schedule, boss, raid, rumour, wave: nothing relevant).
- Not measured: readability at 375 wide, idle and ambient behaviour, death and respawn, loot reveal, walk density.

## Defects (keep the idea, fix the defect)
- E1 Sync snaps with no latency term. SetGalacticTime anchors at the moment the packet arrives, not when the server sent it (cpp:416-417), and the sun jumps to the server value. Fix: ease over about 2 seconds, or add half the round trip. Test scale 60 makes this visible: between syncs the local clock runs 60 times faster, so after 60 s of wall time the local clock is 3600 s ahead of the server's 60 s, and the next sync pulls it back (arithmetic from cpp:437, not run).
- E2 Help text does not match the arithmetic. The help for swg.TimeOfDay says "0.25 = noon" (cpp:89). With the default sunset 0.5 and sunrise 0.86 (cpp:134, 138), hour angle zero (noon) falls at about 0.18 (worked from cpp:833 and cpp:840, not run). The pre-sync fallback of 0.25 (cpp:434) is therefore afternoon. Fix: state noon as computed, or move the phase offset so the help and the sphere agree.
- E3 Comment and fallback disagree on cycle length. The Tick comment says "a full cycle is a few hours" (cpp:628), but the code's fallback cycle is 3600 s, one hour (cpp:436). Fix: set the fallback as a named constant and correct the comment.

## Not wired (not defects of the idea)
- W1 Weather is not switched. The environment table has weather rows, but the client reads only the row with weather index 0 (cpp:1065-1072), and the comment says heavier weather is to come from the server. The only weather effect is a minimum fog density (cpp:811-813). No weather message exists in Plugins/SWGEmu (grep). Fix path: add the server message and select the row by state.
- W2 Crafting countdown is declared but not fired. SWGCraftingSubsystem.h:179-185 declares a tool-status delegate and its header says the delivery mechanism is untraced. No code in the repo broadcasts it. A timed craft exists in the design, not in the client.

Best transferable idea: a server-owned absolute clock, extrapolated on the client between syncs, wrapped per zone, with two fractions setting how long night lasts.

## Where seen
- Idle and ambient: the sky drifts over one cycle; star and cloud layers scroll (materials named, not opened).
- Death and respawn presentation: not read.
- Loot reveal ceremony: none in the client.
- Walk density: none in the client; the flora streaming rings are the only spawn-like rule (see DC010).
- Readability at 375 wide: not measured.

Reuse tag: clock sync and day-fraction rule (shape only). Brief rule served: "Server owns time, client shows it", with the defects fixed in the note.
