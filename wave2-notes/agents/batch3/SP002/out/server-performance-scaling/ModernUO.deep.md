# ModernUO (server-performance-scaling, cell 1)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/Server/Timer/Timer.TimerWheel.cs` (with `Timer.cs`, `Timer.Pool.cs`, `Projects/Server/Main.cs` for the loop) | Licence: GPL-3.0-or-later per the per-file header ("either version 3 of the License, or (at your option) any later version"); repo `LICENSE` is GPL version 3 (29 June 2007) | C# | symbol `Timer.Slice` (turn driver) and `Timer.AddTimer` (placement)

Checked: Read in full: `Timer/Timer.TimerWheel.cs` 1-334, `Timer/Timer.cs` 16-240, `Timer/Timer.Pool.cs` 16-117, `EventLoopTasks.cs` 16-135, `Main.cs` 690-790 (the loop), `Mobiles/Mobile.cs` 7838-7900 (delta queue). Read in part: `Timer/Timer.DelayCall.cs` 150-200 (pool take and return). Grep only: callers of `Timer.Slice` (production: `Main.cs:725`; tests call it directly) and readers of `.Next` (several UOContent files; `BaseLight.cs:78` read). `Server.Tests/Tests/Timer/TimerTests.cs` read 1-60 only. Tests NOT run; sketch typecheck only. Confidence: high on the wheel arithmetic as read; medium on the `Next` defect (worked out from the code, not run in a server). Not read: `Timer.DelayStateCall.cs`, `TimerExecutionToken.cs`, the `DEBUG_TIMERS` blocks. camera_scope: n/a (not a camera topic).

## 1. Mechanism

- The server has one clock. The event loop reads the tick count once per pass (`Main.cs:711`) and calls `Timer.Slice(_tickCount)` once per pass (`Main.cs:725`). Order inside one pass (`Main.cs:705-786`): mobile delta queue (717), item delta queue, timer slice (725), `NetState.Slice()`, posted tasks (735), pool-depletion check (738), optional world snapshot. When nothing is pending, the loop sleeps for the smaller of the idle wait and the time to the next wheel turn (`Main.cs:757-772`, due computed at 762).
- The wheel is fixed-step. One turn is 8 ms of simulated time (`TimerWheel.cs:34`). `Slice` turns elapsed time into whole turns: while at least one tick has passed since the last turn, it adds 8 ms to the last-turned time and calls `Turn()` (`TimerWheel.cs:63-69`). There is no cap on turns per call, so after a long stall every missed turn runs in one pass.
- `Turn()` advances ring 0 by one slot (wrapping at 4096). When ring 0 wraps, ring 1 advances by one, and so on (`TimerWheel.cs:80-99`). Before running any timer it detaches the due chain of every ring that turned, so a timer added during this turn lands in a fresh slot. Then it runs ring 0's chain, then ring 1, then ring 2 (`101-143`). A timer on a higher ring whose `_remaining` is above zero is promoted: `AddTimer(timer, _remaining)` places it on a finer ring (`122-126`). This is the coarse-to-fine cascade.
- Placement, `AddTimer` (`192-252`): layer i covers delays below `resolution_i * 4096`. Resolution is 8 ms on layer 0, 2^15 ms on layer 1, 2^27 ms on layer 2 (the last layer takes anything). On the first layer that covers the delay, slot = (delay in that layer's units) + current index of that ring, plus 1 if there is a sub-slot remainder (so a timer never fires early), and a zero delay waits one extra turn (`208-215`). The remainder is kept on the timer for promotion (`239`). A delay too long for this layer has the time until this ring wraps subtracted (`248-249`) and goes to the next layer.
- Execution, `Execute` (`146-178`): `finished` is true when the count is reached (`148`). If finished, the timer is stopped and its Version bumped (`151-155`). `OnTick` runs. If Version changed during `OnTick` (a Stop or a restart happened), or it finished and was restarted, it returns without re-arming (`162-165`). Otherwise a repeating timer re-arms with `AddTimer(timer, Interval)` (`169`) and Index goes up by one (`177`).
- Delay and Interval are rounded UP to a multiple of 8 ms in their setters (`Timer.cs:67`, `73`, using `RoundTicksToNextPowerOfTwo`, `TimerWheel.cs:181-190`). The name says power of two; the mask is 8 ms, so the result is a multiple of 8, and a value of 0 or less becomes 8. Tests: a 65 ms timer fires at 72 ms (`TimerTests.cs:12`); zero fires at 8 ms (`TimerTests.cs:10`).
- Start and Stop: `Start` (`Timer.cs:83-118`) places the timer with Delay (`115`). `Stop` (`120-156`) clears Running, removes the timer from its slot head if it is the head (`InternalStop`, `158-173`), detaches, and bumps Version. Due timers that were stopped earlier in the same turn are skipped by the `if (timer.Running)` check (`TimerWheel.cs:120`).
- Pool: DelayCallTimer objects come from a free list (`Timer.Pool.cs:62-75`; `DelayCall.cs:173`). The pool starts at 1024 (`Timer.Pool.cs:48`) with a maximum of 16 times that (`49`). When the pool is empty, `GetTimer` allocates a new object (`DelayCall.cs:189`). `CheckTimerPool` (`29-44`) starts an async refill that doubles the size up to the maximum (`36-37`), run on `Task.Run` (`104`). The thread the continuation returns to was not read.
- Posted work and delta batching, in the same loop. `EventLoopContext.ExecuteTasks` drains all priority posts and at most 128 normal posts per pass (`EventLoopTasks.cs:35`, `117-133`). Mobile state changes are coalesced: `Delta(flag)` sets a bit and enqueues the mobile only once (`Mobile.cs:7856-7862`). `ProcessDeltaQueue` handles only the count that was queued on entry (`7873-7875`).

## 2. Key functions

- `Timer.Slice`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Timer/Timer.TimerWheel.cs` 59-70 (elapsed time to whole 8 ms turns, no cap).
- `Timer.Turn`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Timer/Timer.TimerWheel.cs` 75-144 (detach all due chains, then run layers 0..2; promotion at 122-126).
- `Timer.Execute`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Timer/Timer.TimerWheel.cs` 146-178 (finished check, OnTick, Version guard, re-arm with Interval).
- `Timer.AddTimer`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Timer/Timer.TimerWheel.cs` 192-252 (layer choice, slot arithmetic, remainder, overflow guard at 223).
- `Timer.Start` / `Stop`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Timer/Timer.cs` 83-118 and 120-156.
- Pool: `/mnt/frankendom-donors/ModernUO/Projects/Server/Timer/Timer.Pool.cs` 29-44 (`CheckTimerPool`), 62-75 (`GetFromPool`), 100-116 (`RefillPoolAsync`); `/mnt/frankendom-donors/ModernUO/Projects/Server/Timer/Timer.DelayCall.cs` 171-190 (`GetTimer`).
- Loop: `/mnt/frankendom-donors/ModernUO/Projects/Server/Main.cs` 705-790 (`RunEventLoop`; the idle sleep is at 757-785).
- Posted budget: `/mnt/frankendom-donors/ModernUO/Projects/Server/EventLoopTasks.cs` 108-134 (`ExecuteTasks`).
- Delta coalescing: `/mnt/frankendom-donors/ModernUO/Projects/Server/Mobiles/Mobile.cs` 7838-7862 (`Delta`), 7871-7900 (`ProcessDeltaQueue`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed turn; turns come from elapsed time | 8 ms (theirs, `TimerWheel.cs:34`) |
| Three rings of 4096 slots; coarse-to-fine cascade | 12 bits per ring, 3 layers (theirs, `TimerWheel.cs:31-32`) |
| Layer 0 span: 4096 slots x 8 ms = 32,768 ms (32.8 s) | The layer test uses `1 << 15` (`TimerWheel.cs:200-201`, `204`); the span is computed, not stated in the donor |
| Layer 1 span: 2^27 ms, about 37 hours (computed) | Not stated in the donor |
| Last-layer slot span: 2^39 ms, about 17.4 years (computed) | The donor's logged `_maxDuration` is 2^38 ms (`TimerWheel.cs:35`), half the slot span; see gaps |
| Delay and Interval rounded up to 8 ms; 0 becomes 8 | `Timer.cs:67`, `TimerWheel.cs:185`, test `TimerTests.cs:10` |
| Catch-up turns, no cap | None in the donor (`TimerWheel.cs:64`) |
| Pool: initial 1024, max 16x initial, refill doubles | Config keys `timer.initialPoolCapacity` (1024) and `timer.maxPoolCapacity` (16x), `Timer.Pool.cs:48-49`; refill doubling `36-37` |
| Posted normal callbacks per pass | 128 (`EventLoopTasks.cs:35`) |

## 4. TypeScript sketch

simplified: the sketch keeps the 8 ms turn, three 4096-slot layers, detach-before-run order, the remainder promotion, the zero-delay wait and the Version guard. It replaces the intrusive doubly linked list with plain arrays and lazy removal: a stopped timer stays in its slot and is skipped when it comes due (Stop is O(1) but the slot keeps the reference). It drops `OnDetach`, the pool, the Stop-while-saving and THREADGUARD checks, the DEBUG_TIMERS output and `DumpInfo`. Two donor defects are fixed: `dueMs` uses the requested delay (donor line 237 uses Delay), and the overflow guard uses `>=` (donor line 223 uses `>`). It adds a per-call turn cap (`maxTurns`, default 64), which the donor does not have. Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0. Not executed.

```ts
// Licence: GPL-3.0-or-later (donor, per file header). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const TICK_MS = 8;          // one wheel turn = 8 ms of simulated time
const RING_SIZE = 4096;     // slots per ring (2^12)
const LAYERS = 3;

export interface WheelTimer {
  intervalMs: number;       // already rounded to TICK_MS
  count: number;            // 0 = repeat forever
  index: number;            // runs completed so far
  running: boolean;
  version: number;          // bumped by stop() and by the last run; a tick that changes it cancels the re-arm
  remainderMs: number;      // sub-slot part, promoted down a ring when this slot comes due
  dueMs: number;            // informational: when the timer should fire
  onTick(): void;
}

export function roundToTick(ms: number): number {
  return ms <= 0 ? TICK_MS : Math.ceil(ms / TICK_MS) * TICK_MS;
}

export class TimerWheel {
  private readonly rings: WheelTimer[][][] = [];
  private readonly ringIndex: number[] = new Array<number>(LAYERS).fill(0);
  private lastTurnedMs: number;

  constructor(nowMs: number) {
    this.lastTurnedMs = nowMs;
    for (let i = 0; i < LAYERS; i++) {
      const ring: WheelTimer[][] = [];
      for (let s = 0; s < RING_SIZE; s++) ring.push([]);
      this.rings.push(ring);
    }
  }

  start(t: WheelTimer, delayMs: number): void {
    if (t.running) return;
    t.index = 0;
    t.running = true;
    this.addTimer(t, roundToTick(delayMs));
  }

  stop(t: WheelTimer): void {
    if (!t.running) return;
    t.running = false;      // lazy removal: the entry is skipped when its slot comes due
    t.version++;
  }

  // Catch up on whole turns elapsed since the last call. maxTurns caps the work per call;
  // the rest stays as debt and is paid on later calls (donor: no cap).
  slice(nowMs: number, maxTurns = 64): void {
    let turns = 0;
    while (nowMs - this.lastTurnedMs >= TICK_MS && turns < maxTurns) {
      this.lastTurnedMs += TICK_MS;
      this.turn();
      turns++;
    }
  }

  private turn(): void {
    const due: WheelTimer[][] = [];
    let carry = false;
    for (let i = 0; i < LAYERS; i++) {
      if (i === 0 || carry) {
        let idx = ++this.ringIndex[i];
        carry = idx >= RING_SIZE;
        if (carry) { idx = 0; this.ringIndex[i] = 0; }
        due.push(this.rings[i][idx]);
        this.rings[i][idx] = [];   // detach first: timers added during the run land in a fresh slot
      } else {
        due.push([]);
      }
    }
    for (let i = 0; i < LAYERS; i++) {
      for (const t of due[i]) {
        if (!t.running) continue;
        if (i > 0 && t.remainderMs > 0) this.addTimer(t, t.remainderMs); // promote down
        else this.execute(t);
      }
    }
  }

  private execute(t: WheelTimer): void {
    const finished = t.count !== 0 && t.index + 1 >= t.count;
    if (finished) { t.running = false; t.version++; }
    const version = t.version;
    t.onTick();
    if (t.version !== version || (finished && t.running)) return; // stopped or restarted inside onTick
    if (!finished) this.addTimer(t, t.intervalMs);
    t.index++;
  }

  private addTimer(t: WheelTimer, delayMs: number): void {
    let delay = delayMs;
    let resolution = TICK_MS;                 // ms per slot on this layer: 8, 32768, 2^27
    for (let i = 0; i < LAYERS; i++) {
      const span = resolution * RING_SIZE;    // how far this layer reaches
      const last = i === LAYERS - 1;
      if (delay < span || last) {
        const ringIndex = this.ringIndex[i];
        const remainder = delay % resolution;
        let rem = remainder;
        let slot = Math.floor(delay / resolution) + ringIndex + (remainder > 0 ? 1 : 0);
        if (delay === 0) { slot++; rem = 0; } // a zero delay still waits one turn
        if (slot >= RING_SIZE) {
          slot -= RING_SIZE;
          if (last && slot >= RING_SIZE) slot = Math.max(0, ringIndex - 1); // donor fallback, far future
        }
        t.dueMs = this.lastTurnedMs + delayMs;   // fix: donor sets Next from Delay on every add
        t.remainderMs = rem;
        this.rings[i][slot].push(t);
        return;
      }
      // Turns of this layer until it wraps to slot 0; the rest goes to the next layer.
      delay -= resolution * (RING_SIZE - this.ringIndex[i]);
      resolution *= RING_SIZE;
    }
  }
}

export {};
```

## 5. Lands in

- TARGET `src/fight/timers.ts` (new module: the engine clock for fight timers on the server tick, for parry and stagger windows, leash and chase checks; zone grace timers from row 23 if they use the same wheel). Frankendom's current timer code was not read in this pass.
- Parity-checklist row 18, sub-line "server tick: fixed step, input intake, per-tick NPC budget". The donor's `RunEventLoop` (`Main.cs:705-786`) is the reference for that sub-line; the wheel is only one part of it.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room, shape only)
- Brief rule served: 1 (one engine: one clock, kills and timer effects decided on the server); rule 8 (row 18 cited)

## 6. Gaps and risks

- Quantisation: every timer rounds UP to the next 8 ms turn. That suits parry windows (hundreds of ms). A window that must line up with a specific input frame must stay on the fixed fight step (row 1), not the wheel.
- Lazy stop: a stopped timer keeps its slot until it comes due. Any timer that does damage or a kill must check it is still live (the Version guard) and then go through the one damage step and the server-verified kill path. The wheel does not know about the ledger.
- Donor defects found (keep the idea, fix in the sketch):
  - (a) `Next` is set from `timer.Delay` on every add (`TimerWheel.cs:237`). Interval re-adds (`169`) and promotions (`125`) therefore store the wrong due time. Game code reads `Next` (`BaseLight.cs:78`: `_burnTimer.Next - Core.Now`). For a long timer that has been promoted, the reported remaining time is too long. Worked out from the arithmetic; not run. fix: due = now + the delay being scheduled (`dueMs` in the sketch).
  - (b) Overflow guard `slot > _ringSize` (`TimerWheel.cs:223`) misses a slot of exactly 4096 after the subtraction, which would index past the array. Only reached for delays near 2^39 ms (about 17 years), so not reachable in practice. fix: `>=`.
  - (c) `_maxDuration` (`TimerWheel.cs:35`) is 2^38 ms, but the last layer covers 2^39 ms. The error text reports the smaller number. fix: derive the limit from the ring arithmetic.
  - (d) The catch-up loop has no cap (`TimerWheel.cs:64`). A long stall runs every missed turn in one pass, before the loop can drain network input. fix: cap turns per pass and carry the debt (`maxTurns` in the sketch).
- Frankendom has one engine and one runtime per server. The donor's THREADGUARD block (`Timer.cs:96-106`) only logs an error when a timer starts off the main thread, and only in builds with that define; the rule that carries over is "timers only on the server tick, never on the Pit client".
- Pit as client: the Pit must not own timers that decide hits. The wheel belongs to the engine on the server.
- MAX_ATTACKERS = 3: the wheel does not handle many-on-one selection; it only schedules. Target choice stays in the engine (hate list, row 4).
- Donor licence is GPL-3.0-or-later: no code was copied. Only the shape (ring layers, slot arithmetic, detach-before-run, remainder promotion) is used.
- Tests exist (`Server.Tests/Tests/Timer/TimerTests.cs`) and were not run. The sketch is typechecked only, not executed.

Best transferable idea: a fixed 8 ms wheel with three 4096-slot rings and remainder promotion gives O(1) schedule and cancel for every fight timer, with the due check done once per tick instead of per timer.

Decision (proposed): adapt. Fight timers (parry windows, stagger, leash) last seconds, so one 8 ms ring (32.8 s span) covers them; keep the upper layers only if zone grace or respawn timers need hours (row 23). Drop the donor's async pool, since JS allocation is cheap at this scale.

Acceptance: server test: a 65 ms timer fires on the 72 ms turn; a 3000 ms parry window fires on its own turn, not early; a timer stopped inside an earlier timer's callback in the same turn does not run; after a 10 s stall at most 64 turns run per call and the rest run on later calls.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room, shape only)
Brief rule served: 1 (one engine: one clock, server-side timer effects); rule 8 (row 18 cited)

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
- All checked claims hold: 8 ms tick, 4096x3 rings, Slice catch-up (TimerWheel.cs 59-70), Turn and Execute (75-178), AddTimer layer maths and zero-delay rule (192-252), `Next = Core.Now + Delay` at 237 (defect a real, BaseLight.cs:78 reads Next), overflow guard `slot > _ringSize` at 223 (defect b real), `_maxDuration` 2^38 vs 2^39 span (defect c real), 8 ms rounding, pool sizes, loop order Main.cs 711-738, idle sleep 757-785, ExecuteTasks 128 per pass, Delta coalescing, THREADGUARD, licence GPL-3.0-or-later.
- Missed (minor): `Delta()` returns early when the map is null/Internal or the mobile is deleted (Mobile.cs:7851-7854); Main.cs also has the CheckSchedulerHealth / late-wake accounting (755-784) not covered. Nothing important.
