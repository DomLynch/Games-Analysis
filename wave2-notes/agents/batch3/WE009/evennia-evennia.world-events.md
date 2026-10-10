# evennia-evennia (world-events, WE009)

Donor: /mnt/frankendom-donors/evennia-evennia (Evennia MU* framework, with the tutorial_world and EvAdventure contribs as game content). Licence: BSD 3-Clause (LICENSE.txt line 1). Donor values may be used (BSD). Depth: full for the scheduler primitives; thin for the game-content world events, which are small. Half read: server (the scheduler modules and the tutorial and EvAdventure data code). Client not read.

Checked: opened in full, under evennia/, gametime.py (schedule, TimeScript); evennia/contrib/base_systems/custom_gametime/custom_gametime.py (schedule, GametimeScript); evennia/scripts/scripts.py (start, _start_task, _stop_task, _step_callback, __call__ callcount); evennia/scripts/taskhandler.py (load, clean_stale_tasks, create_delays); evennia/scripts/tickerhandler.py (class docstring, handler init); evennia/scripts/monitorhandler.py (header). Game content: evennia/contrib/tutorials/tutorial_world/mob.py (state timers, idle line), tutorial_world/rooms.py (weather ticker call), evennia/contrib/tutorials/evadventure/dungeon.py (branch collapse cleanup). Grep of the repo for callers: gametime.schedule, MONITOR_HANDLER.add and TASK_HANDLER.add were searched; only TICKER_HANDLER.add has contrib callers. Nothing was executed. The one-shot defect below is from reading the code path; a test that fires the callback twice would confirm it.

Best transferable idea: a small persistent scheduler (one-shot tasks that survive restart and fire overdue ones at boot, plus a silence timer that a warning line announces) gives the world its clock; the donor's scheduler is good but its one-shot path re-fires, so the fix matters before anything depends on it.

## 1. What the player sees and feels
This donor has no invasion, no roaming boss and no spawn schedule; the search was thorough and the answer is no. What it has is a set of timer primitives and a few content timers. The content timers are small and text-only. In the EvAdventure dungeon, a branch that has not gained a new room for a week collapses with a message, and everyone inside is moved back to the start room (dungeon.py line 398 describes the cleanup, lines 418 and 459 hold the timer). No warning line comes before the collapse in the code read. The tutorial mob patrols slowly, hunts faster, goes down, and returns after a fixed wait (mob.py lines 125-128 and the death ticker at line 250). A quiet ambient line appears about once in every hundred ticks (mob.py line 307). On a 375-wide screen all of this is a single line of text, so the feel is "the world ticks", not "the world moves".

## 2. Why it works / is striking
- Readable at 375 wide: yes, all text. A silence timer shown as one warning line is easy to read.
- One signature behaviour: the silence timer. A branch closes after a week with no new room (dungeon.py line 459). The timer restarts when a new room is made (line 284). This is the only donor timer that a player feels as a deadline.
- One signature sound or effect: none. The donor has no sound for these events (the one audio file is a web-client notification, not used here).
- Could be made ours at 20-30 percent resemblance: yes. "A zone closes after a quiet period, with one warning line first, and the people inside are moved to the entrance" transfers well to a Pit gate or a zone that shuts after idle time.

## 3. The rule behind it
A. Game-clock callbacks (utils/gametime.py 222-274; custom_gametime.py 268-308). schedule(callback, repeat, sec, min, hour, day, month, year) computes the seconds to the next matching game time (real_seconds_until), creates a persistent TimeScript with interval equal to those seconds, and stores the callback and its arguments on the script. The repeat flag becomes repeats = -1 when true and 1 when false (gametime.py line 269; custom_gametime.py line 301).
B. One-shot defect. TimeScript.at_repeat calls the callback (line 69) and then always restarts itself with start(interval, force_restart=True) (line 72; custom_gametime.py line 331). Restarting stops the old task and creates a new one (scripts.py lines 330 and the restart branch in _start_task). The new task's call count starts at zero, so the repeats = 1 limit in _step_callback (scripts.py line 386) never triggers. The repeat flag is not stored in db (schedule() saves only the callback, the time fields and the arguments), so at_repeat cannot tell. Result as read: a one-shot schedule fires again at the next matching time, every time. The donor's own test checks only repeats == 1 (utils/tests/test_gametime.py line 93) and never fires the callback.
C. Persistent one-shot tasks (scripts/taskhandler.py). Tasks are saved as (due date, callback, args, kwargs) in the server config (line 268 and the save at line 356). On boot, create_delays schedules each one for max(0, due minus now) seconds (line 626), so overdue tasks fire immediately at restart: a catch-up rule. Tasks that were cancelled are pruned sixty seconds after their due time (stale_timeout = 60, line 257; clean_stale_tasks 297-324).
D. Interval tickers (scripts/tickerhandler.py). One pool per interval; objects subscribe to a rate and the pool re-applies its instructions after restart (class docstring line 302). The tutorial uses it for the weather line (rooms.py line 384) and for the mob's state timer (mob.py line 199).
E. Reactive triggers (scripts/monitorhandler.py, header line 2). A callback can be registered for when a field or attribute is saved. No donor code registers one (grep).
F. Silence collapse (contrib/tutorials/evadventure/dungeon.py). The cleanup script compares each branch's last-updated stamp with an allowed date (line 418) and collapses branches older than the branch life of one week (line 459). Each exit has a fifty percent roll per tick to open (line 439). The stamp moves only when a new room is generated (line 284), not when a known room is traversed. That is a defect (see below).
G. Mob pacing (tutorial_world/mob.py 125-128): patrol 6 ticks, aggressive 2, hunt 1, dead 100 seconds, then a ticker returns it to life (line 250). Idle line: a one-in-100 roll per tick (line 307).

Data fields (designer-tunable; donor values are BSD-usable):
- schedule_interval: game seconds; donor value null (computed from the calendar).
- silence_collapse_life: seconds; donor value 604800 (one week, dungeon.py line 459).
- exit_open_chance: percent per tick; donor value 50 (dungeon.py line 439).
- patrol_pace: seconds per tick; donor value 6 (mob.py line 125).
- aggressive_pace: seconds; donor value 2 (line 126). hunt_pace: seconds; donor value 1 (line 127).
- dead_wait: seconds; donor value 100 (line 128).
- idle_line_chance: percent per tick; donor value 1 (mob.py line 307).
- stale_task_timeout: seconds; donor value 60 (taskhandler.py line 257).
- catch_up_on_boot: boolean; donor value true (taskhandler.py line 626 behaviour).

Known defects (keep the idea, fix the defect):
1. One-shot schedules re-fire (B above; gametime.py line 72, custom_gametime.py line 331). fix: store the repeat flag in db at schedule time and call self.stop() in at_repeat when it is false, and add a test that fires the callback twice.
2. Silence timer refreshes only when a new room is made (dungeon.py line 284), so a busy branch of known rooms can collapse. fix: refresh the stamp on every exit traversal (register_exit_traversed), not only on generation.
3. The branch stamp default is evaluated once at import (dungeon.py line 219, "datetime.utcnow()" as the default). Every branch starts with the same stamp. fix: default to None and set on creation.
4. Docstring says every five minutes for the exit roll (dungeon.py docstring near line 448) while the code rolls fifty percent per tick (line 439). fix: make the docstring match the code or the code match the docstring.
5. Dead path noted from the prior catalogue: the tutorial mob hunt ticker is registered as do_hunt (mob.py line 282) but the method is do_hunting (line 326). fix: rename. Latent: only when hunting is enabled.

## 4. For Frankendom
- 700 zones as data: each zone can carry its own silence-timer length, warning line and exit-open chance (data fields above), and the same timer rule is reused across all zones.
- One ledger, server-verified: the scheduler lives on the server. Its catch-up rule is the important one for us: an event due during downtime fires at boot, once, and is marked as catch-up so it is not applied twice. The client only draws the warning line.
- Many-vs-one: a silence collapse or a zone shut-down should not be a fight; the people inside are moved, not killed.
- Keep: a closure message that names what happened; a timer that restarts on activity; a per-tick random idle line (one in a hundred ticks reads as life); patrol paces by state; a dead wait then return.
- Change: add one warning line before any timed closure (the donor has none in the code read); refresh on any traversal (defect 2); no import-time defaults (defect 3); a fixed one-shot path (defect 1); no mixing of docstring and code (defect 4). Our return after death is row 23 territory (zone population), not a ticker per mob.
- Rulings mapped: row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer) for the silence collapse and the mob's dead wait; row 18 sub-line "server tick: fixed step, input intake, per-tick NPC budget" for the per-tick idle roll and the tickers (one per interval, not one per mob); row 17 (death and respawn presentation) for the mob's return.

## 5. A 5-minute look test
Target file: src/fight/zone_timers.ts (new module for zone-level timers and the silence collapse). Row: 23 (zone population: despawn on empty with a grace timer).
On a phone-width test zone (one room with three exits):
1. Set the silence length to a short test value (for example 60 seconds). Let the player stand in the room and tap "wait". Build A (donor-like): no warning; at 60 seconds the zone closes with one message and the player is moved to the entrance. Build B: a single warning line appears at 40 seconds, then the same closure. Judge: does the warning read as a deadline, and does the move read as a consequence, not a punishment?
2. Compare A and B: does the closure without warning feel like a surprise or like a bug?
3. Third build: the timer restarts when the player walks through a known exit (defect 2 fixed) versus only when a new room is made (the donor). Walk back and forth through known exits for 90 seconds. The donor version closes; the fixed version stays open. Judge: which one feels fair?
Pass when: the warning reads as one line at 375 wide, the closure does not kill anyone, and the restart rule matches what the player thinks they did.

## 6. Licence and IP
Code: BSD 3-Clause (LICENSE.txt line 1). Contributions in contrib are under the same licence (docs Licensing.md, from the earlier audit). The EvAdventure rules tables are credited in the README as Creative Commons Attribution (tutorials/evadventure/README.md line 21, not verified against the source book). This note uses none of the tables or text; values are ours or the donor's BSD values as marked. No legal conclusion is drawn.

## 7. Gaps
- Not read: the web client JavaScript and CSS (21 files, client half not read); the bodies of evadventure combat files and chargen; tutorial_world tests; the 803 documentation pages (only the licensing page read earlier); evennia/contrib/grid/wilderness encounters; evennia/contrib/rpg/buffs (timed effects) beyond the module size; evennia/scripts/ondemandhandler.py.
- Not run: defect 1 (one-shot re-fire) is from code reading. Defects 2 to 5 were read at the line level and not executed.
- Not followed: AGENTS.md and CLAUDE.md at the donor root are present; they were not read and not used as instructions.
- Half read: server and data for the cited paths; client not read. No paired donor in the box for this game.
- Idle and ambient behaviour: partly (mob idle line and weather ticker). Death presentation: mob dead wait and return only. Loot reveal ceremony: not in this donor's world code. Walk density: not measured (the ticks give about one warning line every five minutes per room by arithmetic: a ticker of 50 to 70 seconds with a one-in-five roll; not verified). Boss staging: none. 375-wide readability: judged from the text lengths, not rendered.
