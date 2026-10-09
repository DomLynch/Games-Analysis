# flareteam-flare-engine (economy-trade, cell 11)

Donor: /mnt/frankendom-donors/flareteam-flare-engine/src/MenuVendor.cpp | Licence: GPL-3 | C++ | symbol MenuInventory buy/sell call path; MenuVendor::click / add
Symbol check: MenuVendor::click at 264 and MenuVendor::add at 290 confirmed. The buy/sell call path is MenuInventory::buy (1071) and MenuInventory::sell (1136), which the input's "MenuInventory buy/sell call path" points to. Price maths lives in ItemManager.cpp, not in MenuVendor.cpp.

## 1. Mechanism
- Pure UI-event economy: nothing runs on a sim tick. Every action is a click, drag or drop: MenuVendor::click (264-275) starts a drag out of the stock tab, and MenuManager routes the drop to MenuInventory::buy (MenuManager.cpp 566-574) or MenuInventory::sell then MenuVendor::add (575-581; also 1096-1112 for the Ctrl+left-click sell path from the inventory, which also allows selling with no vendor open when eset->misc.sell_without_vendor is set). MenuVendor::logic was not read.
- Inputs: the NPC's stock (npc->stock), the buyback list keyed by npc->filename, the carried currency stack, and the item's base price plus the global ratios vendor_ratio_buy / sell / sell_old (defaults 1.0, 0.25, 0; EngineSettings.cpp 1037-1039) and optional per-NPC overrides of each (used when > 0, ItemManager.cpp 1805, 1818-1819).
- Buy (player drags from VENDOR_BUY): unit = Item::getPrice(USE_VENDOR_RATIO): the base price is cut to an int after the global buy ratio (1799), then again after the NPC buy ratio (or the global one when the NPC has none, so the global ratio applies twice by default, 1805-1807), minimum 1; a base price of 0 returns 0. The total is unit x quantity (1095). If carried currency covers it, the stack is added to CARRIED (can_buyback cleared, 1100) and the currency is removed (1116). Otherwise the drop is refused with "Not enough <currency>" (1126) and the stack goes back to the vendor slot (MenuManager.cpp 568). The vendor stock is not decremented in buy(); the slot was emptied by the drag out of the stock tab.
- Buying from the VENDOR_SELL (buyback) tab prices the stack with getSellPrice(stack.can_buyback) (1092-1093), so a buyback costs the sell price.
- Sell (player drops onto VENDOR_SELL): MenuVendor::add tags the stack can_buyback=true and parks it in the buyback tab, evicting slot 0 if full. MenuInventory::sell (1136) refuses the currency item (1142), zero-price items (getPrice(USE_VENDOR_RATIO) == 0, 1145) and quest items (1152), then pays getSellPrice(DEFAULT_SELL_PRICE) x quantity (1158-1160), DEFAULT_SELL_PRICE being true (ItemManager.h 347).
- Sell price (ItemManager.cpp 1813-1835): when is_new_buyback is true or the sell_old ratio is 0, an explicit item sell price wins if non-zero (1823-1825), else getPrice(without vendor ratio) x sell ratio (1827). Otherwise (is_new_buyback false and sell_old non-zero) it is getPrice(without vendor ratio) x sell_old ratio and the explicit price is ignored (1831). Minimum 1. The old ratio is therefore the cost of buying back a stack whose can_buyback flag was cleared, which happens to a kept buyback list after a map load (MenuVendor.cpp 354-355), not a re-sell price.
- Persistence: saveInventory (316-327) writes the buy stock to npc->stock, the sell tab to buyback_stock[npc->filename] and the craft tab to npc->craft_stock. setNPC (338-393), on the first interaction after a map load (npc->reset_buyback), either clears can_buyback on each buyback stack (when eset->misc.keep_buyback_on_map_change, default true, EngineSettings.cpp 87) or clears the stacks. SaveLoad.cpp also writes and reads buyback_stock (lines 213, 516-524; only the line hits were read).
- Output: stock slots and currency changes, plus a sound (playSound 1117, 1161). Tooltip prices were not read.

## 2. Key functions
- Item::getPrice (flare) | /mnt/frankendom-donors/flareteam-flare-engine/src/ItemManager.cpp | 1794-1811 | base price x global buy ratio x (NPC or global) buy ratio, min 1; 0 means unsellable.
- Item::getSellPrice (flare) | /mnt/frankendom-donors/flareteam-flare-engine/src/ItemManager.cpp | 1813-1835 | sell price override, else getPrice(no ratio) x sell ratio; old-ratio branch for buyback re-sells; min 1.
- MenuInventory::buy (flare) | /mnt/frankendom-donors/flareteam-flare-engine/src/MenuInventory.cpp | 1071-1131 | affordability check, add to CARRIED, remove currency; craft tab consumes ingredients instead.
- MenuInventory::sell (flare) | /mnt/frankendom-donors/flareteam-flare-engine/src/MenuInventory.cpp | 1136-1164 | currency, zero-price and quest guards, pays getSellPrice x quantity.
- MenuVendor::click (flare) | /mnt/frankendom-donors/flareteam-flare-engine/src/MenuVendor.cpp | 264-275 | starts the drag out of the active stock tab and saves.
- MenuVendor::add (flare) | /mnt/frankendom-donors/flareteam-flare-engine/src/MenuVendor.cpp | 290-301 | sold item goes to buyback tab with can_buyback=true.
- MenuVendor::setNPC (flare) | /mnt/frankendom-donors/flareteam-flare-engine/src/MenuVendor.cpp | 338-393 | loads stock, resets or keeps buyback, sorts buy tab.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Price = base x global ratio x vendor ratio, floored at 1, zero = unsellable | global vendor_ratio_buy 1.0, vendor_ratio_sell 0.25 from eset (theirs, EngineSettings.cpp 1037-1038) |
| Sell price: explicit price if set, else base x sell ratio (explicit price ignored on the old-ratio branch) | per-NPC vendor_ratio_buy / sell / sell_old override, used when > 0 (theirs) |
| Buyback of a stack whose can_buyback flag was cleared costs base x sell_old ratio | sell_old ratio default 0 = branch off (theirs, 1039) |
| Persistent per-vendor buyback, flag-cleared or emptied on first visit after map load | keep_buyback_on_map_change flag, default true (theirs, 87) |
| Stock sort by type, quality, level, price or id | default sort_stock_buy = none (theirs) |

## 4. TypeScript sketch
simplified: the craft tab, stack merging, slot placement, sorting, sounds and persistence are omitted. The vendor stock is not modelled (the donor empties the slot on drag, buy() does not touch it). The explicit item sell price (ItemManager.cpp 1823-1825) is modelled on the first branch only. The 40-slot buyback cap is a placeholder (VENDOR_SLOTS was not read). Order of checks matches the donor.
```ts
// Licence: GPL-3 (flareteam-flare-engine). CLEAN-ROOM: written from the mechanism, no donor lines.
interface PriceTerms {
  basePrice: number; // 0 means unsellable
  buyRatio: number;  // global
  sellRatio: number;
  sellRatioOld: number; // 0 = old-ratio branch off
  vendorBuy?: number; vendorSell?: number; vendorSellOld?: number; // per-vendor, used when > 0
  explicitSell?: number; // item-level sell price, wins on the new-buyback branch when non-zero
}
const pick = (over: number | undefined, fallback: number) => (over && over > 0 ? over : fallback);
// Each step is cut to a whole number, as the donor does; the global ratio is applied first, then the vendor's.
function buyUnitPrice(t: PriceTerms, useVendorRatio: boolean): number {
  if (t.basePrice === 0) return 0;
  let p = Math.trunc(t.basePrice * t.buyRatio);
  if (useVendorRatio) p = Math.trunc(p * pick(t.vendorBuy, t.buyRatio));
  return Math.max(p, 1);
}
// isNewBuyback true = the price paid when selling, and the buyback price of a stack sold this session.
function sellUnitPrice(t: PriceTerms, isNewBuyback: boolean): number {
  const sell = pick(t.vendorSell, t.sellRatio), old = pick(t.vendorSellOld, t.sellRatioOld);
  let p: number;
  if (isNewBuyback || old === 0) p = t.explicitSell ? t.explicitSell : Math.trunc(buyUnitPrice(t, false) * sell);
  else p = Math.trunc(buyUnitPrice(t, false) * old);
  return Math.max(p, 1);
}
interface Trade { currency: number; buyback: { itemId: number; qty: number }[]; }
// Guards in the donor's order: currency item, no price, quest item.
function canSell(isCurrency: boolean, t: PriceTerms, isQuest: boolean): boolean {
  return !isCurrency && buyUnitPrice(t, true) !== 0 && !isQuest;
}
function sellToVendor(s: Trade, itemId: number, qty: number, unit: number, cap = 40): void {
  s.currency += unit * qty;
  s.buyback.push({ itemId, qty });
  if (s.buyback.length > cap) s.buyback.shift();
}
function buyFromVendor(s: Trade, unit: number, qty: number): boolean {
  if (s.currency < unit * qty) return false;
  s.currency -= unit * qty;
  return true;
}
```

## 5. Lands in
- Frankendom file(s): origins/contracts/economy.ts (price/ratio data and the ledger) and origins/shops/shop.ts (shop list rows; price comes from the list). The server purchase is origins/server/shop-buy.ts. Targets named from reading shop-buy.ts and shop.ts in the world worktree.
- Parity-checklist row: row 21 (catalogue fields: price, sell price, quest flag as item data) and row 18 (the one server-verified ledger).
- Reuse tag: adapt
- Brief rule served: (category default, not per-cell) one-character, one-ledger rule; rules 7-9 n/a

## 6. Gaps and risks
- All pricing runs on the client (buy() reads the carried currency and pays out in the same call, 1096-1116). Frankendom prices on the server from the shop list (shop.ts checkBuy) and commits in one batch; do not take the donor's client-side affordability check.
- Selling pays immediately and unconditionally (1160): no vendor currency cap (the comment at MenuManager.cpp 1107 says it may come later). Frankendom's one ledger needs a matched sink or a server-set payout.
- The global buy ratio is applied twice by default (1799 and 1805-1807), which looks accidental. Take one ratio, as data.
- Buyback lives in a client map keyed by NPC filename; Frankendom has no buyback today and would need a server-held list.
- Donor is GPL-3, so only the mechanism is described here. No code may be copied.
