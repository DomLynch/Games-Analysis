# OpenRA-OpenRA (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Player/PlayerResources.cs` | Licence: GPL-3.0-or-later (file header: "either version 3 of the License, or (at your option) any later version"; repo `COPYING` is GNU GPL v3) | C# | symbol `PlayerResources` (ledger methods `ChangeCash`, `GiveResources`, `TakeCash`, `TakeResources`, `RemoveStorageCapacity`), with `ProductionItem.Tick` in `Traits/Player/ProductionQueue.cs`

Checked: The hint file is the right one: `PlayerResources.cs` read in full (1-264). Also read in full or in the key range: `ProductionQueue.cs` 180-200 (cancel refund), 338-372 (tick driver), 558-568 (cost), 612-640 (pay-up-front start), 718-812 (`ProductionItem`, per-tick payment), `Traits/Buildings/Refinery.cs` 45-85 (ore to value, storage), `Activities/Sell.cs` 25-50 (sale refund), `OpenRA.Game/World.cs` 436-452 (logic tick dispatch of `ITick`), `Game.cs` 776 (grep, logic timestep comment). Grep only: `Traits/Sellable.cs` 25 and 116 (same refund formula as `Sell.cs`), `mods/ra/rules/player.yaml` 5-6 (ore 25, gems 50), all callers of `TakeCash`/`RefundCash`/`ChangeCash` (ProductionQueue, Resupply, RepairableBuilding, Refinery, GivesBounty, DonateCash, CashTrickler, crate and infiltration traits). Not read: `Resupply.cs` 314 and `RepairableBuilding.cs` 174 in context; the Buildable check that stops a start when the player cannot pay (UI filter at `ProductionQueue.cs` 317-319 only); the `IResourceValueModifier` implementations; the low-power slowdown in full. camera_scope: n/a (economy). Confidence: high on the ledger and the per-tick payment arithmetic; medium on the Buildable start check (not read).

Best transferable idea: one player ledger holds cash and a capped ore pool, debits are take-or-fail that spend ore before cash, and a build can be paid as it progresses so a short purse pauses the build rather than cancelling it.
Decision (proposed): adapt — take the take-or-fail debit (ore first, then cash, no partial change) and the sale refund scaled by remaining health; take the pay-as-built payment only for timed crafts, not for fights; reject the lockstep sync model (each client runs the ledger; the server is the authority in Frankendom).
Acceptance: a server test asserts that a 40 debit with 30 ore and 15 cash leaves 0 ore and 5 cash, a 40 debit with 30 ore and 5 cash fails and changes nothing, a 200-value item at half health sells for 50 at refund 50 percent, and a 60-tick craft paid as it goes debits 0 on tick 1 and the full remaining cost on its last tick.

## 1. Mechanism

- Two pools. `Cash` is the currency; `Resources` is the ore pool with `ResourceCapacity` as its cap (`PlayerResources.cs` 101-107). `GetCashAndResources()` is `Cash + Resources` (259-261).
- Ore credit (`GiveResources`, 134-152). Ore is added and capped at capacity (143-150). The `Earned` counter goes up by the amount added (139) and is reduced by any overflow that did not fit (146), so it counts what was kept. `ChangeCash` (114-127) credits through `GiveCash` or debits through `TakeCash`, and a debit is first clamped to the total of cash plus ore so the player cannot go below zero (120-123).
- Take-or-fail debit (`TakeCash`, 220-244). If `GetCashAndResources()` is below the amount, return false (222-232), with an optional rate-limited low-funds notice (224-229, interval 30000 ms by default, 55). Else spend ore first (234-236). If ore goes negative, the shortfall comes out of cash and the ore is set to 0 (237-241). `Spent` is increased by the full amount (236).
- Refund (`RefundCash`, `RefundResources`, 154-157 and 215-218): the same `GiveResources`/`GiveCash` path with the `isRefund` flag, which moves `Spent` back instead of `Earned` (141, 205).
- Refinery credit (`Refinery.cs` 55-77). Value = count times the resource's value per unit (from `ResourceValues`: Ore 25, Gems 50 in `mods/ra/rules/player.yaml`), with percentage modifiers (60). With storage, the room is capacity minus ore (64). When `DiscardExcessResources` is false (its default was not read), the count is lowered one unit at a time until the value fits (68-69). Discard mode caps the value at the free room (72). Without storage, the value goes to cash (77).
- Pay-as-built (`ProductionItem.Tick`, `ProductionQueue.cs` 758-809). Each logic tick, expected remaining cost = total cost times remaining time over total time, floored (789). Due this tick = remaining cost minus expected (790). The ore part counted for this tick is the whole stock if it is positive and at most the due amount, else the due amount when the stock is above it (791-794). If the due amount is non-zero and cannot be taken, undo the ore counted and return without moving the build forward (795-799). Else reduce remaining cost by the due amount (801), then reduce remaining time by one (804). Done when remaining time reaches 0 (805-808).
- Pay-up-front (`BeginProduction`, 623-631): the ore paid is set from the stock (625-628), then the full cost is taken (630) and remaining cost set to 0 (631).
- Cancel (`ClearQueue`, 188-200): ore paid is refunded first (195) and added back to remaining cost (196). Then the cash part is refunded as total cost minus remaining cost (199). A cancelled build gets back exactly what it paid.
- Sale (`Activities/Sell.cs` 35-43): refund = sell value times `RefundPercent` times health over (100 times max health), truncated (42). `RefundPercent` defaults to 50 (`Traits/Sellable.cs` 25, grep). The credit goes through `ChangeCash` (43).
- Tick. The production queue's `Tick` runs as an `ITick` trait (`ProductionQueue.cs` 338-341). It ticks only the first queue item (366). The engine calls `ITick` traits once per logic tick (`World.cs` 442 counter, 448 dispatch), and logic runs on a fixed timestep (`Game.cs` 776 comment, grep).

Worked arithmetic (from the code, not run): a debit of 40 with ore 30 and cash 15 passes (45 is at least 40), spends 30 ore, then 10 from cash, leaving ore 0 and cash 5. The same debit with ore 30 and cash 5 fails (35 is below 40) and changes nothing. A sale of a 200-value item at 50 percent with health at half of max: 200 times 50 times 0.5 over 100 = 50.

## 2. Key functions

- `PlayerResources.TakeCash`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Player/PlayerResources.cs` 220-244.
- `PlayerResources.ChangeCash` and `GiveResources`: same file, 114-127 and 134-152.
- `ProductionItem.Tick`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Player/ProductionQueue.cs` 758-809 (payment 787-802, time 804-808).
- `ProductionQueue.ClearQueue` (cancel refund): same file, 188-200.
- `Refinery.AcceptResources`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Buildings/Refinery.cs` 55-85.
- `Sell.Tick`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Activities/Sell.cs` 35-43.
- Callers of the ledger (grep): `TakeCash` from `ProductionQueue.cs` 630 and 795, `Resupply.cs` 314, `RepairableBuilding.cs` 174, `InfiltrateForCash.cs` 82; `ChangeCash` from `GivesBounty.cs` 78, `CashTrickler.cs` 103, `DonateCash.cs` 34, `Sell.cs` 43, `Refinery.cs` 77.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant or rule |
|---|---|
| Take-or-fail debit, ore before cash, no partial change | `if (GetCashAndResources() < num)` then `Resources -= num;` (theirs, PlayerResources.cs 222, 235) |
| Ore pool capped at capacity; excess is lost in discard mode | `Resources = ResourceCapacity;` (theirs, 150); discard `Math.Min` (theirs, Refinery.cs 72) |
| Linear expected remaining cost for pay-as-built | `TotalCost * RemainingTime / Math.Max(1, TotalTime)` (theirs, ProductionQueue.cs 789) |
| Payment stalls the build when it cannot be paid | `if (costThisFrame != 0 && !pr.TakeCash(costThisFrame, true))` (theirs, 795) |
| Sale refund percent | `RefundPercent = 50` (theirs, Sellable.cs 25) |
| Sale refund scaled by health | `sellValue * RefundPercent * hp / (100 * maxHP)` (theirs, Sell.cs 42) |
| Starting cash choices | `SelectableCash = [2500, 5000, 10000, 20000];` and `DefaultCash = 5000` (theirs, PlayerResources.cs 32, 35) |
| Low-funds notice interval | `InsufficientFundsNotificationInterval = 30000` ms (theirs, 55) |
| Ore 25, gems 50 per unit | `Ore: 25`, `Gems: 50` (theirs, `mods/ra/rules/player.yaml` 5-6) |

## 4. TypeScript sketch

simplified: the sketch keeps the ledger order (ore first, then cash; no change on failure), the ore cap in its discard form, the pay-as-built tick with the ore counted before the debit and the donor's rollback, and the sale refund. It OMITS: the `Earned` and `Spent` counters, the low-funds notice and its interval, the pay-up-front start, the cancel refund, the low-power slowdown and pause, the refinery's reduce-the-count mode (only the discard cap is sketched), the percentage modifiers on ore value, and the lobby starting-cash options. The donor's `ChangeCash` clamp on debits is not sketched; `takeMoney` is take-or-fail only.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Ledger { cash: number; ore: number; capacity: number; }

// Take-or-fail debit: ore is spent before cash; nothing changes if cash plus ore is short.
function takeMoney(l: Ledger, amount: number): boolean {
  if (l.cash + l.ore < amount) return false;
  l.ore -= amount;
  if (l.ore < 0) {
    l.cash += l.ore; // the shortfall comes out of cash
    l.ore = 0;
  }
  return true;
}

// Ore credit with a capacity cap (discard branch): credits up to the free space and returns what was credited.
function addOre(l: Ledger, value: number): number {
  const room = Math.max(l.capacity - l.ore, 0);
  const credited = Math.min(value, room);
  l.ore += credited;
  return credited;
}

interface Build { totalCost: number; remainingCost: number; totalTime: number; remainingTime: number; paidOre: number; }

// One logic tick of a build that is paid as it goes. The due amount is the gap between the remaining cost
// and a linear expected remaining cost. If the tick cannot be paid, the build waits and nothing is debited.
// Returns true when the build is done.
function tickBuild(b: Build, l: Ledger): boolean {
  const expected = b.remainingTime === 1 ? 0 : Math.floor((b.totalCost * b.remainingTime) / Math.max(1, b.totalTime));
  const dueNow = b.remainingCost - expected;
  if (l.ore > 0 && l.ore <= dueNow) b.paidOre += l.ore;
  else if (l.ore > dueNow) b.paidOre += dueNow;
  if (dueNow !== 0 && !takeMoney(l, dueNow)) {
    b.paidOre -= l.ore; // the donor rolls back with the current ore stock; the sketch copies that
    return false;
  }
  b.remainingCost -= dueNow;
  b.remainingTime -= 1;
  return b.remainingTime <= 0;
}

// Sell refund: a percent of the sell value, scaled by the share of health left.
function sellRefund(sellValue: number, refundPct: number, hp: number, maxHp: number): number {
  return Math.trunc((sellValue * refundPct * hp) / (100 * maxHp));
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (`/tmp/et004-ledger-ts.ts`; copy in the work folder as `et004-ledger-ts.ts`).

## 5. Lands in

- TARGET `origins/economy/ledger.ts` (new): the one player ledger (cash, ore, capacity), take-or-fail debit, and the pay-as-built tick for timed crafts. Server-side, so the client never holds the balance.
- Parity-checklist row 21 (catalogue fields): the cost of a craft or item, the sale refund percent, the value per resource unit, and the storage capacity are catalogue or zone fields. No row fits the ledger itself exactly; row 21 is the closest.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: one ledger (every debit is take-or-fail, ore before cash, and nothing moves on failure; the counters are the audit trail); server-verified (the balance lives on the server and the client sends only the request); zones as data (resource values, refund percent and capacity are data, not constants).

## 6. Gaps and risks

- Lockstep, not server authority. OpenRA runs the same simulation on every client and checks the marked fields for desync (`[VerifySync]` on `Cash`, `Resources`, `ResourceCapacity` at `PlayerResources.cs` 100-107). Frankendom's server is the single authority, so the sync check is not a substitute for server verification. Do not port the lockstep model.
- Pay-as-built in a fight. The payment is per logic tick and it pauses the build when the purse is short. In a fast duel, a craft that pauses mid-way is a trap; keep it for long crafts and say so in the catalogue.
- The rollback reads the current stock, not the amount added this tick (797). Reasoned, not tested: the take can only fail when the stock is below the tick's due amount, so the two numbers agree in every branch. A port should test that branch, not copy it blind.
- Cancel refund returns the paid ore and the paid cash. A timed craft cancelled late refunds almost all of its cost, so a fast craft-and-cancel loop is a free refund. Frankendom must cap or ban it.
- The sale refund is health-scaled. Frankendom's gear wear or durability (if any) must feed the same formula; otherwise the refund is a constant percent.
- Ore is a stored resource with a cap that is lost when full (discard mode). Frankendom has no ore; if a cap is used for a currency, it must say what happens to the excess, since the non-discard mode (reduce the count until it fits) is different and its default was not read.
- The Buildable start check (whether a player can afford an item before the build starts) was not read, so the note does not say how the start is gated.
- Licence GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism; no donor line is translated.
