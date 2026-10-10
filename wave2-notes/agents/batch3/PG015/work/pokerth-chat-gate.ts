// Licence: AGPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface ChatSession {
  isGuest: boolean;
  dbId: number;
  windowStart: number;  // ms timestamp of the current window
  windowCount: number;  // chat lines accepted in the current window
}

interface ChatPolicy {
  maxPerWindow: number;      // 5 lines per window
  windowMs: number;          // 1000 ms fixed window
  shadowMuted: Set<number>;  // database ids, refreshed from the database on a timer
}

type ChatOutcome =
  | { kind: "denied-guest" }
  | { kind: "reject-to-sender" }     // over the limit: sender gets a reject that carries the text back
  | { kind: "echo-to-sender" }       // shadow mute: only the sender sees the line
  | { kind: "broadcast" };           // every lobby session and game session gets the line

// Fixed-window token: the window restarts on the first call at or after windowMs has passed.
// Rejected calls do not count against the window.
function acquireChatToken(s: ChatSession, p: ChatPolicy, now: number): boolean {
  if (now - s.windowStart >= p.windowMs) {
    s.windowStart = now;
    s.windowCount = 0;
  }
  if (s.windowCount >= p.maxPerWindow) return false;
  s.windowCount += 1;
  return true;
}

// Lobby chat, in the donor's order: guest gate, token, shadow-mute echo, broadcast.
// A shadow-muted sender still spends a token, so a mute cannot be used to probe the limit for free.
function gateLobbyChat(s: ChatSession, p: ChatPolicy, now: number): ChatOutcome {
  if (s.isGuest) return { kind: "denied-guest" };
  if (!acquireChatToken(s, p, now)) return { kind: "reject-to-sender" };
  if (p.shadowMuted.has(s.dbId)) return { kind: "echo-to-sender" };
  return { kind: "broadcast" };
}

export {};
