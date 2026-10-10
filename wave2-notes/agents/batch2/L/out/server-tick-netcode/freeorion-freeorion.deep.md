# freeorion-freeorion (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/freeorion-freeorion/server/ServerFSM.cpp` + `/mnt/frankendom-donors/freeorion-freeorion/server/ServerApp.cpp` | Licence: GPL v2 for source code (per README.md line 148: "source code is licensed under the terms of [GPL v2]"; the file default/COPYING is the licence text it points to; the .cpp files carry no per-file header, not checked beyond that) | C++ | symbol `ServerApp::AllOrdersReceived` and `WaitingForTurnEnd::react(CheckTurnEndConditions)`

Checked: Read in full: `AllOrdersReceived` (2142-2166), `WaitingForTurnEnd::react(TurnOrders)` (3198-3313), `react(CheckTurnEndConditions)` (3489-3510), `ProcessingTurn::react(ProcessTurn)` (about 3600-3630), `TurnTimedoutHandler` (3119-3141), the `PlayingGame` and `WaitingForTurnEnd` constructors that arm the timer (2625-2655, 3150-3195), and `PreCombatProcessTurns` / `ProcessCombats` / `PostCombatProcessTurns` skimmed top to bottom for phase order only. Not read: the insides of `HandleFleetMovement`, `AutoResolveCombat`, `ApplyAllEffectsAndUpdateMeters`, the AI client processes, and the network layer (`ServerNetworking.cpp`). Confidence: high on the turn-gate and timer; this is NOT a fixed-step real-time tick. I `grep`-checked the callers: `AllOrdersReceived` has exactly one caller (ServerFSM.cpp 3499); `CheckTurnEndConditions` is posted from orders received (3312), a player concede/disconnect (3013) and an AutoTurn request from a player (3072), plus the timer (3140).

## 1. Mechanism

- FreeOrion is a turn-based 4X game. The server has no fixed-step loop and no accumulator: it advances one whole "turn" at a time, and the only clock is an optional turn deadline timer (Boost.Asio timer, `network.server.turn-timeout.max-interval`, default 0 = no timer, dmain.cpp 129). The loop that drives the code is a state machine (Boost.Statechart): state `WaitingForTurnEnd` collects orders, state `ProcessingTurn` runs the turn, then control returns to `WaitingForTurnEnd`.
- Input intake (`react(TurnOrders)`): the order set from one player is checked (observers, invalid types ignored; a moderator ends the turn outright; an eliminated empire is refused). If any order names a different empire than the sender controls, the whole set is rejected (3273). Otherwise the orders are stored, the empire is marked `SetReady(true)` (3289), its auto-turn counter is zeroed, everyone is told, and `CheckTurnEndConditions` is posted (3312). Partial orders (`UpdatePartialOrders`, 2121-2135) erase deleted ids and insert added ones but do NOT mark ready.
- The turn-end gate (`react(CheckTurnEndConditions)`, 3489): if a moderator is present, do nothing (the moderator decides). Otherwise advance when `AllOrdersReceived()` AND (turn expired OR fixed-interval mode is off) (3499-3501). So with fixed-interval off the turn advances the moment everyone is in; with fixed-interval on, it waits for the deadline even if everyone is in.
- `AllOrdersReceived` (2142-2166): for each seat: skip invalid or eliminated; if `Ready()`, fine. If not ready: when the turn is expired AND the seat is not an AI, it is skipped (counted as done); otherwise the answer becomes false. So after the deadline humans are dropped from the wait set, but an AI that has not submitted still blocks the turn: the NPC brains are always awaited, humans are not.
- Timer (`TurnTimedoutHandler`, 3119-3141): on fire, if fixed-interval is on and max-interval > 0 and nobody has won, re-arm at previous expiry + max-interval (3132, so no drift); then `ExpireTurn()` sets the flag (1137) and the gate is re-checked via `process_event(CheckTurnEndConditions)` (3140). The timer never advances the turn itself; it only flips the flag and asks the gate. In non-fixed mode the timer is cancelled and restarted from the full interval each time `WaitingForTurnEnd` is entered (3171).
- Processing (`ProcessingTurn::react(ProcessTurn)`): AI processes are set to low OS priority (3606), then three calls in order: `PreCombatProcessTurns` (3608), `ProcessCombats` (3609), `PostCombatProcessTurns` (3610). Pre-combat: apply every empire's orders (4253), `AutoTurnSetReady` (4267), colonisation/invasion/gifting, then fleet movement (4327). Combat: assemble combat per system, `AutoResolveCombat` per system (4372). Post-combat: effects and meters (4463), supply, resource pools, queue progress, elimination check, then `++m_current_turn` (4607), then send each player a full turn update, then `m_turn_expired = false` (4711). While `ProcessingTurn` runs, a `CheckTurnEndConditions` event is discarded (3632), so the gate cannot re-enter.
- Auto-turn: `Empire::AutoTurnSetReady` (Empire.cpp 1047-1052) decrements an auto-turn counter and sets ready to `counter != 0`, so a player can pre-commit N turns of "pass".

## 2. Key functions

- `ServerApp::AllOrdersReceived`: `/mnt/frankendom-donors/freeorion-freeorion/server/ServerApp.cpp` 2142-2166. The barrier: who must have submitted. One caller (ServerFSM.cpp 3499).
- `WaitingForTurnEnd::react(const CheckTurnEndConditions&)`: `/mnt/frankendom-donors/freeorion-freeorion/server/ServerFSM.cpp` 3489-3510. The gate: all in AND (expired OR not fixed-interval) leads to `transit<ProcessingTurn>`.
- `WaitingForTurnEnd::react(const TurnOrders&)`: `/mnt/frankendom-donors/freeorion-freeorion/server/ServerFSM.cpp` 3198-3313. Intake, wrong-empire rejection, ready flag, re-check.
- `PlayingGame::TurnTimedoutHandler`: `/mnt/frankendom-donors/freeorion-freeorion/server/ServerFSM.cpp` 3119-3141. Deadline callback, re-arm at absolute time, expire flag, re-check.
- `ProcessingTurn::react(const ProcessTurn&)`: `/mnt/frankendom-donors/freeorion-freeorion/server/ServerFSM.cpp` about 3600-3630. The fixed phase order and the re-entrancy discard.
- `ServerApp::PostCombatProcessTurns`: `/mnt/frankendom-donors/freeorion-freeorion/server/ServerApp.cpp` 4428-4712. Counter increment, broadcast, clear expiry.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Barrier: advance when every living seat is ready; after a deadline, humans drop out of the wait set but NPC brains still block | `max-interval` default 0 (no timer), `fixed-interval` default false (theirs, dmain.cpp 129-130) |
| Timer only sets an "expired" flag and re-asks the gate; the gate alone decides to advance | Interval value is a server option, not hard-coded (no seconds constant in the code read) |
| Fixed-interval timer re-arms from the previous expiry (absolute schedule, no drift) | None |
| Restart the deadline each step when not fixed-interval | None |
| Rejection of a whole order set that contains an order for another seat | None |
| Events arriving during processing are dropped; fixed phase order orders, movement, combat, effects, advance | The 4X phase list itself is theirs (colonise, invade, gift, move, combat, supply, research, production) |
| Auto-turn counter: N pre-committed passes | N is player-set |

## 4. TypeScript sketch

simplified: this is a turn/step barrier, not a real-time tick. It keeps the gate rule, the NPC-always-awaited rule, the timer-sets-flag-then-asks-gate flow, the whole-set rejection and the processing guard. It omits moderators, the auto-turn counter (donor resets ready through it before processing; the sketch clears ready after the step), observers, partial orders, networking, AI process priority, elimination and save/restore. Phases are an injected callback; the donor's phase bodies are not reproduced.

```ts
// Licence: GPL v2 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Phase = "orders" | "movement" | "combat" | "effects" | "advance";

interface Seat {
  id: string;
  isNpc: boolean;     // NPC brains are always awaited; humans are skipped after the deadline
  eliminated: boolean;
  ready: boolean;
  pending: unknown[]; // orders buffered for this step
}

class StepGate {
  expired = false;
  step = 0;
  private processing = false;
  constructor(
    private seats: Map<string, Seat>,
    private deadlineMs: number, // 0 = no timer
    private fixedInterval: boolean,
    private runPhase: (p: Phase, step: number) => void,
  ) {}

  // Intake: only the seat's own orders; marks it ready, then re-checks the gate.
  submit(seatId: string, orders: { seat: string }[]): boolean {
    const s = this.seats.get(seatId);
    if (!s || s.eliminated || this.processing) return false;
    if (orders.some((o) => o.seat !== seatId)) return false; // wrong-seat orders rejected whole
    s.pending = orders;
    s.ready = true;
    this.check();
    return true;
  }

  // Timer callback: flag expiry, then re-check (the timer never advances the step itself).
  onDeadline(): void {
    this.expired = true;
    this.check();
  }

  private allIn(): boolean {
    for (const s of this.seats.values()) {
      if (s.eliminated || s.ready) continue;
      if (!s.isNpc && this.expired) continue; // humans may be skipped after the deadline
      return false;                           // an unready NPC (or a human before expiry) blocks
    }
    return true;
  }

  check(): void {
    if (this.processing) return; // events during processing are dropped
    if (this.allIn() && (this.expired || !this.fixedInterval)) this.advance();
  }

  private advance(): void {
    this.processing = true;
    try {
      for (const p of ["orders", "movement", "combat", "effects", "advance"] as Phase[]) {
        this.runPhase(p, this.step);
      }
      this.step += 1;
      for (const s of this.seats.values()) { s.ready = false; s.pending = []; }
      this.expired = false;
    } finally {
      this.processing = false;
    }
  }
}
```

## 5. Lands in

- TARGET `src/fight/net-tick.ts` (new module: server step gate; intake is row 5, the tick is row 18 / post-K item 3). Server tick: fixed step, input intake, per-tick NPC budget. This donor gives only the intake/barrier/deadline part (turn-based, so no fixed step and no per-tick budget).
- Parity-checklist row 18 (post-K item 3; intake is row 5).
- Reuse tag: rewrite-from-idea (GPL v2; clean-room only)
- Brief rule served: 1 (one engine, intents validated on the server); rules 7-9 n/a
- Best transferable idea: a step only advances through one gate function; the deadline timer merely flips an "expired" flag and re-asks the gate; after the deadline humans are skipped but NPC brains are always awaited, so a duel or zone step never runs with an unresolved NPC decision.

## 6. Gaps and risks

- GPL v2: clean-room only. The sketch is written from the mechanism, not the donor lines.
- Not a real-time tick: Frankendom's server tick needs a fixed step (for example 20 Hz) with an accumulator and per-tick NPC budget. FreeOrion has neither; the gate would run per tick or per duel round, not per "turn". Do not port the "wait for everyone" barrier into a real-time zone step; it fits only lockstep duels or round-based phases (and with one human per duel, "skip humans after deadline" becomes "apply the default action").
- "Always await NPCs" is cheap in Frankendom because NPC brains run in the same process (one engine); there is no external AI process to block on. The rule becomes "NPC decisions are computed inside the step", which removes this branch.
- Kills server-verified and one ledger: FreeOrion applies all orders then resolves combat in one pass, which matches "client sends intents, server resolves". Wrong-seat rejection is the shape to copy for intent validation; the donor rejects the whole set, a design choice Frankendom must pick on purpose.
- The donor trusts its own server process for the clock (Boost.Asio timer); Frankendom must use a server clock, never client time.
- MAX_ATTACKERS = 3 and zones-as-data are not touched by this mechanism; the timer interval should be a zone data field, as the donor makes it a server option.
- Combat insides (`AutoResolveCombat`) were not read, so nothing here says how simultaneous attackers are ordered.
