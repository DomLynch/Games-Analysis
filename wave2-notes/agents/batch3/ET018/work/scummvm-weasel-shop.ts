// clean-room sketch of the donor's rules (GPL-3.0-or-later donor). Written from the described mechanism, not a translation.
interface Entry {
  shape: number;   // item id bought
  cost: number;    // catalogue cost (weasel.dat, not read)
}

interface Wallet {
  balance: number; // server-owned in Frankendom; the donor keeps it as an item quality
}

class Cart {
  private entries: Entry[] = [];
  private shown: number;

  constructor(private readonly wallet: Wallet) {
    this.shown = wallet.balance;   // read once at open, as the donor does (weasel_gump.cpp:187-189)
  }

  get credits(): number {
    return this.shown;
  }

  // Strict rule from the donor: a buy must leave the balance above zero (weasel_gump.cpp:371).
  add(e: Entry): boolean {
    if (!(e.cost < this.shown)) return false;
    this.entries.push(e);
    this.shown -= e.cost;
    return true;
  }

  // Abort gives the reserved credits back. The donor clears the cart but does not restore the balance.
  abort(): void {
    for (const e of this.entries) this.shown += e.cost;
    this.entries = [];
  }

  // Commit re-checks the whole cart against the wallet in one step, then writes the wallet once.
  commit(): { ok: true; balance: number; items: number[] } | { ok: false } {
    const total = this.entries.reduce((a, e) => a + e.cost, 0);
    if (!(total < this.wallet.balance)) return { ok: false };
    this.wallet.balance -= total;
    const items = this.entries.map((e) => e.shape);
    this.entries = [];
    return { ok: true, balance: this.wallet.balance, items };
  }
}

export {};
