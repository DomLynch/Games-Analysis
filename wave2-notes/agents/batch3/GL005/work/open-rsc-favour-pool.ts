// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Blessing = { id: string; group: string; levelReq: number; drainRate: number };

interface FavourPool {
  points: number;          // current favour points
  maxLevel: number;        // favour skill level, 1..99
  active: Set<string>;     // blessing ids that are switched on
  debt: number;            // fractional drain carried to the next tick
}

const POINTS_PER_LEVEL = 120;
const DRAIN_SCALE = 0.4;   // 120 / 300 in the donor drain formula

// Switch a blessing on: level gate, empty-pool gate, then turn off every blessing in the same tier group.
function activate(pool: FavourPool, b: Blessing, catalogue: Map<string, Blessing>): boolean {
  if (pool.maxLevel < b.levelReq) return false;
  if (pool.points <= 0) return false;
  for (const id of [...pool.active]) {
    const other = catalogue.get(id);
    if (other && other.group === b.group) pool.active.delete(id);
  }
  pool.active.add(b.id);
  return true;
}

// One call per game tick. gearDivisor is the worn favour bonus (>= 1), not the current pool.
// Returns the displayed favour level and whether the pool ran dry this tick.
function tick(pool: FavourPool, catalogue: Map<string, Blessing>, gearDivisor: number): { level: number; dry: boolean } {
  let total = 0;
  for (const id of pool.active) total += catalogue.get(id)?.drainRate ?? 0;
  if (total === 0) return { level: Math.ceil(pool.points / POINTS_PER_LEVEL), dry: false };

  const perTick = (total * DRAIN_SCALE) / (1 + (gearDivisor - 1) / 32);
  pool.debt += perTick;                       // fix: carry the fraction instead of rounding up every tick
  const take = Math.floor(pool.debt);
  pool.debt -= take;

  if (pool.points > take) {
    pool.points -= take;
    return { level: Math.ceil(pool.points / POINTS_PER_LEVEL), dry: false };
  }
  pool.points = 0;
  pool.active.clear();                        // dry pool: every blessing goes off
  pool.debt = 0;
  return { level: 0, dry: true };
}

// Shrine or temple recharge: full pool, plus a shrine-specific bonus of levels (0 for a plain altar).
function recharge(pool: FavourPool, bonusLevels: number): void {
  pool.points = (pool.maxLevel + bonusLevels) * POINTS_PER_LEVEL;
  pool.debt = 0;
}

export {};
