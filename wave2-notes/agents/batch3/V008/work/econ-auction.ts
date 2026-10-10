// Licence: LGPL-3.0 (README) / GPL-3.0 (LICENSE.GPL) (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type DurationTier = 0 | 1 | 2 | 3; // 6 h, 12 h, 24 h, 48 h

const HOURS: Record<DurationTier, number> = { 0: 6, 1: 12, 2: 24, 3: 48 };
const LISTING_FEE_CAP = 1000000; // copper units, as the donor's MaxListingFee
const SELLER_KEEP = 0.9;         // seller share of a sale; the rest is the trade tax

interface Lot {
  id: number;
  seller: number;
  buyout: number;               // 0 = no buy-now
  tier: DurationTier;
  endsAt: number;               // ms timestamp
  topBid: number;
  topBidder: number | null;
}

interface Ledger { balance: Map<number, number>; }

function listingFee(buyout: number, tier: DurationTier): number {
  return Math.min(Math.floor(buyout * 0.01 * (tier + 1)), LISTING_FEE_CAP);
}

// The debit the donor's in-game paths lack: refuse when the balance would go negative.
function debit(l: Ledger, who: number, amount: number): boolean {
  const bal = l.balance.get(who) ?? 0;
  if (amount < 0 || bal < amount) return false;
  l.balance.set(who, bal - amount);
  return true;
}

function credit(l: Ledger, who: number, amount: number): void {
  l.balance.set(who, (l.balance.get(who) ?? 0) + amount);
}

// Post: the fee is taken first; the lot exists only if the fee was paid.
function postLot(l: Ledger, lots: Map<number, Lot>, lot: Lot, now: number): boolean {
  if (!debit(l, lot.seller, listingFee(lot.buyout, lot.tier))) return false;
  lot.endsAt = now + HOURS[lot.tier] * 3600000;
  lots.set(lot.id, lot);
  return true;
}

// Sale: seller gets 90 percent, rounded down. The remainder is not credited to anyone.
function settleSale(l: Ledger, lot: Lot, price: number): void {
  credit(l, lot.seller, Math.floor(price * SELLER_KEEP));
}

type BidOutcome = "buyNow" | "bid" | "rejected";

// Buy-now at or above the buyout ends the lot. Otherwise a bid must beat the top bid.
// The donor refunds the old top bidder before debiting the new one; here the debit comes first,
// so a failed debit changes nothing.
function bidOn(l: Ledger, lots: Map<number, Lot>, lot: Lot, bidder: number, amount: number,
               refund: (who: number, amount: number) => void): BidOutcome {
  if (!lots.has(lot.id)) return "rejected";
  if (lot.buyout !== 0 && amount >= lot.buyout) {
    if (!debit(l, bidder, lot.buyout)) return "rejected";
    if (lot.topBidder !== null) refund(lot.topBidder, lot.topBid);
    settleSale(l, lot, lot.buyout);
    lots.delete(lot.id);
    return "buyNow";
  }
  if (amount <= lot.topBid) return "rejected";
  if (!debit(l, bidder, amount)) return "rejected";
  if (lot.topBidder !== null) refund(lot.topBidder, lot.topBid);
  lot.topBidder = bidder;
  lot.topBid = amount;
  return "bid";
}

// Expiry sweep (the donor runs it every 5 s): a lot with a top bidder sells, otherwise it returns to the seller.
function sweepExpired(l: Ledger, lots: Map<number, Lot>, now: number,
                      returnItem: (seller: number, lotId: number) => void): void {
  for (const lot of [...lots.values()]) {
    if (now <= lot.endsAt) continue;
    if (lot.topBidder !== null) settleSale(l, lot, lot.topBid);
    else returnItem(lot.seller, lot.id);
    lots.delete(lot.id);
  }
}

export {};
