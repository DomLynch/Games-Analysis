# Dawn-of-Light-DOLSharp (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameutils/GameTimer.cs` | Licence: GPL-2.0 (LICENSE: "GNU GENERAL PUBLIC LICENSE Version 2, June 1991") | C# | symbol `GameTimer.TimeManager.TimeThread`

Checked: `TimeThread` starts at 799 and was read to 1082; `InsertTimer` 642-706 read in full; wheel constants 201-210 and `MaxInterval` 326-328 read.

## 1. Mechanism

- A dedicated thread advances a 1 ms clock. Every game event that needs to happen later (a spell cast end, a respawn, an NPC think, a leash check) is a timer object with a delay, stored in a timing wheel rather than a sorted list, so adding and firing are cheap even with tens of thousands of timers.
- Wheel layout: a "cache" of 2^14 slots (201) for timers due soon, a table of 2^17 buckets of 2^4 ticks each (205, 210) for the middle range, and a "long-term" counter in the upper bits for anything further out. `MaxInterval` is the largest delay the wheel can hold (326-328).
- Insert (642-706): a delay of 1 .. `CACHE_MASK+1` ticks goes straight into its cache slot (669); a longer delay goes into the bucket that covers its tick, with an extra pass added if the target is ahead of the current bucket (690). An already-scheduled timer is removed and re-inserted; a timer being rescheduled while it is firing is flagged `TIMER_RESCHEDULED` (654) rather than touched.
- Each loop pass (824): `m_tick` advances by one. When a bucket boundary is crossed, the next bucket is emptied and its timers are sorted into cache slots, or put back if they are still more than one lap away (842). Then the cache slot for this tick is taken as a chain and each timer whose tick matches has `OnTick()` called (895). Exceptions are caught and the timer is disabled (959).
- Pacing (1048-1074): after the work, `timeBalance += 1 - elapsedMs` (1053). If positive the thread sleeps that long (1057); if the work ran long the balance goes negative and the next passes run with no sleep until it catches up. Past -1000 ms it forgives 1000 ms (1074) and past -2000 ms it logs "out of sync" (1072). So time never runs fast and a slow callback does not accumulate lag without bound.
- A callback over 250 ms is logged with its description (916).

## 2. Key functions

- `TimeManager.TimeThread`: `GameServer/gameutils/GameTimer.cs` 799-1082. Tick loop, bucket cascade, firing, pacing.
- `TimeManager.InsertTimer`: `GameServer/gameutils/GameTimer.cs` 642-706. Place a timer in cache or bucket.
- `TimeManager.RemoveTimerUnsafe`: `GameServer/gameutils/GameTimer.cs` 719 (declaration only read).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hashed timing wheel with a near cache, a middle table and a long-term lap counter | Cache bits 14 (theirs, 201), bucket bits 4 (205), table bits 17 (210) |
| Fixed 1-tick step with a sleep balance that catches up after slow work, forgiving past a limit | 1 ms step (1053), forgive 1000 ms (1074), warn at -2000 ms (1072) |
| Slow-callback warning | 250 ms threshold (theirs, 916 region) |

## 4. TypeScript sketch

simplified: one level only (a plain ring of slots plus a lap counter) instead of the cache, table and long-term bits; no thread, no reschedule-while-firing flag, no removal list, no statistics. Delays above one lap are handled by storing `laps`.

```ts
// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Timer { due: number; laps: number; fire: () => void; }

export class Wheel {
  private slots: Timer[][];
  private now = 0;
  constructor(private size = 1024) {
    this.slots = Array.from({ length: size }, () => []);
  }

  add(delayTicks: number, fire: () => void): void {
    if (delayTicks < 1) throw new RangeError("delay must be >= 1");
    const due = this.now + delayTicks;
    const laps = Math.floor((delayTicks - 1) / this.size);
    this.slots[due % this.size].push({ due, laps, fire });
  }

  step(): void {
    this.now++;
    const slot = this.slots[this.now % this.size];
    const keep: Timer[] = [];
    for (const t of slot) {
      if (t.due === this.now) {
        try { t.fire(); } catch { /* donor disables the timer; we drop it */ }
      } else {
        keep.push(t);
      }
    }
    this.slots[this.now % this.size] = keep;
  }
}

// Pacing: balance += stepMs - workMs; sleep while positive; forgive past -1000.
export function nextBalance(balance: number, stepMs: number, workMs: number): number {
  let b = balance + stepMs - workMs;
  if (b < -1000) b += 1000;
  return b;
}
```

## 5. Lands in

- TARGET `src/fight/scheduler.ts` (new module: cooldown, respawn and leash timers on one clock): checklist row 4 (fight loop: aggro, chase, leash); a new module cites the row it serves. today: none read.
- Ruling (Lead Dev, 2026-10-10): no new row for the server tick. It stays under row 18 / post-K item 3 as the named sub-line "server tick: fixed step, input intake, per-tick NPC budget". Acceptance is many-on-one (Proof 3: N NPC brains inside the tick budget). The timer wheel is infrastructure under that sub-line; the leash/aggro timing it drives stays on row 4.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: 10 (zone copies, soft cap, seeding), 5 (aggro and leash timing in the engine); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2.0: clean-room only. The sketch is a plain ring written from the described mechanism.
- Node/browser JS has no dedicated thread; a 1 ms wheel is overkill. Frankendom likely wants a fixed server step (e.g. 20-50 ms) driving `Wheel.step`; the 1 ms constant must not be copied.
- The catch-up logic keeps wall time honest but lets a slow tick fire many steps back to back; with server-verified kills that burst must not double-apply a hit (row 19 replay needs deterministic step counts).
- The wheel schedules callbacks only. The donor's per-NPC AI, movement and combat logic that the callbacks run is not in this file (not read).
- Callbacks run on the one timer thread; one slow callback delays every other timer (the 250 ms warning at 916 is the donor's only guard).
