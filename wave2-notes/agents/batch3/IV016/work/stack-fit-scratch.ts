// Licence: MIT (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
export {};

interface Slot { itemId: string; count: number; payloadKey?: string; } // equal payloadKey (or both absent) = identical payload, mergeable
type Defs = Record<string, { stackSize: number }>;
interface Budget { slots: number; }                                  // backpack plus every equipped bag's slots
interface Add { itemId: string; count: number; payloadKey?: string; }

const stackOf = (defs: Defs, itemId: string): number => defs[itemId]?.stackSize ?? 20;

// One merge predicate, used by the check AND by the grant below, so they cannot disagree.
const topUpTarget = (s: Slot, itemId: string, payloadKey?: string): boolean =>
  s.itemId === itemId && (s.payloadKey ?? '') === (payloadKey ?? '');

// How many of `count` copies fit: top-up room in matching stacks, then whole fresh slots.
export function countFit(inv: Slot[], budget: Budget, defs: Defs, itemId: string, count: number, payloadKey?: string): number {
  const stack = stackOf(defs, itemId);
  let room = 0;
  for (const s of inv) if (topUpTarget(s, itemId, payloadKey) && s.count < stack) room += stack - s.count;
  const freeSlots = Math.max(0, budget.slots - inv.length);
  return Math.min(count, room + freeSlots * stack);
}

export function canAdd(inv: Slot[], budget: Budget, defs: Defs, itemId: string, count: number, payloadKey?: string): boolean {
  return countFit(inv, budget, defs, itemId, count, payloadKey) >= count;
}

// The grant twin: same top-up predicate, then fresh slots. Applies no cap; callers check first.
export function addStacked(inv: Slot[], defs: Defs, itemId: string, count: number, payloadKey?: string): void {
  const stack = stackOf(defs, itemId);
  let remaining = count;
  for (const s of inv) {
    if (remaining <= 0) break;
    if (!topUpTarget(s, itemId, payloadKey) || s.count >= stack) continue;
    const take = Math.min(stack - s.count, remaining);
    s.count += take;
    remaining -= take;
  }
  while (remaining > 0) {
    const take = Math.min(stack, remaining);
    inv.push({ itemId, count: take, payloadKey });
    remaining -= take;
  }
}

// All-or-nothing batch: each add must fit after the earlier adds in the same batch (run on a scratch copy).
export function fitsAll(inv: Slot[], budget: Budget, defs: Defs, adds: Add[]): boolean {
  const scratch = inv.map((s) => ({ ...s }));
  for (const a of adds) {
    if (countFit(scratch, budget, defs, a.itemId, a.count, a.payloadKey) < a.count) return false;
    addStacked(scratch, defs, a.itemId, a.count, a.payloadKey);
  }
  return true;
}

function countStacked(inv: Slot[], itemId: string): number {
  let total = 0;
  for (const s of inv) if (s.itemId === itemId) total += s.count;
  return total;
}

// Remove from the end of the list, like the donor's removeItem walk (a sketch choice, not a rule).
function removeStacked(inv: Slot[], itemId: string, count: number): void {
  let remaining = count;
  for (let i = inv.length - 1; i >= 0 && remaining > 0; i--) {
    const s = inv[i];
    if (s.itemId !== itemId) continue;
    const take = Math.min(s.count, remaining);
    s.count -= take;
    remaining -= take;
    if (s.count <= 0) inv.splice(i, 1);
  }
}

// A transform (craft, enchant): consume the inputs on a scratch copy first, so the room they free can hold the output.
export function fitsAfterConsume(inv: Slot[], budget: Budget, defs: Defs, inputs: Add[], output: Add): boolean {
  for (const c of inputs) if (countStacked(inv, c.itemId) < c.count) return false;
  const scratch = inv.map((s) => ({ ...s }));
  for (const c of inputs) removeStacked(scratch, c.itemId, c.count);
  return canAdd(scratch, budget, defs, output.itemId, output.count, output.payloadKey);
}
