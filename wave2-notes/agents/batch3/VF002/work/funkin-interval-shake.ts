// Licence: Apache-2.0 (donor, LICENSE.md). Shape only, written from the mechanism; not a line-by-line translation.
export interface Shakable {
  x: number;
  y: number;
  width: number;
}

export interface ShakeSpec {
  duration: number;            // seconds
  interval: number;            // seconds per step
  startIntensity: number;      // fraction of target width
  endIntensity: number;        // fraction of target width
  ease: (t: number) => number; // maps 0..1 to 0..1, e.g. quadOut
  random: () => number;        // uniform in [0, 1)
}

export class IntervalShakeSketch {
  private readonly restX: number;
  private readonly restY: number;
  private readonly totalSteps: number;
  private steps = 0;
  private seconds = 0;
  private done = false;

  constructor(private readonly target: Shakable, private readonly spec: ShakeSpec) {
    if (!(spec.duration > 0) || !(spec.interval > 0)) {
      throw new Error("duration and interval must be positive");
    }
    this.restX = target.x;
    this.restY = target.y;
    this.totalSteps = Math.floor(spec.duration / spec.interval);
  }

  // Call once per interval. Returns false once the shake has ended and the rest position is restored.
  step(): boolean {
    if (this.done) return false;
    this.steps += 1;
    this.seconds += this.spec.interval;
    const progress = this.seconds / this.spec.duration;
    const scale = 1 - this.spec.ease(progress);
    const intensity = this.spec.endIntensity + (this.spec.startIntensity - this.spec.endIntensity) * scale;
    const amp = intensity * this.target.width;
    this.target.x = this.restX + (this.spec.random() * 2 - 1) * amp;
    this.target.y = this.restY + (this.spec.random() * 2 - 1) * amp;
    if (this.steps >= this.totalSteps) {
      this.restore();
      return false;
    }
    return true;
  }

  stop(): void {
    this.restore();
  }

  private restore(): void {
    this.target.x = this.restX;
    this.target.y = this.restY;
    this.done = true;
  }
}

export {};
