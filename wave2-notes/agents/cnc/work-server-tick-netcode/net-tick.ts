// Licence: GPL-3.0-or-later plus EA Section 7 terms (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface PeerClock {
  frame: number; // latest frame this peer's packets claim (-1 = not heard yet)
  sent: number;  // commands this peer says it has sent
  recv: number;  // commands I have received from this peer
}

interface LockState {
  frame: number;     // my simulation frame
  lead: number;      // frames I may run ahead of the slowest peer (donor default 3)
  sendRate: number;  // frames between command packets (donor default 3)
  peers: PeerClock[];
}

// Frame stamp for a command queued now: the next send boundary at or after frame + lead.
function stampFrame(w: LockState): number {
  return Math.ceil((w.frame + w.lead) / w.sendRate) * w.sendRate;
}

// Record one incoming packet from peer i. Both values only move forward.
function onPacket(w: LockState, i: number, stampedFrame: number, peerLead: number, commandCount: number): void {
  const p = w.peers[i];
  const theirFrame = stampedFrame - peerLead;
  if (p.frame < theirFrame) p.frame = theirFrame;
  if (commandCount > p.sent) p.sent = commandCount;
}

// Gate: may I run frame w.frame? A lone player never waits. Otherwise every peer's
// commands must have arrived, and I may run at most `lead` frames past the slowest peer.
function canAdvance(w: LockState): boolean {
  if (w.peers.length === 0) return true;
  let slowest = w.frame + 1000;
  for (const p of w.peers) if (p.frame < slowest) slowest = p.frame;
  for (const p of w.peers) if (p.recv < p.sent) return false;
  return w.frame < slowest + w.lead;
}

// One loop step. Non-send frames do nothing; on a send frame the caller sends first, then this gate decides.
type Step = { kind: 'idle' } | { kind: 'wait' } | { kind: 'run'; frame: number };

function step(w: LockState): Step {
  if (w.frame % w.sendRate !== 0) return { kind: 'idle' };
  return canAdvance(w) ? { kind: 'run', frame: w.frame } : { kind: 'wait' };
}

export {}
