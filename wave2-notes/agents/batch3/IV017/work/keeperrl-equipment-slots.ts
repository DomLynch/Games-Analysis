// Clean-room shape of KeeperRL equipment slots (GPL v2 donor; no lines copied).
// Slot capacity is a pure function of the body and skills; over-capacity gear falls to the ground.
type Slot =
  | 'weapon' | 'ranged' | 'shield' | 'helmet' | 'gloves' | 'body' | 'boots'
  | 'amulet' | 'rings' | 'prayer' | 'devotional';

const ALL_SLOTS: Slot[] = [
  'weapon', 'ranged', 'shield', 'helmet', 'gloves', 'body', 'boots',
  'amulet', 'rings', 'prayer', 'devotional',
];

interface Hero {
  armsHealthy: number;      // body parts that are neither lost nor injured
  headsHealthy: number;
  multiWeaponAttr: number;  // integer skill attribute
  divinity: number;
  preachingBuff: boolean;
}

interface Item {
  id: number;
  slot: Slot;
  twoHanded: boolean;
  value: number;            // how much the hero values it (used for evictions and drops)
  locked: boolean;
}

// Damage multiplier for each simultaneous attack: 1, then skill, then skill^2, skill^3, ... while >= 0.5.
// Fix: the donor's mastery branch (skill > 0.95) gave 1 + 10 = 11 slots, one fewer than skill 0.94 (12).
// Here mastery gives 1 + 11 = 12 full-strength slots, so the count never falls as skill rises.
export function attackLadder(attr: number): number[] {
  const skill = Math.min(1.0, attr * 0.02);
  const out: number[] = [1];
  if (skill < 0.01) return out;
  if (skill > 0.95) {
    for (let i = 0; i < 11; i++) out.push(1);
    return out;
  }
  out.push(skill);
  let cur = skill * skill;
  while (cur >= 0.5) {
    out.push(cur);
    cur *= skill;
  }
  return out;
}

// Capacity per slot, derived from the body and skills. Stored nowhere: recompute after every injury.
export function slotCapacity(slot: Slot, h: Hero): number {
  switch (slot) {
    case 'weapon':
      return Math.min(h.armsHealthy, attackLadder(h.multiWeaponAttr).length);
    case 'rings':
      return h.armsHealthy;
    case 'amulet':
    case 'helmet':
      return h.headsHealthy;
    case 'prayer':
      return h.preachingBuff ? 1 : 0;
    case 'devotional':
      return h.divinity > 0 ? 3 : 0;
    default:
      return 1;
  }
}

// Two-handed weapon and shield exclude each other, in either order.
export function conflicts(a: Item, b: Item): boolean {
  if (a.id === b.id) return false;
  return (a.twoHanded && b.slot === 'shield') || (b.twoHanded && a.slot === 'shield');
}

// What must come off before `item` can go on. null means the slot is full of locked items.
// Donor evicts the oldest item in the slot; fix: evict the lowest-value unlocked item instead.
export function planEquip(equipped: Item[], item: Item, h: Hero): Item[] | null {
  const evict: Item[] = [];
  const sameSlot = equipped.filter(i => i.slot === item.slot);
  if (sameSlot.length >= slotCapacity(item.slot, h)) {
    const unlocked = sameSlot.filter(i => !i.locked);
    if (unlocked.length === 0) return null;
    evict.push(unlocked.reduce((worst, i) => (i.value < worst.value ? i : worst)));
  }
  for (const other of equipped) {
    if (conflicts(item, other) && !evict.includes(other)) evict.push(other);
  }
  return evict;
}

// Run after every injury or loss. Returns the items that fall to the floor.
// Donor drops the most recently equipped excess item; fix: drop the lowest-value excess item.
export function dropOverCapacity(equipped: Item[], h: Hero): Item[] {
  const dropped: Item[] = [];
  for (const slot of ALL_SLOTS) {
    const cap = slotCapacity(slot, h);
    let inSlot = equipped.filter(i => i.slot === slot);
    while (inSlot.length > cap) {
      const worst = inSlot.reduce((w, i) => (i.value < w.value ? i : w));
      inSlot = inSlot.filter(i => i !== worst);
      equipped.splice(equipped.indexOf(worst), 1);
      dropped.push(worst);
    }
  }
  return dropped;
}

export {};
