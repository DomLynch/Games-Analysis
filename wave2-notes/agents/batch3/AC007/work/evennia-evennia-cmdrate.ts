// Licence: BSD-3-Clause (donor). Clean-room sketch: the shape of a per-session fixed-window input cap, written from the described mechanism, not a translation.
// clean-room
type Verdict = { forward: true } | { forward: false; reason: "too-long" | "too-fast" };

interface SessionLimiter { windowStart: number; count: number; }

const WINDOW_S = 1.0;          // fixed window length, seconds
const MAX_CMDS_PER_WINDOW = 80; // commands allowed per window
const MAX_CHARS = 6000;         // 0 or less disables the length check

function newLimiter(now: number): SessionLimiter {
  return { windowStart: now, count: 0 };
}

// Order as in the donor: length check first (not counted), then window roll,
// then count, then cap. A refused command still counts toward the window.
function admit(lim: SessionLimiter, nowS: number, text: string): Verdict {
  if (MAX_CHARS > 0 && text.length > MAX_CHARS) return { forward: false, reason: "too-long" };
  if (Math.max(0, nowS - lim.windowStart) > WINDOW_S) {
    lim.windowStart = nowS;
    lim.count = 0;
  }
  lim.count += 1;
  if (lim.count > MAX_CMDS_PER_WINDOW) return { forward: false, reason: "too-fast" };
  return { forward: true };
}
export {};
