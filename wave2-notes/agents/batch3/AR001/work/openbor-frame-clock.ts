// Licence: BSD-3-Clause (donor LICENSE, Senile Team / OpenBOR Team). Sketch written from the described mechanism, not a copy of the donor lines.
// clean-room
// Infinity stands for the donor's DELAY_INFINITE flag: the frame never advances without outside influence.
export const DELAY_INFINITE = Number.POSITIVE_INFINITY;

export interface EDelay {
  factor: number;                           // multiplier applied to the frame delay
  modifier: number;                         // static amount added after the factor
  range: { min: number; max: number };      // raw delays outside this range pass through unchanged (max < 0 disables)
  cap: { min: number; max: number };        // final delay is clamped to this
}

// Final delay for one frame, in clock units. Same check order as the donor's calculate_edelay.
export function frameDelay(raw: number, e: EDelay): number {
  const outside = e.range.max < 0 || (e.range.min > 0 && raw < e.range.min) || raw > e.range.max;
  if (outside) return raw;

  let r = raw * e.factor + e.modifier;
  if (Number.isNaN(r)) return raw;          // a broken multiplier keeps the authored delay

  r = Math.min(Math.max(r, e.cap.min), e.cap.max);
  if (r <= 0) return 0;
  return Math.floor(r);
}

// Next-frame time: now plus the final delay for frame f.
export function scheduleFrame(now: number, delays: number[], f: number, e: EDelay): number {
  const raw = delays[f];
  if (raw === undefined) return now;
  return now + frameDelay(raw, e);
}

export interface AnimState {
  nextAt: number; // absolute clock time the frame advances; DELAY_INFINITE = wait
}

// The frame advances when its time has been reached (infinite times never are).
export function frameDue(now: number, a: AnimState): boolean {
  return a.nextAt !== DELAY_INFINITE && a.nextAt <= now;
}

// While the entity is frozen, each logic step pushes its next-frame time forward by one unit.
export function freezeStep(a: AnimState): void {
  if (a.nextAt > 0 && a.nextAt !== DELAY_INFINITE) a.nextAt += 1;
}

// Logic step length in clock units from the measured display interval, clamped as in the donor's getinterval().
export function logicInterval(gameSpeed: number, measured: number): number {
  let i = measured;
  if (i > gameSpeed) i = 1;
  if (i > gameSpeed / 4) i = gameSpeed / 4;
  return i;
}

// One display frame: run logic steps of one unit until the clock reaches the target,
// which may be at most 100 units ahead (the donor's catch-up cap).
export function runLogic(clock: { time: number }, interval: number, paused: boolean, step: (t: number) => void): void {
  if (paused) return;
  let target = clock.time + interval;
  if (target > clock.time + 100) target = clock.time + 100;
  while (clock.time < target) {
    step(clock.time);
    clock.time += 1;
  }
}

export {};
