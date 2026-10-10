// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface OrderLine { basePrice: number; count: number }
export interface TaxShare { to: string; pct: number }   // share of the gross tax, each floored; the remainder goes to the zone pool

export interface Settlement {
  rejected: boolean;
  total: number;                       // one debit: price plus tax
  price: number;
  tax: number;                         // gross tax
  credits: Record<string, number>;     // where the tax goes; sums to tax
}

// Unit price is base x server rate, floored per line. Tax is floored per unit, as the donor does.
export function settleOrder(
  lines: OrderLine[],
  sellingRate: number,
  taxPct: number,
  shares: TaxShare[],
  exempt: boolean,
  buyerGold: number
): Settlement {
  let price = 0;
  let tax = 0;
  for (const l of lines) {
    const unit = Math.floor(l.basePrice * sellingRate);
    price += unit * l.count;
    if (!exempt) {
      for (let i = 0; i < l.count; i++) tax += Math.floor((unit * taxPct) / 100);
    }
  }
  const total = price + tax;
  if (total > buyerGold) return { rejected: true, total: 0, price: 0, tax: 0, credits: {} };

  const credits: Record<string, number> = {};
  let left = tax;
  for (const s of shares) {
    const amt = Math.floor((tax * s.pct) / 100);
    credits[s.to] = (credits[s.to] ?? 0) + amt;
    left -= amt;
  }
  credits["zonePool"] = (credits["zonePool"] ?? 0) + left;
  return { rejected: false, total, price, tax, credits };
}
export {};
