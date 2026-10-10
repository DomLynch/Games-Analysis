// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface FloodConfig {
  joinCooldownMs: number;   // new non-admin connections cannot chat for this long after connecting
  intervalMs: number;       // sliding window length
  maxInWindow: number;      // messages allowed per window
  cooldownMs: number;       // UI pause after the limit is hit
}

export interface FloodState {
  stamps: number[];         // accepted message times, oldest first
}

export interface FloodVerdict {
  blocked: boolean;
  remainingMs: number;      // time until the next message is allowed (0 if not blocked)
  uiPauseMs: number;        // tell the client to grey out chat for this long (0 = none)
}

// Server intake check for one chat message from one connection.
export function chatIntake(
  st: FloodState, nowMs: number, connectedMs: number, isAdmin: boolean, cfg: FloodConfig,
): FloodVerdict {
  // prune stamps older than the window (kept while t + interval >= now)
  st.stamps = st.stamps.filter(t => t + cfg.intervalMs >= nowMs);

  if (!isAdmin && connectedMs < cfg.joinCooldownMs) {
    return { blocked: true, remainingMs: cfg.joinCooldownMs - connectedMs, uiPauseMs: 0 };
  }

  if (st.stamps.length >= cfg.maxInWindow) {
    return { blocked: true, remainingMs: st.stamps[0] + cfg.intervalMs - nowMs, uiPauseMs: 0 };
  }

  st.stamps.push(nowMs);

  if (st.stamps.length >= cfg.maxInWindow) {
    // penalty: push every stamp out so the window stays full until cooldownMs after this message
    const delta = Math.max(0, cfg.cooldownMs - cfg.intervalMs);
    st.stamps = st.stamps.map(() => nowMs + delta);
    return { blocked: false, remainingMs: 0, uiPauseMs: cfg.cooldownMs };
  }

  return { blocked: false, remainingMs: 0, uiPauseMs: 0 };
}

// Receiver-side filter for a team line (channel = sender's team number).
export interface Member { team: number; alive: boolean; }

export function showTeamLine(sender: Member, channel: number, local: Member | null, isReplay: boolean): boolean {
  if (sender.team !== channel || !sender.alive) return false;
  return isReplay || (local !== null && local.team === channel && local.alive);
}

export {};
