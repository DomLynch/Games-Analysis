# crawl-crawl (economy-trade, cell 1)

Donor: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/shopping.cc` | Licence: GPL-2.0-or-later (LICENSE: "either version 2 of the License, or (at your option) any later version") | C++ | symbol `item_price` (with `_shop_get_item_value`, `item_value`, `ShopMenu::purchase_selected`)

Checked: Read in full the price path: `_shop_get_item_value` (shopping.cc 70-78), `item_price` (80-83), the `item_value` tail and potion block (223-234, 482-491, 825-834), `_purchase` (898-939), `ShopMenu::purchase_selected` (1270-1384), `ShopEntry` (1072-1074), `shop()` (1565-1620), the shopping-list refresh (2120-2170). Also `greed_for_shop_type` and `_shop_greed` (dungeon.cc 6304-6353), the greed assignment (6597), `stepdown_value` and both `stepdown` overloads (stepdown.cc 14-57), and `catch2-tests/test_shopping.cc` 1-60. Callers: `item_price` has five call sites (shopping.cc 1074 and 1587 read; stash.cc 697, 2072, 2141 and l-item.cc 1581 seen by grep only, not read). Confidence: high on the price formula and purchase order; medium on the greed ranges (`random2avg` and `random2` definitions not read, so the roll shapes are "(not read)"). Not read: the weapon, armour, jewellery and miscellany arms of `item_value` (only its tail and the potion block were read), gold pile amounts, `ShopMenu::process_key`, `ShoppingList::cull_identical_items`. The `gozag_service_fee` and Zin tithe lines (religion.cc) are adjacent sinks read only at the deduction line.

## 1. Mechanism

- A shop sells stock at a price computed once per menu build. `ShopEntry` stores `cost(item_price(i, m.shop))` (shopping.cc 1074), and the price is `shop.greed` times the item's value, divided by 10, with integer division (72). Greed is a per-shop markup in tenths: 10 means 1.0x (dungeon.cc sets it, see below).
- Item value (`item_value`, 223-234 then the switch): the value starts from a per-class base (potion example: unidentified potion 9, shopping.cc 484; identified potion of experience 500, 489-490). An unrandart with a fixed value returns that value at once (229-233), skipping the quantity and the cap below. Otherwise the value is clamped to at least 1 (829), then capped per unit by `stepdown_value(valued, 1000, 1000, 10000, 10000)` (832), then multiplied by quantity (834). So the diminishing curve applies per unit, and a stack is linear in quantity.
- `stepdown` (stepdown.cc 14-17): `step * log2(1 + value / step)`. `stepdown_value` (40-57) returns the value unchanged below `first_step` (49), otherwise applies the stepdown with a ceiling (int overload 19-27; the ceiling clamp is at 23-24). With step 1000 the curve is continuous at 1000 and reaches the 10000 ceiling only near 1,023,000 per unit.
- Identifying vendors value the item as identified: `item_value` sets the identified flag when `ident` is true (227). Non-identifying vendors (weapon, armour and general antique types, `shoptype_identifies_stock` at shopping.cc 1740-1744) value it as the player knows it.
- Markup (`_shop_get_item_value`, 70-78): `result = greed * value / 10` (72). A consumable (potion, scroll or wand, 57-67) at an identifying vendor gets `result = max(result, result * (15 + greed) / 30)` (74-75). So the extra markup only bites above greed 15 (at greed 15 the two terms are equal). The result is clamped to at least 1 (77).
- Greed is fixed when the shop is generated (dungeon.cc 6597 via `_shop_greed`). Level term: `level_number / 6 + random2(level_number * 2 / 3)` (6306). Identifying vendor: `10 + random2(5) + level term` (6313-6314). Non-identifying vendor: `15 + random2avg(19, 2) + level term` (6310-6311). A bazaar branch multiplies greed by a factor of 10 to 17 out of 20, so 50 to 85 percent (6337, 6343). A vault spec can override the greed outright (6346-6350, read; the override returns `spec_greed`).
- Purchase (`purchase_selected`): the cart total is compared with gold (`too_expensive = cost > you.gold`, 1296). If too expensive, the purchase is refused unless the player has a voucher and the total minus the most expensive selected line still fits in gold (1299). A voucher then covers the most expensive line (1340). The loop walks the selected entries from the highest stock index down (sort at 1326-1330, loop from 1345). A line whose price exceeds remaining gold and is not the voucher price is skipped (1351-1352). The comment at 1350 says this "Can happen if the price changes due to id status": it is a stale-price guard, not the normal path, because when the up-front check passes, the non-voucher lines always sum to no more than gold.
- `_purchase` (898-939) removes the item from stock, then deducts gold (`you.del_gold(cost)`, 933) or, for a voucher, decrements the voucher counter (935). It also adds the cost to a lifetime purchases counter (937). A voucher is one counter (`ATTR_VOUCHER`), separate from gold.
- Shopping list: when an item type is identified elsewhere, `item_type_identified` re-prices the list entries of non-identifying shops with `_shop_get_item_value(item, shop->greed, false)` (2161-2165), and refreshes the list.
- Gold and vouchers, what this file shows: no code path sells an item to a shop (a grep for `sell` over the .cc and .h files finds no shop-sale function; the hits are unrelated files). The only player gold credit is floor gold pickup (`get_gold` items.cc 1720-1728; `you.add_gold(quant)` at 1728 is the only `add_gold` call found by grep). Gold leaves through shop purchases, a Gozag service fee (religion.cc 3717) and a Zin tithe (3793), neither read end to end. A voucher starts only in descent games (ng-setup.cc 341) and is gained by picking up a shop voucher item (items.cc 1876-1882, `_get_voucher`, read at its opening lines).

## 2. Key functions

- `_shop_get_item_value`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/shopping.cc` 70-78. Markup and the consumable rule.
- `item_price`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/shopping.cc` 80-83. Passes the shop greed and the identify flag.
- `item_value`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/shopping.cc` 223-834. Fixed-value unrandart early return (229-233), class switch, value clamp (829), per-unit cap (832), quantity (834).
- `stepdown_value` and `stepdown`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/stepdown.cc` 14-57.
- Greed generation: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/dungeon.cc` 6304-6353 (`greed_for_shop_type`, `_shop_greed`), assignment at 6597.
- Purchase: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/shopping.cc` 1270-1384 (`purchase_selected`), `_purchase` 898-939.
- Shopping list refresh: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/shopping.cc` 2120-2170 (`ShoppingList::item_type_identified`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Vendor price = value x markup / 10, integer division | Markup in tenths, 10 = 1.0x (72) |
| Markup set per vendor at generation from a depth term and an identify-status term | Identifying base 10 plus roll 0-4 (6313-6314); non-identifying base 15 plus roll (6310-6311); depth term depth/6 + random2(depth x 2/3) (6306) |
| Extra markup for consumables only where stock is identified and the markup is above a threshold | Threshold 15, divisor 30 (75); applies to potions, scrolls, wands (61-63) |
| Diminishing return per unit, linear across the stack | step 1000, first step 1000, ceiling 10000 (832; stepdown.cc 16, 23, 49) |
| Minimum price 1 | 1 (77) |
| Bazaar discount band | factor 10 to 17 of 20 (6337, 6343) |
| One-off credit covers the most expensive line | One voucher, decremented once (935, 1354-1356) |
| Refuse the cart if total exceeds gold, unless the credit covers the top line | Credit rule (1299) |

Worked numbers, computed by hand from the formulas above (not played in game):
- Identified consumable with base 500, one unit: greed 10 gives 500; greed 15 gives 750; greed 20 gives 1166 (1000 x 35 / 30, truncated).
- Stack of three of the same base-500 consumable at greed 20: 3500 (the stack is 1500 before markup, 3000 at greed 20, then 3000 x 35 / 30).
- Per-unit cap: base 1500 becomes 1321 per unit; base 2000 becomes 1584; base 10000 becomes 3459.

## 4. TypeScript sketch

simplified: keeps the donor order (per-unit cap then stack, vendor markup, consumable markup at identifying vendors, minimum 1; then the cart total check, voucher on the top line, walk from the highest index, and skip of a line that no longer fits). It omits the class value table (the caller passes `baseValue`), the identify flag on the item (the caller chooses the value that matches the vendor), the unrandart early return, the bazaar discount and greed generation, stock removal and pack placement, the shopping list, the menu, the lifetime purchases counter, and all messages. It also replaces the donor's in-place mutation of stock with returned index lists.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

// Vendor price: base value x vendor markup (tenths of base; 10 = 1.0x), soft-capped per unit, stacked, then one extra markup on consumables at identifying vendors.

interface Vendor {
  greed: number;             // markup in tenths of base value, set per shop when the level is built (zone data)
  identifiesStock: boolean;  // identifying vendors price the true item; antique-style vendors do not
}

interface Stock {
  baseValue: number;         // per-unit catalogue value, already chosen by the caller (identified or not)
  quantity: number;
  isConsumable: boolean;     // potions, scrolls, wands in the donor
}

// Per unit: values below 1000 pass through; above, step * log2(1 + v / step) truncated, ceiling 10000.
function softCapPerUnit(base: number): number {
  const v = Math.max(1, base);
  if (v < 1000) return v;
  return Math.min(10000, Math.trunc(1000 * Math.log2(1 + v / 1000)));
}

function price(stock: Stock, vendor: Vendor): number {
  const total = stock.quantity * softCapPerUnit(stock.baseValue); // soft cap is per unit, the stack is linear
  let result = Math.trunc((vendor.greed * total) / 10);
  if (stock.isConsumable && vendor.identifiesStock) {
    result = Math.max(result, Math.trunc((result * (15 + vendor.greed)) / 30));
  }
  return Math.max(result, 1);
}

interface Wallet { gold: number; vouchers: number; }
interface Line { index: number; price: number; } // index = position in the vendor's stock array

// All-or-nothing check on the cart total; a voucher may cover the single most expensive line.
function checkout(lines: Line[], w: Wallet): { bought: number[]; left: number[] } {
  const cost = lines.reduce((s, l) => s + l.price, 0);
  const top = lines.reduce((m, l) => Math.max(m, l.price), 0);
  const tooExpensive = cost > w.gold;
  if (tooExpensive && (w.vouchers < 1 || cost - top > w.gold)) {
    return { bought: [], left: lines.map((l) => l.index) };
  }
  let voucherPrice = tooExpensive ? top : 0;
  const bought: number[] = [];
  const left: number[] = [];
  // Walk from the highest stock index down; a line that no longer fits the remaining gold is skipped.
  for (const l of [...lines].sort((a, b) => b.index - a.index)) {
    if (l.price > w.gold && l.price !== voucherPrice) { left.push(l.index); continue; }
    const useVoucher = l.price === voucherPrice;
    if (useVoucher) voucherPrice = 0;
    if (useVoucher) w.vouchers -= 1; else w.gold -= l.price;
    bought.push(l.index);
  }
  return { bought, left };
}
```

## 5. Lands in

- TARGET `origins/economy/shop-prices.ts` (new module, proposed; not checked against the repo): the vendor price function, zone-owned markup, and the server-side cart check. The soft-cap curve and the stack rule are engine constants.
- Parity-checklist row 21 (catalogue fields): the base value per item and the vendor markup are catalogue and zone fields. Row 18 (loot roll and XP award) does not fit, because nothing here is a drop or an XP award. No row covers the buy and checkout call itself, so row 21 is cited for the price fields only.
- today: none known (Frankendom's tree was not read for this note).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: one ledger (gold is one integer, and the cart check and deduction live in one function); zones as data (markup per vendor is zone data); server-verified (the server re-prices and checks the whole cart).

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not translated.
- One ledger: the donor keeps gold as one integer, but it also keeps a second counter for vouchers (`ATTR_VOUCHER`, 935). Frankendom's ruling is one ledger, so a voucher must be a ledger entry, not a second counter.
- Server verification: the donor prices in the menu once (1074) and trusts that price, and it only guards a stale price with a skip (1350-1352). Frankendom must re-price on the server at purchase time and return the server price to the client. The donor's skip is silent and has no message, so the server should reject a stale cart and say so.
- All-or-nothing: the donor's up-front check is correct only because the non-voucher lines sum to no more than gold. Under a stale price the loop can buy a subset. Frankendom should refuse the whole cart on any mismatch.
- Determinism: the soft cap uses `log2` (stepdown.cc 16), a floating-point function, and the donor truncates with `int` conversion. A client and a server on different engines can round a price differently. Use a precomputed integer table or fixed-point, and test it at the boundaries (the cap is continuous at 1000, so the only risk is rounding).
- No sell path: the donor has no player-to-shop sale (grep), so it shows no sink-and-faucet pair. Income is floor gold only (items.cc 1728). Frankendom needs its own faucet and sink design and cannot take inflation control from this file.
- Adjacent sinks not read end to end: the Gozag service fee is `(gold - gold / log10(gold + 10.0)) / 2` on lifetime gold generated (religion.cc 3301) and is deducted at 3717; the Zin tithe at 3793. Lifetime-linked sinks are an inflation-control shape worth a separate read.
- Dead helper: `is_worthless_consumable` (shopping.cc 837) has no caller in the .cc and .h files that grep covers. Do not port it.
- Greed rolls: `random2avg(19, 2)` and `random2(n)` were not read, so the spread of greed within each range is "(not read)".

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: one ledger; zones as data; server-verified (economy topic, cell 1 of ET010)
Best transferable idea: Price = catalogue value x a per-vendor markup set once at zone build (a depth term plus an identify term), with a per-unit diminishing curve, and the server checks the whole cart against one gold integer before any deduction.
Decision (proposed): adapt — take the value-times-markup price and the whole-cart check as server logic with the markup as zone data, but make the voucher a ledger entry and the curve an integer table so client and server agree.
Acceptance: server test at a zone vendor with markup 20 (identifying): one consumable of base 500 costs 1166 gold, a stack of three costs 3500, and a cart whose total exceeds the player's gold is refused with no item moved and no gold changed.
