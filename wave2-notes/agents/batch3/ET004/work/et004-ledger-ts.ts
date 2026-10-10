// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Ledger { cash: number; ore: number; capacity: number; }

// Take-or-fail debit: ore is spent before cash; nothing changes if cash plus ore is short.
function takeMoney(l: Ledger, amount: number): boolean {
  if (l.cash + l.ore < amount) return false;
  l.ore -= amount;
  if (l.ore < 0) {
    l.cash += l.ore; // the shortfall comes out of cash
    l.ore = 0;
  }
  return true;
}

// Ore credit with a capacity cap (discard branch): credits up to the free space and returns what was credited.
function addOre(l: Ledger, value: number): number {
  const room = Math.max(l.capacity - l.ore, 0);
  const credited = Math.min(value, room);
  l.ore += credited;
  return credited;
}

interface Build { totalCost: number; remainingCost: number; totalTime: number; remainingTime: number; paidOre: number; }

// One logic tick of a build that is paid as it goes. The due amount is the gap between the remaining cost
// and a linear expected remaining cost. If the tick cannot be paid, the build waits and nothing is debited.
// Returns true when the build is done.
function tickBuild(b: Build, l: Ledger): boolean {
  const expected = b.remainingTime === 1 ? 0 : Math.floor((b.totalCost * b.remainingTime) / Math.max(1, b.totalTime));
  const dueNow = b.remainingCost - expected;
  if (l.ore > 0 && l.ore <= dueNow) b.paidOre += l.ore;
  else if (l.ore > dueNow) b.paidOre += dueNow;
  if (dueNow !== 0 && !takeMoney(l, dueNow)) {
    b.paidOre -= l.ore; // the donor rolls back with the current ore stock; the sketch copies that
    return false;
  }
  b.remainingCost -= dueNow;
  b.remainingTime -= 1;
  return b.remainingTime <= 0;
}

// Sell refund: a percent of the sell value, scaled by the share of health left.
function sellRefund(sellValue: number, refundPct: number, hp: number, maxHp: number): number {
  return Math.trunc((sellValue * refundPct * hp) / (100 * maxHp));
}
export {};
