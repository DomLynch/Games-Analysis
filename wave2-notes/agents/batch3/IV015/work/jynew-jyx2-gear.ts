// Licence: restricted (donor: custom '金庸群侠传3D重制版 License' forbids use of code or resources without authorization). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Slot = "weapon" | "armor";
export type StatKey = "attack" | "defence" | "qinggong" | "anqi" | "maxHp" | "poison";
export type Bonus = Partial<Record<StatKey, number>>;

export interface Gear {
  id: string;
  bonus: Bonus;                          // catalogue fields, applied on equip
  requires: Partial<Record<StatKey, number>>; // minimum base stat (without the current gear)
}

export interface Wearer {
  id: number;
  stats: Record<StatKey, number>;        // totals: base plus the equipment bonus
  worn: Partial<Record<Slot, { gearId: string; applied: Bonus }>>;
}

export type Caps = Partial<Record<StatKey, { min: number; max: number }>>;
export type Owners = Map<string, Wearer>; // one wearer per gear

export function equipBonus(w: Wearer, key: StatKey): number {
  let sum = 0;
  for (const slot of Object.values(w.worn)) {
    if (slot) sum += slot.applied[key] ?? 0;
  }
  return sum;
}

// Caps the base only; equipment stays on top. Base below min is always clamped (the donor skips this when equipment is 0).
export function capTotal(total: number, equip: number, min: number, max: number): number {
  const base = total - equip;
  if (base > max) return max + equip;
  if (base < min) return min + equip;
  return total;
}

function recap(w: Wearer, caps: Caps): void {
  for (const key of Object.keys(caps) as StatKey[]) {
    const c = caps[key];
    if (!c) continue;
    w.stats[key] = capTotal(w.stats[key], equipBonus(w, key), c.min, c.max);
  }
}

// Requirements are checked against the base stat, so gear does not block its own swap.
export function canWear(w: Wearer, gear: Gear): boolean {
  for (const key of Object.keys(gear.requires) as StatKey[]) {
    const need = gear.requires[key] ?? 0;
    if (w.stats[key] - equipBonus(w, key) < need) return false;
  }
  return true;
}

// Reverts exactly what was applied (the stored snapshot), never a recomputed amount.
export function unequip(w: Wearer, slot: Slot, caps: Caps, owners: Owners): void {
  const cur = w.worn[slot];
  if (!cur) return;
  for (const key of Object.keys(cur.applied) as StatKey[]) {
    w.stats[key] -= cur.applied[key] ?? 0;
  }
  owners.delete(cur.gearId);
  delete w.worn[slot];
  recap(w, caps);
}

// One wearer per gear: if another wearer has it, that wearer takes it off first.
export function equip(to: Wearer, slot: Slot, gear: Gear, caps: Caps, owners: Owners): boolean {
  if (!canWear(to, gear)) return false;
  const prev = owners.get(gear.id);
  if (prev === to) return false; // already worn by this wearer (donor returns early here too)
  if (prev) {
    const prevSlot = (Object.keys(prev.worn) as Slot[]).find((s) => prev.worn[s]?.gearId === gear.id);
    if (prevSlot) unequip(prev, prevSlot, caps, owners);
  }
  unequip(to, slot, caps, owners);
  const applied: Bonus = { ...gear.bonus };
  for (const key of Object.keys(applied) as StatKey[]) {
    to.stats[key] += applied[key] ?? 0;
  }
  to.worn[slot] = { gearId: gear.id, applied };
  owners.set(gear.id, to);
  recap(to, caps);
  return true;
}

// Shared bag: counts per item id. A negative result is refused, and a zero count removes the entry.
export function addStack(bag: Map<string, number>, id: string, n: number): boolean {
  const have = bag.get(id) ?? 0;
  if (have + n < 0) return false;
  if (have + n === 0) bag.delete(id);
  else bag.set(id, have + n);
  return true;
}
export {};
