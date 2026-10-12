// Licence: Apache-2.0 (donor; adaptation allowed). Clean-room sketch of the mechanism, written from the described order of steps, not a translation.
export const PRIORITY = {
  LOCKED: Number.MAX_SAFE_INTEGER,
  HIGHEST: 100,
  HIGH: 10,
  NORMAL: 5,
  LOW: 3,
  LOWEST: 1,
} as const;

export interface Voice {
  prio: number | null;     // null = never assigned, or released
  playing: boolean;
  gain: number;            // 0..1
  target: number;          // gain the voice is moving towards
  rate: number;            // gain units per second while fading
  onEnd: ((interrupted: boolean) => void) | null;
}

export class VoicePool {
  readonly voices: Voice[];

  constructor(size: number) {
    this.voices = Array.from({ length: size }, () => ({
      prio: null, playing: false, gain: 1, target: 1, rate: 0, onEnd: null,
    }));
  }

  // Free voice first. Otherwise steal the LOWEST-priority voice that is strictly below the request.
  // Returns null when every voice is busy at or above the request's priority.
  acquire(prio: number, onEnd: ((interrupted: boolean) => void) | null = null): Voice | null {
    let pick: Voice | null = this.voices.find((v) => !v.playing) ?? null;
    if (pick === null) {
      for (const v of this.voices) {
        const p = v.prio ?? 0; // a null priority counts as lowest (the donor would throw here)
        if (p < prio && (pick === null || p < (pick.prio ?? 0))) pick = v;
      }
      if (pick !== null) pick.onEnd?.(true); // the displaced owner hears that it was interrupted
    }
    if (pick === null) return null;
    pick.prio = prio;
    pick.playing = true;
    pick.gain = 1;
    pick.target = 1;
    pick.rate = 0;
    pick.onEnd = onEnd;
    return pick;
  }
}

// A voice ends on its own (interrupted = false) or is stopped by us (interrupted = true).
export function finish(v: Voice, interrupted: boolean): void {
  v.playing = false;
  const cb = v.onEnd;
  v.onEnd = null;
  cb?.(interrupted);
}

// Symmetric fade: gain moves toward target at `rate` per second, up or down. Reaching 0 stops the voice.
export function stepFade(v: Voice, dt: number): void {
  if (v.gain === v.target) return;
  const step = v.rate * dt;
  v.gain = v.gain < v.target ? Math.min(v.target, v.gain + step) : Math.max(v.target, v.gain - step);
  if (v.gain === 0) finish(v, true);
}

// Impact loudness: silent below the threshold, linear above it, capped at max.
export function impactGain(fallSpeed: number, threshold: number, perUnit: number, max: number): number {
  const g = (fallSpeed - threshold) * perUnit;
  return g <= 0 ? 0 : Math.min(g, max);
}

// Music bed crossfade: the outgoing bed fades out over fadeS seconds while the incoming bed fades in.
export function crossfadeBed(
  pool: VoicePool,
  outgoing: Voice | null,
  fadeS: number,
  onEnd: (interrupted: boolean) => void,
): Voice | null {
  if (outgoing !== null && outgoing.playing) {
    outgoing.target = 0;
    outgoing.rate = 1 / fadeS;
  }
  const incoming = pool.acquire(PRIORITY.NORMAL, onEnd);
  if (incoming !== null) {
    incoming.gain = 0;
    incoming.target = 1;
    incoming.rate = 1 / fadeS;
  }
  return incoming;
}
