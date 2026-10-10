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
const l: Listing = { id: "a", seller: "S", listPrice: 1000 };
console.log("explorer 1000 fee20:", JSON.stringify(quotePurchase(l, 20, true, 5000, 1)));
console.log("direct 1000 (no fee):", JSON.stringify(quotePurchase(l, 20, false, 5000, 1)));
console.log("funds 1199 for 1200:", JSON.stringify(quotePurchase(l, 20, true, 1199, 1)));
console.log("no slot:", JSON.stringify(quotePurchase(l, 20, true, 5000, 0)));
const big: Listing = { id: "b", seller: "S", listPrice: 110000000 };
console.log("big 110M exact:", JSON.stringify(quotePurchase(big, 20, true, 200000000, 1)));
console.log("big funds 131999999:", JSON.stringify(quotePurchase(big, 20, true, 131999999, 1)));
const ledger: Ledger = { B: 5000, S: 0 };
const r = commitPurchase(ledger, "B", l, 20, true, 1);
const total = Object.values(ledger).reduce((a, b) => a + b, 0);
console.log("commit:", JSON.stringify(r), "ledger", JSON.stringify(ledger), "sum after", total, "sum before 5000 => burned", 5000 - total);
// What the donor's 32-bit int arithmetic does at the same price (emulated, not run on the donor):
const p = 110000000;
const wrapped = (p * 20) | 0;                 // C# int multiply wraps to 32 bits
const feeWrapped = Math.trunc(wrapped / 100); // C# int divide truncates toward zero
console.log("donor int32 emulation: product", wrapped, "fee", feeWrapped, "buyer pays", (p + feeWrapped) | 0);
