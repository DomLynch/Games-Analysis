// Licence: BSD-2-Clause (donor ClassicUO). Clean-room sketch of the described mechanism, not a line-by-line translation.
// Logic runs on every loop tick; only the draw is paced.

// Donor clamp is 12..250 fps. 12 is treated as 12.5 fps (80 ms), as in the donor.
export function frameDelays(rate: number, minFps = 12, maxFps = 250): { drawMs: number; halfMs: number } {
  const r = Math.min(maxFps, Math.max(minFps, rate));
  const drawMs = r === minFps ? 80 : 1000 / r;
  const whole = Math.floor(drawMs);
  return { drawMs, halfMs: Math.floor(whole / 2) };
}

export class FramePacer {
  private acc = 0; // ms carried between loop ticks

  constructor(private readonly inactiveMs = 217) {}

  // Call once per loop tick with the elapsed ms. Returns true when a draw is due.
  tick(elapsedMs: number, drawMs: number, focused: boolean, reduceWhenInactive: boolean): boolean {
    const interval = !focused && reduceWhenInactive ? this.inactiveMs : drawMs;
    this.acc += elapsedMs;
    if (this.acc > interval) {
      this.acc = this.acc % interval; // keep the remainder so the phase does not drift
      return true;
    }
    return false;
  }
}

// Demo: 60 fps target, 4 ms loop ticks, then the window loses focus.
const { drawMs, halfMs } = frameDelays(60);
const pacer = new FramePacer();
let draws = 0;
for (let i = 0; i < 120; i++) {
  if (pacer.tick(4, drawMs, i < 60, true)) draws++;
}
console.log(drawMs.toFixed(2), halfMs, draws);
export {};
