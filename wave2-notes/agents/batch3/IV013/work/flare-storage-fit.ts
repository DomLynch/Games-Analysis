// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Stack {
  item: number;     // 0 = empty
  qty: number;
  buyback: boolean; // sold-to-vendor flag; only same-flag stacks merge
}

const EMPTY: Stack = { item: 0, qty: 0, buyback: false };

function isEmpty(s: Stack): boolean {
  return s.item === 0 || s.qty === 0;
}

// Room for this stack in one slot: an empty slot takes up to max; a same-item, same-flag slot takes max minus its quantity.
function roomIn(slot: Stack, s: Stack, max: number): number {
  if (isEmpty(slot)) return max;
  if (slot.item === s.item && slot.buyback === s.buyback) return Math.max(0, max - slot.qty);
  return 0;
}

// Order of slots to try: the preferred slot (if free or same item), then partial stacks (stackable only), then empty slots.
function slotOrder(slots: Stack[], s: Stack, max: number, preferred: number): number[] {
  const idx: number[] = [];
  if (preferred >= 0 && preferred < slots.length && (isEmpty(slots[preferred]) || slots[preferred].item === s.item)) {
    idx.push(preferred);
  }
  if (max > 1) {
    slots.forEach((c, i) => {
      if (i !== preferred && c.item === s.item && c.buyback === s.buyback) idx.push(i);
    });
  }
  slots.forEach((c, i) => {
    if (i !== preferred && isEmpty(c)) idx.push(i);
  });
  return idx;
}

// Places as much of the stack as fits and returns the rest (the caller drops it or reports "full").
function addStack(slots: Stack[], s: Stack, max: number, preferred = -1): Stack {
  let rest = s.qty;
  for (const i of slotOrder(slots, s, max, preferred)) {
    if (rest <= 0) break;
    const put = Math.min(rest, roomIn(slots[i], s, max));
    if (put <= 0) continue;
    const had = slots[i].item === s.item ? slots[i].qty : 0;
    slots[i] = { item: s.item, qty: had + put, buyback: s.buyback };
    rest -= put;
  }
  return rest > 0 ? { item: s.item, qty: rest, buyback: s.buyback } : { ...EMPTY };
}

// Exact fit test: true only when the whole stack cannot be placed (total room is less than the quantity).
function fullFor(slots: Stack[], s: Stack, max: number): boolean {
  let room = 0;
  for (const c of slots) room += roomIn(c, s, max);
  return room < s.qty;
}

// Vendor buyback: if the sale does not fit, drop the oldest entry (slot 0), compact, then add. Returns what is left.
function sellToVendor(slots: Stack[], s: Stack, max: number): Stack {
  const sold: Stack = { ...s, buyback: true };
  if (fullFor(slots, sold, max)) {
    slots.shift();
    slots.push({ ...EMPTY });
  }
  return addStack(slots, sold, max);
}

export { addStack, fullFor, sellToVendor };
