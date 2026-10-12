// Licence: GPL-2.0 (donor). Clean-room sketch written from the described mechanism (sliding-window flood counter that arms a timed mute, checked after counting), not a translation of the donor lines.
// Frankendom fix: the mute is a per-character expiry timestamp (not per account), the word list matches whole tokens, and the state is bounded (one bucket per character).

interface FloodBucket {
  windowEndMs: number; // the window slides on every message (donor PlayerMisc.cpp:68)
  count: number;
}

interface SpeakState {
  muteUntilMs: number; // 0 = not muted
  regular: FloodBucket;
}

// Data fields (donor WorldConfig.cpp:346-350): count 10, delay 1 s, mute 10 s.
const FLOOD_MESSAGE_COUNT = 10;
const FLOOD_MESSAGE_DELAY_MS = 1000;
const FLOOD_MUTE_MS = 10_000;

// Donor defect fixed here: in PlayerMisc.cpp 44-49 the REGULAR case falls through to `default: return;`, so the donor never counts regular chat. This function always counts.
// Count every attempt first, then decide (donor ChatHandler.cpp:249 runs before the mute check at :310).
export function onChatAttempt(s: SpeakState, nowMs: number): { allowed: boolean; muteUntilMs: number } {
  const b = s.regular;
  if (b.windowEndMs > nowMs) {
    b.count += 1;
  } else {
    b.count = 1;
  }
  if (b.count >= FLOOD_MESSAGE_COUNT) {
    // Never shorten an existing mute (donor PlayerMisc.cpp:59-60).
    s.muteUntilMs = Math.max(s.muteUntilMs, nowMs + FLOOD_MUTE_MS);
    b.count = 0;
  }
  b.windowEndMs = nowMs + FLOOD_MESSAGE_DELAY_MS;
  return { allowed: s.muteUntilMs <= nowMs, muteUntilMs: s.muteUntilMs };
}

// Whole-token blocklist (donor ObjectMgr.cpp:9204 is a substring match, so "ass" hits "class").
// Fix: token match on lower-cased words. Evasion (spacing, leetspeak) is NOT solved here.
export function containsBlockedToken(text: string, blocked: ReadonlySet<string>): boolean {
  const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 0);
  return tokens.some((t) => blocked.has(t));
}

export {};
