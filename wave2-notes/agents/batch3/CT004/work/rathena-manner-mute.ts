// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism (manner points as minutes of mute, decay while online), not a translation of the donor lines.
// Frankendom fix: the penalty is clamped in plain number math (no 16-bit wrap), a positive standing is capped at 0, and the minute tick only runs while the player is online.

interface MannerState {
  manner: number; // 0 = clean; negative = minutes still muted
}

const MANNER_FLOOR = -14 * 24 * 60; // fix: explicit floor (14 days in minutes) instead of the donor's int16 field
const PK_PENALTY = 5;                // donor pc.cpp:9952 value, kept as a data field

// Apply a chat penalty (positive minutes = mute more, negative = remove penalty).
// Result is always clamped to [FLOOR, 0]: a clean player never gains a positive standing here.
export function applyMannerDelta(s: MannerState, minutes: number): { muted: boolean; manner: number } {
  const next = s.manner - minutes;
  s.manner = Math.max(MANNER_FLOOR, Math.min(0, next));
  return { muted: s.manner < 0, manner: s.manner };
}

// Called once per online minute by the session timer. Logged-out time is not credited (no timestamp kept).
export function onOnlineMinute(s: MannerState): boolean {
  if (s.manner < 0) s.manner += 1;
  return s.manner < 0; // keep the timer while still muted
}

// Speech gate: a muted player is refused, and the caller shows the remaining minutes.
export function canSpeak(s: MannerState): boolean {
  return s.manner >= 0;
}

// Per-channel send gap. A refused send does not move lastSentMs (donor channel.cpp:452 and :463).
export function channelTooFast(lastSentMs: number, nowMs: number, delayMs: number): boolean {
  return delayMs > 0 && nowMs - lastSentMs < delayMs;
}

export const PK_PENALTY_MINUTES = PK_PENALTY;
export {};
