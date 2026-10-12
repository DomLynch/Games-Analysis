# 0ad-0ad (client-performance-memory-loading, cell 39)

Donor: `/mnt/frankendom-donors/0ad-0ad/source/ps/Loader.cpp` (with `source/ps/Loader.h`, `source/graphics/MapReader.cpp`, `source/main.cpp`) | Licence: GPL-2.0-or-later (per the header of `source/ps/Loader.cpp` lines 5-7: "either version 2 of the License, or (at your option) any later version"; the tree ships `license_gpl-2.0.txt`) | C++ | symbol `LDR_ProgressiveLoad`

Checked: `LDR_ProgressiveLoad` (Loader.cpp 182-292) and `HaveTimeForNextTask` (144-162) read in full; `LDR_BeginRegistering`, `LDR_Register`, `LDR_EndRegistering`, `LDR_Cancel` (91-140) and `LDR_NonprogressiveLoad` (297-321) read; `Loader.h` read in full (overview, API, `LDR_CHECK_TIMEOUT` at 168-177). Callers: `ProgressiveLoad` in `source/main.cpp` (303-345, called once per main-loop pass at line 404; the budget is passed at 311). Task registrations read: `CMapReader` (MapReader.cpp 120-151 and the tasks at 209-268 only in part); `UnpackTerrain` (276-320, read in part) and `CXMLReader::ProgressiveReadEntities` (1228-1244, read in part; its registration was not read). Not read: `RendererIncrementalLoad` (main.cpp 349-), `GameView.cpp` 212-218 registrations, `source/graphics/TextureConverter.h` (asynchronous texture conversion), `source/lib/allocators/pool.cpp` (a pool allocator, not studied for this topic). Confidence: high on the queue and admission rule (read line by line); high that the donor tasks use a 200 ms window; the real overrun in play was not measured. Not run.

## 1. Mechanism

- A single-thread FIFO load queue. Work is split into tasks that are registered before a load starts: `LDR_Register(func, description, estimated_ms)` (108-113). The loader closes the queue with `LDR_EndRegistering` (118-128), which sums the estimates into `total_estimated_duration`.
- Each main-loop pass calls `LDR_ProgressiveLoad` with a slice budget of 10 ms (main.cpp 311, `10e-3`). The first call after registration does no work (188-197), so one frame is drawn before the first slice.
- Inside a slice (`time_left` starts at the budget, 186): for the front task, `HaveTimeForNextTask` decides whether to start it (209). It refuses when no time is left (147-148). It always admits the first task of a slice (152-153). For later tasks it admits only when `time_left + estimate <= budget * 1.20` (158-159), i.e. the task is expected to end within 20 percent over the budget. The estimate is converted from ms to seconds (157).
- The task is called with the remaining slice time (217: `lr.func(time_left)`), and the elapsed time is taken off `time_left` (219-220).
- Return codes (84): 0 means finished, 1 to 100 means the task stopped at its own slice end and reports its progress in percent, a negative value is an error. A finished or failed task is popped (224-229). An interrupted task stays at the front and runs again next slice; the progress for it is its estimate times its reported percent (240-241).
- Progress is the tally of finished estimates plus the credit for the interrupted task, divided by the total (233-244). Errors stop the slice (257-261) and the failed task is already popped.
- Tasks yield on their own clock in the donor: the lambdas take an unnamed `const double` (MapReader.cpp 127, 145), so they never read the slice budget. `UnpackTerrain` sets `end_time = timer_Time() + 200e-3` (280) and the macro `LDR_CHECK_TIMEOUT` returns the percent when `timer_Time() > end_time` (Loader.h 168-177; used at MapReader.cpp 312). `ProgressiveReadEntities` does the same with 200 ms (1232).

## 2. Key functions

- `LDR_ProgressiveLoad`: `/mnt/frankendom-donors/0ad-0ad/source/ps/Loader.cpp` 182-292. The slice loop: first-call skip, admission, call, bill, pop or keep, progress, return.
- `HaveTimeForNextTask`: `/mnt/frankendom-donors/0ad-0ad/source/ps/Loader.cpp` 144-162. The admission rule: no time left, first task always, otherwise end within 1.20 of the budget.
- `LDR_Register` and `LDR_EndRegistering`: `/mnt/frankendom-donors/0ad-0ad/source/ps/Loader.cpp` 108-128. Registration order is the run order; the total is fixed at close.
- `ProgressiveLoad` (caller): `/mnt/frankendom-donors/0ad-0ad/source/main.cpp` 303-345. Passes `10e-3`, starts the game on `ALL_COMPLETE`, shows progress on the loading screen (344).
- `LDR_CHECK_TIMEOUT`: `/mnt/frankendom-donors/0ad-0ad/source/ps/Loader.h` 168-177. Per-item timeout inside a task; returns the completed share as the percent.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Slice budget per frame | 10 ms (main.cpp 311, `10e-3`) |
| Admission slack: a task may end up to 20 percent over the slice | 1.20 (Loader.cpp 158) |
| Estimate per task, in ms, from one reference machine | 50 ms for the script-settings and player-settings tasks (MapReader.cpp 130 and 138-141); 1200 ms for `UnpackMap` (148). Estimates "derived from timings on one machine" (Loader.h 57). |
| Per-task yield window used in practice | 200 ms (MapReader.cpp 280 and 1232), not the slice budget. See Gaps. |
| Non-progressive full load | 100 s budget in seconds (Loader.cpp 299, comment says it is large so no function times out). |
| Interruption codes | 1 to 100 = interrupted with that percent; 0 = done; negative = error (Loader.cpp 84). |

Consequence of the donor's numbers: a second task in a slice is admitted only if its estimate is at most 12 ms (`timeLeft + estimate <= 10 ms * 1.2` with `timeLeft` at least 0). Every task read (50 ms or 1200 ms) therefore runs alone in its slice, whatever it actually takes. The 10 ms budget only orders work when the estimates are short.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (first-call skip, admission, task call with a deadline, bill, pop or keep at the front, progress, error stop). It replaces the `time_left == time_budget` test with a `startedThisSlice` flag, because a clock reading never equals the budget exactly. It passes the slice's absolute end time into each task, so a task stops at the slice end; the donor's tasks use their own 200 ms window instead (this is the fix for defect 1). It computes progress before the first task (the donor starts it at 0). It omits: the donor's `LDR_Cancel` path, the state machine (IDLE, REGISTERING), the description buffer, the per-task debug log, and the coroutine state inside each task (the task owns its own state, as the donor's MapReader does with member counters). The clock is injected, so the sketch can run with a fake clock.

```ts
// Licence: GPL-2.0-or-later (donor, source/ps/Loader.cpp header). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// A task returns 0 when finished, a percent 1..100 when it stopped at its slice end, or a negative code on error.
interface LoadTask {
  description: string;
  estimatedMs: number;                       // registered estimate, used for admission and progress
  run(sliceEndsAt: number): number;          // must stop by sliceEndsAt and keep its own state between calls
}

interface LoaderState {
  queue: LoadTask[];
  tallyMs: number;                           // estimated time of finished tasks
  totalMs: number;                           // sum of all registered estimates
  firstCall: boolean;                        // the first slice after registration does no work
  active: boolean;
}

interface SliceReport {
  done: boolean;
  progress: number;                          // 0..1, monotonic
  nextDescription: string;
  error?: number;
}

// Admit the next task only if it is expected to end within 20 percent over the budget.
// The first task of a slice is always admitted, so every slice makes progress.
function admit(timeLeftMs: number, budgetMs: number, estimateMs: number, startedThisSlice: boolean): boolean {
  if (timeLeftMs <= 0) return false;
  if (!startedThisSlice) return true;
  return timeLeftMs + estimateMs <= budgetMs * 1.2;
}

function report(st: LoaderState, progress: number, done: boolean, error?: number): SliceReport {
  const next = st.queue.length > 0 ? st.queue[0].description : "";
  return error === undefined ? { done, progress, nextDescription: next } : { done, progress, nextDescription: next, error };
}

function progressiveLoad(st: LoaderState, budgetMs: number, clock: () => number): SliceReport {
  if (st.firstCall) {
    st.firstCall = false;                    // let one frame draw before the first slice
    return report(st, 0, false);
  }
  if (!st.active) return report(st, 1, true);

  const sliceEndsAt = clock() + budgetMs;
  let startedThisSlice = false;
  let progress = st.totalMs > 0 ? st.tallyMs / st.totalMs : 0;

  while (st.queue.length > 0) {
    const task = st.queue[0];
    const timeLeft = sliceEndsAt - clock();
    if (!admit(timeLeft, budgetMs, task.estimatedMs, startedThisSlice)) break;
    startedThisSlice = true;

    const status = task.run(sliceEndsAt);
    const interrupted = status > 0 && status <= 100;

    if (!interrupted) {                      // finished or failed: leave the queue
      st.queue.shift();
      st.tallyMs += task.estimatedMs;
    }
    if (st.totalMs > 0) {
      let current = st.tallyMs;
      if (interrupted) current += task.estimatedMs * (status / 100);   // credit the part the task reports
      progress = current / st.totalMs;
    }
    if (interrupted) break;                  // resumes at the front on the next slice
    if (status < 0) return report(st, progress, false, status);
  }

  if (st.queue.length === 0) {
    st.active = false;
    return report(st, 1, true);
  }
  return report(st, progress, false);
}

// Registration helper: the total is fixed once the queue is closed.
function openLoad(tasks: LoadTask[]): LoaderState {
  const totalMs = tasks.reduce((sum, t) => sum + t.estimatedMs, 0);
  return { queue: tasks.slice(), tallyMs: 0, totalMs, firstCall: true, active: true };
}
```

## 5. Lands in

- TARGET `origins/client/zone-load.ts` (new): the sliced loader that a zone uses to load its textures, meshes and spawn tables in frame-sized slices. The server does not load art. Parity-checklist row 20 (catalogue as runtime source), the nearest row: no row covers asset streaming; see Gaps.
- today: the Frankendom client loads zones in one call (not read in this pass).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)

Best transferable idea: a zone load is a queue of registered tasks, each one a resumable step that gets the slice end, so the frame stays under budget and the progress bar only moves forward.
Decision (proposed): adapt - take the queue, the admission rule and the resume-at-front rule; change the donor's per-task 200 ms window to the slice end (defect 1), and replace the one-machine estimates with measured averages (defect 2).
Acceptance: while a zone loads, no task runs past its slice end (a fake-clock test fails if any `run` returns after `sliceEndsAt`), and the progress bar never goes backwards.

Brief rule served: zones as data (the loader is generic; zone data registers its own tasks); one engine (the same loader serves the Pit and the zones, so the Pit is a client and gets no separate path).

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism; no donor line is translated.
- Defect 1, tasks ignore the budget: the donor's lambdas take an unnamed `const double` (MapReader.cpp 127, 145) and `UnpackTerrain` yields after its own 200 ms (280). Each loader call can therefore stall the main loop for up to about 200 ms plus one item, while the slice budget is 10 ms (main.cpp 311). The loading screen is shown, so the cost is a stuttering progress bar, not a dropped frame in play. fix: pass the slice end into the task (the sketch does). The donor comment (278-279) says the 200 ms window was chosen to balance bar smoothness against slowing loading; the slice end gives the same balance with one knob.
- Defect 2, one-machine estimates: the estimates are timings from one reference machine (Loader.h 57). On a slower browser the admission rule admits too much; on a faster one, too little. The donor's own comment says only smoothness suffers. fix: keep a running average of the measured time per task and use it in admission (not in the sketch).
- Tasks over 500 ms need the task to yield inside (Loader.h 66-67, and the donor's per-item `LDR_CHECK_TIMEOUT`). A single item that is slow still stalls the slice. fix: keep items small in zone data (one texture or one mesh per item).
- Two incremental loaders: the main loop also calls `RendererIncrementalLoad` (main.cpp 406, not read). If it has its own budget, the frame budget is split across two loaders. Check before adopting.
- Parity row fit: row 20 covers the catalogue as a runtime source, not streaming. The row to add is "zone asset streaming: sliced loader, 10 ms slice, progress never goes back" (proposed, not in the checklist).
- Web target: the donor's loader is single-threaded by design, which matches a browser main thread. Workers and WASM decode (topic web-specific) are not covered by this note.
- Not run: the sketch is typechecked only (`tsc --strict`, ES2020); behaviour claims come from reading the donor.
