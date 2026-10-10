# ModernUO (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/Server/Main.cs` (loop), `/mnt/frankendom-donors/ModernUO/Projects/Server/Timer/Timer.TimerWheel.cs` (timers), `/mnt/frankendom-donors/ModernUO/Projects/Server/Mobiles/Mobile.cs` (dirty queue) | Licence: GPL-3.0-or-later (per file headers: "either version 3 of the License, or (at your option) any later version"; LICENSE file is GPLv3) | C# | symbol `RunEventLoop`

Checked: `RunEventLoop` (Main.cs 705-795) read in full; `Timer.TimerWheel.cs` read in full (1-334); `Mobile.ProcessDeltaQueue` (7871-7900) and `Mobile.Delta` (7838-7863) read in full; `Mobile.ProcessDelta` read only to line 2700 (its packet-building body not read). `NetState.Slice` (NetState.Network.cs 713-800) read to line 800; `ProcessCompletions`, `NetState.IsIdle`, `NetState.WaitForCompletion`, `LoopContext` and `Timer.CheckTimerPool` not read. Confidence: high on loop phase order, the 8 ms wheel and the bounded drain; medium on what each drained item costs. Candidates opened: Main.cs, Timer/Timer.TimerWheel.cs, Mobiles/Mobile.cs, Network/NetState/NetState.Network.cs. Greps for a per-tick NPC budget found none in the event loop (see section 6). camera_scope: not applicable (server topic).

## 1. Mechanism

- One thread runs `RunEventLoop`, a `while (!Closing)` loop. Each iteration first stamps `_tickCount` from a Stopwatch in milliseconds (Main.cs 711, 526-534), then runs phases in this fixed order: (a) `Mobile.ProcessDeltaQueue()` (717); (b) `Item.ProcessDeltaQueue()` (721); (c) `Timer.Slice(_tickCount)` (725); (d) `NetState.Slice()` (730), which itself processes queued movements through `MovementThrottle.ProcessAllQueues()` (735) before socket completions; (e) `LoopContext.ExecuteTasks()` (Main.cs 735); (f) `Timer.CheckTimerPool()` (738); (g) an optional world snapshot (740-747); (h) a kill check (749-753); (i) `CheckSchedulerHealth()` (755).
- Idle sleep (757-785): the loop blocks only when `IsIdle()` (703) is true, meaning no queued mobile deltas, no queued item deltas, an empty loop-context queue and an idle network. It reads the clock again (761), asks the wheel how long until the next turn (762), and waits `min(due, _eventLoopIdleWaitMs)` (765, 772). So a sleep is at most 2 ms and never past the next wheel turn.
- Health check: once a second (comment at 106, code at 109-175), the loop counts late idle wakes. If at least 10 percent of sleeps came back late, and more than one late wake (97; rate test 148; threshold 96), for two samples in a row, it suspends idle sleeping for an escalating backoff (166-169). The loop keeps running, it only stops sleeping.
- Timer wheel (`Timer.TimerWheel.cs`): time is advanced in fixed 8 ms turns. `Slice` (59-70) computes the time owed since the last turn and calls `Turn()` once for each full 8 ms owed, in a `while` loop (64-69). `Turn` (75-144) detaches the slot for the current position in each ring, runs the due timers, and promotes timers from a coarse ring to a finer one when they still have time left (122-126). Three rings of 4096 slots (31-32). Ring 0 takes delays below 2^15 ms (derived from lines 196-204 and 201: resolution 8 ms, ring max = 2^(3+12)); longer delays go to coarser rings. `Execute` (146-178) runs `OnTick`, then re-adds a repeating timer at its interval (169).
- Dirty queue (`Mobile.cs`): `Delta(flag)` ORs the flag into `m_DeltaFlags` (7856) and enqueues the mobile only once (7858-7861). `ProcessDeltaQueue` (7871-7900) takes the queue count on entry (7873) and dequeues at most that many (7875). `ProcessDelta` (2668) takes and clears the accumulated flags in one step (2670, 2678) and then builds the network updates. A mobile marked during the pass is queued at the tail and waits for the next iteration. A warning is logged if any remain (7896-7898).
- Tick: the loop itself is variable-rate (it runs as fast as the phases allow, sleeping at most 2 ms when idle). Only the timers are fixed-step (8 ms). The dirty drains are a per-iteration bounded budget, not a per-tick simulation.

## 2. Key functions

- `RunEventLoop`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Main.cs` 705-795. Phase order in the loop body; idle sleep at 757-785.
- `IsIdle`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Main.cs` 702-703. Gate for sleeping.
- `CheckSchedulerHealth`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Main.cs` 109-175. Late-wake rate and backoff.
- `Timer.Slice` and `Timer.Turn`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Timer/Timer.TimerWheel.cs` 59-70 and 75-144. Fixed-step catch-up and ring rotation.
- `Timer.AddTimer` and `Timer.Execute`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Timer/Timer.TimerWheel.cs` 192-252 (the ring placement loop was read) and 146-178.
- `Mobile.Delta` and `Mobile.ProcessDeltaQueue`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Mobiles/Mobile.cs` 7838-7863 and 7871-7900.
- `NetState.Slice`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Network/NetState/NetState.Network.cs` 713-800 (partly read).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Fixed-step timer wheel with catch-up: one turn per owed step, no matter how often the loop runs | Turn length 8 ms (theirs, TimerWheel.cs 34) |
| Hierarchical slots: a timer lands in the finest ring that can hold it | 4096 slots per ring (theirs, 31), 3 rings (theirs, 32); ring 0 covers delays below 2^15 ms = 32.768 s (derived from 196-204) |
| Idle backstop: a sleep never exceeds this, and never passes the next turn | 2 ms default (theirs, Main.cs 50); a comment says 2 measured best against 1, 4 and 8 ms (48-49) |
| Late-wake rate triggers a temporary stop of idle sleeping | 10 percent late wakes (theirs, Main.cs 97), checked once a second (106), two bad samples in a row (156) |
| Dirty drain is bounded by the count seen on entry | Rule, not a number: `limit = Count` on entry (7873) |
| Flags coalesce per entity, one queue slot per entity | Rule (7856, 7858-7861) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's phase order (dirty drain, then wheel advance) and the fixed 8 ms turn with catch-up, and the 2 ms idle cap. It omits the three-ring placement and promotion (one flat array instead, so it is O(n) per turn), timer versions and stop checks, the repeating-interval re-add, the pool, the DEBUG counters, the network, loop-task, snapshot and kill phases, and the health check. It also replaces the donor's `Queue<T>` with `Array.shift`.

```ts
// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const TICK_MS = 8;          // wheel turn length (donor: 8 ms)
const IDLE_WAIT_MS = 2;     // longest idle sleep (donor default: 2 ms)

// Dirty-flag queue: flags are OR-ed per entity and the entity is queued once.
// A drain processes only the entries that were queued before the pass started.
class DirtyQueue<T> {
  private queue: T[] = [];
  private flags = new Map<T, number>();

  mark(entity: T, flag: number): void {
    const had = this.flags.get(entity);
    this.flags.set(entity, (had ?? 0) | flag);
    if (had === undefined) this.queue.push(entity);
  }

  get pending(): number { return this.queue.length; }

  drain(apply: (entity: T, flags: number) => void): void {
    let limit = this.queue.length; // bound fixed on entry; re-marks during the pass wait for the next pass
    while (limit-- > 0 && this.queue.length > 0) {
      const entity = this.queue.shift() as T;
      const flags = this.flags.get(entity) ?? 0;
      this.flags.delete(entity);
      apply(entity, flags);
    }
  }
}

interface Job { due: number; cancelled: boolean; run: () => void; }

// Fixed-step wheel: time advances in TICK_MS turns; the loop catches up every turn it owes.
class FixedStepWheel {
  private lastTurn: number;
  private jobs: Job[] = [];

  constructor(now: number) { this.lastTurn = now; }

  schedule(now: number, delayMs: number, run: () => void): Job {
    const job: Job = { due: now + Math.max(delayMs, TICK_MS), cancelled: false, run };
    this.jobs.push(job);
    return job;
  }

  // Accumulator: one turn per TICK_MS owed, no matter how often the loop calls this.
  advance(now: number): void {
    while (now - this.lastTurn >= TICK_MS) {
      this.lastTurn += TICK_MS;
      const due = this.jobs.filter(j => j.due <= this.lastTurn);
      this.jobs = this.jobs.filter(j => j.due > this.lastTurn);
      for (const j of due) if (!j.cancelled) j.run();
    }
  }

  // How long the loop may sleep before the next turn is owed, capped by the idle backstop.
  idleSleepMs(now: number): number {
    const untilTurn = Math.max(0, TICK_MS - (now - this.lastTurn));
    return Math.min(untilTurn, IDLE_WAIT_MS);
  }
}

// One loop iteration: dirty drain first, then the wheel, in the donor's phase order.
function iteration(now: number, wheel: FixedStepWheel, mobiles: DirtyQueue<string>,
                   applyDelta: (m: string, flags: number) => void): number {
  mobiles.drain(applyDelta);
  wheel.advance(now);
  return wheel.idleSleepMs(now);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/tick.ts` (new): the engine's fixed step (8 ms timer turns with catch-up), the bounded dirty drain for per-fighter state sync, and the idle cap. Parity-checklist row 18 (loot roll and XP award; the server tick sub-line), sub-line "server tick: fixed step, input intake, per-tick NPC budget". Input intake is the separate row 5 and is not claimed here.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: the tick lives in the engine, not in a client)
- Best transferable idea: One fixed 8 ms timer turn with catch-up, plus a dirty-flag queue drained only up to the count seen on entry, so each tick has bounded state-sync work and timers fire on server time even after a stall.
- Decision (proposed): adapt - keep the fixed step with catch-up and the bounded drain; do not port the three-ring 4096-slot wheel, because a flat timer list is enough until timer counts are measured. The donor's own ring design is not needed for a fight engine.
- Acceptance: Server test: with the loop stalled for 50 ms, a 100 ms timer scheduled at t=0 fires on the first 8 ms turn at or after 100 ms (104 ms), and a dirty drain given three entities marked during its own pass leaves exactly those three for the next pass.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism. The donor is a general game server, not a fight engine.
- Catch-up has no cap. The `while` in `Timer.Slice` (64-69) runs every owed turn in one call, so a long stall causes a burst of wheel work in one iteration. The in-loop world snapshot (Main.cs 744) is one such stall. Frankendom must decide whether a stall skips turns or replays them, and test it.
- No per-tick NPC budget was found in the event loop. A grep for per-tick, budget and think-budget terms found only the spawner's `ringsPerTick` (UOContent/Engines/Spawners/SectorSpawnCache.cs 255-270, not read beyond the grep line). Frankendom's "per-tick NPC budget" has no donor counterpart in this loop; do not cite the donor for it.
- The dirty drain bounds the number of entities per pass, not the work per entity. `ProcessDelta` (2668) decides which updates to send (the `sendHits`, `sendStam` flags at 2681 suggest packets are built there), but its body after line 2700 was not read, so the cost per entity is unknown.
- Timers and dirty flags are the donor's shared-state shortcut: a timer callback can change any mobile directly. For the one-ledger rule, Frankendom's timers must write through the engine's ledger, not mutate fighters from a callback.
- One engine and server-verified kills: the donor's health check only suspends idle sleep (169); it never changes game results. Frankendom's kill decision stays in the engine, not in a timer callback.
- MAX_ATTACKERS = 3, Pit-as-client: no effect from this loop. The Pit must not run its own loop with this wheel.
- THREADGUARD: `Delta` checks the thread only under the THREADGUARD build flag (7840-7849). Frankendom's ledger needs its own single-writer guard.
