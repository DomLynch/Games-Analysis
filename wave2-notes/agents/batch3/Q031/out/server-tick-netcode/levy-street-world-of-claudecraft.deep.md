# levy-street-world-of-claudecraft (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/server/game.ts` | Licence: MIT (LICENSE line 1 "MIT License", Copyright (c) 2026 Levy Street) | TypeScript | symbol `GameServer.start`

Checked: The hint file `server/tick_rate_meter.ts` is only the achieved-rate meter; the loop is `GameServer.start()` (game.ts 2541-2663), read in full. `sim.tick()` head (sim.ts 5933-5952) and the mob loop (6046-6068) read; `shouldSkipIdleMobTick` (6219-6243) read in full; `TickRateMeter` read in full. Callers: `game.start()` at server/main.ts:3911 (grep); `sim.tick()` has two production callers found by grep, the server loop (game.ts 2594) and the offline client (src/main.ts 4391); tests not checked. Confidence high on the loop order and constants; medium on the idle-skip scope (the `hasInRadius` grid, sim/spatial.ts, was not read). Not read: `consumeMovementFramesV2`, the body of `broadcastSnapshots` beyond its head, `runAntibotTick`, `recordPerfCaptureCallback`, most of `sim.tick()` after the mob loop. camera_scope: n/a (not a camera cell).

## 1. Mechanism

- A host timer (`setInterval`, 50 ms period, game.ts 2548 and closing 2663) runs one guarded callback per firing. The callback measures wall time with `process.hrtime` (2555-2556), clamps it to 0.5 s (2560), and adds it to an accumulator (2561). The accumulator, not the timer, decides how many sim ticks run.
- `while (acc >= DT)` (2581) runs one sim step per iteration. Each iteration first calls `clearStaleInputs()` (2582), then drains a few host systems, applies movement frames (2587), calls `this.sim.tick()` (2594), routes events, runs the antibot tick, increments `ticksRun`, and subtracts `DT` from `acc` (2625). Leftover time carries to the next callback.
- Input intake: `clearStaleInputs()` (3159-3179) walks every client; if the sim time since the client's last input exceeds 0.75 s (3161, constant at 552), it resets that player's movement flags, but only when some flag is set. So held movement stops after a gap of more than 0.75 s with no input.
- After the step loop, once per callback (not per sim tick): the meter gets `(nowMs, ticksRun)` (2634), the achieved rate is recomputed (2635), and `broadcastSnapshots()` runs (2636). `broadcastSnapshots` returns at once if there are no clients (7910). The head carries `tickHz` at most every 0.5 s (513). A once-a-second social push (2642) and periodic saves (2647) follow; read by sight only. `lastTickCompletedAt` is the last statement (2659), so a body that throws every tick looks stale to liveness.
- Inside `sim.tick()`: `this.time += DT` (5939) is the sim clock; mob AI runs in a loop over entities (6046). For each non-guardian mob, `shouldSkipIdleMobTick(e)` (6057) can skip `updateMob` (6058) and the `updateAuras` call below it (6064), because the `continue` leaves the loop body. The gate only returns true when the mob has no auras (6237), so the skipped aura update has nothing to tick. The gate skips only mobs that are idle, unowned, out of combat, have no auras, and have no player within `idleMobTickRadius` (6220, 6241-6242). The radius is 100 units (types.ts 62), set at boot from `PLAYER_INTEREST_DROP_RADIUS` (sim_boot_config.ts 58); the boot comment says the radius is well past the 20 yd aggro radius, so a skipped mob could not have pulled anyone (sim_boot_config.ts 55-57).
- The achieved-rate meter (`server/tick_rate_meter.ts`, default window 3000 ms, minimum 1000 ms, 35) reports committed ticks per wall second over a sliding window, anchored to hrtime, so a stall that the dt clamp hides still shows as a lower rate (tick_rate_meter.ts 4).
- Timing: fixed step of DT = 1/20 s (types.ts 32-33). At most about 10 ticks run per callback (derived: after the clamp `acc` < 0.5 + DT, and 0.5 / DT = 10; not measured).

## 2. Key functions

- `GameServer.start`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/server/game.ts` 2541-2663. The whole loop: hrtime dt, clamp, accumulator, step loop, meter, snapshots, liveness stamp.
- `GameServer.clearStaleInputs`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/server/game.ts` 3159-3179. Input intake rule (0.75 s silence).
- `Sim.tick` (head and mob loop): `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/sim.ts` 5933-5952 and 6046-6068.
- `Sim.shouldSkipIdleMobTick`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/sim.ts` 6219-6243. The per-tick NPC gate. It is a radius gate, not a count budget: the code I read has no cap on how many mobs tick per step.
- `TickRateMeter.record` and `rate`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/server/tick_rate_meter.ts` 46-104.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed-step accumulator with a wall-time clamp | TICK_RATE 20 per s (types.ts 32); DT 1/20 s (types.ts 33); clamp 0.5 s (game.ts 2560); host timer 50 ms (game.ts 2663, the literal is not quoted: under 15 characters) |
| Input staleness: drop held movement after silence | 0.75 s (game.ts 552); client sends every 50 ms (game.ts 549 comment) |
| Idle-NPC skip by player proximity | Radius 100 units (types.ts 62); radius 0 disables (sim.ts 6220) |
| Wall-clock achieved-rate meter | Window 3000 ms, minimum 1000 ms (tick_rate_meter.ts 35); straddle cap 250 ms (26); head throttle 0.5 s (game.ts 513) |

## 4. TypeScript sketch

simplified: The sketch keeps the donor order that matters for this cell (clear stale input, then one sim step, inside the while loop; meter and broadcast after the loop). It omits: the donor's hrtime start (the first callback here uses dt 0; the donor measures from `start()`), the lateness profiler, the other host calls inside the step loop (rift, movement frames, event routing, antibot), the dead-mob and guardian branches of the mob loop, the spatial grid (the sketch scans every player linearly; the donor calls `hasInRadius`, not read), the meter's ring buffer and straddle cap (the sketch's window anchoring is simpler), and the tickHz head throttle. The `skipIdleMobTick` sketch also drops the dead-mob branch and the `isInertInstanceCorpse` exception.

```ts
// Licence: MIT (donor, Levy Street 2026). Sketch written from the described mechanism; not a line translation.
export const TICK_RATE = 20; // sim ticks per second (fixed rule)
export const DT = 1 / TICK_RATE; // seconds per sim tick
const MAX_FRAME_DT = 0.5; // wall-time clamp per timer callback, seconds
const STALE_INPUT_S = 0.75; // silence after which held movement stops applying

export interface SimHost {
  simTime: number;
  tick(): void; // one fixed sim step; advances simTime by DT
}

export interface LoopHooks {
  clearStaleInputs(simTime: number): void;
  meter(nowS: number, ticks: number): void;
  broadcast(ticksRun: number): void;
}

// Accumulator loop: one call per host timer callback. nowS is wall-clock seconds.
export class FixedStepLoop {
  private last: number | null = null;
  private acc = 0;

  constructor(
    private readonly sim: SimHost,
    private readonly hooks: LoopHooks,
  ) {}

  onTimer(nowS: number): number {
    let dt = this.last === null ? 0 : nowS - this.last;
    this.last = nowS;
    if (dt > MAX_FRAME_DT) dt = MAX_FRAME_DT;
    this.acc += dt;
    let ticksRun = 0;
    while (this.acc >= DT) {
      this.hooks.clearStaleInputs(this.sim.simTime);
      this.sim.tick();
      this.acc -= DT;
      ticksRun++;
    }
    this.hooks.meter(nowS, ticksRun);
    this.hooks.broadcast(ticksRun);
    return ticksRun;
  }
}

export interface MobView {
  x: number;
  z: number;
  idle: boolean;
  inCombat: boolean;
  hasOwner: boolean;
  auraCount: number;
}

export interface Vec2 {
  x: number;
  z: number;
}

// True when this mob's AI step can be skipped this tick (idle, far from every player).
export function skipIdleMobTick(mob: MobView, players: readonly Vec2[], radius: number): boolean {
  if (radius <= 0) return false;
  if (mob.hasOwner || !mob.idle || mob.inCombat || mob.auraCount > 0) return false;
  if (players.length === 0) return true;
  const r2 = radius * radius;
  for (const p of players) {
    const dx = p.x - mob.x;
    const dz = p.z - mob.z;
    if (dx * dx + dz * dz <= r2) return false;
  }
  return true;
}

// Achieved tick rate over a sliding window, anchored to wall time.
export class TickRate {
  private anchor: number | null = null;
  private readonly samples: { t: number; n: number }[] = [];

  constructor(
    private readonly windowS = 3,
    private readonly minElapsedS = 1,
  ) {}

  record(nowS: number, ticks: number): void {
    if (this.anchor === null) {
      this.anchor = nowS; // first call only anchors; earlier ticks are not counted
      return;
    }
    this.samples.push({ t: nowS, n: ticks });
    const cut = nowS - this.windowS;
    while (this.samples.length > 0 && this.samples[0].t < cut) this.samples.shift();
  }

  rate(nowS: number): number | null {
    if (this.anchor === null || nowS - this.anchor < this.minElapsedS) return null;
    const start = Math.max(this.anchor, nowS - this.windowS);
    let sum = 0;
    for (const s of this.samples) if (s.t >= start) sum += s.n;
    const elapsed = nowS - start;
    return elapsed > 0 ? sum / elapsed : null;
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (run on the file with the block above).

## 5. Lands in

- TARGET `origins/server/tick-loop.ts` (proposed new module; the Frankendom file name is not checked against the repo, which was not read). It holds the fixed-step loop, the input intake rule and the rate meter. Fight resolution stays in `src/fight` (the loop calls the engine's step; it does not own duel rules).
- Parity-checklist row 18 (loot roll and XP award / server tick), sub-line "server tick: fixed step, input intake, per-tick NPC budget" (addendum post-K item 3). Input intake is also row 5 in the addendum; this note cites 18 only. The idle-mob skip is a per-tick NPC budget under that sub-line, not a spawn rule, so it does not cite row 23.
- Reuse tag: adapt (MIT, Levy Street 2026: adaptation allowed; the sketch was written from the mechanism)
- Brief rule served: 1 (one engine; the server clock is the one clock) and the server-tick sub-line of row 18 in the addendum

Best transferable idea: a fixed-step accumulator with a wall-time clamp, plus a stale-input rule that stops held movement after 0.75 s of silence, plus a wall-clock meter that exposes the ticks the clamp hides.
Decision (proposed): adapt - Frankendom needs the fixed step and the input staleness rule for server authority, but the donor's world loop also drives movement and mobs, so Frankendom should take only the loop shape and feed the engine's duel step into it, not the world sim.
Acceptance: server test: a 2 s stall in one timer callback runs at most 10 ticks and advances the sim clock by no more than 0.5 s; a player whose last input is more than 0.75 s old has no held movement applied; the achieved-rate read reports about 20 Hz after 3 s of steady ticks.

## 6. Gaps and risks

- The clamp discards wall time. Under a stall the sim falls behind wall clock and nothing in the loop catches up. The donor's own header says this (tick_rate_meter.ts 4). Frankendom needs the rate meter (or an equivalent) to see it, and a rule for what a player sees during a stall.
- The donor loop runs one sim for world and offline client (src/main.ts 4391 calls the same `tick`). That matches the one-engine ruling in shape, but the donor's sim includes movement, doors, casting and mobs, which Frankendom's duel engine should not inherit.
- The idle-mob skip is a radius gate, not a count budget. The donor has no cap on mobs per step in the code read. Frankendom's MAX_ATTACKERS = 3 is a different limit (attackers per target), so do not map it onto this gate. Zone populations are data (row 23), so the radius should be a zone field, not one engine constant, if zones differ.
- The skip depends on the donor's invariant that an idle mob with no auras, owner or combat has nothing to advance. Frankendom's hate list and leash state (row 4) must be checked against that invariant before any skip; this was not tested.
- Input intake: the donor trusts a client's last movement intent and stops it after 0.75 s. For server-verified kills, the server must not accept a stale intent as a hit. This rule is about movement only, and was not checked against Frankendom's attack path.
- 20 Hz is the donor's tick. Fast duels may need a different rate; that is a design decision, not something this donor tested.
- Not read: `consumeMovementFramesV2`, the body of `broadcastSnapshots`, `runAntibotTick`, `spatial.ts` `hasInRadius`, the rest of `sim.tick()` after the mob loop. Any claim about those is not made.
