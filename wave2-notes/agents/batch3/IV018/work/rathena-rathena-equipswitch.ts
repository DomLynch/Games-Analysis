// simplified: no job/level or status rules (pc_isequip), no bound-on-equip, cards forcing an accessory slot,
// ammo rule, cooldown tick, or client packets. Slots are bit indices 0..7 instead of the donor's EQI_* list.
// Models pc_equipitem's occupant unequip (pc.cpp:12152-12159), pc_equipswitch's exchange (pc.cpp:12500-12578)
// and pc_additem's stack identity (pc.cpp:6019-6025). Reorders the donor: it unequips the interfering worn
// items first and ignores the result of each later pc_equipitem call; the sketch checks every incoming item
// before changing anything, and applies the whole exchange or nothing.

export {};

interface Item {
  id: number;
  bound: boolean;
  uniqueId: number;
  cards: number[];
  equipMask: number;   // slots it occupies while worn (0 = not worn)
  switchMask: number;  // slots it is parked for in the spare set (0 = not parked)
}

interface Loadout {
  items: Map<number, Item>;
  worn: number[];   // per slot bit: item id or -1
  spare: number[];  // per slot bit: spare-set item id or -1
}

const bitsOf = (mask: number): number[] => {
  const out: number[] = [];
  for (let i = 0; i < 8; i++) if (mask & (1 << i)) out.push(i);
  return out;
};

// Stack identity: same id, bound flag, unique id and cards (pc.cpp:6019-6025)
export function sameStack(a: Item, b: Item): boolean {
  return a.id === b.id && a.bound === b.bound && a.uniqueId === b.uniqueId &&
    a.cards.length === b.cards.length && a.cards.every((c, i) => c === b.cards[i]);
}

function unwear(l: Loadout, id: number): void {
  const it = l.items.get(id);
  if (it === undefined) return;
  for (const i of bitsOf(it.equipMask)) if (l.worn[i] === id) l.worn[i] = -1;
  it.equipMask = 0;
}

function wear(l: Loadout, it: Item, mask: number): void {
  for (const i of bitsOf(mask)) {
    const occupant = l.worn[i];
    if (occupant !== -1) unwear(l, occupant); // slot taken: the occupant comes off first
  }
  for (const i of bitsOf(mask)) l.worn[i] = it.id;
  it.equipMask = mask;
}

// Exchange the worn set with the spare set for one parked item. Returns the changed ids, or null when
// any incoming item cannot be worn (then nothing changes).
export function exchange(l: Loadout, id: number, canWear: (it: Item) => boolean): number[] | null {
  const target = l.items.get(id);
  if (target === undefined || target.switchMask === 0) return null;

  const displaced = new Set<number>();
  for (const i of bitsOf(target.switchMask)) if (l.worn[i] !== -1) displaced.add(l.worn[i]);
  let combined = target.switchMask;
  for (const d of displaced) combined |= l.items.get(d)?.equipMask ?? 0;

  const incoming = new Set<number>();
  for (const i of bitsOf(combined)) if (l.spare[i] !== -1) incoming.add(l.spare[i]);
  for (const sid of incoming) {
    const it = l.items.get(sid);
    if (it === undefined || !canWear(it)) return null; // plan first: nothing has changed yet
  }

  // apply: displaced worn items come off, parked items go on, displaced items are parked in their place
  const changed: number[] = [];
  const oldMask = new Map<number, number>();
  for (const d of displaced) {
    oldMask.set(d, l.items.get(d)?.equipMask ?? 0);
    unwear(l, d);
  }
  for (const sid of incoming) {
    const it = l.items.get(sid);
    if (it === undefined) continue;
    for (const i of bitsOf(it.switchMask)) if (l.spare[i] === sid) l.spare[i] = -1;
    const m = it.switchMask;
    it.switchMask = 0;
    wear(l, it, m);
    changed.push(sid);
  }
  for (const [d, m] of oldMask) {
    const it = l.items.get(d);
    if (it === undefined) continue;
    it.switchMask = m;
    for (const i of bitsOf(m)) l.spare[i] = d;
    changed.push(d);
  }
  return changed;
}
