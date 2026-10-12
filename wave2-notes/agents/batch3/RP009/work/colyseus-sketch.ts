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
