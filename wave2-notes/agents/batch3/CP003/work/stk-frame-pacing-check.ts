// Licence: GPL-3.0-or-later (donor, src/main_loop.cpp header). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Pacing {
  tickMs: number;                // one fixed physics tick in ms, 1000 / tick rate
  maxStepsPerFrame: number;      // cap on wall time per frame, counted in ticks
  clampEnabled: boolean;         // false when networked: the local clock must match the server
  networkedClient: boolean;      // only a networked client fast-forwards
  fastForwardTicks: number;      // a networked client skips the full update above this many ticks
  maxFps: number;                // user frame-rate cap
  vsync: boolean;                // when vsync paces the frame, no software throttle
}

interface PacingState {
  prevMs: number;                // wall time at the previous frame
  leftoverMs: number;            // time not yet turned into a whole tick
  debtTicks: number;             // network correction: positive adds ticks now, negative removes them and carries the rest
}

interface Sim {
  now(): number;                 // monotonic milliseconds
  sleep(ms: number): void;
  graphics(frameMs: number): void;       // one frame of visuals, before the physics steps
  step(fastForward: boolean): boolean;   // one physics tick; false = stop now
}

// Stage 1: wall time to whole ticks, before any network correction.
function accumulate(st: PacingState, nowMs: number, p: Pacing): number {
  let dt = nowMs - st.prevMs;
  st.prevMs = nowMs;
  if (p.clampEnabled) {
    const capMs = p.maxStepsPerFrame * p.tickMs;   // fix: the cap is written in ticks, so it follows the tick rate
    if (dt > capMs) dt = capMs;                    // slow the shown time instead of catching up
  }
  st.leftoverMs += dt;
  const ticks = Math.floor(st.leftoverMs / p.tickMs);
  st.leftoverMs -= ticks * p.tickMs;
  return ticks;
}

// Stage 2: apply the network correction. A negative debt removes steps now and carries the rest.
function applyDebt(st: PacingState, ticks: number): number {
  if (st.debtTicks > 0) {
    const t = ticks + st.debtTicks;
    st.debtTicks = 0;
    return t;
  }
  if (st.debtTicks < 0) {
    const next = ticks + st.debtTicks;
    if (next < 0) {
      st.debtTicks = next;
      return 0;
    }
    st.debtTicks = 0;
    return next;
  }
  return ticks;
}

// Software frame cap: sleep only when the frame came in faster than the cap, and never with vsync on.
function throttleWaitMs(frameStartMs: number, nowMs: number, p: Pacing): number {
  if (p.vsync) return 0;
  const frameMs = nowMs - frameStartMs;
  if (frameMs > 0 && 1000 / frameMs <= p.maxFps) return 0;
  return Math.max(0, 1000 / p.maxFps - frameMs);
}

function frame(st: PacingState, p: Pacing, sim: Sim): void {
  const frameStartMs = sim.now();
  const ticksBeforeDebt = accumulate(st, frameStartMs, p);
  sim.graphics(ticksBeforeDebt * p.tickMs);      // visuals advance by the steps taken before the correction
  const ticks = applyDebt(st, ticksBeforeDebt);
  const fastForward = p.networkedClient && ticks > p.fastForwardTicks;
  for (let i = 0; i < ticks; i++) {
    if (!sim.step(fastForward)) break;
  }
  const wait = throttleWaitMs(frameStartMs, sim.now(), p);
  if (wait > 0) sim.sleep(wait);
}
export {};
