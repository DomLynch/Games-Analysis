// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Pickup pipeline: stack merge first, then gear capacity, then placement, then the source is decremented only after the pack accepted.

export {};

type Category = "gear" | "consumable";

interface Item {
  kind: string;            // base type plus sub type folded into one key
  quantity: number;
  stackable: boolean;      // donor: is_stackable_item
  noMergeFlags: number;    // donor: masked mimic/summoned flags; must be equal to merge
  identified: boolean;
  category: Category;
  remembered?: number;     // slot the item last held (gear keeps it if still free)
}

interface Ground { item: Item; quantity: number; }   // world stack on the floor

type Pack = (Item | undefined)[];

interface PickupResult { ok: boolean; slot: number; gained: number; }

const MAX_GEAR = 52;      // donor defines.h:41
const PACK_END = 127;     // donor defines.h:40 (gear plus consumables)
const MAX_QTY = 2147483647; // stand-in for the donor's quantity type limit (donor type not read)
const DISLIKED_SLOT = 24;   // donor: potions avoid letter 'y' (index 24); a preference, not a block

// Donor items_stack: both stackable, sum must fit, and similar in kind, no-merge flags and identified state.
// Note: the overflow test uses the whole ground stack, as the donor does (item2.quantity).
function itemsStack(a: Item | undefined, b: Item): boolean {
  if (!a || !a.stackable || !b.stackable) return false;
  if (a.quantity + b.quantity > MAX_QTY) return false;
  return a.kind === b.kind
    && a.noMergeFlags === b.noMergeFlags
    && a.identified === b.identified;
}

// Simplified placement: gear keeps its remembered slot if free, else the first free gear slot
// (donor: last free slot with no gap, then a disliked fallback). Consumables use [MAX_GEAR, PACK_END).
function freeSlotFor(pack: Pack, item: Item): number {
  if (item.category === "consumable") {
    for (let i = MAX_GEAR; i < PACK_END; i++) if (!pack[i]) return i;
    return -1;
  }
  if (item.remembered !== undefined && item.remembered < MAX_GEAR && !pack[item.remembered]) {
    return item.remembered;
  }
  for (let i = 0; i < MAX_GEAR; i++) {
    if (!pack[i] && i !== DISLIKED_SLOT) return i;
  }
  return -1;
}

function gearCount(pack: Pack): number {
  let n = 0;
  for (let i = 0; i < MAX_GEAR; i++) if (pack[i]) n++;
  return n;
}

// Donor order: clamp quantity, merge into an accepting stack, gear cap check, place, then decrement the ground.
function pickUp(pack: Pack, ground: Ground, want: number): PickupResult {
  const qty = want > ground.quantity || want <= 0 ? ground.quantity : want;
  const incoming: Item = { ...ground.item, quantity: qty };

  // 1. merge into the first existing stack that accepts it
  if (ground.item.stackable) {
    for (let i = 0; i < pack.length; i++) {
      const existing = pack[i];
      if (existing && itemsStack(existing, ground.item)) {
        existing.quantity += qty;
        return commit(ground, qty, i);
      }
    }
  }

  // 2. capacity: only gear is capped; a full gear pack still takes a stack that merged above
  if (ground.item.category === "gear" && gearCount(pack) >= MAX_GEAR) {
    return { ok: false, slot: -1, gained: 0 };   // ground stack untouched
  }

  // 3. place into a free slot
  const slot = freeSlotFor(pack, incoming);
  if (slot < 0) return { ok: false, slot: -1, gained: 0 };
  pack[slot] = incoming;

  // 4. only now shrink the ground stack
  return commit(ground, qty, slot);
}

function commit(ground: Ground, qty: number, slot: number): PickupResult {
  ground.quantity -= qty;   // the donor removes the world item when this reaches zero
  return { ok: true, slot, gained: qty };
}

// Quick check used before a pickup: consumables always fit in this sketch; gear fits if a slot is free
// or if the item merges with something already carried.
function roomFor(pack: Pack, item: Item): boolean {
  if (item.category === "consumable") return true;
  if (gearCount(pack) < MAX_GEAR) return true;
  if (!item.stackable) return false;
  return pack.some((p) => itemsStack(p, item));
}

// Smoke values (not a test): a stack of 5 potions meets 3 in the pack.
const pack: Pack = new Array(PACK_END).fill(undefined);
const potion: Item = { kind: "potion:healing", quantity: 3, stackable: true, noMergeFlags: 0, identified: true, category: "consumable" };
pack[MAX_GEAR] = { ...potion, quantity: 3 };
const ground: Ground = { item: { ...potion, quantity: 5 }, quantity: 5 };
const r = pickUp(pack, ground, 2);
const ok: boolean = r.ok && r.gained === 2 && ground.quantity === 3;
void ok;
void roomFor;
