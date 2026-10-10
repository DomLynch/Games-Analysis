# 2003scape-rsc-c (world-events, cell WE006)

Donor: /mnt/frankendom-donors/2003scape-rsc-c/ (VPS, read-only over ssh).
Licence (as the files say): code is GNU AGPL v3 (COPYING line 1; README.md lines 352-365). Game data in cache/ (*.jag, *.mem) has no licence in the repo and is treated as proprietary. Class C per AU001. Shape only, clean-room. No look, name or number is copied.
Checked: client half read for the timers, the countdown, the death path and the server-message path (src/mudclient.c, src/packet-handler.c, src/game-character.c, src/game-character.h, opcode tables). Only the functions cited were read, not whole files. Confidence high on what the cited code does; the server side is not in the box. Nothing was run. Verdict (addendum scale): PARTIAL.
Audit and catalogue used: AU001 (assets), DC002 (catalogue, 'client half only').

Half read: CLIENT (C source). SERVER half: the matching 2003 server is not in the donor list. Name match only: Open-RSC-Core-Framework (box name, not verified, not read). DATA half: the spawn, event and NPC tables sit inside cache/*.jag and cache/*.mem (binary, not decoded).

Verdict for this topic: the donor has NO world-event system in the client. No invasion, no roaming boss, no scheduled event. What it has is a set of server-driven countdowns and per-tick timers that present a world state the server owns. That is still useful for the presentation half of a timed event.

## 1. What the player sees and feels
A fight is running. A yellow bold line sits bottom-centre: "System update in: m:ss". It counts down once per game step and the seconds shown tick down live. When the count runs out the line does not disappear by itself (see defect D1), so the player sees "0:00" until the server clears it. Separately, every hit on a creature or player shows a short damage number that pops for about one second and a small health bar that stays for about four seconds after the last hit. A death blacks the screen to a fade with a red line, "Oh dear! You are dead...", and holds it for about five seconds; when that runs out, two game messages say the player was granted another life, keeps skills and that the goods land where they died.

## 2. Why it works, or is striking
- Readable at 375 wide: one line of text, one number, at the bottom edge. Not measured on a phone; the donor is a desktop and touch client with no 375 target.
- One signature behaviour: the countdown is the server's number, shown by the client; the client never decides when the event ends.
- One signature sound or effect: a server-named sound cue (SERVER_SOUND) plays the named clip; no sound design in the donor beyond that.
- Could be made ours at 20-30 percent resemblance: yes. A countdown banner with a 'hide at zero' rule, a per-tick combat-visibility timer and a death fade are common, and ours would differ in palette, font and wording.

## 3. The rule behind it
Server pushes a single number (the countdown), the client stores it, counts it down once per game step, and displays it as minutes and seconds. Timers are plain counters decremented each step; a hit resets a counter to a fixed value, and thresholds on the same counter choose what is drawn (health bar while above zero, damage number only in the first part of the window).

Order of operations (read from code):
1. Server sends the system-update value (16-bit). Client stores value times 32 (packet-handler.c:1931). Only on the non-177 build (packet-handler.c:1929 is guarded by REVISION_177; server-opcodes177.h has no such opcode).
2. Each game step (mudclient.c:3242, called from mudclient.c:3616 inside the step loop at mudclient.c:5211) the counter drops by one while it is above 1 (mudclient.c:3244-3245).
3. Display: seconds = counter / 50, minutes and seconds from that, drawn while counter is not zero (mudclient.c:4838-4839).
4. Hit: the hit sets the target's combat counter to 200 (packet-handler.c:392 for players, :866 for NPCs). Each step the counter drops by one (game-character.c:169-170, inside game_character_move at game-character.c:72, called per player at mudclient.c:3314).
5. While the counter is above 0 the health bar draws (mudclient.c:3729). While it is above 150, the damage number draws (mudclient.c:3747), so the number shows for the first 50 steps only.
6. Death: the server's death message sets a 250-step screen timer (packet-handler.c:1905). Each step it drops (mudclient.c:3317-3318). While it is non-zero, the screen fades and mouse clicks are cleared (mudclient.c:4647-4648, 3426-3427). At zero the two respawn messages are shown (mudclient.c:3322 onward).
7. Step length: the target is 20 ms per step (mudclient.c:794 with 50 per second set at mudclient.c:2567). The 50-per-second figure is the client's own assumption in the display divide.

Data fields (designer-tunable; donor values are null because the donor is not MIT, Apache or BSD):
| name | unit | donor_value_or_null | ours to start (not donor) |
|---|---|---|---|
| countdown_step_rate | steps per s | null | 50 (match the 20 ms step) |
| countdown_server_quantum | units (server multiplies by 32) | null | 32 |
| countdown_hide_at | units | null | 1 (hide when <= 1, see D1) |
| hit_bar_steps | steps | null | 100 (2 s, fast duels) |
| hit_number_steps | steps | null | 50 |
| death_screen_steps | steps | null | 150 (3 s) |
| message_bubble_steps | steps | null | 150 |
| threat_origin_y | world tiles | null | set per zone as data |
| threat_safe_x | world tiles | null | set per zone as data |
| threat_depth_scale | tiles per level | null | set per zone as data |

Danger rule in the client: the client turns world coordinates into a danger level. Level = 2203 minus (local region y + plane height + region y) (mudclient.c:5567-5568). Above zero the player counts as in the danger band (mudclient.c:4857 sets is_in_wilderness from it, in the draw path). A fixed -50 sentinel is returned when x (local region x + plane width + region x) is at or past 2640 (mudclient.c:5571).

## 4. For Frankendom
- Target file: src/fight/event-timer.ts (proposed name, repo not checked). Parity row 18, sub-line 'server tick: fixed step, input intake, per-tick NPC budget'. The per-step counters here are exactly the row-18 shape.
- Keep: the server owns the number; the client only counts it down and draws it; hit visibility is one counter with thresholds.
- Change: the server sends an end-time (step or ms index), not a value the client counts down. That makes a dropped or late packet self-correcting. Row 23 (zone population, origins/server/world-spawns.ts) owns the schedule itself.
- Zones as data: the danger band (2203, 2640) is a hard-coded world constant. Move it to zone data (see fix under D4).
- Server-verified kills and events drive the client banner; the client never fires an event.
- Death: keep the 250-step fade and the two-line respawn message, but make the durations zone or Pit data so a Pit death is short and a field death is long.
- Stay client-only: banner colour, font, fade curve, sound cue choice.

## 5. Five-minute look test (Dom, on a phone)
Build one 375-wide zone HUD with a bottom-centre line "Event in 0:12" that counts down and then does two things in turn. Version A: the donor behaviour (stays on "0:00"). Version B: hides at zero and plays a short stinger. Compare them on a phone during a duel: is the line readable at arm's length, does it steal the fight, does the hide at zero feel like the event ended. Then run the death fade at 3 s and 5 s and pick one. Nothing else is built.

## 6. Licence and IP
Code: AGPL v3 (COPYING line 1; README.md 352-365). Adapting code would bind us to AGPL, so this note takes shape and idea only; every line of our code is written fresh. Game data: proprietary per AU001; no names, creatures, items or zone data are used here. Recreate as a clearly distinct original: keep the trait (server-owned countdown with a hide rule), change the trait (our own banner, our own timing, server end-time instead of count-down). No legal conclusion.

## 7. Gaps
- Not read: the server half (not in the donor list), the cache archives (binary, not decoded, so no event or spawn tables), src/ui/*, src/gl/*, src/pica/*, and the 177 build branches beyond the guards named above.
- Half read: client only. No event table or schedule data read.
- No world-event, invasion or roaming-boss code found in the client (grep on src/ for invasion, boss, roam, schedul, rumour, raid, wave: nothing relevant).
- Not measured: readability at 375 wide, idle animation vocabulary, loot reveal.

## Defects (keep the idea, fix the defect)
- D1 Countdown sticks at 0:00. The decrement stops at 1 (mudclient.c:3244), but the banner draws while the value is not zero (mudclient.c:4838). So the banner shows "0:00" until the server sends zero or the state resets. Idea kept. fix: hide the banner when the value is at or below one, and clear it when the zone changes.
- D2 Coarse quantum. The server encodes in 32-unit steps (packet-handler.c:1931), so the visible time can be off by up to about 0.64 s at 50 steps per second. fix: send the end-time in steps, or in ms, and keep the 32-unit encoding only for the wire.
- D3 Danger constants in the client. 2203 and 2640 are built into the client (mudclient.c:5568, 5571). fix: send the danger band from the zone data and keep the formula.
- D4 Only one display rate. The display divides by 50 (mudclient.c:4839) whatever the frame rate. fix: divide by the real step rate the server uses.

Best transferable idea: the server owns a single countdown number, and the client counts it down and shows it on one HUD line, with the hit visibility as one counter that thresholds the same way.

## Where seen
- Idle and ambient: torch flicker on the lowest plane (mudclient.c:4718-4724 per DC002, not re-read here). Not an event.
- Death and respawn presentation: fade to black, a red 24-point line, five seconds, input held, then two grey messages on release. Text: "Oh dear! You are dead..." (mudclient.c:4651).
- Loot reveal ceremony: none in the read code. Ground items are drawn as small models (per AU001). Not read in depth.
- Walk density (what appears every 20 s of walking): not in the client. Spawns are server-sent (SERVER_REGION_* packets).
- Readability at 375 wide: not measured.

Reuse tag: presentation-only reuse of a countdown and a per-step timer. Brief rule served: "Server pushes, client presents"; a world event never starts on the client.
