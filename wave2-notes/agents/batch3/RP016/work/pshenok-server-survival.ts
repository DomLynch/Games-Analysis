// Licence: MIT (donor, Copyright (c) 2025 Kostyantyn Pshenychnyy). Shape adapted; code written fresh.
export const SAMPLE_INTERVAL_S = 0.5;   // donor: src/core/metrics.js:22 (2 Hz)
export const MAX_FRAME_DT_S = 0.1;      // donor: game.js:1119 (frame clamp)
export const MAX_SAMPLES_PER_TICK = 4;  // added here, not in donor: caps a catch-up burst

// Fixed-interval sample clock. Frozen when paused, as in the donor.
export class SampleClock {
  private acc = 0;
  private count = 0;

  // scaledDt is already multiplied by the time scale (donor passes dt = clampedDt * timeScale).
  tick(scaledDt: number, timeScale: number): void {
    if (timeScale === 0) return;
    this.acc += scaledDt;
    let n = 0;
    while (this.acc >= SAMPLE_INTERVAL_S && n < MAX_SAMPLES_PER_TICK) {
      this.acc -= SAMPLE_INTERVAL_S;
      this.count++;
      n++;
    }
    if (n === MAX_SAMPLES_PER_TICK) this.acc = 0; // drop the excess rather than burst
  }

  get sampleCount(): number {
    return this.count;
  }
}

// Repaint gate: rebuild only when the topology version changes, redraw only when a new sample lands.
// Integer version instead of the donor's per-frame string signature (the donor's defect).
export class RepaintGate {
  private lastVersion = -1;
  private lastDrawn = -1;

  constructor(
    private readonly clock: SampleClock,
    private readonly rebuild: () => void,
    private readonly redraw: () => void,
  ) {}

  // Called once per frame; does nothing when neither version nor sample count moved.
  frame(topologyVersion: number): void {
    if (topologyVersion !== this.lastVersion) {
      this.rebuild();
      this.lastVersion = topologyVersion;
      this.lastDrawn = -1; // force one redraw after a rebuild, as the donor does
    }
    const n = this.clock.sampleCount;
    if (n !== this.lastDrawn) {
      this.redraw();
      this.lastDrawn = n;
    }
  }
}

export {};
