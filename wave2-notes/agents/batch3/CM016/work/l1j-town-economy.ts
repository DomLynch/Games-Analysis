// clean-room sketch from the described mechanism (donor licence: GPL-2.0-or-later; shape only, no lines copied).
export {};

interface Town {
  id: number;
  leaderId: string;
  variableRatePct: number;  // active leader-set part (0 to 3 in donor)
  reservedRatePct: number;  // set by the leader; becomes active at the daily tick
  fixedRatePct: number;     // always-on part (donor: 2)
  salesToday: number;
  salesYesterday: number;
  taxPool: number;          // variable tax collected
  fixPool: number;          // fixed tax collected; paid out monthly
  paused: boolean;          // true while the monthly pool is computed
}

// One tax figure per sale line, floored per unit. The town's split is taken from this figure,
// so the buyer's tax and the town's credit cannot disagree by a rounding unit.
function saleTax(price: number, count: number, totalPct: number): number {
  let tax = 0;
  for (let i = 0; i < count; i++) tax += Math.floor((price * totalPct) / 100);
  return tax;
}

// Records one sale. Returns the tax the buyer owes on the line; the town keeps the same amount.
function recordSale(t: Town, price: number, count: number): number {
  if (t.paused) return 0; // no sales are booked while the monthly pool is computed
  const totalPct = t.variableRatePct + t.fixedRatePct;
  const tax = saleTax(price, count, totalPct);
  const fixed = Math.floor((tax * t.fixedRatePct) / totalPct);
  t.fixPool += fixed;
  t.taxPool += tax - fixed;
  t.salesToday += price * count;
  return tax;
}

// Leader sets the total rate (2 to 5 in donor); the variable part is stored and applied at the next daily tick.
function setReservedRate(t: Town, callerId: string, totalPct: number): boolean {
  if (callerId !== t.leaderId) return false;
  if (totalPct < t.fixedRatePct || totalPct > 5) return false;
  t.reservedRatePct = totalPct - t.fixedRatePct;
  return true;
}

// Daily tick: the reserved rate becomes active and today's sales become yesterday's.
function dailyTick(towns: Town[]): void {
  for (const t of towns) {
    t.variableRatePct = t.reservedRatePct;
    t.salesYesterday = t.salesToday;
    t.salesToday = 0;
  }
}

// Monthly pool: the fixed-tax pool is shared out per point of contribution, two decimals; top contributor leads.
function monthlyPayout(t: Town, contributions: Map<string, number>): { leader: string | null; pay: Map<string, number> } {
  t.paused = true;
  let total = 0;
  let leader: string | null = null;
  let best = -1;
  for (const [id, c] of contributions) {
    total += c;
    if (c > best) { best = c; leader = id; }
  }
  const unit = total > 0 ? Math.floor((t.fixPool / total) * 100) / 100 : 0;
  const pay = new Map<string, number>();
  for (const [id, c] of contributions) pay.set(id, c * unit);
  t.fixPool = 0;
  t.leaderId = leader ?? t.leaderId;
  t.paused = false;
  return { leader, pay };
}
