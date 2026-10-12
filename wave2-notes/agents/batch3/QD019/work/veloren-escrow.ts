// Escrowed-deposit quest with once-only settlement (shape of the veloren rtsim quest rule; clean-room).
type Stock = Map<string, number>;                       // item id -> count, one holder's inventory
type Payout = { item: string; amount: number };
type Quest = {
  id: number;
  arbiter: string;                                      // only this holder may settle
  deposit: Payout | null;                               // escrowed reward
  timeoutAt: number | null;                             // expired only when now is strictly later
  resolution: 0 | 1 | 2;                                // 0 open, 1 failed, 2 succeeded; never goes back
};

// Offer: the arbiter must already hold the amount; the escrow is taken only when the player says yes.
// simplified-rounding fix: the donor takes ceil and refunds floor; this sketch uses floor for both.
function takeDeposit(stock: Stock, item: string, amount: number): Payout | null {
  const need = Math.floor(amount);
  if ((stock.get(item) ?? 0) < need) return null;
  stock.set(item, (stock.get(item) ?? 0) - need);
  return { item, amount: need };
}

// Pure check first, so settle can never fail after items have been removed.
function canSettle(q: Quest, requester: string): boolean {
  return requester === q.arbiter && q.resolution === 0;
}

// Settle exactly once; a second call returns null (stands in for compare_exchange from 0).
function settle(q: Quest, requester: string, success: boolean): Payout | null {
  if (!canSettle(q, requester)) return null;
  q.resolution = success ? 2 : 1;
  return q.deposit;
}

// Hand-in as one step: check items and settlement, then consume, then settle.
function handIn(q: Quest, stock: Stock, required: [string, number][], requester: string):
  { ok: true; paid: Payout | null } | { ok: false; reason: string } {
  for (const [item, n] of required) {
    if ((stock.get(item) ?? 0) < n) return { ok: false, reason: 'lacks items' };
  }
  if (!canSettle(q, requester)) return { ok: false, reason: 'already settled' };
  for (const [item, n] of required) stock.set(item, (stock.get(item) ?? 0) - n);
  return { ok: true, paid: settle(q, requester, true) };
}

// Timeouts: each quest that has passed its deadline is failed once; the escrow goes back to the arbiter.
function expire(quests: Quest[], now: number): { quest: Quest; refund: Payout }[] {
  const out: { quest: Quest; refund: Payout }[] = [];
  for (const q of quests) {
    if (q.timeoutAt !== null && now > q.timeoutAt) {
      const refund = settle(q, q.arbiter, false);
      if (refund) out.push({ quest: q, refund });
    }
  }
  return out;
}

// Dialogue offer: pick one affordable candidate at random, or nothing.
function pickOffer<T>(candidates: T[], rand: () => number): T | null {
  if (candidates.length === 0) return null;
  return candidates[Math.floor(rand() * candidates.length)];
}

export {};
