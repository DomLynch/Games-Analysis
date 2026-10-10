// Licence: GPL-2.0-or-later (donor, per gplheader.txt: "either version 2 of the License, or (at your option) any later version"). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// Money is an integer count of the smallest unit (copper) throughout.
interface Listing { id: string; seller: string; listPrice: number; }
interface Ledger { [account: string]: number; }

type Outcome =
  | { ok: true; buyerPays: number; sellerCredit: number; fee: number }
  | { ok: false; reason: "no-price" | "no-funds" | "no-slot" };

// Checks run in the order: price, funds, slot. Nothing is charged until all three pass.
// Buyers using the market explorer pay the list price plus a percentage fee; the fee is a sink
// (it is in neither the buyer's balance nor the seller's).
function quotePurchase(
  l: Listing,
  feePercent: number,
  viaExplorer: boolean,
  buyerFunds: number,
  freeSlots: number,
): Outcome {
  const fee = viaExplorer && feePercent > 0 ? Math.floor((l.listPrice * feePercent) / 100) : 0;
  const buyerPays = l.listPrice + fee;
  if (buyerPays <= 0) return { ok: false, reason: "no-price" };
  if (buyerFunds < buyerPays) return { ok: false, reason: "no-funds" };
  if (freeSlots < 1) return { ok: false, reason: "no-slot" };
  return { ok: true, buyerPays, sellerCredit: l.listPrice, fee };
}

// One ledger mutation: the buyer is debited, the seller credited with the list price, and the fee is burned.
function commitPurchase(
  ledger: Ledger,
  buyer: string,
  l: Listing,
  feePercent: number,
  viaExplorer: boolean,
  freeSlots: number,
): Outcome {
  const funds = ledger[buyer] ?? 0;
  const q = quotePurchase(l, feePercent, viaExplorer, funds, freeSlots);
  if (!q.ok) return q;
  ledger[buyer] = funds - q.buyerPays;
  ledger[l.seller] = (ledger[l.seller] ?? 0) + q.sellerCredit;
  return q;
}
export {};
