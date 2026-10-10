// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface StockLine {
  maxAmount: number; // ceiling that a restock refills to
  amount: number;    // units left on the shelf
}

// One restock step for one line.
// Sold out: the ceiling doubles (cap 999).
// Otherwise: a ceiling of 999+ drops to 640, a ceiling above 20 halves (integer), and the ceiling
// only drops when the unsold count is at least the new half. Ceilings of 20 or less never change.
// Then the shelf refills to the ceiling in every case.
function restockLine(line: StockLine): void {
  if (line.amount <= 0) {
    line.maxAmount = Math.min(999, line.maxAmount * 2);
  } else {
    let half = line.maxAmount;
    if (half >= 999) half = 640;
    else if (half > 20) half = Math.floor(half / 2);
    if (line.amount >= half) line.maxAmount = half;
  }
  line.amount = line.maxAmount;
}

interface Vendor {
  lastRestock: number; // ms timestamp
  lines: StockLine[];
}

const RESTOCK_DELAY_MS = 60 * 60 * 1000; // one hour

// Lazy trigger: restock runs when a buyer opens the buy list and the delay has passed. No timer.
// Restock sets lastRestock to now, so a long-unvisited vendor restocks once, not once per missed hour.
function onOpenBuyList(v: Vendor, now: number): void {
  if (now - v.lastRestock > RESTOCK_DELAY_MS) {
    v.lastRestock = now;
    for (const line of v.lines) restockLine(line);
  }
}

// A purchase takes at most what is on the shelf; the rest of the order is dropped.
function buy(line: StockLine, want: number): number {
  const got = Math.min(want, line.amount);
  if (got < 1) return 0;
  line.amount -= got;
  return got;
}

export {};
