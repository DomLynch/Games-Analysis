# colyseus-colyseus (server-performance-scaling, cell 2)

Donor: `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/Room.ts` (`setFixedTimestep` 1021-1067; `setTimestep` 936-955; `patchRate` setter 524-545; `broadcastPatch` 1374-1422) | Licence: MIT (`LICENSE`: "Copyright (c) 2015-2026 Endel Dreyer", "MIT License:" with the standard permission grant) | TypeScript | symbol `Room.setFixedTimestep`

Checked: Read in full: `packages/core/src/Room.ts` 920-1076 (both loops, the fixed-step accumulator), 1370-1422 (`broadcastPatch`), 276-322 (patch rates and their docs), 524-545 (`patchRate` setter), 57-58 (default rates). Read in part: `packages/testing/src/Room.ext.ts` 70-100 (waiting for a step), `packages/testing/test/app1/RoomWithFixedTimestep.ts` 1-19 (a 30 Hz room). Grep only: callers of `setFixedTimestep` (sdk prediction code reads the advertised rate and subSteps; `sdk/src/predict/rollback.ts` 493-500 read by grep, not read in full). `ClockTimer` (`@colyseus/timer`, which supplies `clock.tick()` and `clock.deltaTime`) is NOT in the donor box; its semantics are inferred from the call sites only (not read). The serializer `applyPatches` (`packages/serializer`) and the `Rewind` class were not read. No test asserting the catch-up cap was found (grep for MAX_CATCHUP, catch-up, spiral). Tests were NOT run. Confidence: high on the accumulator as read (it is about 15 lines); medium on the claim that the client replays with the same dt (grep only). camera_scope: n/a.

## 1. Mechanism

- Two game loops exist on the server room. `setTimestep` (`936-955`) runs `onTick(measuredDelta)` on each interval with the wall-clock delta, so the step size varies. `setFixedTimestep` (`1021-1067`) is the one that matters here: it runs the step callback a whole number of fixed steps per real frame, so each step advances by the same `dt = 1/tickRate`.
- Setup (`1021-1050`): `stepMs = 1000 / tickRate` (`1024`), `stepSeconds = 1 / tickRate`. Any existing interval is cleared (`1022`). The step context `ctx` is built once and reused for every step (`1047-1050`, "no per-step allocation in the hot loop", `1044`). `acc = 0` and `tick = 0` live in the closure (`1042-1043`). Sub-steps are read from options (`1027-1028`).
- The loop (`1053-1066`): one `setInterval` at `stepMs`. Each interval fires: `clock.tick()` (`1054`), then `acc += clock.deltaTime` (`1055`). Then `while (acc >= stepMs && ran < MAX_CATCHUP_STEPS)`: subtract one step from `acc` (`1060`), set `ctx.tick = tick++` (`1061`), call `cb(ctx)` (`1062`), count it (`1063`). Cap `MAX_CATCHUP_STEPS = 5` (`1051`). If the cap was reached, `acc = 0` (`1065`): the backlog is dropped, not paid off.
- Rate choices: the default sim rate is 60 Hz (`58`, `1021`). `tickRate` is the one source of the rate, advertised to predicting clients through the join handshake (`1030-1035`). `subSteps` runs N physics sub-steps inside one fixed step, so physics runs at `tickRate * N` (`979-989`).
- Patch (send) rate is separate from sim rate. `patchRate` defaults to 50 ms = 20 Hz (`57`, `282`). Its setter starts its own `setInterval(() => this.broadcastPatch(), milliseconds)` (`540`). The docs say the point of decoupling is "60Hz movement over a 20Hz structural patch" (`291-292`).
- `broadcastPatch` (`1374-1422`): calls `onBeforePatch`; if there is no sim loop it ticks the clock itself (`1379-1381`); reads `sNow = clock.elapsedTime` (`1390`); calls `_serializer.applyPatches(this.clients, ...)` once for all clients (`1391`), which encodes changes for the whole room in one pass; then flushes unreliable fields (`1401`), per-client frames and after-patch broadcasts (`1406-1409`); then records lag-compensation snapshots on the patch cadence, deduplicated per `sNow` (`1416-1419`, and the doc at `1415`).
- Mid-level order inside one fixed step, as this donor shows it: the step callback runs (user code). The donor does not force input consumption order; the docs at `994-1003` say the user consumes one input per entity per step.

## 2. Key functions

- `Room.setFixedTimestep`: `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/Room.ts` 1021-1067 (setup, accumulator, cap, drop).
- `Room.setTimestep` (variable-step contrast): `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/Room.ts` 936-955.
- `patchRate` setter: `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/Room.ts` 524-545 (a separate interval for patches; 542-543 for the zero case).
- `Room.broadcastPatch`: `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/Room.ts` 1374-1422.
- Docs of the decoupling and the drop policy: `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/Room.ts` 286-301 (unreliable patch), 966-993 (fixed timestep doc).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Accumulator: add measured delta, run whole fixed steps, carry the remainder | Step = 1000 / tickRate ms (`1024`); default 60 Hz (`1021`, `58`) |
| Catch-up cap, then drop the backlog (no spiral of death) | `MAX_CATCHUP_STEPS = 5` (`1051`); drop `acc = 0` (`1065`) |
| Reused context object, dt in seconds and ms, tick counter | No per-step allocation (`1044`, `1047-1050`) |
| Sub-steps: physics at tickRate * N | `subSteps` option; default 1 (`1027-1028`, `1049`) |
| Send rate decoupled from sim rate | Patch default 50 ms = 20 Hz (`57`); sim default 16.66 ms (`58`) |
| One encode per patch for all clients | `applyPatches(this.clients, ...)` once (`1391`) |

Numbers worked out from the code: at 60 Hz one step is 16.67 ms, so the cap of 5 means a frame can run at most about 83 ms of game time. A hitch longer than that loses the rest of the time (not paid back). At the 20 Hz patch default, one patch every 50 ms carries about three sim steps of changes.

## 4. TypeScript sketch

simplified: the donor runs the fixed step on `setInterval` and reads `clock.deltaTime`. The sketch takes the measured delta as an argument, so it can be tested without timers. It keeps the donor's order: add the delta, run whole steps up to the cap, drop the backlog when the cap is hit, reuse one context object. The `PatchLoop` class is NOT in the donor: the donor sends patches on their own `setInterval`. `PatchLoop` is the sketch's own accumulator version of that send rate, with at most one patch per frame and a drop when behind. The donor does not implement sub-steps, the unreliable channel, rewind, or the join-time rate advertisement; these are omitted.

```ts
// Licence: MIT (donor LICENSE). Code may be adapted; this sketch is written from the described mechanism.
export interface StepContext {
  dt: number;          // seconds, fixed
  dtMs: number;        // milliseconds, fixed
  tick: number;        // steps executed so far
}

// Fixed-timestep accumulator. The donor runs this on a setInterval; here the caller
// hands in the measured delta each real frame, so the loop can be tested without timers.
export class FixedStepLoop {
  private acc = 0;
  private tick = 0;
  private readonly ctx: StepContext;   // reused per step: no allocation in the hot loop

  constructor(
    private readonly stepMs: number,            // 1000 / tickRate
    private readonly maxCatchupSteps = 5,       // donor MAX_CATCHUP_STEPS
  ) {
    this.ctx = { dt: stepMs / 1000, dtMs: stepMs, tick: 0 };
  }

  // Returns how many fixed steps ran this frame.
  advance(measuredDeltaMs: number, step: (ctx: StepContext) => void): number {
    this.acc += measuredDeltaMs;
    let ran = 0;
    while (this.acc >= this.stepMs && ran < this.maxCatchupSteps) {
      this.acc -= this.stepMs;
      this.ctx.tick = this.tick++;
      step(this.ctx);
      ran++;
    }
    if (ran === this.maxCatchupSteps) this.acc = 0; // hitch: drop the backlog, no spiral of death
    return ran;
  }
}

// Send-rate decoupling: the patch runs on its own accumulator over the same measured delta.
// Donor: a separate setInterval at patchRate (50 ms by default) next to a 60 Hz sim.
export class PatchLoop {
  private acc = 0;
  constructor(private readonly patchMs: number) {}

  // Returns how many patches are due this frame (0 or 1 for normal frames).
  advance(measuredDeltaMs: number, send: () => void): number {
    this.acc += measuredDeltaMs;
    let sent = 0;
    while (this.acc >= this.patchMs && sent < 1) { // at most one patch per frame
      this.acc -= this.patchMs;
      send();
      sent++;
    }
    if (sent === 1 && this.acc >= this.patchMs) this.acc = 0; // patch is behind: drop, do not burst
    return sent;
  }
}

export {};
```

## 5. Lands in

- TARGET `src/fight/loop.ts` (new module: the server's fixed-step fight loop; the duel step, the AI brain and the per-tick NPC budget run inside its step callback; the Pit client never runs it).
- Parity-checklist row 18, sub-line "server tick: fixed step, input intake, per-tick NPC budget". Input intake (row 5) happens inside the step, one input per entity per step, as the donor's docs describe (`994-1003`).
- Reuse tag: adopt-as-idea (MIT: code may be adapted; the sketch is clean-room)
- Brief rule served: 1 (one engine: one fixed step decides the fight; the send rate is separate); rule 8 (row 18 cited)

## 6. Gaps and risks

- The drop policy trades time for stability. At a hitch of more than 5 steps, the fight loses the rest of that time: the world runs behind wall-clock time, and the fight visibly skips. Frankendom must choose the cap and say what a player sees (a short slow-motion or a freeze), rather than silently dropping time.
- The donor gives no per-step work budget. The step runs whatever is queued (NPC brains, collisions). For the per-tick NPC budget the step callback itself must cap work; the donor provides only the step count cap.
- Patch decoupling: a patch rate faster than the sim is not a free win. The donor's own docs (`294-301`) say an entity's ADD rides the reliable channel, so a datagram sent between patches can name an entity the client has not been told about yet; the client skips that frame and the entity's first value lands one mutation later. Frankendom's one-ledger rule (kills and HP decided once, on the server) must not rely on the faster channel.
- Server-verified kills: the step callback is where kills are decided. The donor does not verify anything in the step; the rule that a kill is decided on the server and only confirmed to the client is Frankendom's, not the donor's.
- MAX_ATTACKERS = 3 and many-on-one are not in this loop; the donor has no hate list. The step only sets when target selection runs (row 4).
- Pit as client: the Pit runs its own render loop; it must not run `src/fight/loop.ts`.
- `ClockTimer` (`@colyseus/timer`) is not in the box: the accuracy of `deltaTime` under a busy event loop was not read.
- Donor is MIT: code may be adapted; the sketch was written from the described mechanism and typechecked only (not run).
- Typecheck on the VPS: `npx -p typescript tsc --noEmit --strict --target es2020`, exit 0. Not executed.

Best transferable idea: run the fight loop on a fixed step with an accumulator fed by the measured delta, cap the catch-up at 5 steps and drop any backlog beyond that, so a hitch cannot spiral and the send rate is set separately from the sim rate.

Decision (proposed): adopt. It is the server-tick sub-line row 18 asks for, the donor has no conflicting rule, and the cap and drop are the trade Frankendom should make in the open (see gaps).

Acceptance: server test: a 1000 ms delta in one call at 60 Hz runs exactly 5 steps and leaves the accumulator at zero; frames of 16, 17, 16 ms run 0, 1, 1 steps and carry the remainder; a 20 Hz patch loop sends about one patch per 50 ms of measured time.

Reuse tag: adopt-as-idea (MIT: code may be adapted; the sketch is clean-room)
Brief rule served: 1 (one engine: one fixed step decides the fight; send rate separate); rule 8 (row 18 cited)
