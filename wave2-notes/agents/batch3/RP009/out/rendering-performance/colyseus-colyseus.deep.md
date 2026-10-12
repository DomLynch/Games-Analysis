# colyseus-colyseus (rendering-performance, cell 3)

Donor: `/mnt/frankendom-donors/colyseus-colyseus/packages/sdk/src/predict/rollback.ts` (controller, 877 lines) with `/mnt/frankendom-donors/colyseus-colyseus/packages/sdk/src/predict/Predictor.ts` (room-wide accumulator) | Licence: MIT (`LICENSE` line 3: "MIT License:", Copyright (c) 2015-2026 Endel Dreyer; code may be adapted) | TypeScript | symbols `RollbackController.tick` (547), `renderAlpha` (588), `catchUp` (618), `Predict.tick` (2233)

Checked: The hint was INFERRED. The donor is a multiplayer server and client SDK with no rendering engine: a search for culling, frustum, sprite, atlas, draw call, texture, renderer and requestAnimationFrame found no render path (the hits were a debug overlay layout, an admin UI and transport frame parsing). The rendering-performance cell is therefore covered by its frame-pacing part: the fixed step, render interpolation and correction decay that let a client draw smoothly above the simulation rate. Read: `rollback.ts` 385-470 (state), 480-500 (constructor defaults), 538-665 (tick, renderAlpha, noteRenderRead, catchUp); `Predictor.ts` 886-905 (room accumulator comments and cap), 2233-2262 (tick head); `debug/layout.ts` 1-20 (viewport signals, layout only); `PREDICTION.md` (headings only); `LICENSE` line 3. Callers: `catchUp` is documented as driven by the input handle's send hook (comment 614-617); the callers were not all traced. Not read: `Predictor.ts` 2262-3044 (the rest of the room driver), `simReconciler.ts` value/pose expression (grep only, 340-380), `reconciler.ts`, `divergence.ts`, `drift.ts`, the body of reconcile (694-790). The render formula that combines prev, current and error in `value()`/`pose()` was not read. Confidence: high on the step accumulator and the clock (read end to end); medium on the render formula (not read). camera_scope: n/a.

## 1. Mechanism

- Room-wide step count. `Predict.tick(now)` (2233) adds the real frame time to one accumulator (2241-2242), takes `floor(acc / stepMs)` fixed steps as due (2243), and caps the count at 5 per frame (902). If the count is over the cap, the accumulator is set to 0 and the backlog is dropped (2245). Otherwise the accumulator keeps the sub-step remainder (2248). The step is adopted from the first reconciler (comment 889-900); until then `tick` returns 0.
- Steps run on send. The app sends the due inputs; each send runs the predicted step at once through the input handle's send hook. `catchUp` (618-653) steps every input from `predictedSeq + 1` to `sentCount`: it saves the previous smoothed value (`snapshotPrev`, 635), runs the step (636), then consumes one step from the render clock and resyncs it into `[0, stepMs)` (649-651).
- Per-entity render clock. Each controller's `tick(now)` (547) adds frame time to `renderAcc` (556), reconciles if the server acked new input (572), then decays the visual correction (577-578) with `k = 1 - exp(-dt / smoothMs)`. Its default `smoothMs` is the patch interval, or 50 ms if none (488).
- Render alpha. `renderAlpha()` (588-592) is `clamp(renderAcc / stepMs, 0, 1)`. Alpha eases from 0 to 1 across one step and holds at 1 when stepping pauses, so a paused entity does not jump back (comment 583-587).
- Frame order the author requires (comment 600-601): `predict.tick(now)`, then send the due inputs, then read `value()` or `pose()`. A read taken while a step is due but unsent renders one step stale; the controller warns once (606-614, 620-629).

Order in one frame: real dt in; due steps counted (room); clock advanced (entity); ack reconcile (entity, if any); sends run steps and consume the clock; render reads take alpha; correction decays by dt.

## 2. Key functions

- `Predict.tick`: `/mnt/frankendom-donors/colyseus-colyseus/packages/sdk/src/predict/Predictor.ts` 2233-2262 (accumulator, cap, child drive). Cap constant 902.
- `RollbackController.tick`: `/mnt/frankendom-donors/colyseus-colyseus/packages/sdk/src/predict/rollback.ts` 547-579 (clock, reconcile, decay).
- `RollbackController.renderAlpha`: same file, 588-592.
- `RollbackController.catchUp`: same file, 618-653 (live steps on send; clock consume and resync 646-652).
- Constructor defaults: same file, 480-500 (smoothing window, step from the server rate).
- Callers: `Predict.tick` drives every child (2262 onward, not read in full).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Fixed step count from a frame accumulator | `floor(acc / stepMs)` (theirs, 2243); step from the server rate (rollback 482-500) |
| Per-frame cap, drop the backlog past it | 5 steps (theirs, Predictor 902); drop on overflow (theirs, 2245) |
| Render alpha clamped to one step | `clamp(renderAcc / stepMs, 0, 1)` (theirs, rollback 590) |
| Correction decay, frame-rate independent | `k = 1 - exp(-dt / smoothMs)` (theirs, rollback 577) |
| Correction window | patch interval, else 50 ms (theirs, rollback 488) |
| Clock resync after a pause or hitch | Subtract one step, clamp to 0, or take modulo one step (theirs, rollback 649-651) |

## 4. TypeScript sketch

simplified: keeps the donor order: the room accumulator counts due steps and drops the backlog past the cap; the per-entity clock advances by frame time; each due step runs and consumes one step from the clock with the same resync; the correction decays by `1 - exp(-dt / smoothMs)`. It omits the reconcile and replay (the donor's ack path), the input handle and send hook (each step is a callback here), the snapshot of the previous smoothed value, the divergence and drift telemetry, the epoch reset, and the `noteRenderRead` warning. The render formula is a plain lerp from the previous to the current value; the donor's `value()`/`pose()` expression was not read. The sketch keeps the donor's cap and its drop rule as written, because they are the donor's choice; section 6 says why a fight cannot keep that rule.

```ts
// Licence: MIT (donor LICENSE line 3). Clean-room shape of the donor's pacing: a room-wide fixed-step accumulator, a per-entity render clock, and a frame-rate-independent correction decay.
export const MAX_STEPS_PER_FRAME = 5;

export interface Pacer { stepMs: number; acc: number; lastNow: number; }
export function newPacer(stepMs: number): Pacer {
  return { stepMs, acc: 0, lastNow: -1 };
}

// Frame tick: how many fixed steps are due this frame. Past the cap, the backlog is dropped.
export function dueSteps(p: Pacer, now: number): number {
  const dt = p.lastNow < 0 ? 0 : now - p.lastNow;
  p.lastNow = now;
  p.acc += dt;
  let steps = Math.floor(p.acc / p.stepMs);
  if (steps > MAX_STEPS_PER_FRAME) {
    p.acc = 0;                       // hitch: emit a bounded count, drop the backlog
    steps = MAX_STEPS_PER_FRAME;
  } else {
    p.acc -= steps * p.stepMs;
  }
  return steps;
}

// Per-entity render clock: real frame time since the last applied step.
export interface RenderClock { acc: number; stepMs: number; }
export function advanceClock(c: RenderClock, dt: number): void {
  if (dt > 0) c.acc += dt;
}
export function renderAlpha(c: RenderClock): number {
  const a = c.acc / c.stepMs;
  return a < 0 ? 0 : a > 1 ? 1 : a;
}
// Called once per applied fixed step: consume one step, then resync into [0, stepMs).
export function consumeStep(c: RenderClock): void {
  c.acc -= c.stepMs;
  if (c.acc < 0) c.acc = 0;
  else if (c.acc >= c.stepMs) c.acc %= c.stepMs;
}

// Visual correction decays toward zero by 1 - exp(-dt / smoothMs): the same fraction per second at any frame rate.
export function decayError(err: number, dt: number, smoothMs: number): number {
  const k = smoothMs <= 0 ? 1 : 1 - Math.exp(-dt / smoothMs);
  return err - err * k;
}

// Render value between the previous and current smoothed step.
export function lerp(prev: number, cur: number, alpha: number): number {
  return prev + (cur - prev) * alpha;
}

// One frame: pace the steps, let each due step run (the donor runs it on input send), then age the render clock and the correction.
export function frame(
  p: Pacer,
  clock: RenderClock,
  err: { value: number },
  smoothMs: number,
  now: number,
  step: () => void,
): void {
  const dt = p.lastNow < 0 ? 0 : now - p.lastNow;
  const n = dueSteps(p, now);
  advanceClock(clock, dt);
  for (let i = 0; i < n; i++) {
    step();
    consumeStep(clock);
  }
  err.value = decayError(err.value, dt, smoothMs);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/colyseus-sketch.ts`, exit 0.

## 5. Lands in

- TARGET `src/fight/predict.ts` (client-side prediction of the duel step; the engine's one step function runs on the client and is replayed on ack, so the client and server use the same rules). Parity-checklist row 18 (loot roll and XP award, with the server tick sub-line: "server tick: fixed step, input intake, per-tick NPC budget"). The pacing here is that sub-line's fixed-step half, for the client.
- Reuse tag: adapt-idea (MIT: code may be adapted; this note keeps the shape and the constants as data)
- Brief rule served: 1 (one engine, the same duel step on both sides); rules 7-9 n/a

## 6. Gaps and risks

- Cap drops input. The donor drops the whole backlog past five steps (Predictor 2245). In a fight that loses inputs sent during a hitch, which changes hit timing. Frankendom must not copy this rule as is. Fix: keep the cap per frame as data, but carry the rest of the backlog into the next frames and send every input in order.
- One engine: the step must be the same function on server and client. The donor's sub-step is bit-identical to the server (comment 507-509); Frankendom must keep one `src/fight` step and test the replay against it.
- Server-verified kills: a predicted hit or death on the client is a preview. A correction must be able to remove a predicted kill, and the kill is only final when the server confirms it (pair with row 17, death and respawn).
- MAX_ATTACKERS = 3: the donor predicts only the local player's input. Enemies and attackers are server state; they should be interpolated between snapshots using the same alpha idea, not predicted. Predicting many attackers would multiply the replay cost.
- Zones as data: the donor has one step per room (one accumulator, Predictor 889-891). Frankendom should keep one fixed step per fight, as an engine constant, and put only the cap and the correction window in data.
- Pit as client: the Pit is a client, so it would use the same predictor and the same step rate as the zones; do not give it a separate clock.
- The camera is client-only and never reads these values; nothing here is camera behaviour.
- Defects: none found in the code read. The step cap is a hard-coded constant, not data (fix: move it to a per-fight data field). The hitch rule is a design choice the donor states in its comment (2244-2245), not a bug, but see the gap above.
- Not measured: the cost of the replay per correction; the donor gives no timings.

## Reuse tag

adapt-idea (MIT, code may be adapted; this note keeps the shape only).

## Brief rule served

1 (one engine, shared step on client and server). Rules 7 and 8: MIT, sketch written from the mechanism.

Best transferable idea: Drive every fixed step from one frame accumulator with a per-frame cap, draw the gap between the last two steps with a clamped alpha, and decay corrections by 1 - exp(-dt/smoothMs) so a server correction eases out instead of snapping.
Decision (proposed): adapt — the accumulator, the clamped alpha and the frame-rate-independent decay fit a fast phone fight; adapt the hitch rule so a long hitch carries its backlog instead of dropping inputs, and make the cap a data field. Reject predicting enemies, because enemy state comes from the server.
Acceptance: On a phone with a 120 Hz display and a 30 Hz fight step, the hero and attackers move without stutter; after a server correction the hero eases to the corrected pose over about one patch interval instead of snapping; a test asserts that a 200 ms hitch (six steps at 30 Hz, over the cap of five) sends every queued input in order with none dropped.
