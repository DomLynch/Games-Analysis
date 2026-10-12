// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor.
type Id = string;

interface Offer {
  items: Id[];      // items stay in the owner's bag until settlement (held by reference)
  coins: number;
  confirmed: boolean;
}

// One settlement row. Every row of one trade shares a tradeId (one ledger group).
type Row =
  | { kind: "item"; tradeId: number; item: Id; from: Id; to: Id }
  | { kind: "coins"; tradeId: number; amount: number; from: Id; to: Id };

// Live checks, run again at confirm time (the donor re-checks at verify).
interface Checks {
  inRange(a: Id, b: Id): boolean;          // donor: distance < 15.f
  holdsItem(who: Id, item: Id): boolean;   // item still in who's bag
  tradable(item: Id): boolean;             // not no-trade, and no no-trade object inside
  balance(who: Id): number;                // cash on hand
  roomFor(who: Id, items: Id[]): boolean;  // free slots on the receiving side
}

let nextTradeId = 1;

export class TradeWindow {
  private readonly tradeId: number;
  private readonly offers: Record<Id, Offer>;
  private open = true;

  constructor(private readonly a: Id, private readonly b: Id, private readonly checks: Checks) {
    this.tradeId = nextTradeId++;
    this.offers = {
      [a]: { items: [], coins: 0, confirmed: false },
      [b]: { items: [], coins: 0, confirmed: false },
    };
  }

  private other(who: Id): Id {
    return who === this.a ? this.b : this.a;
  }

  // Fix for the donor: any edit clears BOTH confirms, so a confirm always covers the current contents.
  private touch(): void {
    this.offers[this.a].confirmed = false;
    this.offers[this.b].confirmed = false;
  }

  addItem(who: Id, item: Id): boolean {
    if (!this.open || !this.checks.tradable(item) || !this.checks.holdsItem(who, item)) return false;
    this.offers[who].items.push(item);
    this.touch();
    return true;
  }

  setCoins(who: Id, amount: number): boolean {
    if (!this.open) return false;
    this.offers[who].coins = Math.max(0, Math.min(Math.floor(amount), this.checks.balance(who)));
    this.touch();
    return true;
  }

  // Returns the settlement rows once both sides have confirmed the same contents and all checks pass.
  // The caller passes the rows to one settle() call, so the trade is all or nothing.
  confirm(who: Id): Row[] | null {
    if (!this.open) return null;
    this.offers[who].confirmed = true;
    if (!this.offers[this.other(who)].confirmed) return null; // wait for the other side

    if (!this.checkAll()) {       // fail closed: any failed check ends the whole trade
      this.abort();
      return null;
    }
    return this.rows();
  }

  abort(): void {
    this.open = false;
  }

  private checkAll(): boolean {
    if (!this.checks.inRange(this.a, this.b)) return false;
    for (const who of [this.a, this.b]) {
      const o = this.offers[who];
      if (o.coins > this.checks.balance(who)) return false;
      for (const item of o.items) {
        if (!this.checks.tradable(item) || !this.checks.holdsItem(who, item)) return false;
      }
    }
    if (!this.checks.roomFor(this.b, this.offers[this.a].items)) return false;
    if (!this.checks.roomFor(this.a, this.offers[this.b].items)) return false;
    return true;
  }

  private rows(): Row[] {
    const out: Row[] = [];
    for (const [from, to] of [[this.a, this.b], [this.b, this.a]] as const) {
      const o = this.offers[from];
      for (const item of o.items) out.push({ kind: "item", tradeId: this.tradeId, item, from, to });
      if (o.coins > 0) out.push({ kind: "coins", tradeId: this.tradeId, amount: o.coins, from, to });
    }
    return out;
  }
}

export {};
