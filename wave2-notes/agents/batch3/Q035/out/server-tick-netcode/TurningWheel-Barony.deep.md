# TurningWheel-Barony (server-tick-netcode, cell 2)

Donor: `/mnt/frankendom-donors/TurningWheel-Barony/src/game.cpp` (logic clock `handleEvents` 4098-4140 and 5309-5357; server sync gate 2722-2800; frame limiter 5580-5625; main loop 7425-7447 and 8178-8195) with the send and drain in `/mnt/frankendom-donors/TurningWheel-Barony/src/net.cpp` (`sendEntityUDP` 476-568; `serverHandleMessages` 9508-9606) | Licence: BSD-2-Clause (`/mnt/frankendom-donors/TurningWheel-Barony/LICENSE.txt` lines 3 and 5: "Barony Open Source License" BSD 2-Clause, Copyright (c) 2013-2020, Turning Wheel LLC) | C++ | symbol `handleEvents`

Checked: The hint file `src/net.cpp` is right for the send and the drain, but the logic tick and the sync gate are in `game.cpp`. Read: `handleEvents` 4098-4140, 5309-5357; server sync block 2722-2812; `frameRateLimit` 5580-5625; main loop 7425-7447 and 8178-8195; `sendEntityUDP` 476-568; `serverHandleMessages` 9508-9606; `sendPacket` 119-135; `sendPacketSafe` 167-200 (outline only). Callers checked: `sendEntityUDP` has two callers, both in `game.cpp` (2795, 2799); `serverHandleMessages` has three (`game.cpp` 7443 and 8191, `init_game.cpp` 526, the last inside a commented-out block). Not read: where `UPDATENEEDED` is cleared after a send (the send loop does not clear it, see section 6), the `sendPacketSafe` retry path in full, the client side of `ENTU`, the `TIMEOUT` constants. Confidence: high on the 50 Hz clock and its cap, and on the gate arithmetic (checked by a short Python run on the donor constants, not by running the game); medium on the real frame timing (sleep accuracy not measured). Not a camera cell (the client render interpolation at `game.cpp` 586-690 is outside this cell).

Best transferable idea: a fixed 50 Hz logic clock that carries leftover time and caps catch-up steps, with dirty-entity pushes on a fixed slot gate and a reliable send per entity slot, gives a server a steady step and a bounded send rate.

Decision (proposed): adapt - keep the fixed logic clock and the dirty-push gate, but carry time under a cap and report the lost steps (the donor drops them silently), and never let a view push carry a kill: kills stay server-verified and in the one ledger.
Acceptance: a server test stalls the loop for 500 ms: the fight takes at most 5 steps in that call, reports the remainder as lost steps, and catches up by no more than 5 steps per call afterwards; a second test asserts every entity uid gets a reliable view push within 33 slots (no uid is starved).

## 1. Mechanism

- One loop runs for client and server. Each frame it does, in order: a network drain (`game.cpp` 7433-7443, budget `fpsLimit * networkTickrate` with `networkTickrate` 0 set to 2, 7433-7436); `handleEvents()` (7447); render; then the frame limiter loop (8180). `handleEvents()` reads integer milliseconds from `SDL_GetTicks()` (4105), adds the elapsed time to a carried `time_diff` (4128), and counts how many 20 ms steps fit (4130-4133, `frame = 1000 / TICKS_PER_SECOND` at 4129, with `TICKS_PER_SECOND` 50 at `game.hpp:389`).
- The count is capped at 5 per call (4137-4139). The donor subtracts every counted step from `time_diff` before the cap, so the steps beyond 5 are dropped, not carried. After a long stall the simulated time falls behind the wall clock.
- Each counted step runs `gameLogic()` and then `++ticks` (5309-5314), but only when the world is initialised and not loading (5311). `ticks` is the logic-tick counter used by every periodic rule below.
- Server sync gate (inside `gameLogic`, `multiplayer == SERVER`, 2722-2800). Every `TICKS_PER_SECOND / 8` ticks (2781; integer division gives 6), each entity with `UPDATENEEDED` set and `NOUPDATE` clear is sent to every connected client (2790-2800). The send is reliable only when `getUID() % 200 == ticks % 200` (2793; `TICKS_PER_SECOND * 4` is 200), and unreliable otherwise (2795, 2799). `sendEntityUDP` (net.cpp 476) writes the entity record and stamps it with `ticks` (531), then uses `sendPacketSafe` when `guarantee` is set (548-550) and `sendPacket` otherwise (554).
- Arithmetic of that gate (checked on the donor constants, not run in the game). The sends happen only on ticks that are multiples of 6. Since 6k is always even and 200 is even, `ticks % 200` is always even on those ticks. So an entity with an odd `uid % 200` never gets a reliable send. An even residue r is matched only on ticks t with t % 200 = r and t % 6 = 0, which repeats every 600 ticks (12 s), not every 4 s.
- Player health is a separate rule. A scheduled update is debounced 0.2 s after a request (2753). Otherwise a regular update runs every 3 s, but only when at least 2 s have passed since the last one (2759-2764). Shopkeeper state is re-sent every 15 s (2776).
- Frame limiter. `frameRateLimit(fpsLimit, true, true)` (game.cpp 5580) returns true while the frame is early, and sleeps the remaining time first (5598-5607, `preciseSleep`, only when `/timer_sleep_enabled` is set). The main loop calls `serverHandleMessages(fpsLimit)` inside that wait (8180-8191). The frame rate is 60 by default (`main.cpp` 467), set to 30 when more than two players (`ui/MainMenu.cpp` 1075; the menu context was not read).
- Message drain. `serverHandleMessages` loops while `getGamePacket()` returns a packet (9508-9606). The budget check `!disableFPSLimitOnNetworkMessages && !frameRateLimit(...)` is off by default: `disableFPSLimitOnNetworkMessages = true` (`net.cpp` 58, with the comment "always process the messages, otherwise you can get vastly behind"). So by default the drain is unbounded, both at the top of the frame and in the limiter wait.

## 2. Key functions

- `handleEvents`: `/mnt/frankendom-donors/TurningWheel-Barony/src/game.cpp` 4098-5357. Clock (4104-4140), logic steps (5309-5314), return (5357).
- Server sync block in `gameLogic`: `/mnt/frankendom-donors/TurningWheel-Barony/src/game.cpp` 2722-2812. Health rules (2753-2776), entity push (2781-2800).
- `frameRateLimit`: `/mnt/frankendom-donors/TurningWheel-Barony/src/game.cpp` 5580-5625.
- `sendEntityUDP`: `/mnt/frankendom-donors/TurningWheel-Barony/src/net.cpp` 476-568 (record 477-546, send 548-562).
- `serverHandleMessages`: `/mnt/frankendom-donors/TurningWheel-Barony/src/net.cpp` 9508-9606.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed logic clock: carry the remainder, count whole steps | 50 Hz, 20 ms step (theirs, `game.hpp:389`; `game.cpp:4129`) |
| Cap the catch-up steps per call | 5 steps (theirs, `game.cpp:4137-4139`); the donor drops the rest |
| Push dirty state on a slot gate | Every 6 ticks (theirs, `game.cpp:2781`, 50/8 with integer division) |
| Reliable refresh per entity, once per window | Intended 200 ticks (theirs, `game.cpp:2793`); actual 600 ticks for even residues and never for odd (arithmetic above) |
| Debounce a dirty health push | 0.2 s (theirs, `game.cpp:2753`) |
| Periodic refresh with a minimum gap | 3 s period, 2 s minimum gap (theirs, `game.cpp:2759-2760`) |
| Frame cap with a sleep and a network drain in the wait | 60 fps (theirs, `main.cpp:467`); 30 with more than two players (theirs, `ui/MainMenu.cpp:1075`) |
| Drain budget (off by default) | `fpsLimit * networkTickrate`, with `networkTickrate` 2 (theirs, `game.cpp:7433-7443`) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's 50 Hz clock and its per-call cap, but it carries the dropped steps as lost steps for the caller to report (the donor drops them silently). It replaces the donor's `uid % 200 == ticks % 200` test with a send-slot counter (`tick / 6`) and a 33-slot window, so every uid gets a reliable push (the donor misses odd residues). It omits the SDL event loop and rendering, the frame limiter and sleep, the network drains and their budget, the `ticks` counter's other users, the health and shopkeeper rules, the keepalives, the `UPDATENEEDED` clearing (not traced), the per-client loop (the sketch picks entities, not clients) and the packet encoding. Typechecked on the VPS with `tsc --strict --target es2020` (exit 0).

```ts
// Licence: BSD-2-Clause (donor Barony, LICENSE.txt). Clean-room sketch of the shape, written from the donor's order of operations.
const LOGIC_HZ = 50; // donor TICKS_PER_SECOND, game.hpp:389
const STEP_MS = 1000 / LOGIC_HZ; // 20 ms per logic step
const MAX_STEPS_PER_CALL = 5; // donor cap, game.cpp:4137-4139
const SEND_EVERY_TICKS = 6; // donor TICKS_PER_SECOND / 8 with integer division, game.cpp:2781
const RELIABLE_EVERY_SLOTS = 33; // sketch value: a reliable push per uid every 33 slots (about 3.96 s); not a donor constant

interface ClockResult {
  steps: number; // steps to run this call (at most MAX_STEPS_PER_CALL)
  lostSteps: number; // whole steps beyond the cap, reported instead of dropped silently
}

// Fixed logic step with a carried remainder. Whole steps beyond the cap are counted as lost and reported.
class FixedStepClock {
  private carryMs = 0;

  constructor(private stepMs: number = STEP_MS) {}

  advance(elapsedMs: number): ClockResult {
    this.carryMs += elapsedMs;
    let whole = 0;
    while (this.carryMs >= this.stepMs) {
      this.carryMs -= this.stepMs;
      whole++;
    }
    const steps = Math.min(whole, MAX_STEPS_PER_CALL);
    return { steps, lostSteps: whole - steps };
  }
}

interface SyncEntity {
  uid: number;
  dirty: boolean; // donor UPDATENEEDED flag
  noUpdate: boolean; // donor NOUPDATE flag
}

interface SyncPlan {
  send: SyncEntity[];
  reliable: Set<number>; // uids that get the reliable push on this slot
}

// Dirty entities are pushed on every SEND_EVERY_TICKS-th tick. A uid gets a reliable push when its slot matches.
function syncPlan(tick: number, entities: SyncEntity[]): SyncPlan {
  const plan: SyncPlan = { send: [], reliable: new Set<number>() };
  if (tick % SEND_EVERY_TICKS !== 0) {
    return plan;
  }
  const slot = Math.floor(tick / SEND_EVERY_TICKS);
  for (const e of entities) {
    if (!e.dirty || e.noUpdate) {
      continue;
    }
    plan.send.push(e);
    if (slot % RELIABLE_EVERY_SLOTS === e.uid % RELIABLE_EVERY_SLOTS) {
      plan.reliable.add(e.uid);
    }
  }
  return plan;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/tick.ts` (new): the fixed 50 Hz fight clock with a capped catch-up and reported lost steps, and the view push gate. Parity-checklist row 18 (loot roll and XP award) with the sub-line "server tick: fixed step, input intake, per-tick NPC budget".
- Reuse tag: adapt-allowed (BSD-2-Clause: keep the copyright, licence conditions and disclaimer if any code is copied; this sketch is written from the shape).
- Brief rule served: 1 (one engine: one fixed step for the fight); rule 8 (server-verified kills) noted in section 6.

## 6. Gaps and risks

- Drop versus carry. The donor drops steps beyond 5 per call and removes them from the carry (`game.cpp` 4130-4139). A stall makes the fight run slower than the wall clock with no record. For server-verified kills, Frankendom must carry or report the lost steps; do not port the silent drop.
- Millisecond clock. The donor reads `SDL_GetTicks()` (4105), which is integer milliseconds. Frankendom's server step should use its own monotonic clock and log its own lost steps.
- Unbounded drain by default. `disableFPSLimitOnNetworkMessages` is true (`net.cpp` 58), so the message drain has no budget, at the top of the frame (7443) and in the limiter wait (8191). A packet flood can delay the fight step. Frankendom's intake (row 5) should use the per-player cap from the cvet-fonline pattern instead.
- Gate arithmetic. The donor's reliable test (2793) misses odd `uid % 200` and repeats even residues every 600 ticks, not 200. Frankendom must not copy this test; use a slot counter as in the sketch and test it.
- Dirty flag not cleared by the send. The send loop (2790-2800) and `sendEntityUDP` (476-568) do not clear `UPDATENEEDED`. The donor sets it in many places (127 set sites) and clears it in 71 places; two of those were checked (`game.cpp` 1422 and 3280, both gib creation defaults), the rest were not. Whether an entity is re-sent every 6 ticks until its flag clears was not traced. Do not assume "dirty" means "changed since last push" without a test.
- The push is a view, not a verdict. A view push must never carry a kill or a damage result. Kills are server-verified in one ledger; the push only shows the state.
- MAX_ATTACKERS = 3 has no counterpart in these functions. Nothing here caps attackers or tracks hate.
- Zones as data. The 50 Hz rate, the 5-step cap, the 6-tick gate and the 200-tick window are engine constants in the donor (`game.hpp:389`, `game.cpp` 2781-2793). Keep them as engine constants, not zone data. The 60 and 30 fps rates are the only values that look like designer settings (`main.cpp` 467, `ui/MainMenu.cpp` 1075).
- Frame timing is wall clock. The 50 Hz logic runs on the frame loop's time and not on a separate timer, so the real step rate depends on frame timing (frame rate 60, logic 50; most frames run 0 or 1 step; arithmetic only, not measured).
- The camera: the client render interpolation (`game.cpp` 586-690, `TimerExperiments`) is client-side and outside this cell. camera_scope is not applicable here.

Reuse tag: adapt-allowed (BSD-2-Clause, keep the notice)
Brief rule served: 1 (one engine: one fixed step for the fight); rule 8 noted in section 6
