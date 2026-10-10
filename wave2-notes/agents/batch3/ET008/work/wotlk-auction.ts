// Licence: GNU GPL v2 (donor LICENSE). Clean-room sketch of the mechanism, not a translation of the donor.
// clean-room
interface Wallet { gold: number; } // copper; the only balance that listings, bids and sales move

interface HouseTerms {
  depositPercent: number; // per auction house (data)
  cutPercent: number;     // per auction house (data)
  depositRate: number;    // server rate, default 1.0
  cutRate: number;        // server rate, default 1.0
}

const MIN_DEPOSIT = 100; // copper, before the rate

interface Listing {
  sellPrice: number;      // vendor sell price of one item
  count: number;
  startBid: number;
  buyout: number;         // 0 = no buyout
  bid: number;
  bidder: Wallet | null;
  deposit: number;
  expireAt: number;       // seconds
  open: boolean;
}

// Deposit on listing: depositPercent x 3 percent x vendor price x count x whole 12-hour periods, times the rate, never below the minimum.
function deposit(t: HouseTerms, sellPrice: number, count: number, durationSec: number): number {
  const periods = Math.floor(durationSec / 3600 / 12);
  const multiplier = (t.depositPercent * 3) / 100;
  const raw = Math.trunc(((multiplier * sellPrice * count) / 3) * periods * 3 * t.depositRate);
  return Math.max(raw, MIN_DEPOSIT * t.depositRate);
}

function cut(t: HouseTerms, bid: number): number {
  return Math.max(Math.trunc((bid * t.cutPercent) / 100 * t.cutRate), 0);
}

function outbidStep(bid: number): number {
  return Math.max(Math.trunc((bid * 5) / 100), 1);
}

function sellerProfit(t: HouseTerms, l: Listing): number {
  return l.bid + l.deposit - cut(t, l.bid);
}

function list(t: HouseTerms, seller: Wallet, sellPrice: number, count: number, startBid: number, buyout: number, durationSec: number, now: number): Listing | null {
  const d = deposit(t, sellPrice, count, durationSec);
  if (seller.gold < d) return null;
  seller.gold -= d;
  return { sellPrice, count, startBid, buyout, bid: 0, bidder: null, deposit: d, expireAt: now + durationSec, open: true };
}

// Bid or buyout. The affordability check uses the price sent, as in the donor.
function place(t: HouseTerms, l: Listing, bidder: Wallet, seller: Wallet, price: number): 'bid' | 'buyout' | 'refused' {
  if (!l.open) return 'refused';
  if (price <= l.bid || price < l.startBid) return 'refused';
  const isBid = price < l.buyout || l.buyout === 0;
  if (isBid && price < l.bid + outbidStep(l.bid)) return 'refused';
  if (bidder.gold < price) return 'refused';

  if (isBid) {
    if (l.bidder) l.bidder.gold += l.bid;   // previous bid returned (mail in the donor)
    bidder.gold -= price;
    l.bidder = bidder;
    l.bid = price;
    return 'bid';
  }

  // buyout: pay the buyout (less any bid already held), refund the previous bidder, and close the sale
  if (l.bidder === bidder) bidder.gold -= l.buyout - l.bid;
  else {
    bidder.gold -= l.buyout;
    if (l.bidder) l.bidder.gold += l.bid;
  }
  l.bidder = bidder;
  l.bid = l.buyout;
  seller.gold += sellerProfit(t, l); // sale: seller gets bid + deposit - cut
  l.open = false;
  return 'buyout';
}

// Cancel: with a bidder, the seller pays the cut and the bid goes back to the bidder. The deposit is not returned.
function cancel(t: HouseTerms, l: Listing, seller: Wallet): boolean {
  if (!l.open) return false;
  if (l.bidder) {
    const c = cut(t, l.bid);
    if (seller.gold < c) return false;
    seller.gold -= c;
    l.bidder.gold += l.bid;
  }
  l.open = false;
  return true;
}

// Minute tick with a 60 s look-ahead. No bidder: the item goes back and the deposit is lost. With a bidder: the seller gets bid + deposit - cut.
function tick(t: HouseTerms, listings: Listing[], seller: Wallet, now: number): void {
  const checkTime = now + 60;
  for (const l of listings) {
    if (!l.open || l.expireAt > checkTime) continue;
    if (l.bidder) seller.gold += sellerProfit(t, l);
    l.open = false;
  }
}

export {};
