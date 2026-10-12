// Licence: custom non-commercial licence (donor license.txt; restricted). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Requirement { itemId: number; count: number; unique: boolean; }
export interface Recipe { resultId: number; resultUnique: boolean; zenyCost: number; requires: Requirement[]; }
export interface Piece { bagId: number; typeId: number; equipped: boolean; }
export interface Bag { stacks: Map<number, number>; pieces: Map<number, Piece>; zeny: number; } // stacks keyed by item type id, pieces keyed by bag id
export interface Taken { unequip: number[]; takeStacks: [number, number][]; takePieces: number[]; zeny: number; }
export type Plan = { ok: true; taken: Taken } | { ok: false; reason: string };

// Validate everything first; nothing is mutated until the whole plan passes.
export function plan(bag: Bag, recipe: Recipe, times: number, submittedBagIds: number[]): Plan {
  if (times < 1 || times > 99) return { ok: false, reason: "count out of range" };
  if (recipe.resultUnique && times > 1) return { ok: false, reason: "one unique piece per trade" };
  for (const b of submittedBagIds) if (!bag.pieces.has(b)) return { ok: false, reason: "piece not in bag" };
  const zeny = recipe.zenyCost * times;
  if (bag.zeny < zeny) return { ok: false, reason: "not enough zeny" };

  // Fix for the donor's per-entry check: sum stackable requirements per item type first.
  const need = new Map<number, number>();
  for (const r of recipe.requires) {
    if (r.unique) continue;
    need.set(r.itemId, (need.get(r.itemId) ?? 0) + r.count * times);
  }
  for (const [itemId, n] of need) {
    if ((bag.stacks.get(itemId) ?? 0) < n) return { ok: false, reason: "not enough items" };
  }

  // Unique requirements: each needs one distinct submitted piece of that type.
  const pool = [...submittedBagIds];
  const takePieces: number[] = [];
  const unequip: number[] = [];
  for (const r of recipe.requires) {
    if (!r.unique) continue;
    if (times > 1) return { ok: false, reason: "unique input with count above 1" };
    const idx = pool.findIndex((b) => bag.pieces.get(b)?.typeId === r.itemId);
    if (idx < 0) return { ok: false, reason: "missing piece" };
    const bagId = pool[idx];
    pool.splice(idx, 1);
    takePieces.push(bagId);
    if (bag.pieces.get(bagId)?.equipped) unequip.push(bagId);
  }
  if (pool.length > 0) return { ok: false, reason: "extra pieces submitted" }; // refuse rather than take them

  return { ok: true, taken: { unequip, takeStacks: [...need.entries()], takePieces, zeny } };
}

// Apply a passed plan in one step. newUid mints the bag id of a unique result (donor: fresh GUID).
export function apply(bag: Bag, recipe: Recipe, times: number, taken: Taken, newUid: () => number): number {
  for (const b of taken.unequip) {
    const p = bag.pieces.get(b);
    if (p) p.equipped = false;
  }
  for (const [itemId, n] of taken.takeStacks) {
    const left = (bag.stacks.get(itemId) ?? 0) - n;
    if (left > 0) bag.stacks.set(itemId, left);
    else bag.stacks.delete(itemId);
  }
  for (const b of taken.takePieces) bag.pieces.delete(b);
  bag.zeny -= taken.zeny;
  if (recipe.resultUnique) {
    const bagId = newUid();
    bag.pieces.set(bagId, { bagId, typeId: recipe.resultId, equipped: false });
    return bagId;
  }
  bag.stacks.set(recipe.resultId, (bag.stacks.get(recipe.resultId) ?? 0) + times);
  return -1;
}
export {};
