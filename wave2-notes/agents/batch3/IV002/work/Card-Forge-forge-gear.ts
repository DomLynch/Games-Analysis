// Licence: GPL-3.0 (donor). Clean-room sketch from the described mechanism, not a translation of the donor lines.
// clean-room
type Slot = string; // e.g. "Body", "Boots", "Neck", "Ability1"

// One entry per item instance. Each copy gets its own id; nothing stacks.
interface Item { id: number; name: string; slot: Slot | null; equipped: boolean; cracked: boolean; }

const EASY_SLOTS = new Set<Slot>(["Boots", "Body", "Neck"]);

class Gear {
  readonly items: Item[] = [];
  readonly worn = new Map<Slot, number>();          // the paper doll: slot -> item id
  private readonly loadouts = new Map<number, Map<Slot, number>>(); // deck index -> doll
  private nextId = 1;

  add(name: string, slot: Slot | null): Item {
    const it: Item = { id: this.nextId++, name, slot, equipped: false, cracked: false };
    this.items.push(it);
    return it;
  }

  byId(id: number): Item | undefined { return this.items.find(i => i.id === id); }

  // Toggle: the item already in its slot comes off; otherwise it goes on and replaces what was there.
  // Cracked items cannot be worn (the donor's UI disables the button; this sketch checks in the engine).
  equip(item: Item): void {
    if (item.slot === null || item.cracked) return;
    const current = this.worn.get(item.slot);
    if (current === item.id) {
      this.unwear(item);
    } else {
      const displaced = current === undefined ? undefined : this.byId(current);
      if (displaced) displaced.equipped = false; // the donor leaves this flag set
      item.equipped = true;
      this.worn.set(item.slot, item.id);
    }
  }

  private unwear(item: Item): void {
    item.equipped = false;
    for (const [slot, id] of this.worn) if (id === item.id) this.worn.delete(slot);
  }

  // Removing an instance also takes it off the doll.
  remove(item: Item): void {
    const at = this.items.indexOf(item);
    if (at >= 0) this.items.splice(at, 1);
    this.unwear(item);
  }

  // Deck switch with bound loadouts: save the doll for the old deck, clear, restore by id.
  // Returns the saved ids that are no longer in the bag, so the caller can log them.
  switchLoadout(from: number, to: number): number[] {
    this.loadouts.set(from, new Map(this.worn));
    for (const it of this.items) it.equipped = false;
    this.worn.clear();
    const missing: number[] = [];
    const saved = this.loadouts.get(to);
    if (!saved) return missing;
    for (const [slot, id] of saved) {
      const it = this.byId(id);
      if (it) { it.equipped = true; this.worn.set(slot, id); } else { missing.push(id); }
    }
    return missing;
  }
}

// Defeat: one random worn piece is cracked and taken off. Easy and normal roll only Boots, Body and Neck.
function crackOnDefeat(g: Gear, hardOrInsane: boolean, disabled: boolean, rand: () => number): Item | null {
  if (disabled) return null;
  const candidates: Item[] = [];
  for (const [slot, id] of g.worn) {
    const it = g.byId(id);
    if (it && (hardOrInsane || EASY_SLOTS.has(slot))) candidates.push(it);
  }
  if (candidates.length === 0) return null;
  const pick = candidates[Math.floor(rand() * candidates.length)];
  pick.cracked = true;
  g.equip(pick); // item is in its own slot, so this toggles it off
  return pick;
}

export {};
