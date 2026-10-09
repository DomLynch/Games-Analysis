# gemrb-gemrb (economy-trade, cell 11)

Donor: /mnt/frankendom-donors/gemrb-gemrb/gemrb/GUIScripts/GUISTORE.py | Licence: GPL-2.0-or-later per SPDX tag in GUISTORE.py | C++ (Python GUI scripts) | symbol BuyPressed/SellPressed/UpdateStoreShoppingWindow
Symbol check: BuyPressed (1066), SellPressed (1113) and UpdateStoreShoppingWindow (435) confirmed. The price maths is GetRealPrice (1747), which the input did not name. It is the real core.

## 1. Mechanism
- Pure UI economy in the Python GUI script; the store/inventory transfers themselves are engine calls (GemRB.ChangeStoreItem, not read). Nothing runs on a sim tick. Selecting an item toggles SHOP_SELECT on the store or bag slot (SelectBuy 1034-1039, SelectSell 1089-1099). RedrawStoreShoppingWindow (1182-1230) recomputes two globals: BuySum (what the player pays) and SellSum (what the store pays). Price is GetRealPrice x Slot['Purchased'] (the selected amount) for a buy, and for a bag sale; a buy whose price is 0 or less falls back to the amount (1202-1203). Items flagged SHOP_ID price at 1 (1228-1229).
- Inputs per item: base Price, MaxStackAmount, MaxCharge, Usages0, the store's BuyMarkup, SellMarkup, Depreciation and StoreFlags, the best-Charisma PC's bonus (BestCharmer, 1789; chosen near 430), the reputation table repmodst, and the Mercantile feat.
- Base (1749-1754): Price; times Usages0 if the item stacks (MaxStackAmount > 1), else times Usages0 over MaxCharge when MaxCharge > 0.
- Store sells to player (mode "sell" in the code, 1761-1764 and 1786-1794): markup = SellMarkup, minus 5 with Mercantile. Charisma bonus is ADDED to the markup (1790). Then, unless the store has SHOP_NOREPADJ, the markup is multiplied by the repmodst value for reputation // 10 and divided by 100 (1793-1794). Price = base x markup // 100, and 1 if that is 0 while the item's Price > 0 (1796-1799).
- Player sells to store (mode "buy" in the code, 1757-1760 and 1775-1785): markup = BuyMarkup, plus 5 with Mercantile; if the store already holds copies (FindStoreItem), markup falls by count x Depreciation, floored at 20; GEM, RING and AMULET types set count to 0, but the 20 floor is still applied when the store holds a copy (1777-1785). No Charisma or reputation in this mode. Same price formula and 1-gold floor as above. The comment at 1771 says infinite-stock stores use only the markup; that is stated in a comment, the code relies on the store's item count.
- BuyPressed (1066-1087) refuses if the BuySum global exceeds party gold, then walks the store backwards (removals shift slots), recomputes each selected item's price and deducts it only when ChangeStoreItem succeeds (1083-1084). SellPressed (1113-1134) moves each selected item (bag path backwards, pack path forwards), then adds SellSum to party gold unconditionally and plays DEF_SOLD (1131-1132). Its own comment at 1121 asks "what if the transaction fails?": a failed ChangeStoreItem is not checked, so gold is still paid.
- Output: inventory and store slot changes, party gold, redraw.
- Naming trap: GetRealPrice takes mode "sell" for BuySum and "buy" for SellSum. The mode names are from the store's side, not the player's.

## 2. Key functions
- GetRealPrice (gemrb) | /mnt/frankendom-donors/gemrb-gemrb/gemrb/GUIScripts/GUISTORE.py | 1747-1800 | the whole price rule: base x quantity, markup per mode, depreciation, Charisma and reputation.
- RedrawStoreShoppingWindow (gemrb) | /mnt/frankendom-donors/gemrb-gemrb/gemrb/GUIScripts/GUISTORE.py | 1182-1298 | recomputes BuySum and SellSum from the selected flags on every redraw.
- BuyPressed (gemrb) | /mnt/frankendom-donors/gemrb-gemrb/gemrb/GUIScripts/GUISTORE.py | 1066-1087 | gold check, then moves selected items to the PC, deducting gold per item.
- SellPressed (gemrb) | /mnt/frankendom-donors/gemrb-gemrb/gemrb/GUIScripts/GUISTORE.py | 1113-1134 | moves selected items to the store, adds SellSum to gold, plays sound.
- SelectBuy / SelectSell (gemrb) | /mnt/frankendom-donors/gemrb-gemrb/gemrb/GUIScripts/GUISTORE.py | 1034-1039 / 1089-1099 | toggle the selection flag on a slot.
- UpdateStoreShoppingWindow (gemrb) | /mnt/frankendom-donors/gemrb-gemrb/gemrb/GUIScripts/GUISTORE.py | 435-465 | rebuilds scrollbars and calls the redraw.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Price = base x quantity (or charges / max charge) x store markup %, then a modifier stack | BuyMarkup and SellMarkup from the store record (theirs) |
| Repeat-sale depreciation: subtract count x rate, floored | Depreciation rate from the store record, 20% floor (theirs, 1785) |
| Flat skill and feat nudges of plus or minus 5 percent | Mercantile feat +/-5 (theirs, 1760, 1764) |
| Charisma as an additive percent on the store-sells markup, reputation as a multiplier unless the store opts out | GetAbilityBonus table and repmodst (theirs, 1790, 1794) |
| Minimum price 1 when base > 0 | 1 gold minimum (theirs, a BG2 rule) |
| Jewellery exempt from depreciation | GEM, RING, AMULET type list (theirs, 1779-1781) |

## 4. TypeScript sketch
simplified: for jewellery the sketch skips the 20 percent floor altogether, where the donor still applies it when the store holds a copy; item quantity is passed in as a ready number (the donor derives it from stack count or charges over max charge, and multiplies by the selected amount). The best-Charisma PC choice, the reputation table lookup and the SHOP_ID price of 1 are inputs or omitted. Failed transfers are not modelled (the donor ignores them on a sale; on a buy it charges only per success).
```ts
// Licence: GPL-2.0-or-later (gemrb-gemrb). CLEAN-ROOM: written from the mechanism, no donor lines.
interface StoreTerms { buyMarkup: number; sellMarkup: number; depreciation: number; noRepAdjust: boolean; }
interface ItemTerms { price: number; usable: number; isJewel: boolean; ownedInStore: number; }

const MERC_NUDGE = 5;    // theirs: Mercantile feat
const DEPREC_FLOOR = 20; // theirs: minimum percent

const atLeastOneGold = (eff: number, itemPrice: number): number => (eff === 0 && itemPrice > 0 ? 1 : eff);

// Store sells to the player: uses the store's SellMarkup; Charisma adds to the markup, reputation scales it.
function priceToPlayer(s: StoreTerms, it: ItemTerms, mercantile: boolean, charismaBonus: number, repPct: number): number {
  let mod = s.sellMarkup - (mercantile ? MERC_NUDGE : 0);
  mod += charismaBonus;
  if (!s.noRepAdjust) mod = Math.floor((mod * repPct) / 100);
  return atLeastOneGold(Math.floor((it.price * it.usable * mod) / 100), it.price);
}

// Player sells to the store: uses the store's BuyMarkup; repeat copies depreciate it, jewellery does not.
function priceFromPlayer(s: StoreTerms, it: ItemTerms, mercantile: boolean): number {
  let mod = s.buyMarkup + (mercantile ? MERC_NUDGE : 0);
  const copies = it.isJewel ? 0 : it.ownedInStore;
  if (copies > 0) mod = Math.max(mod - copies * s.depreciation, DEPREC_FLOOR);
  return atLeastOneGold(Math.floor((it.price * it.usable * mod) / 100), it.price);
}

interface Selection { items: { id: number; price: number }[]; }
function buyTotal(sel: Selection): number { return sel.items.reduce((a, i) => a + i.price, 0); }

function commitBuy(gold: number, sel: Selection): { gold: number; ok: boolean } {
  const total = buyTotal(sel);
  if (total > gold) return { gold, ok: false };  // "items too costly"
  return { gold: gold - total, ok: true };
}
```

## 5. Lands in
- Frankendom file(s): origins/contracts/economy.ts (markups and the ledger, as data) and origins/shops/shop.ts (the list a price comes from; Frankendom prices from a fixed list row, not per-item markups); purchase on origins/server/shop-buy.ts (all three read in the world worktree).
- Parity-checklist row: row 21 (catalogue fields: base price, charges) and row 18 (one server-verified ledger).
- Reuse tag: rewrite-from-idea (the mechanism is clean-room; GPL-2 stops the code path)
- Brief rule served: (category default, not per-cell) one-character, one-ledger rule; rules 7-9 n/a

## 6. Gaps and risks
- Depreciation depends on the store's live stock count. Frankendom's shop stock is per account today (shop-buy.ts comment: a global shelf needs its own table and a lock), so a shared depreciating shelf would need that table first.
- Price is computed client-side in Python and the gold change is a separate client call (1084, 1131). Frankendom's server-verified rule means totals are recomputed on the server inside one ledger batch (shop-buy.ts does this for buys).
- SellPressed pays SellSum even when a transfer fails (comment at 1121). Do not copy that; pay per verified item.
- Charisma and reputation are donor inputs. Frankendom has no such stat or reputation table; the closest data is career level (shop.ts minLevel), so this note's modifier stack should not be ported as is.
- Donor is GPL-2.0-or-later, so only the mechanism is described here.
