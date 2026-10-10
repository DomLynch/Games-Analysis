// Licence note: NetHack is under the NetHack General Public License (copyleft). This is a clean-room sketch of the described mechanism, not a translation of the donor lines.
type Flavour = 'cursed' | 'blessed' | 'uncursed';

interface Item {
  type: string;          // identity: only the same type stacks
  quan: number;          // stack size
  unitWeight: number;    // weight of one item (bags: their own weight)
  flavour: Flavour;      // curse/bless state must match to stack
  name: string;          // player-given name; '' means none
  holding?: boolean;     // bag of holding
  contents?: Item[];     // bag contents
}

const SLOTS = 52; // pack slots (donor comment: "all 52 inventory slots")

// Stack identity. Quantity is not part of the key. Names conflict only when both are set and differ;
// an unnamed stack may join a named one (the donor then keeps the name).
function canStack(a: Item, b: Item): boolean {
  if (a === b) return false;
  if (a.type !== b.type) return false;
  if (a.flavour !== b.flavour) return false;
  return a.name === '' || b.name === '' || a.name === b.name;
}

// Quantities add; the surviving stack keeps its identity and takes a name if it has none.
function mergeInto(a: Item, b: Item): boolean {
  if (!canStack(a, b)) return false;
  a.quan += b.quan;
  if (a.name === '') a.name = b.name;
  return true;
}

// A new item needs a free slot only when no existing stack accepts it.
type Fit = 'merge' | 'slot' | 'full';
function fitsPack(pack: Item[], item: Item): Fit {
  if (pack.some((p) => canStack(p, item))) return 'merge';
  return pack.length < SLOTS ? 'slot' : 'full';
}

function itemWeight(i: Item): number {
  return (i.contents ? bagWeight(i) : i.unitWeight) * i.quan;
}

function contentsWeight(items: Item[]): number {
  return items.reduce((s, i) => s + itemWeight(i), 0);
}

// Bag of holding: contents count x2 when cursed, (x+3)/4 when blessed, (x+1)/2 otherwise.
function bagWeight(bag: Item): number {
  const raw = contentsWeight(bag.contents ?? []);
  let shown = raw;
  if (bag.holding) {
    if (bag.flavour === 'cursed') shown = raw * 2;
    else if (bag.flavour === 'blessed') shown = Math.floor((raw + 3) / 4);
    else shown = Math.floor((raw + 1) / 2);
  }
  return bag.unitWeight + shown;
}

// Carry capacity: 25 x (STR+CON) + 50, at most 1000, at least 1. Wounded-leg reduction omitted.
function weightCap(str: number, con: number): number {
  return Math.max(1, Math.min(1000, 25 * (str + con) + 50));
}

// Burden tier 0..5. Excess = total - cap; tier = min(5, floor(2*excess/cap) + 1) once over cap.
function burdenTier(total: number, cap: number): number {
  const excess = total - cap;
  if (excess <= 0) return 0;
  if (cap <= 1) return 5;
  return Math.min(5, Math.floor((2 * excess) / cap) + 1);
}

// Largest count (<= count) that keeps the total under 3 x cap, the Overloaded threshold.
// Closed form of the donor's one-unit-at-a-time loop: q units fit while q * unit < room.
function liftCount(total: number, cap: number, unitWeight: number, count: number): number {
  const room = 3 * cap - total;
  if (room <= 0) return 0;
  if (unitWeight <= 0) return count;
  return Math.min(count, Math.floor((room - 1) / unitWeight));
}

// Bag of holding blast chance: at depth d, roll floor(rng * 2^min(d,7)) <= d.
// Applies to a bag of holding, or to any bag of holding inside the item.
function explodes(item: Item, depth: number, rng: () => number): boolean {
  const span = 2 ** Math.min(depth, 7);
  if (item.holding && Math.floor(rng() * span) <= depth) return true;
  return (item.contents ?? []).some((c) => explodes(c, depth + 1, rng));
}

type PutResult =
  | { ok: true; pack: Item[]; lost: boolean }
  | { ok: false; reason: string };

// Decide first (validation and the blast roll), then commit. A refused or blasted move changes nothing else.
// simplified: the donor takes the item out of the pack before the blast check and scatters the bag's contents and deals damage on a blast; this sketch returns lost:true and omits the scatter and the damage. Shop billing and the cached container weight are omitted (weight is derived on read).
function putInBag(pack: Item[], bag: Item, item: Item, rng: () => number): PutResult {
  if (item === bag) return { ok: false, reason: 'a bag cannot go in itself' };
  if (!pack.includes(item) || !pack.includes(bag)) return { ok: false, reason: 'not carried' };
  if (bag.holding && explodes(item, 0, rng)) {
    return { ok: true, pack: pack.filter((p) => p !== item && p !== bag), lost: true };
  }
  const contents = bag.contents ?? [];
  if (!contents.some((c) => mergeInto(c, item))) contents.push(item);
  bag.contents = contents;
  return { ok: true, pack: pack.filter((p) => p !== item), lost: false };
}

export {};
