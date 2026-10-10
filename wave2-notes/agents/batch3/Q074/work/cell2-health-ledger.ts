// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation.
type Cause = 'heal' | 'kill' | 'fall' | 'heat' | 'spiky';

interface Vitals { health: number; maxHealth: number; spawn: { x: number; y: number; z: number }; }

type LedgerEvent =
  | { kind: 'health'; target: number; delta: number; cause: Cause }
  | { kind: 'kill'; target: number; spawn: Vitals['spawn']; cause: Cause };

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

// One ledger entry for every health change. Order: remember the previous value, clamp to [0, max],
// then either refill to max and emit one kill, or emit one health change carrying the delta.
function applyHealth(target: number, v: Vitals, delta: number, cause: Cause, out: LedgerEvent[]): number {
  const previous = v.health;
  v.health = clamp(v.health + delta, 0, v.maxHealth);
  if (v.health <= 0) {
    v.health = v.maxHealth;
    out.push({ kind: 'kill', target, spawn: v.spawn, cause });
  } else {
    out.push({ kind: 'health', target, delta, cause });
  }
  return previous;
}

// Undo of a predicted change when the server refuses it: put back the remembered value.
function rollback(v: Vitals, previous: number): void {
  v.health = previous;
}

// Landing damage. A vertical speed change c gives a fall height c^2 / (2g). The first 7 units are free;
// the rest is rounded to whole units and halved. Zero means nothing is sent.
function fallDamage(prevVz: number, vz: number, g: number): number {
  const change = Math.abs(Math.abs(prevVz) - Math.abs(vz));
  const raw = Math.max((change * change) / (2 * g) - 7, 0);
  const damage = Math.round(raw) / 2;
  return damage > 0.01 ? damage : 0;
}

export {};
