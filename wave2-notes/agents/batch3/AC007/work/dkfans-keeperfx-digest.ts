// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Digest = number; // unsigned 32-bit

// Rotate-left-5 then XOR, the same shape as the donor's per-field fold.
function fold(d: Digest, v: number): Digest {
  const rot = ((d << 5) | (d >>> 27)) >>> 0;
  return (rot ^ (v >>> 0)) >>> 0;
}

interface Entity { id: number; x: number; y: number; hp: number; }

// Per-entity fold, then an order-independent sum over the list.
function digestEntities(list: Entity[]): Digest {
  let sum = 0;
  for (const e of list) {
    let d = 0;
    d = fold(d, e.id);
    d = fold(d, e.x);
    d = fold(d, e.y);
    d = fold(d, e.hp);
    sum = (sum + d) >>> 0;
  }
  return sum;
}

interface TurnState { turn: number; entities: Entity[]; actionSeed: number; }
interface PeerPacket { turn: number; checksum: number; empty: boolean; }

// Turn checksum: entity digest plus one RNG seed. Game turn itself is not folded in.
function turnChecksum(s: TurnState): Digest {
  return (digestEntities(s.entities) + s.actionSeed) >>> 0;
}

// Host packet is the reference. A missing peer packet is a mismatch, as is any checksum that differs.
function mismatchTurn(host: PeerPacket, peers: PeerPacket[]): number | null {
  for (const p of peers) {
    if (p.empty || p.checksum !== host.checksum) return host.turn;
  }
  return null;
}

// Ring of recent turn checksums, kept so a later compare can look up the desync turn.
class DigestRing {
  private slots: { turn: number; checksum: number }[] = [];
  constructor(private readonly size = 15) {}
  push(turn: number, checksum: number): void {
    const entry = { turn, checksum };
    if (this.slots.length < this.size) this.slots.push(entry);
    else this.slots[turn % this.size] = entry;
  }
  find(turn: number): { turn: number; checksum: number } | undefined {
    return this.slots.find((s) => s.turn === turn);
  }
}

// Resync gate: the first `limit` attempts are not cooled down. After that, one attempt per cooldown window.
// Every allowed attempt re-arms the cooldown. A game turn going backwards resets the gate.
class ResyncGate {
  private attempts = 0;
  private cooldownEnd = 0;
  private lastTurn = 0;
  constructor(private readonly limit = 5, private readonly cooldownMs = 5 * 60 * 1000) {}
  allow(nowMs: number, turn: number): boolean {
    if (turn < this.lastTurn) { this.attempts = 0; this.cooldownEnd = 0; }
    this.lastTurn = turn;
    if (this.attempts >= this.limit && nowMs < this.cooldownEnd) return false;
    if (this.attempts < this.limit) this.attempts += 1;
    this.cooldownEnd = nowMs + this.cooldownMs;
    return true;
  }
}
export {};
