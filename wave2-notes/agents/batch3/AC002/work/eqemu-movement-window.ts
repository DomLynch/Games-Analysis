// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// simplified: keeps the windowed average speed, evaluate-then-reset, the idle reset, the stop flush, the light/hard tiers and the exempt-flush order. Omits: the 70 s heartbeat (MQGhost), the teleport-history path (MQWarpAbsolute), the per-exemption thresholds (ShadowStep 800, KnockBack 30), the GM-speed and immobile skips, the 3D/Z handling, the warp cooldown and the MQFastMem check. Flags go to an in-memory ledger only; there is no kick.

export interface Flag {
  kind: "warp" | "light-warp";
  atMs: number;
  speed: number;   // average speed over the window, distance per ms
  limit: number;   // server run speed it was compared against
}

export interface WindowState {
  windowStartMs: number | null; // null until the first moving update opens a window
  distance: number;             // distance accumulated in the open window
  moved: boolean;               // did the last update move the entity
  exempt: boolean;              // set by a game event (knockback, teleport); suppresses flags
  lastX: number;                // position the server currently holds
  lastY: number;
}

export interface WatchConfig {
  windowMs: number;    // evaluate a moving window once it is older than this (donor: 2500)
  runSpeed: number;    // server-side run speed from server state, distance per ms
  hardFactor: number;  // above runSpeed * hardFactor is the hard tier (donor: 1.5)
}

// Donor default for the exemption flush (cheat_manager.h, MovementCheck default 1000).
const FLUSH_MIN_MS = 1000;

export const ledger: Flag[] = [];

// Evaluate the open window only if it is older than minElapsedMs. Returns true if it ran.
function evaluate(s: WindowState, c: WatchConfig, nowMs: number, minElapsedMs: number): boolean {
  if (s.windowStartMs === null) return false;
  const elapsed = nowMs - s.windowStartMs;
  if (elapsed <= 0 || elapsed <= minElapsedMs) return false;

  const speed = s.distance / elapsed;
  if (!s.exempt && speed > c.runSpeed) {
    const kind = speed > c.runSpeed * c.hardFactor ? "warp" : "light-warp";
    ledger.push({ kind, atMs: nowMs, speed, limit: c.runSpeed });
  }
  s.windowStartMs = nowMs; // reset the window after every evaluation
  s.distance = 0;
  return true;
}

// One position update. The check reads the position the server holds, then the server writes the new one.
export function onPosition(s: WindowState, c: WatchConfig, x: number, y: number, nowMs: number): void {
  const d = Math.hypot(x - s.lastX, y - s.lastY); // 2D, as in the donor
  if (d === 0) {
    if (s.distance > 0) {
      evaluate(s, c, nowMs, 0);                   // a stop flushes the pending window
    } else {
      s.windowStartMs = nowMs;                    // standing still: restart the window
      s.moved = false;
    }
  } else {
    s.distance += d;
    s.moved = true;
    if (s.windowStartMs === null) {
      s.windowStartMs = nowMs;                    // first movement opens the window
    } else if (evaluate(s, c, nowMs, c.windowMs)) {
      s.exempt = false;                           // donor clears exemptions on the update path
    }
  }
  s.lastX = x;
  s.lastY = y;
}

// Called once per client loop pass (donor ClientProcess): idle time does not build a window.
export function onIdleTick(s: WindowState, nowMs: number): void {
  if (!s.moved) s.windowStartMs = nowMs;
}

// Exemption set by a game event. Pending movement is judged under the old rules first, then the flag is set.
export function setExempt(s: WindowState, c: WatchConfig, nowMs: number, on: boolean): void {
  if (on) evaluate(s, c, nowMs, FLUSH_MIN_MS);
  s.exempt = on;
}

export {};
