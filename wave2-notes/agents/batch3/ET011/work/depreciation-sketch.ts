// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Gamerules {
  min: number;        // floor: fraction of cost a fully depreciated item keeps
  daily: number;      // per-day decay factor applied after the grace period
  grace: number;      // days at full value
  maxAge: number;     // days after the grace period at which the floor is reached
}

export const DEFAULTS: Gamerules = { min: 0.25, daily: 0.997, grace: 7, maxAge: 1000 };

// Purchase day -> number of items bought that day, for one item model.
export type Bins = Map<number, number>;

// Fraction of cost left for an item of the given age in days.
export function fraction(age: number, g: Gamerules): number {
  const maxAge = g.maxAge + g.grace;
  if (age <= g.grace) return 1;
  if (age >= maxAge) return g.min;
  const eff = age - g.grace;
  const decay = Math.pow(g.daily, eff);
  const linear = (maxAge - eff) / maxAge;
  return g.min + (1 - g.min) * decay * linear;
}

// Fraction used for items with no record: a planet's stock is full price, a player's fleet is at the floor.
function noRecord(isStock: boolean, g: Gamerules): number {
  return isStock ? 1 : g.min;
}

// Value of `count` items of one model. The stock uses its oldest bins first; the fleet uses its newest first.
export function bunchValue(bins: Bins, today: number, count: number, isStock: boolean, cost: number, g: Gamerules): number {
  const days = [...bins.keys()].sort((a, b) => a - b);
  if (days.length === 0) return Math.floor(count * noRecord(isStock, g) * cost);
  const order = isStock ? days : [...days].reverse();
  let left = count;
  let sum = 0;
  for (const d of order) {
    const used = Math.min(bins.get(d) ?? 0, left);
    left -= used;
    sum += used * fraction(today - d, g);
    if (left === 0) break;
  }
  return Math.floor((sum + left * noRecord(isStock, g)) * cost);
}

// Remove one item from a record and return its purchase day (stock: oldest first; fleet: newest first).
export function takeOne(bins: Bins, isStock: boolean): number {
  const days = [...bins.keys()].sort((a, b) => a - b);
  const d = isStock ? days[0] : days[days.length - 1];
  const n = (bins.get(d) ?? 0) - 1;
  if (n === 0) bins.delete(d); else bins.set(d, n);
  return d;
}

// Player buys one item from the stock. The price is read before the record moves; the item keeps its purchase day.
export function buyFromStock(stock: Bins, fleet: Bins, today: number, cost: number, g: Gamerules): number {
  const price = bunchValue(stock, today, 1, true, cost, g);
  const day = stock.size > 0 ? takeOne(stock, true) : today;
  fleet.set(day, (fleet.get(day) ?? 0) + 1);
  return price;
}

// Player sells one item to the stock. An item with no fleet record enters the stock as fully depreciated.
export function sellToStock(fleet: Bins, stock: Bins, today: number, cost: number, g: Gamerules): number {
  const price = bunchValue(fleet, today, 1, false, cost, g);
  const day = fleet.size > 0 ? takeOne(fleet, false) : today - (g.maxAge + g.grace);
  stock.set(day, (stock.get(day) ?? 0) + 1);
  return price;
}
