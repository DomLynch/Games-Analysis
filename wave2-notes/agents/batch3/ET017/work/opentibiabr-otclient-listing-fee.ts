// Licence: MIT (donor, OTClient). Clean-room shape, written from the described mechanism.
export interface FeeRule {
  basisPoints: number; // listing fee rate in basis points of gross (100 = 1 percent)
  min: number;         // floor, gold
  max: number;         // cap, gold
}

export interface Wallet { cash: number; bank: number; }

// One pure function. The server calls it for the debit; the client preview must call this same export.
export function listingFee(gross: number, rule: FeeRule): number {
  const raw = Math.floor((gross * rule.basisPoints) / 10000); // integer math, rounds down
  return Math.min(rule.max, Math.max(rule.min, raw));
}

// Takes gold from cash first, then bank. Returns null when the total cannot be covered.
export function takeFromWallet(w: Wallet, amount: number): Wallet | null {
  if (amount > w.cash + w.bank) return null;
  const fromCash = Math.min(w.cash, amount);
  return { cash: w.cash - fromCash, bank: w.bank - (amount - fromCash) };
}

// Buy listing: gross plus fee is paid at creation.
export function listBuy(w: Wallet, unitPrice: number, amount: number, rule: FeeRule): { fee: number; wallet: Wallet } | null {
  const gross = unitPrice * amount;
  const fee = listingFee(gross, rule);
  const after = takeFromWallet(w, gross + fee);
  return after === null ? null : { fee, wallet: after };
}

// Sell listing: only the fee is paid here. The caller removes the items.
export function listSell(w: Wallet, unitPrice: number, amount: number, rule: FeeRule): { fee: number; wallet: Wallet } | null {
  const fee = listingFee(unitPrice * amount, rule);
  const after = takeFromWallet(w, fee);
  return after === null ? null : { fee, wallet: after };
}

export {};
