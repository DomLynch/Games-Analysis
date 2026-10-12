// Clean-room (donor licence GPL-2.0: shape only). Written from the mechanism: shared seed, stamped commands, per-turn fingerprint, remote compare. Not a translation of the donor.
interface Gear { id: number; x: number; y: number; dx: number; dy: number } // fixed-point values as integers
interface Stream { s: number } // one 32-bit state, advanced by draws and by injected history

// Avalanche mixer (murmur3 finaliser style): every input bit moves every output bit.
function mix32(a: number): number {
  let z = (a + 0x9e3779b9) >>> 0;
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
  return (z ^ (z >>> 16)) >>> 0;
}

// Seed both sides from the same text (FNV-1a over the characters, then mixed).
function seedStream(seed: string): Stream {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 0x01000193) >>> 0;
  return { s: mix32(h) };
}

// One draw in [0, 2^32).
function next(st: Stream): number {
  st.s = (st.s + 0x9e3779b9) >>> 0;
  return mix32(st.s);
}

// Inject history into the stream, so later draws depend on everything both sides have seen.
function addRandomness(st: Stream, v: number): void {
  st.s = mix32((st.s ^ v) >>> 0);
}

// Per-gear fingerprint: each field is multiplied by its own odd constant and added (not XOR with shifts).
const K = [0x9e3779b1, 0x85ebca77, 0xc2b2ae3d, 0x27d4eb2f];
function gearFingerprint(g: Gear): number {
  const fields = [g.x, g.y, g.dx, g.dy];
  let acc = 0;
  for (let i = 0; i < 4; i++) acc = (acc + Math.imul(fields[i] | 0, K[i])) >>> 0;
  return mix32((acc ^ g.id) >>> 0);
}

// Turn-end fingerprint. Gears are sorted by id first, so the order of the list cannot change the result.
function turnFingerprint(tick: number, gears: Gear[], st: Stream): number {
  let fp = mix32(tick >>> 0);
  const ordered = [...gears].sort((a, b) => a.id - b.id);
  for (const g of ordered) {
    fp = mix32((fp ^ gearFingerprint(g)) >>> 0);
    addRandomness(st, fp);
  }
  return fp;
}

// Remote compare. A skip (player left) is returned as a named result so the caller can log it; it is never silent.
interface TurnCheck { ok: boolean; skipped?: 'player-left' }
function compareTurn(local: number, remote: number | null, playerLeft: boolean): TurnCheck {
  if (playerLeft) return { ok: true, skipped: 'player-left' };
  return { ok: remote !== null && local === remote };
}

// Synced commands run only at the tick they were stamped with, so both sides apply them at the same tick.
interface Stamped { tick: number; cmd: string; arg: string }
function runAt(tick: number, queue: Stamped[], apply: (c: Stamped) => void): Stamped[] {
  const rest: Stamped[] = [];
  for (const c of queue) {
    if (c.tick === tick) apply(c);
    else rest.push(c);
  }
  return rest;
}

// Fold the argument bytes (not the command name) into the stream for commands that draw random numbers.
function foldArgument(st: Stream, c: Stamped): void {
  let h = 0x811c9dc5;
  for (let i = 0; i < c.arg.length; i++) h = Math.imul(h ^ c.arg.charCodeAt(i), 0x01000193) >>> 0;
  addRandomness(st, mix32((h ^ c.tick) >>> 0));
}
