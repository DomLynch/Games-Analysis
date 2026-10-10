# gemrb-gemrb (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/GUIScripts/GUISTORE.py` | Licence: GPL-2.0-or-later (SPDX header at GUISTORE.py line 3; repository `COPYING` is GPL version 2, June 1991) | Python (GemRB engine, C++ reads the store fields) | symbol `GetRealPrice`

Checked: Read `GetRealPrice` (1747-1799) in full, `BuyPressed` (1066-1085), `SellPressed` (1113-1131), `RedrawStoreShoppingWindow` (1182-1262), the Store fields (`core/Store.h` 140-142 only), the STO loader (`STOImporter.cpp` 64-66), the script action `ChangeStoreMarkup` (`core/GameScript/Actions.cpp` 6418-6429 only), the engine stock lookup (`GUIScript.cpp` 7311-7325, `core/Store.cpp` 182-200), the engine's per-slot price export (`GUIScript.cpp` 7690-7720 only; the function start at 7655 was seen by grep, not read), and grepped all of `GUIScripts/` for `Price` readers. Not read: `GemRB.ChangeStoreItem` (the engine item move), `GemRB.GetAbilityBonus` (the charisma table, so the sign and size of the CHA term are not verified), the `repmodst` reputation table values, the `BestCharmer` selection around line 431 (read only by grep), and the item `Price` loader. Confidence: high on the order of operations in `GetRealPrice` and the two transaction handlers; medium on the CHA term's effect (table not read). Camera: not applicable.

Best transferable idea: one pure price function, driven by per-shop data (markup, depreciation, flags) and the buyer's modifiers, that both the client display and the server settlement call, with the gold moved only after the item move succeeds.

Decision (proposed): adapt. Frankendom's one-ledger, server-verified rule means the donor's client-side gold moves (`GameSetPartyGold`) and its second engine price path must not be copied; the shape (markup and depreciation as shop data, a single quote function, pay on success) fits a shop in a zone.

Acceptance: a server test: a 50 gp item sold by a shop with SellMarkup 120 and no modifiers quotes 60 and debits exactly 60 on the server ledger; a sale whose item move fails credits 0; the shop label on the client equals the server quote for the same inputs.

## 1. Mechanism

- One function, `GetRealPrice(pc, mode, Item, Slot)`, prices every line of the shop in both directions. Mode `"sell"` is the store selling to the party (the party pays): the left-hand shop items are priced this way (1201). Mode `"buy"` is the store buying from the party (the party is paid): the right-hand inventory items are priced this way (1225). The mode names follow the call sites, not the store's point of view.
- Order of steps inside `GetRealPrice`, as the code runs:
  (a) base = the item's catalogue `Price` (1749).
  (b) Scale by quantity: if the item stacks, base x `Usages0` (1751-1752); else if it has charges, base x `Usages0` // `MaxCharge` (1753-1754).
  (c) Start percent: store-sells uses the store's `SellMarkup` (1762); store-buys uses `BuyMarkup` (1758). The Mercantile feat adds 5 on the buy side and subtracts 5 on the sell side (1759-1764).
  (d) Store-buys only (1775-1785): `count` = how many of this resref the store already holds (1776). If `count` is above 0 (1777): jewelry (GEM, RING, AMULET) sets `count` to 0 (1778-1782); then `mod -= count x DepreciationRate` (1784) and `mod = max(mod, 20)` (1785). The 20 floor sits inside the `if count:` branch, so a store holding none of the item gets no floor.
  (e) Store-sells only (1787-1794): `mod += ` the charisma ability bonus of the bartering character (1789-1790); then, unless the store has the NOREPADJ flag (1793), `mod = mod x reputation table value // 100` (1794).
  (f) `effprice = base x mod // 100` (1796). If that is 0 and the base is above 0, the price is 1 (1798-1799).
- Worked arithmetic (hypothetical inputs, the formula as read): store-sells, base 50, SellMarkup 120, CHA term 0, reputation scale 100: mod 120, price 50 x 120 // 100 = 60. Store-buys, base 50, BuyMarkup 40, store already holds 2 of the item, Depreciation 10: mod 40 - 20 = 20, floor keeps 20, price 50 x 20 // 100 = 10; with 0 held, mod stays 40 and the price is 20.
- Transaction, buy (`BuyPressed`, 1066-1085): the party's gold is checked against the precomputed `BuySum` (1067). For each selected line the price is recomputed with `GetRealPrice` in sell mode (1079); a price of 0 or less falls back to the purchased count (1080-1081). The item is moved with `ChangeStoreItem` (1083) and gold is debited (1084) only when that call returns true.
- Transaction, sell (`SellPressed`, 1113-1131): items are moved with `ChangeStoreItem` in the bag branch (1122) and the inventory branch (1129). The return values are not checked. Gold is then credited with `SellSum` unconditionally (1131). The donor's own comment at 1121 flags this: "what if the transaction fails?"
- Totals (`RedrawStoreShoppingWindow`, 1182-1262): `BuySum` is the sum of sell-mode prices over the selected shop lines (1201-1204); `SellSum` is the sum of buy-mode prices over the selected inventory lines (1225-1230). Both are shown as labels. The client computes both.
- Depreciation source: `FindStoreItem` returns the stock count of the first stock line with that resref (`GUIScript.cpp` 7311, `Store.cpp` 192-193), and 0 for infinite supply (7321-7323), so infinite stock never depreciates. It returns one line's count, not a total across lines with the same resref (not checked whether such lines are merged).
- Store data: the per-store `SellMarkup`, `BuyMarkup` and `DepreciationRate` are loaded from the STO file (`STOImporter.cpp` 64-66) and can be rewritten at runtime by the script action `ChangeStoreMarkup` (`Actions.cpp` 6426-6429).
- Second price path (engine): `GetStoreItem` exports a per-slot `Price` = item price x `SellMarkup` / 100, times `Usages[0]`, minimum 1 (`GUIScript.cpp` 7707-7715). It has no charisma, reputation, Mercantile or depreciation term, and its own comment says depreciation is "handled on the GUISTORE side" (7708). A grep of `GUIScripts/` finds no reader of `Slot['Price']`, so the UI does not use this value; it is still exported to any script.
- Comment versus code: the depreciation comment says "if you sell the item the first time, SellMarkup is used" (1767), but the code applies the depreciation to the BuyMarkup branch (1758, 1784). The code is what runs; the comment is stale.

## 2. Key functions

- `GetRealPrice`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/GUIScripts/GUISTORE.py` 1747-1799. The whole price pipeline, both directions.
- `BuyPressed`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/GUIScripts/GUISTORE.py` 1066-1085. Funds check, per-line price, move, then debit only on success.
- `SellPressed`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/GUIScripts/GUISTORE.py` 1113-1131. Moves without checking, then credits the precomputed total.
- `RedrawStoreShoppingWindow`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/GUIScripts/GUISTORE.py` 1182-1262. Builds `BuySum` and `SellSum` from the two modes.
- Engine stock lookup: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/plugins/GUIScript/GUIScript.cpp` 7311-7325 (`FindStoreItem`), and `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Store.cpp` 192-193.
- Engine per-slot price export: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/plugins/GUIScript/GUIScript.cpp` 7707-7715 (`GetStoreItem`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Price = base x quantity factor x percent / 100, floor division, minimum 1 for a priced item | Minimum 1 (1798-1799) |
| Percent per side from the shop record; the buy side drops with stock held | SellMarkup and BuyMarkup, per shop (Store.h 140-141); DepreciationRate per shop (Store.h 142) |
| Depreciation: percent lost per unit already held, with a floor | Floor 20 (1785), applied only inside the stock-held branch; jewelry counts as 0 held (1778-1782) |
| Buyer's skill and standing scale the sell side | Mercantile +/-5 (1760, 1764); charisma bonus from the ability table (1790, table not read); reputation scale from `repmodst` (1794, table not read) |
| Per-shop flag to skip the reputation scale | NOREPADJ 0x2000 (GUIDefines.py 303; flag read at 1793) |
| Pay only when the item move succeeds | Donor does this for buy (1083-1084) and not for sell (1129-1131) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order: scale by quantity, then percent (markup plus Mercantile), then either the depreciation branch with its floor or the charisma and reputation branch, then floor division and the minimum of 1; the settlement checks funds, then moves, then charges or credits. It omits the Python-side `BestCharmer` choice, the purchased-count fallback for a zero price, the lookup of the charisma and reputation tables (passed in as numbers), the bag and inventory UI paths, the store-file loading and the `ChangeStoreMarkup` action. It differs from the donor in one place: the sell credit is conditional on the move, which the donor does not do (the sketch is the intended behaviour, not the donor's).

```ts
// Licence: donor is GPL-2.0-or-later. Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type StoreSide = "store-sells" | "store-buys";

interface ItemDef {
  basePrice: number;     // catalogue price, whole gold
  stackable: boolean;    // price scales with the stack count
  maxCharges: number;    // 0 when the item has no charges
  isJewelry: boolean;    // jewelry does not depreciate
}

interface StoreDef {
  sellMarkup: number;    // percent, store data
  buyMarkup: number;     // percent, store data
  depreciation: number;  // percentage points lost per unit already in stock
  noRepAdjust: boolean;  // store flag: skip the reputation scale
}

interface BuyerMods {
  mercantile: boolean;        // feat: +5 when buying from the store side, -5 when selling to it
  charismaPct: number;        // percentage points from the ability table (table not read here)
  reputationPct: number;      // percent scale from the reputation table (table not read here)
}

// One price function for both directions. Integer percent maths, floor division.
function quotePrice(item: ItemDef, store: StoreDef, buyer: BuyerMods,
                    side: StoreSide, usages: number, stockOfThis: number): number {
  let price = item.basePrice;
  if (item.stackable) price = price * usages;
  else if (item.maxCharges > 0) price = Math.floor(price * usages / item.maxCharges);

  let mod: number;
  if (side === "store-buys") {
    mod = store.buyMarkup + (buyer.mercantile ? 5 : 0);
    if (stockOfThis > 0) {                       // depreciation only when the store already holds it
      const count = item.isJewelry ? 0 : stockOfThis;
      mod -= count * store.depreciation;
      mod = Math.max(mod, 20);                   // floor of 20 percent
    }
  } else {
    mod = store.sellMarkup - (buyer.mercantile ? 5 : 0);
    mod += buyer.charismaPct;
    if (!store.noRepAdjust) mod = Math.floor(mod * buyer.reputationPct / 100);
  }

  let eff = Math.floor(price * mod / 100);
  if (eff === 0 && item.basePrice > 0) eff = 1;  // never free for a priced item
  return eff;
}

// Ledger settlement: charge or credit only when the item move succeeded.
interface Ledger { gold: number; }

function settleBuy(ledger: Ledger, price: number, moveItem: () => boolean): boolean {
  if (ledger.gold < price) return false;         // funds checked before the move
  if (!moveItem()) return false;                 // no charge when the item did not move
  ledger.gold -= price;
  return true;
}

function settleSell(ledger: Ledger, price: number, moveItem: () => boolean): boolean {
  if (!moveItem()) return false;                 // credit only after a successful move
  ledger.gold += price;
  return true;
}
```

Typecheck: the block plus `export {};` was copied to the VPS `/tmp/ET014-gemrb-check.ts` and `npx -p typescript tsc --noEmit --strict --target es2020` exited 0.

## 5. Lands in

- TARGET `origins/economy/shop-price.ts` (new, proposed; the Frankendom tree was not read, so the path is a proposal). One quote function for both directions, called by the server to quote and settle, and by the client only to display. The settlement helper belongs next to it, in the one ledger.
- Parity-checklist row 21 (catalogue fields): the item base price is a catalogue field, and the per-shop markup and depreciation are shop data. Row 18 (loot roll and XP award) does not fit a shop price, so row 21 is the closest of rows 1-23.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: one ledger (one quote function; gold moves on the server only after the item move succeeds); zones as data (markup and depreciation are per-shop data).

## 6. Gaps and risks

- The donor debits and credits party gold in the client UI (`GameSetPartyGold` at 1084 and 1131). Frankendom's one-ledger and server-verified rules forbid that: the server must quote and settle, and the client only displays the quote.
- Two prices in one engine: the exported `Slot['Price']` (7707) and the UI's `GetRealPrice` disagree (no charisma, reputation, Mercantile or depreciation in the export). Frankendom must allow only one quote function.
- Unchecked sell credit (1129-1131): the donor credits gold even when a move fails. The acceptance test above guards this; do not copy the donor's order.
- Stock depreciation is shared state: the count is per shop, so in a multiplayer zone it must come from server stock, not from a client view. The donor reads one stock line (`GUIScript.cpp` 7311), so duplicate stock lines for one item are not counted together; Frankendom must decide how stock lines are merged (not checked in the donor).
- The 20 floor applies only when the shop already holds the item (1777-1785). That is a quirk: a fresh item is priced at the raw buy markup, which can be below 20 percent. Frankendom should make the floor explicit, either always or never.
- The charisma and reputation terms are read only as calls to tables that were not opened. Frankendom's stat and standing model was not read, so the sketch takes them as numbers. Do not assume the donor's signs.
- Pit as client: no shop belongs in the Pit. The quote function must not be the settlement path there.
- The donor comment at 1767 disagrees with the code at 1758. Do not copy the comment; the code is the reference.
- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not translated.
