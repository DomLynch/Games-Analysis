// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
const PERIOD_S = 30;          // averaging time constant
const MAX_RATE = 1 / 5;       // messages per second allowed on average
const MIN_RATE = 1 / PERIOD_S;
const WARN_LEVEL = 0.75;
const MUTE_LEVEL = 1.0;
const MUTE_MS = 180_000;

interface RateState { lastMs?: number; rate: number; mutedUntilMs?: number; }
type ChatVerdict =
  | { ok: true; warn: boolean }
  | { ok: false; reason: "muted"; remainMs: number }
  | { ok: false; reason: "banned" };

// Order: banned word first (the rate is not touched), then the rate update, then the mute check, then the warn band.
function judgeMessage(s: RateState, nowMs: number, banned: boolean): ChatVerdict {
  if (banned) return { ok: false, reason: "banned" };
  if (s.mutedUntilMs !== undefined && s.mutedUntilMs <= nowMs) s.mutedUntilMs = undefined;

  if (s.lastMs === undefined) {
    s.rate = 0;
  } else {
    const elapsedS = Math.max((nowMs - s.lastMs) / 1000, 0.001); // zero-gap guard (not in the donor)
    const p = Math.min(elapsedS / PERIOD_S, 1);
    s.rate = s.rate * (1 - p) + (1 / elapsedS) * p;
  }
  s.lastMs = nowMs;

  const volume = Math.max((s.rate - MIN_RATE) / (MAX_RATE - MIN_RATE), 0);
  if (volume > MUTE_LEVEL && s.mutedUntilMs === undefined) s.mutedUntilMs = nowMs + MUTE_MS;

  if (s.mutedUntilMs !== undefined) return { ok: false, reason: "muted", remainMs: s.mutedUntilMs - nowMs };
  return { ok: true, warn: volume > WARN_LEVEL };
}
export {}
