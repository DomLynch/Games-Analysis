# 2004Scape-Server (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/2004Scape-Server/data/src/scripts/shop/scripts/shop.rs2` | Licence: MIT (repo LICENSE: "MIT License", "Copyright (c) 2023-2025 Lost City"; no separate licence seen on the data/ scripts) | RuneScript (.rs2) with TypeScript engine (src/engine) | symbol `calc_shop_value` (with `adjusted_item_cost_buying`, `adjusted_item_cost_selling`, `buy_item`, `sell_item`)

Checked: The hint file (src/cache/config/ObjType.ts) is the wrong file for this topic: it only holds the item's `cost` field (lines 155, 211, 308). The shop logic is in data/src/scripts/shop/scripts/shop.rs2. Read in full: shop.rs2 (1-192), generalshop.rs2 (1-43), shopkeeper.param, shop.varp. Read in part: InvType.ts 95-120 (stock fields; the rest by grep); World.ts 1150-1216 (restock loop) and 118-124 (constants, by grep for the constants); InvOps.ts 40-54, 405-460, 740-790; Inventory.ts 60-75; NumberOps.ts 118-130 (SCALE); ScriptState.ts popInts (317-323); trade.rs2 (grep only: zero hits for "coins", so player trade moves items, not gold). Candidates opened: shop.rs2, generalshop.rs2, shopkeeper.param, InvType.ts, World.ts, InvOps.ts, Inventory.ts, NumberOps.ts. Confidence: high on the buy, sell and restock order and on the arithmetic of the price formula; low on the absolute price level, because the unit of the cached `cost` was not checked (ObjType.ts 211 reads the raw value) and the RuneScript `pushInt` truncation was not read (the sketch uses floor). Not a camera cell.

Best transferable idea: Price each shop unit from that shop's own stock, so shortage raises the price and surplus lowers it by a fixed step per unit, and each stock row refills one unit per set number of server ticks toward its target, so a shop empties only at a climbing price and refills by itself.

Decision (proposed): adapt — the stock-driven price and the per-row restock on the server tick are what a zone market needs to refill and damp bulk buying, but the donor's default numbers make the surplus side and the buy-from-player default inert and its units are unresolved, so Frankendom sets the scale and floors as zone data and tests them before tuning.

Acceptance: Player view: buying three units from a shop holding exactly its target gets dearer with each unit; a surplus lowers the price only once the zone's floor allows it; an emptied row refills one unit every rate-interval ticks (600 ms each). Server test: a buy that runs out of coins keeps the units already paid for, and the coin balance drops by exactly the sum of the charges.

## 1. Mechanism

A shop is an inventory whose starting contents and targets come from config. Each row has an item (`stockobj`), a target count (`stockcount`) and a restock period in ticks (`stockrate`) (InvType.ts 104-111). `restock` (code 5, InvType.ts 114) turns on the world restock loop for that inventory. `allstock` (code 6, InvType.ts 116) marks general stores, where unlisted items also decay. Inventories start with each row's item at the row's target count (Inventory.ts 66-72), so row index and inventory slot match at creation.

Price (shop.rs2 139-152, 183-192). Both sides use one formula, with a different percent:

1. Base cost: `oc_cost` of the item (139-140, 150-151). The cache value is read raw (ObjType.ts 211).
2. Stock deviation: `price_mod` returns stock minus the row's target (131-136). For an item with no row (base -1), it returns the raw stock (133-135), which is the same as target zero.
3. Adjustment: `adj = clamp(deviation x haggle, -5000, 1000)` (185).
4. Percent: `pct = max(100, percent - adj)` (186). The percent is `shop_sell_multiplier` when the player buys from the shop (141) and `shop_buy_multiplier` when the player sells to the shop (152).
5. Value: `scale(pct, 1000, cost)` = pct x cost / 1000 (187; NumberOps.ts 123-126 computes `(a * c) / b` with a, b, c popped in push order, ScriptState.ts 317-323). A negative result is replaced with 2000000000 and logged (188-190).
6. Buy floor: a purchase unit is at least 1 gp (143-146). A sale unit has no floor.

Buy (`buy_item`, 59-97), per unit i:
- Price the unit at stock minus i (67).
- Coin check first: if the running total plus this unit exceeds the coins held at the start, stop with "You don't have enough coins." (69-75).
- Stock check: stop if no stock is left (76-82).
- Space check (85-91). The condition uses `!` on the coin total (line 85), so this check is skipped when the total exactly equals the coins held. The donor's own comment at 83-84 says it is "Not sure if this should be the case in 2004".
- Charge the unit (92-93) and move one unit to the player (94).
- Units already charged stay bought when a later unit fails. The wealth event logs the count and total (71, 78, 87, 97).

Sell (`sell_item`, 100-129):
- Amount is capped at what the player holds (103; 155-160).
- Tradable check (104; `can_sell_obj`, 27-39: coins, untradeable and members items refused, and an Al-Kharid silk rule).
- Space checks for the coins and for the shop (108, 113).
- Total first: each unit is priced at shop stock plus i (117-123), with no stock moved yet.
- Then move the items (125), log the wealth event (126), and pay the coins (127-129).

Restock (World.ts 1176-1211, in the world cleanup phase; cleanup stats at 1213-1215). The loop runs once per world tick, and the tick is 600 ms (TICKRATE 600, World.ts 120). For each inventory with `restock`, each row whose count is below its target gains one unit, or loses one if above, but only on ticks where `tick % stockrate == 0` (1182-1202). A row with stockrate 0 never acts, because `tick % 0` is NaN. For general stores (`allstock`), a row with no target loses one unit every INV_STOCKRATE = 100 ticks (1206-1209; the comment at 1205 says "every 1 minute" and 100 ticks is 60 seconds).

Worked numbers, derived from the formulas above (not measured). Under the code as written, with the default percents (sell 100, buy 60) and haggle 10:
- The shop's buy-from-player percent (the 60 default) is `max(100, 60 - 0) = 100` at zero deviation, so the 60 does not take effect at zero deviation. With haggle 10 it takes effect only when the shop is more than four units short.
- A shortage of 3 (deviation -3) gives adj = -30. The price the player pays the shop (shop_sell 100) becomes `max(100, 100 + 30) = 130`, a rise of 30 percent.
- A surplus of 3 gives adj = +30. The price the player pays the shop becomes `max(100, 100 - 30) = 100`, so the surplus gives no discount at all.
- The unit scale (per mille or per cent) is unresolved. Taken literally with the divisor 1000, a percent of 100 gives one tenth of cost, so the sketch's numbers are relative, not absolute.

## 2. Key functions

- `calc_shop_value` (183-192): the price core. Clamp, floor, scale, overflow guard.
- `price_mod` (131-136): the stock deviation, with unlisted items treated as target zero.
- `adjusted_item_cost_buying` (139-147) and `adjusted_item_cost_selling` (150-152): the two sides, with the shop's sell and buy percents.
- `buy_item` (59-97) and `sell_item` (100-129), reached through `shop_request` (173-180).
- Restock loop (World.ts 1176-1211), with constants at World.ts 120 and 122.
- `Inventory` creation from config (Inventory.ts 66-72).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Stock deviation moves price per unit | Haggle 10 per unit of deviation (shopkeeper.param 13-15) |
| Adjustment clamp | Minimum -5000, maximum +1000 (shop.rs2 185) |
| Percent floor | 100 (shop.rs2 186) |
| Shop sells at | Percent 100 by default (shopkeeper.param 5-7) |
| Shop buys from player at | Percent 60 by default (shopkeeper.param 9-11), floored to 100 at zero deviation |
| Scale | Divide by 1000 (shop.rs2 187; NumberOps.ts 124-125); unit unresolved |
| Buy floor | 1 gp (shop.rs2 144-146); no floor on sales |
| Overflow guard | 2000000000 (shop.rs2 189) |
| Restock period per row | `stockrate` ticks (InvType.ts 111) |
| Restock target per row | `stockcount` (InvType.ts 110) |
| Tick | 600 ms (World.ts 120) |
| Unlisted-item decay | 100 ticks (World.ts 122, 1206), about 60 seconds |

## 4. TypeScript sketch

simplified: the sketch keeps the deviation-driven price, the clamp, the percent floor, the one-unit-per-period restock and the per-unit buy loop, with the coin check before the stock check and partial purchases kept, as in the donor. It omits the space checks (the donor's exact-coins exception is not modelled), the wealth logs, the sell cap to the player's holdings, the tradable and members checks, the allstock decay of unlisted items, and the cache's raw cost. Integer division is taken as floor for positive values; the donor's `pushInt` truncation was not read. The sketch takes a row's target as 0 for an unlisted item, which matches `price_mod` (133-135).

```ts
// Licence: MIT (donor, Copyright (c) 2023-2025 Lost City). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Row {
  cost: number;     // base cost in the donor's cost unit
  target: number;   // stock the shop wants to hold (0 for an unlisted item)
  rate: number;     // restock period in ticks; 0 never restocks
  stock: number;
}

interface Shop {
  rows: Map<string, Row>;
}

interface Terms {
  haggle: number;      // how far one unit of stock surplus or shortage moves the price
  sellPercent: number; // shop sells at this per-mille of cost, before stock adjustment
  buyPercent: number;  // shop buys at this per-mille of cost, before stock adjustment
}

interface Wallet {
  gold: number;
}

const ADJ_MAX = 1000;
const ADJ_MIN = -5000;
const PCT_FLOOR = 100;

// Per-unit value: the stock deviation, scaled by haggle and clamped, moves the percent; the percent is floored.
export function unitValue(cost: number, haggle: number, percent: number, diff: number): number {
  const adj = Math.min(ADJ_MAX, Math.max(ADJ_MIN, diff * haggle));
  const pct = Math.max(PCT_FLOOR, percent - adj);
  const value = Math.floor((pct * cost) / 1000);
  return value < 0 ? 2000000000 : value;
}

// Each unit is priced at the stock left before it, so a bulk buy gets dearer one unit at a time.
// The coin check runs before the stock check. Units already paid for are kept when a later unit fails.
export function buy(shop: Shop, wallet: Wallet, itemId: string, amount: number, t: Terms): number {
  const row = shop.rows.get(itemId);
  if (!row) return 0;
  let bought = 0;
  for (let i = 0; i < amount; i++) {
    const unit = Math.max(1, unitValue(row.cost, t.haggle, t.sellPercent, row.stock - row.target));
    if (wallet.gold < unit) break;
    if (row.stock <= 0) break;
    wallet.gold -= unit;
    row.stock -= 1;
    bought += 1;
  }
  return bought;
}

// Selling is priced for the whole lot before any stock moves, one unit at a time against the stock already there.
export function sell(shop: Shop, wallet: Wallet, itemId: string, amount: number, t: Terms): number {
  const row = shop.rows.get(itemId);
  if (!row) return 0;
  let total = 0;
  for (let i = 0; i < amount; i++) {
    total += unitValue(row.cost, t.haggle, t.buyPercent, row.stock + i - row.target);
  }
  row.stock += amount;
  wallet.gold += total;
  return total;
}

// Runs once per world tick. Each row with a nonzero rate moves one unit toward its target on ticks divisible by the rate.
export function restockTick(shop: Shop, tick: number): void {
  for (const row of shop.rows.values()) {
    if (row.rate <= 0) continue;
    if (tick % row.rate !== 0) continue;
    if (row.stock < row.target) row.stock += 1;
    else if (row.stock > row.target) row.stock -= 1;
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/economy/shop-stock.ts` (new; the Frankendom repo was not read, so this path is a proposal). Economy is not in src/fight, so no fight module applies.
- Parity-checklist row 21 (catalogue fields). The stock rows (target and rate per item) and the percents are catalogue or zone data. Row 21 is the closest of rows 1-23. Row 23 (zone population) is about spawns and is not a fit. The restock is a per-tick step, which is the server tick sub-line under row 18 / post-K item 3 ("server tick: fixed step, input intake, per-tick NPC budget"), so it is noted there too.
- Reuse tag: rewrite-from-idea (MIT; code may be adapted, with attribution; the sketch is still written from the mechanism)
- Brief rule served: one ledger and server-verified (Frankendom rulings): the coin check and the stock move happen in one server-side loop; licence rule 7 (permissive).

## 6. Gaps and risks

- Units unresolved: `scale` divides by 1000 (shop.rs2 187), and the defaults are 100 and 60 (shopkeeper.param 7, 11). Taken literally, a shop sells at one tenth of cost at zero deviation. Frankendom must check one known price before it sets any number, and must name the unit in the zone data.
- The default floor hides the 60 default: at zero deviation `max(100, 60 - 0)` gives 100, and with haggle 10 the 60 takes effect only when the shop is more than four units short (shop.rs2 186). A surplus gives no discount on the price a player pays the shop, because the default sell percent is also 100. Frankendom sets the floor and the percents together, and a test pins the result.
- Exact-coins exception: the inventory space check is skipped when the total equals the coins held (shop.rs2 85, with the donor's own doubt at 83-84). Frankendom must pick one rule and test it.
- Partial purchases are kept (shop.rs2 92-95, with the stop checks at 69-82). A failed bulk buy is a committed partial state. Frankendom must say whether the server commits the partial or rolls it back.
- Wealth events are a second record, not the ledger: `wealth_event` (shop.rs2 71, 78, 87, 97, 126) and `addWealthEvent` (InvOps.ts 452, 782) log beside the inventory moves, while the coins move in the script (93, 128). Frankendom: the audit record must come from the one ledger write, not a second path.
- Silent maximum: a negative price becomes 2000000000 and logs an error (shop.rs2 188-190). Frankendom should clamp and report, not write an absurd price.
- A zero restock rate is silent: `tick % 0` is NaN, so the row never restocks (World.ts 1192). Frankendom must reject a zero rate when it loads the catalogue.
- Row-index alignment: restock is keyed by inventory slot index (World.ts 1186-1199), and slots are set from the config rows at creation (Inventory.ts 66-72). A move or delete that changes slot order would break the link. Inventory.ts move and delete were not fully read.
- Player trade has no gold price here: trade.rs2 has no coin lines (grep: zero hits). The stake path logs value (InvOps.ts 443, 450-458) but does not price. This donor gives no trade-pricing rule for player-to-player trade.
- Sell side can pay zero: there is no floor on sale units (shop.rs2 143-146 floors only purchases, and the comment at 142 says so).
- Not read: the rest of Inventory.ts (move and delete), `inv_moveitem_uncert`, ObjType tradeable and members fields, the RuneScript `pushInt` truncation, the logger, and the cache's cost unit.

Reuse tag: rewrite-from-idea (MIT; code may be adapted, with attribution)
Brief rule served: one ledger and server-verified (Frankendom rulings); licence rule 7 (permissive)
