// Licence: GPL-2.0 (code) and CC-BY-SA-3.0 (game content scripts), per donor default/COPYING. clean-room sketch of the mechanism, not a translation.
export interface SpawnPlan {
  name: string;
  weight: number;   // share of the base chance this plan takes (donor: spawn_rate)
  cap: number;      // spawns allowed for the whole zone set (donor: spawn_limit)
}

export interface SpawnPoint {
  id: number;
  // presence and distance gate: true if this plan may appear at this point (zone data predicate)
  allows: (plan: SpawnPlan) => boolean;
}

// One director pass over all points. Returns how many spawns were placed.
export function runDirector(
  points: SpawnPoint[],
  plans: SpawnPlan[],
  baseChance: number,              // zone frequency, e.g. 0.2 for "high"
  rnd: () => number,
  place: (pt: SpawnPoint, plan: SpawnPlan) => void,
): number {
  const remaining = new Map<string, number>(plans.map((p) => [p.name, p.cap] as const));
  let placed = 0;

  // visit points in random order (Fisher-Yates)
  for (let i = points.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [points[i], points[j]] = [points[j], points[i]];
  }

  for (const pt of points) {
    const open = plans.filter((p) => (remaining.get(p.name) ?? 0) > 0 && pt.allows(p));
    if (open.length === 0) continue;
    const plan = open[Math.floor(rnd() * open.length)];
    if (rnd() > baseChance * plan.weight) continue; // roll failed at this point
    place(pt, plan);
    remaining.set(plan.name, (remaining.get(plan.name) ?? 0) - 1);
    placed++;
  }
  return placed;
}
