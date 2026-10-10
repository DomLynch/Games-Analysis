// Licence: MIT (donor, Copyright (c) 2023-2025 Lost City). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Row {
  cost: number;     // base cost in the donor's cost unit
  target: number;   // stock the shop wants to hold (0 for an unlisted item)
  rate: number;     // restock period in ticks; 0 never restocks
  stock: number;
}

interface Shop {
  rows: Map<string, Row>;
}

interface Terms {
  haggle: number;      // how far one unit of stock surplus or shortage moves the price
  sellPercent: number; // shop sells at this per-mille of cost, before stock adjustment
  buyPercent: number;  // shop buys at this per-mille of cost, before stock adjustment
}

interface Wallet {
  gold: number;
}

const ADJ_MAX = 1000;
const ADJ_MIN = -5000;
const PCT_FLOOR = 100;

// Per-unit value: the stock deviation, scaled by haggle and clamped, moves the percent; the percent is floored.
export function unitValue(cost: number, haggle: number, percent: number, diff: number): number {
  const adj = Math.min(ADJ_MAX, Math.max(ADJ_MIN, diff * haggle));
  const pct = Math.max(PCT_FLOOR, percent - adj);
  const value = Math.floor((pct * cost) / 1000);
  return value < 0 ? 2000000000 : value;
}

// Each unit is priced at the stock left before it, so a bulk buy gets dearer one unit at a time.
// The coin check runs before the stock check. Units already paid for are kept when a later unit fails.
export function buy(shop: Shop, wallet: Wallet, itemId: string, amount: number, t: Terms): number {
  const row = shop.rows.get(itemId);
  if (!row) return 0;
  let bought = 0;
  for (let i = 0; i < amount; i++) {
    const unit = Math.max(1, unitValue(row.cost, t.haggle, t.sellPercent, row.stock - row.target));
    if (wallet.gold < unit) break;
    if (row.stock <= 0) break;
    wallet.gold -= unit;
    row.stock -= 1;
    bought += 1;
  }
  return bought;
}

// Selling is priced for the whole lot before any stock moves, one unit at a time against the stock already there.
export function sell(shop: Shop, wallet: Wallet, itemId: string, amount: number, t: Terms): number {
  const row = shop.rows.get(itemId);
  if (!row) return 0;
  let total = 0;
  for (let i = 0; i < amount; i++) {
    total += unitValue(row.cost, t.haggle, t.buyPercent, row.stock + i - row.target);
  }
  row.stock += amount;
  wallet.gold += total;
  return total;
}

// Runs once per world tick. Each row with a nonzero rate moves one unit toward its target on ticks divisible by the rate.
export function restockTick(shop: Shop, tick: number): void {
  for (const row of shop.rows.values()) {
    if (row.rate <= 0) continue;
    if (tick % row.rate !== 0) continue;
    if (row.stock < row.target) row.stock += 1;
    else if (row.stock > row.target) row.stock -= 1;
  }
}

export {};
