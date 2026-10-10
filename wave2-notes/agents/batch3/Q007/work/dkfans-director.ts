// Licence: GPL-2.0-or-later (donor header, src/room_entrance.c lines 15-16). Clean-room sketch of the mechanism, not a translation.
// clean-room
interface Kind {
  id: string;
  pool: number;           // finite stock of this kind still waiting to arrive
  allowed: boolean;
  weight: number;         // base weight (donor: entrance_score, default 10)
  requiredSlabs: number;  // presence gate: slabs of the attracting room
  pay: number;            // gold an arrival needs (gate only in this sketch)
}

interface Zone {
  cap: number;            // max live creatures (donor: max_creatures_attracted)
  active: number;
  gold: number;
  roomSlabs: number;      // slabs of the attracting room (one room type here)
  lairFree: number;       // free lair capacity; may go negative when over capacity
  lastAttempt: number;    // game turn of the last due attempt
  intervalTurns: number;  // turns between attempts
}

// Weighted pick: one roll over the cumulative weights of the eligible kinds.
function pickKind(kinds: Kind[], zone: Zone, roll: (n: number) => number): Kind | null {
  const eligible = kinds.filter(k => k.pool > 0 && k.allowed && zone.roomSlabs >= k.requiredSlabs);
  if (eligible.length === 0) return null;
  const weights = eligible.map(k => Math.max(1, k.weight));
  const total = weights.reduce((a, b) => a + b, 0);
  let rnd = roll(total);
  for (let i = 0; i < eligible.length; i++) {
    if (rnd < weights[i]) return eligible[i];
    rnd -= weights[i];
  }
  return null;
}

// One fixed-step turn of the director. Due check, cap, pick, gates; the clock restarts on every due attempt.
export function directorTick(zone: Zone, kinds: Kind[], now: number, roll: (n: number) => number): boolean {
  if (now - zone.lastAttempt < zone.intervalTurns) return false;   // not due
  let spawned = false;
  if (zone.active < zone.cap) {                                     // population cap
    const kind = pickKind(kinds, zone, roll);
    if (kind && zone.gold >= kind.pay && zone.lairFree >= 0) {      // gold gate, lair gate
      kind.pool -= 1;                                                // pool drops only on success
      zone.active += 1;
      spawned = true;
    }
  }
  zone.lastAttempt = now;                                            // clock restarts either way
  return spawned;
}

// Interval scales with the zone's score: a zone scored below the best one waits longer.
export function intervalFor(bestScore: number, ownScore: number, speed: number): number {
  if (ownScore <= 0) return speed;
  return Math.floor((bestScore * speed) / ownScore);
}

export {};
