// Licence: GPL-2.0-or-later (donor, per file header). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Ent {
  id: number;
  x: number;
  y: number;
  map: number;
}

export interface InterestCfg {
  enterRadius: number; // a new entity is perceived when it is within this distance
  leaveRadius: number; // a known entity is dropped only beyond this distance (must be >= enterRadius)
  dist: (a: Ent, b: Ent) => number;
}

// One call per player per cadence tick (the donor uses a fixed 300 ms). Order matches the donor:
// leave first (known entities that moved out), then enter (new entities in range).
export function interestTick(
  self: Ent,
  known: Set<number>,
  byId: Map<number, Ent>,
  candidates: Ent[], // a spatial query result; the donor scans every object on the map instead
  cfg: InterestCfg,
): { spawn: Ent[]; despawn: number[] } {
  const despawn: number[] = [];
  for (const id of [...known]) {
    const e = byId.get(id);
    if (e === undefined || e.map !== self.map || cfg.dist(self, e) > cfg.leaveRadius) {
      known.delete(id);
      despawn.push(id);
    }
  }
  const spawn: Ent[] = [];
  for (const e of candidates) {
    if (e.id === self.id || e.map !== self.map || known.has(e.id)) continue;
    if (cfg.dist(self, e) <= cfg.enterRadius) {
      known.add(e.id);
      spawn.push(e);
    }
  }
  return { spawn, despawn };
}

export {};
