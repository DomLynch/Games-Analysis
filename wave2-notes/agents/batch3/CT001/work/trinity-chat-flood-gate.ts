// Licence: GPL-2.0-or-later (donor, TrinityCore). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Shape only: a gap-counting chat flood gate that turns a burst into a timed mute, and never shortens an existing mute.
export interface FloodConfig {
  messageCount: number;   // data: messages in one burst before a mute (donor ChatFlood.MessageCount 10)
  messageDelayMs: number; // data: a gap longer than this starts a new burst (donor 1 s)
  muteMs: number;         // data: mute length after a trip (donor ChatFlood.MuteTime 10 s)
}

export interface FloodState {
  windowUntilMs: number;  // the burst stays open until this time
  count: number;          // messages counted in the open burst
  muteUntilMs: number;    // 0 when not muted
}

export type GateResult =
  | { ok: true; state: FloodState }
  | { ok: false; reason: 'muted' | 'flood-trip' | 'invalid'; state: FloodState };

// Order: mute check first (a muted message is not counted), then validation (fix: an invalid line is not counted),
// then the burst count. The message that trips the limit is refused (fix: donor delivers it).
export function speakGate(
  st: FloodState, cfg: FloodConfig, nowMs: number, exempt: boolean, valid: boolean
): GateResult {
  if (exempt) {
    return { ok: true, state: st };
  }
  if (st.muteUntilMs > nowMs) {
    return { ok: false, reason: 'muted', state: st };
  }
  if (!valid) {
    return { ok: false, reason: 'invalid', state: st };
  }
  if (cfg.messageCount <= 0) {
    return { ok: true, state: st };
  }

  let count = 1;
  let muteUntilMs = st.muteUntilMs;
  if (st.windowUntilMs > nowMs) {
    count = st.count + 1;
    if (count >= cfg.messageCount) {
      muteUntilMs = Math.max(muteUntilMs, nowMs + cfg.muteMs);
      const tripped: FloodState = { windowUntilMs: nowMs + cfg.messageDelayMs, count: 0, muteUntilMs };
      return { ok: false, reason: 'flood-trip', state: tripped };
    }
  }
  return { ok: true, state: { windowUntilMs: nowMs + cfg.messageDelayMs, count, muteUntilMs } };
}

export {};
