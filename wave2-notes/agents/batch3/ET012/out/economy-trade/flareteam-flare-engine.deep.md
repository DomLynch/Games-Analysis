# flareteam-flare-engine (economy-trade, cell 2)

Donor: `/mnt/frankendom-donors/flareteam-flare-engine/src/ItemManager.cpp` | Licence: GPL-3.0-or-later (per file headers: "either version 3 of the License, or (at your option) any later version"; the COPYING file is the GPL v3 text) | C++ | symbol `Item::getSellPrice` (with `Item::getPrice`, `MenuInventory::buy`, `MenuInventory::sell`, `MenuVendor::add`)

Checked: Read in full: `Item::getPrice` ItemManager.cpp 1794-1811; `Item::getSellPrice` 1813-1835; `Item::getCraftCount` 1837-1856; `MenuInventory::buy` MenuInventory.cpp 1071-1131; `MenuInventory::sell` 1136-1164; `MenuVendor::add` MenuVendor.cpp 290-300; `MenuVendor::setNPC` 338-368. Callers: call sites located by grep (MenuManager.cpp 567, 576, 1017, 1040, 1108, 1241, 1280); the sell path read at 570-582 and 1100-1116 only. Config defaults read: EngineSettings.cpp 86-87, 1037-1039, 1067-1075; NPC.cpp 57, 295-304. Save path: grep only (SaveLoad.cpp 217, receipted). Confidence: high on the buy, sell and buyback order of operations and the numbers. Medium on the global-ratio double application in section 6, which is from reading the code, not from a run. Not read: LevelScaledValue (the level-scaling and randomize behaviour), NPC::VENDOR_MAX_STOCK, the drag branch of `buy` (MenuInventory.cpp 1102-1104, where a dragged purchase is dropped at the cursor), and the drag-to-vendor branch at MenuManager.cpp 1241-1243. Camera: not applicable.

## 1. Mechanism

Three prices per item, and a vendor that sets ratios. The vendor has a Buy tab (what the vendor sells), a Buyback tab (what the player sold it, labelled "Buyback" at MenuVendor.cpp 65), and a Craft tab.

- Buy price (player buys from the vendor): if the base price is 0, the item is not for sale (ItemManager.cpp 1796-1797). Otherwise base x global buy ratio (1799), then x the NPC's buy ratio if it is above 0, else x the global buy ratio (1803-1807), never below 1 (1810). The vendor used is the NPC only if the vendor window is open (1801).
- Sell payout (player sells to the vendor): `MenuInventory::sell` refuses quest items and items with a base of 0 (1145, quest check at 1152 onward). The payout is `getSellPrice(true)` (1158). That is `price_sell` if it is set (1824-1825). Otherwise base x global buy ratio (1799, via getPrice(false)) x the sell ratio, NPC value if above 0 else global (1827), never below 1 (1834). The payout is credited (1160) before the vendor takes the item (MenuManager.cpp 1108-1111).
- Buyback: `MenuVendor::add` marks the stack `can_buyback = true` (291) and puts it in the Buyback stock. If that stock is full, its first slot is cleared to make room (294-295).
- Buying back: price is `getSellPrice(stack.can_buyback)` (MenuInventory.cpp 1093). With the flag set, the default payout price applies (1821-1825, 1827). Without it, if the old sell ratio is not 0, the price is base x global buy ratio x old sell ratio (1831). If the old ratio is 0, the default applies (1821).
- First vendor visit after the NPC is built: `reset_buyback` starts true (NPC.cpp 57). In `setNPC`, if `keep_buyback_on_map_change` is true (EngineSettings.cpp 87 default), buyback stock loses its fresh-sale flag (MenuVendor.cpp 355). Otherwise it is cleared (357). The reset flag is then cleared (365). The defaults are global buy 1.0 (1037), sell 0.25 (1038), old sell 0 (1039). With the old ratio at 0, the flag change alone changes no price.
- Buy settlement (`MenuInventory::buy`): affordability is carried currency at least the total price (1093-1096). If affordable: the bought stack loses its buyback flag (1100), the item is added to the carried bag (1106) unless it is dragged, when it is dropped at the cursor (1102-1104, not read in full), then ingredients are removed (craft tab, 1111) or currency is removed (1116). If not affordable: a message is logged and the stack is pushed back to `drop_stack` (refused).
- Craft: `getCraftCount` is the minimum over ingredients of (held in carried + equipment) / needed (1843-1850), capped at max quantity (1853), and 0 if there are no ingredients (1840-1841). The craft tab charges ingredients, not currency.

## 2. Key functions

- `Item::getPrice`: `/mnt/frankendom-donors/flareteam-flare-engine/src/ItemManager.cpp` 1794-1811. Base x global buy ratio, then the buy ratio (NPC or global), floor at 1, zero base returns 0.
- `Item::getSellPrice`: `/mnt/frankendom-donors/flareteam-flare-engine/src/ItemManager.cpp` 1813-1835. Chooses between the default (sale) price and the old-ratio price. Receipts 1821, 1824, 1827, 1831.
- `Item::getCraftCount`: `/mnt/frankendom-donors/flareteam-flare-engine/src/ItemManager.cpp` 1837-1856. Ingredient-limited craft count.
- `MenuInventory::buy`: `/mnt/frankendom-donors/flareteam-flare-engine/src/MenuInventory.cpp` 1071-1131. Affordability (1096), flag reset (1100), add (1106), debit or ingredient removal (1111, 1116).
- `MenuInventory::sell`: `/mnt/frankendom-donors/flareteam-flare-engine/src/MenuInventory.cpp` 1136-1164. Refusals (1145), payout (1158), credit (1160).
- `MenuVendor::add` and `MenuVendor::setNPC`: `/mnt/frankendom-donors/flareteam-flare-engine/src/MenuVendor.cpp` 290-300 and 338-368. Buyback listing and the first-visit reset (352-365).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Buy price is base x a vendor ratio, floored at 1; base 0 means not for sale | Global buy ratio 1.0 (theirs, EngineSettings.cpp 1037); NPC override when above 0 (NPC.cpp 296) |
| Sell payout is a fraction of the buy price, or a set price | Sell ratio 0.25 (theirs, EngineSettings.cpp 1038); `price_sell` 0 means use the ratio (ItemManager.cpp 1823-1827) |
| Buyback keeps the sale price while fresh; after a reload, an old ratio applies if set | Old sell ratio 0 means no re-price (theirs, EngineSettings.cpp 1039; the branch at ItemManager.cpp 1821) |
| Buyback is a bounded list; the first slot is dropped when full | Slot count not read (NPC::VENDOR_MAX_STOCK) |
| Check currency, then add, then debit (buy) | None |
| Craft count = min over ingredients | None |

## 4. TypeScript sketch

simplified: the sketch applies the buy ratio once (the donor applies the global buy ratio twice on the buy tab; see section 6). It charges after the bag has room, so a full bag refuses the purchase with coins unchanged; the donor adds first and debits after, and a full bag sends the leftover to `drop_stack` (MenuInventory.cpp 944). It uses whole-stack buyback purchases and omits the craft tab, the equipment slots, the drag path, the level scaling of prices, and the save file. The buyback eviction is a shift of the array rather than the donor's clear-then-compact.

```ts
// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Ratios = { buy: number; sell: number; sellOld: number }; // data: engine defaults 1.0, 0.25, 0
type Item = { base: number; priceSell: number; quest: boolean }; // base 0 = not for sale; priceSell 0 = use ratios
type Slot = { item: string; qty: number; canBuyback: boolean };
type Vendor = {
  buyRatio: number; sellRatio: number; sellOldRatio: number; // NPC overrides; 0 = use the global value
  stock: string[];
  buyback: (Slot | null)[];
  resetPending: boolean;
};
type Wallet = { coins: number };
type Bag = { hasRoom(item: string, qty: number): boolean; add(item: string, qty: number): void };

// An NPC value above 0 replaces the global one; 0 means "use the global".
const pick = (globalValue: number, npcValue: number): number => (npcValue > 0 ? npcValue : globalValue);

// Buy tab: base x buy ratio, applied once; never below 1; base 0 = not for sale.
function buyPrice(it: Item, g: Ratios, v: Vendor): number {
  if (it.base === 0) return 0;
  return Math.max(1, Math.floor(it.base * pick(g.buy, v.buyRatio)));
}

// What the player is paid for a sale, and the default buyback price: priceSell if set, else base x global buy x sell ratio.
function sellPrice(it: Item, g: Ratios, v: Vendor): number {
  if (it.priceSell > 0) return Math.max(1, Math.floor(it.priceSell));
  if (it.base === 0) return 0;
  return Math.max(1, Math.floor(it.base * g.buy * pick(g.sell, v.sellRatio)));
}

// A fresh sale keeps the sale price. After a reload (canBuyback false) the old ratio applies, when it is set.
function buybackPrice(it: Item, canBuyback: boolean, g: Ratios, v: Vendor): number {
  const old = pick(g.sellOld, v.sellOldRatio);
  if (canBuyback || old === 0) return sellPrice(it, g, v);
  return Math.max(1, Math.floor(it.base * g.buy * old));
}

// Sale to the vendor: refuse quest items and items with no base price; pay, then list the stack as a fresh buyback.
// When the buyback is full, the first slot is dropped to make room.
function sellToVendor(w: Wallet, v: Vendor, items: Record<string, Item>, g: Ratios, itemId: string, qty: number): boolean {
  const it = items[itemId];
  if (!it || it.quest || it.base === 0) return false;
  w.coins += sellPrice(it, g, v) * qty;
  let idx = v.buyback.indexOf(null);
  if (idx === -1) {
    v.buyback.shift();
    idx = v.buyback.length;
    v.buyback.push(null);
  }
  v.buyback[idx] = { item: itemId, qty, canBuyback: true };
  return true;
}

// One settlement for every buy: refuse before any change if the coins or the bag room are short; otherwise debit and add.
function settle(w: Wallet, bag: Bag, itemId: string, qty: number, unit: number): boolean {
  const cost = unit * qty;
  if (w.coins < cost || !bag.hasRoom(itemId, qty)) return false;
  w.coins -= cost;
  bag.add(itemId, qty);
  return true;
}

function buyStock(w: Wallet, bag: Bag, v: Vendor, g: Ratios, items: Record<string, Item>, itemId: string, qty: number): boolean {
  const it = items[itemId];
  if (!it || it.base === 0) return false;
  return settle(w, bag, itemId, qty, buyPrice(it, g, v));
}

// Buy back a whole buyback slot; the slot empties only after the settlement succeeds.
function buyBack(w: Wallet, bag: Bag, v: Vendor, g: Ratios, items: Record<string, Item>, idx: number): boolean {
  const s = v.buyback[idx];
  if (!s) return false;
  const it = items[s.item];
  if (!it || !settle(w, bag, s.item, s.qty, buybackPrice(it, s.canBuyback, g, v))) return false;
  v.buyback[idx] = null;
  return true;
}

// First vendor open after the NPC is built: keep the buyback stock but mark it as no longer a fresh sale, or clear it.
function onFirstOpen(v: Vendor, keepOnLoad: boolean): void {
  if (!v.resetPending) return;
  v.resetPending = false;
  v.buyback = v.buyback.map((s) => (s === null || !keepOnLoad ? null : { ...s, canBuyback: false }));
}

export {};
```

Test on the VPS (not part of the note): the sketch typechecks (`tsc --noEmit --strict --target es2020`, exit 0). A behaviour run with a 100-coin sword at buy ratio 1.5 and sell ratio 0.25 gave a buy unit of 150, a sale of 37, a fresh buyback of 37, a refused purchase with a full bag (coins unchanged, slot kept), a post-reload price of 75 when the old ratio is 0.5, a clear on load with keep off, and a third sale evicting the first slot. These are the sketch's numbers, not the donor's.

## 5. Lands in

- TARGET `origins/server/vendor-prices.ts` (proposed new module; not checked in the repo). Buy, sell and buyback prices computed on the server from zone data, and one settlement function that charges only after placement succeeds.
- Parity-checklist row 21 (catalogue fields): base price, `price_sell`, and the vendor ratios are catalogue or zone data. No row covers a buy, sell or buyback tab; row 21 is the closest.
- Reuse tag: adapt-shape (GPL-3.0-or-later; clean-room only, sketch written from the mechanism)
- Brief rule served: one ledger, server-verified (prices and settlement on the server; the client only displays); zones as data (vendor ratios per NPC); rules 7-9 n/a

Best transferable idea: Price every vendor trade from three data fields (buy ratio, sell ratio, old-sell ratio per vendor), keep a fresh-sale flag on buyback stock, and settle a purchase only after the bag has room.

Decision (proposed): adapt. The three-price shape and the buyback flag are the right economy primitive for zone vendors. Adapt it: compute prices on the server (not from the open window, which the donor does at ItemManager.cpp 1801), charge only after placement, and apply the buy ratio once.

Acceptance: a server test where a vendor with buy ratio 1.5 sells a 100-coin item for exactly 150 (not 225); a sale pays 37 (0.25 of 150) and the buyback shows 37; a buy with a full bag is refused and the coin balance is unchanged; after a reload with an old ratio set, the buyback price follows that ratio and the flag is cleared.

## 6. Gaps and risks

- Double application (read, not run): `getPrice` multiplies by the global buy ratio unconditionally (ItemManager.cpp 1799), then again by the NPC or global buy ratio on the buy path (1805-1807). With the global buy ratio at 1.5 and no NPC override, a base of 100 costs 225 in the code, against 150 by the docs (EngineSettings.cpp 1067, "Global multiplier for item prices on the 'Buy' tab"; NPC.cpp 296, "Uses the global setting when set to 0."). Default 1.0 hides it. Frankendom must apply each ratio once and test the number.
- The buy and sell price depend on the open window: `vendor_npc` is NULL unless the vendor window is visible (ItemManager.cpp 1801, and again 1815). A price read while the window is closed ignores the NPC's ratios. Frankendom's prices must come from the server's vendor record, not UI state. The client only displays.
- Pay-then-place overflow: `buy` adds the item before debiting (MenuInventory.cpp 1106, then 1116). When the bag cannot hold it, the leftover goes to `drop_stack` (944) and the currency is still debited. The item is not lost, but the coins are spent on something the player must pick up from the ground. Frankendom: refuse with coins unchanged (as in the sketch).
- Buyback state is saved in the client save file when `save_buyback` is set (SaveLoad.cpp 217; default true at EngineSettings.cpp 86). Under "server-verified" the buyback list belongs in the server ledger, not in a client save.
- Re-price on load is off by default (old ratio 0, EngineSettings.cpp 1039). The old-ratio price can go up or down, depending on the data: at sell 0.25 and old 0.5 a buyback costs twice the payout. The donor's intent for that was not read; set it as data only if the designer wants it.
- Buy and sell prices are scaled by the player's level through `LevelScaledValue` (ItemManager.cpp 2246 sets the item level). Its `get()` was not read, so the level rule is unverified. `price.randomize()` (ItemManager.cpp 2047) also exists; what it does was not read. Frankendom: any price variation must be zone data, decided on the server, not a per-visit roll.
- The buyback slot count (NPC::VENDOR_MAX_STOCK) was not read.
