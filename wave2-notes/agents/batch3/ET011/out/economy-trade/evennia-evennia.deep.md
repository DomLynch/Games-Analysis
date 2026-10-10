# evennia-evennia (economy-trade, cell 3)

Donor: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/shops.py` | Licence: BSD-3-Clause (LICENSE.txt line 1, "BSD 3-Clause License"; code may be adapted) | Python | symbols `BuyItem.create_from_obj`, `_buy_ware`, `_get_or_create_sellmap`, `_sell_ware`

Checked: `shops.py` (497 lines) read: docstring 1-36; `BuyItem` fields and `create_from_obj` 55-123; `create_from_prototype` head 125-176; `to_obj` and the buy map 218-250; buy flow 256-317; buy list node and confirm node 319-367; sell map and sell flow 377-430; sell nodes and menu trees 443-497. Not read in full: `BuyItem` display text 176-217 and the class header 30-54. Also read: `equipment.py` `add` 287-302 and `remove` 304-345 (the return value is what matters); `npcs.py` 50-57 (inherited `coins`) and 228-239 (the shopkeeper factors). Grep only: `characters.py` 175 (coins), `commands.py` 300-345 (coins). The Evennia menu library (`list_node`) was not read. Confidence: high for the price and money rules; high for the four defects listed in section 6, from reading signatures and return values. Not run: no Evennia process was started, so the defects are by reading, not by execution. Camera: not applicable.

## 1. Mechanism

- A shopkeeper has two numbers (`npcs.py` 235-237): `upsell_factor` (1.0) and `miser_factor` (0.5). They are attributes on the NPC, so each shop has its own rates.
- Buy price: a ware's price is its base value times `upsell_factor` (`create_from_obj`, `shops.py` 100; `create_from_prototype`, 173-174, which truncates to an integer). Object wares keep a float; prototype wares are truncated. The buy list is the shop's own items plus its `common_ware_prototypes` (243-250).
- Buying (`node_confirm_buy`, 363-364): the menu offers "Buy" only if `caller.coins >= item.value` and the item fits the free slots. Then `_buy_ware` (290-316) takes `item.value` from `caller.coins` (304), gives the item to the player (`equipment.add`, 310) or drops it on the floor if there is no room (311-314), and tells the player the price (316). Nothing in `_buy_ware` re-checks the coins.
- Sell price: `int(obj.value x miser_factor)` (384). The item is offered only if that is above 0 and the item is not a quest item (385). A base value of 1 gives 0 and is not offered; a base value of 3 gives 1 (sketch run).
- Selling (`_sell_ware`, 408-427): the item is removed from the player's equipment (421), its location is set to the shopkeeper (422), and the player gets the sell price (425). The shopkeeper pays from nowhere: the comment says "shopkeep always have money to pay, so we don't deduct from them" (424), and nothing reads the shopkeeper's inherited `coins` (npcs.py 57).
- The docstring (12-13) says the opposite of the code for sold items: "we will instead _destroy_ sold items". The code moves them into the shop (422), and the buy list reads the shop's contents (244). So a sold item comes back on the shop's list at the buy price.
- Numbers (sketch run, sketch not donor): base value 40 buys for 40 and sells for 20; a round trip loses 20; a player with 39 coins is refused at 40; a quest item sells for 0.
- Tick: none. Menus are turn-based.

## 2. Key functions

- `BuyItem.create_from_obj(obj, shopkeeper)`: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/shops.py` 81-123. Base value times upsell, float.
- `BuyItem.create_from_prototype(self, prototype_or_key, shopkeeper)`: `shops.py` 125-196. Same, truncated to an integer (173-175).
- `node_confirm_buy` and `_buy_ware`: `shops.py` 345-367 and 290-316. The affordability gate is on the confirm screen only.
- `_get_or_create_sellmap` and `_sell_ware`: `shops.py` 377-394 and 408-427. Sell price and the sell itself.
- `EvAdventureShopKeeper` factors: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/npcs.py` 228-239.
- `EquipmentHandler.remove`: `/mnt/frankendom-donors/evennia-evennia/evennia/contrib/tutorials/evadventure/equipment.py` 304-345.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Buy price = base value x shop markup; sell price = base value x buy-back rate, truncated; a sell rate that gives 0 is not offered | Upsell 1.0 (theirs, npcs.py 235); miser (buy-back) 0.5 (theirs, npcs.py 237) |
| Affordability check before the buy (coins >= price, slots free) | Check on the confirm screen (theirs, shops.py 363) |
| Quest items cannot be sold | Quest flag (theirs, shops.py 385) |
| Coin move: player pays or receives; the shopkeeper's takings are not recorded | Shopkeeper pays from nowhere: "we don't deduct from them" (theirs, shops.py 424); the inherited `coins` (npcs.py 57) is never read |

## 4. TypeScript sketch

simplified: the sketch uses one integer rule for buy and sell (the donor keeps a float for object wares and truncates prototype wares). It writes the server-side coin and slot checks into `buy` (the donor checks only on the confirm screen). It omits the buy-list build, the cached menu maps, the prototype spawn, the rumours and services the docstring mentions (not implemented in the donor), and the `equipment` slot model (slots are a count). It keeps the donor's sell rule that a zero price is not offered. Sold items are destroyed in the sketch (the docstring's intent), not moved into the shop as the donor code does.

```ts
// Licence: BSD-3-Clause (donor, Evennia). Adaptable; this sketch is written from the described mechanism and is not a line-by-line translation.
// clean-room
export interface ShopRates { upsell: number; miser: number }   // donor defaults: 1.0 and 0.5
export const DEFAULT_RATES: ShopRates = { upsell: 1.0, miser: 0.5 };

export interface Ware { value: number; size: number; quest: boolean }
export interface Player { coins: number; freeSlots: number }

// Price the shop asks for an item (the donor keeps a float for object wares and truncates prototype wares; here one integer rule).
export function buyPrice(baseValue: number, rates: ShopRates): number {
  return Math.floor(baseValue * rates.upsell);
}

// Price the shop pays. Zero means the shop will not take the item (quest items, or nothing after truncation).
export function sellPrice(baseValue: number, rates: ShopRates, quest: boolean): number {
  if (quest) return 0;
  const v = Math.floor(baseValue * rates.miser);
  return v > 0 ? v : 0;
}

// Server-side purchase: the coin and slot checks run here, not only on the confirm screen.
export function buy(p: Player, ware: Ware, rates: ShopRates): { ok: boolean; price: number; reason?: string } {
  const price = buyPrice(ware.value, rates);
  if (p.coins < price) return { ok: false, price, reason: "coins" };
  if (ware.size > p.freeSlots) return { ok: false, price, reason: "slots" };
  p.coins -= price;
  p.freeSlots -= ware.size;
  return { ok: true, price };
}

// Server-side sale: the item leaves the player and is destroyed (the donor's docstring says so; its code moves the item to the shop).
export function sell(p: Player, ware: Ware, rates: ShopRates): { ok: boolean; price: number } {
  const price = sellPrice(ware.value, rates, ware.quest);
  if (price === 0) return { ok: false, price };
  p.coins += price;
  p.freeSlots += ware.size;
  return { ok: true, price };
}
```

## 5. Lands in

- TARGET `origins/economy/shop-pricing.ts` (new, proposed path; the Frankendom repo was not read): one place that prices a shop's buy and sell from the base value and the shop's rates, and that checks coins and slots on the server before any coin moves. Parity-checklist row 21 (catalogue fields): base value, size and the quest flag are catalogue fields, and the two rates are shop data. Row 21 is the closest fit, not an exact one; no checklist row covers a shop's money, so this is named plainly rather than forced onto row 18 (loot and XP), which does not fit.
- today: none (no shop code in Frankendom was read for this note).
- Reuse tag: rewrite-from-idea (BSD-3-Clause; adaptation allowed, the sketch is written from the mechanism)
- Brief rule served: one ledger (every shop purchase and sale moves coins through one checked path, and the shop's own coins are either recorded or stated as a sink); server-verified (coins and slots are checked on the server at the moment of the trade)

Best transferable idea: price a shop as base value x a per-shop markup on buy and base value x a per-shop buy-back rate on sell, with the sell value truncated and zero-value items refused.
Decision (proposed): adapt - take the two-rate price model and the server-side check; reject the donor's move-sold-items-into-the-shop path, because it puts sold items back on the shop's list at the markup and contradicts its own docstring; destroy sold items as the docstring says, so the sink is real.
Acceptance: a server test: a base-value 40 item bought with 39 coins is refused by the server (not only the menu); bought with 100 it costs 40 and the player is at 60; selling it back gives 20, the item is gone from the player, and it is not on the shop's buy list; the 20-coin difference is recorded as a sink.

## 6. Gaps and risks

- Licence: BSD-3-Clause. Code may be adapted; the sketch is clean-room from the mechanism anyway, and the attribution must stay with the copyright notice if any code is copied.
- Buy list build is broken as written: `shops.py` 244 calls `BuyItem.create_from_obj(obj)` with one argument, but the signature at 81 takes `(obj, shopkeeper)`; line 246 calls `BuyItem.create_from_prototype(prototype)`, but the signature at 126 is `(self, prototype_or_key, shopkeeper)` under `@staticmethod` (125). Both calls fail on read, so the buy list cannot be built as written (not run).
- Sell path raises before paying: `_sell_ware` line 421 sets `obj = caller.equipment.remove(item)`, but `remove` returns a list (`equipment.py` 313 and 345 `return ret`). Line 422 then sets `.location` on the list, which raises an error. The item has already been taken off the player (the removal runs first and saves, equipment.py 343-344), and no coins are paid (425 is never reached). So a sale as written loses the item for nothing (by reading; not run).
- Sell map is built with a `self` parameter that is not passed: `_get_or_create_sellmap(self, caller, shopkeep)` (377) is called as `_get_or_create_sellmap(caller, shopkeep)` (404). Two arguments for three parameters: the sell list raises (not run).
- Shop takings are not recorded: line 305 `shopkeep += item.value` adds to the NPC object, not to its coins. The shopkeeper does inherit a `coins` attribute (npcs.py 57, default 1, "coin loot"), but nothing reads `shopkeep.coins` in the files read (grep of shops.py, npcs.py, characters.py, commands.py). As written the line fails (no `+=` on an NPC object), and even as `shopkeep.coins += item.value` the takings would go nowhere. Frankendom must say whether a shop's takings go to a ledger or are a sink, not leave it implicit.
- Stale menu caches: `_buy_ware` and `_sell_ware` do not clear the cached buy and sell maps (240-241 says the buy map must be reset when the shop buys new things; `_sell_ware` does not reset it). A sold item can stay on the sell list for the rest of the menu session (by reading).
- Client-only check: the buy gate is on the confirm screen only (363). `_buy_ware` (290-316) takes the coins without checking. A purchase triggered without that screen is not checked. Frankendom's server must check at the moment of the trade.
- Message strings: lines 316 and 427 use `{obj.key}` in a plain string (no `f` prefix), so the player would see the braces. Minor, but a copy-paste hazard.
- Promised but absent: the docstring (17-20) promises services (healing, coin to XP), rumours and quests, and the code in `shops.py` has none (grep for heal, xp, rumour, service finds only the docstring). Not implemented; not a mechanism to borrow.
- Units: no time unit. The upsell and buy-back rates are per shop; the base value is per item. Both are data (zone data in Frankendom terms).
