type Item = string;
interface Stack { item: Item | null; amount: number }

// Data half: stack size per base item (donor: item.stackSize()). Unknown item = 1 here.
const STACK_SIZE = new Map<string, number>([["stone", 64], ["coin", 100]]);
const stackSizeOf = (item: Item): number => STACK_SIZE.get(item) ?? 1;

// Bag: LIFO list of same-item runs. Merges only into the top run; capped by slot count (donor: playerBagSizeLimit = 120).
class Bag {
  slots: Stack[] = [];
  constructor(private sizeLimit: number) {}

  // Returns the amount that did not fit.
  push(s: Stack): number {
    let amount = s.amount;
    const top = this.slots[this.slots.length - 1];
    if (top && top.item === s.item) {
      const add = Math.min(amount, stackSizeOf(s.item!) - top.amount);
      top.amount += add;
      amount -= add;
    }
    // FIX: donor appends the whole remainder as one slot; this clamps each new slot to the stack size.
    while (amount > 0 && this.slots.length < this.sizeLimit) {
      const put = Math.min(amount, stackSizeOf(s.item!));
      this.slots.push({ item: s.item, amount: put });
      amount -= put;
    }
    return amount;
  }

  pop(): Stack {
    return this.slots.pop() ?? { item: null, amount: 0 };
  }

  peek(offsetFromTop: number): Stack {
    return this.slots[this.slots.length - 1 - offsetFromTop] ?? { item: null, amount: 0 };
  }
}

// Take up to amount of the top item run; stop at the first different item (donor: takeFromBag).
function takeFromBag(bag: Bag, amount: number): { item: Item | null; taken: number } {
  const first = bag.peek(0);
  if (first.item === null) return { item: null, taken: 0 };
  let want = Math.min(amount, stackSizeOf(first.item));
  let taken = 0;
  while (want > 0 && bag.peek(0).item === first.item) {
    const top = bag.peek(0);
    const n = Math.min(top.amount, want);
    taken += n;
    want -= n;
    top.amount -= n;
    if (top.amount === 0) bag.pop();
  }
  return { item: first.item, taken };
}

// Fill matching partial stacks first; the rest goes to the first empty slot, clamped to the stack size.
// FIX: donor sends the whole remainder to the empty slot, which can exceed the stack size.
function putItems(inv: Stack[], amount: number, item: Item): number {
  let left = amount;
  let firstEmpty = -1;
  for (let i = 0; i < inv.length; i++) {
    const s = inv[i];
    if (s.item === null && firstEmpty < 0) firstEmpty = i;
    if (s.item === item) {
      const n = Math.min(stackSizeOf(item) - s.amount, left);
      s.amount += n;
      left -= n;
      if (left === 0) return 0;
    }
  }
  if (firstEmpty >= 0 && left > 0) {
    const put = Math.min(left, stackSizeOf(item));
    inv[firstEmpty] = { item, amount: put };
    left -= put;
  }
  return left;
}

// Remove amount of one item: partial stacks first (last to first), then full stacks. Loops over every stack.
// FIX: donor deletes at most one stack size from only the first full stack, so a recipe spanning two full stacks is under-charged.
function removeItems(inv: Stack[], amount: number, item: Item): number {
  let left = amount;
  for (const pass of [0, 1]) {
    for (let i = inv.length - 1; i >= 0 && left > 0; i--) {
      const s = inv[i];
      if (s.item !== item) continue;
      if (pass === 0 && s.amount === stackSizeOf(item)) continue;
      const n = Math.min(left, s.amount);
      s.amount -= n;
      left -= n;
      if (s.amount === 0) s.item = null;
    }
  }
  return left; // 0 when the whole amount was removed
}

// Craft: check the result fits on a copy, check ingredient totals, then remove ingredients and put the result.
// Nothing changes unless the whole recipe is covered (donor: CraftFrom precheck, then removeItems, then putItemsInto).
function craft(inv: Stack[], recipe: { inputs: [Item, number][]; output: [Item, number] }): boolean {
  const probe = inv.map((s) => ({ ...s }));
  if (putItems(probe, recipe.output[1], recipe.output[0]) !== 0) return false;
  for (const [item, need] of recipe.inputs) {
    const have = inv.filter((s) => s.item === item).reduce((a, s) => a + s.amount, 0);
    if (have < need) return false;
  }
  for (const [item, need] of recipe.inputs) {
    if (removeItems(inv, need, item) !== 0) throw new Error("ingredient precheck and removal disagree");
  }
  return putItems(inv, recipe.output[1], recipe.output[0]) === 0;
}

export {};
