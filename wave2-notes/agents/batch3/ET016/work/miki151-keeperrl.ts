// Licence: GPL-2.0 (donor; repo LICENSE and COPYING.txt are GPL Version 2, June 1991). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Cost { id: string; value: number; }
interface QueuedItem {
  name: string;
  cost: Cost;
  minSkill: number;
  workNeeded: number;
  paid: boolean;
  progress: number;
}

// One ledger of stock per resource. Debt is kept separately so a queued craft can be shown as a claim.
class Stock {
  private amount = new Map<string, number>();
  get(id: string): number { return this.amount.get(id) ?? 0; }
  has(c: Cost): boolean { return this.get(c.id) >= c.value; }
  take(c: Cost): void {
    if (!this.has(c)) throw new Error("not enough " + c.id);
    this.amount.set(c.id, this.get(c.id) - c.value);
  }
  give(c: Cost): void { this.amount.set(c.id, this.get(c.id) + c.value); }
}

class Workshop {
  private queue: QueuedItem[] = [];
  private debt = new Map<string, number>(); // cost of queued items not yet paid, per resource
  constructor(private stock: Stock, private readonly prodMult = 0.15) {}

  private addDebt(c: Cost, delta: number): void {
    const d = (this.debt.get(c.id) ?? 0) + delta;
    if (d < 0) throw new Error("debt below zero for " + c.id);
    this.debt.set(c.id, d);
  }

  totalDebt(id: string): number { return this.debt.get(id) ?? 0; }

  enqueue(item: Omit<QueuedItem, "paid" | "progress">, at = this.queue.length): void {
    this.addDebt(item.cost, item.cost.value);
    this.queue.splice(at, 0, { ...item, paid: false, progress: 0 });
    this.payAffordable();
  }

  // Pays every unpaid item the stock covers, in queue order. Not strictly first-in-first-out:
  // a cheaper later item can be paid while an earlier one still waits.
  payAffordable(): void {
    for (const q of this.queue) {
      if (!q.paid && this.stock.has(q.cost)) {
        this.stock.take(q.cost);
        this.addDebt(q.cost, -q.cost.value);
        q.paid = true;
      }
    }
  }

  // Refund rule: an unpaid item releases its debt; a paid item with no progress gets its cost back;
  // a paid item with progress is not refunded.
  unqueue(index: number): void {
    const q = this.queue[index];
    if (q.paid) {
      if (q.progress === 0) this.stock.give(q.cost);
    } else {
      this.addDebt(q.cost, -q.cost.value);
    }
    this.queue.splice(index, 1);
    this.payAffordable();
  }

  // One work call. The first item in queue order that is paid or affordable, and whose minimum skill
  // is met, takes all the work. Returns the finished item's name, or null.
  work(amount: number, skill: number): string | null {
    for (let i = 0; i < this.queue.length; i++) {
      const q = this.queue[i];
      const ready = (q.paid || this.stock.has(q.cost)) && skill >= q.minSkill;
      if (!ready) continue;
      if (!q.paid) {
        this.stock.take(q.cost);
        this.addDebt(q.cost, -q.cost.value);
        q.paid = true;
      }
      q.progress += amount * this.prodMult / q.workNeeded;
      if (q.progress >= 1) {
        this.queue.splice(i, 1);
        return q.name;
      }
      return null;
    }
    return null;
  }
}

export {};
