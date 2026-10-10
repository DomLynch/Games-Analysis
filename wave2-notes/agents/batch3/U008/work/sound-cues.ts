// Licence: BSD-2-Clause (donor ClassicUO). Clean-room sketch of the described mechanism, not a line-by-line translation.
// Client-only cue layer. The engine emits an event with tile coordinates; this layer picks a gain.

// Chebyshev distance in tiles, linear falloff to silence at viewRange.
export function cueGain(baseVolume: number, dx: number, dy: number, viewRange: number): number {
  const distance = Math.max(Math.abs(dx), Math.abs(dy));
  if (distance > viewRange) return 0;
  const perTile = baseVolume / (viewRange + 1);
  return Math.max(baseVolume - perTile * distance, 0);
}

// Clip length in ms from PCM byte count (donor: (bytes - 32) / 88.2).
export function clipMs(bytes: number): number {
  return (bytes - 32) / 88.2;
}

// A clip cannot restart until its own length has passed.
export class CueLockout {
  private readonly until = new Map<string, number>();

  tryPlay(clipId: string, nowMs: number, clipLengthMs: number): boolean {
    const t = this.until.get(clipId) ?? 0;
    if (t > nowMs) return false;
    this.until.set(clipId, nowMs + clipLengthMs);
    return true;
  }
}

// Example: a hit 6 tiles away with view range 24 and base volume 0.4.
const g = cueGain(0.4, 6, -2, 24);
const lock = new CueLockout();
const first = lock.tryPlay("hit", 1000, clipMs(4000));
const second = lock.tryPlay("hit", 1010, clipMs(4000));
console.log(g.toFixed(3), first, second);
export {};
