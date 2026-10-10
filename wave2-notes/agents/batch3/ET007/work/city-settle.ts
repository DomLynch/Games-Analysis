// Licence: MIT (donor, amilich-isometric-city, Copyright (c) 2025 amilich). Shape adapted from the described mechanism; rewritten, not copied.
export {};

const TICKS_PER_DAY = 30;      // donor: a day is 30 ticks
const SETTLE_EVERY_DAYS = 7;   // donor: deposit when the new day number is a multiple of 7
const TAX_LAG = 0.03;          // donor: the effective (lagged) tax moves 3% of the gap per tick
const UPGRADE_MAX_LEVEL = 5;   // donor: service buildings stop at level 5

interface Ledger { money: number; income: number; expenses: number; }
interface CityCounts { population: number; jobs: number; }
interface ServiceBudget { buildings: number; costEach: number; funding: number; } // funding in percent, 100 = full

// Monthly faucet: population and jobs taxed at the raw tax rate (percent).
function monthlyIncome(c: CityCounts, taxRate: number): number {
  return Math.floor(c.population * taxRate * 0.1 + c.jobs * taxRate * 0.05);
}

// Monthly sink: each service's cost times its funding percent.
function monthlyExpenses(services: ServiceBudget[]): number {
  let total = 0;
  for (const s of services) {
    const cost = s.buildings * s.costEach;
    total += Math.floor((cost * s.funding) / 100);
  }
  return total;
}

// The lagged tax rate used only for demand; income uses the raw rate.
function laggedTax(effective: number, target: number): number {
  return effective + (target - effective) * TAX_LAG;
}

interface Clock { tick: number; day: number; }

// One call per tick. A day rolls over after TICKS_PER_DAY ticks.
function advanceClock(c: Clock): { clock: Clock; rolled: boolean } {
  const tick = c.tick + 1;
  if (tick >= TICKS_PER_DAY) return { clock: { tick: 0, day: c.day + 1 }, rolled: true };
  return { clock: { tick, day: c.day }, rolled: false };
}

// Weekly settlement: one quarter of the monthly net, deposited on day 7, 14, 21, 28.
// Math.floor rounds toward minus infinity, as in the donor, so a deficit rounds down.
function settleIfWeekly(ledger: Ledger, day: number, rolled: boolean): Ledger {
  if (!rolled || day % SETTLE_EVERY_DAYS !== 0) return ledger;
  return { ...ledger, money: ledger.money + Math.floor((ledger.income - ledger.expenses) / 4) };
}

// Build gate: a zero-cost tool always passes; otherwise the balance must cover the cost.
function canBuild(money: number, cost: number): boolean {
  return cost <= 0 || money >= cost;
}

// Upgrade cost doubles per level: base x 2^level, up to the maximum level.
function tryUpgrade(ledger: Ledger, baseCost: number, level: number): { ok: boolean; ledger: Ledger } {
  if (level >= UPGRADE_MAX_LEVEL) return { ok: false, ledger };
  const cost = baseCost * Math.pow(2, level);
  if (ledger.money < cost) return { ok: false, ledger };
  return { ok: true, ledger: { ...ledger, money: ledger.money - cost } };
}

// Example: 1000 people and 400 jobs at 9 percent, one service of 2 buildings at 50 each, full funding.
let ledger: Ledger = { money: 10000, income: 0, expenses: 0 };
ledger.income = monthlyIncome({ population: 1000, jobs: 400 }, 9);
ledger.expenses = monthlyExpenses([{ buildings: 2, costEach: 50, funding: 100 }]);
let clock: Clock = { tick: 29, day: 6 };
const step = advanceClock(clock);
clock = step.clock;
ledger = settleIfWeekly(ledger, clock.day, step.rolled);
console.log(ledger.money, canBuild(ledger.money, 500), tryUpgrade(ledger, 500, 0).ok);
