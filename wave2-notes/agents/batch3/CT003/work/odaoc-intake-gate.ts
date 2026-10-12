// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
const COMMAND_WINDOW_MS = 1500;    // per player, per command name (donor documented default)
const WHISPER_COMMAND_MS = 500;    // whisper command window (donor value)
const RECEIVE_WINDOW_MS = 1500;    // per sender, across all targets (donor value)

type Refusal = 'slow' | 'muted';
type Decision = { ok: true } | { ok: false; reason: Refusal };

interface Intake {
  muted: boolean;
  staff: boolean;                          // staff are exempt from the windows (donor: privilege above player)
  lastAccepted: Map<string, number>;       // command name -> time of the last accepted use, ms
  lastReceiveMs: number | null;            // time of the last accepted whisper received, ms
}

// One intake gate for every chat command. Mute is checked here once, before any window (fix: donor checks mute per command).
// The timestamp is written only on accept, so a refused attempt does not extend the window (donor: line 46).
function intake(p: Intake, command: string, windowMs: number, nowMs: number): Decision {
  if (p.muted) return { ok: false, reason: 'muted' };
  if (!p.staff) {
    const last = p.lastAccepted.get(command);
    if (last !== undefined && nowMs - last < windowMs) return { ok: false, reason: 'slow' };
  }
  p.lastAccepted.set(command, nowMs);
  return { ok: true };
}

// Target-side receive gate on the sender's last accepted whisper. The refusal must be shown to the sender (fix: donor is silent).
function receiveWhisper(sender: Intake, nowMs: number): Decision {
  if (!sender.staff && sender.lastReceiveMs !== null && nowMs - sender.lastReceiveMs < RECEIVE_WINDOW_MS) {
    return { ok: false, reason: 'slow' };
  }
  sender.lastReceiveMs = nowMs;
  return { ok: true };
}

// Ignore is a server-side drop that still reports success to the sender (donor: IsIgnoring then return true).
function deliverWhisper(targetIgnores: Set<string>, senderName: string, senderIsStaff: boolean): 'delivered' | 'dropped' {
  if (!senderIsStaff && targetIgnores.has(senderName)) return 'dropped';
  return 'delivered';
}

export {};
