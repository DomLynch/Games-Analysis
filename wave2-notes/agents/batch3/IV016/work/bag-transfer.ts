// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
export {};

interface Item { id: number; stackable: boolean; unitWeight: number; } // unitWeight x count / 1000 = carried weight, as in the donor
interface Stack { item: Item; count: number; }
interface Bag { stacks: Stack[]; maxSlots: number; maxWeight: number; }

export type Refusal = 'ok' | 'slots-full' | 'weight-full' | 'amount-full' | 'no-stock' | 'no-fee';

const MAX_AMOUNT = 2000000000;

// Carried weight of one stack: at least 1 unit when the item has any weight.
function stackWeight(item: Item, count: number): number {
  if (item.unitWeight === 0) return 0;
  return Math.max(Math.floor((count * item.unitWeight) / 1000), 1);
}

export function carried(bag: Bag): number {
  let total = 0;
  for (const s of bag.stacks) total += stackWeight(s.item, s.count);
  return total;
}

function findStack(bag: Bag, itemId: number): Stack | undefined {
  return bag.stacks.find((s) => s.item.id === itemId);
}

// Check only, mutates nothing. A full bag still takes a stackable item it already holds.
// The weight test uses the same rule as carried(), applied to the total after the add.
export function canAdd(bag: Bag, item: Item, count: number): Refusal {
  if (count <= 0) return 'no-stock';
  const existing = findStack(bag, item.id);
  const mergeable = item.stackable && existing !== undefined;
  if (!mergeable && bag.stacks.length >= bag.maxSlots) return 'slots-full';

  const heldBefore = mergeable ? existing!.count : 0;
  const totalCount = heldBefore + count;
  if (totalCount > MAX_AMOUNT) return 'amount-full';

  const before = carried(bag);
  const old = mergeable ? stackWeight(item, heldBefore) : 0;
  const after = before - old + stackWeight(item, totalCount);
  if (after >= bag.maxWeight) return 'weight-full';
  return 'ok';
}

// Atomic move: every check runs first; the source and the target change together in one synchronous step.
export function transfer(src: Bag, dst: Bag, itemId: number, count: number): Refusal {
  const from = findStack(src, itemId);
  if (!from || count <= 0 || from.count < count) return 'no-stock';
  if (!from.item.stackable && count !== 1) return 'no-stock'; // non-stackable items move one at a time
  const verdict = canAdd(dst, from.item, count);
  if (verdict !== 'ok') return verdict;

  from.count -= count;
  if (from.count === 0) src.stacks = src.stacks.filter((s) => s !== from);
  const into = from.item.stackable ? findStack(dst, itemId) : undefined;
  if (into) into.count += count;
  else dst.stacks.push({ item: from.item, count });
  return 'ok';
}

// Withdraw that charges a fee: the fee is checked up front and taken only after the move succeeds.
export function withdrawWithFee(bank: Bag, pack: Bag, itemId: number, count: number, fee: number, feeItemId: number): Refusal {
  const adena = findStack(pack, feeItemId);
  if (!adena || adena.count < fee) return 'no-fee';
  const moved = transfer(bank, pack, itemId, count);
  if (moved !== 'ok') return moved;
  adena.count -= fee;
  if (adena.count === 0) pack.stacks = pack.stacks.filter((s) => s !== adena);
  return 'ok';
}
