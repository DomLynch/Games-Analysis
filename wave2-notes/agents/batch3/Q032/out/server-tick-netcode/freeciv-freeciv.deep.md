# freeciv-freeciv (server-tick-netcode, cell 3)

Donor: `/mnt/frankendom-donors/freeciv-freeciv/server/gamehand.c` (update_timeout 988-1029; enemy-move extension 1039-1050) with `server/srv_main.c` (begin_phase timer 1423-1428; end_turn 1609; phase loop 3046-3067), `server/sernet.c` (server_sniff_all_input 522; deadline checks 734-743 and 928-934), `common/game.c` (current_turn_timeout 858-865), `server/stdinhand.c` (timeout command 1647-1687), `server/unittools.c` (enemy-move hook 4187-4200) | Licence: GPL-2.0-or-later (gamehand.c 4-5: "either version 2, or (at your option)"; COPYING line 2: "Version 2, June 1991") | C | symbol `update_timeout` (with `current_turn_timeout`, `increase_timeout_because_unit_moved`, `server_sniff_all_input`)

Checked: confidence moderate-high on the timer rules; moderate on whether this is a server tick at all. Read in full: gamehand.c 978-1050, common/game.c 855-865, stdinhand.c 1647-1687, unittools.c 4185-4201. Read in part: sernet.c 682-743 (the idle wait and first deadline check) and 896-935 (the second check, inside the same function; its other paths were not read), srv_main.c 1264-1428 (phase start, partly), 1609-1625 (head of end_turn), 2941-2990 and 3040-3100 (the phase loop). Callers: `update_timeout` has one caller, end_turn (srv_main 1865), and end_turn runs once per turn (srv_main 3084). `increase_timeout_because_unit_moved` has one caller (unittools.c 4200). I ran the schedule and deadline logic of the sketch on the VPS (compiled with tsc, run with node): the output is in section 1, the run is of the sketch, not of freeciv. Not read: the other return values of server_sniff_all_input, the timer implementation behind timer_read_seconds, and how a phase ends early when all players are done. Why it is a judgement call: the donor has no fixed simulation step; its "tick" is a one-second idle wait (sernet.c 690-691). The rule I am writing up is the turn timer, not a tick loop. If Strategy reads cell 5 strictly as a tick loop, this is PARTIAL. camera_scope: not applicable.

Best transferable idea: A round or hold timer that only ever moves later on activity (with a minimum extension), plus a schedule that adds a growing increment every N rounds with a hard cap that switches the schedule off.
Decision (proposed): adapt — take the extend-only deadline and the capped escalation schedule as zone data; reject the turn and phase model, since our fight runs on ticks and the donor's deadline is in wall-clock seconds, which cell 2's stall rule makes wrong for a fight.
Acceptance: a fight test gives a round timer with base 60 s and +30 s every 2 rounds the values 60, 90, 90, 120, 120 s for rounds 2 to 6, and clamps and switches off at the maximum; a zone test (row 23 use) pushes a 20 s grace timer to now plus 20 s whenever a player is seen inside coverage, never earlier, and despawns the zone once it expires with no one seen.

## 1. Mechanism

- Phase deadline. At the start of each phase the server sets `game.tinfo.seconds_to_phasedone` to `current_turn_timeout()` and renews and starts the phase timer (srv_main 1423-1428). `current_turn_timeout()` returns `first_timeout` for turn 1 when that is not -1, and otherwise `timeout` (common/game.c 858-865, lines 860-863). A timeout of 0 means no timer.
- Expiry check. The server waits in `server_sniff_all_input` (sernet.c 522). The select wait uses a one-second timeout (690-691; read, too short to receipt). If the timeout is -1 (auto games) it does not wait (682-687). On an idle second (729-743), if `current_turn_timeout() > 0` and `timer_read_seconds(phase_timer) + additional_phase_seconds > seconds_to_phasedone`, it returns S_E_END_OF_TURN_TIMEOUT (734-742). The same test runs again after the packet handling (928-934). The phase loop calls `server_sniff_all_input()` until it returns something other than S_E_OTHERWISE (srv_main 3046-3048), then calls `end_phase()` (3067).
- Escalation (`update_timeout`, gamehand.c 988-1029), called once per turn from end_turn (srv_main 1865). It does nothing if the timeout is below 1 or `timeoutint` is 0 (991-993). Otherwise, on each call: if `timeoutcounter >= timeoutint`, then `timeout += timeoutinc`, `timeoutinc *= timeoutincmult`, `timeoutcounter = 1`, and `timeoutint += timeoutintinc` (995-1000); if not, `timeoutcounter++` (1018). Limits: above GAME_MAX_TIMEOUT (8639999 s) the timeout is set to the maximum and both `timeoutint` and `timeoutinc` are set to 0, which turns the schedule off (1002-1009); below 0 it is set to 0 (1010-1016). The schedule is set by the timeout command: its four arguments go to `timeoutint`, `timeoutintinc`, `timeoutinc` and `timeoutincmult` in that order (stdinhand.c 1647-1657), and any change resets `timeoutcounter` to 1 (1684).
- Worked example (from the VPS run of the sketch): base timeout 60 s, add 30 s every 2 turns, multiplier 1, interval increase 0. The timeouts for turns 2 to 6 come out as 60, 90, 90, 120, 120 s. The counter starts at 1, so the first increase lands on the second call after the change.
- Extension on enemy activity. The hook is gated by a turn timeout that is not 0 and the setting being above 0 (unittools.c 4182). When a unit moves, the owner is `pplayer` and each connected enemy at war with it is checked for `can_see_move` on that move (4187-4197), which sets `new_information_for_enemy`; the hook then calls `increase_timeout_because_unit_moved` (4199-4200). That function (gamehand.c 1039-1050) does nothing unless the turn timeout is above 0 and `timeoutaddenemymove` is above 0. Otherwise it sets `maxsec = elapsed + timeoutaddenemymove` and raises the deadline to that value if it is later than the current one, then sends the game info (1041-1048). It never moves the deadline earlier. The setting text says the remaining timeout is "increased to this value" (settings.c 3002-3003).
- Dead term. `additional_phase_seconds` (game.h 219) is added to the elapsed time in both deadline checks (sernet.c 738, 932) and subtracted in the game info (gamehand.c 932). In this donor nothing sets it except a save-file load (savegame3.c 2120) and the reset after each phase (srv_main 3074). So in normal play it is always 0.

## 2. Key functions

- Escalation: `/mnt/frankendom-donors/freeciv-freeciv/server/gamehand.c` 988-1029 (`update_timeout`).
- Enemy-move extension: `/mnt/frankendom-donors/freeciv-freeciv/server/gamehand.c` 1039-1050 (`increase_timeout_because_unit_moved`), caller `/mnt/frankendom-donors/freeciv-freeciv/server/unittools.c` 4187-4200.
- Turn-1 override: `/mnt/frankendom-donors/freeciv-freeciv/common/game.c` 858-865 (`current_turn_timeout`).
- Deadline set and expiry: `/mnt/frankendom-donors/freeciv-freeciv/server/srv_main.c` 1423-1428 (start), `/mnt/frankendom-donors/freeciv-freeciv/server/sernet.c` 729-743 and 928-934 (check).
- Schedule setter: `/mnt/frankendom-donors/freeciv-freeciv/server/stdinhand.c` 1647-1687 (`timeout_command`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Add an increment to a round or hold timer every N rounds | Interval N = timeoutint, increment = timeoutinc; both set by command, default 0 (off) (theirs, game.h 602-603; gamehand.c 991) |
| The increment and the interval grow by a fixed rule | timeoutincmult, default 1 (theirs, game.h 605); timeoutintinc, default 0 (theirs, game.h 603) |
| Hard cap that also switches the schedule off | GAME_MAX_TIMEOUT 8639999 seconds (theirs, game.h 614; gamehand.c 1002-1009) |
| Round 1 has its own timer | first_timeout default -1 = not special (theirs, game.h 601) |
| Deadline extended by activity, never shortened | timeaddenemymove default 0 = off (theirs, game.h 606 GAME_DEFAULT_TIMEOUTADDEMOVE; game.c 424); the extension itself is elapsed plus this value (gamehand.c 1042-1043) |
| Idle poll interval | 1 second select wait (theirs, sernet.c 690-691; read, not receipted) |

## 4. TypeScript sketch

simplified: keeps the donor's order and rules: the schedule fires when the counter reaches the interval, adds the increment, multiplies it, restarts the counter and grows the interval; it clamps to the maximum and switches the schedule off there; a deadline moves only later, and only when activity is seen and the setting is on; the expiry test is elapsed greater than the deadline, with the same zero-means-off checks. It omits the donor's additional_phase_seconds term (dead in practice), the client game-info sends, the phase and turn structure (phase loop, end_phase, begin_turn), the first-turn override (current_turn_timeout), the wall-clock source (the caller supplies elapsed seconds), the packet and connection handling in the donor's sniff loop, and the console command. It checks the schedule and the deadline on each call as the caller invokes it; the donor calls the schedule once per turn and the deadline check on idle seconds and after packets. The sketch was compiled and run on the VPS: it gives 60 90 90 120 120 for the example in section 1, a clamp at 8639999 with the schedule switched off, a deadline unchanged by an activity 10 s in with a 20 s minimum (deadline stays 50), moved to 65 when activity is seen at 45 s, expiry false at 64 s and true at 66 s, and no change with the schedule off.

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch of the mechanism, not a translation of the donor code.
export const MAX_TIMEOUT_SEC = 8_639_999; // engine constant: longest allowed turn timeout

export interface Escalation {
  timeoutSec: number;    // current turn timeout in seconds; 0 means no timer
  incSec: number;        // added to timeoutSec each time the schedule fires
  incMult: number;       // incSec is multiplied by this after each firing
  everyTurns: number;    // fire every N turns; 0 disables the schedule
  everyTurnsInc: number; // after each firing, everyTurns grows by this
  counter: number;       // turns since the last firing; 1 right after a change
}

// Called once at the end of each turn. Returns the timeout for the next turn.
export function updateTimeout(e: Escalation): number {
  if (e.timeoutSec < 1 || e.everyTurns === 0) return e.timeoutSec;
  if (e.counter >= e.everyTurns) {
    e.timeoutSec += e.incSec;
    e.incSec *= e.incMult;
    e.counter = 1;
    e.everyTurns += e.everyTurnsInc;
    if (e.timeoutSec > MAX_TIMEOUT_SEC) {
      e.timeoutSec = MAX_TIMEOUT_SEC;
      e.everyTurns = 0;
      e.incSec = 0;
    } else if (e.timeoutSec < 0) {
      e.timeoutSec = 0;
    }
  } else {
    e.counter++;
  }
  return e.timeoutSec;
}

// The phase deadline is an absolute time (seconds since phase start). It only moves later.
export interface PhaseClock {
  elapsedSec: number;  // wall seconds since the phase started (the caller advances it)
  deadlineSec: number; // phase ends when elapsedSec passes this
}

// An enemy in sight moved: the deadline becomes at least `minSec` from now (never earlier).
export function onEnemyMoveSeen(p: PhaseClock, turnTimeoutSec: number, minSec: number): void {
  if (turnTimeoutSec <= 0 || minSec <= 0) return;
  const want = p.elapsedSec + minSec;
  if (want > p.deadlineSec) p.deadlineSec = want;
}

// The caller checks this on each idle second and after each batch of input.
export function phaseExpired(turnTimeoutSec: number, p: PhaseClock): boolean {
  return turnTimeoutSec > 0 && p.deadlineSec > 0 && p.elapsedSec > p.deadlineSec;
}
```

## 5. Lands in

- TARGET `src/fight/timers.ts` (new module: round and hold timers with an escalation schedule, a deadline that extends on activity and never shortens, and an expiry check). Parity-checklist row 18, post-K item 3 sub-line "server tick: fixed step, input intake, per-tick NPC budget". The donor covers the timer half of that sub-line; it has no fixed step and no per-tick budget.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room, shape only; no donor line copied)
- Brief rule served: rule 1 (one engine: timers live in the engine, not in each zone); server-verified kills and one ledger (the deadline is decided on the server, not on the client)
- Decision (proposed): adapt. Take the extend-only deadline on activity, the escalation schedule with its cap and off switch, and the rule that a timer's inputs are data. Reject the turn and phase model: our fight runs on ticks, with no turn end and no phase loop, and the donor's deadline is in wall-clock seconds, which our stall rule (cell 2) would make wrong. Why: a round timer that grows when the fight goes on, and a grace timer that extends while a player is in sight, are both rules a fast fight or zone needs; the turn machinery is not.
- Acceptance: a fight test: a round timer with base 60 s, adding 30 s every 2 rounds, gives rounds 2 to 6 the values 60, 90, 90, 120, 120 s, and clamps and switches off at the maximum. A zone test (row 23 use): a grace timer of 20 s on an empty zone is pushed to now plus 20 s whenever a player is seen inside coverage, is never pushed earlier, and the zone despawns once it expires with no one seen.

## 6. Gaps and risks

- No tick. The donor's loop is a one-second idle wait over turns. The row-18 tick sub-line (fixed step, input intake, per-tick budget) is still unsourced by this donor.
- Wall-clock time. The deadline is in real seconds (`timer_read_seconds`, implementation not read). A server hitch makes the phase end early, because elapsed time jumps. Our round timers must count tics. Cell 2's stall rule (lost time is forgotten) gives the tick count; do not use wall seconds for a fight timer.
- Activity extension has no limit in the donor. Only the escalation has a cap (8639999 s). A grace timer that extends every time a player moves in sight can be held open indefinitely. Frankendom needs a cap on total extension, or on extensions per timer, before it copies the rule.
- The donor's `additional_phase_seconds` term is never set in normal play (game.h 219; sernet.c 738, 932; gamehand.c 932; srv_main.c 3074; savegame3.c 2120). Do not copy a term that nothing sets.
- The escalation is set by a console command (stdinhand.c 1647-1687), not by a data file. In Frankendom the schedule is zone data (a field in the zone definition), not a command.
- Zone mapping (row 23, not a tick): the same extend-only rule fits the zone despawn grace timer (origins/server/world-spawns.ts). That is a use of this rule, not something this donor implements.
- Unread: the remaining return values of server_sniff_all_input (and which events end a phase early), the timer implementation, the client turn-done path, and any other callers of begin_phase and end_phase. The rules above describe the server timer only.
- GPL-2.0-or-later: clean-room, shape only. The sketch was written from the mechanism.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room, shape only)
Brief rule served: rule 1 (one engine); server-verified deadlines; one ledger
