# Anuken-Mindustry (client-performance-memory-loading, cell 1)

Donor: `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/ClientLauncher.java` | Licence: GPL-3.0 (LICENSE file: "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007") | Java | symbol `ClientLauncher.update`

Checked: Read `update()` (217-282) and `init()` (292-294) in full, and `core/PerfCounter.java` (116 lines) in full. Confidence high on the frame-pacing order. Not read: the callers of `update()` (arc's application loop, not in the box), the `ios` flag, arc's `Threads.sleep`, `Time.nanos`, and `AssetManager.update` (arc library). `Damage.java` pool lines were seen by grep only (surrounding function not read). Camera: not a camera cell. Second-look mechanisms in the same cell are listed in section 1 but not sketched.

## 1. Mechanism

- Entry: `update()` is the per-frame method of `ClientLauncher` (217). It runs the frame cap and the work, then sleeps.
- Order of steps:
  (a) Read the cap: `targetfps = ios ? 0 : Core.settings.getInt("fpscap", 120)` (220). Capped only if `0 < targetfps <= 240` (222). `changed` means the cap differs from the value stored last frame (221, stored at 224).
  (b) Advance the schedule: if capped and not changed, `nextFrame += 1e9 / targetfps` nanoseconds (226-227). Otherwise `nextFrame = Time.nanos()` (229): an uncapped frame or a cap change re-anchors the schedule to now, so there is no catch-up after a change.
  (c) Work: while loading (`!finished`), the loading screen draws (`loader.draw()`) and `assets.update(1000 / loadingFPS)` gets a 50 ms slice of asset work per frame (236; `loadingFPS = 20` at 32). When assets finish, `finished = true`, the load event fires, and modules initialise (237-248 region, read in part). After load, each frame runs `asyncCore.begin(); super.update(); asyncCore.end();` (257-261). The frame cap applies in both paths: the pacing block is outside the if/else.
  (d) Pace: if capped, `current = Time.nanos()`; if `nextFrame > current`, sleep for `nextFrame - current` via `Threads.sleep` (264-268). An overrunning frame gets no sleep.
  (e) Timing bookkeeping (272-282): `PerfCounter.update.end()`, then the "other" bucket = update time minus the displayed sub-counters, then every counter's `checkUpdate()`.
- Net effect: frame k ends at roughly `t_init + k * period`, where `t_init` is the time `init()` set (293). A frame that overruns is not paced, and nothing re-anchors the schedule. The donor therefore has no clamp: after a long hitch the schedule stays behind until it catches up, so several following frames run back to back (see section 6).
- Second mechanism in the same cell (read, not sketched): `PerfCounter` (core/PerfCounter.java). Each counter keeps a windowed mean of 120 samples (38) and adds a zero sample on any frame it was not updated (72-74). The HUD reads `valueMs()`, which refreshes its value only every 100 ms (39, 96-102), so the number does not jitter.
- Third (read, not sketched): texture budget by GL limit. `maxTextureSize = Gl.getInt(Gl.maxTextureSize)` at launch (55). The full atlas loads only at `>= 4096`; otherwise the fallback atlas loads (160). A warning says the minimum recommended is 4096 (73).
- Fourth (grep only): `Damage.java` takes collision records from a pool per query (`collidePool.obtain()`, 271) and returns them all with `collidePool.freeAll(collided)` (329). Surrounding function not read.

## 2. Key functions

- `ClientLauncher.update` (217-282): `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/ClientLauncher.java` 217-282. Pacer at 220-229 and 264-268; loading slice at 236; counters at 272-282.
- `ClientLauncher.init` (292-294): `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/ClientLauncher.java` 292-294. Anchors the schedule at init.
- `PerfCounter` (enum, 8-116): `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/core/PerfCounter.java`. Windowed mean 120 (38); refresh 100 ms (39); `checkUpdate` 72-76; `valueMs` 96-102.
- `Damage` collision pool (grep only): `/mnt/frankendom-donors/Anuken-Mindustry/core/src/mindustry/entities/Damage.java` 33, 271, 329.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed-period schedule: advance by one period per frame, sleep the remainder, re-anchor on setting change or uncapped | Default cap 120 fps (220); cap accepted only up to 240 (222); a value above 240 means uncapped, not clamped |
| Loading in time slices: give asset work a fixed millisecond budget per frame | 50 ms slice = 1000 / 20 (236, 32) |
| Pick a texture set from the GPU max texture size | Threshold 4096 px (160; warning 73) |
| Windowed mean with zero-fill, and a display value refreshed on an interval | Window 120 samples (38); refresh 100 ms (39) |
| Pool records; hand them all back in one call (`freeAll`, 329; grep only) | None (the pool is `Pools.get`, 33) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (`beginFrame` advances or re-anchors, then the work runs, then `endFrameWaitMs` gives the wait). It omits the real timer (the caller must schedule the next frame after the returned wait), the async core, the `ios` flag, and the `PerfCounter` bookkeeping; it keeps the 240 cap rule and the uncapped value 0. It adds one change: an overrun clamp (`fix:` line) that re-anchors the schedule when it is more than one period behind, so a hitch is not followed by back-to-back frames. `loadSlice` is a queue of steps with no dependencies and no async decode; arc's AssetManager (not read) does more.

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

interface PacerState {
  nextFrameMs: number;    // schedule anchor on a monotonic clock, in ms
  lastTargetFps: number;  // -1 = not set yet
}

function newPacer(nowMs: number): PacerState {
  return { nextFrameMs: nowMs, lastTargetFps: -1 };
}

// Start of frame. A target of 0 or above 240 means uncapped. A changed target re-anchors the schedule to now.
function beginFrame(s: PacerState, nowMs: number, targetFps: number): void {
  const limit = targetFps > 0 && targetFps <= 240;
  const changed = s.lastTargetFps !== targetFps && s.lastTargetFps !== -1;
  s.lastTargetFps = targetFps;
  if (limit && !changed) {
    s.nextFrameMs += 1000 / targetFps;   // advance the schedule by one period
  } else {
    s.nextFrameMs = nowMs;               // uncapped or just changed: no catch-up
  }
}

// End of frame. Returns ms to wait before the next frame (0 = run now).
// Fix over the donor: if a long frame left the schedule more than one period behind, re-anchor to now,
// so the next frames are not all run back to back without a wait.
function endFrameWaitMs(s: PacerState, nowMs: number, targetFps: number): number {
  const limit = targetFps > 0 && targetFps <= 240;
  if (!limit) return 0;
  const period = 1000 / targetFps;
  if (s.nextFrameMs < nowMs - period) s.nextFrameMs = nowMs;   // fix: clamp the catch-up
  return Math.max(0, s.nextFrameMs - nowMs);
}

// Time-sliced loading: run queued load steps until the slice (50 ms, i.e. 1000 / 20, per loading frame) is used.
// Each step returns true when that item is finished. Returns true when the queue is empty.
function loadSlice(queue: Array<() => boolean>, sliceMs: number, nowMs: () => number): boolean {
  const end = nowMs() + sliceMs;
  while (queue.length > 0 && nowMs() < end) {
    const step = queue[0];
    if (step()) queue.shift();
  }
  return queue.length === 0;
}

// Usage sketch (not part of the donor): frame = beginFrame; work; wait = endFrameWaitMs; schedule the next frame after wait ms.
const pacer = newPacer(0);
beginFrame(pacer, 0, 30);
const waitMs = endFrameWaitMs(pacer, 5, 30);
const done = loadSlice([() => true], 50, () => 0);
console.log(waitMs, done);
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, with `export {};` appended, exit 0, no output. (The Mac-side post-write hook reported tsc and eslint as unavailable there; the real check is the VPS run.)

Best transferable idea: Cap the client frame rate with a single schedule anchor that advances by a fixed period and re-anchors when the setting changes, and give each loading frame a fixed millisecond slice of asset work.

Decision (proposed): adapt — keep the player and device fps cap and the time-sliced loading, but replace the thread sleep with a requestAnimationFrame gate and add the overrun clamp the donor lacks; a fixed cap would also save battery and heat on a phone.
Acceptance: A Vitest on the pacer: at a 30 fps target, 10 s of simulated frames gives 300 ± 3 frame starts; after a 200 ms stall, at most one frame runs back to back and the frame after it waits up to one period (33 ms) before starting.

## 5. Lands in

- TARGET `origins/client/frame-pacer.ts` (new module; client only). The engine `src/fight` owns no frame timing, and the server tick is a separate fixed step (see row 18 sub-line "server tick: fixed step, input intake, per-tick NPC budget").
- Parity-checklist row 16 (colour grade / quality). The cell hint said row 12, but row 12 is combat sound cues, which this mechanism does not touch, so row 16 is used.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (client-only, no engine change); rule 8 (target file and row named); camera and Pit rules n/a.

## 6. Gaps and risks

- GPL-3.0 is copyleft: clean-room only. The sketch is written from the described steps, not translated.
- The donor sleeps a thread (`Threads.sleep`, arc, not read). A browser cannot sleep a frame. `requestAnimationFrame` already runs at display rate, so a cap below 60 needs a gate that skips rAF work until the next scheduled time (or a `setTimeout` for the wait). The pacer returns a wait in ms; the platform adapter must schedule it.
- Overrun: the donor has no clamp. After a hitch the next frames run back to back until the schedule catches up. The code does not say whether that is intended catch-up. The sketch clamps it (fix above). Test it before use.
- Phone numbers are not measured. Proposed for Frankendom, untested: default 60 fps, a 30 fps cap when battery saver or thermal pressure is reported. The donor's default of 120 is a desktop value. Cap above 240 is treated as uncapped in the donor, so Frankendom should clamp instead.
- Loading: arc's AssetManager (dependencies, async decode) is not read. The 50 ms slice is the donor's number; a phone may need a smaller slice while the zone is streaming.
- The `PerfCounter` split (per-subsystem timing, 120-sample window, 100 ms display refresh) is a profiling hook. It is useful for the Frankendom HUD debug panel but is not needed for the fight.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: All checked claims hold: ClientLauncher.java update 217-282, targetfps 120 default/240 limit (220-222), nextFrame advance/re-anchor (226-229), assets.update(1000/loadingFPS) at 236 with loadingFPS=20 at 32, sleep block 264-268, init 292-293, PerfCounter meanWindow 120 (38) and refresh 100 ms (39), checkUpdate zero-fill 72-74, valueMs 96-102, texture threshold 4096 at 160 and warning at 73, Damage pool 33/271/329, licence GPL-3. No-clamp-on-overrun claim is true. Sketch loadSlice is looser than arc (disclosed). Acceptance test is satisfiable by the sketch.
Missed: Donor sets 'ios' uncapped (220) which note mentions; no real miss. Minor: 'a cap change re-anchors' also means the first frame after a change gets no sleep adjustment, not mentioned.
