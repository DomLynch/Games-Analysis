# amilich-isometric-city (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/amilich-isometric-city/src/lib/simulation.ts` | Licence: MIT (LICENSE line 3 "Copyright (c) 2025 amilich"; line 5 grants use, copy, modify, merge, publish, distribute) | TypeScript | symbol `simulateTick` (settlement at 2446-2453), `calculateStats` (income and expenses at 1897-1907)

Checked: Read: `simulateTick` from 2405 to 2505 (budget costs 2410, tax lag 2415-2416, stats 2419-2420, demand smoothing 2427-2431, clock and weekly settlement 2446-2459, return 2493-2505); the start of `simulateTick` (2152-2404) was not read beyond the grep hits. Read in full: `calculateStats` income, expenses and happiness terms (1894-1945). Read in full: `upgradeServiceBuilding` (1351-1395). Read in part: the tax terms of the demand block (1834-1894). `updateBudgetCosts` (1965-2011): grep hits for the cost lines only (2004-2011). Client loop: GameContext.tsx 797-830 (tick), 848-850 (tax setter), 876-892 (build gate, the first lines; the debit at 912 from grep), 1000-1025 (connect to city), 1405-1430 (addMoney), 173-206 and 348-375 (save and load; the validation at 206 from grep only). Callers: `simulateTick` is called from GameContext.tsx 819 (grep over GameContext.tsx, Game.tsx and simulation.ts); `calculateStats` from simulation.ts 2419 only. Grep over src, excluding coaster, found no inflation control, auction, market, or shop pricing: the isocity "shops" are fixed build costs (games/isocity/types/game.ts 35-94). Confidence: high on the settlement and sink formulas; high on the client-owned ledger. The hint file (types/economy.ts) holds type declarations only (first 80 lines read); the real code is simulation.ts.

## 1. Mechanism

- One balance, one owner in this donor: `stats.money` lives in the client state (GameContext.tsx; saved to localStorage, 348-375). The simulation tick does not add or remove money except at the weekly settlement, and carries the old balance across (`newStats.money = state.stats.money`, 2420).
- Faucet (monthly): `income = floor(population x taxRate x 0.1 + jobs x taxRate x 0.05)` (1897). The raw tax rate is used, not the lagged one. Tax is a percent (the start value is 9, 1205-1206).
- Sinks (monthly): `expenses` is the sum over eight services of `floor(cost x funding / 100)` (1899-1907). `cost` is the building count times a per-building cost, recomputed each tick in `updateBudgetCosts` (2004-2011, called at 2410). Police and fire 50 each, hospital 100, school 30 and university 100, roads 2, subway tiles 3, subway stations 25, parks 10, power plant 150, water tower 75. Funding starts at 100 (1093-1100).
- Calendar: a day is 30 ticks (2446: a day rolls when the tick reaches 30). The settlement runs on each day rollover when the new day is a multiple of 7 (2451): days 7, 14, 21, 28. A month has 30 days (2456-2457: a day above 30 rolls to day 1 of the next month). Each deposit is one quarter of the monthly net, `floor((income - expenses) / 4)` (2452), so four deposits pay about one month's net.
- Lagged tax: `effectiveTaxRate` moves 3% of the gap to the target each tick (2415-2416). Only the demand block uses the lagged rate: tax multiplier `max(0, 1 - (eff - 9) / 91)` (1842) and additive `(9 - eff) x 2` (1846); commercial additive x0.8 and industrial x0.5 (1893-1894); demand clamped to -100..100 (1892-1894). Income does not use it.
- Demand smoothing: 12% of the gap per tick (2427-2430).
- Tax also feeds happiness: `(100 - taxRate x 3) x 0.15` inside the happiness sum (1930).
- Sink on upgrade: `upgradeServiceBuilding` costs `baseCost x 2^level` (1377), where `baseCost` is the build cost from the tool table. The level is capped at 5 (1250, 1362). The upgrade needs the balance to cover it (1380), then debits it (1389). Level 0 to 5 in total costs 31 times the base cost (base x (1+2+4+8+16)).
- Build sink: a build with cost above zero is refused when the balance is below the cost (GameContext.tsx 887), then debited (912). Build costs are fixed per tool (games/isocity/types/game.ts: bulldoze 10, road 25, residential zone 50, police station 500, power plant 3000, up to space program 15000).
- Advisor: the finance advisor warns when `income - expenses` is negative and rates the warning critical below -500 (2067-2073). The warning does not change the ledger.
- Tick: the client runs `simulateTick` on a `setInterval` (814) at a fixed interval per speed: desktop 500, 300, 200 ms for speeds 1 to 3; mobile 750, 450, 300 ms (810-812). Each interval runs one tick (819); there is no elapsed-time accumulator.

## 2. Key functions

- `simulateTick`: `/mnt/frankendom-donors/amilich-isometric-city/src/lib/simulation.ts` 2152-2505 (the money path read at 2405-2505). Order: budget costs, lagged tax, stats, money carry, demand smoothing, clock, weekly deposit, advisor messages, history, return.
- `calculateStats`: `/mnt/frankendom-donors/amilich-isometric-city/src/lib/simulation.ts` 1757-1935. Demand from effective tax (1842-1846, 1892-1894), income (1897), expenses (1899-1907), happiness (1930).
- `updateBudgetCosts`: `/mnt/frankendom-donors/amilich-isometric-city/src/lib/simulation.ts` 1965-2011 (cost lines from grep). Building counts times per-building costs.
- `upgradeServiceBuilding`: `/mnt/frankendom-donors/amilich-isometric-city/src/lib/simulation.ts` 1351-1393. Gates (max level, construction, abandoned, balance), cost base times 2^level, debit.
- Client loop and ledger: `/mnt/frankendom-donors/amilich-isometric-city/src/context/GameContext.tsx` 797-830 (tick), 876-912 (build gate and debit), 1000-1021 (connect to city), 1421-1429 (addMoney), 173-206 and 348-375 (storage).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Income = base per person and per job, times a percent tax rate | 0.1 per person, 0.05 per job, both per percent (theirs, 1897) |
| Expenses = sum of cost x funding percent per service | 8 services; funding 100 at start (theirs, 1093-1100, 1899-1907) |
| Per-building cost recomputed from counts | 50, 50, 100, 30/100, 2/3/25, 10, 150, 75 (theirs, 2004-2011) |
| Weekly deposit of a quarter of the monthly net, on fixed days | Days 7, 14, 21, 28; divisor 4 (theirs, 2451-2452) |
| Day of 30 ticks | 30 ticks per day (theirs, 2446) |
| Lagged input moves a fraction of the gap per tick | 0.03 for tax (theirs, 2416); 0.12 for demand (theirs, 2427) |
| Upgrade cost doubles per level | Base x 2^level; max level 5 (theirs, 1252, 1377, 1250) |
| Tax multiplier and additive for demand | 9 is the neutral rate (theirs, 1842, 1846); demand clamp 100 (theirs, 1892) |
| Finance warning threshold | -500 critical (theirs, 2073) |

## 4. TypeScript sketch

simplified: keeps the monthly faucet and sink formulas, the day counter (30 ticks), the day-7 settlement (quarter of the net, floored), the lagged tax step (3% per tick), the build gate (zero-cost passes), and the doubling upgrade with its max level. It omits the demand math, the stats and happiness, the advisor and history, the construction and abandoned checks on upgrades, the bulldoze and placement reducers, the client tick timing, and the save format. It reads the month's income and expenses as inputs the caller computes, as the donor does in `calculateStats`.

```ts
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
```

## 5. Lands in

- TARGET `src/economy/settle.ts` (proposed new module; the brief's paths are `src/fight/` and `origins/` only, so Lead to confirm). It would hold one server settlement: the monthly faucet and sinks, the day-7 deposit, and the build and upgrade gates, all on the server ledger.
- Parity-checklist row 18 (loot roll and XP award), sub-line "server tick: fixed step". The weekly deposit is a calendar payout on the server tick, which is the closest fit to a timed award; the faucet and sink formulas have no row of their own. Row 21 (catalogue fields) would fit the build cost table, but the settlement is the point of the note, so row 18 is named.
- Reuse tag: rewrite-from-idea (MIT; adaptation allowed, the sketch is written from the mechanism and keeps the donor's constants)
- Brief rule served: 1 (one ledger, server-verified: the settlement is the only place the balance changes on a timer); zones as data (the costs, rates and funding are zone data fields)

## 6. Gaps and risks

- The ledger is the client's. `stats.money` is React state saved to localStorage (GameContext.tsx 348-375) and loaded from it (173-178, 206). A player can edit the save. Frankendom's one ledger must be server state, and the client may only request a build or upgrade.
- `addMoney` (GameContext.tsx 1421-1429) adds any amount with no check. Grep over src found no isocity UI call; a coaster panel calls its own version, which is not read here. Frankendom must have no client mint path.
- The trade income is dropped. `connectToCity` adds 200 to `stats.income` (1012, 1020), but the next tick rebuilds `stats.income` from the formula (simulation.ts 2419 and 2502), and no code adds the 200 into the settlement (grep for tradeIncome in simulation.ts: none). The one-time 5000 does reach the balance (1011, 1019). Lesson for Frankendom: a monthly income must be a term in the settlement, not a field a side effect bumps.
- Negative balance is possible. The settlement adds `floor(net / 4)` with no floor on the balance (2452). The build and upgrade gates check the balance, but a deficit can drive it below zero. Frankendom must choose a rule (debt with a cap, or a floor) and test it.
- Funding changes expenses only, in this file. `funding` is read only in the expense sums (1899-1907; grep over simulation.ts shows no other read of budget). A funding slider here does not change service coverage. A designer should not assume it does.
- Rounding loss: each month's four floored quarters can fall up to 3 short of the monthly net (the net mod 4). A deficit rounds down (`Math.floor(-1 / 4)` is -1). State the rule in the data.
- Timing: the tick is a wall-clock `setInterval` per speed (810-814, 819) with no accumulator. A background tab or a slow device changes the economy's pace. Frankendom's server tick must be a fixed step counted in ticks (row 18 sub-line).
- Tax rate changes are clamped to 0..100 (GameContext.tsx 849) and then lag by 3% per tick for demand (2416), but income uses the raw rate at once (1897). The donor's comments describe the split as intended; Frankendom should decide whether a rate change should reach the faucet at once.
- No inflation control, auction, market or shop pricing exists in this donor (grep over src, excluding coaster). For those, see the Fallout notes in this batch.
- Not read: the start of `simulateTick` (2152-2404) beyond the grep hits, the advisor and history code (2060-2110, 2477-2491), the demand block beyond the tax terms, the coaster economy (its own cell), and the save validation after line 206.

Best transferable idea: One settlement step turns a tax faucet and per-service budget sinks into a single balance paid on a fixed calendar, with the tax rate lagged 3% per tick for demand only so a rate change does not shock the city.
Decision (proposed): adapt - take the monthly faucet and sink formulas and the day-7 quarter deposit as one server settlement on the server tick; move the ledger off the client, drop the trade income that the donor loses, and decide the negative-balance rule in the data.
Acceptance: a server test asserts that with population 1000, jobs 400, tax 9, and one service of 2 buildings at 50 each and 100% funding, the monthly income is 1080 and the expenses are 100; crossing day 7 takes the balance from 10000 to 10245; a tax change from 9 to 100 moves the effective rate to 11.73 after one tick (9 + 91 x 0.03).

Reuse tag: rewrite-from-idea (MIT; adaptation allowed)
Brief rule served: 1 (one ledger, server-verified); zones as data (costs and rates)
