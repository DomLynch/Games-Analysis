// Shape of a capped, type-sorted item list where ammo folds into an owned weapon at a clip ratio (BSD-2 donor; re-expressed, not copied).
const INV_MAX_ITEMS = 32; // donor inventory.h:9
const UNLIMITED_AMMO = 10000; // donor controller.h:14

interface Item { type: number; count: number; } // type is a sortable id; count is in rounds

class Inventory {
  private items: Item[] = [];

  // ratio: rounds per ammo box for each weapon (donor: pistols 10, shotgun 2, magnums 25, uzis 50)
  constructor(private ratio: Map<number, number>, private ammoOf: Map<number, number>) {}

  private find(type: number): number {
    return this.items.findIndex((it) => it.type === type);
  }

  // Add a pickup. Folds ammo into a held weapon (donor addAmmo, inventory.h:756-758).
  add(type: number, count = 1): void {
    const weapon = this.ammoOf.get(type);
    if (weapon !== undefined) {
      // type is an ammo box: if the weapon is held, convert boxes to rounds in the weapon item
      if (this.find(weapon) >= 0) {
        type = weapon;
        count *= this.ratio.get(weapon) ?? 1;
      }
    } else {
      // weapon pickup: count in boxes, and absorb any loose ammo of its type (donor inventory.h:749-753)
      const ammoType = [...this.ammoOf.entries()].find(([, w]) => w === type)?.[0];
      if (ammoType !== undefined) {
        const ai = this.find(ammoType);
        if (ai >= 0) {
          count = count * (this.ratio.get(type) ?? 1) + this.items[ai].count * (this.ratio.get(type) ?? 1);
          this.items.splice(ai, 1);
        } else {
          count *= this.ratio.get(type) ?? 1;
        }
      }
    }

    const i = this.find(type);
    if (i >= 0) {
      this.items[i].count = Math.min(UNLIMITED_AMMO, this.items[i].count + count);
      return;
    }
    if (this.items.length >= INV_MAX_ITEMS) return; // donor: ASSERT(itemsCount < INV_MAX_ITEMS)
    let pos = 0;
    while (pos < this.items.length && this.items[pos].type < type) pos++; // sorted insert by type
    this.items.splice(pos, 0, { type, count: Math.min(UNLIMITED_AMMO, count) });
  }

  // donor remove(type, count): decrement, drop the entry at zero or below
  remove(type: number, count = 1): void {
    const i = this.find(type);
    if (i < 0) return;
    this.items[i].count -= count;
    if (this.items[i].count <= 0) this.items.splice(i, 1);
  }

  list(): readonly Item[] { return this.items; }
}

export {};
