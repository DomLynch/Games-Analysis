// Licence: AGPL-3.0 (donor, COPYING). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Plot {
  rate: number;          // credits per hour (donor: base rate, times 0.8 when reduced, truncated)
  pool: number;          // maintenance credits; negative = owed, which is also the decay debt
  maxCondition: number;  // decay scale; 0 means the plot cannot decay
  bank: number;          // owner's bank credits
  lastAccrueS: number;   // seconds, updated on each accrue
  isBuilding: boolean;
}

const DELAY_DESTROY_HOURS = 30 * 24; // donor getDelayDestroyHours

// Delta-time accrual: the same result however often it runs.
function accrue(p: Plot, nowS: number): void {
  const due = (p.rate / 3600) * (nowS - p.lastAccrueS);
  p.lastAccrueS = nowS;
  p.pool -= due;
}

// Fixed: damage is capped at max, so zero condition reads 0 (donor adds 1 and reads 1 at zero).
function percentCondition(p: Plot): number {
  if (p.maxCondition <= 0) return 100;
  const damage = Math.min(Math.max(0, -p.pool), p.maxCondition);
  return Math.floor(((p.maxCondition - damage) * 100) / p.maxCondition);
}

type Outcome = "paid" | "warned" | "condemned" | "destroyed";

// Daily check (donor: StructureMaintenanceTask::run). One outcome per run.
function dailyCheck(p: Plot, nowS: number): Outcome {
  accrue(p, nowS);
  const oneWeek = 7 * 24 * p.rate - p.pool; // donor: 168 h of rate, less the surplus
  if (oneWeek > 0 && p.bank >= oneWeek) {
    p.bank -= oneWeek;
    p.pool += oneWeek;
    return "paid";
  }
  if (percentCondition(p) > 0) return "warned"; // not decayed: warn and check again tomorrow
  if (p.isBuilding && p.pool + DELAY_DESTROY_HOURS * p.rate > 0) return "condemned";
  return "destroyed";
}

export {};
