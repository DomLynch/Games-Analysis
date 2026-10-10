# OpenRCT2-OpenRCT2 (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/management/Finance.cpp` | Licence: GPL-3.0 (licence.txt in the repo root is GPL version 3; the Finance.cpp header says "licensed under the GNU General Public License version 3") | C++ | symbol `FinancePayment`

Checked: Symbol `FinancePayment` is defined at Finance.cpp 89-103 (read in full), and the whole of Finance.cpp 1-372 was read. The payment path in `ExecuteInternal` (GameActionRunner.cpp 264-364) and the query path `QueryInternal` (167-210) were read in part; 1-166 and 211-263 of that file were not read. The scheduled cadence in Scenario.cpp 299-432 was read in part (the day, week, fortnight and month gates, and the calls they make). Callers: all seven `FinancePayment` calls found by grep were read in context (Finance.cpp 120, 137, 160, 186; GameActionRunner.cpp 361; Guest.cpp 1649 and 2271, with the surrounding lines 1636-1652 and 2262-2273). Confidence: high for the payment path and the affordability rule; medium for the server side, because the queue is read only as far as `Enqueue` (GameActionRunner.cpp 323) and the server's queue processing was not read. Camera: not applicable.

Best transferable idea: Route every coin change through one settle function that takes a typed reason, and re-run the affordability check when the action executes, not only when it was queued.
Decision (proposed): adapt. The one-settle-function shape with typed reasons and a check at execute time is what our one-ledger, server-verified ruling needs; the park calendar (weekly wages, bank loan, interest, fortnight upkeep) and the x7 weekly projection do not fit a duel and zone game, so do not port them as they are.
Acceptance: A server test: a shop or loot-sale action that changes coins writes exactly one ledger row with its reason; running the same action again after cash has fallen below its cost returns insufficientFunds and changes no state; a test fails on any coin write outside the settle function, with the loan and cheat paths listed as explicit exceptions until they are routed through it.

## 1. Mechanism

- Entry for a player action. The runner first calls `Query` (GameActionRunner.cpp 186), then `FinanceCheckAffordability` (189). Affordability passes when no money is required, or the cost is zero or less, or the cost is at most the cash in hand (Finance.cpp 78-81). Money is not required when the park has `noMoney`, the editor is open, the command carries `noSpend`, or the command is a `ghost` (preview) (Finance.cpp 60-71, lines 62, 64, 66, 68).
- Execute. `ExecuteInternal` runs `QueryInternal` again (GameActionRunner.cpp 290), so the affordability check runs again at the moment the action executes. Then the game change runs (340). Then, only if the result is ok, money is required, the cost is not zero, and the call is top level, the runner calls `FinancePayment(result.cost, result.expenditure)` (359-361).
- Networked order. A client that is not the server sends the action (310). The server, or a client that is not inside the update code, queues it (323) instead of running it at once. The queue processing itself was not read.
- One spend function. `FinancePayment` (89-103) does three things in order: cash is reduced with a clamp (92: `park.cash = AddClamp(park.cash, -amount)`); the spend is added to the current month's bucket for that reason (94); and the day counter is reduced only when that reason is flagged in the per-type table (95-98). Then it broadcasts a UI update (101-102). The table `kCountTowardsCurrentExpenditure` (Finance.cpp 39-54) marks which reasons count toward the day: shop sales, shop stock, food and drink sales and stock, ride tickets, park tickets, ride construction, land purchase, landscaping and marketing count; running costs, wages, research and interest do not.
- Scheduled costs. `ScenarioUpdate` (Scenario.cpp 408) checks four date gates each update: day start (415), week start (419), fortnight start (423) and month start (427). Day: `FinanceUpdateDailyProfit` (301). Week: wages (334), research (335), interest (336). Fortnight: ride upkeep (356). Month: `FinanceShiftExpenditureTable` (361).
- Day estimate (Finance.cpp 257-306). The day counter is first turned into a projection, `currentProfit = 7 * currentExpenditure` (264), and the counter is reset. Then the estimate subtracts the full staff wage for each staff member (274), the full research cost (279), the loan divided by 600 (283), and twice the upkeep of every open ride (290). The sum is shifted right by 2 (296, a divide by 4) and added to the profit. In this function the result goes only into `currentProfit` and the weekly-average fields (298-302), then the finances window is invalidated (305). Whether any game rule reads `currentProfit` was not checked (not read).
- Week payments. Each staff member costs their wage divided by 4 (120). Research costs the level's monthly figure divided by 4 (137). Interest is `(loan * 5 * rate) >> 14` (158), or `loan / 2400` when the `rct1Interest` flag is set (157).
- Month roll. When the months elapsed reach 16 (318), the oldest bucket row is summed and added to `historicalProfit` (320-324); then every row shifts one place and the first row is zeroed (327-340).

## 2. Key functions

- `FinancePayment`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/management/Finance.cpp` 89-103. The one spend function: cash, bucket, day counter, UI broadcast.
- `FinanceCheckMoneyRequired` and `FinanceCheckAffordability`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/management/Finance.cpp` 60-81. Exemptions and the cash rule.
- `QueryInternal` and `ExecuteInternal`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/actions/GameActionRunner.cpp` 167-210 and 264-364. Query, then affordability, then (inside execute) query again, change, and pay.
- `FinanceUpdateDailyProfit`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/management/Finance.cpp` 257-306. The day projection.
- `FinanceShiftExpenditureTable`: `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/management/Finance.cpp` 313-344. The period roll.
- `ScenarioUpdate` (day, week, fortnight, month gates): `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/scenario/Scenario.cpp` 408-432, with the week and fortnight bodies at 330-357.
- Two bypasses of the one function, both read: `ParkSetLoanAction` at `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/actions/park/ParkSetLoanAction.cpp` 62 (`park.cash -= ...`, no bucket), and the guest purchase and spend calls at `/mnt/frankendom-donors/OpenRCT2-OpenRCT2/src/openrct2/entity/Guest.cpp` 1649 and 2271.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One spend function: reduce the balance with a clamp, add to a typed bucket, update a day counter only for flagged types | Per-type flag table (Finance.cpp 39-54) |
| Check before change, then change, then settle; the check is run again at execute time | None (the order) |
| Rolling table of periods, fold the oldest period into a historical total when full | 16 periods (Finance.h 35, theirs) |
| Day projection: 7 x the day's counted total (a display estimate) | 7 (Finance.cpp 264, theirs) |
| Cost paid per week as a quarter of the monthly figure | Divide by 4 (Finance.cpp 120 and 137, theirs) |
| Interest on a balance per week: `(balance * 5 * rate) >> 14` | rate 10 at start (Finance.cpp 243, theirs); the `/ 2400` rct1 variant (157) |
| Research funding levels (monthly cost per level) | 0 / 100 / 200 / 400 GBP (Finance.cpp 32-37, theirs; 200 at line 35) |
| Start balance and bank loan limits | Cash 10000 GBP (239), loan 10000 (240), max loan 20000 (241) |

Units: the money type (`money64`) and its unit were not read. The figures above are the donor's own. The daily estimate uses the full research cost and the full wage where the weekly payment uses a quarter; the donor code does not explain the difference in the lines read (not read).

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (check, change, settle) and the rule that preview, no-spend and zero-cost pass the check. It omits: the replay and paused-mode gates, the networked send and queue, script hooks, the money effect on screen, the `noMoney` park flag and the editor exemption, the loan, interest, upkeep and wage actions (the reasons exist as types only), the `rct1` interest variant, and the broadcast. It differs from the donor in two ways: the period roll is driven by the table length, where the donor uses the months elapsed; and the clamp is a plain min and max rather than the donor's `AddClamp` (not read). The `apply` callback is this sketch's shape, not a donor function.

```ts
// Licence: GPL-3.0 (donor, OpenRCT2). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Reason = 'shopSales' | 'shopStock' | 'lootSale' | 'craftFee' | 'auctionFee' | 'upkeep' | 'wages' | 'interest';

// Which reasons count toward the day's total (the donor's per-type flag table).
const COUNTS_TOWARD_DAY: Record<Reason, boolean> = {
  shopSales: true, shopStock: true, lootSale: true, craftFee: true, auctionFee: true,
  upkeep: false, wages: false, interest: false,
};

const PERIOD_COUNT = 16;   // rolling periods kept
const COIN_LIMIT = Number.MAX_SAFE_INTEGER;

type Period = Record<Reason, number>;
const emptyPeriod = (): Period => ({
  shopSales: 0, shopStock: 0, lootSale: 0, craftFee: 0, auctionFee: 0, upkeep: 0, wages: 0, interest: 0,
});

interface Flags { preview?: boolean; noSpend?: boolean; }

class Ledger {
  coins: number;
  historical = 0;
  dayTotal = 0;
  private periods: Period[] = [emptyPeriod()];

  constructor(coins: number) { this.coins = coins; }

  // Same rule for a preview and for the real run. Preview, no-spend and zero cost always pass.
  canAfford(cost: number, flags: Flags): boolean {
    if (flags.preview || flags.noSpend || cost <= 0) return true;
    return cost <= this.coins;
  }

  // The one function that moves coins. amount > 0 spends; amount < 0 earns.
  pay(amount: number, reason: Reason): void {
    this.coins = Math.max(-COIN_LIMIT, Math.min(COIN_LIMIT, this.coins - amount));
    this.periods[0][reason] -= amount;
    if (COUNTS_TOWARD_DAY[reason]) this.dayTotal -= amount;
  }

  // Day close: the projection is 7 x the day's counted total, then the day resets.
  closeDay(): number {
    const projected = 7 * this.dayTotal;
    this.dayTotal = 0;
    return projected;
  }

  // Period roll: when the table is full, fold the oldest period into the historical total, then add a new one.
  rollPeriod(): void {
    if (this.periods.length >= PERIOD_COUNT) {
      const oldest = this.periods.pop() as Period;
      this.historical += Object.values(oldest).reduce((a, b) => a + b, 0);
    }
    this.periods.unshift(emptyPeriod());
  }
}

interface Action {
  cost: number;
  reason: Reason;
  apply: () => void;   // the game change itself
}

type Outcome = 'ok' | 'insufficientFunds';

// Check, change, settle: the order the donor uses for one top-level action.
function runAction(ledger: Ledger, action: Action, flags: Flags): Outcome {
  if (!ledger.canAfford(action.cost, flags)) return 'insufficientFunds';
  action.apply();
  if (!flags.preview && !flags.noSpend && action.cost !== 0) ledger.pay(action.cost, action.reason);
  return 'ok';
}

export {};
```

Typecheck: the sketch file is `/private/tmp/p2/wave2-haiku/batch3/ET005/work/ledger-OpenRCT2.ts`, copied to the VPS at `/tmp/ledger-OpenRCT2.ts` and run with `npx -p typescript tsc --noEmit --strict --target es2020`: exit 0. A probe file with a deliberate type error on the same VPS failed as expected (so the check is live).

## 5. Lands in

- TARGET `src/fight/ledger.ts` (new): the one settle step for coins, called by every reward (loot, sale, XP-linked payouts) and every cost (shop, craft, auction fee). Proposed, not an existing file.
- Parity row: 18 (loot roll and XP award). Closest row only: none of the 23 rows covers coins and costs directly. Row 21 (catalogue fields) would hold the price fields, which are zone data, but it does not cover the settle step. Lead should decide whether a new row is needed.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one ledger: every coin change goes through one settle function); licence rule 7 (GPL-3.0, shape only, no line-by-line translation)

## 6. Gaps and risks

- The donor does not have one ledger in practice. `ParkSetLoanAction.cpp` 62 writes `park.cash` directly with no bucket and no day counter. The cheat actions write cash directly at `CheatSetAction.cpp` 601 and 610 (grep hits; not read in context). Scripting also writes cash (`ScPark.cpp` line 58, grep hit only). Frankendom's one-ledger ruling needs these routed through the settle step, or listed as explicit exceptions in a test.
- Guest purchases and spends call `FinancePayment` directly (`Guest.cpp` 1649 and 2271), not through the action runner, so they skip the Query and Execute check. The check for those guest actions was not read. For Frankendom, NPC and merchant purchases need the same check and the same settle call.
- "Server-verified" is by order, not by a separate proof in the donor. `ExecuteInternal` re-runs the query at execute time (290), so a balance that falls below the cost is caught wherever `ExecuteInternal` runs. Whether a queued action (323) is later run through `ExecuteInternal` on the server was not read. Frankendom must make the server run the check itself.
- The weekly, fortnight and monthly cadence, the bank loan, interest and the x7 projection belong to a park economy with wages. A zone economy has no wages in the donor's sense; do not port these as they are.
- The period table sums by month, which hides the individual events. A server-verified loot or sale ledger needs one row per event (with a kill or action id), so the audit can replay each coin change. The donor buckets are not enough for that.
- Money units and clamping behaviour (money64, AddClamp) were not read. Frankendom should use integers in the smallest unit and state the clamp rule in the test.
- The day projection and daily estimate write `currentProfit` and then refresh the finances window (Finance.cpp 298-305). Whether any game rule reads them was not checked. Do not make a gameplay rule depend on the projection.
- Licence: GPL-3.0. Clean-room only. The sketch is written from the mechanism. The sketch's type names and reasons are Frankendom's own, not the donor's.
