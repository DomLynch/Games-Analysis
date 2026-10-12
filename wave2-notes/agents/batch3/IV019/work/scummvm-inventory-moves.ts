// simplified: keeps the donor's order (stack first, then find a free slot) but (a) finds the slot BEFORE the
// item enters the ledger (donor inserts into m_mapItems first, then searches) and (b) stacks only counted+counted
// (donor checks only the new item's HasCount). Omits: game-script combine calls, subtitle, world drop entity,
// widgets/mouse, save/load, equip-name lookups, and the donor's OnPickUp refusal hook.
// Models: 24 bag slots + 9 equip slots in one slot array; stacking by kind+sub; move = all-or-nothing.
type ItemId = string;
interface Item { id: ItemId; kind: string; sub: string; counted: boolean; count: number; droppable: boolean; }
interface Ledger { items: Map<ItemId, Item>; slots: (ItemId | null)[]; } // slots[0..23] bag, slots[24..32] equip
const BAG = 24;
const EQUIP = 9;

type AddResult = { ok: true; where: number | "stacked" } | { ok: false; reason: "full" };

function addItem(l: Ledger, it: Item): AddResult {
  if (it.counted) {
    for (const other of l.items.values()) {
      if (other.counted && other.kind === it.kind && other.sub === it.sub) {
        other.count += it.count;
        return { ok: true, where: "stacked" };
      }
    }
  }
  const idx = l.slots.findIndex((s) => s === null);
  if (idx < 0) return { ok: false, reason: "full" }; // nothing was inserted: no ghost item
  l.items.set(it.id, it);
  l.slots[idx] = it.id;
  return { ok: true, where: idx };
}

type MoveResult = "placed" | "combined" | "returned";

// pick-and-place: the item leaves `from` only if the move completes; otherwise it stays put.
function move(l: Ledger, from: number, to: number, combine: (a: ItemId, b: ItemId) => boolean): MoveResult {
  const held = l.slots[from];
  if (held === null || from === to) return "returned";
  const target = l.slots[to];
  if (target === null) {
    l.slots[to] = held;
    l.slots[from] = null;
    return "placed";
  }
  if (combine(held, target)) return "combined"; // script decides; held item stays in `from` unless consumed
  return "returned"; // occupied target: refused, nothing swapped
}

function dropOutside(l: Ledger, from: number): "dropped" | "returned" {
  const id = l.slots[from];
  if (id === null) return "returned";
  const it = l.items.get(id);
  if (it && it.droppable && !it.counted) {
    l.slots[from] = null;
    l.items.delete(id);
    return "dropped";
  }
  return "returned";
}

// number key 1-9 on an item in a bag slot swaps it with equip slot n (both directions, unlike drag)
function equipShortcut(l: Ledger, from: number, equipIdx: number): void {
  if (equipIdx < 0 || equipIdx >= EQUIP) return;
  const a = l.slots[from];
  if (a === null) return;
  const e = BAG + equipIdx;
  const b = l.slots[e];
  l.slots[from] = b;
  l.slots[e] = a;
}

export {};
