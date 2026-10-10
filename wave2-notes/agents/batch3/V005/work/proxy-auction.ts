// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Bank { [id: string]: number; }

interface Lot {
  price: number;        // visible current price
  leader: string | null;
  leaderMax: number;    // the leader's hidden ceiling (proxy)
  leaderPaid: number;   // what the leader has been debited on this lot so far (not tracked in the donor)
}

type BidResult = "ok" | "too-low" | "not-enough-credits";

// Visible offer must beat the price; the hidden max must beat the offer.
// A challenger whose max is below the leader's max loses the lead, but moves the price to just above their own max.
function placeBid(lot: Lot, bank: Bank, bidder: string, offer: number, max: number): BidResult {
  if (offer <= lot.price || max <= offer) return "too-low";
  if ((bank[bidder] ?? 0) < offer) return "not-enough-credits";

  if (lot.leader !== null && max < lot.leaderMax) {
    const newPrice = max + (offer - lot.price);   // challenger's max plus their increment
    const charge = newPrice - lot.price;          // the leader pays only the rise
    if ((bank[lot.leader] ?? 0) < charge) return "not-enough-credits";
    bank[lot.leader] -= charge;
    lot.leaderPaid += charge;
    lot.price = newPrice;
    return "ok";
  }

  // Takeover or first bid: the new leader pays the visible offer; the old leader gets back their own debit.
  if (lot.leader !== null) bank[lot.leader] = (bank[lot.leader] ?? 0) + lot.leaderPaid;
  bank[bidder] = (bank[bidder] ?? 0) - offer;
  lot.price = offer;
  lot.leader = bidder;
  lot.leaderMax = max;
  lot.leaderPaid = offer;
  return "ok";
}

export {};
