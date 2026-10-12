// Licence: Apache-2.0 (donor LICENSE.md). clean-room sketch written from the described mechanism; no donor line is translated.
// clean-room

// Layered music: stems share one clock. Each stem has its own latency offset.
export interface Stem {
  readonly id: string;
  readonly isPlayerVocal: boolean; // the stem a whiff ducks
  offsetMs: number;                // per-stem latency compensation (ms)
  timeMs: number;                  // stem position (ms)
  volume: number;                  // 0..1, clamped
}

export class StemGroup {
  playerVocalVolume = 1.0;
  private readonly stems: Stem[];

  constructor(stems: Stem[]) {
    this.stems = stems;
  }

  // One clock: every stem sits at the group time minus its own offset.
  seek(clockMs: number): void {
    for (const s of this.stems) s.timeMs = clockMs - s.offsetMs;
  }

  // Signed deviation with the largest magnitude, 0 when every stem is on its expected position.
  syncError(clockMs: number): number {
    let worst = 0;
    for (const s of this.stems) {
      const diff = s.timeMs - (clockMs - s.offsetMs);
      if (Math.abs(diff) > Math.abs(worst)) worst = diff;
    }
    return worst;
  }

  // A whiff, empty press or dropped hold ducks the player's vocal stem to zero, unless an animation has claimed the vocal
  // for its duration (donor skips the exemption on a dropped hold; fixed here).
  onMiss(tempVocalActive: boolean): void {
    if (!tempVocalActive) this.playerVocalVolume = 0;
  }

  // Effective gain of one stem.
  gainOf(s: Stem): number {
    return s.isPlayerVocal ? this.playerVocalVolume : s.volume;
  }
}

// Voice admission: refuse a new non-important sound when the pool is full. Nothing is stolen.
export function admitSound(activeCount: number, cap: number, important: boolean): boolean {
  return important || activeCount < cap;
}

// Lead-in: a negative start counts down by frame time. On the frame it reaches zero, the sound starts
// at the overshoot instead of at zero, so the start is not late by up to one frame.
export function stepLeadIn(timeMs: number, frameMs: number): { timeMs: number; startOffsetMs: number; started: boolean } {
  const t = timeMs + frameMs;
  if (t < 0) return { timeMs: t, startOffsetMs: 0, started: false };
  return { timeMs: t, startOffsetMs: t, started: true };
}

export {};
