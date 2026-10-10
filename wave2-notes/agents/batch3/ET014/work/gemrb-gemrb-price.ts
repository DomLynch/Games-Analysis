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
