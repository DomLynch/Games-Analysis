// clean-room sketch of the donor's rules (MIT donor). Written from the described mechanism, not a translation.
type Bucket = "services" | "upkeep" | "repairs" | "autoRepair" | "mitigation" | "breach" | "dlq";

interface Ledger {
  balance: number;
  income: number;
  expenses: Record<Bucket, number>;
}

interface Svc {
  health: number;
  buildCost: number;
  upkeepPerMin: number;
  instanceFactor: number;
}

// Single entry point for money out: the balance and the ledger bucket move together.
function spend(l: Ledger, bucket: Bucket, amount: number): void {
  if (amount <= 0) return;
  l.balance -= amount;
  l.expenses[bucket] += amount;
}

// Single entry point for money in. Income is a separate line from expenses.
function earn(l: Ledger, amount: number): void {
  l.balance += amount;
  l.income += amount;
}

// A sale returns part of a purchase. It reverses the purchase line, it is not income, and the bucket is clamped at zero.
function refund(l: Ledger, bucket: Bucket, amount: number): void {
  l.balance += amount;
  l.expenses[bucket] = Math.max(0, l.expenses[bucket] - amount);
}

// Upkeep multiplier ramps from base to max over scaleTime game seconds, then holds.
function upkeepMultiplier(gameSeconds: number, base: number, max: number, scaleTime: number): number {
  const progress = Math.min(gameSeconds / scaleTime, 1);
  return base + (max - base) * progress;
}

// Per-frame drain. dt is already game-scaled (paused time is zero), so upkeep freezes with the sim.
function tickUpkeep(l: Ledger, svcs: Svc[], dt: number, multiplier: number, enabled: boolean): void {
  if (!enabled) return;
  for (const s of svcs) {
    spend(l, "upkeep", (s.upkeepPerMin / 60) * dt * multiplier * s.instanceFactor);
  }
}

const REPAIR_PCT = 0.15;   // repairCostPercent (config.js:877)
const AUTO_PCT = 0.1;      // autoRepairCostPercent (config.js:879)
const HEAL_PER_S = 5;      // hard-coded in economy.js:354, not read from config

function repairCost(s: Svc): number {
  return Math.ceil(s.buildCost * REPAIR_PCT);
}

// Paid auto-repair. The heal and the charge share ONE flag here. The donor gates the heal on mode only
// and the charge on the upkeep toggle, so with upkeep off the heal is free.
function autoRepairTick(l: Ledger, svcs: Svc[], paidOn: boolean, dt: number): void {
  if (!paidOn) return;
  const total = svcs.reduce((a, s) => a + s.buildCost, 0);
  spend(l, "autoRepair", (total * AUTO_PCT / 60) * dt);
  for (const s of svcs) {
    if (s.health < 100) s.health = Math.min(100, s.health + HEAL_PER_S * dt);
  }
}

function sell(l: Ledger, s: Svc, bucket: Bucket): void {
  refund(l, bucket, Math.floor(s.buildCost / 2));
}

// Sketch's own invariant (not taken from the donor's tests): balance = start + income - expenses.
function booked(l: Ledger, startBalance: number): boolean {
  const out = Object.values(l.expenses).reduce((a, b) => a + b, 0);
  return Math.abs(l.balance - (startBalance + l.income - out)) < 1e-9;
}

export {};
