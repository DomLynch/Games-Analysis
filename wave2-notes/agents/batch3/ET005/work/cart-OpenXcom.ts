// Licence: GPL-3.0-or-later (donor, OpenXcom). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Row {
  id: string;
  pool: string;          // capacity pool this row uses (for example personnel, craft, store)
  cost: number;          // price per unit
  slots: number;         // capacity used per unit (0 = no capacity check)
  transferTime: number;  // delivery delay in days after commit
  amount: number;        // units in the cart
}

class Cart {
  total = 0;             // cart cost, kept in step with every add and remove
  private used = new Map<string, number>();

  constructor(private balance: number, private free: Map<string, number>) {}

  private usedIn(pool: string): number { return this.used.get(pool) ?? 0; }
  private freeIn(pool: string): number { return this.free.get(pool) ?? 0; }

  // Add up to `want` units. Funds and capacity are checked here, before the commit.
  add(row: Row, want: number): { added: number; error?: 'funds' | 'space' } {
    if (this.total + row.cost > this.balance) return { added: 0, error: 'funds' };
    if (row.slots > 0 && this.usedIn(row.pool) + row.slots > this.freeIn(row.pool)) return { added: 0, error: 'space' };
    const byMoney = row.cost > 0 ? Math.floor((this.balance - this.total) / row.cost) : want;
    const bySpace = row.slots > 0 ? Math.floor((this.freeIn(row.pool) - this.usedIn(row.pool)) / row.slots) : want;
    const n = Math.max(0, Math.min(want, byMoney, bySpace));
    row.amount += n;
    this.total += row.cost * n;
    this.used.set(row.pool, this.usedIn(row.pool) + row.slots * n);
    return { added: n };
  }

  remove(row: Row, n: number): void {
    const k = Math.min(n, row.amount);
    row.amount -= k;
    this.total -= row.cost * k;
    this.used.set(row.pool, this.usedIn(row.pool) - row.slots * k);
  }

  // Commit: re-check the funds against the current balance, then one balance write and one delivery entry per row.
  commit(rows: Row[], balance: number): { balance: number; deliveries: { id: string; units: number; day: number }[] } | 'funds' {
    const total = rows.reduce((s, r) => s + r.cost * r.amount, 0);
    if (total > balance) return 'funds';   // re-checked at commit; the donor does not do this here
    return {
      balance: balance - total,            // one balance write
      deliveries: rows.filter(r => r.amount > 0).map(r => ({ id: r.id, units: r.amount, day: r.transferTime })),
    };
  }
}

export {};
