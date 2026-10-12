// clean-room sketch from the described mechanism (donor is GPL v2; not a translation)
// Times in ms. The donor's Timer is in ms (hwengine.pas step = SDL ticks delta).
const SHAKE_MS = 250;        // donor: the explosion gear is deleted when Timer > 250
const START_PX = 13;         // donor: amount = 13 - (Timer * 15) div 250, floor 1
const MIN_PX = 1;
const JITTER_EVERY_MS = 16;  // fix: fixed-interval accumulator (donor gates on Timer and 5 = 0)

interface Shake {
  ms: number;   // elapsed ms since the impact, clamped to SHAKE_MS
  acc: number;  // ms since the last jitter draw
  offX: number; // replaced on each draw, never accumulated
  offY: number;
}

export function newShake(): Shake {
  return { ms: 0, acc: 0, offX: 0, offY: 0 };
}

// Amplitude in px at an elapsed time, scaled by zoom (donor: round(amount * zoom / 2), floor 1).
export function amplitudePx(ms: number, zoom: number): number {
  const base = Math.max(MIN_PX, START_PX - Math.floor((ms * 15) / 250));
  return Math.max(MIN_PX, Math.round((base * zoom) / 2));
}

// Advance by dtMs. allowed = false while the aim cursor is visible (donor skips the jitter then).
export function stepShake(s: Shake, dtMs: number, zoom: number, allowed: boolean, rng: () => number): void {
  if (s.ms >= SHAKE_MS) { s.offX = 0; s.offY = 0; return; }
  s.ms = Math.min(SHAKE_MS, s.ms + dtMs);
  s.acc += dtMs;
  if (s.acc >= JITTER_EVERY_MS) {
    s.acc -= JITTER_EVERY_MS; // one draw per call even if dtMs spans several intervals
    if (allowed) {
      const a = amplitudePx(s.ms, zoom);
      s.offX = -a + Math.floor(rng() * (2 * a + 1));
      s.offY = -a + Math.floor(rng() * (2 * a + 1));
    } else {
      s.offX = 0;
      s.offY = 0;
    }
  }
  if (s.ms >= SHAKE_MS) { s.offX = 0; s.offY = 0; }
}

// The camera is drawn at base + offset. The follow base is never written by the shake.
export function drawnCamera(baseX: number, baseY: number, s: Shake): { x: number; y: number } {
  return { x: baseX + s.offX, y: baseY + s.offY };
}

export {};
