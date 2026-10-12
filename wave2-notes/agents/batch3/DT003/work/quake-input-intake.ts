// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Cmd = { seq: number; fwd: number; side: number; buttons: number; yaw: number };
type Packet = [Cmd, Cmd, Cmd]; // three newest frames, oldest first; packet[2].seq is the newest

const CATCHUP_LIMIT = 20; // donor: the catch-up block runs only when the drop count is below 20
const REPEAT_ABOVE = 2;   // donor: while the drop count is above 2, the last run frame is repeated

interface Intake {
  lastSeq: number; // newest frame already simulated
  lastRun: Cmd;    // last simulated frame with buttons cleared (donor: cl->lastcmd)
}

// Returns the frames to simulate, in order, one fixed server tick each.
function intakePacket(st: Intake, packet: Packet): Cmd[] {
  const newest = packet[2];
  if (newest.seq <= st.lastSeq) return []; // duplicate or old packet: nothing to run
  const drop = newest.seq - (st.lastSeq + 1); // frames lost before this packet
  const out: Cmd[] = [];
  if (drop > 0 && drop < CATCHUP_LIMIT) {
    let k = drop;
    while (k > REPEAT_ABOVE) { out.push(st.lastRun); k--; } // unknown frames: repeat last
    if (k > 1) out.push(packet[0]); // oldest real frame still missing
    if (k > 0) out.push(packet[1]); // previous real frame still missing
  }
  out.push(newest);
  st.lastSeq = newest.seq;
  st.lastRun = { ...newest, buttons: 0 }; // replayed frames never repeat a button press
  return out;
}

// Server tick: each returned frame is one fixed step; the client never sends a duration.
function onPacket(st: Intake, packet: Packet, step: (c: Cmd) => void): number {
  const frames = intakePacket(st, packet);
  for (const c of frames) step(c);
  return frames.length;
}
