// Licence: GPL-2.0 / CC-BY-SA-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

// Two forces together are worth (sqrt a + sqrt b)^2, so a group is more than the sum of its parts.
export function combine(a: number, b: number): number {
  return a + b + 2 * Math.sqrt(a * b);
}

export function combineAll(ratings: number[]): number {
  return ratings.reduce((acc, r) => combine(acc, r), 0);
}

// Extra rating still needed to reach `target` when `committed` is already on the target.
export function neededRating(target: number, committed: number): number {
  if (committed >= target || target <= 0) return 0;
  return target + committed - 2 * Math.sqrt(target * committed);
}

export interface ThreatView {
  local: number;      // enemy rating in the target's own area
  neighbour: number;  // enemy rating one jump out
  jump2: number;      // enemy rating two jumps out
  potential: number;  // extra for enemies that could arrive (0 if none)
  safety: number;     // risk multiplier, from a per-difficulty table
}

export function threatOf(v: ThreatView): number {
  return v.potential + v.safety * combineAll([v.local, 0.75 * v.neighbour, 0.5 * v.jump2]);
}

export interface Request { min: number; max: number; }

// Min and max extra rating to send to one target, net of what is already committed there.
export function requestFor(threat: number, committed: number, minFactor = 1.3, maxFactor = 2.5): Request {
  return {
    min: neededRating(minFactor * threat, committed),
    max: neededRating(maxFactor * threat, committed),
  };
}

// Fleet threat memory: when the system is not seen this turn, keep 98% of the last value at least.
export function fleetThreatMemory(seen: number, previous: number, visible: boolean, decay = 0.98): number {
  return visible ? seen : Math.max(seen, decay * previous);
}

export {};
