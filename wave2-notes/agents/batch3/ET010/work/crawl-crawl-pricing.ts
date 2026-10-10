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
export {}
