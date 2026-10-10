// Licence: dual, GPL version 2 or the "Angband licence" (non-profit). clean-room sketch from the described mechanism, not a translation of the donor.
// clean-room
type ShopKind = 'normal' | 'black';
type Side = 'shopBuys' | 'shopSells'; // shopBuys = the player sells to the shop

interface ShopTerms {
  kind: ShopKind;
  purseMaxCost: number; // per-unit cap on what the shop will pay (owner purse, data)
  noSelling: boolean;   // birth option: the shop pays nothing
}

interface Quote {
  realValue: number;     // true value of one unit
  apparentValue: number; // value the shop estimates (lower of the two when buying)
  qty: number;
}

// Price of qty units. Integer arithmetic, truncating like the donor's C division.
function price(t: ShopTerms, side: Side, q: Quote): number {
  let base = side === 'shopBuys' ? Math.min(q.realValue, q.apparentValue) : q.realValue;
  if (base <= 0) return side === 'shopBuys' ? 0 : q.qty; // worthless

  let adjust = t.kind === 'black' ? 150 : 100;
  if (side === 'shopBuys') {
    adjust = 100 + (100 - adjust);          // normal shop 100%, black market 50%
    base = Math.trunc((base * 2) / 3);      // shops pay two-thirds of value
    if (t.kind === 'black') base = Math.trunc(base / 2);
    if (t.noSelling) return 0;
  } else if (t.kind === 'black') {
    base = base * 2;                         // black market doubles the base before its 150%
  }

  let p = Math.trunc((base * adjust + 50) / 100);
  p *= q.qty;
  if (side === 'shopBuys' && p > t.purseMaxCost * q.qty) p = t.purseMaxCost * q.qty;
  if (p <= 0) return q.qty;                  // never free
  return p;
}

interface Ledger { gold: number; }          // the only gold balance touched by a shop trade
interface Stock { units: number; staple: boolean; }

// Buy: the price is recomputed here, not taken from the screen. Order: stock check, afford check, spend, then stock reduction and restock on empty.
function buy(t: ShopTerms, q: Quote, ledger: Ledger, stock: Stock, restock: () => void): 'ok' | 'stock' | 'afford' {
  if (q.qty > stock.units && !stock.staple) return 'stock';
  const p = price(t, 'shopSells', q);
  if (p > ledger.gold) return 'afford';
  ledger.gold -= p;
  if (!stock.staple) {
    stock.units -= q.qty;
    if (stock.units <= 0) restock();
  }
  return 'ok';
}

// Sell to the shop: the shop's purse cap applies, and the gold is added to the same ledger.
function sell(t: ShopTerms, q: Quote, ledger: Ledger): number {
  const p = price(t, 'shopBuys', q);
  ledger.gold += p;
  return p;
}
export {};
