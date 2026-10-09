# evennia-evennia (economy-trade, cell 11)

Donor: /mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/shops.py | Licence: BSD-3 | Python | symbol BuyItem / create_from_obj
Symbol check: BuyItem class (53), create_from_obj (81), _buy_ware (290) and node_confirm_buy (345) confirmed.

## 1. Mechanism
- A menu-driven shop contrib. Input is text menu choices; nothing runs on a tick.
- BuyItem (53-80) is a record for a sale: key, description, object type, size, use slot, value, and optional fields.
- create_from_obj(obj, shopkeeper) (81-123) builds a sale record from a real object. Value is the object's value times the keeper's upsell factor (line 100, no rounding). Returns None (after logging) if the object lacks required fields.
- node_confirm_buy (345-367) shows the buy option only when the buyer's coins cover the value and the item size fits in the free equipment slots.
- _buy_ware (290-316) deducts the price from the buyer's coins (line 304). The next line (305, `shopkeep += item.value`) does not credit the keeper's coins: `shopkeep` is the NPC object from kwargs, and this file never writes a coin balance for it (the NPC class was not read), so no keeper credit is visible here. It then gets the object from the record (to_obj, 220-229: the stored object, or a spawn from a prototype) and puts it in the buyer's equipment. If equipment is full, the object is dropped on the ground and the buyer is told.
- The sell path (viewed this pass): _sell_ware (408-427) moves the object to the keeper, credits the seller `value` (line 425) and never debits the keeper (comment at 424: the keeper always has money). The sell price is set in _get_or_create_sellmap (377-394) as int(obj.value * keeper.miser_factor), and skips value 0 and QUEST objects (line 385). Its signature has a stray `self` (377) while it is called with (caller, shopkeep) at 404, so it would fail as written.
- Inputs: buyer, keeper, selected record. Outputs: coin change, a new or dropped object, messages.

## 2. Key functions
- BuyItem (class) | /mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/shops.py | 53-79 | the sale record fields.
- BuyItem.create_from_obj | /mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/shops.py | 81-123 | builds a sale record with the upsell factor.
- node_confirm_buy | /mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/shops.py | 345-367 | affordability and size gate before the buy option appears.
- _buy_ware | /mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/shops.py | 290-316 | coin transfer, object creation, ground drop when full.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Sale price = base value times keeper multiplier | Upsell factor (theirs, keeper attribute `upsell_factor`, read at line 100; its value is set outside this file, not read) |
| Buy gate: coins cover price and size fits free slots | Equipment slot model and max slots (theirs) |
| Overflow to ground when no room | Currency as coins (theirs) |

## 4. TypeScript sketch
simplified: the donor does not floor the price (line 100); the sketch floors it. The donor deducts coins before knowing whether equipment will accept the object and finds out by catching EquipmentError on add (309-314); the sketch predicts it from freeSlots, and canBuy already requires the size to fit, so the ground branch is unreachable here (kept to show the donor's fallback). The prototype-spawn path and messages are omitted.
```ts
// Licence: BSD-3 (evennia-evennia). Lift permitted; re-expression of shops.py 81-123 and 290-367.
interface Obj { key: string; value: number; size: number; }
interface Buyer { coins: number; freeSlots: number; inventory: string[]; ground: string[]; }
interface Keeper { upsell: number; coins: number; }

// Sale price: base value times the keeper's upsell factor.
function salePrice(obj: Obj, keeper: Keeper): number {
  return Math.floor(obj.value * keeper.upsell);
}

// The buy option appears only when coins cover the price and the size fits the free slots.
function canBuy(buyer: Buyer, price: number, size: number): boolean {
  return buyer.coins >= price && size <= buyer.freeSlots;
}

// Deduct coins from the buyer, then place the object in equipment or drop it on the ground when full.
// Donor note: shops.py line 305 (`shopkeep += item.value`) never credits the keeper, so there is no keeper credit here.
// Add one explicitly (keeper.coins += price) if Frankendom's ledger needs a counter-entry.
function buy(buyer: Buyer, keeper: Keeper, obj: Obj): boolean {
  const price = salePrice(obj, keeper);
  if (!canBuy(buyer, price, obj.size)) return false;
  buyer.coins -= price;
  if (obj.size <= buyer.freeSlots) {
    buyer.inventory.push(obj.key);
    buyer.freeSlots -= obj.size;
  } else {
    buyer.ground.push(obj.key);
  }
  return true;
}
```

## 5. Lands in
- Frankendom file(s): origins/server/shop-buy.ts (the server purchase; already prices from the list via origins/shops/shop.ts checkBuy and commits the spend, items and event in one batch) and origins/contracts/economy.ts (ledger and trade rules). Nothing to port; this note is a comparison.
- Parity-checklist row: row 18 (loot roll and XP award: the server-verified, one-ledger reward path) and row 21 (catalogue price/value fields) as the nearest rows; shops are otherwise outside the 22 rows.
- Reuse tag: adapt (BSD-3; the gate-then-transfer shape is reusable, the menu is not).
- Brief rule served: (category default, not per-cell) one-character, one-ledger rule; rules 7-9 n/a

## 6. Gaps and risks
- The affordability check is in the menu node (363); _buy_ware (290-316) trusts it and does not recheck. Frankendom already rechecks on every buy in origins/shops/shop.ts checkBuy, so this gap is closed; keep it that way (server-verified, one ledger).
- No stock limit; the keeper sells any record it holds.
- Ground drop is a silent placement with no size or owner rule.
- Sell path pays the seller from nothing (425) with no keeper debit and no stock; Frankendom's one ledger needs a matched debit or an explicit sink.
- Server-verified rule: this runs in the caller's session. Frankendom's equivalent is already server-side (shop-buy.ts, one origins_apply batch); named from reading shop-buy.ts and shop.ts in the world worktree.
