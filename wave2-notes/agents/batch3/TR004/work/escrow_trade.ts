// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Item { objectId: number; itemId: number; count: number; stackable: boolean; bound: boolean; tradable: boolean; }
export interface Bag { items: Map<number, Item>; capacity: number; }
export interface Escrow { from: string; item: Item; }
export interface Trade { a: string; b: string; open: boolean; escrow: Map<number, Escrow>; confirmed: Map<string, boolean>; }
export interface Row { from: string; to: string; objectId: number; itemId: number; count: number; }
export interface World {
  bag(owner: string): Bag;
  inRange(a: string, b: string): boolean;
  newId(): number;
}

function partnerOf(t: Trade, who: string): string { return who === t.a ? t.b : t.a; }

// Any offer change clears BOTH confirmations. The donor clears only the editor's own lock (defect 1).
function unconfirmBoth(t: Trade): void {
  t.confirmed.set(t.a, false);
  t.confirmed.set(t.b, false);
}

// Escrow by move: the offered stack leaves the owner's bag now, so it cannot be spent during the trade.
export function offer(t: Trade, who: string, objectId: number, count: number, w: World): boolean {
  if (!t.open) return false;
  const src = w.bag(who);
  const item = src.items.get(objectId);
  if (!item || !item.tradable || item.bound) return false;
  if (count < 1 || count > item.count) return false;
  if (!item.stackable && count !== 1) return false;
  // Reserve room: every stack already offered by this player plus this one must fit in the partner's bag.
  let offeredStacks = 0;
  for (const e of t.escrow.values()) if (e.from === who) offeredStacks++;
  const dst = w.bag(partnerOf(t, who));
  if (dst.items.size + offeredStacks + 1 > dst.capacity) return false;

  let moved: Item;
  if (count === item.count) {
    src.items.delete(objectId);
    moved = item;
  } else {
    item.count -= count;
    moved = { ...item, objectId: w.newId(), count };
  }
  t.escrow.set(moved.objectId, { from: who, item: moved });
  unconfirmBoth(t);
  return true;
}

// Cancel (also used on disconnect or out of range): every escrowed stack goes back to its owner.
export function cancel(t: Trade, w: World): void {
  for (const e of t.escrow.values()) w.bag(e.from).items.set(e.item.objectId, e.item);
  t.escrow.clear();
  t.open = false;
}

// Both confirmed: re-check range and room for each receiver, then move every escrowed stack in one step.
export function confirm(t: Trade, who: string, w: World): { status: "waiting" | "settled" | "cancelled"; rows: Row[] } {
  if (!t.open) return { status: "cancelled", rows: [] };
  t.confirmed.set(who, true);
  if (!t.confirmed.get(t.a) || !t.confirmed.get(t.b)) return { status: "waiting", rows: [] };
  if (!w.inRange(t.a, t.b)) {
    cancel(t, w);
    return { status: "cancelled", rows: [] };
  }
  const rows: Row[] = [];
  const need = new Map<string, number>();
  for (const e of t.escrow.values()) {
    const to = partnerOf(t, e.from);
    rows.push({ from: e.from, to, objectId: e.item.objectId, itemId: e.item.itemId, count: e.item.count });
    need.set(to, (need.get(to) ?? 0) + 1);
  }
  for (const [to, n] of need) {
    const dst = w.bag(to);
    if (dst.items.size + n > dst.capacity) {
      cancel(t, w);
      return { status: "cancelled", rows: [] };
    }
  }
  for (const e of t.escrow.values()) w.bag(partnerOf(t, e.from)).items.set(e.item.objectId, e.item);
  t.escrow.clear();
  t.open = false;
  return { status: "settled", rows };
}
export {};
