// Clean-room shape of a two-zone inventory (equip array + sparse bag),
// written from the shape of the donor's placement and cursor logic.
// Fixes marked "fix:" are changes to the donor's defects.

export const EQUIP_SLOT_COUNT = 18; // engine constant: fixed number of equip slots

export interface Stack {
  readonly baseType: string;
  count: number;
  readonly maxStack: number; // from the item table (data, not zone data)
}

export class Inventory {
  // Equip zone is always allocated at full length (fix: donor only sizes it when the save has an equip list).
  private readonly equipped: (Stack | null)[] = new Array<Stack | null>(EQUIP_SLOT_COUNT).fill(null);
  // Bag zone is sparse by index; holes are null.
  private readonly bag: (Stack | null)[] = [];
  // Flat cursor: 0..17 equip, 18.. bag. -1 means "at end".
  private cursor = -1;

  // fix: bounds check instead of indexing past the end.
  getItemInSlot(slot: number): Stack | null {
    if (!Number.isInteger(slot) || slot < 0 || slot >= EQUIP_SLOT_COUNT) return null;
    return this.equipped[slot];
  }

  // Bag placement: preferred index if free; otherwise lowest free index; otherwise append.
  placeInBag(item: Stack, preferred = 0): number {
    let slot = preferred;
    if (slot < this.bag.length && this.bag[slot] !== null) {
      const free = this.bag.indexOf(null);
      slot = free !== -1 ? free : this.bag.length;
    }
    while (this.bag.length <= slot) this.bag.push(null);
    this.bag[slot] = item;
    return slot;
  }

  // Load an equipped item. Taken or invalid slot: the item goes to the bag, it is never dropped.
  // fix: donor throws on an unknown slot flag; here the item is kept in the bag and a warning is returned.
  loadEquipped(slot: number, item: Stack): { zone: 'equip' | 'bag'; index: number; warning?: string } {
    if (Number.isInteger(slot) && slot >= 0 && slot < EQUIP_SLOT_COUNT && this.equipped[slot] === null) {
      this.equipped[slot] = item;
      return { zone: 'equip', index: slot };
    }
    const index = this.placeInBag(item);
    return { zone: 'bag', index, warning: 'equip slot taken or unknown' };
  }

  // Stack setter: clamps to the item max and REPORTS the overflow.
  // fix: donor clamps silently, so a caller cannot tell a count was lost.
  // Zero is refused and leaves the count unchanged (as in the donor).
  setStackSize(stack: Stack, requested: number): { overflow: number } {
    if (requested <= 0) return { overflow: 0 };
    const count = Math.min(requested, stack.maxStack);
    stack.count = count;
    return { overflow: requested - count };
  }

  // Flat cursor over equip then bag, skipping empty slots.
  private flatLength(): number {
    return EQUIP_SLOT_COUNT + this.bag.length;
  }

  private at(flat: number): Stack | null {
    return flat < EQUIP_SLOT_COUNT ? this.equipped[flat] : this.bag[flat - EQUIP_SLOT_COUNT];
  }

  private scanFrom(start: number): Stack | null {
    for (let i = start; i < this.flatLength(); i++) {
      const s = this.at(i);
      if (s !== null) {
        this.cursor = i;
        return s;
      }
    }
    this.cursor = -1;
    return null;
  }

  first(): Stack | null {
    return this.scanFrom(0);
  }

  next(): Stack | null {
    return this.cursor < 0 ? null : this.scanFrom(this.cursor + 1);
  }
}

export {};
