// clean-room sketch of the donor's rules (GPL-3.0 donor). Written from the described mechanism, not a translation.
interface Listing {
  id: number;
  sellerId: number;
  buyerId: number;      // 0 = no bidder yet
  price: number;        // current top bid, or the start price
  buyNow: number;
  endsAt: number;       // ms epoch
  closed: boolean;
}

// One ledger for all zeny. debit() returns false if the balance is short.
interface Ledger {
  debit(charId: number, amount: number, why: string): boolean;
  credit(charId: number, amount: number, why: string): void;
  giveItem(charId: number, itemId: number, why: string): void;
}

const FEE_PER_HOUR = 12000;     // auction_feeperhour default (battle.cpp:8633)
const MAX_PRICE = 500000000;    // auction_maximumprice default (battle.cpp:8634)
const MAX_LISTINGS = 5;         // int_auction.cpp:333
const MAX_BIDS = 5;             // int_auction.cpp:446
const CATCHUP_MS = 10000;       // int_auction.cpp:250, overdue rows fire after 10 s

function openCount(db: Map<number, Listing>, charId: number, asBuyer: boolean): number {
  let n = 0;
  for (const l of db.values()) {
    if (l.closed) continue;
    if (asBuyer ? l.buyerId === charId : l.sellerId === charId) n++;
  }
  return n;
}

// Listing: the whole fee is taken up front and returned if the listing is refused.
function list(
  ledger: Ledger, db: Map<number, Listing>, nextId: number,
  sellerId: number, price: number, buyNow: number, hours: number, now: number
): Listing | null {
  if (hours < 1 || hours > 48) return null;
  if (price >= buyNow) return null;          // donor refuses before clamping (clif.cpp:17091)
  const cap = Math.min(buyNow, MAX_PRICE);
  const start = price >= cap ? cap - 1 : price;
  const fee = hours * FEE_PER_HOUR;
  if (!ledger.debit(sellerId, fee, "auction-fee")) return null;
  if (openCount(db, sellerId, false) >= MAX_LISTINGS) {
    ledger.credit(sellerId, fee, "auction-fee-refund");
    return null;
  }
  const l: Listing = { id: nextId, sellerId, buyerId: 0, price: start, buyNow: cap,
                       endsAt: now + hours * 3600000, closed: false };
  db.set(l.id, l);
  return l;
}

// Bid: the bid is debited first. Every refusal path credits it back, so no path loses zeny.
function bid(ledger: Ledger, db: Map<number, Listing>, l: Listing, bidderId: number, amount: number): boolean {
  if (l.closed || amount <= l.price || l.sellerId === bidderId) return false;
  if (!ledger.debit(bidderId, amount, "auction-bid")) return false;
  if (openCount(db, bidderId, true) >= MAX_BIDS && amount < l.buyNow && l.buyerId !== bidderId) {
    ledger.credit(bidderId, amount, "auction-bid-refund");
    return false;
  }
  if (l.buyerId !== 0) ledger.credit(l.buyerId, l.price, "outbid-refund");
  l.buyerId = bidderId;
  l.price = amount;
  if (amount >= l.buyNow) {
    ledger.credit(bidderId, amount - l.buyNow, "buyout-excess");
    settle(ledger, l);
  }
  return true;
}

// Ending: a sold listing pays the seller the price and gives the item to the buyer; an unsold one returns the item. The fee is never refunded here.
function settle(ledger: Ledger, l: Listing): void {
  if (l.closed) return;
  if (l.buyerId !== 0) {
    ledger.credit(l.sellerId, l.price, "auction-sale");
    ledger.giveItem(l.buyerId, l.id, "auction-item");
  } else {
    ledger.giveItem(l.sellerId, l.id, "auction-item-returned");
  }
  l.closed = true;
}

// Cancel is allowed only with no bidder, and returns the item only (the fee stays with the house).
function cancel(ledger: Ledger, l: Listing): boolean {
  if (l.closed || l.buyerId !== 0) return false;
  ledger.giveItem(l.sellerId, l.id, "auction-cancel-item");
  l.closed = true;
  return true;
}

// Restart: an ended row is settled after CATCHUP_MS, not dropped.
function resumeTimer(l: Listing, now: number): number {
  return l.endsAt > now ? l.endsAt - now : CATCHUP_MS;
}

export {};
