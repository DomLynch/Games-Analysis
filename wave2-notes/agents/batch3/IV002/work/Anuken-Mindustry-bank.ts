// Licence: GPL-3.0 (donor). Clean-room sketch from the described mechanism, not a translation of the donor lines.
// clean-room
type Item = string;

// One storage slot: the core itself, or a container that can be linked to it.
interface Slot { id: string; cap: number; }

// Shared ledger: one object, referenced by the core and by every linked container.
class Ledger {
  private readonly items = new Map<Item, number>();
  constructor(public cap: number) {} // cap applies to each item kind separately, not to a total

  have(item: Item): number { return this.items.get(item) ?? 0; }

  // Deposit side: accept only what fits under the per-item cap.
  accepts(item: Item, amount: number): number {
    return Math.max(0, Math.min(this.cap - this.have(item), amount));
  }

  add(item: Item, amount: number): void { this.items.set(item, this.have(item) + amount); }

  remove(item: Item, amount: number): number {
    const r = Math.min(Math.max(0, amount), this.have(item));
    this.items.set(item, this.have(item) - r);
    return r;
  }

  // Re-link: every item is clamped to the new cap, and the excess is lost.
  setCap(cap: number): void {
    this.cap = cap;
    for (const [item, n] of this.items) this.items.set(item, Math.min(n, cap));
  }

  entries(): [Item, number][] { return [...this.items.entries()]; }
}

// A bank is a core plus the containers linked to it. Linked containers share the core's ledger.
class Bank {
  readonly ledger: Ledger;
  readonly linked: Slot[] = [];
  constructor(readonly core: Slot) { this.ledger = new Ledger(core.cap); }

  // Cap = core cap + sum of linked caps.
  private recalc(): void {
    this.ledger.setCap(this.core.cap + this.linked.reduce((s, x) => s + x.cap, 0));
  }

  link(slot: Slot): void {
    this.linked.push(slot);
    this.recalc();
  }

  // Core removed: each linked slot gets a share of every item in proportion to its cap, clamped to its own cap.
  dissolve(): Map<string, Map<Item, number>> {
    const total = this.linked.reduce((s, x) => s + x.cap, 0);
    const out = new Map<string, Map<Item, number>>();
    for (const slot of this.linked) {
      const share = new Map<Item, number>();
      for (const [item, n] of this.ledger.entries()) {
        share.set(item, total > 0 ? Math.min(slot.cap, Math.floor((n * slot.cap) / total)) : 0);
      }
      out.set(slot.id, share);
    }
    this.linked.length = 0;
    return out;
  }
}

// Carrier: one stack, one item kind, with a cap set by the carrier's size.
interface Carrier { cap: number; item: Item; amount: number; }

// Free room for this item: 0 if the carrier holds a different item, else cap minus what it holds.
function maxAccepted(c: Carrier, item: Item): number {
  return c.item !== item && c.amount > 0 ? 0 : c.cap - c.amount;
}

interface Request { inRange: boolean; alive: boolean; }

// Withdraw: validated, clamped to what the carrier can hold, then moved. One call, one server tick.
function requestWithdraw(bank: Bank, c: Carrier, item: Item, want: number, req: Request): number {
  if (!req.inRange || !req.alive || want <= 0) return 0;
  const removed = bank.ledger.remove(item, Math.min(maxAccepted(c, item), want));
  if (removed === 0) return 0;
  c.item = item;
  c.amount += removed;
  return removed;
}

// Deposit: the bank takes only what fits under its cap; the carrier keeps the rest.
function requestDeposit(bank: Bank, c: Carrier, req: Request, depositAllowed: boolean): number {
  if (!req.inRange || !req.alive || !depositAllowed || c.amount <= 0) return 0;
  const accepted = bank.ledger.accepts(c.item, c.amount);
  bank.ledger.add(c.item, accepted);
  c.amount -= accepted;
  return accepted;
}

export {};
