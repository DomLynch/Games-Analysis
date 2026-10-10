// Licence: GPL-2.0 (donor). Clean-room: written from the described mechanism; no donor lines are translated.
export type Side = 'buy' | 'sell';
export type State = 'active' | 'filled' | 'cancelled' | 'expired';

export interface Wallet { cash: number; bank: number; }
export interface Listing {
  id: number;
  owner: number;
  side: Side;
  unitPrice: number;
  amount: number;   // remaining units
  created: number;  // seconds
  state: State;
}
export interface Ledger {
  wallets: Map<number, Wallet>;
  listings: Map<number, Listing>;
  escrow: number;   // gold held for open buy listings (explicit, not implied by rows)
  feeSink: number;  // listing fees; never returned
}
export interface Rules {
  feeBasisPoints: number; // 100 = 1 percent of gross
  feeMin: number;
  feeMax: number;
  durationS: number;      // listing lifetime, seconds
}

export function listingFee(gross: number, r: Rules): number {
  const raw = Math.floor((gross * r.feeBasisPoints) / 10000);
  return Math.min(r.feeMax, Math.max(r.feeMin, raw));
}

// Cash first, then bank. Changes nothing and returns false when the total cannot be covered.
function pay(l: Ledger, who: number, total: number): boolean {
  const w = l.wallets.get(who);
  if (!w || total > w.cash + w.bank) return false;
  const fromCash = Math.min(w.cash, total);
  l.wallets.set(who, { cash: w.cash - fromCash, bank: w.bank - (total - fromCash) });
  return true;
}

function credit(l: Ledger, who: number, amount: number): void {
  const w = l.wallets.get(who);
  if (!w) throw new Error('no wallet for ' + who);
  l.wallets.set(who, { cash: w.cash, bank: w.bank + amount });
}

// Listing. Buy: gross plus fee leaves the wallet, gross goes to escrow. Sell: only the fee is charged here.
export function createListing(l: Ledger, r: Rules, id: number, owner: number, side: Side,
                              unitPrice: number, amount: number, now: number): Listing | null {
  if (amount <= 0 || unitPrice <= 0 || l.listings.has(id)) return null;
  const gross = unitPrice * amount;
  const fee = listingFee(gross, r);
  const total = side === 'buy' ? gross + fee : fee;
  if (!pay(l, owner, total)) return null;
  if (side === 'buy') l.escrow += gross;
  l.feeSink += fee;
  const listing: Listing = { id, owner, side, unitPrice, amount, created: now, state: 'active' };
  l.listings.set(id, listing);
  return listing;
}

// Accept part or all of a listing. Checks first, then money moves in one step. The caller moves items.
export function accept(l: Ledger, id: number, acceptor: number, qty: number): number | null {
  const x = l.listings.get(id);
  if (!x || x.state !== 'active' || qty <= 0 || qty > x.amount || acceptor === x.owner) return null;
  const total = qty * x.unitPrice;
  if (x.side === 'sell') {
    if (!l.wallets.has(x.owner)) return null;     // check the credit target before any debit
    if (!pay(l, acceptor, total)) return null;   // acceptor pays
    credit(l, x.owner, total);                    // owner is credited to bank
  } else {
    l.escrow -= total;                            // escrow pays the acceptor, who supplies the items
    credit(l, acceptor, total);
  }
  x.amount -= qty;
  if (x.amount === 0) x.state = 'filled';
  return total;
}

// Cancel or expiry. The state moves first, so a second call pays nothing.
export function release(l: Ledger, id: number, to: 'cancelled' | 'expired'): number {
  const x = l.listings.get(id);
  if (!x || x.state !== 'active') return 0;
  x.state = to;
  if (x.side === 'buy') {
    const back = x.amount * x.unitPrice;
    l.escrow -= back;
    credit(l, x.owner, back);
    return back;
  }
  return 0; // sell: the caller returns the items to the owner's inbox; the fee is kept
}

// Periodic sweep: releases every active listing older than the lifetime.
export function sweep(l: Ledger, r: Rules, now: number): number {
  let paid = 0;
  for (const x of l.listings.values()) {
    if (x.state === 'active' && x.created <= now - r.durationS) paid += release(l, x.id, 'expired');
  }
  return paid;
}

// One-ledger invariant for tests: wallets + escrow + fees is constant across every call above.
export function totalGold(l: Ledger): number {
  let sum = l.escrow + l.feeSink;
  for (const w of l.wallets.values()) sum += w.cash + w.bank;
  return sum;
}

export {};
