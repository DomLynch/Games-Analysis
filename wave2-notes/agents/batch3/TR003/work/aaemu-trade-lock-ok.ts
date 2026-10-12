// Licence: README says LGPL-3.0; LICENSE.GPL is GPL-3.0; LICENSE.MIT is MIT. Unclear, so clean-room sketch from the described mechanism only.
type Role = "owner" | "target";

interface Stack { itemId: number; count: number; }

interface Side {
  stacks: Stack[];   // stacks offered, by reference to the owner's bag until settle
  money: number;
  locked: boolean;
  ok: boolean;
}

interface Hooks {
  hasStack(who: Role, stack: Stack): boolean;  // stack still in who's bag with at least count
  tradable(itemId: number): boolean;           // not bind-on-pickup (donor has no such check)
  money(who: Role): number;                    // cash on hand
  freeSlots(who: Role): number;                // free bag slots
  inRange(): boolean;                          // both players close enough (donor has no range check)
}

type Row =
  | { kind: "item"; itemId: number; count: number; from: Role; to: Role }
  | { kind: "money"; amount: number; from: Role; to: Role };

export class TradeWindow {
  private readonly sides: Record<Role, Side> = {
    owner: { stacks: [], money: 0, locked: false, ok: false },
    target: { stacks: [], money: 0, locked: false, ok: false },
  };
  private open = true;

  constructor(private readonly hooks: Hooks) {}

  private other(who: Role): Role {
    return who === "owner" ? "target" : "owner";
  }

  // Fix: every change clears BOTH locks and BOTH ok flags, whatever the lock state.
  // The donor returns early when no lock is held, so its ok flags survive edits.
  private changed(): void {
    for (const who of ["owner", "target"] as const) {
      this.sides[who].locked = false;
      this.sides[who].ok = false;
    }
  }

  addItem(who: Role, stack: Stack): boolean {
    if (!this.open || !this.hooks.tradable(stack.itemId) || !this.hooks.hasStack(who, stack)) return false;
    this.sides[who].stacks.push({ ...stack });
    this.changed();
    return true;
  }

  // Remove by id; never clear the whole offer (the donor clears it when one item or fewer is left).
  removeItem(who: Role, itemId: number): boolean {
    if (!this.open) return false;
    const s = this.sides[who];
    const before = s.stacks.length;
    s.stacks = s.stacks.filter((x) => x.itemId !== itemId);
    if (s.stacks.length === before) return false;
    this.changed();
    return true;
  }

  setMoney(who: Role, amount: number): boolean {
    if (!this.open || amount < 0 || amount > this.hooks.money(who)) return false;
    this.sides[who].money = amount;
    this.changed();
    return true;
  }

  // Lock. Unlocking also clears that side's ok (the donor's unlock branch leaves ok set).
  lock(who: Role, on: boolean): void {
    if (!this.open) return;
    this.sides[who].locked = on;
    if (!on) this.sides[who].ok = false;
  }

  // Ok is accepted only when both sides are locked (the donor accepts with either lock).
  // Returns the settlement rows when both have ok'd and every check passes, else null.
  confirm(who: Role): Row[] | null {
    if (!this.open) return null;
    if (!this.sides.owner.locked || !this.sides.target.locked) return null;
    this.sides[who].ok = true;
    if (!(this.sides.owner.ok && this.sides.target.ok)) return null;

    if (!this.checkAll()) {        // fail closed; no return path leaves a half-finished trade
      this.open = false;
      return null;
    }
    this.open = false;
    return this.rows();
  }

  private checkAll(): boolean {
    if (!this.hooks.inRange()) return false;
    for (const who of ["owner", "target"] as const) {
      const s = this.sides[who];
      if (s.money > this.hooks.money(who)) return false;
      for (const st of s.stacks) {
        if (!this.hooks.hasStack(who, st)) return false;
      }
    }
    if (this.hooks.freeSlots("target") < this.sides.owner.stacks.length) return false;
    if (this.hooks.freeSlots("owner") < this.sides.target.stacks.length) return false;
    return true;
  }

  // The caller passes all rows to one atomic settle(); if any row fails, the whole trade rolls back.
  private rows(): Row[] {
    const out: Row[] = [];
    for (const from of ["owner", "target"] as const) {
      const to = this.other(from);
      for (const st of this.sides[from].stacks) {
        out.push({ kind: "item", itemId: st.itemId, count: st.count, from, to });
      }
      if (this.sides[from].money > 0) {
        out.push({ kind: "money", amount: this.sides[from].money, from, to });
      }
    }
    return out;
  }
}

export {};
