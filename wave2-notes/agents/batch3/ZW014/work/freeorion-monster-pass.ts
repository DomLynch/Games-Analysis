// Licence: GPL v2 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Kind { name: string; rate: number; limit: number; minHops: number; }   // minHops = jump limit of the location rule
interface Zone { id: number; hopsToPlayer: number; hasMonster: boolean; }        // hops from a player-held zone (precomputed here)
export interface Placement { zone: number; kind: string; }

// Generation pass: each zone is visited once in random order and gets at most one roll.
export function generatePass(zones: Zone[], kinds: Kind[], basicChance: number, rng: () => number): Placement[] {
  if (basicChance <= 0) return [];
  const left = new Map<string, number>(kinds.map((k): [string, number] => [k.name, k.limit]));
  const order = [...zones];
  for (let i = order.length - 1; i > 0; i--) {                                   // Fisher-Yates shuffle
    const j = Math.floor(rng() * (i + 1));
    const tmp = order[i]; order[i] = order[j]; order[j] = tmp;
  }
  const placed: Placement[] = [];
  for (const z of order) {
    // location rule: not occupied, and not within minHops of a player zone; plus the cap must have room
    const eligible = kinds.filter(k =>
      !z.hasMonster && z.hopsToPlayer > k.minHops && (left.get(k.name) ?? 0) > 0);
    if (eligible.length === 0) continue;
    const k = eligible[Math.floor(rng() * eligible.length)];                     // pick ONE kind uniformly
    if (rng() > basicChance * k.rate) continue;                                  // single roll for that kind only
    placed.push({ zone: z.id, kind: k.name });
    left.set(k.name, (left.get(k.name) ?? 0) - 1);
  }
  return placed;
}

export {};
