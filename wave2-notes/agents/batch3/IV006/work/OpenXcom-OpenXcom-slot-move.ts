type SlotId = "ground" | "rightHand" | "leftHand" | "belt" | "backpack";

interface Cell { x: number; y: number; w: number; h: number }

interface Item extends Cell {
  rule: string;            // donor: getRules() identity
  slot: SlotId;
  ammo?: { rule: string; qty: number };
  fuse: number;            // -1 = not armed
  isCorpse: boolean;       // donor: getUnit() != 0
}

interface Unit { tu: number; items: Item[] }

// Data half: per-pair move cost table (mirrors inventories.rul costs). Missing pair = load error, not UB.
const MOVE_COST: Partial<Record<SlotId, Partial<Record<SlotId, number>>>> = {
  ground: { backpack: 20, belt: 12, leftHand: 8, rightHand: 8 },
  rightHand: { backpack: 14, belt: 8, ground: 2, leftHand: 4 },
  leftHand: { backpack: 14, belt: 8, ground: 2, rightHand: 4 },
  belt: { backpack: 16, ground: 6, leftHand: 4, rightHand: 4 },
  backpack: { belt: 12, ground: 10, leftHand: 8, rightHand: 8 },
};

// Fixed-slot cells (donor: RuleInventory slots). Ground is unbounded in this sketch.
const SLOT_CELLS: Record<SlotId, Cell[] | "ground"> = {
  ground: "ground",
  rightHand: [{ x: 0, y: 0, w: 1, h: 1 }],
  leftHand: [{ x: 0, y: 0, w: 1, h: 1 }],
  belt: [{ x: 0, y: 0, w: 4, h: 2 }],
  backpack: [{ x: 0, y: 0, w: 3, h: 3 }],
};

function cost(from: SlotId, to: SlotId): number {
  const c = MOVE_COST[from]?.[to];
  if (c === undefined) throw new Error(`no move cost ${from} -> ${to}`);
  return c;
}

function overlaps(a: Cell, b: Cell): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

// Donor canBeStacked: same rule, same ammo (type and quantity), not armed, not a corpse.
function canBeStacked(a: Item, b: Item): boolean {
  const ammoKey = (i: Item) => (i.ammo ? `${i.ammo.rule}:${i.ammo.qty}` : "");
  return a.rule === b.rule && ammoKey(a) === ammoKey(b) && a.fuse === -1 && b.fuse === -1 && !a.isCorpse && !b.isCorpse;
}

// Fit check: the box must sit inside a fixed slot's cells and not overlap another item there.
function fits(unit: Unit, to: SlotId, item: Item, x: number, y: number): boolean {
  const cells = SLOT_CELLS[to];
  const box: Cell = { x, y, w: item.w, h: item.h };
  if (cells !== "ground") {
    for (let dx = 0; dx < item.w; dx++) {
      for (let dy = 0; dy < item.h; dy++) {
        if (!cells.some((c) => x + dx >= c.x && x + dx < c.x + c.w && y + dy >= c.y && y + dy < c.y + c.h)) return false;
      }
    }
  }
  return !unit.items.some((o) => o !== item && o.slot === to && overlaps(o, box));
}

// Atomic move: check fit, then spend time units, then commit. On any failure nothing changes.
function moveItem(unit: Unit, item: Item, to: SlotId, x: number, y: number): boolean {
  if (!fits(unit, to, item, x, y)) return false;
  const c = to === item.slot ? 0 : cost(item.slot, to);
  if (unit.tu < c) return false;
  unit.tu -= c;
  item.slot = to;
  item.x = x;
  item.y = y;
  return true;
}

// Ground pile: items sharing an anchor cell; the displayed count is derived, not stored.
function pileCount(unit: Unit, x: number, y: number): number {
  return unit.items.filter((i) => i.slot === "ground" && i.x === x && i.y === y).length;
}

// Quick equip (donor: ctrl-click): try the preferred slot first, then every other fixed slot.
function quickEquip(unit: Unit, item: Item, preferred: SlotId): boolean {
  const fixed: SlotId[] = ["rightHand", "leftHand", "belt", "backpack"];
  const order: SlotId[] = [preferred, ...fixed.filter((s) => s !== preferred)];
  for (const to of order) {
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        if (moveItem(unit, item, to, x, y)) return true;
      }
    }
  }
  return false; // nothing changed: the item is still where it was
}

export {};
