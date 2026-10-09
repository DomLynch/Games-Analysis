# OpenRCT2-OpenRCT2 (economy-trade, cell 11)

Donor: /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/management/Finance.cpp | Licence: GPL-3.0 | C++ | symbol FinancePayment / FinancePayWages
Ranges opened and confirmed: FinancePayment 89-103, FinanceCheckAffordability 78-81, FinancePayWages 109-122, FinancePayResearch 128-138, FinancePayInterest 144-161, Scenario.cpp ScenarioWeekUpdate 330-352 and ScenarioFortnightUpdate 354-357.

## 1. Mechanism
- Donor: OpenRCT2 park finance. One function (FinancePayment, 89) moves cash, records the amount in a per-type expenditure table, and adds it to the day's running total only for types that count toward that total.
- Periodic costs run from the scenario's week and fortnight hooks (Scenario.cpp, ScenarioWeekUpdate 330-352, ScenarioFortnightUpdate 354-357). The week hook calls FinancePayWages, FinancePayResearch, FinancePayInterest in that order (334-336) and then non-money upkeep (marketing update, warnings, ducks):
  - Weekly: wages for each staff member (monthly wage divided by 4), research cost for the funding level (monthly cost divided by 4), and bank-loan interest: (loan * 5 * rate) >> 14, or loan / 2400 when the RCT1-interest park flag is set (lines 157-158). Wages, research and interest each return at once if the park has the no-money flag (lines 113, 131, 148).
  - Fortnightly: ride running costs (FinancePayRideUpkeep, not read here).
- Spending commands call FinanceCheckAffordability (78-81), which is true when money is not required (FinanceCheckMoneyRequired at 60-71: no-money park, editor mode, no-spend or ghost command flags), or cost <= 0, or cost <= cash. The periodic payments above do not call it; they just debit and can drive cash negative.
- Cash uses AddClamp (line 92), so the balance saturates at both ends of the integer range instead of wrapping. FinancePayment also writes expenditureTable row 0 (this month) and broadcasts a cash-changed UI intent (lines 101-102 of the file).
- Runs on the game's week and fortnight timers, not per frame.

## 2. Key functions
- FinancePayment | /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/management/Finance.cpp | 89-103 | the one debit path: cash, per-type table, and day total for counted types.
- FinancePayWages | /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/management/Finance.cpp | 109-122 | pays each active staff member a quarter of their monthly wage.
- FinancePayResearch | /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/management/Finance.cpp | 128-138 | pays a quarter of the monthly research cost for the funding level.
- FinancePayInterest | /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/management/Finance.cpp | 144-161 | pays bank interest on the loan.
- ScenarioWeekUpdate | /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/scenario/Scenario.cpp | 330-352 | the weekly hook that calls wages, research and interest.
- FinanceCheckAffordability | /mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/management/Finance.cpp | 78-81 | the cost check that every spending command runs first.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| One debit path: move cash, record by type, count toward the daily total only for chosen types | Expenditure type flags, counted or not (theirs, table at Finance.cpp:39-54) |
| Periodic costs on a fixed schedule: weekly and fortnightly hooks | Week and fortnight cadence (theirs) |
| Recurring cost as a fraction of the monthly cost | Divide by 4 for weekly (theirs; Finance.cpp:120, 137) |
| Interest as principal x rate, with integer shift | Factor 5 and shift 14, alternative divisor 2400 (theirs; Finance.cpp:157-158) |
| Research levels with cost per level | Research costs 0, 100, 200, 400 per month (theirs, GBP; Finance.cpp:32-37) |

## 4. TypeScript sketch
Licence: GPL-3.0 (OpenRCT2-OpenRCT2). Clean-room: written from the mechanism, no donor lines.
simplified: six of the fourteen expenditure types; the no-money park early return, the RCT1 interest divisor, the UI broadcast and the monthly table shift are omitted; the clamp is shown at the lower end only; money is a JS number, so integer division is done with Math.trunc.
```ts
// One debit path: subtract cash (saturating at a floor), record the amount by expense type,
// and add it to the day's running total only for types the book counts.
type Kind = "wages" | "research" | "interest" | "upkeep" | "marketing" | "sales";
const COUNTS_TODAY: Record<Kind, boolean> = {
  wages: false, research: false, interest: false, upkeep: false, marketing: true, sales: true,
};
const FLOOR = -2147483648;                     // saturate at the lowest 32-bit value (theirs)

interface Book { cash: number; ledger: Record<Kind, number>; dayTotal: number; }

function pay(b: Book, amount: number, kind: Kind): void {
  b.cash = Math.max(b.cash - amount, FLOOR);
  b.ledger[kind] -= amount;
  if (COUNTS_TODAY[kind]) b.dayTotal -= amount;
}

function weeklyCosts(b: Book, staffMonthlyWages: number[], researchMonthly: number,
                     loan: number, rate: number): void {
  for (const w of staffMonthlyWages) pay(b, Math.trunc(w / 4), "wages");       // a quarter per week
  pay(b, Math.trunc(researchMonthly / 4), "research");
  pay(b, Math.trunc((loan * 5 * rate) / 16384), "interest");       // shift right by 14
}

function canAfford(b: Book, cost: number, exempt: boolean): boolean {
  return exempt || cost <= 0 || cost <= b.cash;
}
```

## 5. Lands in
- Frankendom file: origins/contracts/economy.ts (ledger and periodic costs). The spend path on trunk is origins/server/shop-buy.ts (checked by name only, not read here).
- Parity-checklist row: row 18 (loot roll and XP / career award: one server ledger with typed entries) and row 21 (expenditure types and counted flags would be catalogue fields).
- Usable rule: one-character/one-ledger rule (the server ledger is the authority; the book is written once per debit).
- Reuse tag: rewrite-from-idea (GPL-3.0; mechanism only).
- Brief rule served: one-character, one-ledger rule (server inventory is the authority); rules 7-9 n/a

## 6. Gaps and risks
- The donor's schedule is the park's own calendar. Frankendom's periodic costs must run on the server tick, not on a client timer.
- Wages, research and interest are park-level costs. Frankendom has no staff wage; any upkeep there is a new rule for Lead.
- The affordability check exempts ghost and no-spend commands and periodic payments skip it entirely. A Frankendom check must be server-side and cannot be skipped by a client flag.
- The saturating floor hides a negative balance; Frankendom must surface debt rather than clamp it.
- Ride upkeep (FinancePayRideUpkeep, 167-, fortnightly) was not read; only the weekly path is described.
- GPL-3.0: mechanism only.
