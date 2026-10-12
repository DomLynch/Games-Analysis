// Equipment slots as in BackpackModel.equipment (Model/Backpack.js:15-32)
export const SLOT = {
  underwear: 0, earr: 1, earl: 2, neck: 3, fr: 4, fl: 5, head: 6, weapon: 7, shield: 8,
  hands: 9, chest: 10, pants: 11, feet: 12, cloak: 13, dual: 14, armor: 15,
} as const;
export type Slot = (typeof SLOT)[keyof typeof SLOT];

export interface Gear { id: number; selfId: number; slot: Slot; equipped: boolean }

// Slots that must be cleared before `slot` can take an item (Backpack.js:1465-1481)
function conflicts(slot: Slot): Slot[] {
  if (slot === SLOT.weapon || slot === SLOT.shield) return [SLOT.dual];
  if (slot === SLOT.dual) return [SLOT.weapon, SLOT.shield];
  if (slot === SLOT.chest || slot === SLOT.pants) return [SLOT.armor];
  if (slot === SLOT.armor) return [SLOT.chest, SLOT.pants];
  return [];
}

// Ear and fin pairs: take the free twin when the requested one is occupied (Backpack.js:1482-1495)
const TWIN: Partial<Record<Slot, Slot>> = {
  [SLOT.earr]: SLOT.earl, [SLOT.earl]: SLOT.earr, [SLOT.fr]: SLOT.fl, [SLOT.fl]: SLOT.fr,
};

export function equip(paperdoll: Map<Slot, Gear>, item: Gear): Slot {
  let target = item.slot;
  const twin = TWIN[target];
  if (twin !== undefined && paperdoll.has(target) && !paperdoll.has(twin)) target = twin;
  for (const c of conflicts(target)) unequip(paperdoll, c);
  unequip(paperdoll, target); // replace whatever sits in the chosen slot
  item.slot = target;
  item.equipped = true;
  paperdoll.set(target, item);
  return target;
}

export function unequip(paperdoll: Map<Slot, Gear>, slot: Slot): void {
  const g = paperdoll.get(slot);
  if (!g) return;
  g.equipped = false;
  paperdoll.delete(slot);
}

// Bank: all-or-nothing batch (donor validates all lines, then commits line by line with one DB transaction each)
export interface Row { id: number; selfId: number; amount: number; stackable: boolean }
export interface Line { objectId: number; amount: number }
export interface Store { inventory: Row[]; warehouse: Row[]; nextId: number }

const MAX_LINES = 100;

function validate(lines: Line[], inventory: Row[]): boolean {
  const seen = new Set<number>();
  return lines.length <= MAX_LINES && lines.every((l) => {
    if (!Number.isSafeInteger(l.objectId) || !Number.isSafeInteger(l.amount) || l.amount <= 0) return false;
    if (seen.has(l.objectId)) return false;
    seen.add(l.objectId);
    const row = inventory.find((r) => r.id === l.objectId);
    return row !== undefined && l.amount <= row.amount;
  });
}

// Returns the new store, or null if any line fails; the input store is never half-changed.
export function deposit(store: Store, lines: Line[]): Store | null {
  const inv = store.inventory.map((r) => ({ ...r }));
  const wh = store.warehouse.map((r) => ({ ...r }));
  if (!validate(lines, inv)) return null;
  let nextId = store.nextId;
  for (const l of lines) {
    const src = inv.find((r) => r.id === l.objectId);
    if (src === undefined) return null;
    const target = src.stackable ? wh.find((r) => r.stackable && r.selfId === src.selfId) : undefined;
    if (target !== undefined) {
      target.amount += l.amount;
    } else {
      wh.push({ id: nextId++, selfId: src.selfId, amount: l.amount, stackable: src.stackable });
    }
    src.amount -= l.amount;
    if (src.amount === 0) inv.splice(inv.indexOf(src), 1);
  }
  return { inventory: inv, warehouse: wh, nextId };
}
