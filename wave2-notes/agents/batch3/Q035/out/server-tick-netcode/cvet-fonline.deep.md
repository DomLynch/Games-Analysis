# cvet-fonline (server-tick-netcode, cell 1)

Donor: `/mnt/frankendom-donors/cvet-fonline/Source/Server/WorkerPool.cpp` | Licence: MIT (`/mnt/frankendom-donors/cvet-fonline/LICENSE` line 1 "MIT License", copyright 2006 - 2026 Anton Tsvetinskiy; same notice in the `WorkerPool.cpp` header at line 11) | C++ | symbol `WorkerPool::WorkerEntry`

Checked: Read in full: keyed submit/wake/worker loop in `WorkerPool.cpp` 115-192 and 378-533; `Server.cpp` 803-836, 925-956, 1496-1525, 2300-2360, 3608-3661, 4502-4560, 4910-5005; `ServerConnection.cpp` 424-475; `Movement.cpp` 82-90 and 408-446; `Settings.inc` 128, 419-422. Callers checked: keyed Submit has four call sites (Server.cpp 776, 858, 922, 4945) and Wake has two data-arrival sites (847, 920). Not read: `WorkerPool::Cancel` body (195-242), Pause/Resume/Clear/WaitIdle, the network thread files (`NetworkServer-*.cpp`), `ServerEngine::Lock` (1268), `EvaluateLateCatchUp`, the rest of `ProcessCritterMovingBySteps` after 4560. Confidence: high on the scheduler order of operations (read end to end, and the sketch follows it); medium on the lease catch-up path, which is only summarised in section 1. Important: this engine has no fixed-step server tick. Time is wall clock. Not a camera cell.

Best transferable idea: a keyed job queue where each player's intake job re-arms at a poll period and is woken early by data arrival, with a per-pass message cap, gives a fast server a bounded input latency without a fixed loop.

Decision (proposed): adapt - keep the keyed queue, wake-on-data and the per-pass cap for player input intake, but drive the fight step on a fixed server tick, never on wall clock, and never let a key slot replace a pending hit.
Acceptance: a server test sends 1000 inputs in one burst: at most 256 are handled in the first pass, the rest in later passes, and an input that arrives during the 100 ms wait is handled at once (before 100 ms), while a hit submitted while the same fight job is running is not lost.

## 1. Mechanism

- There is no fixed-step server loop. Server work is keyed jobs on a worker pool (`WorkerPool`), sorted by fire time. A job returns the delay until its next run (`next_delay = job.Body();`, WorkerPool.cpp:481); returning nothing ends it (518).
- Two periodic engine jobs run on the main worker. `SyncPointJob` returns `SyncPeriodMs` (10 ms, Server.cpp:829) and calls `SyncPoint()`. `FrameTimeJob` returns `FrameTimePeriodNs` (900 ns, Server.cpp:836) and refreshes the cached frame time. The 900 ns re-arm is close to a busy poll (inference, not measured). Frame time is wall clock. `BaseEngine::FrameAdvance` calls `GameTime.FrameAdvance` with `clamp_to_cap` true only under a debugger or with networking disabled (EngineBase.cpp:1167), so a normal server runs variable step.
- `SyncPoint()` (Server.cpp:1496-1525): when a sync is requested it pauses the pool (1506), signals the requester and waits until released, then resumes (1522). The comment at 1503-1504 says this is needed because parking the main worker alone would let pool jobs keep changing entities.
- Player intake. Each logged-in player has one keyed job (`PlayerJob`, Server.cpp:922, 925-956). It runs `ProcessConnection` (inactivity timeout and ping, 2363-2408) then `ProcessPlayer`. `ProcessPlayer` drains messages until `MaxMessagesPerProcessPass` (256, Server.cpp:2302-2306; Settings.inc:128) and then returns `ConnectionProcessPeriodMs` (100 ms, Server.cpp:956) whether or not messages were left over.
- Wake on data. The player's data-arrived callback calls `WorkerPool::Wake(key)` (Server.cpp:920). `ServerConnection::AsyncReceiveData` copies the callback under the input lock (466) and calls it after the bytes are added (474-475). If the player job is queued, Wake pulls it out and re-inserts it at the scheduling time (WorkerPool.cpp:159-172), so it runs at once. If it is running, Wake sets a request (183), and when the body returns the self-reschedule delay becomes zero (504, 519).
- Key rules (WorkerPool.cpp:131-137, 504-533). Submit with a key that is queued is ignored, so the earlier fire time stands (135). Submit with a key that is running stores a pending rerun (132) that replaces any earlier pending rerun's body and delay. When a pending rerun exists it takes precedence over the self-reschedule (506). If a wake was requested the rerun fires at the scheduling time (510-511).
- Leftovers. After the 256 cap the job still returns 100 ms, and a wake comes only from new data. So leftover messages wait up to 100 ms unless more data arrives. The cap and the 100 ms re-poll are one pair.
- Movement. Each moving critter has its own keyed job (`CritterMovingJob`, Server.cpp:4945, 4953-5004) that returns `CritterMovingPeriodMs` (50 ms, 5004). `ProcessCritterMovingBySteps` reads the cached frame time as its clock (4538) and advances the elapsed time to the next hex boundary (4550). `UpdateCurrentTimeToNextHex` bisects for that boundary with 20 iterations (Movement.cpp:434). Position is derived from elapsed time at each job, not integrated per tick. No per-tick budget across critters was found in the server code; each critter is its own job.
- Held-input lease (not sketched). `MovingContext::HoldAtLease` (Movement.cpp:82-90) clamps the elapsed clock to the lease once it passes it, and pushes `_offsetTime` back by the overrun, so the clock stays pinned at the lease. `Process_MoveLease` (Server.cpp:3608-3661) accepts a renewal only if its lease is longer (3654), then sets it (3658). A late catch-up fast-forward follows, with `EvaluateLateCatchUp` not read.

## 2. Key functions

- `WorkerPool::Submit(JobKey, timespan, Job)`: `/mnt/frankendom-donors/cvet-fonline/Source/Server/WorkerPool.cpp` 115-145. Running key gets a pending rerun; queued key is ignored; otherwise enqueue.
- `WorkerPool::Wake(JobKey)`: `/mnt/frankendom-donors/cvet-fonline/Source/Server/WorkerPool.cpp` 147-192. Queued: move to now. Running: flag a request.
- `WorkerPool::EnqueueJob`: `/mnt/frankendom-donors/cvet-fonline/Source/Server/WorkerPool.cpp` 378-399. Sorted insert by fire time, with a tail fast path (386).
- `WorkerPool::WorkerEntry`: `/mnt/frankendom-donors/cvet-fonline/Source/Server/WorkerPool.cpp` 416-533. Pop the earliest job (447), run its body (481), then decide pending rerun, wake-zeroed reschedule, or stop (504-533).
- `ServerEngine::PlayerJob`: `/mnt/frankendom-donors/cvet-fonline/Source/Server/Server.cpp` 925-956. Connection step, player step, return the poll period.
- `ServerEngine::ProcessPlayer` message drain: `/mnt/frankendom-donors/cvet-fonline/Source/Server/Server.cpp` 2300-2360. Cap at 2302-2306.
- `ServerEngine::SyncPointJob` and `SyncPoint`: `/mnt/frankendom-donors/cvet-fonline/Source/Server/Server.cpp` 803-830 and 1496-1525.
- `ServerConnection::AsyncReceiveData` callback: `/mnt/frankendom-donors/cvet-fonline/Source/Server/ServerConnection.cpp` 466-475.
- `MovingContext::HoldAtLease`: `/mnt/frankendom-donors/cvet-fonline/Source/Common/Movement.cpp` 82-90.
- `ServerEngine::CritterMovingJob`: `/mnt/frankendom-donors/cvet-fonline/Source/Server/Server.cpp` 4953-5005.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Keyed job queue sorted by fire time; a job returns its next delay | None (the rule is the shape) |
| Player re-poll at a fixed period, woken early by data arrival | 100 ms (theirs, Settings.inc:421) |
| Cap messages per pass so one client cannot take a worker | 256 messages (theirs, Settings.inc:128) |
| Sync point and frame time on their own periodic jobs | 10 ms (theirs, Settings.inc:419); 900 ns (theirs, Settings.inc:420) |
| Per-critter movement step job | 50 ms (theirs, Settings.inc:422) |
| Lease clamp for held movement; server accepts only a longer lease | Lease length is set by the client's renewal (Server.cpp:3654) |
| Submit while running replaces the pending rerun | None (WorkerPool.cpp:132) |

## 4. TypeScript sketch

simplified: the sketch runs jobs on one thread in `runDue()` where the donor uses a worker pool, and it omits the lock, the cancel-on-finish set, pause and resume, the frozen scheduling clock, unkeyed jobs, the sync-point stop-the-world, the not-logged-in player job, shutdown checks and per-message error handling. It keeps the donor order: a running job's pending rerun is taken before its own reschedule, and a wake during the run zeroes the reschedule delay. Typechecked on the VPS with `tsc --strict --target es2020` (exit 0).

```ts
// Licence: MIT (donor cvet-fonline, LICENSE). Clean-room sketch of the scheduling shape, written from the donor's order of operations.
type JobBody = () => number | undefined; // returns the delay in ms before the next run, or undefined to stop

interface Scheduled {
  fireAt: number;
  key: string;
  body: JobBody;
}

const MAX_MESSAGES_PER_PASS = 256; // donor default, Settings.inc:128
const POLL_MS = 100; // donor default, Settings.inc:421

class KeyedJobQueue {
  private queue: Scheduled[] = []; // sorted ascending by fireAt
  private queued = new Set<string>();
  private running = new Set<string>();
  private pendingRerun = new Map<string, Scheduled>();
  private wakeRequests = new Set<string>();

  constructor(private now: () => number) {}

  submit(key: string, delayMs: number, body: JobBody): void {
    if (this.running.has(key)) {
      this.pendingRerun.set(key, { fireAt: this.now() + delayMs, key, body });
    } else if (!this.queued.has(key)) {
      this.enqueue({ fireAt: this.now() + delayMs, key, body });
      this.queued.add(key);
    } // already queued: the earlier submit stands
  }

  wake(key: string): boolean {
    if (this.queued.has(key)) {
      const i = this.queue.findIndex((e) => e.key === key);
      const [entry] = this.queue.splice(i, 1);
      entry.fireAt = this.now();
      this.enqueue(entry);
      return true;
    }
    if (this.running.has(key)) {
      this.wakeRequests.add(key);
      return true;
    }
    return false;
  }

  // Single-threaded stand-in for the donor's worker threads: runs every job due at now().
  runDue(): void {
    while (this.queue.length > 0 && this.queue[0].fireAt <= this.now()) {
      const job = this.queue.shift()!;
      this.queued.delete(job.key);
      this.running.add(job.key);
      const next = job.body();
      this.running.delete(job.key);

      const wake = this.wakeRequests.delete(job.key);
      const rerun = this.pendingRerun.get(job.key);
      if (rerun !== undefined) {
        this.pendingRerun.delete(job.key);
        if (wake) rerun.fireAt = this.now();
        this.enqueue(rerun);
        this.queued.add(job.key);
      } else if (next !== undefined) {
        this.enqueue({ fireAt: this.now() + (wake ? 0 : next), key: job.key, body: job.body });
        this.queued.add(job.key);
      }
    }
  }

  private enqueue(entry: Scheduled): void {
    let i = this.queue.length;
    while (i > 0 && this.queue[i - 1].fireAt > entry.fireAt) i--;
    this.queue.splice(i, 0, entry);
  }
}

// Player job body: drain up to MAX_MESSAGES_PER_PASS, then always re-arm at POLL_MS.
function makePlayerJob(pending: () => number, processOne: () => void): JobBody {
  return () => {
    let done = 0;
    while (done < MAX_MESSAGES_PER_PASS && pending() > 0) {
      processOne();
      done++;
    }
    return POLL_MS;
  };
}
```

## 5. Lands in

- TARGET `src/fight/tick.ts` (new): one keyed job scheduler for player input intake and the fixed-step fight job. Parity-checklist row 18 (loot roll and XP award) with the sub-line "server tick: fixed step, input intake, per-tick NPC budget"; input intake is row 5.
- Reuse tag: adapt-allowed (MIT: keep the copyright and licence notice if any code is copied; this sketch is written from the shape).
- Brief rule served: 1 (one engine: one scheduler for intake and fight steps); rule 8 (server-verified) noted in section 6.

## 6. Gaps and risks

- Wall clock vs fixed step. The donor's frame time is wall clock and its movement derives position from that clock. Frankendom's server-verified kills need a fixed server step, so a late job must not compress hits. Use this scheduler for intake and the fixed step only.
- Pending rerun overwrite. `WorkerPool.cpp:132` replaces any earlier pending body and delay for the same key. A hit or a ledger entry must never go in a key slot; it goes in the one ledger queue. Frankendom must test that two hits in one fight step both land.
- Leftover latency. A flood beyond the 256 cap waits up to 100 ms unless new data arrives (Server.cpp:956 with 2306). For fast duels that bound is too slow. Frankendom should drain the cap again at once, or make the cap a per-tick budget, and keep the 100 ms only for idle players.
- No per-tick NPC budget. The donor has no shared per-tick budget across critters: each critter is its own job (Server.cpp:4945). MAX_ATTACKERS = 3 has no counterpart here, and the 256 cap is a message cap, not an attacker cap. The per-tick NPC budget must be written, not copied.
- Zones as data. All four periods and the cap are engine constants in the donor (Settings.inc:128, 419-422). Frankendom should keep the tick, cap and poll as engine constants, not zone data.
- Threads and locks. The donor needs a stop-the-world sync point (Server.cpp:1496-1525) because many workers touch entities. Frankendom's single engine does not need that; do not port the pause machinery.
- The lease catch-up (`EvaluateLateCatchUp`) was not read. Do not copy the lease rule into a fight without reading it.
- Camera: not applicable.

Reuse tag: adapt-allowed (MIT, notice kept)
Brief rule served: 1 (one engine: one scheduler for intake and fight steps)



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code.

**Errors / corrections:** WorkerPool Submit/Wake/WorkerEntry rules (queued key ignored, running key replaces pending rerun, wake zeroes reschedule, pending rerun precedence), PlayerJob returns ConnectionProcessPeriodMs, 256 cap at Server.cpp 2302, Settings.inc 128/419-422, HoldAtLease, lease only-longer rule at 3654, SyncPoint pause/resume, bisection, MIT licence all match.

**Missed:** Submit-on-running also erases _cancelOnFinish (WorkerPool.cpp 133); Server.cpp 3896 MoveFinishCatchUpMaxMs catch-up cap is the part the note left as EvaluateLateCatchUp unread. Minor.
