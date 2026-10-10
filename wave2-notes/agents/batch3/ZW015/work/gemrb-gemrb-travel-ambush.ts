// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type ZoneId = string;

interface Leg {
  from: ZoneId;
  to: ZoneId;
  cost: number;                      // route cost of this leg
  encounterPct: number;              // 0..100 chance that travel on this leg is interrupted
  ambushSlots: (ZoneId | null)[];    // 5 ambush zone slots, null = empty
}

type Graph = Map<ZoneId, Leg[]>;
type Rng = (lo: number, hi: number) => number; // inclusive bounds

interface Plan {
  dist: Map<ZoneId, number>;
  via: Map<ZoneId, Leg>;             // the leg that reached each zone on its best known path
}

// Label-correcting search. Only the first leg to each neighbour from a zone is considered.
function plan(g: Graph, start: ZoneId): Plan {
  const dist = new Map<ZoneId, number>([[start, 0]]);
  const via = new Map<ZoneId, Leg>();
  const pending: ZoneId[] = [start];
  while (pending.length > 0) {
    const here = pending.shift() as ZoneId;
    const seen = new Set<ZoneId>();
    for (const leg of g.get(here) ?? []) {
      if (seen.has(leg.to)) continue;
      seen.add(leg.to);
      const candidate = (dist.get(here) ?? 0) + leg.cost;
      if (candidate < (dist.get(leg.to) ?? Infinity)) {
        dist.set(leg.to, candidate);
        via.set(leg.to, leg);
        pending.push(leg.to);
      }
    }
  }
  return { dist, via };
}

// Legs from start to target, in travel order. Empty if target is the start or unreachable.
function legsTo(p: Plan, start: ZoneId, target: ZoneId): Leg[] {
  const legs: Leg[] = [];
  let at = target;
  while (at !== start && p.via.has(at)) {
    const leg = p.via.get(at) as Leg;
    legs.unshift(leg);
    at = leg.from;
  }
  return at === start ? legs : [];
}

export interface TravelResult {
  reached: ZoneId;          // where the player ends up
  ambushZone?: ZoneId;      // set when an interruption happened
  ambushAtCost?: number;    // route cost at which the interruption happens (half the leg cost before its far end)
}

// Walk the legs in order; the first leg whose roll succeeds interrupts the trip.
// The roll is encounterPct > rng(0, 99), as in the donor (a value of 100 always fires).
export function travel(g: Graph, start: ZoneId, target: ZoneId, currentZone: ZoneId, rng: Rng): TravelResult {
  const p = plan(g, start);
  const legs = legsTo(p, start, target);
  for (const leg of legs) {
    if (leg.encounterPct <= rng(0, 99)) continue;
    // pick an ambush zone: random start slot, wrap over 5, skip empty and the current zone
    const first = rng(0, 4);
    for (let j = 0; j < 5; j++) {
      const zone = leg.ambushSlots[(first + j) % 5];
      if (zone && zone !== currentZone) {
        // the ambush sits at the middle of the leg: cost to far end minus half the leg
        const atCost = (p.dist.get(leg.to) ?? 0) - Math.floor(leg.cost / 2);
        return { reached: zone, ambushZone: zone, ambushAtCost: atCost };
      }
    }
    return { reached: target }; // fired, but no usable ambush zone: the trip completes
  }
  return { reached: target };
}

export {};
