# crawl-crawl (economy-trade, cell 11)

Donor: /mnt/frankendom-donors/crawl-crawl/crawl-ref/source/shopping.cc | Licence: GPL-2 | C++ | symbol item_price / _purchase
Symbol check: item_price (80-83) and _shop_get_item_value (70-78) confirmed. _purchase is at 898-962, not 80 (the input named both for line 80). Also opened: ShopMenu::purchase_selected 1270-1380 and greed_for_shop_type (dungeon.cc 6304-6315).

## 1. Mechanism
- Price is computed on demand from the item and the shop record. Nothing runs on a tick; it is turn-based.
- _shop_get_item_value(item, greed, identified) (70-78): base = greed times item value, divided by 10. For potions, scrolls and wands, when the item is identified, the result is raised to at least base times (15 + greed) divided by 30. The floor is 1.
- item_price(item, shop) (80-83) passes the shop's greed and whether this shop type identifies its stock.
- _purchase(shop, pos, index, cost, voucher) (898-962): copies the stock line and erases it from the shop first (901-902), drops it from the shopping list when no identical item remains, records a buy note, sets noted/seen flags, runs milestone checks, then takes gold or decrements the voucher count (932-935), adds cost to the purchase tally, marks origin, re-identifies the item (except unidentified potions and scrolls), and finally tries to put it in the pack. If the item is stationary or does not fit, it is dropped on the grid at the shop position and the function returns false (955-959); the caller counts it as an outside item.
- Affordability is checked in the menu layer, ShopMenu::purchase_selected (1270-1380): too expensive when cost > gold; allowed only if a voucher exists and the cost minus the voucher value fits in gold (1296-1309); then a yes/no confirm. Items are bought from the highest index down; for each, an item whose price rose above gold (price can change with id status) is skipped (1351-1352), and the one entry whose price equals the voucher value is paid with the voucher (1354-1356).
- Shop greed is set at generation: greed_for_shop_type (dungeon.cc 6304-6315) = 15 + random2avg(19,2) + level_greed for shops that do not identify stock, or 10 + random2(5) + level_greed for those that do; level_greed = depth/6 + random2(depth*2/3). The base item_value() is outside the opened ranges (not read).
- Inputs: item, shop greed, shop type, cost, voucher flag. Outputs: an integer price, and on purchase the stock and gold change.

## 2. Key functions
- _shop_get_item_value | /mnt/frankendom-donors/crawl-crawl/crawl-ref/source/shopping.cc | 70-78 | greed-scaled value with the consumable bump; floor 1.
- item_price | /mnt/frankendom-donors/crawl-crawl/crawl-ref/source/shopping.cc | 80-83 | shop wrapper that supplies greed and identification.
- _purchase | /mnt/frankendom-donors/crawl-crawl/crawl-ref/source/shopping.cc | 898-962 | stock removal, note, gold or voucher, purchase tally.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Price = greed times value over a fixed scale, floored at 1 | Scale 10 (theirs; shopping.cc:72) |
| Extra term for consumables (potions, scrolls, wands) once identified; it only bites when greed exceeds 15 | 15 and 30 in the bump (theirs; shopping.cc:75) |
| Purchase removes the stock line before taking payment | Greed per shop: 15 + 0..18 (non-identifying shops) or 10 + 0..4 (identifying shops), plus a depth term, rolled at shop creation (theirs; dungeon.cc:6306-6314) |

## 4. TypeScript sketch
Licence: GPL-2 (crawl-crawl). Clean-room: written from the mechanism, no donor lines.
simplified: item_value() is a parameter (not read); the menu-layer affordability check and the voucher-value match are folded into one gold-or-voucher test; notes, flags, shopping list, re-identify and the drop-to-floor result are omitted except the carry-failure flag. The donor erases the stock line first; the sketch checks the stock and cost before erasing so a refused buy changes nothing.
```ts
interface Item { value: number; consumable: boolean; identified: boolean; }
interface Shop { greed: number; identifiesStock: boolean; stock: Item[]; }

// Greed-scaled value; consumables that are identified get a floor from a second term.
function shopValue(it: Item, greed: number, identified: boolean): number {
  let result = Math.floor((greed * it.value) / 10);
  if (it.consumable && identified) {
    result = Math.max(result, Math.floor((result * (15 + greed)) / 30));
  }
  return Math.max(result, 1);
}

function itemPrice(it: Item, shop: Shop): number {
  return shopValue(it, shop.greed, shop.identifiesStock);
}

// Purchase: the afford check lives in the menu layer in the donor; here it is explicit.
// The stock line leaves, then gold or one voucher is taken, and the purchase tally rises by the cost.
function purchase(
  shop: Shop, index: number, gold: number, voucher: number, useVoucher: boolean, purchases: number,
): { gold: number; voucher: number; purchases: number; item: Item } | null {
  const item = shop.stock[index];
  if (!item) return null;
  const cost = itemPrice(item, shop);
  if (useVoucher ? voucher < 1 : gold < cost) return null;
  shop.stock.splice(index, 1);
  return useVoucher
    ? { gold, voucher: voucher - 1, purchases: purchases + cost, item }
    : { gold: gold - cost, voucher, purchases: purchases + cost, item };
}
```

## 5. Lands in
- Frankendom file(s): origins/shops/shop.ts (greed-scaled price) and origins/server/shop-buy.ts (the afford check plus stock removal plus gold debit in one server step), origins/contracts/economy.ts (price type).
- Parity-checklist row: row 21 (greed, base value and the consumable rule are catalogue fields) and row 18 (the server ledger the gold debit goes through).
- Reuse tag: rewrite-from-idea (GPL-2; mechanism only).
- Brief rule served: (category default, not per-cell) one-character, one-ledger rule; rules 7-9 n/a

## 6. Gaps and risks
- The gold-sufficiency check is in the menu layer (purchase_selected, 1296-1309, and again per item at 1351), not in _purchase, which trusts its caller. Frankendom puts check, stock removal and debit in one server call (one ledger).
- Greed is rolled per shop from depth (dungeon.cc 6304-6315); a port needs the roll recorded at shop creation so every player of a zone sees the same price (zones as data). Frankendom's price model is a Lead decision.
- Identify-on-buy, shopping list and notes are Crawl features; none is needed for Frankendom.
- Goods that do not fit the pack are dropped at the shop (958); Frankendom's server inventory must refuse the buy instead of losing or floor-dropping an item.
- Turn-based. Frankendom's server must make the purchase atomic; this donor relies on a single-player turn.
- No supply or demand: stock is a list, and prices are a pure function of item and shop.
