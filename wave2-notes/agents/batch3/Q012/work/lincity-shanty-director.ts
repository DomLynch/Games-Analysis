// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface ZoneCity {
  pool: number;      // people waiting for housing in the zone
  communes: number;  // reserved-population buildings
  spawns: number;    // current count of spawned settlements
}

export interface DirectorParams {
  drainPerSpawn: number;   // pool lost per settlement per update
  reservePerCommune: number;
  minPool: number;         // surplus needed before the first settlement
  poolPerSpawn: number;    // surplus per additional settlement
  batchDivisor: number;    // extra spawns per this much deficit
}

export interface UpdateResult { pool: number; drained: number; added: number; removed: number; }

// One periodic update. addOne/removeOne do the placement and return success; removal is a burn-down event.
export function periodicUpdate(
  z: ZoneCity,
  p: DirectorParams,
  addOne: () => boolean,
  removeOne: () => boolean,
): UpdateResult {
  const before = z.pool;
  z.pool = Math.max(0, z.pool - p.drainPerSpawn * z.spawns);
  const drained = before - z.pool;

  const surplus = z.pool - p.reservePerCommune * z.communes;
  let target = Math.trunc((surplus - p.minPool) / p.poolPerSpawn); // integer division truncates toward zero
  if (target < 0) target = 0;

  let added = 0;
  let removed = 0;
  if (target > z.spawns) {
    const n = 1 + Math.trunc((target - z.spawns) / p.batchDivisor);
    for (let k = 0; k < n; k++) if (addOne()) added++;
  } else if (z.spawns > 0 && target < z.spawns - 1) {  // hysteresis: one spare is tolerated
    const n = 1 + Math.trunc((z.spawns - target) / p.batchDivisor);
    for (let k = 0; k < n; k++) if (removeOne()) removed++;
  }
  z.spawns += added - removed;
  return { pool: z.pool, drained, added, removed };
}

export {};
