// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
const CHAT_VOLUME_PERIOD_S = 30;     // decay time constant of the rate estimate
const MAX_AVG_MSG_PER_S = 1 / 5;     // a steady rate of this value reads as volume 1.0
const MIN_LEVEL = 1 / CHAT_VOLUME_PERIOD_S;
const WARN_AT = 0.75;                // volume above this: warning note, line still sent
const MUTE_AT = 1.0;                 // volume above this: mute starts
const MUTE_MS = 180000;              // fixed mute length from the trigger
const MIN_DT_S = 0.05;               // fix: two lines with the same timestamp must not divide by zero

interface RateState {
  lastMsgMs: number | null;
  rate: number;                      // about messages per second, decayed
  mutedUntilMs: number | null;
}

type Gate =
  | { ok: true; note?: 'warn' }
  | { ok: false; reason: 'muted'; remainingMs: number };

function volumeOf(rate: number): number {
  return Math.max((rate - MIN_LEVEL) / (MAX_AVG_MSG_PER_S - MIN_LEVEL), 0);
}

// One chat line through the spam gate. Admin exemption is decided by the caller (passed as exempt).
function spamGate(s: RateState, nowMs: number, exempt: boolean): Gate {
  if (exempt) return { ok: true };
  if (s.mutedUntilMs !== null && s.mutedUntilMs <= nowMs) s.mutedUntilMs = null;

  if (s.lastMsgMs === null) {
    s.rate = 0;
  } else {
    const dt = Math.max((nowMs - s.lastMsgMs) / 1000, MIN_DT_S);
    const p = Math.min(dt / CHAT_VOLUME_PERIOD_S, 1);
    s.rate = s.rate * (1 - p) + (1 / dt) * p;
  }
  s.lastMsgMs = nowMs;

  const volume = volumeOf(s.rate);
  if (volume > MUTE_AT && s.mutedUntilMs === null) s.mutedUntilMs = nowMs + MUTE_MS;

  if (s.mutedUntilMs !== null) return { ok: false, reason: 'muted', remainingMs: s.mutedUntilMs - nowMs };
  if (volume > WARN_AT) return { ok: true, note: 'warn' };
  return { ok: true };
}

export {};
