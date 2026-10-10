# openmw (world-events, cell WE010)

Donor: `/mnt/frankendom-donors/openmw` | Licence: GPL-3.0 (README.md line 9; LICENSE is the GPL v3 text) | C for the feel layer (GPL, shape only) | Morrowind data NOT in the box

Checked: read `apps/openmw/mwworld/cellstore.cpp` 1151-1157 and 1223-1290 (respawn and corpse clear, in full); `apps/openmw/mwclass/creature.cpp` 801-840 (creature respawn); `apps/openmw/mwworld/scene.cpp` 496-497 (caller only); `components/lua/asyncpackage.cpp` 1-119 (whole); `components/lua/scriptscontainer.cpp` 425-444, 565-626, 693-800 (timer save, load, queue, fire, budget decay start); `files/data/openmw_aux/time.lua` 1-125 (whole); `files/lua_api/openmw/async.lua` 1-77 (whole); `files/data/scripts/omw/activationhandlers.lua` 10-20; `files/data/openmw_aux/calendar.lua` 1-25; `apps/opencs/model/world/defaultgmsts.cpp` (defaults only, lines 346, 1666-1667, 1957, 2019-2020, 2310). Grep only (not read): `apps/openmw/mwmechanics/aiwander.cpp` (1018 lines; idle group names and timing hooks only). Confidence: high on the respawn gate and the timer API as read. Medium on the scene caller that decides `respawn = true` (not traced).

Half read: server (the authoritative world/Lua runtime in `apps/openmw` and `components/lua`) and the shipped Lua scripts. The Morrowind data half (.esm, .bsa, record values) is not in the box, so no game data value is known. No paired data donor exists in this batch.

Verdict: STRONG for scheduling and respawn-on-entry. NOT FOUND for invasions and roaming bosses: a search of `apps/openmw/mwmechanics`, `apps/openmw/mwworld` and `files/data/scripts` for invasion, roam, wander and patrol only hit the ordinary Wander AI package (`aiwander.cpp`) and pathing code.

## 1. What the player sees and feels

A camp you cleared stays cleared while you stay away, and it comes back quietly the next time you walk into that cell after a long enough gap. Nothing is announced and nothing counts down on screen. The refresh is decided on entry, not while you watch. Corpses disappear after a delay, so the room tidies itself without a message. Small timed beats exist too: a door the script disables is reopened after five seconds of simulation time. On a 375-wide phone the world reads as stable and remembered, not as a ticking event system.

## 2. Why it works or is striking

- Readable: a respawned creature goes back to its original placement point (`creature.cpp` 818-840, "Reset to original position"), so a returning camp looks the same as before.
- One signature behaviour: respawn is lazy. One timestamp per cell (`mLastRespawn`, saved with the cell state, `cellstore.cpp` 1001 and 1012) decides the whole cell at once, not one timer per creature.
- One signature sound: not read (the door open sound is record data played at `activationhandlers.lua` line 13).
- Could be made ours at 20-30 percent resemblance: "the zone refreshes on re-entry after a gap, measured in server time, with one stamp per zone".

## 3. The rule behind it

**A. Cell respawn (lazy, on load).** When a cell is loaded and `respawn` is requested (`scene.cpp` 496-497), `CellStore::respawn()` checks `now - mLastRespawn > 24 * 30 * iMonthsToRespawn` (`cellstore.cpp` 1229; units are in-game hours, `timestamp.hpp` says hour and day). If the gate passes, it stamps `mLastRespawn = now`, then for each creature, NPC and levelled list with custom state it: clears the corpse if the corpse clear delay has passed (`cellstore.cpp` 1151-1157, `now >= timeOfDeath + fCorpseClearDelay`), and calls `respawn`. A creature that is still alive, or still in its death animation, is left alone (`creature.cpp` 804-808). A dead creature with the Respawn flag comes back at its original position once `timeOfDeath + delay <= now` (`creature.cpp` 818-819). The delay is `min(fCorpseRespawnDelay, fCorpseClearDelay)` while the placement still has a count, and `fCorpseClearDelay` when its count is zero (`creature.cpp` 815-816).

**B. Timer runtime (per script, three clocks).** Scripts ask for a timer on one of three clocks: simulation time, game time or real time (`asyncpackage.cpp` 76-100). Timers are kept in a min-heap per clock (`scriptscontainer.cpp` 699-703, and `operator<` inverted at `scriptscontainer.hpp` 286). Each frame, `processTimers` fires every due timer in order (`scriptscontainer.cpp` 781-789; `updateTimerQueue` loops while the front is due, lines 770-778). A timer is either serializable (stores the callback name and an argument, survives save and load) or unsavable (lost on save and load, `async.lua` line 47). Real-time timers run while the game is paused (`time.lua` line 55).

**C. Repeating timers that do not drift (`time.runRepeatedly`).** The first call is delayed by a random amount in `[0, period)` when no initial delay is given (`time.lua` line 96), which spreads load across scripts. Each next delay is `1.5 * period - fmod(now - base + period/2, period)` (`time.lua` line 117). This always lands on the grid `base + k * period` nearest to now, so a late call catches up to the grid and does not stack up. Stopping is a flag (`breakFlag`), and the scheduled callback still fires once and exits.

**D. Per-script cost tracking.** Each script keeps a decayed average of its instruction count, with coefficient 1/30 per frame (`scriptscontainer.cpp` 791), and folds the frames a script sat out into one power (lines 793-800). The enforcement step that acts on this number was not read.

**Data fields (designer-tunable; donor values null because this is GPL code, values here are editor defaults, not game data).**

| name | unit | donor_value_or_null |
|---|---|---|
| respawn_gate_days | days (donor is 24 h x 30 x months) | null (editor default 4 months, `defaultgmsts.cpp` 1957) |
| corpse_clear_h | hours | null (editor default 72, `defaultgmsts.cpp` 1666) |
| corpse_respawn_h | hours | null (editor default 72, `defaultgmsts.cpp` 1667) |
| respawn_flag | bool per placement | null |
| timer_clock | enum: sim, game, real | null |
| timer_savable | bool | null |
| timer_delay_s | seconds | null |
| repeat_period_s | seconds | null |
| initial_delay_s | seconds, default random in [0, period) | null |

## 4. For Frankendom

- Zones as data: `respawn_gate_days` and the corpse delays are zone fields, read on zone entry. Keep: lazy decision on entry, one stamp per zone instance, restore to the original spawn point, and savable timers only. Change: the clock is the server clock, not in-game hours.
- Server-verified: the server decides the respawn on the zone-entry event and sends the refreshed roster; the client only presents it. This is row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer), not the fight loop.
- The per-script cost average maps to the server tick sub-line "per-tick NPC budget" (row 18 / post-K item 3). Keep the idea (a decayed average per zone script), no code reuse.
- Many-on-one, invasions and roaming bosses: not in this donor. Nothing to take.
- Target file: `origins/server/world-spawns.ts` (row 23). No `src/fight/` module, because the respawn gate is zone-layer logic. The repo is not on this box, so the module is not checked.

## 5. Five-minute look test on a phone

Make one test zone with a three-creature camp. Kill the camp, walk out of the zone, and set the respawn gate to 90 seconds of server time. Walk back in after 10 seconds, then after 100 seconds. Dom compares: the camp is still gone at 10 s and back at the same spots at 100 s, with no message. Judge whether the return reads as the world moving on or as a cheat. Then try a second gate of 20 seconds to see if it feels too fast.

## 6. Licence and IP

Code is GPL-3.0. Clean-room, shape only: no code, names or strings copied. The respawn gate, the timer clocks and the 1.5x repeat formula are described in our own words. Morrowind content is not in the box and is not used. Editor-default numbers are listed as null donor values because the source is GPL.

## 7. Gaps

- Not traced: which caller sets `respawn = true` in `Scene::loadCell`, and under what conditions (`scene.cpp` 427-497 read only at the call site).
- Not read: `mwworld` time advance and `worldimp.cpp` time handling; `mwmechanics` creature-list spawning; the calendar month table (`openmw_aux/calendarconfig.lua`); the budget enforcement (what happens when a script is over budget).
- Grep only: `apps/openmw/mwmechanics/aiwander.cpp` (1018 lines). Idle animation group names read (`idle2` to `idle9`, lines 34-42); the wander package timing (duration, distance, time of day, repeat, idle chance) was not read in full. This is the idle and ambient vocabulary; treat it as a gap.
- Not in the box: Morrowind data (.esm, .bsa, records, cells), so no respawn values and no real camp layouts.
- Death and respawn presentation (what the screen shows when a creature returns), loot reveal, walk density per 20 s, and readability at 375 wide: not read or not present in this donor.
- Half read: server (engine and Lua runtime). Client-side camera and UI scripts were not read for this topic.

Reuse tag: keep-idea (lazy respawn on entry; savable named timers; grid-snapped repeat). No code reused (GPL).
Brief rule served: the world stays put, refreshes quietly on re-entry, and the timers survive a save.
