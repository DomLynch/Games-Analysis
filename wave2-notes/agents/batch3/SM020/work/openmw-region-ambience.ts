// Licence: GPL-3.0 donor (openmw). Clean-room: written from the described mechanism, no donor lines are translated.
export interface AmbienceEntry { soundId: string; chancePct: number; } // chancePct 0..100, first success wins in list order

export interface AmbienceZone { minGapS: number; maxGapS: number; entries: AmbienceEntry[]; outdoor: boolean; }

export interface Rng {
  draw(): number;   // uniform in [0, 1]
  rollPct(): number; // integer in [0, 99]
}

// Region ambience director: one-shot slot, random silent gap, per-entry chance list.
export class AmbienceDirector {
  private gapS = 0;       // first attempt is immediate (donor timer starts at 0)
  private elapsedS = 0;   // silent time since the last attempt

  constructor(private readonly rng: Rng) {}

  // Call every frame with the frame time. Returns the one-shot to start, or null.
  step(dtS: number, zone: AmbienceZone | null, oneShotPlaying: boolean): string | null {
    if (zone === null || !zone.outdoor) return null;
    if (oneShotPlaying) return null;  // the gap timer does not run while a one-shot plays
    this.elapsedS += dtS;
    if (this.elapsedS < this.gapS) return null;
    this.gapS = zone.minGapS + (zone.maxGapS - zone.minGapS) * this.rng.draw();
    this.elapsedS = 0;
    for (const e of zone.entries) {
      if (this.rng.rollPct() < e.chancePct) return e.soundId;
    }
    return null;
  }
}

// Exponential fade toward a target: v += k * (target - v) * dt, k = 4.6 / duration (about -40 dB after duration).
// Ends by snapping to the target when the sign flips or the gap is below 1e-4.
export function stepFade(vol: number, target: number, durationS: number, dtS: number): { vol: number; done: boolean } {
  if (durationS <= 0) return { vol: target, done: true };
  const k = 4.6 / durationS;
  const before = target - vol;
  const after = before - k * before * dtS;
  if (Math.sign(before) !== Math.sign(after) || Math.abs(after) < 1e-4) return { vol: target, done: true };
  return { vol: target - after, done: false };
}

// Outdoor water bed: share of sampled points under water, scaled by 2 (half under water is full volume), clamped to 1.
export function outdoorWaterVolume(underwaterPoints: number, pointsPerSide: number): number {
  return Math.min(1, (underwaterPoints * 2) / (pointsPerSide * pointsPerSide));
}

// Indoor water bed: linear falloff inside the tolerance, zero outside.
export function indoorWaterVolume(distToWater: number, tolerance: number): number {
  if (distToWater >= tolerance) return 0;
  return (tolerance - distToWater) / tolerance;
}

export {};
