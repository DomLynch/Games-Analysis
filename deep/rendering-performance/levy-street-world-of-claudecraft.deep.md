# levy-street-world-of-claudecraft (rendering-performance, cell 17)

Donor: /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/background_gpu_queue.ts | Licence: MIT | TypeScript | symbol createBackgroundGpuQueue

## 1. Mechanism
- A caller enqueues a unit of GPU work with `run(work, priority, label, options)`. Priorities are integers from `GPU_WORK_PRIORITY` (lines 100-122): BOOT_RESUME 0, BACKGROUND 10, TAIL_PIECE 12, BOOT_DEBT 15, VISIBLE_PREWARM 20, LIVE_VIEW 30, ACTIONABLE_VIEW 40. The default is BACKGROUND.
- `run` pushes the unit into `pending` with a FIFO `order` number (also stamping enqueue time, whether the loop is parked on the tail cap, and `deferredFrames` 0), schedules the drain loop with `Promise.resolve().then(drain)` (no-op if already active), and wakes any admission park. It returns a Promise that resolves with the work's result.
- The drain loop starts one unit at a time. It picks the highest priority, FIFO within a priority. Admission only gates when a policy was passed in `opts.admission` AND `noteFrame` has been called at least once; otherwise selection is plain priority/FIFO. When armed, each candidate is asked to `admit`; a refused candidate is marked with the selection pass, skipped for the rest of that pass, flagged `refusedAdmission`, and ages in frames via `noteFrame`. If every candidate is refused the loop parks until a frame or an arrival wakes it. After the unit's synchronous prologue returns, the loop reports its measured main-thread cost to `admission.spend`.
- Released-tail units (`releaseTail: true` in run options) keep driver work running after their sync point: if `work()` returns a thenable the queue moves the settling to `detachTail` and the loop continues, while the unit's own Promise still resolves only when its tail settles. At most `tailLimit` (default 2) tails can be waiting at once. While the cap is full the loop only starts units that hold no tail (`selectNext(tailFreeOnly)`); if none are pending it parks until a tail settles, and counts a cap park only when no tail-free candidate was pending (otherwise it counts an admission park).
- Each unit records syncMs, wallMs, waitMs (grant latency), and frameGapMs. frameGapMs is the span the unit was in flight across a frame, clamped at 5000 ms. A unit whose age reaches 4000 ms is recorded as a stall (evaluated in `noteStall`, called at settle and at each `stats()` read, so a never-settling unit still shows up). Top-N lists are kept for slowest, blockiest, stalls and longest waits.
- The host calls `noteFrame(atMs)` once per frame. That ages refused candidates and wakes the loop.
- Shutdown: `shutdown()` rejects every pending unit with the GpuQueueShutdown error and wakes any parked loop; later `run` calls reject with the same error. The shutdown promise resolves once the queue is idle (not accepting, loop inactive, nothing pending, no waiting tails).
- Output: resolved Promises per unit, and `stats()` for diagnostics. There is no server path.

## 2. Key functions
- `GPU_WORK_PRIORITY` - /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/background_gpu_queue.ts lines 100-122. Priority ladder.
- `GpuWorkAdmission` interface - same file lines 137-154. The per-frame budget seam (`admit`, `agesDeferral`).
- `createBackgroundGpuQueue` - same file lines 453-1048. Factory (`return {` at 891); returns `{ run, noteFrame, stats, shutdown }` (run 892-925, noteFrame 926-977, stats 978-1032, shutdown 1033-1047).
- `outranks` - same file lines 690-691. Priority then FIFO comparison.
- `selectNext` - same file lines 723-757 (takes a `tailFreeOnly` flag). Picks the next unit; unarmed path is plain priority/FIFO, armed path marks refused candidates with the selection pass.
- `drain` - same file lines 759-883. The serial loop: cap check, select, splice, start, settle.
- `recordUnit` - same file lines 581-636. Writes per-unit stats and the frame-gap bookkeeping.
- `run` (returned method) - same file lines 892-925. Enqueue plus wake.
- `detachTail` - same file lines 647-680. Moves a released unit's settling tail into `waitingTails`; its settle callback frees the cap slot, calls `recordUnit`, resolves the public promise and wakes the parked loop.
- `noteStall` - same file lines 524-540. Stall threshold check.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Serial drain with priority then FIFO selection | Priority values 0, 10, 12, 15, 20, 30, 40 (theirs, lines 100-122) |
| Cap on concurrent released tails, tail-free units still allowed | tailLimit 2 (theirs, DEFAULT_TAIL_LIMIT line 421) |
| Per-frame admission with aging of refused work | Admission is a host policy; no default budget in this file |
| Stall detection by wall time | stallMs 4000 (theirs, line 415), stallLimit 8 (theirs, line 416) |
| Frame-gap clamp so one blocked unit cannot dominate the metric | frameGapIgnoreMs 5000 (theirs, line 427) |
| Bounded top-N diagnostic lists | slowestLimit 20 (theirs, line 409; also bounds blockiest and longestWaits) |

## 4. TypeScript sketch
Sketch type: lift (MIT donor). The priority selection and admission-refusal path are taken from the donor and simplified; the donor path is cited in the sketch.

simplified: omits the donor's unarmed fast path (no admission or no frame seen yet), the `tailFreeOnly` flag and tail cap, `releaseTail`/`detachTail`, the `admission.spend` report, `agesDeferral`, the parked drain loop and async scheduling, shutdown, and all stats; `drainOne` stands in for the async `drain` loop; admission here is a bare callback instead of the donor's `GpuWorkAdmission` object.

```ts
// Licence: MIT
// Lifted from /mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/background_gpu_queue.ts (outranks, selectNext), simplified.
type Unit = { order: number; priority: number; work: () => void; refused: boolean; refusedPass: number; deferredFrames: number };

export function createQueue(admit: (u: Unit) => boolean) {
  const pending: Unit[] = [];
  let nextOrder = 0;
  let pass = 0;
  const outranks = (a: Unit, b: Unit): boolean => a.priority > b.priority || (a.priority === b.priority && a.order < b.order);

  function selectNext(): Unit | null {
    pass++;
    for (;;) {
      let best = -1;
      for (let i = 0; i < pending.length; i++) {
        if (pending[i].refusedPass !== pass && (best < 0 || outranks(pending[i], pending[best]))) best = i;
      }
      if (best < 0) return null;
      const c = pending[best];
      if (admit(c)) { pending.splice(best, 1); return c; }
      c.refusedPass = pass;
      c.refused = true;
    }
  }

  return {
    run: (work: () => void, priority: number): void => { pending.push({ order: nextOrder++, priority, work, refused: false, refusedPass: 0, deferredFrames: 0 }); },
    drainOne: (): boolean => { const u = selectNext(); if (!u) return false; u.work(); return true; },
    noteFrame: (): void => { for (const u of pending) if (u.refused) u.deferredFrames++; },
  };
}
```

## 5. Lands in
- Frankendom file(s): TARGET src/fight/gpu-queue.ts (new module; no file exists today, the shared engine's warm-up/shader-prewarm path would call it). Today: nothing in src/ covers a GPU work queue.
- Parity-checklist row: 16 (colour grade / quality, K4) is the nearest row; the first consumer is row 8 (blood, wounds, decals: warming those programs/uploads at zone entry so the first wound is not a hitch), K5.
- Reuse tag: adapt
- Brief rule served: (category default, not per-cell) 3 (warm up at zone entry); rules 7-9 n/a

## 6. Gaps and risks
- The donor queue is for WebGL/WebGPU shader and upload work. Frankendom work that is pure CPU would not benefit from the tail-cap logic. Confirm the Frankendom renderer exposes a sync point before adopting it.
- The admission budget is a seam with no default. Without a budget the queue simply starts units in priority order, which the donor says was the behaviour before the seam existed.
- Diagnostic stats (stats(), recent window, longest waits) are large. They are not needed for the mechanism; trim before porting.
- Nothing here is server-related. One engine in src/fight, zones as data, server-verified kills: the queue is a client render concern, has no contract with the server tick or the ledger, and must not gate anything the server verifies. MAX_ATTACKERS = 3 is unrelated to its tail cap of 2 (do not conflate the numbers).
- Verified now: the whole file was opened (lines 95-160, 405-1048). Not read: lines 160-404 (type definitions, `GpuQueueShutdown` helpers) and the imported `gpu_queue_window_core`, which `recent.record/stats` call.
