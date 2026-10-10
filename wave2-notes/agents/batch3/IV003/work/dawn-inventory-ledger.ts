// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type SlotId = number;

interface Item {
  slot: SlotId;
  templateId: string;
  name: string;
  count: number;
  maxCount: number;
  stackable: boolean;
}

interface Template {
  templateId: string;
  name: string;
  maxCount: number;
  stackable: boolean;
}

// Returns null when the item may sit in the slot, or a reason string when it may not.
type Placement = (item: Item, slot: SlotId) => string | null;

class Ledger {
  readonly items = new Map<SlotId, Item>();
  private pending = new Set<SlotId>();
  private depth = 0;
  flushes = 0; // one UI flush per outermost batch

  constructor(readonly min: SlotId, readonly max: SlotId) {}

  private touch(slot: SlotId): void {
    this.pending.add(slot);
    if (this.depth === 0) this.flush();
  }

  private flush(): void {
    if (this.pending.size > 0) {
      this.flushes++;
      this.pending.clear();
    }
  }

  begin(): void {
    this.depth++;
  }

  commit(): void {
    this.depth--;
    if (this.depth === 0) this.flush();
  }

  // Plan first, mutate only when the whole count fits. Pass 1 tops up matching stacks,
  // pass 2 opens empty slots (one full stack each). Nothing changes on failure.
  addTemplate(tpl: Template, want: number, lo: SlotId = this.min, hi: SlotId = this.max): boolean {
    if (want <= 0 || lo < this.min || hi > this.max) return false;
    if (lo > hi) [lo, hi] = [hi, lo];

    const plan = new Map<SlotId, number>(); // positive = add to stack, negative = new stack of that size
    let left = want;

    for (let s = lo; s <= hi && left > 0; s++) {
      const it = this.items.get(s);
      if (!it || it.templateId !== tpl.templateId || it.count >= it.maxCount) continue;
      const add = Math.min(left, it.maxCount - it.count);
      plan.set(s, add);
      left -= add;
    }

    for (let s = lo; s <= hi && left > 0; s++) {
      if (this.items.has(s) || plan.has(s)) continue;
      const add = Math.min(left, tpl.maxCount);
      plan.set(s, -add);
      left -= add;
    }

    if (left > 0) return false; // all or nothing: the ledger was not touched

    this.begin();
    try {
      for (const [s, n] of plan) {
        if (n > 0) {
          const it = this.items.get(s);
          if (it) it.count += n;
        } else {
          this.items.set(s, { slot: s, templateId: tpl.templateId, name: tpl.name, count: -n, maxCount: tpl.maxCount, stackable: tpl.stackable });
        }
        this.touch(s);
      }
    } finally {
      this.commit();
    }
    return true;
  }

  // Check the whole plan first, then apply it inside one batch.
  removeTemplate(templateId: string, want: number, lo: SlotId = this.min, hi: SlotId = this.max): boolean {
    if (want <= 0 || lo < this.min || hi > this.max) return false;
    if (lo > hi) [lo, hi] = [hi, lo];

    const plan: Array<{ slot: SlotId; take: number }> = [];
    let left = want;
    for (let s = lo; s <= hi && left > 0; s++) {
      const it = this.items.get(s);
      if (!it || it.templateId !== templateId) continue;
      const take = Math.min(left, it.count);
      plan.push({ slot: s, take });
      left -= take;
    }
    if (left > 0) return false;

    this.begin();
    try {
      for (const p of plan) {
        const it = this.items.get(p.slot);
        if (!it) continue;
        if (p.take === it.count) this.items.delete(p.slot);
        else it.count -= p.take;
        this.touch(p.slot);
      }
    } finally {
      this.commit();
    }
    return true;
  }

  // Move order: validate both ways, then stack-split or merge, otherwise swap.
  // requested = 0 means the whole stack. Returns null on success or a reason string.
  move(from: SlotId, to: SlotId, requested: number, placement: Placement): string | null {
    if (from === to) return "same slot";
    const a = this.items.get(from);
    if (!a) return "nothing to move";
    const b = this.items.get(to);

    const gate = placement(a, to) ?? (b ? placement(b, from) : null);
    if (gate) return gate;

    const n = requested > 0 ? Math.min(requested, a.count) : a.count;

    this.begin();
    try {
      if (b && b.stackable && b.templateId === a.templateId) {
        // simplified: the donor merges the whole source stack here; this sketch merges only the requested count.
        const put = Math.min(n, b.maxCount - b.count);
        if (put === 0) return "target stack is full";
        b.count += put;
        a.count -= put;
        if (a.count === 0) this.items.delete(from);
        this.touch(to);
        this.touch(from);
      } else if (!b && n < a.count) {
        this.items.set(to, { ...a, slot: to, count: n });
        a.count -= n;
        this.touch(to);
        this.touch(from);
      } else {
        this.items.delete(from);
        this.items.delete(to);
        if (b) {
          b.slot = from;
          this.items.set(from, b);
        }
        a.slot = to;
        this.items.set(to, a);
        this.touch(from);
        this.touch(to);
      }
    } finally {
      this.commit();
    }
    return null;
  }
}

export {};
