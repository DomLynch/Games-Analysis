// Licence: MIT (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const REFILL_FRAMES_PER_S = 120;
const BURST_FRAMES = 180;
const REFILL_BYTES_PER_S = 64 * 1024;
const BURST_BYTES = 128 * 1024;
const ABUSE_WINDOW_S = 10;
const ABUSE_KICK_SECONDS = 5;
const ABUSE_SECOND_DROP_FLOOR = 30;

interface GateState {
  frames: number;
  bytes: number;
  lastRefillS: number;
  dropSecond: number;
  dropsThisSecond: number;
  abusiveSeconds: number[];   // seconds whose drop count reached the floor, pruned to the window
}

type Verdict = { kind: "allow" } | { kind: "drop" | "kick"; cause: "rate" | "bytes" };

function newGate(nowS: number): GateState {
  return {
    frames: BURST_FRAMES,
    bytes: BURST_BYTES,
    lastRefillS: nowS,
    dropSecond: Math.floor(nowS),
    dropsThisSecond: 0,
    abusiveSeconds: [],
  };
}

// Every drop, whatever its cause, lands in the same one-second tally.
function tallyDrop(g: GateState, nowS: number): "drop" | "kick" {
  const sec = Math.max(Math.floor(nowS), g.dropSecond); // monotonic: a backwards clock cannot reopen a second
  if (sec !== g.dropSecond) {
    g.dropSecond = sec;
    g.dropsThisSecond = 0;
  }
  g.dropsThisSecond++;
  if (g.dropsThisSecond === ABUSE_SECOND_DROP_FLOOR) g.abusiveSeconds.push(sec); // once per second
  const cutoff = sec - ABUSE_WINDOW_S;
  while (g.abusiveSeconds.length > 0 && g.abusiveSeconds[0] <= cutoff) g.abusiveSeconds.shift();
  return g.abusiveSeconds.length >= ABUSE_KICK_SECONDS ? "kick" : "drop";
}

// Runs before any parse. Allow spends tokens; a drop spends nothing.
function consumeFrame(g: GateState, nowS: number, approxBytes: number): Verdict {
  const elapsed = Math.max(0, nowS - g.lastRefillS);
  g.frames = Math.min(BURST_FRAMES, g.frames + elapsed * REFILL_FRAMES_PER_S);
  g.bytes = Math.min(BURST_BYTES, g.bytes + elapsed * REFILL_BYTES_PER_S);
  g.lastRefillS = nowS;
  if (g.frames < 1) return { kind: tallyDrop(g, nowS), cause: "rate" };
  if (g.bytes < approxBytes) return { kind: tallyDrop(g, nowS), cause: "bytes" };
  g.frames -= 1;
  g.bytes -= approxBytes;
  return { kind: "allow" };
}

export { newGate, consumeFrame, tallyDrop };
export {};
