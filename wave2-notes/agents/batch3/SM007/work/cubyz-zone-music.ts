// Licence: GPL-3.0 donor (PixelGuys-Cubyz). Clean-room sketch of the shape only, not a translation.
const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

// Cubic Hermite on u in [0,1]: value p0 at u=0 with slope m0, value p1 at u=1 with slope m1.
function hermite(p0: number, m0: number, p1: number, m1: number, u: number): number {
  const u2 = u * u, u3 = u2 * u;
  return p0 * (2 * u3 - 3 * u2 + 1) + m0 * (u3 - 2 * u2 + u) + p1 * (3 * u2 - 2 * u3) + m1 * (u3 - u2);
}

function hermiteSlope(p0: number, m0: number, p1: number, m1: number, u: number): number {
  const u2 = u * u;
  return p0 * (6 * u2 - 6 * u) + m0 * (3 * u2 - 4 * u + 1) + p1 * (6 * u - 6 * u2) + m1 * (3 * u2 - 2 * u);
}

// One music bed: a looping track whose gain follows a fade curve.
export class Bed {
  gain = 0;        // current gain, 0..1
  slope = 0;       // d(gain)/d(second) at the current instant
  to = 0;          // target gain of the current fade
  private from = 0;
  private m0 = 0;  // start slope in the fade's own u units
  private u = 1;   // fade progress 0..1 (1 = settled)
  private span = 1; // fade length in seconds

  constructor(readonly track: string) {}

  // Start a fade from the current gain and slope, so the curve has no jump on reversal.
  fadeTo(target: number, seconds: number): void {
    if (target === this.to) return; // already heading there: keep the running curve
    this.from = this.gain;
    this.m0 = this.slope * Math.max(seconds, 1e-6);
    this.to = target;
    this.u = 0;
    this.span = Math.max(seconds, 1e-6);
  }

  step(dt: number): void {
    if (this.u >= 1) return;
    this.u = Math.min(1, this.u + dt / this.span);
    this.gain = clamp01(hermite(this.from, this.m0, this.to, 0, this.u));
    this.slope = hermiteSlope(this.from, this.m0, this.to, 0, this.u) / this.span;
  }

  get silent(): boolean {
    return this.to === 0 && this.u >= 1;
  }
}

// Zone music: the bed for the current zone fades up while every other bed fades to 0 over the same time.
export class ZoneMusic {
  private beds: Bed[] = [];

  constructor(private readonly fadeSeconds: number) {}

  setZone(track: string): void {
    let wanted = this.beds.find((b) => b.track === track);
    if (!wanted) {
      wanted = new Bed(track);
      this.beds.push(wanted);
    }
    for (const b of this.beds) b.fadeTo(b === wanted ? 1 : 0, this.fadeSeconds);
  }

  // Call every frame with the real frame time in seconds.
  step(dt: number): void {
    for (const b of this.beds) b.step(dt);
    this.beds = this.beds.filter((b) => !b.silent);
  }

  // Gains to hand to the mixer, one entry per bed still audible.
  gains(): { track: string; gain: number }[] {
    return this.beds.map((b) => ({ track: b.track, gain: b.gain }));
  }
}
