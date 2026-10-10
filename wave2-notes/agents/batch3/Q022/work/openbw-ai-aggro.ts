// Licence: unclear (donor tree has no LICENSE file; README.md names none). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Candidate {
  id: number;
  x: number;
  y: number;
  alive: boolean;
  invincible: boolean;
  enemy: boolean;            // donor unit_target_is_enemy (8542-8546)
  visible: boolean;          // donor unit_target_is_visible (1461-1463)
  attackableByMe: boolean;   // donor unit_can_attack_target(u, target) (1538)
  canHitMe: boolean;         // donor unit_can_attack_target(target, u)
  canHitAnyone: boolean;     // donor unit_can_attack(target)
  canMove: boolean;          // donor u_can_move(target)
  active: boolean;           // donor u_completed(target); false adds one
}

interface Me {
  id: number;
  x: number;
  y: number;
  acquireRange: number;      // tiles; donor target_acquisition_range (12245), from game data
  inBunker: boolean;
  minRange: number;          // pixels; weapon minimum range (donor 1903), value not read
}

const TILE = 32;             // donor bwgame.h 1898: range x 32
const BUCKETS = 6;           // donor 1874: targets[6]
const BUCKET_CAP = 16;       // donor 1888: 0x10 per bucket
const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.hypot(a.x - b.x, a.y - b.y);

// Donor unit_target_attack_priority (1841-1862): 0 = a target that can hit me; higher = worse.
function priority(t: Candidate): number {
  let r = 0;
  if (!t.canHitMe) {
    if (t.canHitAnyone) r += 2;
    else if (t.canMove) r += 3;
    else r += 4;
  }
  if (!t.active) r += 1;
  if (r === 0 && !t.canHitAnyone) r += 1;
  return r;
}

// Donor get_default_priority_targets (1868-1891) and find_acquire_target (1893-1916):
// filter, sort into capped buckets, return the nearest in the first non-empty bucket.
export function acquire(me: Me, foes: Candidate[]): Candidate | null {
  const maxDist = (me.acquireRange + (me.inBunker ? 2 : 0)) * TILE;
  const buckets: Candidate[][] = Array.from({ length: BUCKETS }, () => []);
  for (const t of foes) {
    if (!t.alive || t.invincible || !t.enemy || !t.visible || !t.attackableByMe) continue;
    const d = dist(me, t);
    if (d > maxDist) continue;
    if (me.minRange > 0 && d <= me.minRange) continue;
    const b = buckets[priority(t)];
    if (b.length < BUCKET_CAP) b.push(t);
  }
  for (const b of buckets) {
    if (b.length === 0) continue;
    let best = b[0];
    for (const t of b) if (dist(me, t) < dist(me, best)) best = t; // strict minimum, first wins ties
    return best;
  }
  return null;
}

// Donor attack_unit_reacquire_target (2743-2783), simplified: a bucket-0 target still in weapon range is kept;
// otherwise a new scan replaces the current target only when it is in a strictly better bucket.
export function reacquire(me: Me, current: Candidate | null, foes: Candidate[], inWeaponRange: (t: Candidate) => boolean): Candidate | null {
  let target = current;
  let prio = Number.MAX_SAFE_INTEGER;
  if (target !== null) {
    if (target.attackableByMe && target.alive) {
      prio = priority(target);
      if (prio === 0) {
        if (inWeaponRange(target)) return target;
        prio = 1;
      }
    } else {
      target = null;
    }
  }
  if (target === null || prio !== 0) {
    const fresh = acquire(me, foes);
    if (fresh !== null && priority(fresh) < prio) target = fresh;
  }
  return target;
}

// Donor order gate (12617-12621) and scan timer (4238-4239): act when the timer is zero, then reset it.
export function tickTimer(timer: number, resetTo: number): { timer: number; act: boolean } {
  if (timer > 0) return { timer: timer - 1, act: false };
  return { timer: resetTo, act: true };
}

// Donor update_units (12882-12887): visible units get an offset 0-7 so their 8-frame gates are spread out.
export const staggerSlot = (index: number): number => index % 8;

export {};
