// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism; not a translation of the donor lines.
interface StockLine {
  maxAmount: number; // demand-adjusted ceiling; starts at the shop list amount
  amount: number;    // stock on the shelf now
}

interface Shop {
  lastRestockMs: number;
  restockDelayMs: number;
  lines: StockLine[];
}

const MAX_CEILING = 999;        // ceiling never grows past this
const LARGE_RESET = 640;        // a 999 ceiling is cut to this when it halves
const HALVE_FLOOR = 20;         // ceilings at or below this never halve

// One restock step for one line.
function restockLine(line: StockLine): void {
  if (line.amount <= 0) {
    // Sold out: demand is high, so double the ceiling (capped).
    line.maxAmount = Math.min(MAX_CEILING, line.maxAmount * 2);
  } else {
    let half = line.maxAmount;
    if (half >= MAX_CEILING) half = LARGE_RESET;
    else if (half > HALVE_FLOOR) half = Math.floor(half / 2);
    // At least half still unsold: demand is low, so lower the ceiling.
    if (line.amount >= half) line.maxAmount = half;
  }
  line.amount = line.maxAmount; // every restock refills to the (new) ceiling
}

// Called when a buyer opens the list. At most one restock step, however long the shop was unvisited.
function onOpenList(shop: Shop, nowMs: number): void {
  if (nowMs - shop.lastRestockMs > shop.restockDelayMs) {
    shop.lastRestockMs = nowMs;
    for (const line of shop.lines) restockLine(line);
  }
}

// Buying takes stock down; the caller has already checked payment.
function takeStock(line: StockLine, requested: number): number {
  const qty = Math.min(requested, line.amount);
  line.amount -= qty;
  return qty;
}

export {};
