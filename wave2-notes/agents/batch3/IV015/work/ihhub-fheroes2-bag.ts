// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Item {
  id: string;
  value: number;     // used only to order exchanges and loot
  isBook: boolean;   // spell book: pinned to slot 0, never traded
  ultimate: boolean; // ultimate items never leave a loser
}

export type Slot = Item | null;

export const BAG_CAPACITY = 14;

export interface SetDef {
  result: Item;
  parts: string[];
}

export class Bag {
  readonly slots: Slot[];

  constructor(capacity: number = BAG_CAPACITY) {
    this.slots = new Array<Slot>(capacity).fill(null);
  }

  isFull(): boolean {
    return this.slots.every((s) => s !== null);
  }

  // Normal items take the first empty slot. A spell book shifts the slots before the first empty one right and takes slot 0.
  push(item: Item): boolean {
    if (item.isBook && this.slots.some((s) => s !== null && s.isBook)) return false;
    const empty = this.slots.indexOf(null);
    if (empty === -1) return false;
    if (!item.isBook) {
      this.slots[empty] = item;
      return true;
    }
    this.slots.splice(empty, 1);
    this.slots.unshift(item);
    return true;
  }

  // Removes the first copy of an id.
  remove(id: string): void {
    const i = this.slots.findIndex((s) => s !== null && s.id === id);
    if (i !== -1) this.slots[i] = null;
  }

  // Replaces every complete set with its result. The result always fits because the parts were just removed.
  assemble(sets: SetDef[]): string[] {
    const made: string[] = [];
    for (const set of sets) {
      while (set.parts.every((p) => this.slots.some((s) => s !== null && s.id === p))) {
        for (const p of set.parts) this.remove(p);
        this.push(set.result);
        made.push(set.result.id);
      }
    }
    return made;
  }
}

export type LootOutcome = { kind: "item"; item: Item } | { kind: "gold"; gold: number };

// Decide once, with the bag as it is now: a full bag turns the find into gold.
// Caller order: show the reveal, then on OK call push() or add the gold.
export function resolveLoot(bag: Bag, item: Item, goldInstead: number): LootOutcome {
  return bag.isFull() ? { kind: "gold", gold: goldInstead } : { kind: "item", item };
}

// Won fight: free winner slots bound the plan. Normal items move in loser order. Ultimates stay with the loser and use no winner slot.
// Unplanned items stay with the loser.
export function planLoot(winnerFree: number, loser: Slot[]): { moved: Item[] } {
  let free = winnerFree;
  const moved: Item[] = [];
  for (const s of loser) {
    if (free === 0) break;
    if (s === null || s.isBook || s.ultimate) continue;
    moved.push(s);
    free -= 1;
  }
  return { moved };
}

// Two-hero exchange: the pool is lifted out first, then dealt back. The taker takes the best until one slot is spare.
export function dealExchange(taker: Bag, giver: Bag, pool: Item[]): Item[] {
  const sorted = [...pool].sort((a, b) => a.value - b.value); // lowest first, best from the end
  for (let i = 1; i < taker.slots.length && sorted.length > 0; i++) {
    if (!taker.push(sorted[sorted.length - 1])) break;
    sorted.pop();
  }
  while (sorted.length > 0 && giver.push(sorted[sorted.length - 1])) {
    sorted.pop();
  }
  return sorted; // not empty means the pool did not fit
}
export {};
