# colyseus-colyseus (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/Room.ts` (method `Room.setFixedTimestep`, 1021-1067) | Licence: MIT (LICENSE: "Copyright (c) 2015-2026 Endel Dreyer", then the standard MIT permission text; code may be adapted) | TypeScript | symbol `setFixedTimestep`

Checked: `setFixedTimestep` at Room.ts 1021-1067 (read in full, including the loop body at 1053-1066). Companion reads: `setTimestep` (variable step) at 936-955, the `patchRate` setter at 527-546, the constants at 57-58, the doc comment at 966-1020, and `InputBuffer.take` at 353-362. The hint file `packages/sdk/src/input/InputHandle.ts` is the client input side and was not read; the server loop is in core Room.ts. `ClockTimer` (imported at Room.ts 9 from `@colyseus/timer`) is not in the donor, so its units are not read: the code compares `deltaTime` with `stepMs`, which implies milliseconds, and I assumed that. Confidence: high for the loop. Not a camera cell.

## 1. Mechanism

- The fixed-step loop is a `setInterval` whose period equals one step (`stepMs = 1000 / tickRate`, Room.ts 1024, interval at 1053 and 1066). Each time it fires:
  (a) `clock.tick()` then `acc += clock.deltaTime` (1054-1055). The measured wall-clock time goes into an accumulator.
  (b) While `acc >= stepMs` and fewer than `MAX_CATCHUP_STEPS` steps ran (1059): `acc -= stepMs` (1060), `ctx.tick = tick++` (1061), call the user step with the shared `ctx` (1062), count it (1063).
  (c) If the cap was reached, `acc = 0` (1065). That drops the backlog even if it was less than one step, so a hitch can never make the loop run more than 5 steps in one fire.
- Each step gets the same fixed `dt`: `ctx.dt = 1 / tickRate` in seconds and `ctx.dtMs = stepMs` (1047-1050). The wall-clock delta only decides how many steps run, so jitter cannot leak into the simulation. The doc comment says this directly (966-973).
- Sub-steps (optional): `subSteps` defaults to 1 (1027-1028). If set, `subDt = dt / subSteps` (1049) and the user integrates that many physics sub-steps inside one fixed step (doc 980-989).
- Input cadence: the fixed rate is advertised to predicting clients (1032-1035), so client and server use one dt. The doc says to consume one input per entity per step with `this.inputs.get(sid).next()`, or `take(n)` plus a sub-step, and never drain-and-keep-latest on a shared world (994-1003). `take(n)` reads the oldest inputs (InputBuffer.ts 353-362, only partly read).
- Patch (network) rate is a separate loop: `DEFAULT_PATCH_RATE = 1000 / 20` (Room.ts 57), set by the `patchRate` setter as its own `setInterval(() => this.broadcastPatch(), milliseconds)` (540). So the sim runs at 60 Hz and the state is sent at 20 Hz by default (defaults at 57-58).
- Contrast, not the same mechanism: `setTimestep` (936-955) calls `onTickCallback(this.clock.deltaTime)` with the measured delta and no accumulator (952). The doc marks that as a variable timestep (926).
- Tick type: fixed step with accumulator. The loop is driven by Node's `setInterval`, not by a socket or a frame callback.

## 2. Key functions

- `setFixedTimestep`: `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/Room.ts` 1021-1067. Accumulator, catch-up cap, backlog drop, fixed ctx.
- Loop body (inside it): `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/Room.ts` 1053-1066. Clock tick, accumulate, run whole steps, drop on cap.
- `setTimestep` (contrast): `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/Room.ts` 936-955. Variable delta.
- `patchRate` setter: `/mnt/frankendom-donors/colyseus-colyseus/packages/core/src/Room.ts` 527-546. Separate broadcast interval.
- Caller read: `/mnt/frankendom-donors/colyseus-colyseus/packages/testing/test/app1/RoomWithFixedTimestep.ts` 17. Example room at 30 Hz with a counter; it is the only caller I read.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Fixed step dt from a tick rate | `tickRate` default 60 Hz (1021: `Math.round(1000 / DEFAULT_SIMULATION_INTERVAL)`; `DEFAULT_SIMULATION_INTERVAL = 1000 / 60` at 58). Step `stepMs = 1000 / tickRate` (1024) |
| Catch-up cap per fire | 5 steps (`MAX_CATCHUP_STEPS`, 1051) |
| Backlog drop on hitch | Reset to 0 when the cap is reached (1065), not a time threshold |
| Sub-steps per fixed step | `subSteps` default 1 (1028); `subDt = dt / subSteps` (1049) |
| Network patch interval | 50 ms = `1000 / 20` (`DEFAULT_PATCH_RATE`, 57) |

## 4. TypeScript sketch

simplified: the sketch keeps the accumulator, the fixed `dt`, the catch-up cap of 5, and the backlog reset on the cap. It drives the loop by an explicit `advance(deltaMs)` call instead of `setInterval` and the `clock`. It omits the `subSteps` sub-step integration, the input-controller advertisement of the rate, the try/catch wrapper for uncaught exceptions, the patch interval, and the input buffer. It also reproduces the donor's choice to zero the accumulator whenever the cap is reached, even when less than one step remains (1065).

```ts
// Licence: MIT (donor, Copyright (c) 2015-2026 Endel Dreyer). Clean-room sketch of the shape: a fixed-step accumulator, a catch-up cap, and a dropped backlog on a hitch.
export interface StepCtx { dt: number; dtMs: number; tick: number; }

export class FixedLoop {
  private acc = 0;
  private tick = 0;
  private readonly stepMs: number;
  private readonly ctx: StepCtx;

  constructor(
    private readonly step: (ctx: StepCtx) => void,
    tickRate = 60,
    private readonly maxCatchup = 5,
  ) {
    this.stepMs = 1000 / tickRate;
    this.ctx = { dt: 1 / tickRate, dtMs: this.stepMs, tick: 0 }; // the same fixed dt every step
  }

  // deltaMs = measured wall-clock time since the previous call. Only decides how many fixed steps run.
  advance(deltaMs: number): number {
    this.acc += deltaMs;
    let ran = 0;
    while (this.acc >= this.stepMs && ran < this.maxCatchup) {
      this.acc -= this.stepMs;
      this.ctx.tick = this.tick++;
      this.step(this.ctx);
      ran++;
    }
    if (ran === this.maxCatchup) this.acc = 0; // hitch: drop the backlog, do not spiral
    return ran;
  }
}
```

## 5. Lands in

- TARGET `src/fight/tick.ts` (engine fixed step for the server fight loop). Parity row 18, sub-line "server tick: fixed step, input intake, per-tick NPC budget" (this note covers the fixed-step part).
- today: (Frankendom repo not read in this pass).
- Reuse tag: rewrite-from-idea (MIT; code may be adapted, the sketch is written from the shape)
- Brief rule served: 1 (one engine; the server owns the clock, so a wall-clock delta only decides how many fixed steps run); rule 6 (tick topic: driving loop and accumulator described above)
- Best transferable idea: the wall-clock delta only decides how many fixed steps run, each step gets the same dt, and a hitch runs at most five steps and then drops the rest, so a slow frame can never spiral.
- Decision (proposed): adopt. Take the accumulator, the fixed dt, the cap of 5 and the backlog drop as they are; these are exactly the server-tick rule we want, and no Frankendom ruling conflicts with them.
- Acceptance: a server test feeds a 250 ms stall to a 60 Hz loop: exactly 5 steps run, the tick counter rises by 5, and the accumulator reads 0 afterwards. In exact arithmetic, feeding deltas of 1000/60 ms runs one step per call, and every step receives dt = 1/60 s.

## 6. Gaps and risks

- MIT: code may be adapted. The sketch is written from the described shape.
- The cap zeroes the whole remaining accumulator (1065), so after a long hitch the server silently drops all the unrun time, not a bounded amount. That is the intended "no spiral" rule, but it means a timer counted in steps falls behind wall-clock time after a stall. Frankendom timers that must stay real-time need a separate clock.
- `deltaTime` comes from `ClockTimer`, not read in the donor. The units are assumed to be milliseconds from the comparison with `stepMs`; this must be checked in the package before we rely on it.
- The loop uses Node `setInterval`. Its timing jitter is absorbed only as long as the catch-up cap is not hit; a hard stall of more than 5 steps is dropped, not replayed.
- Input intake: the donor's doc says one input per entity per step (994-1003), but I did not read the InputBuffer internals beyond `take` (353-362). The per-tick NPC budget sub-line is not covered by this donor's loop; the mob/NPC budget is in the rAthena note.
- The donor's loop runs inside a room on the server, which matches the rule that the server owns the clock. The client-side predictor (sdk) mirrors the same dt and was not read.
