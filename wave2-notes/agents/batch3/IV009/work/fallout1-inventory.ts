// clean-room sketch of the donor's stack / checked-move / equip / loot rules. Written from the described mechanism, not a translation.
type Item = {
  kind: number;          // proto id
  size: number;          // container units per unit
  weight: number;        // weight per unit
  isContainer: boolean;
  isAmmo: boolean;
  rounds: number;        // ammo only: rounds on this object (partial magazine)
  magazine: number;      // ammo only: full magazine size
  equipped: boolean;
};

type Entry = { item: Item; qty: number };

type Holder = {
  entries: Entry[];
  maxWeight: number;     // carry cap; Infinity when the holder is not weighed
  maxSize: number;       // container cap; Infinity for a carrier
};

const OK = 0;
const ERR_BAD = -1;
const ERR_FULL = -6;

function totalWeight(h: Holder): number {
  let w = 0;
  for (const e of h.entries) w += e.item.weight * e.qty;
  return w;
}

function usedSize(h: Holder): number {
  let s = 0;
  for (const e of h.entries) s += e.item.size * e.qty;
  return s;
}

// Equipped, container and non-empty items never stack.
function sameStack(a: Item, b: Item): boolean {
  return a.kind === b.kind && !a.equipped && !b.equipped && !a.isContainer && !b.isContainer;
}

// Force add: merge into an identical stack, else append. No limit checks.
function addForce(h: Holder, item: Item, qty: number): number {
  if (qty < 1) return ERR_BAD;
  const idx = h.entries.findIndex((e) => sameStack(e.item, item));
  if (idx < 0) {
    h.entries.push({ item, qty });
    return OK;
  }
  const e = h.entries[idx];
  if (item.isAmmo) {
    // Pool rounds. An overflowing magazine counts as one stack unit; the remainder stays on the incoming object.
    const pooled = e.item.rounds + item.rounds;
    if (pooled > item.magazine) {
      item.rounds = pooled - item.magazine;
      e.qty += 1;
    } else {
      item.rounds = pooled;
    }
    e.qty += qty - 1;
  } else {
    e.qty += qty;
  }
  e.item = item; // the incoming object becomes the stack representative
  return OK;
}

// Checked add: container refuses at size >= max; the weighed holder (the carrier, or the container itself) refuses above its cap.
function add(h: Holder, item: Item, qty: number, carrier?: Holder): number {
  if (qty < 1) return ERR_BAD;
  if (usedSize(h) + item.size * qty >= h.maxSize) return ERR_FULL;
  const weighed = carrier ?? h;
  if (totalWeight(weighed) + item.weight * qty > weighed.maxWeight) return ERR_FULL;
  return addForce(h, item, qty);
}

// Remove: whole-stack removal drops the entry; partial removal leaves a copy as the representative, with ammo reset to a full magazine.
function remove(h: Holder, item: Item, qty: number): number {
  const idx = h.entries.findIndex((e) => e.item === item);
  if (idx < 0) return ERR_BAD;
  const e = h.entries[idx];
  if (e.qty < qty) return ERR_BAD;
  if (e.qty === qty) {
    h.entries.splice(idx, 1);
  } else {
    e.qty -= qty;
    e.item = { ...item, rounds: item.isAmmo ? item.magazine : item.rounds };
  }
  item.equipped = false;
  return OK;
}

// Move = remove from source, add to target; if the add is refused, put the item back on the source (compensation).
function move(from: Holder, to: Holder, item: Item, qty: number, force: boolean, carrier?: Holder): number {
  if (remove(from, item, qty) !== OK) return ERR_BAD;
  const rc = force ? addForce(to, item, qty) : add(to, item, qty, carrier);
  if (rc !== OK) {
    addForce(from, item, qty);
    return rc;
  }
  return OK;
}

// Take-all: one weight gate for the whole container, then every entry moves unchecked.
function takeAll(from: Holder, to: Holder, carrierMaxWeight: number): number {
  if (totalWeight(from) > carrierMaxWeight - totalWeight(to)) return ERR_FULL;
  while (from.entries.length > 0) {
    const e = from.entries[0];
    // The donor loops here with no exit; the sketch returns instead.
    if (move(from, to, e.item, e.qty, true) !== OK) return ERR_BAD;
  }
  return OK;
}

// Quantity picker: range 1..min(max, 999). Typed digits shift in as (10 * value) mod 1000 + digit.
function pickerMax(max: number): number {
  return Math.min(max, 999);
}

function typeDigit(value: number, digit: number, fresh: boolean): number {
  const base = fresh ? 0 : value;
  return ((10 * base) % 1000) + digit;
}

function pickerConfirm(value: number, max: number): boolean {
  return value >= 1 && value <= max;
}

// Armour swap: take the old bonuses off, put the new ones on (either side may be null).
type Armour = { ac: number; dr: number[]; dt: number[] };
type Bonus = { ac: number; dr: number[]; dt: number[] };

function swapArmour(b: Bonus, oldA: Armour | null, newA: Armour | null): Bonus {
  return {
    ac: b.ac - (oldA?.ac ?? 0) + (newA?.ac ?? 0),
    dr: b.dr.map((v, i) => v - (oldA?.dr[i] ?? 0) + (newA?.dr[i] ?? 0)),
    dt: b.dt.map((v, i) => v - (oldA?.dt[i] ?? 0) + (newA?.dt[i] ?? 0)),
  };
}

// Steal XP: each successful move pays 10, then 20, 30 ...; paid only if the thief was not caught, capped at 300 minus Steal.
function stealXp(successes: number, stealSkill: number, caught: boolean): number {
  if (caught) return 0;
  let xp = 0;
  let bonus = 10;
  for (let i = 0; i < successes; i++) {
    xp += bonus;
    bonus += 10;
  }
  return Math.min(xp, 300 - stealSkill);
}

// Loot list: only dead or knocked-out bodies are lootable.
type Body = { dead: boolean; knockedOut: boolean };
function lootable(b: Body): boolean {
  return b.dead || b.knockedOut;
}

export {};
