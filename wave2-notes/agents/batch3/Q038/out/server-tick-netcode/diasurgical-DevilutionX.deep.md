# diasurgical-DevilutionX (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/nthread.cpp` (with `diablo.cpp`, `multi.cpp`, `gamemenu.cpp`) | Licence: Sustainable Use License 1.0 (repo `LICENSE.md`: use, copy and modify for internal business or non-commercial/personal use, and distribute free of charge for non-commercial purposes; the file `nthread.cpp` has no per-file licence header) | C++ | symbol `nthread_has_500ms_passed` (the tick clock; the name is misleading, see section 1)

Checked: Read in full: `nthread.cpp` (1-262: turn send and receive, the due-time check, catch-up reset, rate setup, render fraction). Read in part: `diablo.cpp` (912-960 main loop, 3490-3507 `game_loop`, 146 `gnTickDelay`), `multi.cpp` (225-231 `MonsterSeeds`, 249-260 `ParseTurn`, 323-330 `CheckDropPlayer`, 332-352 `BeginTimeout`, 665-673, 688-727 `multi_handle_delta`, 846-882 game start), `msg.cpp` (415-540 packet buffers and parse; 2722-2742 the rejoin resync wait). Not read: the storm/provider code that fills the turn buffers (`SNetReceiveTurns`, `SNetSendTurn`), `GameLogic`, `multi_net_ping`'s caller (diablo.cpp 1576), `engine/animationinfo.cpp` (only the grep lines). The hinted file `msg.cpp` is the message buffer and parse layer; the tick clock is in `nthread.cpp`. Confidence: high on the tick clock, the per-call cap, the catch-up rule and the timeouts (all read end to end); medium on the exchange cadence (I read `nthread_recv_turns` in full but not the provider it calls). This is not a camera topic.

Best transferable idea: Advance the tick clock by one fixed step per tick, not to the current time, and cap ticks per loop call; when far behind with nobody else connected, drop the backlog instead of bursting.
Decision (proposed): adapt — keep the due-time clock, per-call cap, bounded catch-up and render fraction; reject the stop-the-world wait and end-of-game on silence, because one slow fighter must not freeze a fight with up to MAX_ATTACKERS = 3.
Acceptance: Server test: with 24 ticks of backlog (1.2 s at 50 ms) and a second fighter connected, one call runs exactly three ticks and the rest drain over later calls; with the other fighter gone, the next call runs exactly one tick and the backlog is not replayed.

## 1. Mechanism

- Shape: lockstep with a fixed tick. Every player runs the same game logic, and the turn messages say when each player's inputs for a tick are ready. Turn numbers, not commands, are the timing signal; the commands travel in the message buffers (msg.cpp).
- Tick clock (nthread.cpp 214-244): `last_tick` is a due time, not a last-seen timestamp. `ticksElapsed = now - last_tick` (216-217). Before that, if the clock is more than 10 ticks behind (`ticksElapsed > gnTickDelay * 10`, 219), it resets `last_tick = now` only when no other player is connected (223-233). With others connected it keeps the schedule so they stay in step. A tick is due when `ticksElapsed >= 0` (243). It also sets `drawGame = ticksElapsed <= gnTickDelay` (241): frames are skipped when more than one tick behind.
- Name mismatch: the function is called `nthread_has_500ms_passed`, but it compares against `gnTickDelay`, which defaults to 50 ms (diablo.cpp 146). The tick length is `1000 / nTickRate` (multi.cpp 879), and the option slider runs from 20 to 50 ticks per second (gamemenu.cpp 177), so 50 ms down to 20 ms per tick.
- Main loop (diablo.cpp 923-944): if a tick is due, `ProcessGameMessagePackets()` runs (942), then `game_loop` (944). If not, it processes input and network packets and maybe draws (931-939).
- `game_loop` (diablo.cpp 3490-3507): it runs up to `wait` steps. `wait` is `nTickRate * 3` at startup and 3 otherwise (3492). Each step calls `multi_handle_delta()` first (3495); if that returns false, the loop stops and waits. Then `GameLogic()` (3500). The loop continues only while another tick is due (3503).
- `multi_handle_delta` (multi.cpp 688-727): sends this player's turn (702), then `nthread_recv_turns(&received)` (704). If that fails, it arms the timeout and returns false (705-706). On success it shares high-priority messages (710-723), then calls `MonsterSeeds()` (724).
- Exchange cadence (`nthread_recv_turns`, nthread.cpp 105-138): each step decrements a poll countdown (109). When it runs out, it resets to `sgbNetUpdateRate` (115). Only every fourth poll does a real receive (116-122, sync countdown set to 4 at 132). Between polls the schedule just advances by one tick (110-113, 119, 136). A failed receive sets the countdowns to 1 and returns false (123-127), which stalls the step.
- Rate setup (`nthread_start`, nthread.cpp 145-187): `sgbNetUpdateRate = 20 / defaultturnssec` when the provider reports 20 or fewer turns per second (161-164), else 1. It is doubled until the per-player message is at least 0x80 bytes (169-178). `gdwTurnsInTransit` is the provider default, minimum 1 (158-160), and bounds how many turns are sent ahead (`nthread_send_and_recv_turn`, 87).
- Turn arrival re-bases the counter: `ParseTurn` (multi.cpp 249-260) moves the local counter forward only when the incoming turn is ahead of what was sent (254), and then sets `sgdwGameLoops = 4 * absTurns * sgbNetUpdateRate` (258).
- Shared AI seed: `MonsterSeeds` (multi.cpp 225-231) increments `sgdwGameLoops` (227), derives a seed from it (228), and gives each monster `seed + index` (230). It runs after every successful step (724), so every peer's monster AI draws from the same seed sequence.
- Stall and timeout (multi.cpp 332-352): if the timeout is armed, after 10 s without turns the code drops connected players that are not active (`CheckDropPlayer`, 344-352; the drop rule is at 326-328). After 20 s it sets `gbRunGame = false` and the game stops (344-346). The timeout is armed by `multi_net_ping` (682-686); its caller was not read.
- Render interpolation: `nthread_UpdateProgressToNextGameTick` (nthread.cpp 246-260) gives the fraction of the way to the next tick (256-258), clamped to 0..1 (258), for animation (not read in detail).

## 2. Key functions

- `nthread_has_500ms_passed`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/nthread.cpp` 214-244. Due check, catch-up reset (alone only), draw skip. The tick clock.
- `nthread_recv_turns`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/nthread.cpp` 105-138. Poll countdown, full receive every fourth poll, stall on failure.
- `game_loop`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/diablo.cpp` 3490-3507. Per-call step cap (3, or 3 times the tick rate at startup) and the due re-check.
- `multi_handle_delta`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/multi.cpp` 688-727. One step: send, receive, stall-or-continue, monster seeds.
- `BeginTimeout`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/multi.cpp` 332-352. The 10 s drop and 20 s stop.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Due-time clock advanced by one fixed step per tick (not set to now) | Tick length `1000 / nTickRate`; default 50 ms (theirs, diablo.cpp 146; multi.cpp 879) |
| Cap on steps per loop call | 3 per call (theirs, diablo.cpp 3492); 3 times the tick rate at startup (3492) |
| Bounded catch-up: drop a backlog longer than N ticks, only when alone | N = 10 ticks (theirs, nthread.cpp 219); reset only when no other player is connected (223-233) |
| Skip drawing when more than one tick behind | `ticksElapsed <= gnTickDelay` (theirs, nthread.cpp 241) |
| Poll every few steps, full exchange every fourth poll | Poll interval `sgbNetUpdateRate`, from `20 / defaultturnssec` (theirs, nthread.cpp 162), doubled until the message is 0x80 bytes (175); fourth poll (132) |
| Pipeline depth | Provider default, minimum 1 (theirs, nthread.cpp 158-160) |
| Silence timeout | Drop at 10 s (theirs, multi.cpp 348-352); end at 20 s (344) |
| Shared AI seed from a step counter | `counter + index` (theirs, multi.cpp 228-230) |

## 4. TypeScript sketch

simplified: keeps the due-time clock advanced by one fixed step, the cap of three ticks per call, the bounded catch-up that drops a backlog only when no other player is connected, the rule that a tick which cannot run stops the call, and the render fraction. It omits the donor's lockstep wait (the donor stops when turn data is missing; the server never waits, so the sketch's `onTick` always returns true on the server path), the turn send and receive, the poll and full-exchange countdowns, the pipeline depth, the 10 s drop and 20 s stop, the shared AI seed, and the high-priority message sharing. The donor checks "due" again after each step through a separate call; the sketch checks before each step, which gives the same result when the call is made only when a tick is due. The 3-ticks cap is the donor's non-startup value.

```ts
// Licence: Sustainable Use License 1.0 (donor repo LICENSE.md; restricted). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const TICK_MS = 50;            // tick length (= 1000 / tick rate; 50 ms default)
const MAX_TICKS_PER_CALL = 3;  // ticks run per call of the loop, outside startup
const RESET_AFTER_TICKS = 10;  // a backlog longer than this is dropped when nobody else is connected

class TickClock {
  private last: number;        // due time of the next tick, ms

  constructor(now: number) {
    this.last = now;
  }

  // Run the ticks that are due in this call. Returns how many ran.
  run(now: number, playersConnected: number, onTick: () => boolean): number {
    let ran = 0;
    while (ran < MAX_TICKS_PER_CALL) {
      let elapsed = now - this.last;
      if (elapsed > RESET_AFTER_TICKS * TICK_MS && playersConnected <= 1) {
        this.last = now;      // alone: drop the backlog instead of bursting
        elapsed = 0;
      }
      if (elapsed < 0) break; // not due yet
      this.last += TICK_MS;   // the schedule moves by one step, not to 'now'
      ran++;
      if (!onTick()) break;   // a tick that cannot run (missing input) stops the call
    }
    return ran;
  }

  // 0..1 progress toward the next tick, used for render interpolation only.
  fraction(now: number): number {
    const missing = this.last - now;
    if (missing <= 0) return 1;
    return Math.min(1, Math.max(0, (TICK_MS - missing) / TICK_MS));
  }
}
```

## 5. Lands in

- TARGET `src/fight/tick.ts` (engine tick scheduler, same module as the input and fixed-step work from the 0 A.D. note). The clock lives on the server; clients use the fraction only for interpolation.
- Parity-checklist row 18 (loot roll and XP award), sub-line post-K item 3 "server tick: fixed step, input intake, per-tick NPC budget". The cap of three ticks per call and the catch-up rule are the per-tick budget part of that sub-line.
- today: current Frankendom server tick location (not read).
- Decision (proposed): adapt. Keep the due-time clock, the per-call cap, the bounded catch-up and the render fraction. Reject the stop-the-world wait and the end-of-game on silence; a silent fighter should be marked absent and the fight resolved by the server ledger, not the whole game stopped.
- Acceptance: a server test in which 24 ticks of backlog (1.2 s at 50 ms) exist and a second fighter is connected: one call runs exactly three ticks and the rest drain over later calls. With the other fighter gone, the next call runs exactly one tick and the backlog is not replayed.
- Reuse tag: rewrite-from-idea (Sustainable Use License 1.0; clean-room only, shape only)
- Brief rule served: 1 (one engine: one tick clock for the fight); server-verified kills (the donor's clients run the game, so the donor does not verify kills; see section 6).

## 6. Gaps and risks

- Authority model: as in the 0 A.D. note, the donor's peers run the same logic and the server does not verify kills. We take the clock and the cap, not the lockstep.
- Stop-the-world: `multi_handle_delta` returns false when turns are missing (multi.cpp 704-706), and `game_loop` then stops (diablo.cpp 3495-3497). Copied as is, one slow connection freezes both fighters and every attacker, MAX_ATTACKERS = 3 included. Reject.
- End on silence: after 20 s the donor sets `gbRunGame = false` (multi.cpp 344-346). A fight should resolve through the ledger, not end the game. Reject the end; adapt the drop to "absent" state.
- Drop rule: `CheckDropPlayer` drops every connected player that is not active (multi.cpp 326-328), which is a connection-state rule, not a play rule. Frankendom should key absence on the fight's own tick count, in one ledger.
- Name: `nthread_has_500ms_passed` is misnamed (checks `gnTickDelay`, 50 ms default). Do not copy the name.
- Catch-up is per call and capped at three ticks, but the donor's game logic cost per tick is not measured. The per-tick NPC budget (post-K item 3) must cap work per tick, not per call.
- The donor's reset applies only when no other player is connected (nthread.cpp 223-233). A server with two fighters keeps the backlog, so a long stall means a long burst of catch-up calls. We need the budget cap to hold during that burst.
- Shared AI seed (multi.cpp 225-231) is a lockstep requirement. Frankendom's server runs the AI, so the seed is not needed for correctness; it is useful only for replay (row 19).
- Sustainable Use License 1.0: restricted. Clean-room only; no donor lines are copied.
- Not read: the provider code that moves turns (`SNetReceiveTurns`, `SNetSendTurn`), `GameLogic`, `multi_net_ping`'s caller, and `animationinfo.cpp` beyond the grep.
