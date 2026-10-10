// Licence: GPL-3.0 (donor). clean-room sketch written from the described rule, not a translation of the donor lines.
// clean-room
interface Stack {
  kind: string;            // item class; similarity is per class unless the class adds a key
  similarKey?: string;     // extra similarity field (e.g. tier, depth); absent = equal
  quantity: number;
  stackable: boolean;
  bag?: Container;         // set when this item is a bag that holds items
}

interface Container {
  items: Stack[];
  capacity: number;        // slot count, not counting nested bags' own slots
}

function similar(a: Stack, b: Stack): boolean {
  return a.kind === b.kind && (a.similarKey ?? "") === (b.similarKey ?? "");
}

// Container admission check. A bag always fits; a stackable item fits if a matching stack already sits inside, even when full.
function canHold(c: Container, item: Stack): boolean {
  if (c.items.includes(item) || item.bag !== undefined || c.items.length < c.capacity) return true;
  return item.stackable && c.items.some(i => similar(i, item));
}

// Admit one item. Order: already inside -> nested bags first -> this container -> merge into a matching stack -> new slot.
function collect(c: Container, item: Stack): boolean {
  if (item.quantity <= 0) return true;
  if (c.items.includes(item)) return true;
  for (const slot of c.items) {
    if (slot.bag && canHold(slot.bag, item) && collect(slot.bag, item)) return true;
  }
  if (!canHold(c, item)) return false;
  if (item.stackable) {
    const target = c.items.find(i => similar(i, item));
    if (target) {
      target.quantity += item.quantity; // no cap on the stack in the donor
      item.quantity = 0;
      return true;
    }
  }
  c.items.push(item);
  return true;
}

// Move = take out of the source, then admit into the target; if the target refuses, put it back where it was.
function move(from: Container, to: Container, item: Stack): boolean {
  const idx = from.items.indexOf(item);
  if (idx < 0) return false;
  from.items.splice(idx, 1);
  if (collect(to, item)) return true;
  if (!collect(from, item)) throw new Error("rollback failed: item would be lost");
  return false;
}

export {};
