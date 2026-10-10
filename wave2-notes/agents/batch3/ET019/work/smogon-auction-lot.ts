// Licence: MIT (donor: Pokemon Showdown). Written fresh from the described mechanism; not a translation.
type Id = string;

interface LedgerRow { seq: number; account: Id; delta: number; reason: string; }

// One ledger: balances change only through post(), and every change is a row.
class Ledger {
  private rows: LedgerRow[] = [];
  private balances = new Map<Id, number>();
  constructor(private startingBalance: number) {}
  balance(account: Id): number { return this.balances.get(account) ?? this.startingBalance; }
  post(account: Id, delta: number, reason: string): void {
    const next = this.balance(account) + delta;
    if (next < 0) throw new Error("insufficient funds");
    this.balances.set(account, next);
    this.rows.push({ seq: this.rows.length + 1, account, delta, reason });
  }
}

interface Lot { itemId: Id; highest: number; highestBidder: Id | null; closesAt: number; }
interface Sale { buyer: Id; itemId: Id; price: number; }

class LotAuction {
  private lot: Lot | null = null;
  private lastSale: Sale | null = null;
  constructor(
    private ledger: Ledger,
    private minBid: number,       // donor default 3000 (data field)
    private minPlayers: number,   // mandatory roster slots (data field)
    private windowMs: number,     // bid window, reset on every bid (data field)
    private ownedCount: (buyer: Id) => number,
  ) {}

  // Money a buyer must keep for the mandatory slots still unfilled, excluding the lot being bid on.
  reserve(buyer: Id): number {
    return this.minBid * Math.max(0, this.minPlayers - this.ownedCount(buyer) - 1);
  }
  maxBid(buyer: Id): number { return this.ledger.balance(buyer) - this.reserve(buyer); }

  open(itemId: Id, now: number): void {
    if (this.lot) throw new Error("a lot is already open");
    this.lot = { itemId, highest: this.minBid, highestBidder: null, closesAt: now + this.windowMs };
  }

  bid(buyer: Id, amount: number, now: number): void {
    const lot = this.lot;
    if (!lot || now >= lot.closesAt) throw new Error("no lot open");
    if (amount % 500 !== 0) throw new Error("bids are multiples of 500");
    if (amount > this.maxBid(buyer)) throw new Error("cannot afford that bid");
    if (amount <= lot.highest) throw new Error("bid must beat the current bid");
    lot.highest = amount;
    lot.highestBidder = buyer;
    lot.closesAt = now + this.windowMs; // full window again after every bid
  }

  // Called on a timer tick. Closes the lot at its deadline; the sale is one ledger write.
  close(now: number, grant: (buyer: Id, itemId: Id) => void): void {
    const lot = this.lot;
    if (!lot || now < lot.closesAt) return;
    this.lot = null;
    if (lot.highestBidder === null) return; // no bid: the lot passes
    this.ledger.post(lot.highestBidder, -lot.highest, `buy ${lot.itemId}`);
    grant(lot.highestBidder, lot.itemId);
    this.lastSale = { buyer: lot.highestBidder, itemId: lot.itemId, price: lot.highest };
  }

  // Reverses the last sale: refund the price and return the item.
  undo(revoke: (buyer: Id, itemId: Id) => void): void {
    const sale = this.lastSale;
    if (!sale) throw new Error("only one sale can be undone");
    this.ledger.post(sale.buyer, sale.price, `undo ${sale.itemId}`);
    revoke(sale.buyer, sale.itemId);
    this.lastSale = null;
  }
}

export {};
