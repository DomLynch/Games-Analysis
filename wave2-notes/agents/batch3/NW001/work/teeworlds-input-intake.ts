// Licence: zlib-style (donor license.txt). Clean-room sketch of the mechanism, not a translation of the donor lines.
type Rule =
  | { kind: "range"; name: string; min: number; max: number }
  | { kind: "mask"; name: string; mask: number };

type RawInput = Record<string, number>;

interface Slot { gameTick: number; data: RawInput }

interface Intake {
  slots: (Slot | undefined)[];   // ring of input slots
  next: number;                  // next write index
  lastIntendedTick: number;      // watermark used to decide timing replies
  rejects: number;               // counted per client, not logged per packet
}

const RING_SLOTS = 200;            // donor: server.cpp:958 (% 200)
const PING_CORRECTION_MAX_MS = 50; // donor: server.cpp:948 clamp(..., 0, 50)

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function newIntake(): Intake {
  return { slots: new Array<Slot | undefined>(RING_SLOTS).fill(undefined), next: 0, lastIntendedTick: -1, rejects: 0 };
}

// Returns the first field that breaks its rule, or null. Reject the whole input; never clamp.
function firstFailure(rules: Rule[], input: RawInput): string | null {
  for (const r of rules) {
    const v = input[r.name];
    if (v === undefined || !Number.isInteger(v)) return r.name;
    if (r.kind === "range" && (v < r.min || v > r.max)) return r.name;
    if (r.kind === "mask" && (v & r.mask) !== v) return r.name;
  }
  return null;
}

interface Packet {
  intendedTick: number;
  data: RawInput;
  pingCorrectionMs: number;   // client-reported, clamped below
  ageMs: number;              // now minus send time of the snapshot the client acked
  msUntilTickStart: number;   // server-side timing for the reply
}

interface Outcome {
  timingReplyMs: number | null;
  accepted: boolean;
  latencyMs: number;
  rejectedOn: string | null;
}

// simplified: validates at receipt (donor validates at receipt for the direct path and again at tick time for the predicted path),
// drops the fire-on-receipt path entirely (donor calls OnDirectInput on receipt), omits the client-side smooth-time
// controller, the snapshot-rate and snapshot-delta bookkeeping, and the INPUTTIMING packet encoding. The watermark keeps the
// maximum (donor assigns it unconditionally, so an older packet can move it backwards).
// maxAheadTicks is zone data (our number; the donor has no bound at all, so a client could queue inputs arbitrarily far ahead).
function receive(c: Intake, p: Packet, currentTick: number, rules: Rule[], maxAheadTicks: number): Outcome {
  const timingReplyMs = p.intendedTick > c.lastIntendedTick ? p.msUntilTickStart : null;
  c.lastIntendedTick = Math.max(c.lastIntendedTick, p.intendedTick);

  const latencyMs = Math.max(0, p.ageMs - clamp(p.pingCorrectionMs, 0, PING_CORRECTION_MAX_MS));

  const bad = p.intendedTick > currentTick + maxAheadTicks ? "intendedTick" : firstFailure(rules, p.data);
  if (bad !== null) {
    c.rejects++;
    return { timingReplyMs, accepted: false, latencyMs, rejectedOn: bad };
  }

  // late input (its tick has already started) runs on the next tick, as in the donor (server.cpp:940-941)
  const gameTick = p.intendedTick <= currentTick ? currentTick + 1 : p.intendedTick;
  c.slots[c.next] = { gameTick, data: p.data };
  c.next = (c.next + 1) % RING_SLOTS;
  return { timingReplyMs, accepted: true, latencyMs, rejectedOn: null };
}

// Called once per server tick for each client (donor: server.cpp:1397-1400 scans the ring for GameTick == Tick()).
function inputFor(c: Intake, tick: number): RawInput | undefined {
  for (const s of c.slots) {
    if (s !== undefined && s.gameTick === tick) return s.data;
  }
  return undefined;
}

export {};
