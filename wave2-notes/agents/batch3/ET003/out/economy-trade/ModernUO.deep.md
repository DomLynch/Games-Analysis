# ModernUO (economy-trade, cell 3)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/Vendors/GenericBuy.cs` (restock per entry, price), with `BaseVendor.cs` (shop restock trigger, buy and sell flow) and `GenericSell.cs` (sell and buy-back prices) | Licence: GPL-3.0 (`LICENSE` lines 3-4: "GNU GENERAL PUBLIC LICENSE", "Version 3, 29 June 2007"; copyleft, clean-room only) | C# | symbol `GenericBuyInfo.OnRestock` (GenericBuy.cs 105), triggered by `BaseVendor.VendorBuy` (BaseVendor.cs 847)

Checked: `GenericBuyInfo.OnRestock` read in full (GenericBuy.cs 105-136), with the constructor (1-110 read) and the `Price` getter (79). `BaseVendor.Restock` (132-141), the lazy trigger in `VendorBuy` (847-868), the buy path (144-300, 1157-1275 read), the sell path (420-560 read), `GenericSellInfo` read in full (GenericSell.cs 1-113), the GM restock command (Commands.cs 710-722). The hint file `SBInfo/SBMapmaker.cs` is a shop list (entries, prices and amounts, lines 1-30), not the mechanism. Confidence: high on the restock arithmetic (I checked the worked numbers by hand against the code and the typechecked sketch). Medium on the intent behind the price scalar of 0 outside towns (I read the precedence, not the author's intent). Not read: `VendorInventory.cs`, `VendorItem.cs`, `PlayerVendor.cs`, the other SBInfo classes, `Town.FromRegion` and the tax source, `Banker.Withdraw`, `Container.ConsumeTotal`, the bulk-order code, and the sell path after line 560.

Best transferable idea: Each shop line has a stock ceiling that moves with demand (doubles when sold out, halves when most of it stays unsold, never shrinks at small sizes), refills to that ceiling on the next visit after one hour, and takes only one restock step however long the shop sat unvisited.
Decision (proposed): adapt - take the lazy one-step catch-up (no per-tick work, no burst of restocks after a long absence) and the demand-moved ceiling; the constants (cap 999, reset 640, floor 20) become zone data so a zone can set its own scarcity, and player sales do not refill a shop's stock, as in the donor.
Acceptance: a server test in which a line with ceiling 40 and no stock is at 80 after the next list open, a line with 30 of 40 left is at 20, and a shop unvisited for five hours takes one restock step, not five.

## 1. Mechanism

- Each shop entry holds two numbers: `Amount` (on the shelf) and `MaxAmount` (the ceiling). Both start at the list amount (GenericBuy.cs 31). The ceiling moves with demand at each restock.
- Trigger, lazy: restock runs when a buyer opens the list. `VendorBuy` checks `Core.Now - LastRestock > RestockDelay` (BaseVendor.cs 866-868). `RestockDelay` is one hour (130). If the check passes, `Restock` sets `LastRestock` to now (134) and calls `OnRestock` once per entry (the loop around line 140). One step only: a shop unvisited for five hours still gets one step.
- Per-entry `OnRestock` (GenericBuy.cs 105-136):
  (a) Sold out (`Amount <= 0`, 107): the ceiling doubles, capped at 999 (109). Then stock refills to it (136).
  (b) Otherwise (the else branch): `half` starts as the ceiling (119). If the ceiling is 999 or more, `half` is 640 (121-123). Else if the ceiling is above 20, `half` is the ceiling divided by two (125-127). A ceiling of 20 or less leaves `half` equal to the ceiling. If `Amount >= half` (at least half still unsold), the ceiling becomes `half` (130-132). Otherwise the ceiling stays.
  (c) Stock refills to the (possibly new) ceiling (136).
- The donor's comment in the else branch says it departs from the published rule: it halves the quantity only when less than half was bought, so strong demand does not shrink stock.
- Price to the player: unit price = `(BasePrice x PriceScalar + 50) / 100` (GenericBuy.cs 79), where `PriceScalar` is `100 + town tax` for the shop's region (BaseVendor.cs 1353). Outside a town the expression yields 0, and the getter treats 0 as "no scalar" and returns the base price (the getter is in GenericBuy.cs 1-110, read; only line 79 is cited).
- Price to sell to the shop (buy-back): `GetBuyPriceFor` = `(int)(1.90 x GetSellPriceFor)` (GenericSell.cs 83). `GetSellPriceFor` is a table by type; armour and weapons adjust it by quality (Low x0.60, Exceptional x1.25) and add 100 per durability level and 100 per protection or damage level (GenericSell.cs from line 12 to its return, read in full).
- Player sales do not refill shop stock: `GenericBuyInfo.Restock(item, amount)` returns false (GenericBuy.cs 103), so the sell path puts the item in the shop's buy-side container (`BuyPack`; BaseVendor.cs 470-560 read), a separate buy path (BaseVendor.cs 470-560 read; the decline is at line 490).
- Other callers: a GM command calls `vendor.Restock()` directly with no delay check (Commands.cs 719). The constructor and `LoadSBInfo` stamp `LastRestock` (80, 588).

Worked numbers, by hand from the code (not run). Shop line: blank map, list amount 40 (SBMapmaker.cs 16).
- Sold out (0 left): ceiling 40 doubles to 80; stock becomes 80.
- Sold 10 (30 left): half = 20 (40 / 2); 30 >= 20, so ceiling becomes 20; stock becomes 20.
- Sold 25 (15 left): half = 20; 15 < 20, so ceiling stays 40; stock becomes 40.
- A line with ceiling 20 never halves (the floor rule): it stays at 20 at every restock with stock left.
- Buy price of the blank map at scalar 100: (5 x 100 + 50) / 100 = 5. At a 10 percent town tax, scalar 110: (5 x 110 + 50) / 100 = 6.

## 2. Key functions

- `GenericBuyInfo.OnRestock`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/Vendors/GenericBuy.cs` 105-136. The per-entry demand rule.
- `BaseVendor.Restock`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/Vendors/BaseVendor.cs` 132-141. Stamps the time and calls each entry.
- `BaseVendor.VendorBuy`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/Vendors/BaseVendor.cs` 847-868. The lazy trigger on list open.
- `GenericSellInfo.GetBuyPriceFor` and `GetSellPriceFor`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/Vendors/GenericSell.cs` 12-83. Buy-back and sell prices.
- `BaseVendor.GetPriceScalar`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/Vendors/BaseVendor.cs` 1353. Town tax as a percent scalar.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Stock ceiling doubles when sold out | Multiplier 2 (GenericBuy.cs 109) |
| Stock ceiling capped | 999 (GenericBuy.cs 109, 121) |
| Ceiling drops only when at least half is still unsold | "half" test at 130 |
| Large ceilings reset to a fixed value when they halve | 640 (GenericBuy.cs 123) |
| Small ceilings do not halve | 20 (GenericBuy.cs 125) |
| Restock delay for the whole shop | 1 hour, TimeSpan.FromHours(1) (BaseVendor.cs 130) |
| One step per visit, no catch-up | BaseVendor.cs 866-868 (no loop over elapsed time) |
| Price = base x scalar, rounded | Scalar = 100 + town tax (BaseVendor.cs 1353); rounding +50 / 100 (GenericBuy.cs 79) |
| Buy-back = 1.90 x sell | 1.90 (GenericSell.cs 83) |
| Sample shop line | BlankMap, price 5, amount 40 (SBMapmaker.cs 16) |

## 4. TypeScript sketch

simplified: the sketch keeps the restock step in the donor's order (sold-out doubling with the cap; otherwise the half rule with the 640 reset and the 20 floor; then refill to the ceiling) and the one-step lazy trigger with the delay as a number. It omits the price and the town-tax scalar, the buy and payment flow, the bank fallback, the buy-side pack for player sales, the GM command, bulk orders, the sell-side restock hook (which always declines for generic entries) and the buy-back price. Time is passed in as milliseconds; the donor reads `Core.Now` and a `TimeSpan`. The three constants are passed as fixed values here, where the adaptation makes them zone data.
```ts
// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism; not a translation of the donor lines.
interface StockLine {
  maxAmount: number; // demand-adjusted ceiling; starts at the shop list amount
  amount: number;    // stock on the shelf now
}

interface Shop {
  lastRestockMs: number;
  restockDelayMs: number;
  lines: StockLine[];
}

const MAX_CEILING = 999;        // ceiling never grows past this
const LARGE_RESET = 640;        // a 999 ceiling is cut to this when it halves
const HALVE_FLOOR = 20;         // ceilings at or below this never halve

// One restock step for one line.
function restockLine(line: StockLine): void {
  if (line.amount <= 0) {
    // Sold out: demand is high, so double the ceiling (capped).
    line.maxAmount = Math.min(MAX_CEILING, line.maxAmount * 2);
  } else {
    let half = line.maxAmount;
    if (half >= MAX_CEILING) half = LARGE_RESET;
    else if (half > HALVE_FLOOR) half = Math.floor(half / 2);
    // At least half still unsold: demand is low, so lower the ceiling.
    if (line.amount >= half) line.maxAmount = half;
  }
  line.amount = line.maxAmount; // every restock refills to the (new) ceiling
}

// Called when a buyer opens the list. At most one restock step, however long the shop was unvisited.
function onOpenList(shop: Shop, nowMs: number): void {
  if (nowMs - shop.lastRestockMs > shop.restockDelayMs) {
    shop.lastRestockMs = nowMs;
    for (const line of shop.lines) restockLine(line);
  }
}

// Buying takes stock down; the caller has already checked payment.
function takeStock(line: StockLine, requested: number): number {
  const qty = Math.min(requested, line.amount);
  line.amount -= qty;
  return qty;
}
```

## 5. Lands in

- TARGET `origins/server/shops.ts` (proposed new module; the Frankendom tree was not read). The shop line's ceiling, the restock step and the list-open trigger.
- Parity-checklist row: none fits the restock rule itself. The nearest is row 21 (catalogue fields): the list amount and the ceiling fields live in the shop list, so the fields belong there. Row 23 (zone population, respawn) is the closest in kind, but it covers creature population, not shop stock, so it is not used.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: one ledger (stock is data, changed only by the server) and server-verified transactions (Frankendom rulings); rules 7-9 n/a

## 6. Gaps and risks

- The price-scalar sentinel: `100 + Town.FromRegion(Region)?.Tax ?? 0` (BaseVendor.cs 1353) is read as `(100 + tax) ?? 0`, so outside a town it is 0, and the price getter treats 0 as "no scalar" (GenericBuy.cs 79). The result is the base price, but only by a sentinel. Frankendom must use an explicit null or a named default, not a zero that means "no change".
- Sell-side integer: the sell payout accumulates in `int` (BaseVendor.cs 430, 537) with no range guard. The buy side does guard its total (1201-1216) and refuses on overflow with a logged error. Frankendom's copper arithmetic must use one bounded type and one guard on both sides.
- Lazy restock: a shop with no visitor holds stale stock until someone opens the list. That is fine for shops. It is not fine if any economy total reads shop stock directly; Frankendom must not count unrestocked stock as supply.
- Ceiling memory: after repeated sold-outs the ceiling climbs to 999 and stays there until demand falls, and the donor has no pull back toward the designer's starting amount except the halving rule. Frankendom needs a clamp to a zone-set band.
- Goods are never lost on a full pack: when the pack cannot take an item, it goes to the ground at the buyer's feet (BaseVendor.cs 1245, 1254). Payment is taken before delivery (254), so a paid purchase is always delivered. Keep that rule; the EQEmu buy (cell 1 note) loses coin when the bag is full.
- Player sales do not refill stock: the donor keeps shop supply a designer number. If Frankendom wants player sales to add supply, that is a new rule with its own ledger row; do not add it by default.
- Preset map prices are randomised when the shop list is built (SBMapmaker.cs 22, `Utility.RandomMinMax(7, 10)`; read that line only). A random price must be stored once in zone data, not re-rolled on restart.
- GPL-3.0: clean-room only. The sketch is written from the described mechanism and does not translate donor lines.

Receipts: `/private/tmp/p2/wave2-haiku/batch3/ET003/receipts.tsv` (rows for ModernUO; verify_receipts.py: all rows pass, see the final table).
